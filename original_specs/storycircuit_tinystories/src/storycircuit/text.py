from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator

END_MARKERS = ("<|endoftext|>", "<|endofstory|>")
TOKEN_RE = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?|\d+(?:\.\d+)?|[^\w\s]", re.UNICODE)
WORD_RE = re.compile(r"^[A-Za-z]+(?:'[A-Za-z]+)?$")


@dataclass(frozen=True)
class Sentence:
    text: str
    start: int
    end: int


def tokenize(text: str, *, lowercase: bool = True) -> list[str]:
    tokens = TOKEN_RE.findall(text)
    return [token.lower() if lowercase and WORD_RE.match(token) else token for token in tokens]


def detokenize(tokens: Iterable[str]) -> str:
    result = ""
    no_space_before = {".", ",", "!", "?", ";", ":", "'", '"'}
    no_space_after = {'"', "'"}
    previous = ""
    for token in tokens:
        if not result:
            result = token
        elif token in no_space_before or previous in no_space_after:
            result += token
        else:
            result += " " + token
        previous = token
    return result


def split_sentences(text: str) -> list[Sentence]:
    """Conservative sentence segmentation retaining character spans."""
    sentences: list[Sentence] = []
    start = 0
    quote_open = False
    for index, char in enumerate(text):
        if char == '"':
            quote_open = not quote_open
        if char in ".!?" and not quote_open:
            end = index + 1
            raw = text[start:end]
            leading = len(raw) - len(raw.lstrip())
            stripped = raw.strip()
            if stripped:
                actual_start = start + leading
                sentences.append(Sentence(stripped, actual_start, actual_start + len(stripped)))
            start = end
    tail = text[start:]
    leading = len(tail) - len(tail.lstrip())
    stripped = tail.strip()
    if stripped:
        actual_start = start + leading
        sentences.append(Sentence(stripped, actual_start, actual_start + len(stripped)))
    return sentences


def iter_stories_from_text(text: str) -> Iterator[str]:
    normalized = text
    for marker in END_MARKERS[1:]:
        normalized = normalized.replace(marker, END_MARKERS[0])
    if END_MARKERS[0] in normalized:
        for chunk in normalized.split(END_MARKERS[0]):
            story = chunk.strip()
            if story:
                yield story
        return

    # Fallback for files separated by several blank lines.
    for chunk in re.split(r"\n\s*\n\s*\n+", normalized):
        story = chunk.strip()
        if story:
            yield story


def iter_stories(path: str | Path, *, limit: int | None = None, chunk_size: int = 4 * 1024 * 1024) -> Iterator[str]:
    """Stream TinyStories-style files without loading multi-gigabyte corpora.

    Official text files use ``<|endoftext|>``. If a small file has no marker,
    the function falls back to in-memory blank-line segmentation.
    """
    source = Path(path)
    marker = END_MARKERS[0]
    emitted = 0
    buffer = ""
    saw_marker = False
    with source.open("r", encoding="utf-8", errors="replace") as handle:
        while chunk := handle.read(chunk_size):
            buffer += chunk.replace(END_MARKERS[1], marker)
            while marker in buffer:
                saw_marker = True
                story, buffer = buffer.split(marker, 1)
                story = story.strip()
                if story:
                    yield story
                    emitted += 1
                    if limit is not None and emitted >= limit:
                        return
    if saw_marker:
        tail = buffer.strip()
        if tail and (limit is None or emitted < limit):
            yield tail
        return
    # Small fixtures and custom corpora may use blank-line separation.
    for story in iter_stories_from_text(buffer):
        yield story
        emitted += 1
        if limit is not None and emitted >= limit:
            return
