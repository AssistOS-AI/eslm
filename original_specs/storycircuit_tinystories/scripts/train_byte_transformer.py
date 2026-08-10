from __future__ import annotations

import argparse
import json
import math
import random
import time
from pathlib import Path

from _bootstrap import ROOT
from baselines.byte_data import UInt16TokenFile
from baselines.byte_transformer import ByteTransformerConfig, ByteTransformerLM, save_checkpoint
from storycircuit.config import load_config
from storycircuit.utils import environment_snapshot, sha256_file, utc_now, write_json


def cosine_lr(step: int, total: int, warmup: int, maximum: float) -> float:
    if step < warmup:
        return maximum * (step + 1) / max(1, warmup)
    progress = (step - warmup) / max(1, total - warmup)
    return maximum * 0.1 + 0.5 * maximum * 0.9 * (1 + math.cos(math.pi * min(1.0, progress)))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tokens", required=True)
    parser.add_argument("--config", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--steps", type=int)
    args = parser.parse_args()

    import torch
    import torch.nn.functional as F

    raw = load_config(args.config)
    model_config = ByteTransformerConfig(**raw["model"])
    train_config = dict(raw["training"])
    if args.steps is not None:
        train_config["steps"] = args.steps
    seed = int(train_config.get("seed", 1729))
    random.seed(seed)
    torch.manual_seed(seed)
    if args.device.startswith("cuda"):
        torch.cuda.manual_seed_all(seed)
    torch.use_deterministic_algorithms(False)

    model = ByteTransformerLM(model_config).to(args.device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=float(train_config["learning_rate"]), weight_decay=float(train_config.get("weight_decay", 0.0)))
    rng = random.Random(seed)
    batch_size = int(train_config["batch_size"])
    steps = int(train_config["steps"])
    warmup = int(train_config.get("warmup_steps", 0))
    max_lr = float(train_config["learning_rate"])
    grad_clip = float(train_config.get("grad_clip", 1.0))
    log_every = max(1, int(train_config.get("log_every", 100)))
    history = []
    started = time.perf_counter()
    model.train()
    with UInt16TokenFile(args.tokens) as dataset:
        for step in range(steps):
            lr = cosine_lr(step, steps, warmup, max_lr)
            for group in optimizer.param_groups:
                group["lr"] = lr
            inputs, targets = dataset.random_batch(batch_size=batch_size, sequence_length=model_config.max_seq_len, rng=rng, device=args.device)
            optimizer.zero_grad(set_to_none=True)
            logits = model(inputs)
            loss = F.cross_entropy(logits.reshape(-1, model_config.vocab_size), targets.reshape(-1))
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), grad_clip)
            optimizer.step()
            if step == 0 or (step + 1) % log_every == 0 or step + 1 == steps:
                row = {"step": step + 1, "loss": float(loss.item()), "perplexity_per_byte_token": math.exp(min(20.0, float(loss.item()))), "learning_rate": lr, "elapsed_seconds": time.perf_counter() - started}
                history.append(row)
                print(json.dumps(row), flush=True)
    training = {
        "created_at": utc_now(),
        "configuration": raw,
        "effective_training": train_config,
        "tokens": {"path": args.tokens, "sha256": sha256_file(args.tokens)},
        "device": args.device,
        "parameter_count": model.parameter_count(),
        "wall_seconds": time.perf_counter() - started,
        "history": history,
        "environment": environment_snapshot(),
    }
    save_checkpoint(args.output, model, training=training)
    write_json(Path(args.output).with_suffix(".training.json"), training)
    print(json.dumps({"checkpoint": args.output, "parameter_count": model.parameter_count(), "wall_seconds": training["wall_seconds"]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
