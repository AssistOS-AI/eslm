from __future__ import annotations

import argparse
import json
import random
from pathlib import Path
from typing import Any, Iterable

NAMES = ["Nora", "Eli", "Iris", "Owen", "Uma", "Felix", "Clara", "Hugo", "Tara", "Victor", "Wendy", "Yara", "Zane", "Quinn", "Rosa", "Peter"]
OBJECTS = ["ball", "book", "kite", "toy", "key", "flower", "hat", "box", "apple", "boat"]
LOCATIONS = ["park", "garden", "forest", "school", "house", "lake", "field", "shop", "beach", "cave"]
PROPERTIES = ["happy", "sad", "kind", "brave", "tired", "worried", "careful", "quiet", "excited", "safe"]
CHAIN_PROPERTIES = ["worried", "careful", "quiet", "patient", "kind", "brave", "helpful", "happy", "proud", "calm"]


def case(case_id: str, family: str, subcategory: str, payload: dict[str, Any], target: Any, metric: str, tags: list[str]) -> dict[str, Any]:
    return {
        "id": case_id,
        "family": family,
        "subcategory": subcategory,
        "visibility": "test",
        "input": payload,
        "target": target,
        "metric": metric,
        "tags": tags,
        "provenance": {"generator": "storycircuit-eval-v0.1"},
    }


def likelihood_cases(rng: random.Random, count: int) -> Iterable[dict[str, Any]]:
    for index in range(count):
        name = rng.choice(NAMES)
        obj = rng.choice(OBJECTS)
        location = rng.choice(LOCATIONS)
        prop = rng.choice(PROPERTIES[:6])
        text = f"A child named {name} went to the {location}. {name} found a {obj}. {name} was {prop}."
        yield case(f"likelihood-{index:04d}", "likelihood", "synthetic-story", {"text": text}, None, "bits_per_byte", ["synthetic", "heldout-names"])


def minimal_pair_cases(rng: random.Random, count: int) -> Iterable[dict[str, Any]]:
    templates = [
        ("agreement", lambda n, o, l, p: (f"{n} was {p}.", f"{n} were {p}.")),
        ("determiner", lambda n, o, l, p: (f"{n} found a {o}.", f"{n} found an {o}.")),
        ("word-order", lambda n, o, l, p: (f"{n} gave the {o} to Eli.", f"{n} the {o} gave to Eli.")),
        ("preposition", lambda n, o, l, p: (f"{n} went to the {l}.", f"{n} went the {l} to.")),
        ("auxiliary", lambda n, o, l, p: (f"Did {n} find the {o}?", f"Did {n} found the {o}?")),
        ("pronoun", lambda n, o, l, p: (f"{n} is a girl. She was {p}.", f"{n} is a girl. He was {p}.")),
        ("negation-position", lambda n, o, l, p: (f"{n} was not {p}.", f"{n} not was {p}.")),
        ("tense", lambda n, o, l, p: (f"Yesterday, {n} went to the {l}.", f"Yesterday, {n} goes to the {l}.")),
        ("transitive-frame", lambda n, o, l, p: (f"{n} helped Eli.", f"{n} helped.")),
        ("punctuation", lambda n, o, l, p: (f'"Hello," said {n}.', f'"Hello" said, {n}.')),
    ]
    for index in range(count):
        category, template = templates[index % len(templates)]
        name = rng.choice(NAMES)
        obj = rng.choice(OBJECTS)
        location = rng.choice(LOCATIONS)
        prop = rng.choice(PROPERTIES)
        good, bad = template(name, obj, location, prop)
        yield case(f"minimal-pair-{index:04d}", "minimal_pair", category, {"prefix": "", "good": good, "bad": bad}, {"index": 0}, "accuracy", ["grammar", category])


def state_tracking_cases(rng: random.Random, count: int) -> Iterable[dict[str, Any]]:
    for index in range(count):
        mode = ["possession", "location", "property"][index % 3]
        depth = 1 + (index % 8)
        distractors = (index // 8) % 6
        names = rng.sample(NAMES, min(len(NAMES), max(depth + 2, 5)))
        target_name = names[0]
        sentences: list[str] = []
        if mode == "possession":
            obj = rng.choice(OBJECTS)
            owner = target_name
            sentences.append(f"A child named {owner} had a {obj}.")
            for step in range(depth):
                recipient = names[(step + 1) % len(names)]
                sentences.append(f"{owner} gave the {obj} to {recipient}.")
                owner = recipient
            question = f"Who has the {obj}?"
            answer = owner
        elif mode == "location":
            locations = rng.sample(LOCATIONS, min(len(LOCATIONS), depth + 1))
            for step in range(depth):
                sentences.append(f"{target_name} went to the {locations[step % len(locations)]}.")
            answer = locations[(depth - 1) % len(locations)]
            question = f"Where is {target_name}?"
        else:
            prop = rng.choice(PROPERTIES)
            positive = True
            sentences.append(f"A child named {target_name} was {prop}.")
            for _ in range(depth - 1):
                positive = not positive
                sentences.append(f"{target_name} was {'not ' if not positive else ''}{prop}.")
            question = f"Was {target_name} {prop}?"
            answer = "yes" if positive else "no"
        for d in range(distractors):
            other = names[(d + 2) % len(names)]
            sentences.insert(rng.randrange(len(sentences) + 1), f"{other} went to the {rng.choice(LOCATIONS)}.")
        yield case(
            f"state-{index:04d}", "state_tracking", mode,
            {"story": " ".join(sentences), "question": question},
            {"answers": [answer, f"the {answer}"]}, "exact_match",
            [f"depth:{depth}", f"distractors:{distractors}", mode],
        )


def reasoning_cases(rng: random.Random, count: int) -> Iterable[dict[str, Any]]:
    for index in range(count):
        depth = 1 + (index % 8)
        distractors = (index // 8) % 8
        name = rng.choice(NAMES)
        chain = CHAIN_PROPERTIES[: depth + 1]
        sentences = [f"{name} was {chain[0]}."]
        for left, right in zip(chain, chain[1:]):
            sentences.append(f"If someone is {left}, then they become {right}.")
        for d in range(distractors):
            a = PROPERTIES[d % len(PROPERTIES)]
            b = PROPERTIES[(d + 3) % len(PROPERTIES)]
            sentences.append(f"If someone is {a}, then they become {b}.")
        unknown = index % 5 == 4
        target_property = "sleepy" if unknown else chain[-1]
        target_answer = "unknown" if unknown else "yes"
        yield case(
            f"reasoning-{index:04d}", "reasoning", "unary-rule-chain",
            {"story": " ".join(sentences), "question": f"Was {name} {target_property}?"},
            {"answers": [target_answer]}, "exact_match",
            [f"depth:{depth}", f"distractors:{distractors}", "deduction"],
        )


def narrative_selection_cases(rng: random.Random, count: int) -> Iterable[dict[str, Any]]:
    for index in range(count):
        name, friend = rng.sample(NAMES, 2)
        obj = rng.choice(OBJECTS)
        location = rng.choice(LOCATIONS)
        mode = index % 4
        if mode == 0:
            prefix = f"{name} lost a {obj} in the {location}. {friend} found the {obj}."
            good = f"{friend} gave the {obj} back to {name}, and {name} was happy."
            bad = f"The {obj} ate the {location}, and nobody noticed the moon turning into soup."
            category = "causal-resolution"
        elif mode == 1:
            prefix = f"{name} gave the {obj} to {friend}."
            good = f"Now {friend} had the {obj}."
            bad = f"Now {name} still had the only {obj}."
            category = "state-consistency"
        elif mode == 2:
            prefix = f"{name} wanted to visit the {location}. {name} walked down the road."
            good = f"Soon {name} arrived at the {location}."
            bad = f"Soon the road became hungry because {name} was a number."
            category = "goal-continuity"
        else:
            prefix = f"{name} was sad because the {obj} was broken. {friend} fixed the {obj}."
            good = f"{name} smiled and thanked {friend}."
            bad = f"{name} became sad because the fixed {obj} had always been unbroken."
            category = "emotion-cause"
        if index % 2:
            candidates = [bad, good]
            target_index = 1
        else:
            candidates = [good, bad]
            target_index = 0
        yield case(f"selection-{index:04d}", "narrative_selection", category, {"prefix": prefix, "candidates": candidates}, {"index": target_index}, "accuracy", [category])


def generation_cases(rng: random.Random, count: int) -> Iterable[dict[str, Any]]:
    for index in range(count):
        name = rng.choice(NAMES)
        obj = rng.choice(OBJECTS)
        location = rng.choice(LOCATIONS)
        event = rng.choice(["find", "give", "help", "lose"])
        forbidden = rng.choice(["dragon", "spaceship", "computer", "war"])
        prompt = f"Write a short story about {name}, a {obj}, and the {location}. The story should include an event of type {event}."
        yield case(
            f"generation-{index:04d}", "generation", "semantic-constraints",
            {
                "prompt": prompt,
                "required_words": [name.lower(), obj, location],
                "forbidden_words": [forbidden],
                "required_events": [event],
                "config": {
                    "seed": 1000 + index,
                    "max_sentences": 9,
                    "required_words": [name.lower(), obj, location],
                    "required_events": [event],
                    "forbidden_words": [forbidden],
                },
            },
            None, "constraint_success", ["generation", event],
        )


def systematic_ood_cases(rng: random.Random, count: int) -> Iterable[dict[str, Any]]:
    for index in range(count):
        depth = 5 + (index % 8)
        entity_count = 6 + ((index // 8) % 5)
        distractors = 6 + ((index // 40) % 7)
        names = rng.sample(NAMES, min(entity_count, len(NAMES)))
        obj = rng.choice(OBJECTS)
        owner = names[0]
        sentences = [f"{owner} had a {obj}."]
        for step in range(depth):
            recipient = names[(step + 1) % len(names)]
            sentences.append(f"{owner} gave the {obj} to {recipient}.")
            owner = recipient
        for d in range(distractors):
            actor = names[d % len(names)]
            sentences.insert(rng.randrange(len(sentences) + 1), f"{actor} went to the {rng.choice(LOCATIONS)}.")
        yield case(
            f"ood-{index:04d}", "systematic_ood", "possession-long-chain",
            {"story": " ".join(sentences), "question": f"Who has the {obj}?"},
            {"answers": [owner]}, "exact_match",
            [f"depth:{depth}", f"entities:{entity_count}", f"distractors:{distractors}", "heldout-composition"],
        )


def interpretability_cases(rng: random.Random, count: int) -> Iterable[dict[str, Any]]:
    for index in range(count):
        name, friend = rng.sample(NAMES, 2)
        obj = rng.choice(OBJECTS)
        location = rng.choice(LOCATIONS)
        story = f"{name} had a {obj}. {name} went to the {location}. {name} gave the {obj} to {friend}."
        yield case(f"trace-{index:04d}", "interpretability", "replayable-world-trace", {"story": story}, None, "trace_nonempty", ["trace", "provenance"])


GENERATORS = {
    "likelihood": likelihood_cases,
    "minimal_pairs": minimal_pair_cases,
    "state_tracking": state_tracking_cases,
    "reasoning": reasoning_cases,
    "narrative_selection": narrative_selection_cases,
    "generation": generation_cases,
    "systematic_ood": systematic_ood_cases,
    "interpretability": interpretability_cases,
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--seed", type=int, default=20260810)
    parser.add_argument("--count", type=int, default=200, help="cases per family")
    args = parser.parse_args()
    output = Path(args.output_dir)
    output.mkdir(parents=True, exist_ok=True)
    manifest = {"generator": "storycircuit-eval-v0.1", "seed": args.seed, "count_per_family": args.count, "files": {}}
    for offset, (name, generator) in enumerate(GENERATORS.items()):
        rng = random.Random(args.seed + offset * 100003)
        rows = list(generator(rng, args.count))
        path = output / f"{name}.jsonl"
        with path.open("w", encoding="utf-8") as handle:
            for row in rows:
                handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")
        manifest["files"][name] = {"path": path.name, "items": len(rows)}
    (output / "generation_manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
