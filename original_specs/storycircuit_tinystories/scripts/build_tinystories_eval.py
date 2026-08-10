from __future__ import annotations

import argparse
import json
import random
from pathlib import Path
from typing import Any

from _bootstrap import ROOT
from storycircuit.text import split_sentences
from storycircuit.utils import iter_jsonl, sha256_file, sha256_text, utc_now, write_json, write_jsonl


def clean_story(text: str) -> str:
    return text.strip()


def split_prefix_ending(text: str) -> tuple[str, str] | None:
    sentences = split_sentences(text)
    if len(sentences) < 2:
        return None
    ending = sentences[-1].text
    prefix = text[: sentences[-1].start].strip()
    if len(prefix) < 20 or len(ending) < 3:
        return None
    return prefix, ending


def main() -> int:
    parser = argparse.ArgumentParser(description="Build natural TinyStories LM evaluation cases from prepared JSONL.")
    parser.add_argument("--prepared", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--max-stories", type=int, default=1000)
    parser.add_argument("--ending-items", type=int, default=500)
    parser.add_argument("--seed", type=int, default=1729)
    args = parser.parse_args()

    source = Path(args.prepared)
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    stories: list[dict[str, Any]] = []
    for row in iter_jsonl(source):
        text = clean_story(str(row.get("text", "")))
        if text:
            stories.append({"id": row.get("id", f"story-{len(stories)}"), "text": text, "sha256": row.get("sha256", sha256_text(text))})
        if len(stories) >= args.max_stories:
            break
    if not stories:
        raise SystemExit("no stories found")

    likelihood = [
        {
            "schema_version": "0.1",
            "id": f"ts-like-{item['id']}",
            "family": "likelihood",
            "subcategory": "natural_tinystories",
            "input": {"text": item["text"]},
            "target": None,
            "tags": ["natural", "tinystories", "heldout"],
            "provenance": {"story_sha256": item["sha256"]},
        }
        for item in stories
    ]

    candidates: list[tuple[str, str, str]] = []
    for item in stories:
        value = split_prefix_ending(item["text"])
        if value:
            candidates.append((str(item["id"]), value[0], value[1]))
    rng = random.Random(args.seed)
    rng.shuffle(candidates)
    ending_cases: list[dict[str, Any]] = []
    limit = min(args.ending_items, len(candidates))
    for index, (story_id, prefix, correct) in enumerate(candidates[:limit]):
        # Choose a wrong ending from a different story and avoid exact duplicates.
        wrong = None
        for offset in range(1, len(candidates)):
            candidate = candidates[(index + offset) % len(candidates)][2]
            if candidate != correct:
                wrong = candidate
                break
        if wrong is None:
            continue
        order = [correct, wrong]
        target_index = 0
        if rng.random() < 0.5:
            order.reverse()
            target_index = 1
        ending_cases.append({
            "schema_version": "0.1",
            "id": f"ts-ending-{story_id}",
            "family": "narrative_selection",
            "subcategory": "natural_random_cross_story_negative",
            "input": {"prefix": prefix, "candidates": order},
            "target": {"index": target_index},
            "tags": ["natural", "tinystories", "synthetic-negative"],
            "provenance": {"source_story_id": story_id},
        })

    likelihood_path = output / "likelihood.jsonl"
    ending_path = output / "narrative_selection.jsonl"
    write_jsonl(likelihood_path, likelihood)
    write_jsonl(ending_path, ending_cases)
    suite = {
        "name": f"tinystories_local_{output.name}",
        "case_files": [str(likelihood_path.relative_to(ROOT)) if likelihood_path.is_relative_to(ROOT) else str(likelihood_path),
                       str(ending_path.relative_to(ROOT)) if ending_path.is_relative_to(ROOT) else str(ending_path)],
        "output_dir": str((ROOT / "results" / "local" / output.name)),
        "notes": "Ending negatives are deterministic cross-story negatives, not the official TinyStories human/GPT evaluation prompts."
    }
    suite_path = output / "suite.yaml"
    write_json(suite_path, suite)
    manifest = {
        "schema_version": "0.1",
        "created_at": utc_now(),
        "source": {"path": str(source), "sha256": sha256_file(source)},
        "seed": args.seed,
        "stories": len(stories),
        "likelihood_items": len(likelihood),
        "ending_items": len(ending_cases),
        "files": {
            "likelihood": {"path": str(likelihood_path), "sha256": sha256_file(likelihood_path)},
            "narrative_selection": {"path": str(ending_path), "sha256": sha256_file(ending_path)},
            "suite": {"path": str(suite_path), "sha256": sha256_file(suite_path)},
        },
        "limitations": [
            "Cross-story endings may be distinguishable by surface topic rather than narrative reasoning.",
            "This builder does not create gold StoryIR or natural QA labels.",
            "Use official or manually curated evaluations for publication claims."
        ],
    }
    write_json(output / "manifest.json", manifest)
    print(json.dumps(manifest, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
