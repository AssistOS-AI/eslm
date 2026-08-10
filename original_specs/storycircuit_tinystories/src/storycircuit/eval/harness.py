from __future__ import annotations

import math
import time
from collections import defaultdict
from dataclasses import asdict
from pathlib import Path
from typing import Any, Iterable, Sequence

from ..lm_protocol import LanguageModelAdapter
from ..realizer import GenerationConfig
from ..utils import environment_snapshot, iter_jsonl, sha256_file, utc_now, write_json, write_jsonl
from .metrics import bootstrap_interval, exact_match, mean, token_f1


class EvaluationHarness:
    def __init__(self, adapter: LanguageModelAdapter):
        self.adapter = adapter

    def evaluate_cases(self, cases: Iterable[dict[str, Any]]) -> dict[str, Any]:
        started = time.perf_counter()
        predictions: list[dict[str, Any]] = []
        for case in cases:
            item_started = time.perf_counter()
            try:
                result = self._evaluate_case(case)
                status = "ok"
                error = None
            except Exception as exc:  # harness boundary: preserve item-level failure
                result = {}
                status = "error"
                error = f"{type(exc).__name__}: {exc}"
            predictions.append({
                "id": case.get("id"),
                "family": case.get("family"),
                "subcategory": case.get("subcategory"),
                "status": status,
                "result": result,
                "error": error,
                "latency_seconds": time.perf_counter() - item_started,
                "tags": case.get("tags", []),
            })
        metrics = self._aggregate(predictions)
        return {
            "schema_version": "0.1",
            "created_at": utc_now(),
            "model": self.adapter.metadata(),
            "metrics": metrics,
            "predictions": predictions,
            "wall_seconds": time.perf_counter() - started,
            "environment": environment_snapshot(),
        }

    def evaluate_file(self, path: str | Path) -> dict[str, Any]:
        result = self.evaluate_cases(iter_jsonl(path))
        result["data"] = {"path": str(path), "sha256": sha256_file(path)}
        return result

    def _evaluate_case(self, case: dict[str, Any]) -> dict[str, Any]:
        family = case["family"]
        payload = case.get("input", {})
        target = case.get("target")

        if family == "likelihood":
            score = self.adapter.score_text(str(payload["text"]))
            return {"score": score.to_dict() if hasattr(score, "to_dict") else asdict(score)}

        if family == "minimal_pair":
            prefix = str(payload.get("prefix", ""))
            good = str(payload["good"])
            bad = str(payload["bad"])
            scores = self.adapter.score_continuations(prefix, [good, bad])
            values = [self._score_dict(score) for score in scores]
            preferred = 0 if values[0]["log_probability"] > values[1]["log_probability"] else 1
            structured_preferred = 0 if values[0].get("structured_score", values[0]["log_probability"]) > values[1].get("structured_score", values[1]["log_probability"]) else 1
            return {"scores": values, "preferred": preferred, "correct": float(preferred == 0), "structured_correct": float(structured_preferred == 0)}

        if family in {"qa", "state_tracking", "reasoning", "systematic_ood"}:
            answer_method = getattr(self.adapter, "answer", None)
            if answer_method is None:
                return {"unsupported": True, "correct": 0.0}
            answer = answer_method(str(payload["story"]), str(payload["question"]))
            answer_dict = answer.to_dict() if hasattr(answer, "to_dict") else dict(answer)
            targets = target.get("answers", target.get("answer", "")) if isinstance(target, dict) else target
            return {
                "answer": answer_dict,
                "exact_match": exact_match(str(answer_dict.get("answer", "")), targets),
                "token_f1": token_f1(str(answer_dict.get("answer", "")), targets),
                "correct": exact_match(str(answer_dict.get("answer", "")), targets),
            }

        if family == "narrative_selection":
            prefix = str(payload["prefix"])
            candidates = [str(item) for item in payload["candidates"]]
            target_index = int(target["index"] if isinstance(target, dict) else target)
            scores = [self._score_dict(score) for score in self.adapter.score_continuations(prefix, candidates)]
            predicted = max(range(len(scores)), key=lambda index: scores[index]["log_probability"])
            predicted_structured = max(range(len(scores)), key=lambda index: scores[index].get("structured_score", scores[index]["log_probability"]))
            return {
                "scores": scores,
                "predicted": predicted,
                "predicted_structured": predicted_structured,
                "correct": float(predicted == target_index),
                "structured_correct": float(predicted_structured == target_index),
            }

        if family == "generation":
            config_value = dict(payload.get("config", {}))
            config = GenerationConfig(**config_value)
            generation = self.adapter.generate(str(payload.get("prompt", "")), config)
            value = generation.to_dict() if hasattr(generation, "to_dict") else dict(generation)
            text = str(value.get("text", ""))
            lower = text.lower()
            required_words = [str(word).lower() for word in payload.get("required_words", config.required_words)]
            forbidden_words = [str(word).lower() for word in payload.get("forbidden_words", config.forbidden_words)]
            required_events = [str(event) for event in payload.get("required_events", config.required_events)]
            required_ok = all(word in lower for word in required_words)
            forbidden_ok = all(word not in lower for word in forbidden_words)
            verification = value.get("verification", {}) if isinstance(value, dict) else {}
            missing_events = set(verification.get("missing_events_after_parse_back", []))
            plan_types = {str(item.get("type")) for item in value.get("plan", []) if isinstance(item, dict)} if isinstance(value, dict) else set()
            events_ok = all(event not in missing_events and (not plan_types or event in plan_types) for event in required_events)
            nonempty = bool(text.strip())
            return {
                "generation": value,
                "required_words_ok": float(required_ok),
                "forbidden_words_ok": float(forbidden_ok),
                "required_events_ok": float(events_ok),
                "nonempty": float(nonempty),
                "correct": float(required_ok and forbidden_ok and events_ok and nonempty),
            }

        if family == "interpretability":
            simulate_method = getattr(self.adapter, "simulate", None)
            if simulate_method is None:
                return {"unsupported": True, "correct": 0.0}
            trace = simulate_method(str(payload["story"]))
            versions = trace.get("world_trace", {}).get("versions", [])
            return {"trace": trace, "trace_nonempty": float(bool(versions)), "correct": float(bool(versions))}

        raise ValueError(f"Unsupported evaluation family: {family}")

    @staticmethod
    def _score_dict(score: Any) -> dict[str, Any]:
        if hasattr(score, "to_dict"):
            return score.to_dict()
        if hasattr(score, "__dict__"):
            return dict(score.__dict__)
        return dict(score)

    def _aggregate(self, predictions: Sequence[dict[str, Any]]) -> dict[str, Any]:
        by_family: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for prediction in predictions:
            by_family[str(prediction.get("family"))].append(prediction)

        output: dict[str, Any] = {
            "items": len(predictions),
            "errors": sum(item["status"] == "error" for item in predictions),
            "mean_latency_seconds": mean(item["latency_seconds"] for item in predictions),
            "families": {},
        }
        for family, items in sorted(by_family.items()):
            successful = [item["result"] for item in items if item["status"] == "ok"]
            family_metrics: dict[str, Any] = {"items": len(items), "errors": len(items) - len(successful)}
            correct = [float(result["correct"]) for result in successful if "correct" in result]
            if correct:
                low, high = bootstrap_interval(correct, samples=min(1000, max(200, len(correct) * 20)))
                family_metrics.update({"accuracy": mean(correct), "accuracy_ci95": [low, high]})
            structured = [float(result["structured_correct"]) for result in successful if "structured_correct" in result]
            if structured:
                family_metrics["structured_accuracy"] = mean(structured)
            exact = [float(result["exact_match"]) for result in successful if "exact_match" in result]
            if exact:
                family_metrics["exact_match"] = mean(exact)
                family_metrics["token_f1"] = mean(float(result["token_f1"]) for result in successful if "token_f1" in result)
            if family == "likelihood":
                scores = [result["score"] for result in successful]
                total_log_probability = sum(float(score["log_probability"]) for score in scores)
                total_bytes = sum(int(score["bytes"]) for score in scores)
                total_units = sum(int(score["units"]) for score in scores)
                family_metrics["bits_per_byte"] = -total_log_probability / (math.log(2) * max(1, total_bytes))
                family_metrics["nll_per_unit"] = -total_log_probability / max(1, total_units)
                family_metrics["perplexity_per_unit"] = math.exp(family_metrics["nll_per_unit"])
                family_metrics["mean_semantic_coverage"] = mean(float(score.get("coverage", 0.0)) for score in scores)
            output["families"][family] = family_metrics
        return output

    @staticmethod
    def save_result(result: dict[str, Any], output_dir: str | Path) -> None:
        output = Path(output_dir)
        output.mkdir(parents=True, exist_ok=True)
        predictions = result.pop("predictions")
        write_json(output / "metrics.json", result)
        write_jsonl(output / "predictions.jsonl", predictions)
        result["predictions"] = predictions
