import test from 'node:test';
import assert from 'node:assert/strict';
import { createCoreModel } from '../src/runtime/core-model.mjs';
import { EslmEngine } from '../src/runtime/engine.mjs';
import {
  assertRuntimeMemoryPlanContract, assertRuntimeResultContract, assertRuntimeTextResultContract,
  directCoreMemorySnapshot, normalizeRuntimeStatus,
  PUBLIC_RUNTIME_STATUSES,
} from '../src/runtime/result-contract.mjs';

const term = (name) => ({ term: name, canonical: name, negationDepth: 0 });

test('typed-task execution normalizes internal method statuses at the public protocol boundary', async () => {
  const result = new EslmEngine(await createCoreModel()).executeTask({
    taskId: 'task:renamed:categorical',
    operation: 'transform-categorical-proposition',
    transformation: 'obversion',
    premise: { form: 'A', subject: term('narl'), predicate: term('vex') },
  });
  assert.equal(result.status, 'SOLVED');
  assert.equal(result.answer, 'No narl are non-vex.');
  assert.ok(PUBLIC_RUNTIME_STATUSES.includes(result.status));
  assert.deepEqual(result.model.memory, directCoreMemorySnapshot());
  assert.equal(assertRuntimeResultContract(result), result);
});

test('text results require route-independent session and episode state', () => {
  const base = {
    protocol: 'eslm-runtime-result-v1', status: 'UNKNOWN', answer: 'unknown',
    languageRoute: 'direct-symbolic', usedKbVersions: [], selectedKbVersions: [],
    consultedKbVersions: [], unresolvedSubgoals: [], model: {
      id: 'model:test', memory: directCoreMemorySnapshot(),
    },
    context: { session: { entities: [], facts: [], rules: [], history: [] } },
    episode: { original: 'What is a narl?', segments: ['What is a narl?'], unsupportedStatements: [] },
  };
  assert.equal(assertRuntimeTextResultContract(base), base);
  assert.throws(() => assertRuntimeTextResultContract({ ...base, episode: undefined }),
    /episode must expose/u);
});

test('the runtime result validator rejects internal statuses and missing common accounting fields', () => {
  const base = {
    protocol: 'eslm-runtime-result-v1',
    status: 'SOLVED',
    languageRoute: 'direct-symbolic',
    usedKbVersions: [],
    selectedKbVersions: [],
    consultedKbVersions: [],
    unresolvedSubgoals: [],
    model: { id: 'model:test' },
  };
  assert.throws(() => assertRuntimeResultContract({ ...base, status: 'ANSWERED' }),
    /unsupported public status/u);
  assert.throws(() => assertRuntimeResultContract({ ...base, consultedKbVersions: undefined }),
    /consultedKbVersions must be an array/u);
});

test('memory-plan validation rejects ambiguous or structurally incomplete snapshots', () => {
  assert.equal(assertRuntimeMemoryPlanContract(directCoreMemorySnapshot()).effectivePolicy, 'eager');
  assert.throws(() => assertRuntimeMemoryPlanContract({
    ...directCoreMemorySnapshot(), format: 'untyped-memory',
  }), /format must be eslm-memory-plan-v1/u);
  assert.throws(() => assertRuntimeMemoryPlanContract({
    ...directCoreMemorySnapshot(), requestedPolicy: 'adaptive',
  }), /requestedPolicy must be auto, eager, or lazy/u);
  assert.throws(() => assertRuntimeMemoryPlanContract({
    ...directCoreMemorySnapshot(), softTarget: true,
  }), /must expose targetMiB/u);
  assert.throws(() => assertRuntimeMemoryPlanContract({
    ...directCoreMemorySnapshot(), providers: [{ id: 'kb:a' }],
  }), /providers\[0\]\.mode/u);
  assert.throws(() => assertRuntimeMemoryPlanContract({
    ...directCoreMemorySnapshot(), providers: [
      { id: 'kb:a', mode: 'lazy' }, { id: 'kb:a', mode: 'eager' },
    ],
  }), /provider id kb:a must be unique/u);
});

test('direct core failures and unsupported typed operations retain truthful memory metadata', async () => {
  const engine = new EslmEngine(await createCoreModel());
  const textFailure = engine.ask({ text: 'Is a narl a vex?' });
  assert.equal(textFailure.status, 'UNPARSED');
  assert.deepEqual(textFailure.model.memory, directCoreMemorySnapshot());

  const typedFailure = engine.executeTask({ operation: 'unregistered-nonce-operation' });
  assert.equal(typedFailure.status, 'NO_APPLICABLE_METHOD');
  assert.deepEqual(typedFailure.model.memory, directCoreMemorySnapshot());
});

test('non-strict internal success remains defeasible at the public boundary', () => {
  assert.equal(normalizeRuntimeStatus('INDUCTIVE'), 'DEFEASIBLE');
  assert.equal(normalizeRuntimeStatus('ABDUCTIVE'), 'DEFEASIBLE');
  assert.notEqual(normalizeRuntimeStatus('INDUCTIVE'), 'SOLVED');
});
