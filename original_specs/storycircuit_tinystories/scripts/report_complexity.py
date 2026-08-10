from __future__ import annotations

import argparse
import json
from pathlib import Path

from _bootstrap import ROOT
from storycircuit.model import StoryCircuitModel
from storycircuit.utils import sha256_file


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--source-root", default=str(ROOT / "src"))
    args = parser.parse_args()
    model_path = Path(args.model)
    model = StoryCircuitModel.load(model_path)
    root = Path(args.source_root)
    source_files = [path for path in root.rglob("*.py") if path.is_file()]
    payload = {
        "model": str(model_path),
        "model_sha256": sha256_file(model_path),
        "artifact_bytes": model_path.stat().st_size,
        "learned_complexity": model.complexity(),
        "engine": {
            "source_root": str(root),
            "python_files": len(source_files),
            "source_bytes": sum(path.stat().st_size for path in source_files),
            "source_lines": sum(len(path.read_text(encoding="utf-8").splitlines()) for path in source_files),
        },
        "note": "Engine code and learned artifacts are reported separately; hand-written domain mechanisms must still be disclosed."
    }
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
