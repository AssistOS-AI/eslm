from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import urllib.request
from pathlib import Path

from _bootstrap import ROOT

BASE = "https://huggingface.co/datasets/roneneldan/TinyStories/resolve/main"
FILES = {
    "legacy": {
        "train": "TinyStories-train.txt",
        "valid": "TinyStories-valid.txt",
    },
    "v2-gpt4": {
        "train": "TinyStoriesV2-GPT4-train.txt",
        "valid": "TinyStoriesV2-GPT4-valid.txt",
    },
    "evaluation-prompts": {
        "prompts": "Evaluation%20prompts.yaml",
    },
}
KNOWN_SHA256 = {
    # Published by the official repository pointer for the 19.4 MB validation file.
    "TinyStories-valid.txt": "94e431816c4cce81ff71e4408ff8d3bda9a42e8d2663986697c3954288cb38b4",
}


def download(url: str, target: Path, *, force: bool = False) -> dict:
    if target.exists() and not force:
        digest = hashlib.sha256(target.read_bytes()).hexdigest() if target.stat().st_size < 128 * 1024 * 1024 else hash_file(target)
        return {"path": str(target), "url": url, "bytes": target.stat().st_size, "sha256": digest, "reused": True}
    target.parent.mkdir(parents=True, exist_ok=True)
    partial = target.with_suffix(target.suffix + ".part")
    request = urllib.request.Request(url, headers={"User-Agent": "StoryCircuit-TinyStories/0.1"})
    digest = hashlib.sha256()
    total = 0
    try:
        with urllib.request.urlopen(request, timeout=120) as response, partial.open("wb") as handle:
            while chunk := response.read(1024 * 1024):
                handle.write(chunk)
                digest.update(chunk)
                total += len(chunk)
                if total and total % (256 * 1024 * 1024) < 1024 * 1024:
                    print(f"downloaded {total / (1024**2):.0f} MiB", file=sys.stderr)
        os.replace(partial, target)
    finally:
        if partial.exists() and not target.exists():
            print(f"partial download preserved at {partial}", file=sys.stderr)
    return {"path": str(target), "url": url, "bytes": total, "sha256": digest.hexdigest(), "reused": False}


def hash_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--variant", choices=FILES, default="v2-gpt4")
    parser.add_argument("--split", default="both", help="train, valid, prompts, or both")
    parser.add_argument("--output-dir", default=str(ROOT / "data" / "raw"))
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    available = FILES[args.variant]
    if args.split == "both":
        selected = [key for key in ["train", "valid"] if key in available]
    else:
        if args.split not in available:
            raise SystemExit(f"split {args.split!r} is unavailable for {args.variant}")
        selected = [args.split]
    records = []
    for split in selected:
        filename = available[split]
        url = f"{BASE}/{filename}?download=true"
        target = Path(args.output_dir) / filename.replace("%20", " ")
        record = download(url, target, force=args.force)
        expected = KNOWN_SHA256.get(target.name)
        record["known_sha256"] = expected
        record["known_sha256_matches"] = expected is None or expected == record["sha256"]
        if expected and not record["known_sha256_matches"]:
            raise RuntimeError(f"checksum mismatch for {target}")
        records.append(record)
    manifest = {
        "source": "roneneldan/TinyStories",
        "variant": args.variant,
        "files": records,
    }
    manifest_path = Path(args.output_dir) / f"download-{args.variant}.manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
