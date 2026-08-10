from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from .config import load_config
from .eval.harness import EvaluationHarness
from .learner import TrainingConfig
from .model import StoryCircuitModel
from .realizer import GenerationConfig
from .utils import write_json


def _print(value: Any) -> None:
    if hasattr(value, "to_dict"):
        value = value.to_dict()
    print(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True))


def _training_config(args: argparse.Namespace) -> TrainingConfig:
    values: dict[str, Any] = {}
    if getattr(args, "profile", None):
        profile = load_config(args.profile)
        values.update(profile.get("training", {}))
    for name in ["max_stories", "parse_stories", "byte_order", "word_order", "min_word_count"]:
        value = getattr(args, name, None)
        if value is not None:
            values[name] = value
    return TrainingConfig(**values)


def cmd_train(args: argparse.Namespace) -> None:
    model = StoryCircuitModel.train_path(args.input, _training_config(args), model_id=args.model_id)
    model.save(args.output)
    _print({"status": "ok", "output": str(args.output), "metadata": model.metadata()})


def cmd_score(args: argparse.Namespace) -> None:
    model = StoryCircuitModel.load(args.model)
    _print(model.score_text(args.text))


def cmd_continuations(args: argparse.Namespace) -> None:
    model = StoryCircuitModel.load(args.model)
    _print([item.to_dict() for item in model.score_continuations(args.prefix, args.candidates)])


def cmd_parse(args: argparse.Namespace) -> None:
    model = StoryCircuitModel.load(args.model) if args.model else None
    if model:
        _print(model.parse(args.text))
    else:
        from .parser import StoryParser
        _print(StoryParser().parse(args.text).to_dict())


def cmd_simulate(args: argparse.Namespace) -> None:
    model = StoryCircuitModel.load(args.model)
    _print(model.simulate(args.text))


def cmd_answer(args: argparse.Namespace) -> None:
    model = StoryCircuitModel.load(args.model)
    _print(model.answer(args.story, args.question))


def cmd_generate(args: argparse.Namespace) -> None:
    model = StoryCircuitModel.load(args.model)
    config = GenerationConfig(
        seed=args.seed,
        max_sentences=args.max_sentences,
        temperature=args.temperature,
        required_words=args.required_words,
        required_events=args.required_events,
        forbidden_words=args.forbidden_words,
        strategy=args.strategy,
    )
    _print(model.generate(args.prompt, config))


def cmd_evaluate(args: argparse.Namespace) -> None:
    model = StoryCircuitModel.load(args.model)
    harness = EvaluationHarness(model)
    result = harness.evaluate_file(args.cases)
    if args.output:
        write_json(args.output, result)
    _print(result["metrics"])


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="storycircuit", description="Executable symbolic language-model reference kernel")
    sub = parser.add_subparsers(dest="command", required=True)

    train = sub.add_parser("train", help="train a reference model")
    train.add_argument("--input", required=True)
    train.add_argument("--output", required=True)
    train.add_argument("--profile")
    train.add_argument("--model-id", default="storycircuit-reference")
    train.add_argument("--max-stories", type=int)
    train.add_argument("--parse-stories", type=int)
    train.add_argument("--byte-order", type=int)
    train.add_argument("--word-order", type=int)
    train.add_argument("--min-word-count", type=int)
    train.set_defaults(func=cmd_train)

    score = sub.add_parser("score")
    score.add_argument("--model", required=True)
    score.add_argument("--text", required=True)
    score.set_defaults(func=cmd_score)

    continuations = sub.add_parser("continuations")
    continuations.add_argument("--model", required=True)
    continuations.add_argument("--prefix", required=True)
    continuations.add_argument("candidates", nargs="+")
    continuations.set_defaults(func=cmd_continuations)

    parse = sub.add_parser("parse")
    parse.add_argument("--model")
    parse.add_argument("--text", required=True)
    parse.set_defaults(func=cmd_parse)

    simulate = sub.add_parser("simulate")
    simulate.add_argument("--model", required=True)
    simulate.add_argument("--text", required=True)
    simulate.set_defaults(func=cmd_simulate)

    answer = sub.add_parser("answer")
    answer.add_argument("--model", required=True)
    answer.add_argument("--story", required=True)
    answer.add_argument("--question", required=True)
    answer.set_defaults(func=cmd_answer)

    generate = sub.add_parser("generate")
    generate.add_argument("--model", required=True)
    generate.add_argument("--prompt", default="")
    generate.add_argument("--seed", type=int, default=0)
    generate.add_argument("--max-sentences", type=int, default=8)
    generate.add_argument("--temperature", type=float, default=1.0)
    generate.add_argument("--required-words", nargs="*", default=[])
    generate.add_argument("--required-events", nargs="*", default=[])
    generate.add_argument("--forbidden-words", nargs="*", default=[])
    generate.add_argument("--strategy", choices=["symbolic_plan", "word_ngram"], default="symbolic_plan")
    generate.set_defaults(func=cmd_generate)

    evaluate = sub.add_parser("evaluate")
    evaluate.add_argument("--model", required=True)
    evaluate.add_argument("--cases", required=True)
    evaluate.add_argument("--output")
    evaluate.set_defaults(func=cmd_evaluate)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        args.func(args)
    except KeyboardInterrupt:
        return 130
    except Exception as exc:
        print(f"error: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
