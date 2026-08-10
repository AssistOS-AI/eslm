from __future__ import annotations

import math
import random
from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Iterable, Sequence

from .text import detokenize, tokenize
from .utils import weighted_choice


@dataclass(frozen=True)
class ScoreResult:
    log_probability: float
    units: int
    bytes: int
    nll_per_unit: float
    bits_per_byte: float
    exact: bool = True
    coverage: float = 1.0
    diagnostics: dict | None = None

    def to_dict(self) -> dict:
        return {
            "log_probability": self.log_probability,
            "units": self.units,
            "bytes": self.bytes,
            "nll_per_unit": self.nll_per_unit,
            "bits_per_byte": self.bits_per_byte,
            "exact": self.exact,
            "coverage": self.coverage,
            "diagnostics": self.diagnostics or {},
        }


class ByteNGramLM:
    """Exact add-alpha byte n-gram with full support over all UTF-8 strings."""

    BOS = 256
    EOS = 257
    ALPHABET = 258

    def __init__(self, order: int = 3, alpha: float = 0.1):
        if order < 1:
            raise ValueError("order must be >= 1")
        if alpha <= 0:
            raise ValueError("alpha must be > 0")
        self.order = order
        self.alpha = alpha
        self.context_counts: dict[tuple[int, ...], Counter[int]] = defaultdict(Counter)
        self.totals: Counter[tuple[int, ...]] = Counter()

    def fit(self, texts: Iterable[str]) -> None:
        for text in texts:
            sequence = [self.BOS] * (self.order - 1) + list(text.encode("utf-8")) + [self.EOS]
            for index in range(self.order - 1, len(sequence)):
                context = tuple(sequence[index - self.order + 1 : index]) if self.order > 1 else ()
                value = sequence[index]
                self.context_counts[context][value] += 1
                self.totals[context] += 1

    def probability(self, context: tuple[int, ...], value: int) -> float:
        if self.order > 1:
            context = context[-(self.order - 1) :]
        else:
            context = ()
        count = self.context_counts.get(context, {}).get(value, 0)
        total = self.totals.get(context, 0)
        return (count + self.alpha) / (total + self.alpha * self.ALPHABET)

    def score(self, text: str) -> ScoreResult:
        raw = list(text.encode("utf-8"))
        sequence = [self.BOS] * (self.order - 1) + raw + [self.EOS]
        log_probability = 0.0
        for index in range(self.order - 1, len(sequence)):
            context = tuple(sequence[index - self.order + 1 : index]) if self.order > 1 else ()
            log_probability += math.log(self.probability(context, sequence[index]))
        units = len(raw) + 1
        byte_count = max(1, len(raw))
        return ScoreResult(
            log_probability=log_probability,
            units=units,
            bytes=len(raw),
            nll_per_unit=-log_probability / max(1, units),
            bits_per_byte=-log_probability / (math.log(2) * byte_count),
            exact=True,
        )

    def conditional_score(self, prefix: str, continuation: str) -> float:
        return self.score(prefix + continuation).log_probability - self.score(prefix).log_probability

    def to_dict(self) -> dict:
        rows = []
        for context in sorted(self.context_counts):
            rows.append({
                "context": list(context),
                "counts": {str(key): value for key, value in sorted(self.context_counts[context].items())},
            })
        return {"order": self.order, "alpha": self.alpha, "rows": rows}

    @classmethod
    def from_dict(cls, value: dict) -> "ByteNGramLM":
        model = cls(order=int(value["order"]), alpha=float(value["alpha"]))
        for row in value.get("rows", []):
            context = tuple(int(item) for item in row["context"])
            for key, count in row["counts"].items():
                model.context_counts[context][int(key)] = int(count)
                model.totals[context] += int(count)
        return model


class WordNGramLM:
    BOS = "<BOS>"
    EOS = "<EOS>"
    UNK = "<UNK>"

    def __init__(self, order: int = 3, alpha: float = 0.1, min_count: int = 1):
        self.order = order
        self.alpha = alpha
        self.min_count = min_count
        self.raw_counts: Counter[str] = Counter()
        self.context_counts: dict[tuple[str, ...], Counter[str]] = defaultdict(Counter)
        self.totals: Counter[tuple[str, ...]] = Counter()
        self.vocabulary: set[str] = {self.UNK, self.EOS}

    def observe_vocabulary(self, texts: Iterable[str]) -> None:
        for text in texts:
            self.raw_counts.update(tokenize(text))
        self.vocabulary.update(token for token, count in self.raw_counts.items() if count >= self.min_count)

    def fit_counts(self, texts: Iterable[str]) -> None:
        if len(self.vocabulary) <= 2 and not self.raw_counts:
            raise RuntimeError("observe_vocabulary must be called before fit_counts")
        for text in texts:
            tokens = tokenize(text)
            mapped = [token if token in self.vocabulary else self.UNK for token in tokens]
            sequence = [self.BOS] * (self.order - 1) + mapped + [self.EOS]
            for index in range(self.order - 1, len(sequence)):
                context = tuple(sequence[index - self.order + 1 : index]) if self.order > 1 else ()
                token = sequence[index]
                self.context_counts[context][token] += 1
                self.totals[context] += 1

    def fit(self, texts: Iterable[str]) -> None:
        # Convenience method for small in-memory experiments. Full-corpus training
        # should call observe_vocabulary and fit_counts on two fresh streams.
        cached = list(texts)
        self.observe_vocabulary(cached)
        self.fit_counts(cached)

    def _map(self, token: str) -> str:
        return token if token in self.vocabulary else self.UNK

    def probability(self, context: Sequence[str], token: str) -> float:
        ctx = tuple(self._map(item) for item in context[-(self.order - 1) :]) if self.order > 1 else ()
        target = self._map(token)
        support_size = max(1, len(self.vocabulary))
        return (self.context_counts.get(ctx, {}).get(target, 0) + self.alpha) / (
            self.totals.get(ctx, 0) + self.alpha * support_size
        )

    def score_tokens(self, tokens: Sequence[str]) -> float:
        mapped = [self._map(token) for token in tokens]
        sequence = [self.BOS] * (self.order - 1) + mapped + [self.EOS]
        score = 0.0
        for index in range(self.order - 1, len(sequence)):
            context = sequence[index - self.order + 1 : index] if self.order > 1 else []
            score += math.log(self.probability(context, sequence[index]))
        return score

    def score(self, text: str) -> float:
        return self.score_tokens(tokenize(text))

    def next_distribution(self, prefix: str, candidates: Sequence[str] | None = None) -> dict[str, float]:
        context = tokenize(prefix)[-(self.order - 1) :] if self.order > 1 else []
        support = list(candidates) if candidates is not None else sorted(self.vocabulary - {self.UNK})
        probabilities = {token: self.probability(context, token) for token in support}
        total = sum(probabilities.values())
        return {token: value / total for token, value in probabilities.items()} if total else {}

    def generate(self, prefix: str, max_tokens: int, seed: int = 0, temperature: float = 1.0) -> str:
        rng = random.Random(seed)
        tokens = tokenize(prefix)
        generated: list[str] = []
        support = sorted(self.vocabulary - {self.UNK})
        for _ in range(max_tokens):
            context = (tokens + generated)[-(self.order - 1) :] if self.order > 1 else []
            probs = [self.probability(context, token) for token in support]
            if temperature != 1.0:
                probs = [prob ** (1.0 / max(1e-6, temperature)) for prob in probs]
            token = weighted_choice(support, probs, rng)
            if token == self.EOS:
                break
            generated.append(token)
        suffix = detokenize(generated)
        if not prefix:
            return suffix
        if not suffix:
            return prefix
        separator = "" if prefix.endswith((" ", "\n")) else " "
        return prefix + separator + suffix

    def to_dict(self) -> dict:
        rows = []
        for context in sorted(self.context_counts):
            rows.append({"context": list(context), "counts": dict(self.context_counts[context])})
        return {
            "order": self.order,
            "alpha": self.alpha,
            "min_count": self.min_count,
            "vocabulary": sorted(self.vocabulary),
            "raw_counts": dict(self.raw_counts),
            "rows": rows,
        }

    @classmethod
    def from_dict(cls, value: dict) -> "WordNGramLM":
        model = cls(order=int(value["order"]), alpha=float(value["alpha"]), min_count=int(value.get("min_count", 1)))
        model.vocabulary = set(value.get("vocabulary", []))
        model.raw_counts.update({key: int(count) for key, count in value.get("raw_counts", {}).items()})
        for row in value.get("rows", []):
            context = tuple(row["context"])
            for token, count in row["counts"].items():
                model.context_counts[context][token] = int(count)
                model.totals[context] += int(count)
        return model
