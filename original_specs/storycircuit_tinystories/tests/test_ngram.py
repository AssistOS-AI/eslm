import math

from storycircuit.ngram import ByteNGramLM, WordNGramLM


def test_byte_model_full_support_and_round_trip():
    model = ByteNGramLM(order=3, alpha=0.1)
    model.fit(["Lily was happy."])
    score = model.score("Xylophina 🚀")
    assert math.isfinite(score.log_probability)
    restored = ByteNGramLM.from_dict(model.to_dict())
    assert restored.score("Xylophina 🚀").log_probability == score.log_probability


def test_word_distribution_normalizes_candidates():
    model = WordNGramLM(order=2, min_count=1)
    model.fit(["Lily was happy.", "Ben was kind."])
    distribution = model.next_distribution("Lily", ["was", "kind", "."])
    assert abs(sum(distribution.values()) - 1.0) < 1e-12
