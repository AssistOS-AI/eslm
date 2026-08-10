from pathlib import Path

from storycircuit.eval.harness import EvaluationHarness
from storycircuit.learner import TrainingConfig
from storycircuit.model import StoryCircuitModel
from storycircuit.utils import iter_jsonl

ROOT = Path(__file__).resolve().parents[1]


def test_smoke_harness():
    model = StoryCircuitModel.train_path(
        ROOT / "data" / "smoke" / "stories.txt",
        TrainingConfig(max_stories=20, parse_stories=20, min_word_count=1),
    )
    result = EvaluationHarness(model).evaluate_cases(iter_jsonl(ROOT / "eval" / "samples" / "smoke_cases.jsonl"))
    assert result["metrics"]["errors"] == 0
    assert "likelihood" in result["metrics"]["families"]
    assert "state_tracking" in result["metrics"]["families"]
