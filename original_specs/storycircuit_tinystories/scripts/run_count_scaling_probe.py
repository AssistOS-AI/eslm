from __future__ import annotations

import argparse
import csv
import gc
import json
import random
import time
from pathlib import Path

from _bootstrap import ROOT
from storycircuit.eval.harness import EvaluationHarness
from storycircuit.learner import StoryCircuitTrainer, TrainingConfig
from storycircuit.model import StoryCircuitModel
from storycircuit.text import iter_stories, split_sentences
from storycircuit.utils import sha256_file, sha256_text, utc_now, write_json


def split(stories: list[str], train_fraction: float) -> tuple[list[str], list[str]]:
    threshold = int(train_fraction * 16**16)
    train, heldout = [], []
    for story in stories:
        target = train if int(sha256_text(story)[:16], 16) < threshold else heldout
        target.append(story)
    return train, heldout


def cases_for(heldout: list[str], ending_items: int, seed: int) -> list[dict]:
    cases = [{"id": f"like-{i}", "family": "likelihood", "subcategory": "natural", "input": {"text": text}, "target": None} for i, text in enumerate(heldout)]
    endings = []
    for text in heldout:
        sentences = split_sentences(text)
        if len(sentences) >= 2:
            endings.append((text[: sentences[-1].start].strip(), sentences[-1].text))
    rng = random.Random(seed)
    rng.shuffle(endings)
    for i, (prefix, correct) in enumerate(endings[: min(ending_items, len(endings))]):
        wrong = endings[(i + 1) % len(endings)][1]
        values = [correct, wrong]
        target = 0
        if rng.random() < 0.5:
            values.reverse()
            target = 1
        cases.append({"id": f"end-{i}", "family": "narrative_selection", "subcategory": "cross-story", "input": {"prefix": prefix, "candidates": values}, "target": {"index": target}})
    return cases


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--stories", type=int, default=5000)
    parser.add_argument("--train-sizes", default="500,1000,2000,4000")
    parser.add_argument("--orders", default="1,2,3,4")
    parser.add_argument("--train-fraction", type=float, default=0.8)
    parser.add_argument("--ending-items", type=int, default=300)
    parser.add_argument("--heldout-items", type=int, default=400)
    parser.add_argument("--seed", type=int, default=1729)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    source = Path(args.input)
    output = Path(args.output_dir)
    output.mkdir(parents=True, exist_ok=True)
    stories = list(iter_stories(source, limit=args.stories))
    train_pool, heldout = split(stories, args.train_fraction)
    evaluation_heldout = heldout[: min(args.heldout_items, len(heldout))]
    cases = cases_for(evaluation_heldout, args.ending_items, args.seed)
    sizes = sorted(set(int(x) for x in args.train_sizes.split(",") if x.strip()))
    orders = sorted(set(int(x) for x in args.orders.split(",") if x.strip()))
    rows = []
    for requested_size in sizes:
        subset = train_pool[: min(requested_size, len(train_pool))]
        for order in orders:
            started = time.perf_counter()
            result = StoryCircuitTrainer(TrainingConfig(byte_order=order, byte_alpha=0.05, word_order=order, word_alpha=0.05, min_word_count=2, max_stories=len(subset), parse_stories=0)).train_stream(lambda subset=subset: iter(subset))
            model = StoryCircuitModel(result.byte_lm, result.word_lm, result.statistics, model_id=f"count-probe-n{len(subset)}-o{order}")
            train_seconds = time.perf_counter() - started
            eval_started = time.perf_counter()
            evaluation = EvaluationHarness(model).evaluate_cases(cases)
            eval_seconds = time.perf_counter() - eval_started
            families = evaluation["metrics"]["families"]
            likelihood = families["likelihood"]
            ending = families.get("narrative_selection", {})
            complexity = model.complexity()
            rows.append({
                "train_stories": len(subset),
                "order": order,
                "bits_per_byte": likelihood["bits_per_byte"],
                "mean_semantic_coverage": likelihood["mean_semantic_coverage"],
                "ending_accuracy": ending.get("accuracy"),
                "ending_structured_accuracy": ending.get("structured_accuracy"),
                "numeric_parameters": complexity["numeric_parameters"],
                "symbolic_records": complexity["symbolic_records"],
                "train_seconds": train_seconds,
                "eval_seconds": eval_seconds,
            })
            del model, result, evaluation
            gc.collect()

    payload = {
        "schema_version": "0.1",
        "created_at": utc_now(),
        "source": {"path": str(source), "sha256": sha256_file(source), "stories_read": len(stories)},
        "partitions": {"train_pool": len(train_pool), "heldout": len(heldout), "heldout_evaluated": len(evaluation_heldout)},
        "cases": {"total": len(cases), "ending_items": args.ending_items},
        "configuration": vars(args),
        "rows": rows,
        "limitations": [
            "This probe compares count-model scale/order, not the completed semantic model.",
            "Ending negatives are cross-story synthetic negatives.",
            "Semantic structured_score is an unnormalized reranker.",
            "All runs use one deterministic corpus order and should be repeated with alternate samples for publication."
        ]
    }
    write_json(output / "scaling_probe.json", payload)
    with (output / "scaling_probe.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    best = min(rows, key=lambda row: row["bits_per_byte"])
    md = "# Count Scaling Probe\n\n"
    md += f"Read {len(stories)} stories: {len(train_pool)} train-pool and {len(heldout)} held out.\n\n"
    md += f"Best held-out BPB in this grid: **{best['bits_per_byte']:.6f}** at order {best['order']} with {best['train_stories']} stories.\n\n"
    md += "| train stories | order | BPB | ending acc. | structured acc. | numeric records | train s |\n|---:|---:|---:|---:|---:|---:|---:|\n"
    for row in rows:
        md += f"| {row['train_stories']} | {row['order']} | {row['bits_per_byte']:.4f} | {row['ending_accuracy']:.3f} | {row['ending_structured_accuracy']:.3f} | {row['numeric_parameters']} | {row['train_seconds']:.2f} |\n"
    md += "\nThe ending task is close to chance in much of the grid; lower BPB does not automatically produce narrative understanding.\n"
    (output / "SCALING_PROBE.md").write_text(md, encoding="utf-8")
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
