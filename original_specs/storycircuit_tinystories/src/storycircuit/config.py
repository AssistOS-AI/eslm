from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def load_config(path: str | Path) -> dict[str, Any]:
    source = Path(path)
    text = source.read_text(encoding="utf-8")
    try:
        value = json.loads(text)
    except json.JSONDecodeError:
        try:
            import yaml  # type: ignore
        except ImportError as exc:
            raise RuntimeError(
                f"{source} is YAML rather than JSON-compatible YAML; install PyYAML or convert it to JSON"
            ) from exc
        value = yaml.safe_load(text)
    if not isinstance(value, dict):
        raise ValueError(f"Expected mapping in configuration {source}")
    return value
