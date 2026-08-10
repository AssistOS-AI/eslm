from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field
from typing import Iterable

from .ir import Argument, Diagnostic, Entity, Event, Mention, Proposition, Relation, Span, StoryIR
from .text import Sentence, split_sentences
from .utils import sha256_text

DETERMINERS = {"a", "an", "the", "this", "that", "his", "her", "their", "its", "my", "your"}
PRONOUNS = {"he", "she", "him", "her", "they", "them", "it", "himself", "herself", "itself"}
PERSON_TYPES = {"person", "boy", "girl", "man", "woman", "child", "kid", "mother", "father", "friend", "teacher", "farmer", "king", "queen", "princess", "prince"}
ANIMAL_TYPES = {"dog", "cat", "bird", "rabbit", "mouse", "fox", "bear", "lion", "frog", "duck", "horse", "puppy", "kitten"}
LOCATION_HEADS = {"park", "garden", "forest", "woods", "home", "house", "school", "room", "kitchen", "yard", "farm", "shop", "store", "river", "lake", "beach", "tree", "cave", "castle", "road", "field"}
COLOR_WORDS = {"red", "blue", "green", "yellow", "pink", "purple", "orange", "black", "white", "brown", "gray", "grey"}
PROPERTY_WORDS = {
    "happy", "sad", "angry", "scared", "afraid", "tired", "hungry", "thirsty", "kind", "brave", "little", "big", "small", "good", "bad", "sorry", "excited", "worried", "lost", "broken", "open", "closed", "clean", "dirty", "wet", "dry", "warm", "cold", "safe", "lonely", "proud"
}
TEMPORAL_PREFIX = re.compile(r"^(?:once upon a time,?\s*|one day,?\s*|then,?\s*|suddenly,?\s*|after that,?\s*|later,?\s*|finally,?\s*|in the end,?\s*)", re.I)

VERB_LEMMAS = {
    "went": "go", "goes": "go", "go": "go", "walked": "go", "walks": "go", "ran": "go", "runs": "go", "came": "come", "comes": "come",
    "found": "find", "finds": "find", "find": "find", "got": "get", "gets": "get", "get": "get", "took": "take", "takes": "take", "take": "take",
    "picked": "pick", "picks": "pick", "gave": "give", "gives": "give", "give": "give", "lost": "lose", "loses": "lose", "lose": "lose",
    "dropped": "drop", "drops": "drop", "drop": "drop", "held": "hold", "holds": "hold", "carried": "carry", "carries": "carry",
    "saw": "see", "sees": "see", "see": "see", "helped": "help", "helps": "help", "help": "help", "loved": "love", "loves": "love", "liked": "like", "likes": "like",
    "said": "say", "says": "say", "asked": "ask", "asks": "ask", "told": "tell", "tells": "tell", "opened": "open", "opens": "open", "closed": "close", "closes": "close",
    "played": "play", "plays": "play", "looked": "look", "looks": "look", "wanted": "want", "wants": "want", "needed": "need", "needs": "need",
    "made": "make", "makes": "make", "put": "put", "sat": "sit", "sits": "sit", "slept": "sleep", "sleeps": "sleep", "cried": "cry", "cries": "cry", "smiled": "smile", "smiles": "smile",
}


def lemma_verb(token: str) -> str:
    lower = token.lower()
    if lower in VERB_LEMMAS:
        return VERB_LEMMAS[lower]
    if lower.endswith("ied") and len(lower) > 3:
        return lower[:-3] + "y"
    if lower.endswith("ed") and len(lower) > 3:
        stem = lower[:-2]
        return stem[:-1] if len(stem) > 2 and stem[-1] == stem[-2] else stem
    if lower.endswith("s") and len(lower) > 3:
        return lower[:-1]
    return lower


@dataclass
class ParseStats:
    sentences: int = 0
    covered_sentences: int = 0
    construction_counts: Counter[str] = field(default_factory=Counter)

    @property
    def coverage(self) -> float:
        return self.covered_sentences / max(1, self.sentences)


class StoryParser:
    """High-precision reference parser with explicit fallback events.

    The research package expects this implementation to be replaced or expanded by
    induced constructions. It deliberately records unsupported material instead of
    claiming complete semantic understanding.
    """

    def __init__(self) -> None:
        self.stats = ParseStats()
        self._reset("")

    def _reset(self, text: str) -> None:
        self.text = text
        self.entities: list[Entity] = []
        self.mentions: list[Mention] = []
        self.propositions: list[Proposition] = []
        self.events: list[Event] = []
        self.relations: list[Relation] = []
        self.diagnostics: list[Diagnostic] = []
        self.entity_keys: dict[str, str] = {}
        self.recency: list[str] = []
        self.last_event_id: str | None = None
        self._entity_counter = 0
        self._mention_counter = 0
        self._prop_counter = 0
        self._event_counter = 0
        self._relation_counter = 0

    def parse(self, text: str, *, document_id: str | None = None, source: str | None = None) -> StoryIR:
        self._reset(text)
        doc_id = document_id or f"story-{sha256_text(text)[:12]}"
        for sentence in split_sentences(text):
            self.stats.sentences += 1
            before = len(self.events) + len(self.propositions)
            self._parse_sentence(sentence)
            after = len(self.events) + len(self.propositions)
            if after > before:
                self.stats.covered_sentences += 1
        return StoryIR(
            document_id=doc_id,
            text=text,
            source=source,
            entities=self.entities,
            mentions=self.mentions,
            propositions=self.propositions,
            events=self.events,
            relations=self.relations,
            diagnostics=self.diagnostics,
        )

    def _entity_by_id(self, entity_id: str) -> Entity:
        return next(entity for entity in self.entities if entity.id == entity_id)

    def _new_entity(self, *, name: str | None, entity_type: str, attributes: dict | None = None, introduced_by: str | None = None, key: str | None = None) -> str:
        self._entity_counter += 1
        entity_id = f"e{self._entity_counter}"
        entity = Entity(entity_id, entity_type, name, attributes or {}, introduced_by)
        self.entities.append(entity)
        if key:
            self.entity_keys[key] = entity_id
        if name:
            self.entity_keys[name.lower()] = entity_id
        self._touch(entity_id)
        return entity_id

    def _touch(self, entity_id: str) -> None:
        if entity_id in self.recency:
            self.recency.remove(entity_id)
        self.recency.insert(0, entity_id)
        del self.recency[20:]

    def _add_mention(self, surface: str, absolute_start: int, entity_id: str | None, *, candidates: list[str] | None = None, status: str = "resolved") -> None:
        self._mention_counter += 1
        self.mentions.append(Mention(
            id=f"m{self._mention_counter}",
            span=Span(absolute_start, absolute_start + len(surface), surface),
            surface=surface,
            referent=entity_id,
            candidates=candidates or ([] if entity_id is None else [entity_id]),
            status=status,
        ))
        if entity_id:
            self._touch(entity_id)

    def _infer_type(self, phrase: str, preferred_type: str | None = None) -> tuple[str, dict[str, str]]:
        words = re.findall(r"[A-Za-z]+", phrase.lower())
        head = words[-1] if words else "entity"
        attributes: dict[str, str] = {}
        for word in words:
            if word in COLOR_WORDS:
                attributes["color"] = word
        if preferred_type:
            if preferred_type == "location":
                attributes.setdefault("kind", head)
            return preferred_type, attributes
        if head in PERSON_TYPES:
            return head, attributes
        if head in ANIMAL_TYPES:
            return head, attributes
        if head in LOCATION_HEADS:
            return "location", {**attributes, "kind": head}
        return head, attributes

    def _resolve_pronoun(self, pronoun: str) -> tuple[str | None, list[str]]:
        pronoun = pronoun.lower()
        candidates: list[str] = []
        for entity_id in self.recency:
            entity = self._entity_by_id(entity_id)
            entity_type = entity.type.lower()
            if pronoun in {"he", "him", "himself"} and entity_type in {"boy", "man", "father", "king", "prince"}:
                candidates.append(entity_id)
            elif pronoun in {"she", "her", "herself"} and entity_type in {"girl", "woman", "mother", "queen", "princess"}:
                candidates.append(entity_id)
            elif pronoun in {"they", "them"} and entity_type in PERSON_TYPES | ANIMAL_TYPES | {"person"}:
                candidates.append(entity_id)
            elif pronoun in {"it", "itself"} and entity_type not in PERSON_TYPES | {"person", "boy", "girl", "man", "woman"}:
                candidates.append(entity_id)
        if not candidates:
            candidates = list(self.recency[:3])
        return (candidates[0] if candidates else None), candidates

    def _resolve_np(self, phrase: str, sentence: Sentence, local_start: int, *, create: bool = True, preferred_type: str | None = None) -> str | None:
        surface = phrase.strip().strip(" ,.;:!?\"")
        if not surface:
            return None
        lower = surface.lower()
        absolute_start = sentence.start + max(0, local_start + phrase.find(surface))
        if lower in PRONOUNS:
            entity_id, candidates = self._resolve_pronoun(lower)
            status = "resolved" if entity_id and len(candidates) == 1 else ("ambiguous" if entity_id else "unresolved")
            self._add_mention(surface, absolute_start, entity_id, candidates=candidates, status=status)
            if entity_id is None:
                self.diagnostics.append(Diagnostic("UNRESOLVED_PRONOUN", "warning", f"Could not resolve pronoun {surface!r}", Span(absolute_start, absolute_start + len(surface), surface)))
            return entity_id

        normalized_words = [word for word in re.findall(r"[A-Za-z]+", lower) if word not in DETERMINERS and word not in {"little", "big", "small", "old", "young", "very"}]
        key = " ".join(normalized_words) or lower
        # Proper names use exact identity.
        if re.fullmatch(r"[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*", surface):
            key = lower
        entity_id = self.entity_keys.get(key) or self.entity_keys.get(lower)
        if entity_id is None and lower.startswith("the ") and normalized_words:
            head = normalized_words[-1]
            for candidate_id in self.recency:
                entity = self._entity_by_id(candidate_id)
                if entity.type == head or entity.attributes.get("kind") == head or (entity.name and entity.name.lower() == head):
                    entity_id = candidate_id
                    break
        if entity_id is None and create:
            is_proper_name = bool(re.fullmatch(r"[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*", surface))
            entity_type, attributes = self._infer_type(surface, preferred_type or ("person" if is_proper_name else None))
            name = surface if is_proper_name else None
            entity_id = self._new_entity(name=name, entity_type=entity_type, attributes=attributes, key=key)
        self._add_mention(surface, absolute_start, entity_id, status="resolved" if entity_id else "unresolved")
        return entity_id

    def _add_prop(self, predicate: str, arguments: list[Argument], span: Span, *, polarity: str = "positive", construction: str | None = None) -> str:
        self._prop_counter += 1
        prop_id = f"p{self._prop_counter}"
        self.propositions.append(Proposition(prop_id, predicate, arguments, polarity=polarity, provenance=[span]))
        if construction:
            self.stats.construction_counts[construction] += 1
        return prop_id

    def _add_event(self, event_type: str, participants: list[Argument], span: Span, *, construction: str, polarity: str = "positive") -> str:
        self._event_counter += 1
        event_id = f"v{self._event_counter}"
        self.events.append(Event(event_id, event_type, participants, polarity=polarity, time=f"t{self._event_counter}", provenance=[span], construction=construction))
        self.stats.construction_counts[construction] += 1
        if self.last_event_id:
            self._relation_counter += 1
            self.relations.append(Relation(f"r{self._relation_counter}", "before", self.last_event_id, event_id, status="entailed", confidence=1.0))
        self.last_event_id = event_id
        return event_id

    def _parse_sentence(self, sentence: Sentence) -> None:
        raw = sentence.text
        working = TEMPORAL_PREFIX.sub("", raw).strip()
        offset = raw.find(working)
        local_sentence = Sentence(working, sentence.start + max(0, offset), sentence.start + max(0, offset) + len(working))

        # Causal coordination: parse both clauses and connect their final events/propositions.
        because_match = re.match(r"^(?P<effect>.+?)\s+because\s+(?P<cause>.+?)[.!?]?$", working, re.I)
        if because_match:
            before_last = self.last_event_id
            effect_text = because_match.group("effect").strip() + "."
            cause_text = because_match.group("cause").strip() + "."
            effect_sentence = Sentence(effect_text, local_sentence.start, local_sentence.start + len(effect_text))
            self._parse_simple(effect_sentence)
            effect_id = self.last_event_id
            cause_start = working.lower().find("because") + len("because ")
            cause_sentence = Sentence(cause_text, local_sentence.start + cause_start, local_sentence.start + cause_start + len(cause_text))
            self._parse_simple(cause_sentence)
            cause_id = self.last_event_id
            if cause_id and effect_id and cause_id != effect_id:
                self._relation_counter += 1
                self.relations.append(Relation(f"r{self._relation_counter}", "causes", cause_id, effect_id, status="asserted", confidence=0.9))
            if before_last is None and effect_id:
                pass
            return
        self._parse_simple(local_sentence)

    def _parse_simple(self, sentence: Sentence) -> None:
        text = sentence.text.strip()
        span = Span(sentence.start, sentence.end, text)
        plain = text.rstrip(".!?").strip()

        # "There was a little girl named Lily".
        match = re.match(r"^there (?:once )?was (?:a|an) (?P<desc>.+?) named (?P<name>[A-Z][a-z]+)$", plain, re.I)
        if match:
            desc = match.group("desc")
            name = match.group("name")
            entity_type, attributes = self._infer_type(desc)
            entity_id = self.entity_keys.get(name.lower()) or self._new_entity(name=name, entity_type=entity_type, attributes=attributes, introduced_by=None, key=name.lower())
            name_start = text.find(name)
            self._add_mention(name, sentence.start + name_start, entity_id)
            self._add_prop("type", [Argument("entity", entity_id), Argument("value", entity_type)], span, construction="existential_named")
            return

        # "Lily was a little girl".
        match = re.match(r"^(?P<subject>[A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)*|he|she|it|they) (?:was|is) (?:a|an) (?P<desc>.+)$", plain, re.I)
        if match:
            subject_surface = match.group("subject")
            desc = match.group("desc")
            entity_type, attributes = self._infer_type(desc)
            subject = self._resolve_np(subject_surface, sentence, text.lower().find(subject_surface.lower()), preferred_type=entity_type)
            if subject:
                entity = self._entity_by_id(subject)
                entity.type = entity_type
                entity.attributes.update(attributes)
                self._add_prop("type", [Argument("entity", subject), Argument("value", entity_type)], span, construction="copular_type")
                return

        # Named object/person introduction: "A girl named Lily had ..."
        match = re.match(r"^(?:A|An|a|an) (?P<type>[a-z]+) named (?P<name>[A-Z][a-z]+) (?P<rest>.+)$", plain)
        if match:
            name = match.group("name")
            entity_id = self.entity_keys.get(name.lower()) or self._new_entity(name=name, entity_type=match.group("type"), key=name.lower())
            self._add_mention(name, sentence.start + text.find(name), entity_id)
            rest = f"{name} {match.group('rest')}."
            self._parse_simple(Sentence(rest, sentence.start + text.find(name), sentence.start + text.find(name) + len(rest)))
            return

        # Location by movement.
        match = re.match(r"^(?P<subject>.+?) (?P<verb>went|walked|ran|came|traveled|travelled|goes|walks|runs) (?:to|into|toward|towards) (?P<location>.+)$", plain, re.I)
        if match:
            subject_surface, location_surface = match.group("subject"), match.group("location")
            subject = self._resolve_np(subject_surface, sentence, text.lower().find(subject_surface.lower()))
            location = self._resolve_np(location_surface, sentence, text.lower().rfind(location_surface.lower()), preferred_type="location")
            if subject and location:
                self._add_event("go", [Argument("agent", subject), Argument("destination", location)], span, construction="motion_to")
                return

        # Static location.
        match = re.match(r"^(?P<subject>.+?) (?:was|is|stayed|stood|sat|lived) (?P<prep>in|at|under|on|near|inside|outside) (?P<location>.+)$", plain, re.I)
        if match:
            subject_surface, location_surface = match.group("subject"), match.group("location")
            subject = self._resolve_np(subject_surface, sentence, text.lower().find(subject_surface.lower()))
            location = self._resolve_np(location_surface, sentence, text.lower().rfind(location_surface.lower()), preferred_type="location")
            if subject and location:
                self._add_prop("location", [Argument("entity", subject), Argument("place", location), Argument("relation", match.group("prep").lower())], span, construction="static_location")
                return

        # Giving must precede generic transitive patterns.
        match = re.match(r"^(?P<subject>.+?) (?P<verb>gave|gives|give|handed|hands|showed|shows) (?P<object>.+?) to (?P<recipient>.+)$", plain, re.I)
        if match:
            subject_surface, object_surface, recipient_surface = match.group("subject"), match.group("object"), match.group("recipient")
            subject = self._resolve_np(subject_surface, sentence, text.lower().find(subject_surface.lower()))
            obj = self._resolve_np(object_surface, sentence, text.lower().find(object_surface.lower()), preferred_type=None)
            recipient = self._resolve_np(recipient_surface, sentence, text.lower().rfind(recipient_surface.lower()))
            if subject and obj and recipient:
                self._add_event("give", [Argument("agent", subject), Argument("theme", obj), Argument("recipient", recipient)], span, construction="ditransitive_give")
                return

        # Possession.
        match = re.match(r"^(?P<subject>.+?) (?P<verb>had|has|held|holds|carried|carries|owned|owns) (?P<object>.+)$", plain, re.I)
        if match:
            subject_surface, object_surface = match.group("subject"), match.group("object")
            subject = self._resolve_np(subject_surface, sentence, text.lower().find(subject_surface.lower()))
            obj = self._resolve_np(object_surface, sentence, text.lower().rfind(object_surface.lower()))
            if subject and obj:
                self._add_prop("possession", [Argument("owner", subject), Argument("object", obj)], span, construction="possession_have")
                return

        # Acquisition.
        match = re.match(r"^(?P<subject>.+?) (?P<verb>found|finds|find|got|gets|get|took|takes|take|picked up|picks up) (?P<object>.+)$", plain, re.I)
        if match:
            subject_surface, object_surface = match.group("subject"), match.group("object")
            subject = self._resolve_np(subject_surface, sentence, text.lower().find(subject_surface.lower()))
            obj = self._resolve_np(object_surface, sentence, text.lower().rfind(object_surface.lower()))
            if subject and obj:
                verb = lemma_verb(match.group("verb").split()[0])
                event_type = "find" if verb == "find" else "acquire"
                self._add_event(event_type, [Argument("agent", subject), Argument("theme", obj)], span, construction="acquisition")
                return

        # Loss / dropping.
        match = re.match(r"^(?P<subject>.+?) (?P<verb>lost|loses|lose|dropped|drops|drop) (?P<object>.+)$", plain, re.I)
        if match:
            subject_surface, object_surface = match.group("subject"), match.group("object")
            subject = self._resolve_np(subject_surface, sentence, text.lower().find(subject_surface.lower()))
            obj = self._resolve_np(object_surface, sentence, text.lower().rfind(object_surface.lower()))
            if subject and obj:
                self._add_event(lemma_verb(match.group("verb")), [Argument("agent", subject), Argument("theme", obj)], span, construction="loss")
                return

        # Speech with quoted content.
        match = re.match(r'^"(?P<content>.+)"\s*,?\s*(?P<verb>said|asked|shouted|cried) (?P<speaker>.+)$', plain, re.I)
        if not match:
            match = re.match(r'^(?P<speaker>.+?) (?P<verb>said|asked|shouted|cried),?\s*"(?P<content>.+)"$', plain, re.I)
        if match:
            speaker_surface = match.group("speaker")
            speaker = self._resolve_np(speaker_surface, sentence, text.lower().find(speaker_surface.lower()))
            if speaker:
                self._add_event(lemma_verb(match.group("verb")), [Argument("speaker", speaker), Argument("content", match.group("content"))], span, construction="direct_speech")
                return

        # Copular/felt/became adjective or state. Restrict complement to a compact phrase.
        match = re.match(r"^(?P<subject>.+?) (?P<copula>was|is|felt|feels|became|becomes|looked|looks) (?P<neg>not )?(?P<property>(?:very )?[A-Za-z]+)$", plain, re.I)
        if match:
            subject_surface = match.group("subject")
            prop = match.group("property").lower().replace("very ", "")
            subject = self._resolve_np(subject_surface, sentence, text.lower().find(subject_surface.lower()))
            if subject:
                self._add_prop("property", [Argument("entity", subject), Argument("value", prop)], span, polarity="negative" if match.group("neg") else "positive", construction="copular_property")
                return

        # Desire / mental state.
        match = re.match(r"^(?P<subject>.+?) (?P<verb>wanted|wants|needed|needs|hoped|hopes|liked|likes|loved|loves) (?:to )?(?P<complement>.+)$", plain, re.I)
        if match:
            subject_surface = match.group("subject")
            subject = self._resolve_np(subject_surface, sentence, text.lower().find(subject_surface.lower()))
            if subject:
                complement = match.group("complement")
                obj = self._resolve_np(complement, sentence, text.lower().rfind(complement.lower()), create=False)
                arguments = [Argument("experiencer", subject), Argument("content", obj or complement)]
                self._add_event(lemma_verb(match.group("verb")), arguments, span, construction="mental_state")
                return

        # Generic transitive event, kept broad but explicit.
        match = re.match(r"^(?P<subject>[A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)*|he|she|it|they|the [A-Za-z]+) (?P<verb>[A-Za-z]+) (?P<object>(?:(?:a|an|the|his|her|their) .+|[A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)*|him|her|them|it))$", plain, re.I)
        if match:
            subject_surface, object_surface = match.group("subject"), match.group("object")
            subject = self._resolve_np(subject_surface, sentence, text.lower().find(subject_surface.lower()))
            obj = self._resolve_np(object_surface, sentence, text.lower().rfind(object_surface.lower()))
            if subject and obj:
                self._add_event(lemma_verb(match.group("verb")), [Argument("agent", subject), Argument("theme", obj)], span, construction="generic_transitive")
                return

        # Generic intransitive event.
        match = re.match(r"^(?P<subject>[A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)*|he|she|it|they|the [A-Za-z]+) (?P<verb>[A-Za-z]+)$", plain, re.I)
        if match:
            subject_surface = match.group("subject")
            subject = self._resolve_np(subject_surface, sentence, text.lower().find(subject_surface.lower()))
            if subject:
                self._add_event(lemma_verb(match.group("verb")), [Argument("agent", subject)], span, construction="generic_intransitive")
                return

        # Explicit fallback: retain the sentence as an opaque event and mark low semantic coverage.
        self._add_event("opaque_utterance", [Argument("text", plain)], span, construction="opaque_fallback")
        self.diagnostics.append(Diagnostic("OPAQUE_SENTENCE", "warning", "Sentence retained without compositional semantic analysis", span, {"text": plain}))
