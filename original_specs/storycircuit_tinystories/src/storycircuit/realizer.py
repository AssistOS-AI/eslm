from __future__ import annotations

import random
import re
from dataclasses import dataclass, field
from typing import Any, Iterable

from .learner import InducedStatistics
from .parser import StoryParser
from .utils import weighted_choice


@dataclass
class GenerationConfig:
    seed: int = 0
    max_sentences: int = 8
    temperature: float = 1.0
    required_words: list[str] = field(default_factory=list)
    required_events: list[str] = field(default_factory=list)
    forbidden_words: list[str] = field(default_factory=list)
    strategy: str = "symbolic_plan"
    trace_level: str = "summary"


@dataclass
class GenerationResult:
    text: str
    status: str
    plan: list[dict[str, Any]]
    constraints: dict[str, Any]
    verification: dict[str, Any]
    seed: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "text": self.text,
            "status": self.status,
            "plan": self.plan,
            "constraints": self.constraints,
            "verification": self.verification,
            "seed": self.seed,
        }


def _top(counter: dict[str, int], defaults: list[str], limit: int = 50) -> tuple[list[str], list[float]]:
    ranked = sorted(counter.items(), key=lambda item: (-item[1], item[0]))[:limit]
    values = [key for key, _ in ranked]
    weights = [float(count) for _, count in ranked]
    for default in defaults:
        if default not in values:
            values.append(default)
            weights.append(1.0)
    return values, weights


class NarrativePlanner:
    """Small executable planner used to validate the architecture contracts.

    It is intentionally transparent and replaceable by induced schemas and search.
    """

    def __init__(self, statistics: InducedStatistics):
        self.statistics = statistics

    def compile_prompt(self, prompt: str, config: GenerationConfig) -> dict[str, Any]:
        proper_names = re.findall(r"\b[A-Z][a-z]{2,}\b", prompt)
        stop_names = {"Once", "One", "The", "A", "An", "Then", "When", "After", "Write", "Tell"}
        proper_names = [name for name in proper_names if name not in stop_names]
        required_words = list(dict.fromkeys([word.lower() for word in config.required_words]))
        for word in re.findall(r"\b(?:dog|cat|ball|toy|park|garden|forest|happy|sad|kind|brave)\b", prompt, re.I):
            if word.lower() not in required_words:
                required_words.append(word.lower())
        return {
            "prompt": prompt,
            "names": proper_names,
            "required_words": required_words,
            "required_events": list(config.required_events),
            "forbidden_words": [word.lower() for word in config.forbidden_words],
            "max_sentences": config.max_sentences,
        }

    def plan(self, prompt: str, config: GenerationConfig) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        constraints = self.compile_prompt(prompt, config)
        rng = random.Random(config.seed)
        noisy_names = {"Every", "The", "Then", "One", "Once", "When", "After", "Suddenly", "Finally", "But", "And"}
        name_counts = {name: count for name, count in self.statistics.name_counts.items() if name not in noisy_names and name.isalpha() and 2 <= len(name) <= 20}
        object_stop = {"day", "time", "thing", "it", "and", "story", "something", "everything", "nothing"}
        object_counts = {name: count for name, count in self.statistics.object_type_counts.items() if name.lower() not in object_stop and name.isalpha()}
        location_stop = {"place", "there", "somewhere"}
        location_counts = {name: count for name, count in self.statistics.location_kind_counts.items() if name.lower() not in location_stop and name.isalpha()}
        names, name_weights = _top(name_counts, ["Lily", "Tim", "Mia", "Ben"])
        objects, object_weights = _top(object_counts, ["ball", "toy", "book", "flower"])
        locations, location_weights = _top(location_counts, ["park", "garden", "forest", "home"])
        properties, property_weights = _top(dict(self.statistics.property_counts), ["happy", "sad", "kind", "brave"])

        hero = constraints["names"][0] if constraints["names"] else weighted_choice(names, name_weights, rng)
        friend_candidates = [name for name in names if name != hero]
        friend = constraints["names"][1] if len(constraints["names"]) > 1 else weighted_choice(friend_candidates or ["Sam"], [1.0] * max(1, len(friend_candidates)), rng)
        required = set(constraints["required_words"])
        known_locations = {"park", "garden", "forest", "home", "house", "school", "field", "beach", "cave", "lake", "shop", "river", "room", "farm", "playground"}
        known_properties = {"happy", "sad", "kind", "brave", "scared", "angry", "proud", "sorry", "tired", "excited"}
        required_location = next((word for word in constraints["required_words"] if word in known_locations), None)
        required_property = next((word for word in constraints["required_words"] if word in known_properties), None)
        non_object_words = {hero.lower(), friend.lower()} | known_locations | known_properties
        required_object = next((word for word in constraints["required_words"] if word not in non_object_words), None)
        obj = required_object or next((item for item in objects if item.lower() in required), weighted_choice(objects, object_weights, rng))
        location = required_location or next((item for item in locations if item.lower() in required), weighted_choice(locations, location_weights, rng))
        ending_property = required_property or next((item for item in properties if item.lower() in required), "happy")

        schema_options = ["lost_and_returned", "find_and_share", "help_with_goal"]
        schema_weights = [3.0, 3.0, 2.0]
        schema = weighted_choice(schema_options, schema_weights, rng)

        plan: list[dict[str, Any]] = [
            {"type": "introduce", "entity": hero, "entity_type": "child"},
            {"type": "go", "agent": hero, "destination": location},
        ]
        if schema == "lost_and_returned":
            plan.extend([
                {"type": "have", "owner": hero, "theme": obj},
                {"type": "lose", "agent": hero, "theme": obj},
                {"type": "introduce", "entity": friend, "entity_type": "friend"},
                {"type": "find", "agent": friend, "theme": obj},
                {"type": "give", "agent": friend, "theme": obj, "recipient": hero},
            ])
        elif schema == "find_and_share":
            plan.extend([
                {"type": "find", "agent": hero, "theme": obj},
                {"type": "introduce", "entity": friend, "entity_type": "friend"},
                {"type": "give", "agent": hero, "theme": obj, "recipient": friend},
                {"type": "help", "agent": friend, "theme": hero},
            ])
        else:
            plan.extend([
                {"type": "want", "experiencer": hero, "theme": obj},
                {"type": "introduce", "entity": friend, "entity_type": "friend"},
                {"type": "help", "agent": friend, "theme": hero},
                {"type": "find", "agent": hero, "theme": obj},
            ])
        plan.append({"type": "property", "entity": hero, "value": ending_property})

        required_events = set(constraints["required_events"])
        present_events = {event["type"] for event in plan}
        for event_type in sorted(required_events - present_events):
            if event_type == "give":
                event = {"type": "give", "agent": hero, "theme": obj, "recipient": friend}
            elif event_type == "have":
                event = {"type": "have", "owner": hero, "theme": obj}
            elif event_type == "go":
                event = {"type": "go", "agent": hero, "destination": location}
            elif event_type == "want":
                event = {"type": "want", "experiencer": hero, "theme": obj}
            elif event_type == "property":
                event = {"type": "property", "entity": hero, "value": ending_property}
            elif event_type == "help":
                event = {"type": "help", "agent": friend, "theme": hero}
            else:
                event = {"type": event_type, "agent": hero, "theme": obj}
            plan.insert(-1, event)
        # Required events and the ending have priority over optional middle steps.
        if len(plan) > max(2, config.max_sentences):
            mandatory_types = required_events | {"introduce", "property"}
            mandatory = [event for event in plan if event["type"] in mandatory_types]
            optional = [event for event in plan if event["type"] not in mandatory_types]
            plan = (mandatory[:-1] + optional + mandatory[-1:])[: max(2, config.max_sentences)]
        return plan, constraints


class SurfaceRealizer:
    def __init__(self, statistics: InducedStatistics):
        self.statistics = statistics

    def realize(self, plan: list[dict[str, Any]], *, seed: int = 0) -> str:
        rng = random.Random(seed)
        sentences: list[str] = []
        introduced: set[str] = set()
        for event in plan:
            kind = event["type"]
            if kind == "introduce":
                entity = event["entity"]
                if entity in introduced:
                    continue
                entity_type = event.get("entity_type", "child")
                templates = [
                    f"Once upon a time, there was a {entity_type} named {entity}.",
                    f"One day, a {entity_type} named {entity} was ready for an adventure.",
                ]
                sentences.append(rng.choice(templates))
                introduced.add(entity)
            elif kind == "go":
                sentences.append(f"{event['agent']} went to the {event['destination']}.")
            elif kind == "have":
                sentences.append(f"{event['owner']} had a {event['theme']}.")
            elif kind == "lose":
                sentences.append(f"Then {event['agent']} lost the {event['theme']}.")
            elif kind == "find":
                sentences.append(f"{event['agent']} found the {event['theme']}.")
            elif kind == "give":
                sentences.append(f"{event['agent']} gave the {event['theme']} to {event['recipient']}.")
            elif kind == "help":
                sentences.append(f"{event['agent']} helped {event['theme']}.")
            elif kind == "want":
                sentences.append(f"{event['experiencer']} wanted a {event['theme']}.")
            elif kind == "property":
                sentences.append(f"In the end, {event['entity']} was {event['value']}.")
            else:
                agent = event.get("agent", "The child")
                theme = event.get("theme")
                sentences.append(f"{agent} {kind}{' the ' + str(theme) if theme else ''}.")
        return " ".join(sentences)

    def verify(self, text: str, plan: list[dict[str, Any]], constraints: dict[str, Any]) -> dict[str, Any]:
        parser = StoryParser()
        ir = parser.parse(text, document_id="generated")
        lower = text.lower()
        missing_words = [word for word in constraints.get("required_words", []) if word.lower() not in lower]
        forbidden_present = [word for word in constraints.get("forbidden_words", []) if word.lower() in lower]
        generated_event_types = {event.type for event in ir.events}
        plan_event_types = {event["type"] for event in plan if event["type"] not in {"introduce", "have", "property"}}
        missing_events = sorted(event for event in plan_event_types if event not in generated_event_types and not (event == "help" and "help" in generated_event_types))
        opaque = sum(event.type == "opaque_utterance" for event in ir.events)
        return {
            "passed": not missing_words and not forbidden_present and opaque == 0,
            "missing_words": missing_words,
            "forbidden_present": forbidden_present,
            "missing_events_after_parse_back": missing_events,
            "opaque_sentences": opaque,
            "semantic_coverage": ir.semantic_coverage,
            "entity_count": len(ir.entities),
            "event_count": len(ir.events),
        }
