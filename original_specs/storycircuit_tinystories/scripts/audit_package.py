from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

from _bootstrap import ROOT

REQUIRED = [
    "README_RO.md", "README.md", "PROJECT_CHARTER.md", "pyproject.toml",
    "theory/00_RESEARCH_PROGRAM.md", "theory/06_EVALUATION_AND_FALSIFICATION.md",
    "architecture/LM_PROTOCOL.md", "architecture/STORYIR_CONTRACT.md",
    "design_specs/DS-001-RESEARCH-CONTRACT.md", "design_specs/DS-020-SCALING-PERFORMANCE-AND-SANDBOX.md",
    "agents/AGENT_OPERATING_MANUAL.md", "agents/MASTER_CODING_AGENT_PROMPT.md",
    "docs/LOCAL_RUNBOOK.md", "docs/EXPERIMENT_MATRIX.md",
    "src/storycircuit/model.py", "scripts/run_smoke.py", "eval/TAXONOMY.md",
]
FORBIDDEN_RAW_NAMES = {"TinyStories-train.txt", "TinyStories-valid.txt", "TinyStoriesV2-GPT4-train.txt", "TinyStoriesV2-GPT4-valid.txt"}


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(1024 * 1024):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=str(ROOT))
    parser.add_argument("--write-manifest", action="store_true")
    parser.add_argument("--skip-tests", action="store_true")
    parser.add_argument("--allow-raw-data", action="store_true", help="development mode; packaging should leave this disabled")
    args = parser.parse_args()
    root = Path(args.root)
    errors: list[str] = []
    warnings: list[str] = []
    for rel in REQUIRED:
        if not (root / rel).exists():
            errors.append(f"missing required file: {rel}")
    if not args.allow_raw_data:
        for path in root.rglob("*"):
            if path.is_file() and path.name in FORBIDDEN_RAW_NAMES:
                errors.append(f"raw TinyStories corpus must not be packaged: {path.relative_to(root)}")
    schema = subprocess.run([sys.executable, str(root / "scripts" / "validate_schemas.py"), "--root", str(root)], cwd=root, text=True, capture_output=True)
    if schema.returncode:
        errors.append("schema/JSON validation failed")
        warnings.append(schema.stdout + schema.stderr)
    tests = None
    if not args.skip_tests:
        tests = subprocess.run([sys.executable, "-m", "pytest", "-q"], cwd=root, text=True, capture_output=True)
        if tests.returncode:
            errors.append("pytest failed")
            warnings.append(tests.stdout + tests.stderr)
    files = []
    ignored_parts = {".git", ".venv", ".pytest_cache", "__pycache__", "data/raw", "data/prepared"}
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(root)
        rel_text = rel.as_posix()
        if any(part in {".git", ".venv", ".pytest_cache", "__pycache__"} for part in rel.parts):
            continue
        if rel_text.startswith("data/raw/") or rel_text.startswith("data/prepared/"):
            continue
        if rel.name == "MANIFEST.sha256":
            continue
        files.append((rel_text, path.stat().st_size, digest(path)))
    if args.write_manifest:
        (root / "MANIFEST.sha256").write_text("".join(f"{sha}  {name}\n" for name, _, sha in files), encoding="utf-8")
    payload = {
        "status": "pass" if not errors else "fail",
        "root": str(root),
        "files": len(files),
        "bytes": sum(size for _, size, _ in files),
        "errors": errors,
        "warnings": warnings,
        "pytest": None if tests is None else {"returncode": tests.returncode, "stdout": tests.stdout.strip(), "stderr": tests.stderr.strip()},
        "manifest_written": bool(args.write_manifest),
    }
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
