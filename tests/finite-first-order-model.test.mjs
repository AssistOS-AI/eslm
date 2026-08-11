import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCompactFolArgument } from '../src/language/compact-fol.mjs';
import {
  constructFiniteFirstOrderCountermodel,
  verifyFiniteFirstOrderCountermodel,
} from '../src/reasoning/finite-first-order-model.mjs';
import { EslmEngine } from '../src/runtime/engine.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';

test('compact FOL parser and finite model finder construct an independently verified countermodel', () => {
  const argument = parseCompactFolArgument('∀x(Mx→Nx), Ma |= Na∧Qa');
  const result = constructFiniteFirstOrderCountermodel(argument, { domainSize: 3 });
  assert.equal(result.status, 'SOLVED');
  assert.equal(verifyFiniteFirstOrderCountermodel(argument, result.model), true);
  assert.equal(result.model.predicates.M.some((tuple) => tuple[0] === result.model.constants.a), true);
  assert.equal(result.model.predicates.Q.some((tuple) => tuple[0] === result.model.constants.a), false);
});

test('full predicate and constant renaming preserves countermodel existence', () => {
  const left = constructFiniteFirstOrderCountermodel(parseCompactFolArgument('∀x(Ax→Bx), Ac |= Bc∧Cc'));
  const right = constructFiniteFirstOrderCountermodel(parseCompactFolArgument('∀x(Px→Rx), Pd |= Rd∧Sd'));
  assert.equal(left.status, 'SOLVED');
  assert.equal(right.status, 'SOLVED');
});

test('a valid argument has no countermodel in the declared domain', () => {
  const result = constructFiniteFirstOrderCountermodel(parseCompactFolArgument('∀x(Mx→Nx), Ma |= Na'));
  assert.equal(result.status, 'NO_COUNTERMODEL_IN_DECLARED_DOMAIN');
});

test('binary relation direction remains semantic under a contrast', () => {
  const argument = parseCompactFolArgument('Rab |= Rba');
  const result = constructFiniteFirstOrderCountermodel(argument);
  assert.equal(result.status, 'SOLVED');
  assert.equal(verifyFiniteFirstOrderCountermodel(argument, result.model), true);
});

test('runtime exposes the generic method and the independently verifiable model', async () => {
  const argument = parseCompactFolArgument('∀x(Ax→Bx), Ac |= Bc∧Cc');
  const result = new EslmEngine(await createCoreModel()).executeTask({
    taskId: 'nonce-finite-model', operation: 'construct-finite-countermodel', argument, domainSize: 3,
  });
  assert.equal(result.status, 'SOLVED');
  assert.equal(result.plan.methodId, 'method:core:finite-first-order-countermodel');
  assert.equal(verifyFiniteFirstOrderCountermodel(argument, result.countermodel), true);
});
