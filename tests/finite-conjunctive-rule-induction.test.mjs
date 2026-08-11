import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  evaluateFiniteConjunctiveRule,
  induceFiniteConjunctiveRule,
  verifyFiniteConjunctiveRuleResult,
} from '../src/reasoning/finite-conjunctive-rule-induction.mjs';

function entity(value) {
  return Object.freeze({ kind: 'entity', value });
}

function value(item) {
  return Object.freeze({ kind: 'value', value: item });
}

function fact(id, predicate, ...argumentsList) {
  return Object.freeze({ id, predicate, arguments: Object.freeze(argumentsList) });
}

function example(id, classification, root, facts) {
  return Object.freeze({ id, classification, root, facts: Object.freeze(facts) });
}

function task(overrides = {}) {
  return {
    schema: 'finite-conjunctive-rule-induction-task-v1',
    targetPredicate: 'class:aurora',
    examples: [
      example('example:p1', 'positive', 'entity:root-a', [
        fact('fact:p1-link', 'relation:quartz', entity('entity:root-a'), entity('entity:child-a')),
        fact('fact:p1-mark', 'property:umber', entity('entity:child-a'), value('value:iris')),
        fact('fact:p1-noise', 'property:noise', entity('entity:child-a'), value('value:one')),
      ]),
      example('example:p2', 'positive', 'entity:root-b', [
        fact('fact:p2-noise', 'property:noise', entity('entity:child-b'), value('value:two')),
        fact('fact:p2-mark', 'property:umber', entity('entity:child-b'), value('value:iris')),
        fact('fact:p2-link', 'relation:quartz', entity('entity:root-b'), entity('entity:child-b')),
      ]),
      example('example:n1', 'negative', 'entity:root-c', [
        fact('fact:n1-link', 'relation:quartz', entity('entity:root-c'), entity('entity:child-c')),
        fact('fact:n1-mark', 'property:umber', entity('entity:child-c'), value('value:flint')),
        fact('fact:n1-noise', 'property:noise', entity('entity:child-c'), value('value:one')),
      ]),
    ],
    limits: { maxBodyLiterals: 4, maxVariables: 4, maxCandidates: 1_000, maxMatchSteps: 10_000 },
    ...overrides,
  };
}

test('finite induction finds the shortest shared-variable conjunction and replays its evidence', () => {
  const input = task();
  const result = induceFiniteConjunctiveRule(input);
  assert.equal(result.status, 'SOLVED');
  assert.equal(result.reasoning.bodyLiterals, 2);
  assert.deepEqual(result.rule.body.map((literal) => literal.predicate),
    ['property:umber', 'relation:quartz']);
  const variables = result.rule.body.map((literal) => literal.arguments
    .filter((term) => term.kind === 'variable').map((term) => term.id));
  assert.deepEqual(variables, [['v1'], ['v0', 'v1']]);
  assert.equal(result.evidence.coverage.length, 2);
  assert.equal(result.evidence.rejections.length, 1);
  assert.equal(verifyFiniteConjunctiveRuleResult(input, result), true);
  assert.equal(evaluateFiniteConjunctiveRule(result.rule, input.examples).exact, true);
});

test('fact order, example order, and complete identifier renaming preserve the typed rule structure', () => {
  const original = induceFiniteConjunctiveRule(task());
  const renamed = task({
    targetPredicate: 'class:zephyr',
    examples: task().examples.map((item) => ({
      ...item,
      id: item.id.replace('example:', 'sample:'),
      root: item.root.replace('entity:', 'node:'),
      facts: [...item.facts].reverse().map((itemFact) => ({
        ...itemFact,
        id: itemFact.id.replace('fact:', 'evidence:'),
        predicate: itemFact.predicate
          .replace('relation:quartz', 'edge:opal')
          .replace('property:umber', 'trait:cedar')
          .replace('property:noise', 'trait:moss'),
        arguments: itemFact.arguments.map((term) => term.kind === 'entity'
          ? entity(term.value.replace('entity:', 'node:'))
          : value(String(term.value).replace('value:', 'token:'))),
      })),
    })).reverse(),
  });
  const transformed = induceFiniteConjunctiveRule(renamed);
  assert.equal(transformed.status, 'SOLVED');
  assert.equal(transformed.reasoning.bodyLiterals, original.reasoning.bodyLiterals);
  assert.deepEqual(transformed.rule.body.map((literal) => literal.predicate), ['edge:opal', 'trait:cedar']);
  assert.equal(verifyFiniteConjunctiveRuleResult(renamed, transformed), true);
});

test('a disconnected lookalike does not satisfy a shared-variable rule', () => {
  const result = induceFiniteConjunctiveRule(task());
  const contrast = example('example:contrast', 'negative', 'entity:root-z', [
    fact('fact:z-link', 'relation:quartz', entity('entity:root-z'), entity('entity:child-z1')),
    fact('fact:z-mark', 'property:umber', entity('entity:child-z2'), value('value:iris')),
  ]);
  const evaluation = evaluateFiniteConjunctiveRule(result.rule, [...task().examples.slice(0, 2), contrast]);
  assert.equal(evaluation.exact, true);
});

test('isomorphic positive and negative evidence returns unknown instead of choosing by identity or order', () => {
  const positive = task().examples[0];
  const impossible = task({ examples: [positive, example('example:n-copy', 'negative', 'entity:root-copy', [
    fact('fact:copy-link', 'relation:quartz', entity('entity:root-copy'), entity('entity:child-copy')),
    fact('fact:copy-mark', 'property:umber', entity('entity:child-copy'), value('value:iris')),
    fact('fact:copy-noise', 'property:noise', entity('entity:child-copy'), value('value:one')),
  ])] });
  const result = induceFiniteConjunctiveRule(impossible);
  assert.equal(result.status, 'UNKNOWN');
  assert.equal(verifyFiniteConjunctiveRuleResult(impossible, result), true);
});

test('changed proof evidence and source-specific dispatch vocabulary fail the guardian controls', async () => {
  const input = task();
  const result = induceFiniteConjunctiveRule(input);
  const tampered = { ...result, evidence: { ...result.evidence,
    coverage: result.evidence.coverage.map((item, index) => index === 0
      ? { ...item, factIds: ['fact:not-present'] } : item) } };
  assert.equal(verifyFiniteConjunctiveRuleResult(input, tampered), false);
  assert.equal(evaluateFiniteConjunctiveRule({ ...result.rule,
    body: [...result.rule.body, { predicate: 'relation:detached',
      arguments: [{ kind: 'variable', id: 'v9' }, { kind: 'value', value: 'token' }] }] }, input.examples).status,
  'UNPARSED');
  const source = await readFile(new URL('../src/reasoning/finite-conjunctive-rule-induction.mjs', import.meta.url), 'utf8');
  for (const forbidden of ['SLR-Bench', 'eastbound', 'westbound', 'has_car', 'car_color', 'curriculum']) {
    assert.equal(source.includes(forbidden), false);
  }
});
