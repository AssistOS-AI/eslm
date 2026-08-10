from storycircuit.parser import StoryParser
from storycircuit.world import WorldRuntime


def answer(story: str, question: str) -> str:
    return WorldRuntime(StoryParser().parse(story)).answer(question).answer


def test_possession_transfer():
    assert answer("Lily had a ball. Lily gave the ball to Ben.", "Who has the ball?") == "Ben"


def test_location_and_property():
    assert answer("Lily went to the park.", "Where is Lily?") == "the park"
    assert answer("A girl named Ava was sad. Ava was happy.", "Was Ava happy?") == "yes"


def test_find_event():
    assert answer("Tim went to the garden. Tim found a blue toy.", "What did Tim find?") == "the toy"
