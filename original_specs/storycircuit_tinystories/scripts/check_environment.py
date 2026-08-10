from __future__ import annotations

import importlib.util
import json
import shutil
import sys
from pathlib import Path

from _bootstrap import ROOT


def main() -> int:
    required = (3, 11)
    disk = shutil.disk_usage(ROOT)
    result = {
        "python": sys.version,
        "python_ok": sys.version_info >= required,
        "project_root": str(ROOT),
        "free_disk_gb": round(disk.free / (1024 ** 3), 2),
        "optional_packages": {
            name: importlib.util.find_spec(name) is not None
            for name in ["pytest", "jsonschema", "yaml", "torch", "transformers", "datasets"]
        },
        "recommendations": [],
    }
    if not result["python_ok"]:
        result["recommendations"].append("Install Python 3.11 or newer.")
    if disk.free < 12 * 1024 ** 3:
        result["recommendations"].append("A full TinyStories run needs substantially more free disk space than the smoke run.")
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result["python_ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
