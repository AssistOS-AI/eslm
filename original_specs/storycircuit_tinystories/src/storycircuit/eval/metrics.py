from __future__ import annotations

import math
import random
import re
from collections import Counter
from typing import Callable, Iterable, Sequence


def normalize_answer(text: str) -> str:
    value = text.lower().strip()
    value = re.sub(r"\b(a|an|the)\b", " ", value)
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return " ".join(value.split())


def exact_match(prediction: str, targets: str | Sequence[str]) -> float:
    target_values = [targets] if isinstance(targets, str) else list(targets)
    normalized = normalize_answer(prediction)
    return float(any(normalized == normalize_answer(target) for target in target_values))


def token_f1(prediction: str, targets: str | Sequence[str]) -> float:
    target_values = [targets] if isinstance(targets, str) else list(targets)
    prediction_tokens = normalize_answer(prediction).split()
    best = 0.0
    for target in target_values:
        target_tokens = normalize_answer(target).split()
        common = Counter(prediction_tokens) & Counter(target_tokens)
        overlap = sum(common.values())
        if not prediction_tokens and not target_tokens:
            score = 1.0
        elif not prediction_tokens or not target_tokens or overlap == 0:
            score = 0.0
        else:
            precision = overlap / len(prediction_tokens)
            recall = overlap / len(target_tokens)
            score = 2 * precision * recall / (precision + recall)
        best = max(best, score)
    return best


def mean(values: Iterable[float]) -> float:
    values = list(values)
    return sum(values) / len(values) if values else 0.0


def bootstrap_interval(
    pairs: Sequence[float],
    *,
    statistic: Callable[[Sequence[float]], float] | None = None,
    samples: int = 1000,
    seed: int = 0,
    alpha: float = 0.05,
) -> tuple[float, float]:
    if not pairs:
        return (0.0, 0.0)
    statistic = statistic or (lambda xs: sum(xs) / len(xs))
    rng = random.Random(seed)
    values = []
    for _ in range(samples):
        resample = [pairs[rng.randrange(len(pairs))] for _ in pairs]
        values.append(statistic(resample))
    values.sort()
    low_index = max(0, int((alpha / 2) * len(values)))
    high_index = min(len(values) - 1, int((1 - alpha / 2) * len(values)) - 1)
    return values[low_index], values[high_index]
