import test from 'node:test';
import assert from 'node:assert/strict';
import { compileNarrativeSentence, compileNarrativeSequence } from '../src/reasoning/narrative-state.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';
import { EslmEngine } from '../src/runtime/engine.mjs';
import { EslmRuntime } from '../src/runtime/runtime.mjs';

function task(candidates = ['Tovin returned to the arch.', 'Mera waited beside the arch.']) {
  return {
    taskId: 'task:nonce:continuation', operation: 'select-narrative-continuation',
    narrative: compileNarrativeSequence(['Tovin waited beside the arch.']),
    candidates: candidates.map((surface, index) => ({
      candidateId: `candidate:${index + 1}`,
      event: compileNarrativeSentence(surface, 1),
    })),
    policy: { minimumMargin: 1 },
  };
}

function evidenceProvider(id, semanticEvidence) {
  return {
    manifest: { id, kbId: id, kbVersion: '1' },
    beginQuery() {}, endQuery() {},
    memorySnapshot() { return { mode: 'fixture', id }; },
    async semanticEvidence() {
      if (semanticEvidence instanceof Error) throw semanticEvidence;
      return semanticEvidence;
    },
  };
}

function support(id, scores) {
  return {
    providerId: id, providerVersion: '1', semanticType: 'provider-neutral-semantic-compatibility-v1',
    candidates: scores.map((score, index) => ({
      candidateId: `candidate:${index + 1}`,
      support: [{ relation: 'nonce', semanticFamily: 'event', score,
        sourceRef: `${id}:${index}`, matchType: 'declared-semantic-support' }],
    })),
  };
}

test('typed knowledge execution separates selected, consulted, and answer-contributing KBs', async () => {
  const provider = evidenceProvider('kb:semantic', support('kb:semantic', [1, 0]));
  const runtime = new EslmRuntime(new EslmEngine(await createCoreModel()), [provider], ['kb:semantic']);
  const result = await runtime.executeTaskWithKnowledge(task());
  assert.equal(result.status, 'DEFEASIBLE');
  assert.deepEqual(result.consultedKbVersions, [{ kbId: 'kb:semantic', version: '1' }]);
  assert.deepEqual(result.usedKbVersions, [{ kbId: 'kb:semantic', version: '1' }]);
});

test('typed knowledge abstention records consultation without claiming a contributor', async () => {
  const provider = evidenceProvider('kb:tie', support('kb:tie', [0, 0]));
  const runtime = new EslmRuntime(new EslmEngine(await createCoreModel()), [provider], ['kb:tie']);
  const result = await runtime.executeTaskWithKnowledge(task([
    'Tovin waited beside the arch.', 'Tovin waited beside the arch.',
  ]));
  assert.equal(result.status, 'UNKNOWN');
  assert.deepEqual(result.consultedKbVersions, [{ kbId: 'kb:tie', version: '1' }]);
  assert.deepEqual(result.usedKbVersions, []);
});

test('one failing optional evidence provider is diagnosed without aborting the typed task', async () => {
  const runtime = new EslmRuntime(new EslmEngine(await createCoreModel()), [
    evidenceProvider('kb:broken', new Error('nonce failure')),
    evidenceProvider('kb:working', support('kb:working', [1, 0])),
  ], ['kb:broken', 'kb:working']);
  const result = await runtime.executeTaskWithKnowledge(task());
  assert.equal(result.status, 'DEFEASIBLE');
  assert.deepEqual(result.consultedKbVersions.map((item) => item.kbId), ['kb:broken', 'kb:working']);
  assert.deepEqual(result.usedKbVersions.map((item) => item.kbId), ['kb:working']);
  assert.match(result.knowledgeDiagnostics[0].diagnostic, /nonce failure/u);
});

test('typed task provider begin and cleanup failures are diagnosed and their evidence is skipped', async () => {
  let beganOperation = false;
  let beginFailureCleanup = 0;
  const beginBroken = evidenceProvider('kb:begin-broken', support('kb:begin-broken', [100, 0]));
  beginBroken.beginQuery = () => { throw new Error('begin nonce'); };
  beginBroken.endQuery = () => { beginFailureCleanup += 1; };
  beginBroken.semanticEvidence = async () => {
    beganOperation = true;
    return support('kb:begin-broken', [100, 0]);
  };
  const cleanupBroken = evidenceProvider('kb:cleanup-broken', support('kb:cleanup-broken', [100, 0]));
  cleanupBroken.endQuery = () => { throw new Error('cleanup nonce'); };
  const working = evidenceProvider('kb:working', support('kb:working', [1, 0]));
  const runtime = new EslmRuntime(new EslmEngine(await createCoreModel()), [
    cleanupBroken, working, beginBroken,
  ], ['kb:cleanup-broken', 'kb:working', 'kb:begin-broken']);
  const result = await runtime.executeTaskWithKnowledge(task());
  assert.equal(result.status, 'DEFEASIBLE');
  assert.equal(beganOperation, false);
  assert.equal(beginFailureCleanup, 1);
  assert.deepEqual(result.consultedKbVersions.map((item) => item.kbId), [
    'kb:begin-broken', 'kb:cleanup-broken', 'kb:working',
  ]);
  assert.deepEqual(result.usedKbVersions, [{ kbId: 'kb:working', version: '1' }]);
  assert.deepEqual(result.knowledgeDiagnostics.map((item) => item.stage), ['beginQuery', 'endQuery']);
});

test('plausibility and compatibility scoring skip every failed provider transaction', async () => {
  function scoringProvider(id, options = {}) {
    return {
      manifest: { id, kbId: id, kbVersion: '1' },
      memorySnapshot() { return { mode: 'fixture', id }; },
      beginQuery() { if (options.beginError) throw new Error(options.beginError); },
      endQuery() { if (options.endError) throw new Error(options.endError); },
      async scorePlausibility() {
        if (options.operationError) throw new Error(options.operationError);
        return { score: options.score ?? 1, evidence: [{ relation: 'nonce-plausibility' }] };
      },
      async scoreCompatibility() {
        if (options.operationError) throw new Error(options.operationError);
        return { score: options.score ?? 1, evidence: [{ relation: 'nonce-compatibility' }] };
      },
    };
  }
  const engine = new EslmEngine(await createCoreModel());
  const runtime = new EslmRuntime(engine, [
    scoringProvider('kb:working', { score: 2 }),
    scoringProvider('kb:begin-broken', { beginError: 'begin score nonce', score: 100 }),
    scoringProvider('kb:operation-broken', { operationError: 'operation score nonce', score: 100 }),
    scoringProvider('kb:cleanup-broken', { endError: 'cleanup score nonce', score: 100 }),
  ], ['kb:working', 'kb:begin-broken', 'kb:operation-broken', 'kb:cleanup-broken']);

  for (const [operation, args, coreText] of [
    ['scorePlausibility', ['Tovin traces a glyph.'], 'Tovin traces a glyph.'],
    ['scoreCompatibility', ['Tovin traces a glyph.', 'The glyph glows.'],
      'Tovin traces a glyph. The glyph glows.'],
  ]) {
    const result = await runtime[operation](...args);
    assert.equal(result.score, engine.score(coreText).score + 2);
    assert.deepEqual(result.evidence.map((item) => item.provider), ['kb:working']);
    assert.deepEqual(result.knowledgeDiagnostics.map((item) => item.stage), [
      'beginQuery', 'endQuery', 'operation',
    ]);
  }
});

test('provider and selection permutations leave typed results and memory metadata byte-stable', async () => {
  const alpha = evidenceProvider('kb:alpha', support('kb:alpha', [1, 0]));
  const zeta = evidenceProvider('kb:zeta', support('kb:zeta', [0.5, 0]));
  const plan = (providers) => ({
    format: 'eslm-memory-plan-v1', requestedPolicy: 'lazy', effectivePolicy: 'lazy',
    softTarget: true, targetMiB: 128, reserveMiB: 96,
    providers: providers.map((provider) => ({ id: provider.manifest.id, mode: 'lazy' })),
  });
  const forward = new EslmRuntime(
    new EslmEngine(await createCoreModel()), [alpha, zeta], ['kb:zeta', 'kb:alpha'],
    plan([zeta, alpha]),
  );
  const reversed = new EslmRuntime(
    new EslmEngine(await createCoreModel()), [zeta, alpha], ['kb:alpha', 'kb:zeta'],
    plan([alpha, zeta]),
  );
  assert.equal(JSON.stringify(forward.memorySnapshot()), JSON.stringify(reversed.memorySnapshot()));
  assert.equal(
    JSON.stringify(await forward.executeTaskWithKnowledge(task())),
    JSON.stringify(await reversed.executeTaskWithKnowledge(task())),
  );
});

test('runtime provider identities are complete and unique at the reported KB-version boundary', async () => {
  const core = new EslmEngine(await createCoreModel());
  const duplicateA = evidenceProvider('adapter:a', support('adapter:a', [1, 0]));
  const duplicateB = evidenceProvider('adapter:b', support('adapter:b', [0, 1]));
  duplicateA.manifest.kbId = 'kb:shared';
  duplicateB.manifest.kbId = 'kb:shared';

  assert.throws(() => new EslmRuntime(core, [duplicateA, duplicateB], ['kb:shared']),
    /unique immutable \(kbId, kbVersion\) identity/u);
  assert.throws(() => new EslmRuntime(core, [{ manifest: { id: 'missing-version' } }], []),
    /non-empty id, kbId, and kbVersion strings/u);
});
