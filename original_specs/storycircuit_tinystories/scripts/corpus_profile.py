from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

from _bootstrap import ROOT
from storycircuit.text import iter_stories, split_sentences, tokenize


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--max-stories", type=int, default=10000)
    args = parser.parse_args()
    token_counts: Counter[str] = Counter()
    lengths = []
    sentence_counts = []
    for story in iter_stories(args.input, limit=args.max_stories):
        tokens = tokenize(story)
        token_counts.update(tokens)
        lengths.append(len(tokens))
        sentence_counts.append(len(split_sentences(story)))
    result = {
        "stories": len(lengths),
        "tokens": sum(lengths),
        "vocabulary": len(token_counts),
        "mean_tokens": sum(lengths) / max(1, len(lengths)),
        "max_tokens": max(lengths, default=0),
        "mean_sentences": sum(sentence_counts) / max(1, len(sentence_counts)),
        "top_tokens": token_counts.most_common(100),
    }
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
