import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  selectCategoricalArgumentCandidate,
  verifyCategoricalArgumentSelection,
} from '../src/reasoning/categorical-argument-validation.mjs';
import {
  compileCategoricalArgumentChoiceTask,
  parseCategoricalEnglishProposition,
} from '../src/benchmark-adapters/categorical-argument-projection.mjs';
import { PROJECT_ROOT } from '../src/paths.mjs';

function proposition(quantifier, subject, predicate) {
  return { quantifier, subject, predicate };
}

function sufficientTask(overrides = {}) {
  return {
    schema: 'categorical-argument-selection-v1',
    operation: 'select-sufficient-premise',
    premises: [proposition('some-not', 'class:kav', 'property:mired')],
    conclusion: proposition('some-not', 'class:voran', 'property:mired'),
    candidates: [
      { candidateId: 'candidate:bridge', proposition: proposition('all', 'class:kav', 'class:voran') },
      { candidateId: 'candidate:reverse', proposition: proposition('all', 'class:voran', 'class:kav') },
      { candidateId: 'candidate:irrelevant', proposition: proposition('some', 'class:zel', 'property:mired') },
    ],
    ...overrides,
  };
}

test('generic categorical validation selects the unique sufficient premise with a replayable proof', () => {
  const task = sufficientTask();
  const result = selectCategoricalArgumentCandidate(task);
  assert.equal(result.status, 'SOLVED');
  assert.deepEqual(result.values, ['candidate:bridge']);
  assert.equal(verifyCategoricalArgumentSelection(task, result), true);
  const selected = result.witness.decisions.find((decision) => decision.qualifies);
  assert.equal(selected.decision.witness.kind, 'categorical-entailment-proof-v1');
  assert.equal(typeof selected.decision.witness.conflict.contradiction, 'string');
  assert.ok(selected.decision.witness.conflict.positive
    .includes(selected.decision.witness.conflict.contradiction));
  assert.ok(selected.decision.witness.conflict.negative
    .includes(selected.decision.witness.conflict.contradiction));
  assert.ok(result.witness.decisions.filter((decision) => !decision.qualifies)
    .every((decision) => decision.decision.witness.kind === 'categorical-countermodel-v1'));
});

test('necessary-conclusion validation is invariant to full renaming and input ordering', () => {
  const makeTask = (terms, candidates) => ({
    schema: 'categorical-argument-selection-v1',
    operation: 'select-entailed-candidate',
    premises: [
      proposition('some', terms.first, terms.third),
      proposition('all', terms.first, terms.second),
    ],
    candidates,
  });
  const originalCandidates = [
    { candidateId: 'candidate:entailed', proposition: proposition('some', 'kind:b', 'kind:c') },
    { candidateId: 'candidate:universal', proposition: proposition('all', 'kind:b', 'kind:c') },
    { candidateId: 'candidate:negative', proposition: proposition('none', 'kind:b', 'kind:c') },
  ];
  const original = selectCategoricalArgumentCandidate(makeTask({
    first: 'kind:a', second: 'kind:b', third: 'kind:c',
  }, originalCandidates));
  assert.deepEqual(original.values, ['candidate:entailed']);

  const renamedCandidates = [
    { candidateId: 'candidate:negative-renamed', proposition: proposition('none', 'nonce:q', 'nonce:r') },
    { candidateId: 'candidate:entailed-renamed', proposition: proposition('some', 'nonce:q', 'nonce:r') },
    { candidateId: 'candidate:universal-renamed', proposition: proposition('all', 'nonce:q', 'nonce:r') },
  ];
  const renamed = selectCategoricalArgumentCandidate(makeTask({
    first: 'nonce:p', second: 'nonce:q', third: 'nonce:r',
  }, renamedCandidates));
  assert.deepEqual(renamed.values, ['candidate:entailed-renamed']);
  assert.equal(verifyCategoricalArgumentSelection(makeTask({
    first: 'nonce:p', second: 'nonce:q', third: 'nonce:r',
  }, renamedCandidates), renamed), true);
});

test('candidate permutation is invariant while relation reversal is a meaning-changing contrast', () => {
  const task = sufficientTask();
  const permuted = sufficientTask({ candidates: [...task.candidates].reverse() });
  assert.deepEqual(selectCategoricalArgumentCandidate(task).values,
    selectCategoricalArgumentCandidate(permuted).values);

  const reversed = sufficientTask({
    candidates: task.candidates.map((candidate) => candidate.candidateId === 'candidate:bridge'
      ? { ...candidate, proposition: proposition('all', 'class:voran', 'class:kav') } : candidate),
  });
  const result = selectCategoricalArgumentCandidate(reversed);
  assert.equal(result.status, 'UNDERDETERMINED');
  assert.deepEqual(result.values, []);
});

test('inconsistent premises and resource bounds fail visibly instead of selecting a candidate', () => {
  const inconsistent = sufficientTask({
    premises: [
      proposition('some', 'class:kav', 'property:mired'),
      proposition('none', 'class:kav', 'property:mired'),
    ],
  });
  assert.equal(selectCategoricalArgumentCandidate(inconsistent).status, 'INCONSISTENT_CONTEXT');

  const bounded = sufficientTask({ limits: { maximumCandidates: 2 } });
  assert.equal(selectCategoricalArgumentCandidate(bounded).status, 'RESOURCE_LIMIT');
});

test('generic categorical argument core contains no benchmark, row, or answer-position vocabulary', async () => {
  const source = await readFile(join(PROJECT_ROOT,
    'src/reasoning/categorical-argument-validation.mjs'), 'utf8');
  assert.doesNotMatch(source,
    /(?:\bReClor\b|\bLogiQA\b|\bbenchmark\b|\bdataset\b|\bsplit\b|\brow\b|expected answer|option [A-D])/iu);
  assert.doesNotMatch(source, /candidateId\s*===/u);
});

test('strict English projection compiles a sufficient-premise argument without its oracle', () => {
  const projected = compileCategoricalArgumentChoiceTask({
    passage: "Some kavs don't mire, so some vorans don't mire.",
    question: 'Which statement can guarantee the argument?',
    candidates: [
      { candidateId: 'candidate:bridge', text: 'All kavs are vorans.' },
      { candidateId: 'candidate:reverse', text: 'All vorans are kavs.' },
      { candidateId: 'candidate:noise', text: 'Some zels are mired.' },
    ],
  });
  assert.equal(projected.status, 'COMPILED');
  const result = selectCategoricalArgumentCandidate(projected.task);
  assert.deepEqual(result.values, ['candidate:bridge']);
  assert.equal(verifyCategoricalArgumentSelection(projected.task, result), true);
});

test('strict projection compiles necessary conclusions and rejects partially understood candidate sets', () => {
  const complete = compileCategoricalArgumentChoiceTask({
    passage: 'All kavs are vorans. Some kavs are zels.',
    question: 'Which of the following must also be true?',
    candidates: [
      { candidateId: 'candidate:entailed', text: 'Some vorans are zels.' },
      { candidateId: 'candidate:universal', text: 'All vorans are zels.' },
    ],
  });
  assert.equal(complete.status, 'COMPILED');
  assert.deepEqual(selectCategoricalArgumentCandidate(complete.task).values, ['candidate:entailed']);

  const partial = compileCategoricalArgumentChoiceTask({
    passage: 'All kavs are vorans.',
    question: 'Which of the following must also be true?',
    candidates: [
      { candidateId: 'candidate:parsed', text: 'Some kavs are vorans.' },
      { candidateId: 'candidate:opaque', text: 'Kavs gather only when both moons rise.' },
    ],
  });
  assert.equal(partial.status, 'NO_APPLICABLE_METHOD');
  assert.equal(partial.failureStage, 'candidate-semantics');
});

test('strict projection never drops an opaque premise or collapses a compound candidate into one atom', () => {
  const opaquePremise = compileCategoricalArgumentChoiceTask({
    passage: 'All kavs are vorans. Kavs gather only after the eastern bell rings.',
    question: 'Which of the following must also be true?',
    candidates: [
      { candidateId: 'candidate:one', text: 'Some kavs are vorans.' },
      { candidateId: 'candidate:two', text: 'No kavs are vorans.' },
    ],
  });
  assert.equal(opaquePremise.status, 'NO_APPLICABLE_METHOD');
  assert.equal(opaquePremise.failureStage, 'premise-semantics');

  const compoundCandidate = compileCategoricalArgumentChoiceTask({
    passage: 'All kavs are vorans.',
    question: 'Which of the following must also be true?',
    candidates: [
      { candidateId: 'candidate:compound', text: 'Some kavs are vorans or zels.' },
      { candidateId: 'candidate:plain', text: 'No kavs are vorans.' },
    ],
  });
  assert.equal(compoundCandidate.status, 'NO_APPLICABLE_METHOD');
  assert.equal(compoundCandidate.failureStage, 'candidate-semantics');
});

test('categorical surface parser preserves quantifier and polarity under nonce renaming', () => {
  assert.deepEqual(parseCategoricalEnglishProposition("Some qirens don't vel."), {
    status: 'PARSED',
    proposition: { quantifier: 'some-not', subject: 'qirens', predicate: 'vel' },
    surface: "Some qirens don't vel",
  });
  assert.equal(parseCategoricalEnglishProposition('Not all qirens are vel.').status, 'UNPARSED');
  assert.equal(parseCategoricalEnglishProposition('All qirens are vel or dax.').status, 'UNPARSED');
});
