from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Sequence

from ..ngram import ScoreResult
from ..realizer import GenerationConfig, GenerationResult


@dataclass(frozen=True)
class HFContinuationScore:
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


class HFCausalAdapter:
    """Optional Hugging Face causal-LM adapter.

    The import is intentionally delayed so the symbolic smoke suite has no neural
    dependency. This adapter scores exact joined strings and masks the prefix.
    """

    def __init__(self, model_name: str, *, revision: str | None = None, device: str = "cpu"):
        try:
            import torch
            from transformers import AutoModelForCausalLM, AutoTokenizer
        except ImportError as exc:
            raise RuntimeError("Install the neural extra: pip install -e '.[neural]'") from exc
        self.torch = torch
        self.model_name = model_name
        self.revision = revision
        self.device = device
        self.tokenizer = AutoTokenizer.from_pretrained(model_name, revision=revision)
        self.model = AutoModelForCausalLM.from_pretrained(model_name, revision=revision).to(device)
        self.model.eval()
        if self.tokenizer.pad_token_id is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token

    def metadata(self) -> dict[str, Any]:
        count = sum(parameter.numel() for parameter in self.model.parameters())
        return {
            "adapter": "huggingface_causal",
            "model_id": self.model_name,
            "revision": self.revision,
            "device": self.device,
            "numeric_parameters": int(count),
            "tokenizer": self.tokenizer.name_or_path,
            "supports": ["score_text", "score_continuations", "generate"],
        }

    def _token_log_probability(self, text: str, *, prefix: str = "") -> tuple[float, int]:
        torch = self.torch
        encoded = self.tokenizer(text, return_tensors="pt", add_special_tokens=True)
        input_ids = encoded["input_ids"].to(self.device)
        attention_mask = encoded.get("attention_mask")
        if attention_mask is not None:
            attention_mask = attention_mask.to(self.device)
        labels = input_ids.clone()
        if prefix:
            prefix_ids = self.tokenizer(prefix, return_tensors="pt", add_special_tokens=True)["input_ids"]
            prefix_length = min(prefix_ids.shape[1], labels.shape[1])
            labels[:, :prefix_length] = -100
        with torch.no_grad():
            outputs = self.model(input_ids=input_ids, attention_mask=attention_mask, labels=labels)
        count = int((labels[:, 1:] != -100).sum().item())
        return -float(outputs.loss.item()) * max(1, count), count

    def score_text(self, text: str) -> ScoreResult:
        log_probability, units = self._token_log_probability(text)
        byte_count = len(text.encode("utf-8"))
        return ScoreResult(
            log_probability=log_probability,
            units=max(1, units),
            bytes=byte_count,
            nll_per_unit=-log_probability / max(1, units),
            bits_per_byte=-log_probability / (math.log(2) * max(1, byte_count)),
            exact=True,
            coverage=0.0,
            diagnostics={"tokenizer": self.tokenizer.name_or_path},
        )

    def score_continuations(self, prefix: str, continuations: Sequence[str]) -> list[HFContinuationScore]:
        results = []
        separator = "" if not prefix or prefix.endswith((" ", "\n")) else " "
        for continuation in continuations:
            joined = prefix + (separator if prefix and continuation else "") + continuation
            score, count = self._token_log_probability(joined, prefix=prefix)
            results.append(HFContinuationScore(continuation, score, score, diagnostics={"scored_tokens": count}))
        return results

    def generate(self, prompt: str, config: GenerationConfig | None = None) -> GenerationResult:
        config = config or GenerationConfig()
        torch = self.torch
        generator = torch.Generator(device=self.device)
        generator.manual_seed(config.seed)
        encoded = self.tokenizer(prompt, return_tensors="pt").to(self.device)
        max_new_tokens = max(16, config.max_sentences * 24)
        with torch.no_grad():
            output = self.model.generate(
                **encoded,
                max_new_tokens=max_new_tokens,
                do_sample=config.temperature > 0,
                temperature=max(config.temperature, 1e-6),
                pad_token_id=self.tokenizer.eos_token_id,
                generator=generator,
            )
        text = self.tokenizer.decode(output[0], skip_special_tokens=True)
        return GenerationResult(text=text, status="generated", plan=[], constraints={}, verification={"backend": "huggingface"}, seed=config.seed)
