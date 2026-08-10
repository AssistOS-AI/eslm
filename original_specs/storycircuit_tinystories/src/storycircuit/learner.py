from __future__ import annotations

import math
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Iterable, Iterator

from .ngram import ByteNGramLM, WordNGramLM
from .parser import StoryParser
from .text import iter_stories


@dataclass
class InducedStatistics:
    story_count: int = 0
    sentence_count: int = 0
    parsed_item_count: int = 0
    opaque_sentence_count: int = 0
    construction_counts: Counter[str] = field(default_factory=Counter)
    entity_type_counts: Counter[str] = field(default_factory=Counter)
    name_counts: Counter[str] = field(default_factory=Counter)
    property_counts: Counter[str] = field(default_factory=Counter)
    object_type_counts: Counter[str] = field(default_factory=Counter)
    location_kind_counts: Counter[str] = field(default_factory=Counter)
    event_counts: Counter[str] = field(default_factory=Counter)
    event_transition_counts: Counter[tuple[str, str]] = field(default_factory=Counter)
    story_event_shapes: Counter[tuple[str, ...]] = field(default_factory=Counter)

    def to_dict(self) -> dict:
        return {
            "story_count": self.story_count,
            "sentence_count": self.sentence_count,
            "parsed_item_count": self.parsed_item_count,
            "opaque_sentence_count": self.opaque_sentence_count,
            "coverage": self.parsed_item_count / max(1, self.sentence_count),
            "construction_counts": dict(self.construction_counts),
            "entity_type_counts": dict(self.entity_type_counts),
            "name_counts": dict(self.name_counts),
            "property_counts": dict(self.property_counts),
            "object_type_counts": dict(self.object_type_counts),
            "location_kind_counts": dict(self.location_kind_counts),
            "event_counts": dict(self.event_counts),
            "event_transition_counts": {f"{a}\t{b}": count for (a, b), count in self.event_transition_counts.items()},
            "story_event_shapes": {"\t".join(shape): count for shape, count in self.story_event_shapes.items()},
        }

    @classmethod
    def from_dict(cls, value: dict) -> "InducedStatistics":
        stats = cls(
            story_count=int(value.get("story_count", 0)),
            sentence_count=int(value.get("sentence_count", 0)),
            parsed_item_count=int(value.get("parsed_item_count", 0)),
            opaque_sentence_count=int(value.get("opaque_sentence_count", 0)),
        )
        for field_name in [
            "construction_counts", "entity_type_counts", "name_counts", "property_counts",
            "object_type_counts", "location_kind_counts", "event_counts"
        ]:
            getattr(stats, field_name).update({key: int(count) for key, count in value.get(field_name, {}).items()})
        for key, count in value.get("event_transition_counts", {}).items():
            a, b = key.split("\t", 1)
            stats.event_transition_counts[(a, b)] = int(count)
        for key, count in value.get("story_event_shapes", {}).items():
            stats.story_event_shapes[tuple(key.split("\t")) if key else tuple()] = int(count)
        return stats


@dataclass
class TrainingConfig:
    byte_order: int = 3
    byte_alpha: float = 0.1
    word_order: int = 3
    word_alpha: float = 0.1
    min_word_count: int = 2
    max_stories: int | None = None
    parse_stories: int | None = None


@dataclass
class TrainingResult:
    byte_lm: ByteNGramLM
    word_lm: WordNGramLM
    statistics: InducedStatistics


class StoryCircuitTrainer:
    def __init__(self, config: TrainingConfig | None = None):
        self.config = config or TrainingConfig()

    def train_path(self, path: str | Path) -> TrainingResult:
        source = Path(path)

        def stream() -> Iterator[str]:
            yield from iter_stories(source, limit=self.config.max_stories)

        return self.train_stream(stream)

    def train_stream(self, stream_factory: Callable[[], Iterable[str]]) -> TrainingResult:
        byte_lm = ByteNGramLM(order=self.config.byte_order, alpha=self.config.byte_alpha)
        byte_lm.fit(stream_factory())

        word_lm = WordNGramLM(order=self.config.word_order, alpha=self.config.word_alpha, min_count=self.config.min_word_count)
        word_lm.observe_vocabulary(stream_factory())
        word_lm.fit_counts(stream_factory())

        stats = self._induce_statistics(stream_factory())
        return TrainingResult(byte_lm=byte_lm, word_lm=word_lm, statistics=stats)

    def _induce_statistics(self, stories: Iterable[str]) -> InducedStatistics:
        stats = InducedStatistics()
        parser = StoryParser()
        parse_limit = self.config.parse_stories if self.config.parse_stories is not None else self.config.max_stories
        for story_index, story in enumerate(stories):
            stats.story_count += 1
            if parse_limit is not None and story_index >= parse_limit:
                continue
            ir = parser.parse(story, document_id=f"train-{story_index}")
            sentence_count = max(1, sum(story.count(mark) for mark in ".!?"))
            stats.sentence_count += sentence_count
            semantic_items = sum(event.type != "opaque_utterance" for event in ir.events) + len(ir.propositions)
            stats.parsed_item_count += min(sentence_count, semantic_items)
            stats.opaque_sentence_count += sum(event.type == "opaque_utterance" for event in ir.events)
            for entity in ir.entities:
                stats.entity_type_counts[entity.type] += 1
                if entity.name:
                    stats.name_counts[entity.name] += 1
                if entity.type == "location":
                    stats.location_kind_counts[str(entity.attributes.get("kind", "place"))] += 1
                elif entity.type not in {"person", "boy", "girl", "man", "woman"}:
                    stats.object_type_counts[entity.type] += 1
            for proposition in ir.propositions:
                if proposition.predicate == "property":
                    value = next((argument.value for argument in proposition.arguments if argument.role == "value"), None)
                    if value:
                        stats.property_counts[str(value)] += 1
            sequence = [event.type for event in ir.events if event.type != "opaque_utterance"]
            stats.event_counts.update(sequence)
            stats.story_event_shapes[tuple(sequence[:12])] += 1
            stats.event_transition_counts.update(zip(sequence, sequence[1:]))
            for event in ir.events:
                if event.construction:
                    stats.construction_counts[event.construction] += 1
            # Proposition construction counts are already represented in parser stats;
            # copy only the delta from this story is unavailable, so count common kinds explicitly.
            for proposition in ir.propositions:
                stats.construction_counts[f"proposition:{proposition.predicate}"] += 1
        return stats
