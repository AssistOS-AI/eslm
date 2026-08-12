import {
  HEURISTIC_CNL_FAMILY_NAMES, runHeuristicCnlFamily,
} from './heuristic-cnl-families.mjs';
import { builtinStrategyDescriptors } from '../strategy/builtin-strategy-catalog.mjs';
import { createStrategyRunResult } from '../strategy/strategy-contract.mjs';
import { runStrategyStageSync } from '../strategy/strategy-coordinator.mjs';
import { StrategyRegistry } from '../strategy/strategy-registry.mjs';

function coordinatedDescriptor(descriptor) {
  return Object.freeze({ ...descriptor, implementationState: 'coordinated' });
}

const DESCRIPTORS = Object.freeze(builtinStrategyDescriptors('runtime.language.interpret')
  .filter((descriptor) => descriptor.strategyId !== 'strategy:language:direct-controlled-parser')
  .map(coordinatedDescriptor));

const EDIT_IDENTITIES = new Set(DESCRIPTORS
  .filter((descriptor) => descriptor.costModel === 'cost:bounded-edit-distance')
  .map((descriptor) => `${descriptor.strategyId}@${descriptor.version}`));

function editDistanceAllocations(selectedIdentities, maximum) {
  const consumers = selectedIdentities.filter((identity) => EDIT_IDENTITIES.has(identity)).toSorted();
  if (consumers.length === 0) return Object.freeze({});
  const base = Math.floor(maximum / consumers.length);
  const remainder = maximum % consumers.length;
  return Object.freeze(Object.fromEntries(consumers.map((identity, index) => [
    identity, base + (index < remainder ? 1 : 0),
  ])));
}

function validInput(input) {
  return Boolean(input?.analysis) && input.editDistanceAllocations !== null
    && typeof input.editDistanceAllocations === 'object'
    && !Array.isArray(input.editDistanceAllocations)
    && Object.entries(input.editDistanceAllocations).every(([identity, value]) =>
      EDIT_IDENTITIES.has(identity) && Number.isSafeInteger(value) && value >= 0);
}

function validOutput(output) {
  return typeof output?.family === 'string' && Array.isArray(output?.proposals)
    && Number.isSafeInteger(output?.work?.distanceEvaluations)
    && typeof output?.work?.distanceLimitReached === 'boolean';
}

function strategyResult(descriptor, family, generated, budget, reserved) {
  const output = Object.freeze({
    family,
    proposals: Object.freeze(generated),
    work: Object.freeze({
      distanceEvaluations: budget.distanceEvaluations,
      distanceLimitReached: budget.distanceLimitReached,
    }),
  });
  if (generated.length > 0) {
    return createStrategyRunResult(descriptor, {
      status: budget.distanceLimitReached ? 'resource-limit' : 'completed',
      output,
      confidence: Math.max(...generated.map((proposal) => proposal.confidence)),
      ...(budget.distanceLimitReached ? {
        reason: 'The preallocated edit-distance frontier was exhausted after retaining partial proposals.',
      } : {}),
      work: { reserved, consumed: 1 },
    });
  }
  return createStrategyRunResult(descriptor, {
    status: budget.distanceLimitReached ? 'resource-limit' : 'abstained',
    output,
    reason: budget.distanceLimitReached
      ? 'The preallocated edit-distance frontier was exhausted.'
      : 'No visible cue licensed a proposal from this family.',
    work: { reserved, consumed: 1 },
  });
}

function languageStrategyRegistry() {
  const registry = new StrategyRegistry();
  const validators = Object.freeze({ validateInput: validInput, validateOutput: validOutput });
  for (const descriptor of DESCRIPTORS) {
    const family = descriptor.strategyId.replace(/^strategy:language:/u, '');
    registry.register(descriptor, (input, context) => {
      const identity = `${descriptor.strategyId}@${descriptor.version}`;
      const budget = {
        maximumEditDistanceEvaluations: input.editDistanceAllocations[identity] ?? 0,
        distanceEvaluations: 0,
        distanceLimitReached: false,
      };
      return strategyResult(
        descriptor, family, runHeuristicCnlFamily(family, input.analysis, budget),
        budget, context.budget.reserved,
      );
    }, validators);
  }
  return registry.seal();
}

const LANGUAGE_STRATEGY_REGISTRY = languageStrategyRegistry();

export function generateHeuristicCnlProposals(analysis, budget, selectedStrategyIdentities) {
  const selected = selectedStrategyIdentities === undefined ? undefined
    : selectedStrategyIdentities.filter((identity) =>
      identity !== 'strategy:language:direct-controlled-parser@1');
  const scheduled = (selected ?? DESCRIPTORS
    .map((descriptor) => `${descriptor.strategyId}@${descriptor.version}`)).toSorted();
  const distanceAllocations = editDistanceAllocations(
    scheduled, budget.maximumEditDistanceEvaluations,
  );
  const stageReceipt = runStrategyStageSync({
    registry: LANGUAGE_STRATEGY_REGISTRY,
    stage: 'runtime.language.interpret',
    input: Object.freeze({ analysis, editDistanceAllocations: distanceAllocations }),
    policy: selected === undefined ? undefined : {
      effective: { strategies: { selected: { 'runtime.language.interpret': selected } } },
    },
    maximumWork: scheduled.length,
    decisionAuthority: 'accounting-only',
  });
  const proposals = [];
  const familyReceipts = [];
  for (const result of stageReceipt.results) {
    const family = result.strategyId.replace(/^strategy:language:/u, '');
    const before = proposals.length;
    const generated = ['completed', 'resource-limit'].includes(result.status)
      && result.output ? result.output.proposals : [];
    const available = Math.max(0, budget.maximumProposals - proposals.length);
    proposals.push(...generated.slice(0, available));
    familyReceipts.push(Object.freeze({
      family, selected: true, strategyResultStatus: result.status,
      workUnit: stageReceipt.workUnit,
      reservedWork: result.work.reserved, consumedWork: result.work.consumed,
      distanceEvaluationsReserved: distanceAllocations[`${result.strategyId}@${result.strategyVersion}`] ?? 0,
      distanceEvaluationsConsumed: result.output?.work?.distanceEvaluations ?? 0,
      proposalsGenerated: generated.length,
      proposalsRetained: proposals.length - before,
      truncated: generated.length > available,
      ...(result.reason ? { declineReason: result.reason, declined: true } : {}),
    }));
  }
  const selectedIds = new Set(stageReceipt.selectedStrategies);
  for (const family of HEURISTIC_CNL_FAMILY_NAMES) {
    if (selectedIds.has(`strategy:language:${family}@1`)) continue;
    familyReceipts.push(Object.freeze({
      family, selected: false, proposalsGenerated: 0, proposalsRetained: 0,
      declined: true, truncated: false,
      declineReason: 'The exact strategy allowlist did not select this family.',
    }));
  }
  budget.distanceEvaluations = stageReceipt.results.reduce(
    (sum, result) => sum + (result.output?.work?.distanceEvaluations ?? 0), 0,
  );
  budget.distanceLimitReached = stageReceipt.results.some((result) => result.status === 'resource-limit');
  return Object.freeze({
    proposals: Object.freeze(proposals),
    familyReceipts: Object.freeze(familyReceipts),
    strategyExecution: stageReceipt,
  });
}
