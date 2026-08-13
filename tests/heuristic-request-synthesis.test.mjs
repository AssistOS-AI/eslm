import assert from 'node:assert/strict';
import test from 'node:test';
import { planHeuristicRequest } from '../src/language/heuristic-request-planning.mjs';
import { synthesizeHeuristicRequest } from '../src/runtime/heuristic-request-synthesis.mjs';

function entry(kbId, recordId, statement, subject, predicate, object, score = 5) {
  return Object.freeze({
    kbId, kbVersion: '1', recordId, statement,
    semantic: { subject, predicate, object },
    relevance: { score, reasons: ['nonce-topic'] },
    provenance: [`source:${recordId}`],
    contributingKbVersions: [{ kbId, version: '1' }],
  });
}

function grounding(entries, complete = true) {
  return Object.freeze({
    format: 'eslm-grounding-bundle-v1',
    entries: Object.freeze(entries),
    search: Object.freeze({ complete, receipts: Object.freeze([]) }),
  });
}

test('a requested report realizes coherent sentences without upgrading relevance to proof', () => {
  const plan = planHeuristicRequest('Write a short report about zorals.');
  const result = synthesizeHeuristicRequest(plan, grounding([
    entry('nonce-a', 'r1', 'A zoral is a mineral.', 'zoral', 'is_a', 'mineral', 9),
    entry('nonce-b', 'r2', 'A zoral has a blue surface.', 'zoral', 'has_property', 'blue', 8),
    entry('noise', 'r3', 'A velin is quiet.', 'velin', 'is_a', 'quiet', 10),
  ]));
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.answerAuthority, 'related-evidence-is-not-entailment');
  assert.equal(result.protocol, 'eslm-heuristic-request-synthesis-v2');
  assert.equal(result.claimMode, 'grounded-symbolic-generation');
  assert.match(result.gaps[0], /symbolic answer construction/u);
  assert.match(result.answer, /^# Zorals/mu);
  assert.match(result.answer, /A zoral is a mineral and has a blue surface\. \[1\]\[2\]/u);
  assert.match(result.answer, /## Sources/u);
  assert.match(result.answer, /nonce-a 1, r1/u);
  assert.doesNotMatch(result.answer, /A velin is quiet/u);
  assert.ok(result.realization.strategyTrace.includes('strategy:result:claim-fusion@1'));
  assert.equal(result.realization.coverage.evidenceRealized, 2);
  assert.equal(result.evidence.unrelatedEntriesOmitted, 1);
  assert.deepEqual(result.contributingKbVersions, [
    { kbId: 'nonce-a', version: '1' }, { kbId: 'nonce-b', version: '1' },
  ]);
});

test('comparison output groups evidence and reports only explicit shared relations', () => {
  const plan = planHeuristicRequest('Compare zorals with velins in a table.');
  const result = synthesizeHeuristicRequest(plan, grounding([
    entry('nonce', 'z1', 'Zorals have amber color.', 'zoral', 'has_color', 'amber'),
    entry('nonce', 'v1', 'Velins have cobalt color.', 'velin', 'has_color', 'cobalt'),
  ]));
  assert.match(result.answer, /\| Supported statement \| Evidence \|/u);
  assert.deepEqual(result.correlation.sharedRelations, ['has color']);
  assert.match(result.answer, /share these explicit relation labels: has color/u);
});

test('explanation requests expose a causal gap instead of inventing a reason', () => {
  const plan = planHeuristicRequest('Explain why zorals move.');
  const result = synthesizeHeuristicRequest(plan, grounding([
    entry('nonce', 'z1', 'A zoral can move.', 'zoral', 'can', 'move'),
  ], false));
  assert.match(result.answer, /does not contain an explicit causal relation/u);
  assert.match(result.answer, /evidence search was bounded and incomplete/u);
});

test('source summary and expansion are deterministic coherent prose', () => {
  const summaryPlan = planHeuristicRequest(
    'Summarize this text: Zorals move. Zorals have amber shells. Velins rest. Zorals rest at noon.',
  );
  const first = synthesizeHeuristicRequest(summaryPlan, grounding([]));
  const second = synthesizeHeuristicRequest(summaryPlan, grounding([]));
  assert.deepEqual(first, second);
  assert.match(first.answer, /^Zorals move\. Zorals have amber shells\./u);
  assert.doesNotMatch(first.answer, /Supplied material/u);

  const expansionPlan = planHeuristicRequest('Expand this text: A zoral moves. It rests.');
  const expansion = synthesizeHeuristicRequest(expansionPlan, grounding([]));
  assert.match(expansion.answer, /A zoral moves\. It rests\./u);
  assert.doesNotMatch(expansion.answer, /because/u);

  const tablePlan = planHeuristicRequest('Summarize "A borin glows." as a table.');
  const table = synthesizeHeuristicRequest(tablePlan, grounding([]));
  assert.match(table.answer, /\| Supported statement \| Evidence \|/u);
  assert.match(table.answer, /\| A borin glows\. \| supplied material \|/u);
});

test('source-only summaries do not mix retrieved facts into the supplied source', () => {
  const plan = planHeuristicRequest('Summarize this text: Penguins swim in cold seas.');
  assert.deepEqual(plan.selectedPlan.topics, []);
  const result = synthesizeHeuristicRequest(plan, grounding([
    entry('avian-source', 'penguin-swim', 'A penguin can swim.', 'penguin', 'can', 'swim'),
  ]));
  assert.equal(result.evidence.selected.length, 1);
  assert.equal(result.answer, 'Penguins swim in cold seas.');
  assert.equal(result.realization.coverage.evidenceRejected, 1);
  assert.doesNotMatch(result.answer, /## this|## text|## following|## passage|## content/iu);
});

test('no evidence and no supplied material produces no fabricated draft', () => {
  const plan = planHeuristicRequest('Write an essay about zorals.');
  assert.equal(synthesizeHeuristicRequest(plan, grounding([])), null);
});

test('topic matching uses token boundaries instead of substring overlap', () => {
  const plan = planHeuristicRequest('Write a report about cat.');
  const result = synthesizeHeuristicRequest(plan, grounding([
    entry('noise', 'education', 'Education matters.', 'education', 'has_property', 'important'),
    entry('noise', 'earth', 'Earth is round.', 'earth', 'has_property', 'round'),
    entry('noise', 'human', 'A human can reason.', 'human', 'can', 'reason'),
    entry('match', 'cat', 'A cat is an animal.', 'cat', 'is_a', 'animal'),
  ]));
  assert.match(result.answer, /A cat is an animal/u);
  assert.doesNotMatch(result.answer, /Education|Earth|human/u);
  assert.equal(result.evidence.unrelatedEntriesOmitted, 3);
});

test('source truncation is visible and never described as full sentence preservation', () => {
  const plan = planHeuristicRequest(`Summarize this text: ${'z'.repeat(1_007)}.`);
  const result = synthesizeHeuristicRequest(plan, grounding([]));
  assert.equal(result.sourceSummary.complete, false);
  assert.match(result.answer, /Evidence limits/u);
  assert.match(result.answer, /Only bounded excerpts/u);
});

test('request-plan truncation is repeated in artifact coverage gaps', () => {
  const plan = planHeuristicRequest(
    'Summarize zorals; explain velins; outline tarins.',
    { limits: { maximumOperations: 2 } },
  );
  assert.equal(plan.receipt.complete, false);
  assert.ok(plan.receipt.truncationReasons.includes('operation-count-budget'));
  const result = synthesizeHeuristicRequest(plan, grounding([
    entry('nonce', 'z1', 'A zoral moves.', 'zoral', 'can', 'move'),
    entry('nonce', 'v1', 'A velin rests.', 'velin', 'can', 'rest'),
  ]));
  assert.ok(result.gaps.some((gap) => /operation-count-budget/u.test(gap)));
  assert.match(result.answer, /request plan reached its operation budget/u);
});

test('multi-obligation synthesis executes and accounts for every operation in discourse order', () => {
  const plan = planHeuristicRequest(
    'Summarize zorals; compare velins with tarins in a table; then outline quorims.',
  );
  const result = synthesizeHeuristicRequest(plan, grounding([
    entry('nonce', 'z1', 'A zoral has an amber shell.', 'zoral', 'has_color', 'amber'),
    entry('nonce', 'v1', 'A velin has a cobalt shell.', 'velin', 'has_color', 'cobalt'),
    entry('nonce', 't1', 'A tarin has a silver shell.', 'tarin', 'has_color', 'silver'),
    entry('nonce', 'q1', 'A quorim rests at dawn.', 'quorim', 'rests_at', 'dawn'),
  ]));

  assert.deepEqual(result.operationArtifacts.map((artifact) => artifact.intent),
    ['summarize', 'compare', 'outline']);
  assert.deepEqual(result.operationArtifacts.map((artifact) => artifact.order), [1, 2, 3]);
  assert.deepEqual(result.operationArtifacts.map((artifact) => artifact.topicIds),
    [['topic:1'], ['topic:2', 'topic:3'], ['topic:4']]);
  assert.ok(result.operationArtifacts.every((artifact) =>
    artifact.evidence.selected.length > 0 && artifact.gaps.length > 0 && artifact.complete === false));
  const first = result.answer.indexOf('## Summarize: zorals');
  const second = result.answer.indexOf('## Compare: velins and tarins');
  const third = result.answer.indexOf('## Outline: quorims');
  assert.ok(first >= 0 && first < second && second < third);
  assert.match(result.answer, /\| Supported statement \| Evidence \|/u);
  assert.match(result.answer, /## Comparison/u);
  assert.deepEqual(result.evidence.selected.map((item) => item.entry.recordId),
    ['z1', 'v1', 't1', 'q1']);
});
