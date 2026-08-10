from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Sequence

from baselines.byte_transformer import decode_tokens, encode_text, load_checkpoint
from ..ngram import ScoreResult
from ..realizer import GenerationConfig, GenerationResult


@dataclass(frozen=True)
class TorchByteContinuationScore:
    continuation: str
    log_probability: float
    structured_score: float
    parser_coverage: float = 0.0
    diagnostics: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "continuation": self.continuation,
            "log_probability": self.log_probability,
            "structured_score": self.structured_score,
            "parser_coverage": self.parser_coverage,
            "diagnostics": self.diagnostics or {},
        }


class TorchByteCausalAdapter:
    def __init__(self, checkpoint: str, *, device: str = "cpu", stride: int | None = None):
        import torch
        self.torch = torch
        self.model, self.payload = load_checkpoint(checkpoint, device=device)
        self.checkpoint = checkpoint
        self.device = device
        self.context = self.model.config.max_seq_len
        self.stride = stride or max(1, self.context // 2)

    def metadata(self) -> dict[str, Any]:
        return {
            "adapter": "torch_byte_causal",
            "model_id": self.checkpoint,
            "device": self.device,
            "numeric_parameters": self.model.parameter_count(),
            "native_probability_unit": "utf8_byte",
            "context_length": self.context,
            "supports": ["score_text", "score_continuations", "generate"],
        }

    def _score_ids(self, ids: list[int], *, mask_prefix: int = 0) -> tuple[float, int]:
        torch = self.torch
        # Prepend BOS. Targets are all subsequent bytes/EOS.
        sequence = [self.model.config.bos_id] + ids
        total_logp = 0.0
        total_count = 0
        start_target = max(1, mask_prefix + 1)
        next_target = start_target
        while next_target < len(sequence):
            target_end = min(len(sequence), next_target + self.stride)
            context_start = max(0, target_end - self.context)
            window = sequence[context_start:target_end]
            input_ids = torch.tensor([window[:-1]], dtype=torch.long, device=self.device)
            targets = torch.tensor(window[1:], dtype=torch.long, device=self.device)
            with torch.no_grad():
                logits = self.model(input_ids)[0]
                log_probs = torch.log_softmax(logits, dim=-1)
            global_first_target = context_start + 1
            local_start = max(0, next_target - global_first_target)
            local_end = target_end - global_first_target
            selected = targets[local_start:local_end]
            rows = torch.arange(local_start, local_end, device=self.device)
            total_logp += float(log_probs[rows, selected].sum().item())
            total_count += int(selected.numel())
            next_target = target_end
        return total_logp, total_count

    def score_text(self, text: str) -> ScoreResult:
        ids = encode_text(text, eos=True)
        logp, units = self._score_ids(ids)
        byte_count = len(text.encode("utf-8"))
        return ScoreResult(
            log_probability=logp,
            units=units,
            bytes=byte_count,
            nll_per_unit=-logp / max(1, units),
            bits_per_byte=-logp / (math.log(2) * max(1, byte_count)),
            exact=True,
            coverage=0.0,
            diagnostics={"context_length": self.context, "stride": self.stride},
        )

    def score_continuations(self, prefix: str, continuations: Sequence[str]) -> list[TorchByteContinuationScore]:
        separator = "" if not prefix or prefix.endswith((" ", "\n")) else " "
        prefix_bytes = len(prefix.encode("utf-8")) + (len(separator.encode("utf-8")) if prefix else 0)
        results = []
        for continuation in continuations:
            joined = prefix + (separator if prefix and continuation else "") + continuation
            ids = encode_text(joined, eos=True)
            score, count = self._score_ids(ids, mask_prefix=prefix_bytes)
            results.append(TorchByteContinuationScore(continuation, score, score, diagnostics={"scored_units": count}))
        return results

    def generate(self, prompt: str, config: GenerationConfig | None = None) -> GenerationResult:
        config = config or GenerationConfig()
        torch = self.torch
        generator = torch.Generator(device=self.device)
        generator.manual_seed(config.seed)
        values = encode_text(prompt, eos=False)
        max_new = max(16, config.max_sentences * 64)
        for _ in range(max_new):
            context = ([self.model.config.bos_id] + values)[-self.context:]
            input_ids = torch.tensor([context], dtype=torch.long, device=self.device)
            with torch.no_grad():
                logits = self.model(input_ids)[0, -1]
            if config.temperature <= 0:
                token = int(torch.argmax(logits).item())
            else:
                probs = torch.softmax(logits / max(config.temperature, 1e-6), dim=-1)
                token = int(torch.multinomial(probs, 1, generator=generator).item())
            if token == self.model.config.eos_id:
                break
            if 0 <= token <= 255:
                values.append(token)
        return GenerationResult(decode_tokens(values), "generated", [], {}, {"backend": "torch_byte_transformer"}, config.seed)
