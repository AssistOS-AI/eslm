from __future__ import annotations

import argparse
import json
from pathlib import Path

from _bootstrap import ROOT
from storycircuit.config import load_config
from storycircuit.eval.harness import EvaluationHarness
from storycircuit.model import StoryCircuitModel
from storycircuit.utils import iter_jsonl, sha256_file, utc_now, write_json, write_jsonl


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--suite", required=True)
    parser.add_argument("--output-dir")
    args = parser.parse_args()

    suite_path = Path(args.suite)
    suite = load_config(suite_path)
    cases = []
    for raw_path in suite.get("case_files", []):
        path = Path(raw_path)
        if not path.is_absolute():
            path = ROOT / path
        cases.extend(iter_jsonl(path))
    model = StoryCircuitModel.load(args.model)
    result = EvaluationHarness(model).evaluate_cases(cases)
    result["suite"] = {"path": str(suite_path), "sha256": sha256_file(suite_path), "name": suite.get("name")}
    output_dir = Path(args.output_dir or suite.get("output_dir", ROOT / "results" / suite.get("name", "evaluation")))
    output_dir.mkdir(parents=True, exist_ok=True)
    predictions = result.pop("predictions")
    write_json(output_dir / "metrics.json", result)
    write_jsonl(output_dir / "predictions.jsonl", predictions)
    write_json(output_dir / "run_manifest.json", {
        "schema_version": "0.1",
        "run_id": f"{suite.get('name', 'eval')}-{sha256_file(args.model)[:10]}",
        "created_at": utc_now(),
        "model": {"path": str(args.model), "sha256": sha256_file(args.model)},
        "suite": result["suite"],
        "environment": result["environment"],
        "status": "complete",
        "metrics_path": "metrics.json",
        "predictions_path": "predictions.jsonl",
        "errors_path": None,
    })
    print(json.dumps(result["metrics"], indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
