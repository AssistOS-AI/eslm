from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def load(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    return value.get("metrics", value)


def flatten(prefix: str, value: Any, output: dict[str, float]) -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            flatten(f"{prefix}.{key}" if prefix else key, child, output)
    elif isinstance(value, (int, float)) and not isinstance(value, bool):
        output[prefix] = float(value)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("run_a")
    parser.add_argument("run_b")
    args = parser.parse_args()
    a, b = load(Path(args.run_a)), load(Path(args.run_b))
    flat_a: dict[str, float] = {}
    flat_b: dict[str, float] = {}
    flatten("", a, flat_a)
    flatten("", b, flat_b)
    rows = []
    for key in sorted(flat_a.keys() & flat_b.keys()):
        if key.endswith(("items", "errors")) or "latency" in key:
            direction = "descriptive"
        elif any(term in key for term in ["nll", "bits_per_byte", "perplexity"]):
            direction = "lower_is_better"
        else:
            direction = "higher_is_better"
        rows.append({"metric": key, "a": flat_a[key], "b": flat_b[key], "delta_b_minus_a": flat_b[key] - flat_a[key], "direction": direction})
    print(json.dumps({"run_a": args.run_a, "run_b": args.run_b, "comparisons": rows}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
