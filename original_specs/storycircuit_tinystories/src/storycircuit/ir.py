from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

from .utils import sha256_text


@dataclass(frozen=True)
class Span:
    start: int
    end: int
    text: str = ""


@dataclass
class Entity:
    id: str
    type: str = "entity"
    name: str | None = None
    attributes: dict[str, Any] = field(default_factory=dict)
    introduced_by: str | None = None


@dataclass
class Mention:
    id: str
    span: Span
    surface: str
    referent: str | None
    candidates: list[str] = field(default_factory=list)
    status: str = "resolved"


@dataclass
class Argument:
    role: str
    value: str | int | float | bool | None


@dataclass
class Proposition:
    id: str
    predicate: str
    arguments: list[Argument]
    polarity: str = "positive"
    status: str = "asserted"
    modality: str | None = None
    holder: str | None = None
    time: str | None = None
    provenance: list[Span] = field(default_factory=list)


@dataclass
class Event:
    id: str
    type: str
    participants: list[Argument]
    polarity: str = "positive"
    status: str = "asserted"
    tense: str | None = "past"
    aspect: str | None = None
    time: str | None = None
    provenance: list[Span] = field(default_factory=list)
    construction: str | None = None


@dataclass
class Relation:
    id: str
    type: str
    source: str
    target: str
    status: str = "asserted"
    confidence: float | None = None


@dataclass
class Diagnostic:
    code: str
    severity: str
    message: str
    span: Span | None = None
    details: dict[str, Any] = field(default_factory=dict)


@dataclass
class StoryIR:
    document_id: str
    text: str
    source: str | None = None
    entities: list[Entity] = field(default_factory=list)
    mentions: list[Mention] = field(default_factory=list)
    propositions: list[Proposition] = field(default_factory=list)
    events: list[Event] = field(default_factory=list)
    relations: list[Relation] = field(default_factory=list)
    ambiguities: list[dict[str, Any]] = field(default_factory=list)
    diagnostics: list[Diagnostic] = field(default_factory=list)
    schema_version: str = "0.1"

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema_version": self.schema_version,
            "document": {
                "id": self.document_id,
                "text": self.text,
                "sha256": sha256_text(self.text),
                "source": self.source,
                "metadata": {},
            },
            "entities": [asdict(item) for item in self.entities],
            "mentions": [asdict(item) for item in self.mentions],
            "propositions": [asdict(item) for item in self.propositions],
            "events": [asdict(item) for item in self.events],
            "relations": [asdict(item) for item in self.relations],
            "ambiguities": self.ambiguities,
            "diagnostics": [asdict(item) for item in self.diagnostics],
        }

    @property
    def semantic_coverage(self) -> float:
        sentence_like = max(1, sum(self.text.count(mark) for mark in ".!?"))
        covered = len(self.propositions) + sum(event.type != "opaque_utterance" for event in self.events)
        return min(1.0, covered / sentence_like)
