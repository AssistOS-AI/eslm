from __future__ import annotations

import json
import shutil
from pathlib import Path

from _bootstrap import ROOT
from storycircuit.eval.harness import EvaluationHarness
from storycircuit.learner import TrainingConfig
from storycircuit.model import StoryCircuitModel
from storycircuit.utils import iter_jsonl, sha256_file, utc_now, write_json, write_jsonl


def main() -> int:
    output = ROOT / "results" / "smoke"
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)
    corpus = ROOT / "data" / "smoke" / "stories.txt"
    cases = ROOT / "eval" / "samples" / "smoke_cases.jsonl"
    model_path = output / "model.json"

    model = StoryCircuitModel.train_path(
        corpus,
        TrainingConfig(
            byte_order=3,
            word_order=3,
            min_word_count=1,
            max_stories=20,
            parse_stories=20,
        ),
        model_id="storycircuit-smoke",
    )
    model.save(model_path)
    reloaded = StoryCircuitModel.load(model_path)
    result = EvaluationHarness(reloaded).evaluate_cases(iter_jsonl(cases))
    predictions = result.pop("predictions")
    write_json(output / "metrics.json", result)
    write_jsonl(output / "predictions.jsonl", predictions)
    write_json(output / "run_manifest.json", {
        "schema_version": "0.1",
        "run_id": f"smoke-{sha256_file(model_path)[:12]}",
        "created_at": utc_now(),
        "model": {"path": str(model_path.relative_to(ROOT)), "sha256": sha256_file(model_path)},
        "suite": {"path": str(cases.relative_to(ROOT)), "sha256": sha256_file(cases)},
        "environment": result["environment"],
        "status": "complete",
        "metrics_path": "metrics.json",
        "predictions_path": "predictions.jsonl",
        "errors_path": None,
    })
    summary = {
        "status": "pass" if result["metrics"]["errors"] == 0 else "fail",
        "model": model.metadata(),
        "metrics": result["metrics"],
        "files": {
            "model": str(model_path),
            "metrics": str(output / "metrics.json"),
            "predictions": str(output / "predictions.jsonl"),
        },
    }
    write_json(output / "SMOKE_SUMMARY.json", summary)
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0 if summary["status"] == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
