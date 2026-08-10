from __future__ import annotations

import json
import math
import platform
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Sequence

from .learner import InducedStatistics, StoryCircuitTrainer, TrainingConfig
from .ngram import ByteNGramLM, ScoreResult, WordNGramLM
from .parser import StoryParser
from .realizer import GenerationConfig, GenerationResult, NarrativePlanner, SurfaceRealizer
from .utils import sha256_file, stable_json, utc_now, write_json
from .world import AnswerResult, WorldRuntime


@dataclass(frozen=True)
class ContinuationScore:
    continuation: str
    log_probability: float
    structured_score: float
    parser_coverage: float
    diagnostics: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class StoryCircuitModel:
    def __init__(
        self,
        byte_lm: ByteNGramLM,
        word_lm: WordNGramLM,
        statistics: InducedStatistics,
        *,
        model_id: str = "storycircuit-reference",
        regime: str = "S0",
        manifest: dict[str, Any] | None = None,
    ):
        self.byte_lm = byte_lm
        self.word_lm = word_lm
        self.statistics = statistics
        self.model_id = model_id
        self.regime = regime
        self.manifest = manifest or {}

    @classmethod
    def train_path(cls, path: str | Path, config: TrainingConfig | None = None, *, model_id: str = "storycircuit-reference") -> "StoryCircuitModel":
        result = StoryCircuitTrainer(config).train_path(path)
        return cls(result.byte_lm, result.word_lm, result.statistics, model_id=model_id)

    def metadata(self) -> dict[str, Any]:
        return {
            "adapter": "storycircuit",
            "model_id": self.model_id,
            "regime": self.regime,
            "version": "0.1.0",
            "native_probability_unit": "utf8_byte",
            "supports": ["score_text", "score_continuations", "generate", "parse", "answer", "simulate", "explain"],
            "complexity": self.complexity(),
        }

    def complexity(self) -> dict[str, int]:
        byte_records = sum(len(counter) for counter in self.byte_lm.context_counts.values())
        word_records = sum(len(counter) for counter in self.word_lm.context_counts.values())
        symbolic_records = (
            len(self.word_lm.vocabulary)
            + len(self.statistics.construction_counts)
            + len(self.statistics.event_counts)
            + len(self.statistics.event_transition_counts)
            + len(self.statistics.story_event_shapes)
        )
        return {
            "numeric_parameters": byte_records + word_records,
            "symbolic_records": symbolic_records,
            "byte_ngram_records": byte_records,
            "word_ngram_records": word_records,
        }

    def parse(self, text: str) -> dict[str, Any]:
        return StoryParser().parse(text).to_dict()

    def simulate(self, text: str) -> dict[str, Any]:
        ir = StoryParser().parse(text)
        runtime = WorldRuntime(ir)
        return {"story_ir": ir.to_dict(), "world_trace": runtime.to_trace()}

    def answer(self, story: str, question: str) -> AnswerResult:
        ir = StoryParser().parse(story)
        return WorldRuntime(ir).answer(question)

    def score_text(self, text: str) -> ScoreResult:
        byte_score = self.byte_lm.score(text)
        parser = StoryParser()
        ir = parser.parse(text)
        word_log_probability = self.word_lm.score(text)
        diagnostics = {
            "byte_model": "exact_add_alpha_ngram",
            "word_log_probability_diagnostic": word_log_probability,
            "semantic_coverage": ir.semantic_coverage,
            "opaque_sentences": sum(event.type == "opaque_utterance" for event in ir.events),
            "entities": len(ir.entities),
            "events": len(ir.events),
            "propositions": len(ir.propositions),
        }
        return ScoreResult(
            log_probability=byte_score.log_probability,
            units=byte_score.units,
            bytes=byte_score.bytes,
            nll_per_unit=byte_score.nll_per_unit,
            bits_per_byte=byte_score.bits_per_byte,
            exact=True,
            coverage=ir.semantic_coverage,
            diagnostics=diagnostics,
        )

    def _semantic_coherence(self, text: str) -> tuple[float, float, dict[str, Any]]:
        ir = StoryParser().parse(text)
        runtime = WorldRuntime(ir)
        opaque = sum(event.type == "opaque_utterance" for event in ir.events)
        contradiction_penalty = 0.0
        # Direct positive/negative property collisions are visible in the final state.
        for entity_id in runtime.state.properties:
            overlap = runtime.state.properties.get(entity_id, set()) & runtime.state.negative_properties.get(entity_id, set())
            contradiction_penalty += 4.0 * len(overlap)
        score = 2.0 * ir.semantic_coverage - 1.5 * opaque - contradiction_penalty
        return score, ir.semantic_coverage, {"opaque": opaque, "contradiction_penalty": contradiction_penalty}

    def score_continuations(self, prefix: str, continuations: Sequence[str]) -> list[ContinuationScore]:
        results: list[ContinuationScore] = []
        separator = "" if not prefix or prefix.endswith((" ", "\n")) else " "
        for continuation in continuations:
            joined = prefix + (separator if continuation and prefix else "") + continuation
            conditional = self.byte_lm.score(joined).log_probability - self.byte_lm.score(prefix).log_probability
            semantic, coverage, diagnostics = self._semantic_coherence(joined)
            # `structured_score` is a transparent decision score, not an LM probability.
            structured = conditional + semantic
            results.append(ContinuationScore(continuation, conditional, structured, coverage, diagnostics))
        return results

    def next_token_distribution(self, prefix: str, candidates: Sequence[str] | None = None) -> dict[str, float]:
        return self.word_lm.next_distribution(prefix, candidates)

    def generate(self, prompt: str, config: GenerationConfig | None = None) -> GenerationResult:
        config = config or GenerationConfig()
        if config.strategy == "word_ngram":
            text = self.word_lm.generate(prompt, max_tokens=max(8, config.max_sentences * 12), seed=config.seed, temperature=config.temperature)
            return GenerationResult(text=text, status="generated", plan=[], constraints={}, verification={"mode": "word_ngram"}, seed=config.seed)
        planner = NarrativePlanner(self.statistics)
        plan, constraints = planner.plan(prompt, config)
        realizer = SurfaceRealizer(self.statistics)
        text = realizer.realize(plan, seed=config.seed)
        verification = realizer.verify(text, plan, constraints)
        status = "verified" if verification["passed"] else "generated_with_warnings"
        return GenerationResult(text, status, plan, constraints, verification, config.seed)

    def to_dict(self) -> dict[str, Any]:
        return {
            "format": "storycircuit-model-v0.1",
            "model_id": self.model_id,
            "regime": self.regime,
            "created_at": utc_now(),
            "byte_lm": self.byte_lm.to_dict(),
            "word_lm": self.word_lm.to_dict(),
            "statistics": self.statistics.to_dict(),
            "metadata": self.metadata(),
            "limitations": [
                "Reference construction parser is incomplete and partly hand-seeded.",
                "Exact LM probability currently comes from the byte n-gram floor; semantic expert normalization is a research work item.",
                "Narrative planning and realization validate interfaces but are not yet corpus-induced at full scale.",
            ],
        }

    def save(self, path: str | Path) -> None:
        write_json(path, self.to_dict())

    @classmethod
    def load(cls, path: str | Path) -> "StoryCircuitModel":
        value = json.loads(Path(path).read_text(encoding="utf-8"))
        if value.get("format") != "storycircuit-model-v0.1":
            raise ValueError("Unsupported model format")
        return cls(
            ByteNGramLM.from_dict(value["byte_lm"]),
            WordNGramLM.from_dict(value["word_lm"]),
            InducedStatistics.from_dict(value["statistics"]),
            model_id=value.get("model_id", "storycircuit"),
            regime=value.get("regime", "S0"),
            manifest=value.get("metadata", {}),
        )
