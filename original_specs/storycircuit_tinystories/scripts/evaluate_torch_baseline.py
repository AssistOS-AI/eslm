from __future__ import annotations

import argparse
import json
from pathlib import Path

from _bootstrap import ROOT
from storycircuit.config import load_config
from storycircuit.eval.harness import EvaluationHarness
from storycircuit.eval.torch_byte_adapter import TorchByteCausalAdapter
from storycircuit.utils import environment_snapshot, iter_jsonl, sha256_file, utc_now, write_json, write_jsonl


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--suite", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--stride", type=int)
    args = parser.parse_args()
    suite = load_config(args.suite)
    cases = []
    for raw_path in suite.get("case_files", []):
        path = Path(raw_path)
        if not path.is_absolute():
            path = ROOT / path
        cases.extend(case for case in iter_jsonl(path) if case.get("family") in {"likelihood", "minimal_pair", "narrative_selection", "generation"})
    adapter = TorchByteCausalAdapter(args.checkpoint, device=args.device, stride=args.stride)
    result = EvaluationHarness(adapter).evaluate_cases(cases)
    output = Path(args.output_dir)
    output.mkdir(parents=True, exist_ok=True)
    predictions = result.pop("predictions")
    write_json(output / "metrics.json", result)
    write_jsonl(output / "predictions.jsonl", predictions)
    write_json(output / "run_manifest.json", {
        "schema_version": "0.1",
        "run_id": f"torch-byte-{sha256_file(args.checkpoint)[:12]}",
        "created_at": utc_now(),
        "model": {"path": args.checkpoint, "sha256": sha256_file(args.checkpoint)},
        "suite": {"path": args.suite, "sha256": sha256_file(args.suite)},
        "environment": environment_snapshot(),
        "status": "complete",
        "metrics_path": "metrics.json",
        "predictions_path": "predictions.jsonl",
        "errors_path": None,
    })
    print(json.dumps(result["metrics"], indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
