import { isDeepStrictEqual } from 'node:util';
import { builtinStrategyDescriptors } from '../strategy/builtin-strategy-catalog.mjs';
import {
  assertStrategyRunResult, strategyIdentity,
} from '../strategy/strategy-contract.mjs';
import { arbitrateStrategyVotes } from '../strategy/strategy-coordinator.mjs';
import {
  array, boolean, boundedJson, exactKeys, finite, integer, record, stringArray,
} from './result-payload-shapes.mjs';

const DESCRIPTORS = new Map(builtinStrategyDescriptors().map((descriptor) => [
  strategyIdentity(descriptor), descriptor,
]));
const RUN_FAILURES = new Set(['failed', 'invalid-output', 'resource-limit']);
const RECEIPT_FIELDS = Object.freeze([
  'format', 'stage', 'workUnit', 'maximumWork', 'consumedWork', 'remainingWork',
  'decisionAuthority', 'selectedStrategies', 'results', 'arbitration', 'complete',
]);
const ARBITRATION_FIELDS = Object.freeze([
  'mode', 'decisionAuthority', 'stageOutputSelected', 'selected', 'ambiguous', 'candidates',
  'truthAuthorized',
]);
const ARBITRATION_CANDIDATE_FIELDS = Object.freeze([
  'output', 'support', 'voters', 'correlationGroups', 'truthAuthorized',
]);
const LANGUAGE_COORDINATED_IDENTITIES = Object.freeze([...DESCRIPTORS.entries()]
  .filter(([, descriptor]) => descriptor.stage === 'runtime.language.interpret'
    && descriptor.implementationState === 'coordinated')
  .map(([identity]) => identity).toSorted());

function expectedSelection(result, stage) {
  return result.workPolicy?.effective?.strategies?.selected?.[stage];
}

export function assertResultStrategySelection({ mode, identities, stage, result, path }) {
  if (!['all-registered', 'exact-allowlist'].includes(mode)) {
    throw new TypeError(`${path}.mode is unsupported.`);
  }
  stringArray(identities, `${path}.identities`, 256, 180);
  if (new Set(identities).size !== identities.length
    || JSON.stringify(identities) !== JSON.stringify([...identities].toSorted())) {
    throw new TypeError(`${path}.identities must be unique and canonical.`);
  }
  for (const identity of identities) {
    const descriptor = DESCRIPTORS.get(identity);
    if (!descriptor || descriptor.stage !== stage || descriptor.implementationState === 'planned') {
      throw new TypeError(`${path} contains an unavailable ${stage} identity: ${identity}.`);
    }
  }
  const expected = expectedSelection(result, stage);
  if (expected === undefined) {
    if (mode !== 'all-registered' || identities.length !== 0) {
      throw new TypeError(`${path} contradicts the all-registered work policy.`);
    }
  } else if (mode !== 'exact-allowlist' || JSON.stringify(identities) !== JSON.stringify(expected)) {
    throw new TypeError(`${path} contradicts the exact work-policy allowlist.`);
  }
}

function canonicalIdentityList(value, path) {
  stringArray(value, path, 64, 180);
  if (new Set(value).size !== value.length
    || JSON.stringify(value) !== JSON.stringify([...value].toSorted())) {
    throw new TypeError(`${path} must be unique and canonical.`);
  }
}

function assertArbitrationCandidate(value, path) {
  const candidate = record(value, path);
  exactKeys(candidate, ARBITRATION_CANDIDATE_FIELDS, path);
  if (!Object.hasOwn(candidate, 'output')) {
    throw new TypeError(`${path}.output is required.`);
  }
  boundedJson(candidate.output, `${path}.output`, 65_536);
  finite(candidate.support, `${path}.support`, 0, 64);
  canonicalIdentityList(candidate.voters, `${path}.voters`);
  canonicalIdentityList(candidate.correlationGroups, `${path}.correlationGroups`);
  boolean(candidate.truthAuthorized, `${path}.truthAuthorized`);
  return candidate;
}

function assertCanonicalArbitration(value, results, receiptAuthority, path) {
  const arbitration = record(value, path);
  exactKeys(arbitration, ARBITRATION_FIELDS, path);
  if (arbitration.mode !== 'correlation-aware-additive-confidence') {
    throw new TypeError(`${path}.mode is unsupported.`);
  }
  if (arbitration.decisionAuthority !== receiptAuthority
    || arbitration.decisionAuthority !== 'accounting-only'
    || arbitration.stageOutputSelected !== false) {
    throw new TypeError(`${path} cannot claim final language-stage selection authority.`);
  }
  boolean(arbitration.ambiguous, `${path}.ambiguous`);
  boolean(arbitration.truthAuthorized, `${path}.truthAuthorized`);
  const candidates = array(arbitration.candidates, `${path}.candidates`, 64);
  candidates.forEach((candidate, index) =>
    assertArbitrationCandidate(candidate, `${path}.candidates[${index}]`));
  if (arbitration.selected !== null) {
    assertArbitrationCandidate(arbitration.selected, `${path}.selected`);
  }
  const expected = arbitrateStrategyVotes(results, { decisionAuthority: receiptAuthority });
  if (!isDeepStrictEqual(arbitration, expected)) {
    throw new TypeError(`${path} must equal the canonical arbitration recomputed from strategy results.`);
  }
  return arbitration;
}

export function assertStrategyExecutionReceipt(value, result) {
  const path = 'Runtime result approximation.receipt.strategyExecution';
  const receipt = record(value, path);
  exactKeys(receipt, RECEIPT_FIELDS, path);
  if (receipt.format !== 'eslm-strategy-execution-receipt-v1'
    || receipt.stage !== 'runtime.language.interpret') {
    throw new TypeError(`${path} must be a language-stage v1 execution receipt.`);
  }
  if (receipt.workUnit !== 'coordinator-invocation-slot') {
    throw new TypeError(`${path}.workUnit must be coordinator-invocation-slot.`);
  }
  integer(receipt.maximumWork, `${path}.maximumWork`, 131_072);
  integer(receipt.consumedWork, `${path}.consumedWork`, receipt.maximumWork);
  integer(receipt.remainingWork, `${path}.remainingWork`, receipt.maximumWork);
  if (receipt.remainingWork !== receipt.maximumWork - receipt.consumedWork) {
    throw new TypeError(`${path} work totals are inconsistent.`);
  }
  if (receipt.decisionAuthority !== 'accounting-only') {
    throw new TypeError(`${path} must disclose accounting-only language-family coordination.`);
  }
  canonicalIdentityList(receipt.selectedStrategies, `${path}.selectedStrategies`);
  const configured = expectedSelection(result, receipt.stage);
  const expectedStrategies = configured === undefined
    ? LANGUAGE_COORDINATED_IDENTITIES
    : configured.filter((identity) => DESCRIPTORS.get(identity)?.implementationState === 'coordinated');
  if (!isDeepStrictEqual(receipt.selectedStrategies, expectedStrategies)) {
    throw new TypeError(`${path}.selectedStrategies omits or adds a configured coordinated strategy.`);
  }
  const results = array(receipt.results, `${path}.results`, 64);
  if (results.length !== receipt.selectedStrategies.length) {
    throw new TypeError(`${path} requires one result per selected strategy.`);
  }
  results.forEach((run, index) => {
    const identity = `${run?.strategyId}@${run?.strategyVersion}`;
    if (identity !== receipt.selectedStrategies[index]) {
      throw new TypeError(`${path}.results must follow selected strategy order.`);
    }
    const descriptor = DESCRIPTORS.get(identity);
    if (!descriptor || descriptor.implementationState !== 'coordinated'
      || descriptor.stage !== receipt.stage) {
      throw new TypeError(`${path} references a non-coordinated strategy.`);
    }
    assertStrategyRunResult(run, descriptor);
  });
  const consumed = results.reduce((sum, run) => sum + run.work.consumed, 0);
  if (consumed !== receipt.consumedWork
    || receipt.complete !== results.every((run) => !RUN_FAILURES.has(run.status))) {
    throw new TypeError(`${path} contradicts result work or completeness.`);
  }
  boolean(receipt.complete, `${path}.complete`);
  assertCanonicalArbitration(receipt.arbitration, results, receipt.decisionAuthority,
    `${path}.arbitration`);
  boundedJson(receipt, path, 1_048_576);
  return receipt;
}
