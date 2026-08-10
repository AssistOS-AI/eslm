from __future__ import annotations

import argparse
import json
import math
import random
try:
    import resource
except ImportError:  # Windows
    resource = None
import shutil
import time
from pathlib import Path
from typing import Iterable

from _bootstrap import ROOT
from storycircuit.eval.harness import EvaluationHarness
from storycircuit.learner import StoryCircuitTrainer, TrainingConfig
from storycircuit.model import StoryCircuitModel
from storycircuit.text import iter_stories, split_sentences
from storycircuit.utils import environment_snapshot, sha256_file, sha256_text, utc_now, write_json, write_jsonl


def split_by_hash(stories: Iterable[str], train_fraction: float) -> tuple[list[str], list[str]]:
    train: list[str] = []
    heldout: list[str] = []
    threshold = int(train_fraction * (16 ** 16))
    for story in stories:
        digest = sha256_text(story.strip())
        value = int(digest[:16], 16)
        (train if value < threshold else heldout).append(story.strip())
    return train, heldout


def build_cases(heldout: list[str], ending_items: int, seed: int) -> list[dict]:
    cases: list[dict] = []
    endings: list[tuple[str, str]] = []
    for index, story in enumerate(heldout):
        cases.append({
            "schema_version": "0.1",
            "id": f"validation-like-{index}",
            "family": "likelihood",
            "subcategory": "official_validation_local_holdout",
            "input": {"text": story},
            "target": None,
            "tags": ["natural", "official-validation", "local-holdout"],
        })
        sentences = split_sentences(story)
        if len(sentences) >= 2:
            prefix = story[: sentences[-1].start].strip()
            ending = sentences[-1].text
            if prefix and ending:
                endings.append((prefix, ending))
    rng = random.Random(seed)
    rng.shuffle(endings)
    for index, (prefix, correct) in enumerate(endings[: min(ending_items, len(endings))]):
        wrong = None
        for offset in range(1, len(endings)):
            candidate = endings[(index + offset) % len(endings)][1]
            if candidate != correct:
                wrong = candidate
                break
        if wrong is None:
            continue
        candidates = [correct, wrong]
        target = 0
        if rng.random() < 0.5:
            candidates.reverse()
            target = 1
        cases.append({
            "schema_version": "0.1",
            "id": f"validation-ending-{index}",
            "family": "narrative_selection",
            "subcategory": "cross_story_negative",
            "input": {"prefix": prefix, "candidates": candidates},
            "target": {"index": target},
            "tags": ["natural", "official-validation", "synthetic-negative"],
        })
    return cases


def main() -> int:
    parser = argparse.ArgumentParser(description="Run an honest, bounded reference pilot on TinyStories validation text.")
    parser.add_argument("--input", required=True)
    parser.add_argument("--stories", type=int, default=5000)
    parser.add_argument("--train-fraction", type=float, default=0.8)
    parser.add_argument("--ending-items", type=int, default=500)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--seed", type=int, default=1729)
    parser.add_argument("--byte-order", type=int, default=4)
    parser.add_argument("--word-order", type=int, default=4)
    parser.add_argument("--min-word-count", type=int, default=2)
    args = parser.parse_args()

    if not 0 < args.train_fraction < 1:
        raise SystemExit("--train-fraction must be between 0 and 1")
    source = Path(args.input)
    output = Path(args.output_dir)
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)

    read_started = time.perf_counter()
    stories = list(iter_stories(source, limit=args.stories))
    train, heldout = split_by_hash(stories, args.train_fraction)
    if not train or not heldout:
        raise SystemExit("hash split produced an empty partition; increase --stories")
    write_jsonl(output / "train_manifest.jsonl", ({"id": f"train-{i}", "sha256": sha256_text(s)} for i, s in enumerate(train)))
    write_jsonl(output / "heldout_manifest.jsonl", ({"id": f"heldout-{i}", "sha256": sha256_text(s)} for i, s in enumerate(heldout)))
    read_seconds = time.perf_counter() - read_started

    config = TrainingConfig(
        byte_order=args.byte_order,
        byte_alpha=0.05,
        word_order=args.word_order,
        word_alpha=0.05,
        min_word_count=args.min_word_count,
        max_stories=len(train),
        parse_stories=len(train),
    )
    trainer = StoryCircuitTrainer(config)
    train_started = time.perf_counter()
    result = trainer.train_stream(lambda: iter(train))
    model = StoryCircuitModel(result.byte_lm, result.word_lm, result.statistics, model_id="storycircuit-validation-pilot")
    training_seconds = time.perf_counter() - train_started
    model_path = output / "model.json"
    model.save(model_path)

    cases = build_cases(heldout, args.ending_items, args.seed)
    cases_path = output / "cases.jsonl"
    write_jsonl(cases_path, cases)
    evaluation_started = time.perf_counter()
    evaluation = EvaluationHarness(model).evaluate_cases(cases)
    evaluation_seconds = time.perf_counter() - evaluation_started
    predictions = evaluation.pop("predictions")
    write_json(output / "metrics.json", evaluation)
    write_jsonl(output / "predictions.jsonl", predictions)

    parser_coverage = []
    opaque_rates = []
    for story in heldout:
        ir = model.parse(story)
        events = ir.get("events", [])
        propositions = ir.get("propositions", [])
        opaque = sum(event.get("type") == "opaque_utterance" for event in events)
        sentence_like = max(1, sum(story.count(mark) for mark in ".!?"))
        covered = len(propositions) + sum(event.get("type") != "opaque_utterance" for event in events)
        parser_coverage.append(min(1.0, covered / sentence_like))
        opaque_rates.append(opaque / max(1, len(events)))

    peak_rss_kib = int(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss) if resource is not None else None
    # ru_maxrss is bytes on macOS and KiB on Linux. Keep raw field and platform snapshot.
    summary = {
        "schema_version": "0.1",
        "created_at": utc_now(),
        "status": "complete",
        "source": {"path": str(source), "sha256": sha256_file(source), "bytes": source.stat().st_size},
        "configuration": vars(args),
        "partitions": {"total": len(stories), "train": len(train), "heldout": len(heldout)},
        "timing_seconds": {"read_split": read_seconds, "training": training_seconds, "evaluation": evaluation_seconds},
        "resources": {"ru_maxrss_raw": peak_rss_kib, "environment": environment_snapshot()},
        "model": {"path": str(model_path), "sha256": sha256_file(model_path), "bytes": model_path.stat().st_size, "metadata": model.metadata()},
        "natural_evaluation": evaluation["metrics"],
        "compiler_diagnostics": {
            "mean_semantic_coverage": sum(parser_coverage) / max(1, len(parser_coverage)),
            "mean_opaque_event_rate": sum(opaque_rates) / max(1, len(opaque_rates)),
        },
        "interpretation": [
            "This is a bounded reference-pipeline pilot, not the complete induced symbolic model.",
            "Exact likelihood is supplied by the byte n-gram component; semantic structures are diagnostic/reranking features.",
            "The held-out partition is drawn from an official validation file rather than the official training corpus.",
            "Cross-story ending negatives are synthetic and may be solvable using topical surface cues.",
            "The high-precision parser is partly hand-seeded and is expected to have limited natural-text coverage."
        ],
    }
    write_json(output / "PILOT_SUMMARY.json", summary)
    report = "# Validation Pilot Report\n\n"
    report += f"Source: `{source}` (`{summary['source']['sha256']}`).\n\n"
    report += f"Stories: {len(stories)} total, {len(train)} train, {len(heldout)} held out.\n\n"
    lm = summary['natural_evaluation']['families'].get('likelihood', {})
    ending = summary['natural_evaluation']['families'].get('narrative_selection', {})
    report += f"Held-out bits per byte: {lm.get('bits_per_byte', float('nan')):.6f}.\n\n"
    report += f"Cross-story ending accuracy: {ending.get('accuracy', float('nan')):.4f}; structured accuracy: {ending.get('structured_accuracy', float('nan')):.4f}.\n\n"
    report += f"Mean parser semantic coverage diagnostic: {summary['compiler_diagnostics']['mean_semantic_coverage']:.4f}.\n\n"
    report += "## Limits\n\n" + "\n".join(f"- {item}" for item in summary['interpretation']) + "\n"
    (output / "PILOT_REPORT.md").write_text(report, encoding="utf-8")
    write_json(output / "run_manifest.json", {
        "schema_version": "0.1",
        "run_id": f"validation-pilot-{sha256_file(model_path)[:12]}",
        "created_at": summary["created_at"],
        "model": {"path": "model.json", "sha256": summary["model"]["sha256"]},
        "suite": {"path": "external-reconstructed-cases", "sha256": sha256_file(cases_path), "source_sha256": summary["source"]["sha256"]},
        "environment": summary["resources"]["environment"],
        "status": "complete",
        "metrics_path": "metrics.json",
        "predictions_path": "predictions.jsonl",
        "errors_path": None,
    })
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
