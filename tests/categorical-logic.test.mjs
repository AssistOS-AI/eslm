import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveCategoricalSyllogism,
  equivalentCategoricalPropositions,
  executeCategoricalTask,
  judgeCategoricalOpposition,
  transformCategoricalProposition,
} from '../src/reasoning/categorical-logic.mjs';

const term = (name, negationDepth = 0) => ({ term: name, canonical: name, negationDepth });
const proposition = (form, subject, predicate, subjectDepth = 0, predicateDepth = 0) => ({
  form, subject: term(subject, subjectDepth), predicate: term(predicate, predicateDepth),
});

test('traditional square of opposition distinguishes entailment, contradiction, and underdetermination', () => {
  const premise = proposition('A', 'flerm', 'dax');
  assert.equal(judgeCategoricalOpposition({ premise, candidate: proposition('I', 'flerm', 'dax') }).answer, 'True');
  assert.equal(judgeCategoricalOpposition({ premise, candidate: proposition('O', 'flerm', 'dax') }).answer, 'False');
  assert.equal(judgeCategoricalOpposition({
    premise: proposition('I', 'flerm', 'dax'), candidate: proposition('A', 'flerm', 'dax'),
  }).answer, 'Undetermined');
});

test('conversion, obversion, and contraposition operate on structure and complement depth', () => {
  const source = proposition('A', 'wug', 'blick');
  assert.equal(transformCategoricalProposition({ transformation: 'conversion', premise: source }).answer,
    'Some blick are wug.');
  assert.equal(transformCategoricalProposition({ transformation: 'obversion', premise: source }).answer,
    'No wug are non-blick.');
  assert.equal(transformCategoricalProposition({ transformation: 'contraposition', premise: source }).answer,
    'All non-blick are non-wug.');
  assert.equal(transformCategoricalProposition({
    transformation: 'obversion', premise: proposition('O', 'wug', 'blick', 2, 3),
  }).answer, 'Some wug are blick.');
});

test('invalid transformations abstain by declared form instead of guessing', () => {
  assert.equal(transformCategoricalProposition({
    transformation: 'conversion', premise: proposition('O', 'zorp', 'krell'),
  }).answer, 'No valid conversion.');
  assert.equal(transformCategoricalProposition({
    transformation: 'contraposition', premise: proposition('E', 'zorp', 'krell'),
  }).answer, 'No valid contraposition.');
});

test('categorical equivalence closes only valid reversible immediate transformations', () => {
  assert.equal(equivalentCategoricalPropositions(
    proposition('A', 's', 'p'), proposition('E', 's', 'p', 0, 1),
  ), true);
  assert.equal(equivalentCategoricalPropositions(
    proposition('E', 's', 'p'), proposition('E', 'p', 's'),
  ), true);
  assert.equal(equivalentCategoricalPropositions(
    proposition('A', 's', 'p'), proposition('I', 'p', 's'),
  ), false);
});

test('finite categorical models derive syllogisms with witnesses', () => {
  const result = deriveCategoricalSyllogism({
    figure: 1,
    premises: [proposition('A', 'miv', 'pav'), proposition('A', 'sul', 'miv')],
  });
  assert.equal(result.status, 'ANSWERED');
  assert.equal(result.answer, 'All sul are pav.');
  assert.equal(result.witness.kind, 'categorical-model-entailment-v1');
  assert.ok(result.witness.modelCount > 0);
});

test('categorical execution is invariant to full vocabulary renaming and premise order is semantically typed', () => {
  const first = executeCategoricalTask({
    operation: 'derive-categorical-syllogism', figure: 2,
    premises: [proposition('E', 'pred-a', 'middle-a'), proposition('A', 'subject-a', 'middle-a')],
  });
  const renamed = executeCategoricalTask({
    operation: 'derive-categorical-syllogism', figure: 2,
    premises: [proposition('E', 'quux', 'narp'), proposition('A', 'vlim', 'narp')],
  });
  assert.equal(first.proposition.form, 'E');
  assert.equal(renamed.proposition.form, 'E');
  assert.equal(renamed.answer, 'No quux are vlim.');
});

test('a meaning-changing contrast does not preserve a universal conclusion', () => {
  const result = deriveCategoricalSyllogism({
    figure: 1,
    premises: [proposition('I', 'miv', 'pav'), proposition('I', 'sul', 'miv')],
  });
  assert.equal(result.status, 'UNDERDETERMINED');
});
