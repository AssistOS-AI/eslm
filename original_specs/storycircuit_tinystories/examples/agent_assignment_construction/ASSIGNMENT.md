# Coding-Agent Assignment: construction_induction

## Task

Induce a first weighted construction grammar on 500 annotated TinyStories and beat the hand-seeded parser on held-out text-to-IR fidelity without reducing precision.

## Operational constraints

Read every file under `context/` before editing the main repository. Work only on train/dev data. Produce a circuit manifest, tests, before/after metrics, complexity delta, and a completed handoff. Do not alter StoryIR, the LM protocol, or split policy without an ADR.

## First commands

```bash
python scripts/check_environment.py
python scripts/run_smoke.py
pytest -q
python scripts/audit_package.py --skip-tests
```

## Completion command

```bash
python scripts/validate_schemas.py
pytest -q
python scripts/audit_package.py --skip-tests
```
