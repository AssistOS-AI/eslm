from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol, Sequence, runtime_checkable

from .ngram import ScoreResult
from .realizer import GenerationConfig, GenerationResult


@runtime_checkable
class LanguageModelAdapter(Protocol):
    def metadata(self) -> dict[str, Any]: ...
    def score_text(self, text: str) -> ScoreResult: ...
    def score_continuations(self, prefix: str, continuations: Sequence[str]) -> Sequence[Any]: ...
    def generate(self, prompt: str, config: GenerationConfig | None = None) -> GenerationResult: ...
