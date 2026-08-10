from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

from _bootstrap import ROOT
from storycircuit.utils import sha256_file, utc_now, write_json

CORE = [
    "PROJECT_CHARTER.md",
    "agents/MASTER_CODING_AGENT_PROMPT.md",
    "agents/AGENT_OPERATING_MANUAL.md",
    "theory/00_RESEARCH_PROGRAM.md",
    "theory/02_TASK_AND_CAPABILITY_TAXONOMY.md",
    "architecture/SYSTEM_OVERVIEW.md",
    "agents/HANDOFF_TEMPLATE.md",
    "agents/FAILURE_PACKET_SCHEMA.md",
]


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a self-contained context packet for a StoryCircuit coding-agent workstream.")
    parser.add_argument("--workstream", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--task", default="Implement the next falsifiable milestone defined by the assigned design specifications.")
    args = parser.parse_args()

    workstreams = json.loads((ROOT / "agents" / "WORKSTREAMS.json").read_text(encoding="utf-8"))
    if args.workstream not in workstreams:
        raise SystemExit(f"unknown workstream {args.workstream!r}; choose one of: {', '.join(sorted(workstreams))}")
    spec = workstreams[args.workstream]
    paths = list(dict.fromkeys(CORE + [spec["role_prompt"]] + spec["specs"] + spec["contracts"]))
    output = Path(args.output)
    if output.exists():
        shutil.rmtree(output)
    context_dir = output / "context"
    context_dir.mkdir(parents=True)
    manifest_files = []
    for rel in paths:
        source = ROOT / rel
        if not source.exists():
            raise SystemExit(f"missing context file: {rel}")
        target = context_dir / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        manifest_files.append({"path": rel, "sha256": sha256_file(source), "bytes": source.stat().st_size})
    assignment = f"""# Coding-Agent Assignment: {args.workstream}\n\n## Task\n\n{args.task}\n\n## Operational constraints\n\nRead every file under `context/` before editing the main repository. Work only on train/dev data. Produce a circuit manifest, tests, before/after metrics, complexity delta, and a completed handoff. Do not alter StoryIR, the LM protocol, or split policy without an ADR.\n\n## First commands\n\n```bash\npython scripts/check_environment.py\npython scripts/run_smoke.py\npytest -q\npython scripts/audit_package.py --skip-tests\n```\n\n## Completion command\n\n```bash\npython scripts/validate_schemas.py\npytest -q\npython scripts/audit_package.py --skip-tests\n```\n"""
    (output / "ASSIGNMENT.md").write_text(assignment, encoding="utf-8")
    write_json(output / "context_manifest.json", {
        "schema_version": "0.1",
        "created_at": utc_now(),
        "workstream": args.workstream,
        "task": args.task,
        "files": manifest_files,
    })
    (output / "EXPECTED_OUTPUTS.md").write_text((ROOT / "agents" / "HANDOFF_TEMPLATE.md").read_text(encoding="utf-8"), encoding="utf-8")
    print(json.dumps({"output": str(output), "workstream": args.workstream, "files": len(manifest_files)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
