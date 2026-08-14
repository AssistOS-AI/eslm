import { createHash } from 'node:crypto';
import { builtinStrategyDescriptors } from './builtin-strategy-catalog.mjs';
import {
  STRATEGY_EXACT_SELECTION_STAGES, STRATEGY_STAGES, strategyIdentity,
} from './strategy-contract.mjs';

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).toSorted().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function presetStages(preset) {
  if (preset === 'language') return ['runtime.language.interpret', 'runtime.request.plan'];
  if (preset === 'retrieval') return [
    'runtime.context.construct', 'runtime.knowledge.focus', 'runtime.knowledge.retrieve',
    'runtime.evidence.assess',
    'runtime.failure.ground',
  ];
  if (preset === 'reasoning') return [
    'runtime.method.plan', 'runtime.reason.execute', 'runtime.result.verify',
  ];
  if (preset === 'construction') return ['runtime.result.construct'];
  return STRATEGY_STAGES;
}

export function strategyInventory(workPolicy) {
  const selection = workPolicy?.effective?.strategies ?? { preset: 'all', selected: {} };
  const visibleStages = new Set(presetStages(selection.preset));
  const descriptors = builtinStrategyDescriptors();
  const rows = descriptors.map((descriptor) => {
    const identity = strategyIdentity(descriptor);
    const exact = selection.selected?.[descriptor.stage];
    const visible = visibleStages.has(descriptor.stage);
    const policySelectable = descriptor.implementationState !== 'planned'
      && STRATEGY_EXACT_SELECTION_STAGES.includes(descriptor.stage);
    const executionEnabled = policySelectable && (!exact || exact.includes(identity));
    return Object.freeze({
      identity,
      strategyId: descriptor.strategyId,
      version: descriptor.version,
      stage: descriptor.stage,
      epistemicRole: descriptor.epistemicRole,
      visible,
      policySelectable,
      executionEnabled,
      implementationState: descriptor.implementationState,
      state: descriptor.implementationState === 'planned' ? 'planned-not-executable'
        : !policySelectable ? 'catalogued-not-policy-gated'
        : executionEnabled ? exact ? 'selected-by-exact-allowlist' : 'enabled-by-default'
          : 'excluded-by-exact-allowlist',
      budgetKeys: descriptor.budgetKeys,
      witnessKind: descriptor.witnessKind,
    });
  });
  return Object.freeze({
    format: 'eslm-strategy-inventory-v1',
    inventoryView: selection.preset,
    selectionDigest: `sha256:${sha256(stableJson(selection))}`,
    catalogued: rows.length,
    visible: rows.filter((row) => row.visible).length,
    executionEnabled: rows.filter((row) => row.executionEnabled).length,
    coordinated: rows.filter((row) => row.implementationState === 'coordinated').length,
    instrumentedLocal: rows.filter((row) => row.implementationState === 'instrumented-local').length,
    planned: rows.filter((row) => row.implementationState === 'planned').length,
    stages: Object.freeze(STRATEGY_STAGES.map((stage) => Object.freeze({
      stage,
      catalogued: rows.filter((row) => row.stage === stage).length,
      visible: rows.filter((row) => row.stage === stage && row.visible).length,
      executionEnabled: rows.filter((row) => row.stage === stage && row.executionEnabled).length,
      coordinated: rows.filter((row) => row.stage === stage
        && row.implementationState === 'coordinated').length,
      instrumentedLocal: rows.filter((row) => row.stage === stage
        && row.implementationState === 'instrumented-local').length,
      planned: rows.filter((row) => row.stage === stage
        && row.implementationState === 'planned').length,
    }))),
    strategies: Object.freeze(rows),
  });
}
