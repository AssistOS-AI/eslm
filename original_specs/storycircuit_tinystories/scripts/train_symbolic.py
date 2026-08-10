from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable

from _bootstrap import ROOT
from storycircuit.config import load_config
from storycircuit.learner import StoryCircuitTrainer, TrainingConfig
from storycircuit.model import StoryCircuitModel
from storycircuit.utils import iter_jsonl, sha256_file, utc_now, write_json


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input")
    parser.add_argument("--profile", required=True)
    parser.add_argument("--output")
    parser.add_argument("--model-id")
    args = parser.parse_args()

    profile = load_config(args.profile)
    training_values = profile.get("training", {})
    config = TrainingConfig(**training_values)
    input_path = Path(args.input or profile.get("corpus", {}).get("train_prepared", ""))
    if not input_path.exists():
        raise SystemExit(f"training input not found: {input_path}")
    output = Path(args.output or profile.get("artifacts", {}).get("model", ROOT / "artifacts" / profile.get("name", "run") / "model.json"))
    model_id = args.model_id or profile.get("model_id", f"storycircuit-{profile.get('name', 'run')}")

    trainer = StoryCircuitTrainer(config)
    if input_path.suffix == ".jsonl":
        def stream():
            for row in iter_jsonl(input_path):
                yield str(row["text"])
        result = trainer.train_stream(stream)
        model = StoryCircuitModel(result.byte_lm, result.word_lm, result.statistics, model_id=model_id)
    else:
        model = StoryCircuitModel.train_path(input_path, config, model_id=model_id)
    output.parent.mkdir(parents=True, exist_ok=True)
    model.save(output)
    run = {
        "created_at": utc_now(),
        "model": str(output),
        "model_sha256": sha256_file(output),
        "input": str(input_path),
        "input_sha256": sha256_file(input_path),
        "profile": str(args.profile),
        "metadata": model.metadata(),
    }
    write_json(output.with_suffix(".training.json"), run)
    print(json.dumps(run, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
