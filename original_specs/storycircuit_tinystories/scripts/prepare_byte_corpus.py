from __future__ import annotations

import argparse
import json
import struct
from pathlib import Path

from _bootstrap import ROOT
from storycircuit.utils import iter_jsonl, sha256_file, utc_now, write_json


def main() -> int:
    parser = argparse.ArgumentParser(description="Encode prepared story JSONL as uint16 byte tokens plus EOS=257.")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--max-stories", type=int)
    args = parser.parse_args()
    source = Path(args.input)
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    stories = tokens = 0
    with target.open("wb") as handle:
        for row in iter_jsonl(source):
            text = str(row["text"])
            values = list(text.encode("utf-8")) + [257]
            handle.write(struct.pack(f"<{len(values)}H", *values))
            stories += 1
            tokens += len(values)
            if args.max_stories is not None and stories >= args.max_stories:
                break
    manifest = {
        "schema_version": "0.1",
        "created_at": utc_now(),
        "source": {"path": str(source), "sha256": sha256_file(source)},
        "output": {"path": str(target), "sha256": sha256_file(target), "bytes": target.stat().st_size},
        "stories": stories,
        "tokens": tokens,
        "encoding": "little-endian uint16; UTF-8 bytes 0..255; EOS=257",
    }
    write_json(target.with_suffix(target.suffix + ".manifest.json"), manifest)
    print(json.dumps(manifest, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
