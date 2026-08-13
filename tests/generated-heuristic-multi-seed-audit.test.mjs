import assert from 'node:assert/strict';
import test from 'node:test';
import { loadKnowledgeBase, mergeModels } from '../src/kbs.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';
import { EslmEngine } from '../src/runtime/engine.mjs';
import { EslmRuntime } from '../src/runtime/runtime.mjs';
import { HeuristicLanguageRuntime } from '../src/runtime/heuristic-language-runtime.mjs';
import { resolveWorkPolicy } from '../src/runtime/work-policy.mjs';
import {
  assertGeneratedHeuristicMultiSeedAudit,
  GENERATED_HEURISTIC_MULTI_SEED_AUDIT_PROTOCOL,
  runGeneratedHeuristicMultiSeedAudit,
} from '../src/evaluation/generated-heuristic-multi-seed-audit.mjs';
import { benchmarkCommand } from '../src/interface/benchmark-command.mjs';

async function quickRuntime() {
  const workPolicy = resolveWorkPolicy('balanced');
  const model = mergeModels(await createCoreModel(), [await loadKnowledgeBase('quick')]);
  return new HeuristicLanguageRuntime(new EslmRuntime(
    new EslmEngine(model, { workPolicy }), [], ['quick'], undefined, workPolicy,
  ));
}

function auditOptions(seeds) {
  return {
    size: 24,
    seeds,
    createdAt: '2030-01-02T03:04:05.000Z',
    replayCommand: `node src/cli.mjs benchmark generated-seed-audit --cases 24 --seeds '${seeds.join(',')}'`,
    seedReplayCommands: seeds.map((seed) => ({
      seed,
      replayCommand: `node src/cli.mjs benchmark generated --cases 24 --seed '${seed}'`,
    })),
  };
}

test('multi-seed audit binds every run to one source and configuration identity', async () => {
  const seeds = ['audit-contract-alpha', 'audit-contract-beta'];
  const audit = await runGeneratedHeuristicMultiSeedAudit(async () => quickRuntime(), auditOptions(seeds));

  assert.equal(audit.format, GENERATED_HEURISTIC_MULTI_SEED_AUDIT_PROTOCOL);
  assert.equal(audit.benchmarkComparable, false);
  assert.deepEqual(audit.plan.seeds, seeds);
  assert.equal(audit.plan.casesPerSeed, 24);
  assert.equal(audit.plan.totalPlanned, 48);
  assert.equal(audit.runs.length, 2);
  assert.equal(audit.aggregates.total, 48);
  assert.equal(audit.aggregates.passed + audit.aggregates.failed, 48);
  assert.equal(audit.aggregates.mixedContractRate, audit.aggregates.passed / 48);
  assert.equal(new Set(audit.runs.map((run) => run.generator.suiteDigest)).size, 2);
  assert.ok(audit.runs.every((run) =>
    run.generator.definitionDigest === audit.sharedIdentity.definitionDigest));
  assert.ok(audit.runs.every((run) =>
    run.execution.behaviorIdentity.digest === audit.sharedIdentity.behaviorIdentity.digest));
  assert.ok(audit.runs.every((run) =>
    run.strategyConfiguration.catalog.digest === audit.sharedIdentity.catalog.digest));
  assert.ok(audit.runs.every((run) =>
    run.strategyConfiguration.selection.digest === audit.sharedIdentity.selection.digest));
  for (const dimension of ['oracleLevel', 'route', 'status']) {
    assert.equal(audit.aggregates.counts[dimension]
      .reduce((sum, row) => sum + row.total, 0), 48);
  }
  assert.equal(audit.aggregates.failureClusters
    .reduce((sum, cluster) => sum + cluster.count, 0), audit.aggregates.failed);
  assert.match(audit.runs[0].execution.replayCommand, /audit-contract-alpha/u);
  assert.match(audit.runs[1].execution.replayCommand, /audit-contract-beta/u);
  assert.equal(assertGeneratedHeuristicMultiSeedAudit(audit), audit);
  assert.equal(Object.isFrozen(audit), true);
});

test('multi-seed audit validator rejects identity drift and derived-count tampering', async () => {
  const seeds = ['audit-tamper-alpha', 'audit-tamper-beta'];
  const audit = await runGeneratedHeuristicMultiSeedAudit(async () => quickRuntime(), {
    ...auditOptions(seeds), size: 12,
    replayCommand: `node src/cli.mjs benchmark generated-seed-audit --cases 12 --seeds '${seeds.join(',')}'`,
    seedReplayCommands: seeds.map((seed) => ({
      seed, replayCommand: `node src/cli.mjs benchmark generated --cases 12 --seed '${seed}'`,
    })),
  });

  const identityDrift = structuredClone(audit);
  identityDrift.runs[1].execution.behaviorIdentity.digest = '0'.repeat(64);
  assert.throws(() => assertGeneratedHeuristicMultiSeedAudit(identityDrift), /intended source and configuration/u);

  const changedAggregate = structuredClone(audit);
  changedAggregate.aggregates.counts.status[0].passed += 1;
  assert.throws(() => assertGeneratedHeuristicMultiSeedAudit(changedAggregate), /aggregates do not reproduce/u);

  const changedDigest = structuredClone(audit);
  changedDigest.receiptDigest = `sha256:${'0'.repeat(64)}`;
  assert.throws(() => assertGeneratedHeuristicMultiSeedAudit(changedDigest), /digest does not match/u);
});

test('multi-seed runner rejects duplicate seeds before constructing a runtime', async () => {
  let constructed = 0;
  await assert.rejects(runGeneratedHeuristicMultiSeedAudit(async () => {
    constructed += 1;
    return quickRuntime();
  }, {
    seeds: ['duplicate-seed', 'duplicate-seed'],
    size: 1,
    replayCommand: 'not-reached',
    seedReplayCommands: [],
  }), /unique bounded seed names/u);
  assert.equal(constructed, 0);
});

test('noncanonical seed diagnostics cannot overwrite the canonical audit receipt', async () => {
  await assert.rejects(benchmarkCommand(['generated-seed-audit'], {
    publish: true,
    cases: 24,
    seeds: 'diagnostic-alpha,diagnostic-beta',
    kb: 'quick',
  }, {
    engineFor: () => { throw new Error('engine must not be constructed'); },
    printJson: () => {},
  }), /requires the default five seeds/u);
});
