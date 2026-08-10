from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from .ir import Argument, Entity, Event, Proposition, Relation, StoryIR
from .parser import lemma_verb


def args_to_dict(arguments: list[Argument]) -> dict[str, Any]:
    return {argument.role: argument.value for argument in arguments}


@dataclass
class StateVersion:
    index: int
    event_id: str | None
    locations: dict[str, str] = field(default_factory=dict)
    owners: dict[str, str] = field(default_factory=dict)
    properties: dict[str, set[str]] = field(default_factory=dict)
    negative_properties: dict[str, set[str]] = field(default_factory=dict)
    relations: set[tuple[str, str, str]] = field(default_factory=set)
    trace: list[dict[str, Any]] = field(default_factory=list)

    def copy_next(self, event_id: str | None) -> "StateVersion":
        return StateVersion(
            index=self.index + 1,
            event_id=event_id,
            locations=dict(self.locations),
            owners=dict(self.owners),
            properties={key: set(values) for key, values in self.properties.items()},
            negative_properties={key: set(values) for key, values in self.negative_properties.items()},
            relations=set(self.relations),
            trace=list(self.trace),
        )


@dataclass
class AnswerResult:
    answer: str
    status: str
    value: Any = None
    proof: list[dict[str, Any]] = field(default_factory=list)
    diagnostics: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "answer": self.answer,
            "status": self.status,
            "value": self.value,
            "proof": self.proof,
            "diagnostics": self.diagnostics,
        }


class WorldRuntime:
    def __init__(self, ir: StoryIR):
        self.ir = ir
        self.entities: dict[str, Entity] = {entity.id: entity for entity in ir.entities}
        self.versions: list[StateVersion] = [StateVersion(index=0, event_id=None)]
        self.event_index: dict[str, Event] = {event.id: event for event in ir.events}
        self._execute()

    @property
    def state(self) -> StateVersion:
        return self.versions[-1]

    def _record(self, state: StateVersion, kind: str, payload: dict[str, Any], source_id: str) -> None:
        state.trace.append({"kind": kind, "payload": payload, "source_id": source_id, "version": state.index})

    def _execute(self) -> None:
        current = self.versions[0]
        ordered: list[tuple[int, int, object]] = []
        for proposition in self.ir.propositions:
            start = proposition.provenance[0].start if proposition.provenance else 10**18
            ordered.append((start, 0, proposition))
        for event in self.ir.events:
            start = event.provenance[0].start if event.provenance else 10**18
            ordered.append((start, 1, event))
        for _, kind, item in sorted(ordered, key=lambda row: (row[0], row[1])):
            current = current.copy_next(item.id)
            if kind == 0:
                self._apply_proposition(current, item)
            else:
                self._apply_event(current, item)
            self.versions.append(current)

    def _apply_proposition(self, state: StateVersion, proposition: Proposition) -> None:
        args = args_to_dict(proposition.arguments)
        if proposition.predicate == "property":
            entity, value = str(args.get("entity")), str(args.get("value"))
            target = state.properties if proposition.polarity == "positive" else state.negative_properties
            other = state.negative_properties if proposition.polarity == "positive" else state.properties
            target.setdefault(entity, set()).add(value)
            other.setdefault(entity, set()).discard(value)
            self._record(state, "property", {"entity": entity, "value": value, "polarity": proposition.polarity}, proposition.id)
        elif proposition.predicate == "location":
            entity, place = str(args.get("entity")), str(args.get("place"))
            state.locations[entity] = place
            self._record(state, "location", {"entity": entity, "place": place}, proposition.id)
        elif proposition.predicate == "possession":
            owner, obj = str(args.get("owner")), str(args.get("object"))
            state.owners[obj] = owner
            self._record(state, "possession", {"owner": owner, "object": obj}, proposition.id)
        elif proposition.predicate == "type":
            self._record(state, "type", args, proposition.id)

    def _apply_event(self, state: StateVersion, event: Event) -> None:
        args = args_to_dict(event.participants)
        event_type = event.type
        if event_type in {"go", "come"}:
            agent, destination = args.get("agent"), args.get("destination")
            if agent and destination:
                state.locations[str(agent)] = str(destination)
                self._record(state, "move", {"entity": agent, "destination": destination}, event.id)
        elif event_type in {"find", "acquire", "take", "pick", "get"}:
            agent, theme = args.get("agent"), args.get("theme")
            if agent and theme:
                state.owners[str(theme)] = str(agent)
                if str(agent) in state.locations:
                    state.locations[str(theme)] = state.locations[str(agent)]
                self._record(state, "acquire", {"owner": agent, "object": theme}, event.id)
        elif event_type == "give":
            theme, recipient = args.get("theme"), args.get("recipient")
            if theme and recipient:
                previous = state.owners.get(str(theme))
                state.owners[str(theme)] = str(recipient)
                self._record(state, "transfer", {"object": theme, "from": previous, "to": recipient}, event.id)
        elif event_type in {"lose", "drop"}:
            theme = args.get("theme")
            if theme:
                previous = state.owners.pop(str(theme), None)
                self._record(state, "release", {"object": theme, "from": previous}, event.id)
        elif event_type == "open":
            theme = args.get("theme")
            if theme:
                state.properties.setdefault(str(theme), set()).add("open")
                state.properties.setdefault(str(theme), set()).discard("closed")
                self._record(state, "property", {"entity": theme, "value": "open"}, event.id)
        elif event_type == "close":
            theme = args.get("theme")
            if theme:
                state.properties.setdefault(str(theme), set()).add("closed")
                state.properties.setdefault(str(theme), set()).discard("open")
                self._record(state, "property", {"entity": theme, "value": "closed"}, event.id)
        elif event_type in {"help", "love", "like", "see"}:
            agent, theme = args.get("agent"), args.get("theme")
            if agent and theme:
                state.relations.add((str(agent), event_type, str(theme)))
                self._record(state, "relation", {"source": agent, "type": event_type, "target": theme}, event.id)
        else:
            self._record(state, "event", {"type": event_type, **args}, event.id)

    def entity_name(self, entity_id: str | None) -> str:
        if not entity_id:
            return "unknown"
        entity = self.entities.get(entity_id)
        if not entity:
            return entity_id
        if entity.name:
            return entity.name
        kind = entity.attributes.get("kind")
        return f"the {kind or entity.type}"

    def find_entity(self, surface: str) -> str | None:
        normalized = re.sub(r"^(?:the|a|an)\s+", "", surface.strip().lower())
        for entity_id, entity in self.entities.items():
            if entity.name and entity.name.lower() == normalized:
                return entity_id
        for entity_id, entity in reversed(list(self.entities.items())):
            if entity.type.lower() == normalized or str(entity.attributes.get("kind", "")).lower() == normalized:
                return entity_id
        return None

    def _proof_for(self, kind: str, **matches: Any) -> list[dict[str, Any]]:
        proof = []
        for item in self.state.trace:
            if item["kind"] != kind:
                continue
            payload = item["payload"]
            if all(payload.get(key) == value for key, value in matches.items()):
                proof.append(item)
        return proof[-3:]

    def answer(self, question: str) -> AnswerResult:
        q = question.strip().rstrip("?.!")

        match = re.match(r"^where (?:is|was) (?P<entity>.+)$", q, re.I)
        if match:
            entity_id = self.find_entity(match.group("entity"))
            if entity_id and entity_id in self.state.locations:
                place = self.state.locations[entity_id]
                return AnswerResult(self.entity_name(place), "known", place, self._proof_for("move", entity=entity_id) or self._proof_for("location", entity=entity_id))
            return AnswerResult("unknown", "unknown", diagnostics=["No final location is represented."])

        match = re.match(r"^who (?:has|had|holds|owns) (?P<object>.+)$", q, re.I)
        if match:
            object_id = self.find_entity(match.group("object"))
            if object_id and object_id in self.state.owners:
                owner = self.state.owners[object_id]
                return AnswerResult(self.entity_name(owner), "known", owner, self._proof_for("transfer", object=object_id) or self._proof_for("acquire", object=object_id) or self._proof_for("possession", object=object_id))
            return AnswerResult("unknown", "unknown", diagnostics=["No represented owner."])

        match = re.match(r"^what did (?P<entity>.+?) (?:find|get|take|pick up)$", q, re.I)
        if match:
            entity_id = self.find_entity(match.group("entity"))
            for event in reversed(self.ir.events):
                args = args_to_dict(event.participants)
                if event.type in {"find", "acquire", "get", "take", "pick"} and args.get("agent") == entity_id:
                    value = str(args.get("theme"))
                    return AnswerResult(self.entity_name(value), "known", value, [{"kind": "event", "source_id": event.id, "event_type": event.type}])
            return AnswerResult("unknown", "unknown")

        match = re.match(r"^(?:is|was) (?P<entity>.+?) (?P<property>[A-Za-z]+)$", q, re.I)
        if match:
            entity_id = self.find_entity(match.group("entity"))
            prop = match.group("property").lower()
            if entity_id and prop in self.state.properties.get(entity_id, set()):
                return AnswerResult("yes", "known", True, self._proof_for("property", entity=entity_id, value=prop))
            if entity_id and prop in self.state.negative_properties.get(entity_id, set()):
                return AnswerResult("no", "known", False, self._proof_for("property", entity=entity_id, value=prop))
            return AnswerResult("unknown", "unknown")

        match = re.match(r"^did (?P<subject>.+?) (?P<verb>[A-Za-z]+) (?P<object>.+)$", q, re.I)
        if match:
            subject = self.find_entity(match.group("subject"))
            obj = self.find_entity(match.group("object"))
            verb = lemma_verb(match.group("verb"))
            for event in self.ir.events:
                args = args_to_dict(event.participants)
                if event.type == verb and args.get("agent") == subject and args.get("theme") == obj:
                    return AnswerResult("yes", "known", True, [{"kind": "event", "source_id": event.id, "event_type": event.type}])
            if subject and obj:
                return AnswerResult("unknown", "unknown")
            return AnswerResult("unknown", "unknown", diagnostics=["Question entities were not resolved."])

        match = re.match(r"^who (?P<verb>[A-Za-z]+) (?P<object>.+)$", q, re.I)
        if match:
            obj = self.find_entity(match.group("object"))
            verb = lemma_verb(match.group("verb"))
            for event in reversed(self.ir.events):
                args = args_to_dict(event.participants)
                if event.type == verb and args.get("theme") == obj:
                    agent = str(args.get("agent"))
                    return AnswerResult(self.entity_name(agent), "known", agent, [{"kind": "event", "source_id": event.id, "event_type": event.type}])
            return AnswerResult("unknown", "unknown")

        match = re.match(r"^why (?:is|was) (?P<entity>.+?) (?P<property>[A-Za-z]+)$", q, re.I)
        if match:
            entity_id = self.find_entity(match.group("entity"))
            prop = match.group("property").lower()
            target_prop_ids = []
            for proposition in self.ir.propositions:
                args = args_to_dict(proposition.arguments)
                if proposition.predicate == "property" and args.get("entity") == entity_id and args.get("value") == prop:
                    target_prop_ids.append(proposition.id)
            for relation in self.ir.relations:
                if relation.type == "causes" and relation.target in target_prop_ids:
                    event = self.event_index.get(relation.source)
                    if event:
                        return AnswerResult(f"because {self._render_event(event)}", "known", relation.source, [{"kind": "causal_relation", "source_id": relation.id}])
            return AnswerResult("unknown", "unknown")

        if re.match(r"^what happened$", q, re.I):
            rendered = [self._render_event(event) for event in self.ir.events if event.type != "opaque_utterance"]
            if rendered:
                return AnswerResult("; ".join(rendered), "known", rendered)
            return AnswerResult("unknown", "unknown")

        return AnswerResult("unsupported", "unsupported", diagnostics=["The reference question compiler has no matching pattern."])

    def _render_event(self, event: Event) -> str:
        args = args_to_dict(event.participants)
        agent = self.entity_name(str(args.get("agent") or args.get("speaker") or ""))
        theme_value = args.get("theme")
        theme = self.entity_name(str(theme_value)) if theme_value else ""
        destination = self.entity_name(str(args.get("destination"))) if args.get("destination") else ""
        recipient = self.entity_name(str(args.get("recipient"))) if args.get("recipient") else ""
        if event.type == "go":
            return f"{agent} went to {destination}"
        if event.type == "give":
            return f"{agent} gave {theme} to {recipient}"
        if theme:
            return f"{agent} {event.type} {theme}"
        return f"{agent} {event.type}".strip()

    def to_trace(self) -> dict[str, Any]:
        return {
            "versions": [
                {
                    "index": version.index,
                    "event_id": version.event_id,
                    "locations": version.locations,
                    "owners": version.owners,
                    "properties": {key: sorted(value) for key, value in version.properties.items()},
                    "negative_properties": {key: sorted(value) for key, value in version.negative_properties.items()},
                    "relations": sorted(list(version.relations)),
                    "trace": version.trace,
                }
                for version in self.versions
            ]
        }
