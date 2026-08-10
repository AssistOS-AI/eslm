from __future__ import annotations

import hashlib
import json
import math
import os
import platform
import random
import re
import sys
from dataclasses import asdict, is_dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Iterator, Sequence, TypeVar

T = TypeVar("T")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_text(text: str) -> str:
    return sha256_bytes(text.encode("utf-8"))


def sha256_file(path: str | Path, chunk_size: int = 1024 * 1024) -> str:
    h = hashlib.sha256()
    with Path(path).open("rb") as handle:
        while chunk := handle.read(chunk_size):
            h.update(chunk)
    return h.hexdigest()


def stable_json(value: Any) -> str:
    if is_dataclass(value):
        value = asdict(value)
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def write_json(path: str | Path, value: Any, *, indent: int = 2) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    if is_dataclass(value):
        value = asdict(value)
    target.write_text(json.dumps(value, ensure_ascii=False, indent=indent, sort_keys=True) + "\n", encoding="utf-8")


def read_json(path: str | Path) -> Any:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def iter_jsonl(path: str | Path) -> Iterator[dict[str, Any]]:
    with Path(path).open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            stripped = line.strip()
            if not stripped:
                continue
            try:
                value = json.loads(stripped)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSONL at {path}:{line_number}: {exc}") from exc
            if not isinstance(value, dict):
                raise ValueError(f"Expected object at {path}:{line_number}")
            yield value


def write_jsonl(path: str | Path, rows: Iterable[dict[str, Any]]) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")


def logsumexp(values: Sequence[float]) -> float:
    if not values:
        return -math.inf
    maximum = max(values)
    if maximum == -math.inf:
        return maximum
    return maximum + math.log(sum(math.exp(value - maximum) for value in values))


def normalized_log_weights(log_weights: Sequence[float]) -> list[float]:
    denominator = logsumexp(log_weights)
    return [value - denominator for value in log_weights]


def weighted_choice(items: Sequence[T], weights: Sequence[float], rng: random.Random) -> T:
    if len(items) != len(weights) or not items:
        raise ValueError("items and weights must have equal non-zero length")
    total = sum(max(0.0, weight) for weight in weights)
    if total <= 0:
        return items[rng.randrange(len(items))]
    threshold = rng.random() * total
    cumulative = 0.0
    for item, weight in zip(items, weights):
        cumulative += max(0.0, weight)
        if cumulative >= threshold:
            return item
    return items[-1]


def environment_snapshot() -> dict[str, Any]:
    return {
        "python": sys.version,
        "implementation": platform.python_implementation(),
        "platform": platform.platform(),
        "machine": platform.machine(),
        "processor": platform.processor(),
        "cpu_count": os.cpu_count(),
    }


def slugify(text: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9]+", "-", text.strip()).strip("-").lower()
    return value or "item"
