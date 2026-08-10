from __future__ import annotations

import argparse
import json
from pathlib import Path

from _bootstrap import ROOT
from storycircuit.utils import iter_jsonl


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=str(ROOT))
    args = parser.parse_args()
    root = Path(args.root)
    errors: list[str] = []
    json_files = list(root.rglob("*.json"))
    jsonl_files = list(root.rglob("*.jsonl"))
    for path in json_files:
        if any(part in {".venv", ".git", ".pytest_cache"} for part in path.parts):
            continue
        try:
            json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"{path}: {type(exc).__name__}: {exc}")
    for path in jsonl_files:
        if any(part in {".venv", ".git", ".pytest_cache"} for part in path.parts):
            continue
        try:
            for _ in iter_jsonl(path):
                pass
        except Exception as exc:
            errors.append(f"{path}: {type(exc).__name__}: {exc}")

    try:
        import jsonschema  # type: ignore
    except ImportError:
        jsonschema = None
    schema_checks = 0
    if jsonschema is not None:
        mapping = {
            root / "schemas" / "eval_case.schema.json": list((root / "eval").rglob("*.jsonl")),
            root / "schemas" / "run_manifest.schema.json": list((root / "results").rglob("run_manifest.json")),
        }
        for schema_path, targets in mapping.items():
            if not schema_path.exists():
                continue
            schema = json.loads(schema_path.read_text(encoding="utf-8"))
            for path in targets:
                try:
                    if path.suffix == ".jsonl":
                        for row in iter_jsonl(path):
                            jsonschema.validate(row, schema)
                            schema_checks += 1
                    else:
                        jsonschema.validate(json.loads(path.read_text(encoding="utf-8")), schema)
                        schema_checks += 1
                except Exception as exc:
                    errors.append(f"schema {schema_path.name} <- {path}: {type(exc).__name__}: {exc}")
    payload = {"json_files": len(json_files), "jsonl_files": len(jsonl_files), "schema_checks": schema_checks, "errors": errors, "status": "pass" if not errors else "fail"}
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
