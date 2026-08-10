from pathlib import Path

from storycircuit.learner import TrainingConfig
from storycircuit.model import StoryCircuitModel
from storycircuit.realizer import GenerationConfig

ROOT = Path(__file__).resolve().parents[1]


def build_model():
    return StoryCircuitModel.train_path(
        ROOT / "data" / "smoke" / "stories.txt",
        TrainingConfig(max_stories=20, parse_stories=20, min_word_count=1),
    )


def test_save_load_and_score(tmp_path):
    model = build_model()
    target = tmp_path / "model.json"
    model.save(target)
    loaded = StoryCircuitModel.load(target)
    assert loaded.score_text("Lily was happy.").log_probability == model.score_text("Lily was happy.").log_probability


def test_generation_constraints():
    model = build_model()
    result = model.generate(
        "Write a story about Lily, a ball, and a park.",
        GenerationConfig(seed=7, required_words=["lily", "ball", "park"]),
    )
    assert result.verification["passed"]
    assert all(word in result.text.lower() for word in ["lily", "ball", "park"])
