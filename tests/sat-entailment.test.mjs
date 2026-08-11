import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { atom, binary, decideFiniteEntailment, negate } from '../src/reasoning/finite-entailment.mjs';
import { decideBooleanEntailment, verifyBooleanEntailmentResult } from '../src/reasoning/sat-entailment.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';
import { EslmEngine } from '../src/runtime/engine.mjs';

const implication = (left, right) => binary('implies', left, right);

function chain(prefix, length) {
  const atoms = Array.from({ length }, (_, index) => atom(`${prefix}:${index}`));
  return {
    atoms,
    premises: [atoms[0], ...atoms.slice(0, -1).map((value, index) => implication(value, atoms[index + 1]))],
    query: atoms.at(-1),
  };
}

test('query-directed SAT proves a long chain while preserving independent context components', () => {
  const relevant = chain('nonce-relevant', 96);
  const unrelated = Array.from({ length: 300 }, (_, index) => atom(`nonce-unrelated:${index}`));
  const input = { premises: [...relevant.premises, ...unrelated], query: relevant.query };
  const result = decideBooleanEntailment(input);
  assert.equal(result.status, 'SOLVED');
  assert.equal(result.entailed, true);
  assert.equal(result.relevance.omittedPremises, unrelated.length);
  assert.equal(result.relevance.relevantPremises, relevant.premises.length);
  assert.equal(verifyBooleanEntailmentResult(input, result), true);
  assert.ok(result.resources.fullVariables > 300);
  assert.ok(result.resources.queryVariables < result.resources.fullVariables);
});

test('full vocabulary renaming, premise ordering, and commutative operand ordering preserve entailment', () => {
  const first = chain('first-symbol', 48);
  const renamed = chain('second-nonce', 48);
  const extraLeft = atom('first-extra:left');
  const extraRight = atom('first-extra:right');
  const input = {
    premises: [...first.premises, binary('or', extraLeft, extraRight)],
    query: first.query,
  };
  const transformed = {
    premises: [
      binary('or', atom('second-extra:right'), atom('second-extra:left')),
      ...renamed.premises.toReversed(),
    ],
    query: renamed.query,
  };
  const left = decideBooleanEntailment(input);
  const right = decideBooleanEntailment(transformed);
  assert.equal(left.entailed, true);
  assert.equal(right.entailed, true);
  assert.equal(verifyBooleanEntailmentResult(input, left), true);
  assert.equal(verifyBooleanEntailmentResult(transformed, right), true);
});

test('meaning-changing controls return a validated countermodel', () => {
  const premise = implication(atom('control:antecedent'), atom('control:consequent'));
  const input = { premises: [premise, atom('control:consequent')], query: atom('control:antecedent') };
  const result = decideBooleanEntailment(input);
  assert.equal(result.status, 'SOLVED');
  assert.equal(result.entailed, false);
  assert.equal(result.witness.kind, 'finite-countermodel');
  assert.equal(verifyBooleanEntailmentResult(input, result), true);
});

test('inconsistent premises and resource exhaustion remain distinct, witnessed statuses', () => {
  const proposition = atom('status:proposition');
  const inconsistentInput = { premises: [proposition, negate(proposition)], query: atom('status:query') };
  const inconsistent = decideBooleanEntailment(inconsistentInput);
  assert.equal(inconsistent.status, 'INCONSISTENT_CONTEXT');
  assert.equal(verifyBooleanEntailmentResult(inconsistentInput, inconsistent), true);
  const explosiveInput = { ...inconsistentInput, inconsistencyPolicy: 'classical-explosion' };
  const explosive = decideBooleanEntailment(explosiveInput);
  assert.equal(explosive.status, 'SOLVED');
  assert.equal(explosive.entailed, true);
  assert.equal(explosive.witness.kind, 'classical-explosion-entailment');
  assert.equal(verifyBooleanEntailmentResult(explosiveInput, explosive), true);

  const boundedInput = {
    premises: [atom('budget:one'), atom('budget:two')],
    query: atom('budget:three'),
    budgets: { maxSemanticAtoms: 2 },
  };
  const bounded = decideBooleanEntailment(boundedInput);
  assert.equal(bounded.status, 'RESOURCE_LIMIT');
  assert.match(bounded.diagnostic, /semantic atom count 3 exceeds 2/u);
  assert.equal(verifyBooleanEntailmentResult(boundedInput, bounded), true);
});

test('independent certificate verification rejects a tampered proof tree', () => {
  const data = chain('tamper', 12);
  const result = decideBooleanEntailment(data);
  assert.equal(verifyBooleanEntailmentResult(data, result), true);
  const tampered = structuredClone(result);
  const descend = (certificate) => {
    if (certificate.kind === 'conflict') {
      certificate.clause += 1;
      return;
    }
    descend(certificate.negative);
  };
  descend(tampered.witness.certificate);
  assert.equal(verifyBooleanEntailmentResult(data, tampered), false);
});

test('deterministic randomized small formulas agree with exhaustive finite semantics', () => {
  let state = 0x5eed1234;
  const random = () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 2 ** 32;
  };
  const values = ['random:a', 'random:b', 'random:c', 'random:d'].map(atom);
  const formula = (depth) => {
    if (depth === 0 || random() < 0.28) return values[Math.floor(random() * values.length)];
    if (random() < 0.22) return negate(formula(depth - 1));
    return binary(['and', 'or', 'implies'][Math.floor(random() * 3)], formula(depth - 1), formula(depth - 1));
  };
  for (let index = 0; index < 200; index += 1) {
    const input = {
      premises: Array.from({ length: Math.floor(random() * 5) }, () => formula(3)),
      query: formula(3),
    };
    const exhaustive = decideFiniteEntailment({ ...input, maxAtoms: 20 });
    const scalable = decideBooleanEntailment(input);
    assert.equal(scalable.status, exhaustive.status, `status differs at generated case ${index}`);
    assert.equal(scalable.entailed, exhaustive.entailed, `answer differs at generated case ${index}`);
    assert.equal(verifyBooleanEntailmentResult(input, scalable), true, `invalid witness at case ${index}`);
  }
});

test('runtime task execution exposes the generic method and boolean output contract', async () => {
  const engine = new EslmEngine(await createCoreModel());
  const data = chain('engine-nonce', 36);
  const result = engine.executeTask({
    taskId: 'generic-boolean-task', operation: 'decide-boolean-entailment', ...data,
  });
  assert.equal(result.status, 'SOLVED');
  assert.deepEqual(result.values, [true]);
  assert.equal(result.plan.methodId, 'method:core:scalable-boolean-entailment');
  assert.equal(result.taskFrame.outputContract.kind, 'entailed-boolean');
  assert.equal(result.languageRoute, 'direct-symbolic-task-adapter');
});

test('generic solver source has no benchmark, row, identifier, or expected-answer dispatch', async () => {
  const source = await readFile(new URL('../src/reasoning/sat-entailment.mjs', import.meta.url), 'utf8');
  for (const forbidden of [
    'PrOntoQA', 'ProofWriter', 'LogicBench', 'benchmarkId', 'datasetId', 'recordId',
    'sourceRow', 'expectedAnswer', 'expectedEntailed',
  ]) {
    assert.equal(source.includes(forbidden), false, `generic source contains forbidden dispatch token ${forbidden}`);
  }
});
