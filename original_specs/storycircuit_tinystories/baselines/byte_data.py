from __future__ import annotations

import mmap
import random
import struct
from pathlib import Path
from typing import Iterator

import torch

UINT16 = struct.Struct("<H")


class UInt16TokenFile:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        if self.path.stat().st_size % 2:
            raise ValueError("token file size must be divisible by two")
        self.length = self.path.stat().st_size // 2
        self._handle = self.path.open("rb")
        self._mmap = mmap.mmap(self._handle.fileno(), 0, access=mmap.ACCESS_READ)

    def close(self) -> None:
        self._mmap.close()
        self._handle.close()

    def __enter__(self) -> "UInt16TokenFile":
        return self

    def __exit__(self, *args) -> None:
        self.close()

    def slice(self, start: int, length: int) -> list[int]:
        if start < 0 or start + length > self.length:
            raise IndexError("slice out of bounds")
        raw = self._mmap[start * 2 : (start + length) * 2]
        return list(struct.unpack(f"<{length}H", raw))

    def random_batch(self, *, batch_size: int, sequence_length: int, rng: random.Random, device: str) -> tuple[torch.Tensor, torch.Tensor]:
        if self.length <= sequence_length + 1:
            raise ValueError("token file too small")
        inputs, targets = [], []
        maximum = self.length - sequence_length - 1
        for _ in range(batch_size):
            start = rng.randrange(maximum)
            values = self.slice(start, sequence_length + 1)
            inputs.append(values[:-1])
            targets.append(values[1:])
        return torch.tensor(inputs, dtype=torch.long, device=device), torch.tensor(targets, dtype=torch.long, device=device)
