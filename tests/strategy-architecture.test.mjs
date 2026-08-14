import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertStrategyRunResult,
  createStrategyRunResult,
  STRATEGY_DESCRIPTOR_PROTOCOL,
  strategyIdentity,
} from '../src/strategy/strategy-contract.mjs';
import {
  arbitrateStrategyVotes, runStrategyStage, runStrategyStageSync,
} from '../src/strategy/strategy-coordinator.mjs';
import { StrategyRegistry } from '../src/strategy/strategy-registry.mjs';
import { builtinStrategyDescriptors } from '../src/strategy/builtin-strategy-catalog.mjs';
import { strategyInventory } from '../src/strategy/strategy-inventory.mjs';
import { resolveWorkPolicy } from '../src/runtime/work-policy.mjs';

function descriptor(id, options = {}) {
  return Object.freeze({
    format: STRATEGY_DESCRIPTOR_PROTOCOL,
    strategyId: id,
    version: options.version ?? '1',
    stage: options.stage ?? 'runtime.language.interpret',
    inputTypes: options.inputTypes ?? ['type:surface-analysis'],
    outputTypes: options.outputTypes ?? ['type:language-candidate'],
    preconditions: options.preconditions ?? [],
    determinism: 'deterministic',
    epistemicRole: options.epistemicRole ?? 'interpretation-proposal',
    confidenceKind: options.confidenceKind ?? 'confidence:test-candidate',
    costModel: options.costModel ?? 'cost:bounded-linear-scan',
    budgetKeys: options.budgetKeys ?? ['budget:tokens'],
    witnessKind: options.witnessKind ?? 'witness:surface-edits',
    answerAuthority: options.answerAuthority ?? 'none',
    correlationGroup: options.correlationGroup ?? id.replace('strategy:', 'correlation:'),
    configurationSchema: `${id}:config`,
    failureClasses: ['failure:ineligible', 'failure:resource-limit', 'failure:invalid-output'],
    implementationState: 'coordinated',
  });
}

function executor(strategy, output, confidence, consumed = 1) {
  return (_input, context) => createStrategyRunResult(strategy, {
    status: 'completed', output, confidence,
    work: { reserved: context.budget.reserved, consumed },
  });
}

const VALIDATORS = Object.freeze({
  validateInput: (input) => input !== undefined,
  validateOutput: (output) => output !== undefined,
});

function register(registry, strategy, execute) {
  return registry.register(strategy, execute, VALIDATORS);
}

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => { resolve = resolvePromise; });
  return Object.freeze({ promise, resolve });
}

test('trusted strategy registration is typed, immutable, unique, and canonically ordered', () => {
  const later = descriptor('strategy:test:zeta');
  const earlier = descriptor('strategy:test:alpha');
  const registry = register(register(new StrategyRegistry(), later,
    executor(later, { text: 'vexa' }, 0.7)), earlier,
  executor(earlier, { text: 'vexa' }, 0.8)).seal();
  assert.deepEqual(registry.descriptors().map(strategyIdentity), [
    'strategy:test:alpha@1', 'strategy:test:zeta@1',
  ]);
  const mutable = new StrategyRegistry();
  assert.throws(() => mutable.register({ ...earlier, determinism: 'random' }, () => null, VALIDATORS),
    /deterministic execution/u);
  assert.throws(() => mutable.register({ ...earlier, strategyId: 'untrusted-file.mjs' }, () => null,
    VALIDATORS), /namespaced identifier/u);
  assert.throws(() => registry.register(earlier, () => null, VALIDATORS), /sealed/u);
  assert.throws(() => registry.entries('runtime.language.interpret', ['strategy:test:missing@1']),
    /Unknown selected strategy identities/u);
});

test('registration and execution snapshot nested descriptor and result data', async () => {
  const inputTypes = ['type:surface-analysis'];
  const strategy = descriptor('strategy:test:snapshot', { inputTypes });
  const output = { candidate: { text: 'vexa' } };
  const registry = new StrategyRegistry().register(strategy, (_input, context) => ({
    format: 'eslm-strategy-result-v1',
    strategyId: strategy.strategyId,
    strategyVersion: strategy.version,
    stage: strategy.stage,
    status: 'completed',
    confidence: 0.8,
    confidenceKind: strategy.confidenceKind,
    correlationGroup: strategy.correlationGroup,
    output,
    work: { reserved: context.budget.reserved, consumed: 1 },
    truthAuthorized: false,
  }), VALIDATORS).seal();
  inputTypes[0] = 'type:mutated';
  const receipt = await runStrategyStage({
    registry, stage: strategy.stage, input: {}, maximumWork: 1,
  });
  output.candidate.text = 'changed-after-execution';
  assert.deepEqual(registry.descriptors()[0].inputTypes, ['type:surface-analysis']);
  assert.equal(receipt.results[0].output.candidate.text, 'vexa');
  assert.equal(Object.isFrozen(registry.descriptors()[0].inputTypes), true);
  assert.equal(Object.isFrozen(receipt.results[0].output.candidate), true);
});

test('strategy execution resolves sealed registered identities and rejects forged or pre-seal entries', async () => {
  const strategy = descriptor('strategy:nonce:sealed-execution');
  let executed = false;
  const registry = register(new StrategyRegistry(), strategy, (...args) => {
    executed = true;
    return executor(strategy, { text: 'vexa' }, 0.7)(...args);
  });
  await assert.rejects(registry.execute(strategyIdentity(strategy), {}, {
    budget: { reserved: 1 },
  }), /sealed registry/u);
  assert.equal(executed, false);
  registry.seal();
  await assert.rejects(registry.execute({
    descriptor: strategy,
    execute: executor(strategy, { text: 'forged' }, 1),
    validateInput: () => true,
    validateOutput: () => true,
  }, {}, { budget: { reserved: 1 } }), /exact registered identity/u);
  await assert.rejects(registry.execute('strategy:nonce:missing@1', {}, {
    budget: { reserved: 1 },
  }), /Unknown registered strategy identity/u);
  assert.equal(executed, false);
});

test('stage execution obeys an explicit allowlist, shares finite work, and records omitted work', async () => {
  const alpha = descriptor('strategy:test:alpha');
  const beta = descriptor('strategy:test:beta');
  const gamma = descriptor('strategy:test:gamma');
  const registry = register(register(register(new StrategyRegistry(), gamma,
    executor(gamma, { text: 'vexa' }, 0.6)), beta,
  executor(beta, { text: 'other' }, 0.7)), alpha,
  executor(alpha, { text: 'vexa' }, 0.8)).seal();
  const receipt = await runStrategyStage({
    registry,
    stage: 'runtime.language.interpret',
    input: { text: 'nonce' },
    maximumWork: 1,
    policy: { effective: { strategies: {
      'runtime.language.interpret': ['strategy:test:gamma@1', 'strategy:test:alpha@1'],
    } } },
  });
  assert.deepEqual(receipt.selectedStrategies, ['strategy:test:alpha@1', 'strategy:test:gamma@1']);
  assert.equal(receipt.results[0].status, 'completed');
  assert.equal(receipt.results[1].status, 'resource-limit');
  assert.equal(receipt.complete, false);
  assert.deepEqual(receipt.arbitration.selected.output, { text: 'vexa' });
});

test('asynchronous coordination launches every funded strategy before awaiting and serializes canonically',
  async () => {
    const helix = descriptor('strategy:nonce:concurrent-helix', {
      correlationGroup: 'correlation:nonce:helix-evidence',
    });
    const quartz = descriptor('strategy:nonce:concurrent-quartz', {
      correlationGroup: 'correlation:nonce:quartz-evidence',
    });
    const identities = [strategyIdentity(helix), strategyIdentity(quartz)];
    const output = Object.freeze({ predicate: 'zorps', subject: 'nexa', object: 'vori' });

    async function controlledRun(completionOrder) {
      const gates = new Map(identities.map((identity) => [identity, deferred()]));
      const budgets = [];
      const started = [];
      const completed = [];
      const execute = (strategy, confidence) => async (_input, context) => {
        const identity = strategyIdentity(strategy);
        started.push(identity);
        budgets.push(context.budget);
        assert.equal(Object.isFrozen(context.budget), true);
        assert.throws(() => { context.budget.reserved = 9; }, TypeError);
        await gates.get(identity).promise;
        completed.push(identity);
        return createStrategyRunResult(strategy, {
          status: 'completed', output, confidence,
          work: { reserved: context.budget.reserved, consumed: 1 },
        });
      };
      const registry = register(register(new StrategyRegistry(), quartz, execute(quartz, 0.63)),
        helix, execute(helix, 0.77)).seal();
      const pendingReceipt = runStrategyStage({
        registry, stage: helix.stage, input: { token: 'nonce-input-47' }, maximumWork: 2,
      });
      const startedBeforeRelease = [...started];
      for (const identity of completionOrder) gates.get(identity).resolve();
      const receipt = await pendingReceipt;
      return { budgets, completed, receipt, startedBeforeRelease };
    }

    const reverse = await controlledRun([identities[1], identities[0]]);
    const forward = await controlledRun(identities);
    assert.deepEqual(reverse.startedBeforeRelease, identities);
    assert.deepEqual(forward.startedBeforeRelease, identities);
    assert.notStrictEqual(reverse.budgets[0], reverse.budgets[1]);
    assert.deepEqual(reverse.budgets, [{ reserved: 1 }, { reserved: 1 }]);
    assert.deepEqual(reverse.completed, [identities[1], identities[0]]);
    assert.deepEqual(forward.completed, identities);
    assert.deepEqual(reverse.receipt, forward.receipt);
    assert.deepEqual(reverse.receipt.results.map(
      (result) => `${result.strategyId}@${result.strategyVersion}`,
    ), identities);
    assert.deepEqual(reverse.receipt.results.map((result) => result.work.reserved), [1, 1]);
    assert.equal(reverse.receipt.arbitration.selected.support, 1.4);
    assert.deepEqual(reverse.receipt.arbitration.selected.correlationGroups, [
      'correlation:nonce:helix-evidence', 'correlation:nonce:quartz-evidence',
    ]);
    assert.doesNotMatch(JSON.stringify(reverse.receipt),
      /elapsed|duration|startedAt|completedAt|timestamp/iu);
  });

test('asynchronous coordination contains a rejected branch and never launches zero-allocation work',
  async () => {
    const broken = descriptor('strategy:nonce:async-a-broken');
    const survivor = descriptor('strategy:nonce:async-b-survivor');
    const unallocated = descriptor('strategy:nonce:async-c-unallocated');
    const started = [];
    const registry = register(register(register(new StrategyRegistry(), unallocated, (...args) => {
      started.push(strategyIdentity(unallocated));
      return executor(unallocated, { predicate: 'must-not-run' }, 1)(...args);
    }), survivor, async (...args) => {
      started.push(strategyIdentity(survivor));
      await Promise.resolve();
      return executor(survivor, { predicate: 'glims', nonce: 'survivor-83' }, 0.7)(...args);
    }), broken, async () => {
      started.push(strategyIdentity(broken));
      await Promise.resolve();
      throw new Error('nonce branch failure');
    }).seal();
    const receipt = await runStrategyStage({
      registry, stage: broken.stage, input: { token: 'renamed-19' }, maximumWork: 2,
    });
    assert.deepEqual(started.toSorted(), [
      strategyIdentity(broken), strategyIdentity(survivor),
    ]);
    assert.deepEqual(receipt.results.map((result) => result.status), [
      'failed', 'completed', 'resource-limit',
    ]);
    assert.deepEqual(receipt.arbitration.selected.output,
      { predicate: 'glims', nonce: 'survivor-83' });
    assert.equal(receipt.complete, false);
  });

test('meta-rational voting aggregates independent support but never promotes relevance into truth', async () => {
  const alpha = descriptor('strategy:test:alpha', { stage: 'runtime.evidence.assess',
    epistemicRole: 'relevance-estimate', outputTypes: ['type:ranked-evidence'] });
  const beta = descriptor('strategy:test:beta', { stage: 'runtime.evidence.assess',
    epistemicRole: 'relevance-estimate', outputTypes: ['type:ranked-evidence'] });
  const distractor = descriptor('strategy:test:distractor', { stage: 'runtime.evidence.assess',
    epistemicRole: 'relevance-estimate', outputTypes: ['type:ranked-evidence'] });
  const results = [
    createStrategyRunResult(alpha, { status: 'completed', output: { record: 'record:vexa' },
      confidence: 0.61, work: { reserved: 1, consumed: 1 } }),
    createStrategyRunResult(beta, { status: 'completed', output: { record: 'record:vexa' },
      confidence: 0.59, work: { reserved: 1, consumed: 1 } }),
    createStrategyRunResult(distractor, { status: 'completed', output: { record: 'record:common' },
      confidence: 0.95, work: { reserved: 1, consumed: 1 } }),
  ];
  const arbitration = arbitrateStrategyVotes(results);
  assert.deepEqual(arbitration.selected.output, { record: 'record:vexa' });
  assert.equal(arbitration.selected.support, 1.2);
  assert.equal(arbitration.truthAuthorized, false);
});

test('only a registered verifier may authorize answer truth', () => {
  const ranker = descriptor('strategy:test:ranker', { stage: 'runtime.evidence.assess',
    epistemicRole: 'relevance-estimate', outputTypes: ['type:ranked-evidence'] });
  assert.throws(() => createStrategyRunResult(ranker, {
    status: 'completed', output: { answer: true }, confidence: 1, truthAuthorized: true,
    work: { reserved: 1, consumed: 1 },
  }), /cannot authorize answer truth/u);
  assert.throws(() => descriptor('strategy:test:bad-verifier', {
    answerAuthority: 'verified-only',
  }) && new StrategyRegistry().register(descriptor('strategy:test:bad-verifier', {
    answerAuthority: 'verified-only',
  }), () => null, VALIDATORS), /Only an answer-verifier/u);

  const verifier = descriptor('strategy:test:proof-verifier', {
    stage: 'runtime.result.verify', epistemicRole: 'answer-verifier',
    confidenceKind: 'confidence:verification-decision',
    outputTypes: ['type:verified-answer'], witnessKind: 'witness:verified-proof',
    answerAuthority: 'verified-only',
  });
  const verified = createStrategyRunResult(verifier, {
    status: 'completed', output: { answer: true }, confidence: 1, truthAuthorized: true,
    work: { reserved: 2, consumed: 2 },
  });
  assert.equal(verified.truthAuthorized, true);
  assert.throws(() => createStrategyRunResult(verifier, {
    status: 'completed', output: { circular: globalThis }, confidence: 1, truthAuthorized: true,
    work: { reserved: 2, consumed: 2 },
  }), /depth limit|cycle|non-JSON|non-plain object|too many fields/u);
});

test('registration and voting pass renamed, reordered, and meaning-changing controls', async () => {
  const build = (order, shared) => {
    const strategies = order.map((name) => descriptor(`strategy:nonce:${name}`));
    const registry = new StrategyRegistry();
    for (const strategy of strategies) {
      const output = strategy.strategyId.endsWith('contrast') ? { predicate: 'opposes' } : shared;
      register(registry, strategy, executor(strategy, output, 0.7));
    }
    return registry.seal();
  };
  const left = await runStrategyStage({
    registry: build(['zeta', 'alpha', 'contrast'], { predicate: 'glims' }),
    stage: 'runtime.language.interpret', input: {}, maximumWork: 3,
  });
  const right = await runStrategyStage({
    registry: build(['contrast', 'alpha', 'zeta'], { predicate: 'zorps' }),
    stage: 'runtime.language.interpret', input: {}, maximumWork: 3,
  });
  assert.deepEqual(left.selectedStrategies, [
    'strategy:nonce:alpha@1', 'strategy:nonce:contrast@1', 'strategy:nonce:zeta@1',
  ]);
  assert.deepEqual(right.selectedStrategies, left.selectedStrategies);
  assert.equal(left.arbitration.selected.output.predicate, 'glims');
  assert.equal(right.arbitration.selected.output.predicate, 'zorps');
  assert.notDeepEqual(left.arbitration.candidates[1].output, left.arbitration.selected.output);
});

test('the built-in inventory exposes language, request, focus, retrieval, reasoning, and construction stages', () => {
  const expectedStages = [
    'compiler.knowledge.extract', 'runtime.context.construct', 'runtime.evidence.assess',
    'runtime.failure.ground',
    'runtime.knowledge.focus', 'runtime.knowledge.retrieve', 'runtime.language.interpret',
    'runtime.method.plan', 'runtime.reason.execute', 'runtime.request.plan',
    'runtime.result.construct', 'runtime.result.verify',
  ];
  const descriptors = builtinStrategyDescriptors();
  assert.ok(descriptors.length >= 50);
  assert.deepEqual([...new Set(descriptors.map((item) => item.stage))].toSorted(), expectedStages.toSorted());
  assert.ok(descriptors.some((item) => item.strategyId === 'strategy:retrieval:active-kb-frequency'));
  assert.ok(descriptors.some((item) => item.strategyId === 'strategy:core:safe-horn-deduction'));
  assert.ok(descriptors.some((item) => item.strategyId === 'strategy:knowledge:manual-document'));
  assert.ok(descriptors.some((item) => item.answerAuthority === 'verified-only'));
  assert.equal(descriptors.find((item) => item.strategyId === 'strategy:knowledge:manual-document')
    .implementationState, 'planned');
  assert.equal(descriptors.find((item) => item.strategyId === 'strategy:core:indexed-lookup')
    .implementationState, 'instrumented-local');
  assert.equal(descriptors.find((item) => item.strategyId === 'strategy:core:finite-entailment')
    .implementationState, 'planned');
  assert.equal(descriptors.find((item) => item.strategyId === 'strategy:core:preferred-entailment')
    .implementationState, 'planned');
  assert.equal(descriptors.find((item) =>
    item.strategyId === 'strategy:verification:declared-witness-contract')
    .implementationState, 'instrumented-local');
});

test('inventory views never masquerade as execution selection and planned entries stay disabled', () => {
  const inventory = strategyInventory(resolveWorkPolicy({
    strategies: { preset: 'language' },
  }));
  assert.equal(inventory.inventoryView, 'language');
  assert.ok(inventory.visible < inventory.catalogued);
  assert.equal(inventory.executionEnabled, 67);
  assert.ok(inventory.executionEnabled
    < inventory.coordinated + inventory.instrumentedLocal);
  assert.equal(inventory.strategies.some((row) => row.implementationState === 'planned'
    && row.executionEnabled), false);
  assert.ok(inventory.strategies.some((row) => row.stage === 'runtime.reason.execute'
    && row.executionEnabled && !row.visible));
  assert.ok(inventory.strategies.some((row) => row.stage === 'runtime.method.plan'
    && !row.policySelectable && !row.executionEnabled
    && row.state === 'catalogued-not-policy-gated'));
});

test('synchronous coordination preallocates work and deduplicates correlated votes', () => {
  const first = descriptor('strategy:nonce:first', { correlationGroup: 'correlation:nonce:shared' });
  const copy = descriptor('strategy:nonce:copy', { correlationGroup: 'correlation:nonce:shared' });
  const independent = descriptor('strategy:nonce:independent', {
    correlationGroup: 'correlation:nonce:independent',
  });
  const registry = register(register(register(new StrategyRegistry(), copy,
    executor(copy, { predicate: 'glims' }, 0.7)), independent,
  executor(independent, { predicate: 'glims' }, 0.6)), first,
  executor(first, { predicate: 'glims' }, 0.8)).seal();
  const receipt = runStrategyStageSync({
    registry, stage: 'runtime.language.interpret', input: {}, maximumWork: 5,
  });
  assert.equal(receipt.workUnit, 'coordinator-invocation-slot');
  assert.deepEqual(receipt.results.map((result) => result.work.reserved), [1, 1, 1]);
  assert.equal(receipt.remainingWork, 2);
  assert.equal(receipt.arbitration.selected.support, 1.4);
  assert.deepEqual(receipt.arbitration.selected.correlationGroups, [
    'correlation:nonce:independent', 'correlation:nonce:shared',
  ]);
});

test('coordinator rejects unknown stages and contains oversized failures in sync and async runs', async () => {
  const broken = descriptor('strategy:nonce:broken');
  const registry = new StrategyRegistry().register(broken, () => {
    throw new Error(`bad\u0000${'x'.repeat(5_000)}`);
  }, VALIDATORS).seal();
  assert.throws(() => runStrategyStageSync({
    registry, stage: 'runtime.attacker.stage', input: {}, maximumWork: 1,
  }), /Unknown strategy stage/u);
  const sync = runStrategyStageSync({
    registry, stage: broken.stage, input: {}, maximumWork: 1,
  });
  const asynchronous = await runStrategyStage({
    registry, stage: broken.stage, input: {}, maximumWork: 1,
  });
  for (const receipt of [sync, asynchronous]) {
    assert.equal(receipt.results[0].status, 'failed');
    assert.ok(receipt.results[0].reason.length <= 1_024);
    assert.doesNotMatch(receipt.results[0].reason, /\u0000/u);
    assert.equal(receipt.complete, false);
  }
});

test('coordinator contains hostile thrown code accessors in synchronous and asynchronous execution', async () => {
  const hostile = () => Object.defineProperty({}, 'code', {
    get() { throw new Error('hostile code getter'); },
  });
  const syncStrategy = descriptor('strategy:nonce:hostile-sync');
  const syncRegistry = new StrategyRegistry().register(syncStrategy, () => { throw hostile(); },
    VALIDATORS).seal();
  const sync = runStrategyStageSync({
    registry: syncRegistry, stage: syncStrategy.stage, input: {}, maximumWork: 1,
  });
  assert.equal(sync.results[0].status, 'failed');
  assert.match(sync.results[0].reason, /Trusted strategy failed/u);

  const asyncStrategy = descriptor('strategy:nonce:hostile-async');
  const asyncRegistry = new StrategyRegistry().register(asyncStrategy, async () => { throw hostile(); },
    VALIDATORS).seal();
  const asynchronous = await runStrategyStage({
    registry: asyncRegistry, stage: asyncStrategy.stage, input: {}, maximumWork: 1,
  });
  assert.equal(asynchronous.results[0].status, 'failed');
  assert.match(asynchronous.results[0].reason, /Trusted strategy failed/u);
});

test('coordinator snapshots input and metadata before the first executor observes them', () => {
  const first = descriptor('strategy:nonce:input-first');
  const second = descriptor('strategy:nonce:input-second');
  const callerInput = { nested: { value: 1 } };
  const callerContext = { serviceMetadata: { revision: 1 } };
  const mutate = (strategy) => (input, context) => {
    assert.throws(() => { input.nested.value = 9; }, TypeError);
    assert.throws(() => { context.serviceMetadata.revision = 9; }, TypeError);
    return createStrategyRunResult(strategy, {
      status: 'completed', output: {
        input: input.nested.value, metadata: context.serviceMetadata.revision,
      }, confidence: 1, work: { reserved: context.budget.reserved, consumed: 1 },
    });
  };
  const registry = register(register(new StrategyRegistry(), first, mutate(first)), second,
    mutate(second)).seal();
  const receipt = runStrategyStageSync({
    registry, stage: first.stage, input: callerInput, context: callerContext, maximumWork: 2,
  });
  assert.deepEqual(receipt.results.map((result) => result.output), [
    { input: 1, metadata: 1 }, { input: 1, metadata: 1 },
  ]);
  assert.deepEqual(callerInput, { nested: { value: 1 } });
  assert.deepEqual(callerContext, { serviceMetadata: { revision: 1 } });
});

test('typed output validation quarantines a completed but malformed result', () => {
  const strategy = descriptor('strategy:nonce:typed');
  const registry = new StrategyRegistry().register(strategy,
    executor(strategy, { wrong: true }, 1), {
      validateInput: () => true,
      validateOutput: (output) => typeof output?.text === 'string',
    }).seal();
  const receipt = runStrategyStageSync({
    registry, stage: strategy.stage, input: {}, maximumWork: 1,
  });
  assert.equal(receipt.results[0].status, 'invalid-output');
  assert.equal(receipt.arbitration.selected, null);
  assert.equal(receipt.complete, false);
});

test('strategy results are closed machine contracts without hidden executor metadata', () => {
  const strategy = descriptor('strategy:nonce:closed-result');
  const valid = createStrategyRunResult(strategy, {
    status: 'completed', output: { text: 'narl' }, confidence: 0.7,
    work: { reserved: 3, consumed: 1 },
  });
  assert.throws(() => assertStrategyRunResult({
    ...valid, hiddenExecutorPath: 'file:///tmp/untrusted.mjs',
  }, strategy), /unknown fields/u);
  assert.throws(() => assertStrategyRunResult({
    ...valid, work: { ...valid.work, hiddenCounter: 1 },
  }, strategy), /work must contain only/u);
});

test('an exact tie never inherits verifier truth authority from identity order', () => {
  const verifierA = descriptor('strategy:nonce:verifier-a', {
    stage: 'runtime.result.verify', epistemicRole: 'answer-verifier',
    confidenceKind: 'confidence:verification-decision', answerAuthority: 'verified-only',
  });
  const verifierB = descriptor('strategy:nonce:verifier-b', {
    stage: 'runtime.result.verify', epistemicRole: 'answer-verifier',
    confidenceKind: 'confidence:verification-decision', answerAuthority: 'verified-only',
  });
  const arbitration = arbitrateStrategyVotes([
    createStrategyRunResult(verifierA, {
      status: 'completed', output: { answer: true }, confidence: 1, truthAuthorized: true,
      work: { reserved: 1, consumed: 1 },
    }),
    createStrategyRunResult(verifierB, {
      status: 'completed', output: { answer: false }, confidence: 1, truthAuthorized: true,
      work: { reserved: 1, consumed: 1 },
    }),
  ]);
  assert.equal(arbitration.ambiguous, true);
  assert.equal(arbitration.truthAuthorized, false);
});
