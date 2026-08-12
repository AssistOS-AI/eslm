import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HEURISTIC_REQUEST_PATTERN_CATALOG, planHeuristicRequest,
} from '../src/language/heuristic-request-planning.mjs';

test('request planning votes for a bounded report shape and topic without consulting knowledge', () => {
  const result = planHeuristicRequest('Write a short report about zorals.');
  assert.equal(result.status, 'PLANNED');
  assert.equal(result.selectedPlan.primaryIntent, 'compose');
  assert.deepEqual(result.selectedPlan.topics.map((item) => item.surface), ['zorals']);
  assert.deepEqual(result.selectedPlan.outputContract, {
    artifact: 'report',
    format: 'sections',
    length: 'brief',
    citationMode: 'inline-record-citations',
    unsupportedContentPolicy: 'explicit-gap',
  });
  assert.ok(result.selectedPlan.votes.intent.length > 0);
  assert.equal(result.receipt.kbConsulted, false);
  assert.equal(result.receipt.reasonerInvoked, false);
  assert.equal(result.receipt.sessionMutated, false);
});

test('summary, expansion, explanation, comparison, and outline remain distinct generic intents', () => {
  const cases = [
    ['Summarize the following text: A zoral is blue. A zoral moves.', 'summarize'],
    ['Expand this text: A velin is calm.', 'expand'],
    ['Explain why a tarin moves.', 'explain'],
    ['Compare zorals with velins in a table.', 'compare'],
    ['Outline information about narufs.', 'outline'],
  ];
  for (const [input, expected] of cases) {
    const plan = planHeuristicRequest(input);
    assert.equal(plan.status, 'PLANNED', input);
    assert.equal(plan.selectedPlan.primaryIntent, expected, input);
    assert.ok(plan.selectedPlan.subrequests.some((item) => item.operation === 'shape-output'));
  }
  const comparison = planHeuristicRequest('Compare zorals with velins in a table.');
  assert.deepEqual(comparison.selectedPlan.topics.map((item) => item.normalized), ['zorals', 'velins']);
  assert.equal(comparison.selectedPlan.outputContract.format, 'table');
  assert.ok(comparison.selectedPlan.subrequests.some((item) =>
    item.operation === 'correlate-topic-evidence'));
});

test('large requests become an explicit dependency-ordered subrequest plan', () => {
  const result = planHeuristicRequest(
    'Write a detailed document about zorals; then also compare zorals with velins; and then outline the evidence.',
  );
  assert.equal(result.status, 'PLANNED');
  assert.ok(result.selectedPlan.instructionSegments.length >= 3);
  assert.equal(result.selectedPlan.primaryIntent, 'compose');
  assert.deepEqual(result.selectedPlan.operations, ['compose', 'compare', 'outline']);
  assert.deepEqual(result.selectedPlan.operationPlans.map((operation) => ({
    order: operation.order,
    intent: operation.intent,
    artifact: operation.outputContract.artifact,
  })), [
    { order: 1, intent: 'compose', artifact: 'document' },
    { order: 2, intent: 'compare', artifact: 'response' },
    { order: 3, intent: 'outline', artifact: 'outline' },
  ]);
  assert.deepEqual(result.selectedPlan.topics.map((topic) => topic.surface), ['zorals', 'velins']);
  assert.ok(result.selectedPlan.subrequests.some((item) =>
    item.operation === 'retrieve-related-evidence' && item.topic === 'velins'));
  const shapes = result.selectedPlan.subrequests.filter((item) => item.operation === 'shape-output');
  assert.deepEqual(shapes.map((item) => item.operationId),
    ['operation:1', 'operation:2', 'operation:3']);
  assert.deepEqual(shapes.map((item) => item.dependsOn), [
    ['subrequest:select:1'], ['subrequest:select:2'], ['subrequest:select:3'],
  ]);
  const aggregate = result.selectedPlan.subrequests.at(-1);
  assert.equal(aggregate.operation, 'aggregate-operation-outputs');
  assert.deepEqual(aggregate.dependsOn,
    ['subrequest:shape:1', 'subrequest:shape:2', 'subrequest:shape:3']);
  assert.equal(result.selectedPlan.outputContract.artifact, 'composite-response');

  const reordered = planHeuristicRequest(
    'Outline quorims; summarize fenors; compare narufs with velins.',
  );
  assert.deepEqual(reordered.selectedPlan.operations, ['outline', 'summarize', 'compare']);
  assert.deepEqual(reordered.selectedPlan.operationPlans.map((operation) => operation.order), [1, 2, 3]);
  assert.deepEqual(reordered.selectedPlan.topics.map((topic) => topic.surface),
    ['quorims', 'fenors', 'narufs', 'velins']);
});

test('provided source material is isolated from instructions and never treated as an answer', () => {
  const result = planHeuristicRequest(
    'Summarize this text: Zoral is a class. Every zoral glims vepa. Tarin is a zoral.',
  );
  assert.equal(result.status, 'PLANNED');
  assert.equal(result.selectedPlan.sourceMaterial.extraction, 'explicit-content-marker');
  assert.equal(result.selectedPlan.sourceMaterial.text,
    'Zoral is a class. Every zoral glims vepa. Tarin is a zoral.');
  assert.ok(result.selectedPlan.subrequests.some((item) => item.operation === 'extract-source-content'));
});

test('quoted material remains inert while a trailing output instruction is preserved', () => {
  const result = planHeuristicRequest(
    'Summarize "Draft a detailed report. Velins rest at dusk." as a table.',
  );
  assert.equal(result.status, 'PLANNED');
  assert.equal(result.selectedPlan.primaryIntent, 'summarize');
  assert.deepEqual(result.selectedPlan.operations, ['summarize']);
  assert.equal(result.selectedPlan.outputContract.artifact, 'summary');
  assert.equal(result.selectedPlan.outputContract.format, 'table');
  assert.equal(result.selectedPlan.sourceMaterial.text,
    'Draft a detailed report. Velins rest at dusk.');
  assert.deepEqual(result.selectedPlan.topics, []);
  assert.equal(result.selectedPlan.instructionSegments[0].surface, 'Summarize as a table.');

  const renamedShortSource = planHeuristicRequest(
    'Summarize "Draft a report." as bullet points.',
  );
  assert.equal(renamedShortSource.status, 'PLANNED');
  assert.deepEqual(renamedShortSource.selectedPlan.operations, ['summarize']);
  assert.equal(renamedShortSource.selectedPlan.sourceMaterial.text, 'Draft a report.');
  assert.equal(renamedShortSource.selectedPlan.outputContract.format, 'bullets');
});

test('instructions embedded inside supplied material remain inert data', () => {
  const result = planHeuristicRequest(
    'Summarize this text: Write a detailed report about zorals in a table.',
  );
  assert.equal(result.status, 'PLANNED');
  assert.equal(result.selectedPlan.primaryIntent, 'summarize');
  assert.deepEqual(result.selectedPlan.operations, ['summarize']);
  assert.equal(result.selectedPlan.outputContract.artifact, 'summary');
  assert.equal(result.selectedPlan.outputContract.format, 'paragraphs');
  assert.equal(result.selectedPlan.outputContract.length, 'standard');
  assert.equal(result.selectedPlan.sourceMaterial.text,
    'Write a detailed report about zorals in a table.');

  const quoted = planHeuristicRequest(
    'Summarize this text: A naruf says "draft a report about velins".',
  );
  assert.equal(quoted.selectedPlan.sourceMaterial.extraction, 'explicit-content-marker');
  assert.equal(quoted.selectedPlan.sourceMaterial.text,
    'A naruf says "draft a report about velins".');
  assert.deepEqual(quoted.selectedPlan.operations, ['summarize']);
});

test('request planning reports material and instruction truncation honestly', () => {
  const material = planHeuristicRequest(`Summarize this text: ${'z'.repeat(9_000)}`);
  assert.equal(material.status, 'PLANNED');
  assert.equal(material.selectedPlan.sourceMaterial.complete, false);
  assert.equal(material.receipt.complete, false);
  assert.ok(material.receipt.truncationReasons.includes('source-material-character-budget'));

  const many = planHeuristicRequest(Array.from({ length: 15 }, (_, index) =>
    `Write a report about zoral${index}`).join('; '));
  assert.equal(many.receipt.complete, false);
  assert.equal(many.receipt.observedInstructionSegments, 15);
  assert.ok(many.receipt.truncationReasons.includes('instruction-segment-budget'));
});

test('topic receipts distinguish count omission from character truncation', () => {
  const counted = planHeuristicRequest(
    'Write a report about zoral one; write a report about velin two; '
      + 'write a report about tarin three.',
    { limits: { maximumTopics: 2 } },
  );
  assert.equal(counted.receipt.complete, false);
  assert.deepEqual(counted.receipt.topicSelection, {
    items: counted.selectedPlan.topics,
    observedCandidates: 3,
    uniqueCandidates: 3,
    returnedTopics: 2,
    characterTruncations: 0,
    omittedByCount: 1,
    normalizationCollisions: 0,
    complete: false,
  });
  assert.ok(counted.receipt.truncationReasons.includes('topic-count-budget'));

  const longTopic = 'n'.repeat(80);
  const shortened = planHeuristicRequest(`Write an article about ${longTopic}.`, {
    limits: { maximumTopicCharacters: 24 },
  });
  assert.equal(shortened.receipt.complete, false);
  assert.equal(shortened.receipt.topicSelection.characterTruncations, 1);
  assert.equal(shortened.selectedPlan.topics[0].originalCharacters, 80);
  assert.equal(shortened.selectedPlan.topics[0].retainedCharacters, 24);
  assert.equal(shortened.selectedPlan.topics[0].complete, false);
  assert.ok(shortened.receipt.truncationReasons.includes('topic-character-budget'));
});

test('non-request questions do not acquire a synthesis plan', () => {
  const result = planHeuristicRequest('Does Tarin glim vepa?');
  assert.equal(result.status, 'NO_SUPPORTED_INTENT');
  assert.equal(result.selectedPlan, null);
});

test('artifact nouns and operation words require explicit request force', () => {
  for (const input of [
    'I read a report about narufs.',
    'The essay compares velins with tarins.',
    'A summary explains why quorims move.',
    'We write a document about fenors.',
    'A report about salins is useful, please.',
  ]) {
    const statement = planHeuristicRequest(input);
    assert.equal(statement.status, 'NO_SUPPORTED_INTENT', input);
    assert.equal(statement.selectedPlan, null, input);
    assert.equal(statement.receipt.requestForce.acceptedSegments, 0, input);
    assert.equal(statement.receipt.ignoredMatches.length, 1, input);
  }

  const controls = [
    ['Write a report about narufs.', 'compose'],
    ['Compare velins with tarins.', 'compare'],
    ['Explain why quorims move.', 'explain'],
    ['Could you summarize fenors?', 'summarize'],
    ['I need a document about salins.', 'compose'],
    ['A summary of borins, please.', 'summarize'],
  ];
  for (const [input, intent] of controls) {
    const request = planHeuristicRequest(input);
    assert.equal(request.status, 'PLANNED', input);
    assert.equal(request.selectedPlan.primaryIntent, intent, input);
    assert.equal(request.receipt.requestForce.acceptedSegments, 1, input);
  }
});

test('a force-bearing uncoordinated artifact tie remains ambiguous', () => {
  const result = planHeuristicRequest('Please write a summary outline about narufs.');
  assert.equal(result.status, 'AMBIGUOUS');
  assert.ok(result.receipt.requestForce.acceptedSegments === 1);
  assert.deepEqual(result.candidates.slice(0, 2).map((candidate) => candidate.intent),
    ['outline', 'summarize']);
  assert.equal(result.receipt.ambiguity[0].instructionSegmentId, 'instruction:1');

  const coordinated = planHeuristicRequest('Summarize narufs and then outline velins.');
  assert.equal(coordinated.status, 'PLANNED');
  assert.deepEqual(coordinated.selectedPlan.operations, ['summarize', 'outline']);
});

test('operation planning is bounded and reports omitted instructions', () => {
  const result = planHeuristicRequest(Array.from({ length: 9 }, (_, index) =>
    `Summarize topic${index}`).join('; '));
  assert.equal(result.status, 'PLANNED');
  assert.equal(result.selectedPlan.operationPlans.length, 8);
  assert.equal(result.receipt.operationSelection.observed, 9);
  assert.equal(result.receipt.operationSelection.omitted, 1);
  assert.equal(result.receipt.complete, false);
  assert.ok(result.receipt.truncationReasons.includes('operation-count-budget'));
  assert.equal(result.selectedPlan.subrequests.at(-1).operation, 'aggregate-operation-outputs');
});

test('negated operations, artifacts, and formats are constraints rather than positive votes', () => {
  const declined = planHeuristicRequest('Do not write a report about zorals.');
  assert.equal(declined.status, 'NO_SUPPORTED_INTENT');
  assert.ok(declined.receipt.exclusions.some((item) => item.artifact === 'report'));
  assert.ok(declined.receipt.exclusions.some((item) => item.intent === 'compose'));

  const artifact = planHeuristicRequest('Write a report, not an essay, about zorals.');
  assert.equal(artifact.status, 'PLANNED');
  assert.equal(artifact.selectedPlan.outputContract.artifact, 'report');
  assert.ok(artifact.receipt.exclusions.some((item) => item.artifact === 'essay'));

  const format = planHeuristicRequest('Write a report about zorals without a table.');
  assert.equal(format.status, 'PLANNED');
  assert.equal(format.selectedPlan.outputContract.format, 'sections');
  assert.ok(format.receipt.exclusions.some((item) => item.value === 'table'));

  const operation = planHeuristicRequest('Do not summarize; explain zorals.');
  assert.equal(operation.status, 'PLANNED');
  assert.equal(operation.selectedPlan.primaryIntent, 'explain');
  assert.deepEqual(operation.selectedPlan.operations, ['explain']);
  assert.deepEqual(operation.selectedPlan.topics.map((item) => item.surface), ['zorals']);
  assert.ok(operation.receipt.exclusions.some((item) => item.intent === 'summarize'));
});

test('negation scope covers coordination and negative complements but stops at contrasts', () => {
  for (const input of [
    'Do not write or draft a report about narufs.',
    'Write no article about velins.',
    'Without writing or drafting a document about tarins.',
  ]) {
    const declined = planHeuristicRequest(input);
    assert.equal(declined.status, 'NO_SUPPORTED_INTENT', input);
    assert.equal(declined.selectedPlan, null, input);
  }

  const contrast = planHeuristicRequest(
    'Do not write or draft a report; instead summarize quorims.',
  );
  assert.equal(contrast.status, 'PLANNED');
  assert.equal(contrast.selectedPlan.primaryIntent, 'summarize');
  assert.deepEqual(contrast.selectedPlan.operations, ['summarize']);
  assert.equal(contrast.selectedPlan.outputContract.artifact, 'summary');
  assert.deepEqual(contrast.selectedPlan.topics.map((topic) => topic.surface), ['quorims']);

  const subordinate = planHeuristicRequest(
    'Without writing a report, explain why a fenor moves.',
  );
  assert.equal(subordinate.status, 'PLANNED');
  assert.equal(subordinate.selectedPlan.primaryIntent, 'explain');
  assert.equal(subordinate.selectedPlan.outputContract.artifact, 'explanation');

  for (const input of [
    'Write or draft a report about narufs.',
    'Draft or write an article about velins.',
  ]) {
    const positive = planHeuristicRequest(input);
    assert.equal(positive.status, 'PLANNED', input);
    assert.equal(positive.selectedPlan.primaryIntent, 'compose', input);
  }
});

test('source-only markers do not become retrieval topics', () => {
  for (const input of [
    'Summarize this text: Penguins swim in cold seas.',
    'Summarize the following passage: A velin rests at dusk.',
    'Expand this content: A tarin crosses the ridge.',
  ]) {
    const result = planHeuristicRequest(input);
    assert.equal(result.status, 'PLANNED', input);
    assert.deepEqual(result.selectedPlan.topics, [], input);
    assert.equal(result.receipt.topicSelection.observedCandidates, 0, input);
  }
});

test('request planning is deterministic, bounded, and exposes a versioned pattern catalog', () => {
  const input = 'Prepare a concise essay about renamed symbolic systems.';
  assert.deepEqual(planHeuristicRequest(input), planHeuristicRequest(input));
  assert.equal(HEURISTIC_REQUEST_PATTERN_CATALOG.version,
    'eslm-heuristic-request-pattern-catalog-v3');
  const limited = planHeuristicRequest('Write a report about zorals.', {
    limits: { maximumInputBytes: 8 },
  });
  assert.equal(limited.status, 'RESOURCE_LIMIT');
  assert.equal(limited.receipt.exhausted, 'maximumInputBytes');
});
