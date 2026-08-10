from __future__ import annotations

import argparse
import json
from pathlib import Path

from _bootstrap import ROOT
from storycircuit.config import load_config
from storycircuit.eval.harness import EvaluationHarness
from storycircuit.model import StoryCircuitModel
from storycircuit.utils import iter_jsonl, sha256_file, utc_now, write_json


def sanitize(metrics: dict) -> dict:
    families = {}
    for family, values in metrics.get("families", {}).items():
        families[family] = {
            key: value
            for key, value in values.items()
            if key in {"items", "errors", "accuracy", "accuracy_ci95", "structured_accuracy", "exact_match", "token_f1", "bits_per_byte", "mean_semantic_coverage"}
        }
    return {"items": metrics.get("items"), "errors": metrics.get("errors"), "families": families}


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate on a protected suite and emit aggregate metrics only.")
    parser.add_argument("--model", required=True)
    parser.add_argument("--suite", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--baseline")
    parser.add_argument("--max-regression", type=float, default=0.02)
    args = parser.parse_args()

    suite = load_config(args.suite)
    cases = []
    for raw in suite.get("case_files", []):
        path = Path(raw)
        if not path.is_absolute():
            path = ROOT / path
        cases.extend(iter_jsonl(path))
    model = StoryCircuitModel.load(args.model)
    raw_result = EvaluationHarness(model).evaluate_cases(cases)
    aggregate = sanitize(raw_result["metrics"])
    gate = {"passed": True, "reasons": []}
    if args.baseline:
        baseline = json.loads(Path(args.baseline).read_text(encoding="utf-8"))
        baseline_metrics = baseline.get("metrics", baseline)
        for family, current in aggregate["families"].items():
            old = baseline_metrics.get("families", {}).get(family, {})
            for metric in ["accuracy", "structured_accuracy", "exact_match", "token_f1"]:
                if metric in current and metric in old and float(current[metric]) + args.max_regression < float(old[metric]):
                    gate["passed"] = False
                    gate["reasons"].append(f"{family}.{metric} regressed beyond {args.max_regression}")
    payload = {
        "schema_version": "0.1",
        "created_at": utc_now(),
        "model_sha256": sha256_file(args.model),
        "suite_sha256": sha256_file(args.suite),
        "aggregate": aggregate,
        "gate": gate,
        "redaction": "No item text, target, prediction, or trace is emitted.",
    }
    write_json(args.output, payload)
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0 if gate["passed"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
