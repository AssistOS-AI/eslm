from storycircuit.text import iter_stories_from_text, split_sentences, tokenize


def test_story_split_and_sentences():
    text = "Lily was happy.\n<|endoftext|>\nBen was kind."
    assert list(iter_stories_from_text(text)) == ["Lily was happy.", "Ben was kind."]
    sentences = split_sentences('Lily said "Hello!" Ben smiled.')
    assert len(sentences) >= 1
    assert tokenize("Lily's red ball!") == ["lily's", "red", "ball", "!"]
