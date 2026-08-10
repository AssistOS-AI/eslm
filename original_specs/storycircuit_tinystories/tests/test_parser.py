from storycircuit.parser import StoryParser


def test_entities_events_and_properties():
    story = "A girl named Lily had a ball. Lily went to the park. Lily was happy."
    ir = StoryParser().parse(story)
    assert any(entity.name == "Lily" for entity in ir.entities)
    assert any(event.type == "go" for event in ir.events)
    assert any(prop.predicate == "possession" for prop in ir.propositions)
    assert any(prop.predicate == "property" for prop in ir.propositions)
    assert all(diag.code != "OPAQUE_SENTENCE" for diag in ir.diagnostics)


def test_pronoun_resolution():
    ir = StoryParser().parse("There was a girl named Lily. She went to the park.")
    lily = next(entity.id for entity in ir.entities if entity.name == "Lily")
    movement = next(event for event in ir.events if event.type == "go")
    agent = next(arg.value for arg in movement.participants if arg.role == "agent")
    assert agent == lily
