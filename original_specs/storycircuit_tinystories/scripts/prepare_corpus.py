from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from contextlib import ExitStack
from pathlib import Path
from typing import Any

from _bootstrap import ROOT
from storycircuit.config import load_config
from storycircuit.text import iter_stories
from storycircuit.utils import sha256_file, sha256_text, utc_now


def choose_split(story_hash: str, ratios: dict[str, float]) -> str:
    value = int(story_hash[:16], 16) / float(16 ** 16)
    cumulative = 0.0
    for name, ratio in ratios.items():
        cumulative += ratio
        if value < cumulative:
            return name
    return next(reversed(ratios))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input")
    parser.add_argument("--output-dir")
    parser.add_argument("--profile")
    parser.add_argument("--max-stories", type=int)
    parser.add_argument("--no-dedup", action="store_true")
    args = parser.parse_args()

    profile: dict[str, Any] = load_config(args.profile) if args.profile else {}
    corpus = profile.get("corpus", {})
    input_path = Path(args.input or corpus.get("input", ""))
    if not input_path.exists():
        raise SystemExit(f"input corpus not found: {input_path}")
    output_dir = Path(args.output_dir or corpus.get("prepared_dir", ROOT / "data" / "prepared"))
    output_dir.mkdir(parents=True, exist_ok=True)
    max_stories = args.max_stories if args.max_stories is not None else corpus.get("max_stories")
    ratios = corpus.get("splits", {"train": 0.90, "dev": 0.04, "agent_shadow": 0.03, "test": 0.03})
    total_ratio = sum(float(value) for value in ratios.values())
    ratios = {key: float(value) / total_ratio for key, value in ratios.items()}
    min_chars = int(corpus.get("min_chars", 20))
    max_chars = int(corpus.get("max_chars", 20000))
    dedup = not args.no_dedup and bool(corpus.get("exact_dedup", True))

    seen: set[str] = set()
    counts: Counter[str] = Counter()
    rejection: Counter[str] = Counter()
    with ExitStack() as stack:
        handles = {name: stack.enter_context((output_dir / f"{name}.jsonl").open("w", encoding="utf-8")) for name in ratios}
        for index, story in enumerate(iter_stories(input_path, limit=max_stories)):
            normalized = story.strip()
            if len(normalized) < min_chars:
                rejection["too_short"] += 1
                continue
            if len(normalized) > max_chars:
                rejection["too_long"] += 1
                continue
            digest = sha256_text(normalized)
            if dedup and digest in seen:
                rejection["exact_duplicate"] += 1
                continue
            seen.add(digest)
            split = choose_split(digest, ratios)
            record = {
                "id": f"ts-{digest[:16]}",
                "text": normalized,
                "sha256": digest,
                "source_index": index,
                "split": split,
            }
            handles[split].write(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n")
            counts[split] += 1

    files = {}
    for split in ratios:
        path = output_dir / f"{split}.jsonl"
        files[split] = {"path": str(path), "sha256": sha256_file(path), "records": counts[split], "bytes": path.stat().st_size}
    manifest = {
        "schema_version": "0.1",
        "created_at": utc_now(),
        "source": {"path": str(input_path), "sha256": sha256_file(input_path), "bytes": input_path.stat().st_size},
        "configuration": {"ratios": ratios, "max_stories": max_stories, "min_chars": min_chars, "max_chars": max_chars, "exact_dedup": dedup},
        "files": files,
        "rejected": dict(rejection),
        "accepted": sum(counts.values()),
    }
    (output_dir / "corpus_manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
