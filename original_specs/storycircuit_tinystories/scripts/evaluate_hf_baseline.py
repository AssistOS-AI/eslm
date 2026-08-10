from __future__ import annotations

import argparse
import json
from pathlib import Path

from _bootstrap import ROOT
from storycircuit.config import load_config
from storycircuit.eval.harness import EvaluationHarness
from storycircuit.eval.hf_adapter import HFCausalAdapter
from storycircuit.utils import iter_jsonl, write_json, write_jsonl


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--revision")
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--suite", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()
    suite = load_config(args.suite)
    cases = []
    for raw_path in suite.get("case_files", []):
        path = Path(raw_path)
        if not path.is_absolute():
            path = ROOT / path
        # HF adapter supports only shared LM families; other cases report errors/unsupported.
        cases.extend(case for case in iter_jsonl(path) if case.get("family") in {"likelihood", "minimal_pair", "narrative_selection", "generation"})
    adapter = HFCausalAdapter(args.model, revision=args.revision, device=args.device)
    result = EvaluationHarness(adapter).evaluate_cases(cases)
    output = Path(args.output_dir)
    output.mkdir(parents=True, exist_ok=True)
    predictions = result.pop("predictions")
    write_json(output / "metrics.json", result)
    write_jsonl(output / "predictions.jsonl", predictions)
    print(json.dumps(result["metrics"], indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
