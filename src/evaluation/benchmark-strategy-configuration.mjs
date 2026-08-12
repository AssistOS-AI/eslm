import {
  BUILTIN_STRATEGY_CATALOG, builtinStrategyDescriptors,
} from '../strategy/builtin-strategy-catalog.mjs';
import { STRATEGY_STAGES } from '../strategy/strategy-contract.mjs';
import { assertWorkPolicy, resolveWorkPolicy } from '../runtime/work-policy.mjs';
import { sha256, stableStringify } from '../util.mjs';

export const BENCHMARK_STRATEGY_CONFIGURATION_PROTOCOL =
  'eslm-benchmark-strategy-configuration-v1';
export const BENCHMARK_STRATEGY_STAGE_SUMMARY_PROTOCOL =
  'eslm-benchmark-strategy-stage-receipt-summary-v1';

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const STRATEGY_IDENTITY = /^strategy:[a-z0-9][a-z0-9:-]*@\d+$/u;
const ARBITER_IDENTITY = /^arbiter:[a-z0-9][a-z0-9:-]*@\d+$/u;
const CONFIGURATION_FIELDS = Object.freeze([
  'format', 'mode', 'catalog', 'selection', 'arbiters', 'stageReceipts',
  'adapterLocal', 'configurationDigest',
]);
const MAX_STATE_BYTES = 65_536;
const MAX_UNIQUE_RECEIPTS = 4_096;
const DESCRIPTORS_BY_IDENTITY = new Map(builtinStrategyDescriptors().map((descriptor) => [
  `${descriptor.strategyId}@${descriptor.version}`, descriptor,
]));

function digest(value) {
  return `sha256:${sha256(stableStringify(value))}`;
}

function isRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactFields(value, fields, path) {
  if (!isRecord(value)
      || stableStringify(Object.keys(value).toSorted()) !== stableStringify([...fields].toSorted())) {
    throw new Error(`${path} must contain exactly: ${fields.join(', ')}.`);
  }
  return value;
}

function canonicalJsonValue(value, path, depth = 0) {
  if (depth > 10 || value === undefined || typeof value === 'function'
      || typeof value === 'symbol' || typeof value === 'bigint'
      || typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error(`${path} must be bounded canonical JSON.`);
  }
  if (value === null || typeof value !== 'object') return value;
  if (!Array.isArray(value) && !isRecord(value)) {
    throw new Error(`${path} must contain only plain JSON objects.`);
  }
  const entries = Array.isArray(value) ? value : Object.entries(value);
  if (entries.length > 1_024) throw new Error(`${path} contains too many values.`);
  return Array.isArray(value)
    ? value.map((item, index) => canonicalJsonValue(item, `${path}[${index}]`, depth + 1))
    : Object.fromEntries(entries.toSorted(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalJsonValue(item, `${path}.${key}`, depth + 1)]));
}

function jsonValue(value, path) {
  const canonical = canonicalJsonValue(value, path);
  const serialized = stableStringify(canonical);
  if (serialized === undefined || Buffer.byteLength(serialized, 'utf8') > MAX_STATE_BYTES) {
    throw new Error(`${path} must be bounded canonical JSON.`);
  }
  return canonical;
}

function catalogIdentity() {
  return Object.freeze({
    format: BUILTIN_STRATEGY_CATALOG.format,
    digest: digest(builtinStrategyDescriptors()),
  });
}

function canonicalExactSelection(selected = {}) {
  const exactByStage = {};
  for (const stage of Object.keys(selected).toSorted()) {
    if (!STRATEGY_STAGES.includes(stage) || !Array.isArray(selected[stage])) {
      throw new Error(`Unknown benchmark strategy-selection stage: ${stage}.`);
    }
    const identities = [...selected[stage]];
    if (identities.length === 0 || identities.length > 256
        || identities.some((identity) => !STRATEGY_IDENTITY.test(identity))
        || new Set(identities).size !== identities.length
        || stableStringify(identities) !== stableStringify(identities.toSorted())) {
      throw new Error(`Benchmark strategy selection for ${stage} is not canonical.`);
    }
    exactByStage[stage] = Object.freeze(identities);
  }
  return Object.freeze(exactByStage);
}

function runtimeSelection(workPolicy) {
  assertWorkPolicy(workPolicy);
  const core = Object.freeze({
    source: 'eslm-work-policy-v1',
    requestedProfile: workPolicy.requested.profile,
    effectiveProfile: workPolicy.effective.profile,
    preset: workPolicy.effective.strategies.preset,
    exactByStage: canonicalExactSelection(workPolicy.effective.strategies.selected),
  });
  return Object.freeze({ ...core, digest: digest(core) });
}

function adapterSelection() {
  const core = Object.freeze({
    source: 'adapter-local', requestedProfile: null, effectiveProfile: null,
    preset: null, exactByStage: Object.freeze({}),
  });
  return Object.freeze({ ...core, digest: digest(core) });
}

function configuredArbiters(mode) {
  if (mode !== 'runtime-work-policy') return Object.freeze([]);
  const policy = Object.freeze({
    candidateAuthority: 'interpretation-only',
    correlationPolicy: 'ds022-proposal-lattice',
    truthAuthority: false,
  });
  return Object.freeze([Object.freeze({
    stage: 'runtime.language.interpret',
    identity: 'arbiter:language:ds022-proposal-lattice@1',
    policyDigest: digest(policy),
  })]);
}

function executionReceipts(result) {
  const receipts = [];
  const approximation = result?.approximation?.receipt?.strategyExecution;
  if (approximation) receipts.push(approximation);
  for (const receipt of result?.strategyExecutionReceipts ?? []) receipts.push(receipt);
  return receipts;
}

function summarizeStageReceipts(results) {
  const byStage = new Map();
  for (const result of results) {
    for (const receipt of executionReceipts(result)) {
      if (receipt?.format !== 'eslm-strategy-execution-receipt-v1'
          || !STRATEGY_STAGES.includes(receipt.stage)
          || typeof receipt.complete !== 'boolean') {
        throw new Error('Benchmark strategy evidence contains an invalid stage receipt.');
      }
      if (!byStage.has(receipt.stage)) byStage.set(receipt.stage, []);
      byStage.get(receipt.stage).push(receipt);
    }
  }
  return Object.freeze([...byStage.entries()].toSorted(([left], [right]) => left.localeCompare(right))
    .map(([stage, receipts]) => {
      const receiptCounts = new Map();
      for (const receipt of receipts) {
        const receiptDigest = digest(receipt);
        const current = receiptCounts.get(receiptDigest) ?? {
          digest: receiptDigest, occurrences: 0, complete: receipt.complete,
        };
        if (current.complete !== receipt.complete) {
          throw new Error('One canonical strategy receipt digest has inconsistent completeness.');
        }
        current.occurrences += 1;
        receiptCounts.set(receiptDigest, current);
      }
      if (receiptCounts.size > MAX_UNIQUE_RECEIPTS) {
        throw new Error('Benchmark strategy stage has too many unique receipts to publish safely.');
      }
      const uniqueReceipts = Object.freeze([...receiptCounts.values()]
        .toSorted((left, right) => left.digest.localeCompare(right.digest))
        .map((value) => Object.freeze(value)));
      const core = Object.freeze({
        stage,
        format: BENCHMARK_STRATEGY_STAGE_SUMMARY_PROTOCOL,
        executions: receipts.length,
        completeExecutions: receipts.filter((receipt) => receipt.complete).length,
        incompleteExecutions: receipts.filter((receipt) => !receipt.complete).length,
        uniqueReceipts,
      });
      return Object.freeze({ ...core, digest: digest(core) });
    }));
}

function finishConfiguration(value) {
  const core = Object.freeze(value);
  return Object.freeze({ ...core, configurationDigest: digest(core) });
}

export function createRuntimeBenchmarkStrategyConfiguration(results) {
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error('A runtime benchmark strategy snapshot requires at least one execution result.');
  }
  const workPolicy = results[0]?.workPolicy;
  assertWorkPolicy(workPolicy);
  const canonicalPolicy = stableStringify(workPolicy);
  if (results.some((result) => stableStringify(result?.workPolicy) !== canonicalPolicy)) {
    throw new Error('All executions in one benchmark row must use the same work policy.');
  }
  return finishConfiguration({
    format: BENCHMARK_STRATEGY_CONFIGURATION_PROTOCOL,
    mode: 'runtime-work-policy',
    catalog: catalogIdentity(),
    selection: runtimeSelection(workPolicy),
    arbiters: configuredArbiters('runtime-work-policy'),
    stageReceipts: summarizeStageReceipts(results),
    adapterLocal: null,
  });
}

export function createAdapterBenchmarkStrategyConfiguration(data) {
  if (!isRecord(data) || typeof data.adapterId !== 'string' || !data.adapterId
      || typeof data.adapterVersion !== 'string' || !data.adapterVersion
      || typeof data.stateFormat !== 'string' || !data.stateFormat) {
    throw new Error('Adapter-local strategy configuration requires adapter identity, version, and state format.');
  }
  const state = jsonValue(data.state, 'Adapter-local strategy state');
  const adapterCore = Object.freeze({
    adapterId: data.adapterId,
    adapterVersion: data.adapterVersion,
    stateFormat: data.stateFormat,
    state,
  });
  const adapterLocal = Object.freeze({ ...adapterCore, stateDigest: digest(adapterCore) });
  return finishConfiguration({
    format: BENCHMARK_STRATEGY_CONFIGURATION_PROTOCOL,
    mode: 'adapter-local',
    catalog: catalogIdentity(),
    selection: adapterSelection(),
    arbiters: Object.freeze([]),
    stageReceipts: Object.freeze([]),
    adapterLocal,
  });
}

function assertDigest(value, path) {
  if (typeof value !== 'string' || !DIGEST.test(value)) throw new Error(`${path} must be a SHA-256 digest.`);
}

function assertSelection(selection, mode, requireCurrentCatalog) {
  exactFields(selection, [
    'source', 'requestedProfile', 'effectiveProfile', 'preset', 'exactByStage', 'digest',
  ], 'Benchmark strategy selection');
  const core = {
    source: selection.source,
    requestedProfile: selection.requestedProfile,
    effectiveProfile: selection.effectiveProfile,
    preset: selection.preset,
    exactByStage: canonicalExactSelection(selection.exactByStage),
  };
  if (mode === 'runtime-work-policy') {
    if (selection.source !== 'eslm-work-policy-v1'
        || !['quick', 'balanced', 'deep', 'exhaustive-bounded'].includes(selection.requestedProfile)
        || selection.effectiveProfile !== selection.requestedProfile
        || !['all', 'language', 'retrieval', 'reasoning', 'construction'].includes(selection.preset)) {
      throw new Error('Runtime benchmark strategy selection is inconsistent.');
    }
    if (requireCurrentCatalog) {
      resolveWorkPolicy({
        profile: selection.effectiveProfile,
        strategies: { preset: selection.preset, selected: selection.exactByStage },
      });
      for (const [stage, identities] of Object.entries(selection.exactByStage)) {
        if (identities.some((identity) => DESCRIPTORS_BY_IDENTITY.get(identity)?.stage !== stage)) {
          throw new Error('Runtime benchmark strategy selection differs from the current catalog.');
        }
      }
    }
  } else if (selection.source !== 'adapter-local'
      || selection.requestedProfile !== null || selection.effectiveProfile !== null
      || selection.preset !== null || Object.keys(selection.exactByStage).length !== 0) {
    throw new Error('Adapter-local benchmark strategy selection is inconsistent.');
  }
  assertDigest(selection.digest, 'Benchmark strategy selection digest');
  if (selection.digest !== digest(core)) throw new Error('Benchmark strategy selection digest does not match.');
}

function assertStageSummary(summary) {
  exactFields(summary, [
    'stage', 'format', 'executions', 'completeExecutions', 'incompleteExecutions',
    'uniqueReceipts', 'digest',
  ], 'Benchmark strategy stage summary');
  if (!STRATEGY_STAGES.includes(summary.stage)
      || summary.format !== BENCHMARK_STRATEGY_STAGE_SUMMARY_PROTOCOL
      || !Number.isSafeInteger(summary.executions) || summary.executions < 1
      || !Number.isSafeInteger(summary.completeExecutions) || summary.completeExecutions < 0
      || !Number.isSafeInteger(summary.incompleteExecutions) || summary.incompleteExecutions < 0
      || summary.completeExecutions + summary.incompleteExecutions !== summary.executions
      || !Array.isArray(summary.uniqueReceipts)
      || summary.uniqueReceipts.length < 1 || summary.uniqueReceipts.length > MAX_UNIQUE_RECEIPTS) {
    throw new Error('Benchmark strategy stage summary has inconsistent counts or identity.');
  }
  let occurrences = 0;
  let previous = '';
  for (const receipt of summary.uniqueReceipts) {
    exactFields(receipt, ['digest', 'occurrences', 'complete'], 'Benchmark unique strategy receipt');
    assertDigest(receipt.digest, 'Benchmark unique strategy receipt digest');
    if (receipt.digest <= previous || !Number.isSafeInteger(receipt.occurrences)
        || receipt.occurrences < 1 || typeof receipt.complete !== 'boolean') {
      throw new Error('Benchmark unique strategy receipts must be canonical and counted.');
    }
    previous = receipt.digest;
    occurrences += receipt.occurrences;
  }
  if (occurrences !== summary.executions) throw new Error('Benchmark strategy receipt counts do not sum.');
  const core = { ...summary };
  delete core.digest;
  assertDigest(summary.digest, 'Benchmark strategy stage summary digest');
  if (summary.digest !== digest(core)) throw new Error('Benchmark strategy stage summary digest does not match.');
}

export function assertBenchmarkStrategyConfiguration(value, options = {}) {
  const requireCurrentCatalog = options.requireCurrentCatalog !== false;
  exactFields(value, CONFIGURATION_FIELDS, 'Benchmark strategy configuration');
  if (value.format !== BENCHMARK_STRATEGY_CONFIGURATION_PROTOCOL
      || !['runtime-work-policy', 'adapter-local'].includes(value.mode)) {
    throw new Error(`Benchmark strategy configuration must use ${BENCHMARK_STRATEGY_CONFIGURATION_PROTOCOL}.`);
  }
  exactFields(value.catalog, ['format', 'digest'], 'Benchmark strategy catalog identity');
  if (requireCurrentCatalog && stableStringify(value.catalog) !== stableStringify(catalogIdentity())) {
    throw new Error('Benchmark strategy configuration uses a different built-in catalog.');
  }
  if (!requireCurrentCatalog) {
    if (value.catalog.format !== BUILTIN_STRATEGY_CATALOG.format) {
      throw new Error('Historical benchmark strategy catalog format is unsupported.');
    }
    assertDigest(value.catalog.digest, 'Benchmark strategy catalog digest');
  }
  assertSelection(value.selection, value.mode, requireCurrentCatalog);
  if (!Array.isArray(value.arbiters) || value.arbiters.length > STRATEGY_STAGES.length
      || !Array.isArray(value.stageReceipts) || value.stageReceipts.length > STRATEGY_STAGES.length) {
    throw new Error('Benchmark strategy arbiters and stage receipts must be bounded arrays.');
  }
  let priorStage = '';
  for (const arbiter of value.arbiters) {
    exactFields(arbiter, ['stage', 'identity', 'policyDigest'], 'Benchmark configured arbiter');
    if (!STRATEGY_STAGES.includes(arbiter.stage) || !ARBITER_IDENTITY.test(arbiter.identity)
        || arbiter.stage <= priorStage) throw new Error('Benchmark configured arbiters must be canonical.');
    assertDigest(arbiter.policyDigest, 'Benchmark configured arbiter policy digest');
    priorStage = arbiter.stage;
  }
  let priorReceiptStage = '';
  for (const summary of value.stageReceipts) {
    assertStageSummary(summary);
    if (summary.stage <= priorReceiptStage) throw new Error('Benchmark strategy stage summaries must be canonical.');
    priorReceiptStage = summary.stage;
  }
  if (value.mode === 'runtime-work-policy') {
    if (value.adapterLocal !== null) throw new Error('Runtime strategy configuration cannot carry adapter-local state.');
  } else {
    exactFields(value.adapterLocal, [
      'adapterId', 'adapterVersion', 'stateFormat', 'state', 'stateDigest',
    ], 'Adapter-local strategy configuration');
    if (typeof value.adapterLocal.adapterId !== 'string' || !value.adapterLocal.adapterId
        || typeof value.adapterLocal.adapterVersion !== 'string' || !value.adapterLocal.adapterVersion
        || typeof value.adapterLocal.stateFormat !== 'string' || !value.adapterLocal.stateFormat) {
      throw new Error('Adapter-local strategy identity is invalid.');
    }
    jsonValue(value.adapterLocal.state, 'Adapter-local strategy state');
    const adapterCore = { ...value.adapterLocal };
    delete adapterCore.stateDigest;
    if (value.adapterLocal.stateDigest !== digest(adapterCore)) {
      throw new Error('Adapter-local strategy state digest does not match.');
    }
  }
  const core = { ...value };
  delete core.configurationDigest;
  assertDigest(value.configurationDigest, 'Benchmark strategy configuration digest');
  if (value.configurationDigest !== digest(core)) {
    throw new Error('Benchmark strategy configuration digest does not match.');
  }
  return value;
}
