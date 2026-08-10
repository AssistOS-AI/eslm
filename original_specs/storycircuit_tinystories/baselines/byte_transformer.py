from __future__ import annotations

import json
import math
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

try:
    import torch
    from torch import nn
except ImportError as exc:  # pragma: no cover
    raise RuntimeError("PyTorch is required for the byte Transformer baseline") from exc


@dataclass
class ByteTransformerConfig:
    vocab_size: int = 258
    bos_id: int = 256
    eos_id: int = 257
    d_model: int = 128
    n_heads: int = 4
    n_layers: int = 6
    d_ff: int = 256
    max_seq_len: int = 256
    dropout: float = 0.0
    tie_embeddings: bool = True


class ByteTransformerLM(nn.Module):
    def __init__(self, config: ByteTransformerConfig):
        super().__init__()
        self.config = config
        self.token_embedding = nn.Embedding(config.vocab_size, config.d_model)
        self.position_embedding = nn.Embedding(config.max_seq_len, config.d_model)
        layer = nn.TransformerEncoderLayer(
            d_model=config.d_model,
            nhead=config.n_heads,
            dim_feedforward=config.d_ff,
            dropout=config.dropout,
            activation="gelu",
            batch_first=True,
            norm_first=True,
        )
        self.transformer = nn.TransformerEncoder(layer, num_layers=config.n_layers, norm=nn.LayerNorm(config.d_model))
        self.lm_head = nn.Linear(config.d_model, config.vocab_size, bias=False)
        if config.tie_embeddings:
            self.lm_head.weight = self.token_embedding.weight
        self.register_buffer("causal_mask", torch.triu(torch.ones(config.max_seq_len, config.max_seq_len, dtype=torch.bool), diagonal=1), persistent=False)
        self.apply(self._init_weights)

    @staticmethod
    def _init_weights(module: nn.Module) -> None:
        if isinstance(module, (nn.Linear, nn.Embedding)):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)
        if isinstance(module, nn.Linear) and module.bias is not None:
            nn.init.zeros_(module.bias)

    def forward(self, input_ids: torch.Tensor) -> torch.Tensor:
        if input_ids.ndim != 2:
            raise ValueError("input_ids must be [batch, sequence]")
        _, length = input_ids.shape
        if length > self.config.max_seq_len:
            raise ValueError(f"sequence length {length} exceeds max_seq_len={self.config.max_seq_len}")
        positions = torch.arange(length, device=input_ids.device).unsqueeze(0)
        hidden = self.token_embedding(input_ids) + self.position_embedding(positions)
        hidden = self.transformer(hidden, mask=self.causal_mask[:length, :length])
        return self.lm_head(hidden)

    def parameter_count(self) -> int:
        return sum(parameter.numel() for parameter in self.parameters())


def encode_text(text: str, *, eos: bool = True) -> list[int]:
    values = list(text.encode("utf-8"))
    if eos:
        values.append(257)
    return values


def decode_tokens(tokens: list[int]) -> str:
    raw = bytes(token for token in tokens if 0 <= token <= 255)
    return raw.decode("utf-8", errors="replace")


def save_checkpoint(path: str | Path, model: ByteTransformerLM, *, training: dict[str, Any]) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    torch.save({
        "format": "storycircuit-byte-transformer-v0.1",
        "config": asdict(model.config),
        "state_dict": model.state_dict(),
        "training": training,
        "parameter_count": model.parameter_count(),
    }, target)


def load_checkpoint(path: str | Path, *, device: str = "cpu") -> tuple[ByteTransformerLM, dict[str, Any]]:
    payload = torch.load(path, map_location=device, weights_only=False)
    if payload.get("format") != "storycircuit-byte-transformer-v0.1":
        raise ValueError("unsupported checkpoint format")
    model = ByteTransformerLM(ByteTransformerConfig(**payload["config"]))
    model.load_state_dict(payload["state_dict"])
    model.to(device)
    model.eval()
    return model, payload
