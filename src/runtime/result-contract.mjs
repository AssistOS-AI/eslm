import { assertWorkPolicy } from './work-policy.mjs';
import { assertRuntimePayloadContracts } from './result-payload-contracts.mjs';

const PUBLIC_RUNTIME_STATUSES = Object.freeze([
  'SOLVED',
  'PARTIAL',
  'UNKNOWN',
  'AMBIGUOUS',
  'UNPARSED',
  'UNVERIFIED_NORMALIZATION',
  'DEFEASIBLE',
  'MISSING_KNOWLEDGE',
  'NO_APPLICABLE_METHOD',
  'NO_COUNTERMODEL_IN_DECLARED_DOMAIN',
  'UNDERDETERMINED',
  'INCONSISTENT_CONTEXT',
  'RESOURCE_LIMIT',
  'UNSUPPORTED_OUTPUT',
]);

const PUBLIC_RUNTIME_STATUS_SET = new Set(PUBLIC_RUNTIME_STATUSES);

const REQUESTED_MEMORY_POLICIES = new Set(['auto', 'eager', 'lazy']);
const EFFECTIVE_MEMORY_POLICIES = new Set(['eager', 'lazy', 'adaptive']);

export { PUBLIC_RUNTIME_STATUSES };

export function normalizeRuntimeStatus(status) {
  return ({
    ANSWERED: 'SOLVED',
    LEARNED: 'SOLVED',
    INDUCTIVE: 'DEFEASIBLE',
    ABDUCTIVE: 'DEFEASIBLE',
    UNSUPPORTED: 'UNPARSED',
  })[status] ?? status;
}

export function directCoreMemorySnapshot() {
  return {
    format: 'eslm-memory-plan-v1',
    requestedPolicy: 'eager',
    effectivePolicy: 'eager',
    softTarget: false,
    reserveMiB: 0,
    providers: [],
  };
}

function requireFiniteNonNegativeNumber(value, field) {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`Runtime memory plan ${field} must be a finite non-negative number.`);
  }
}

export function assertRuntimeMemoryPlanContract(memory) {
  if (!memory || typeof memory !== 'object' || Array.isArray(memory)) {
    throw new TypeError('Runtime result model.memory must be an object when present.');
  }
  if (memory.format !== 'eslm-memory-plan-v1') {
    throw new TypeError('Runtime memory plan format must be eslm-memory-plan-v1.');
  }
  if (!REQUESTED_MEMORY_POLICIES.has(memory.requestedPolicy)) {
    throw new TypeError('Runtime memory plan requestedPolicy must be auto, eager, or lazy.');
  }
  if (!EFFECTIVE_MEMORY_POLICIES.has(memory.effectivePolicy)) {
    throw new TypeError('Runtime memory plan effectivePolicy must be eager, lazy, or adaptive.');
  }
  if (typeof memory.softTarget !== 'boolean') {
    throw new TypeError('Runtime memory plan softTarget must be a boolean.');
  }
  requireFiniteNonNegativeNumber(memory.reserveMiB, 'reserveMiB');
  if (memory.targetMiB !== undefined) {
    requireFiniteNonNegativeNumber(memory.targetMiB, 'targetMiB');
    if (memory.targetMiB === 0) {
      throw new TypeError('Runtime memory plan targetMiB must be positive when present.');
    }
  }
  if (memory.softTarget && memory.targetMiB === undefined) {
    throw new TypeError('Runtime memory plan with softTarget true must expose targetMiB.');
  }
  if (!Array.isArray(memory.providers)) {
    throw new TypeError('Runtime memory plan providers must be an array.');
  }
  const providerIds = new Set();
  for (const [index, provider] of memory.providers.entries()) {
    if (!provider || typeof provider !== 'object' || Array.isArray(provider)) {
      throw new TypeError(`Runtime memory plan providers[${index}] must be an object.`);
    }
    if (typeof provider.id !== 'string' || provider.id.length === 0) {
      throw new TypeError(`Runtime memory plan providers[${index}].id must be a non-empty string.`);
    }
    if (providerIds.has(provider.id)) {
      throw new TypeError(`Runtime memory plan provider id ${provider.id} must be unique.`);
    }
    providerIds.add(provider.id);
    if (typeof provider.mode !== 'string' || provider.mode.length === 0) {
      throw new TypeError(`Runtime memory plan providers[${index}].mode must be a non-empty string.`);
    }
  }
  return memory;
}

function requireArray(result, field) {
  if (!Array.isArray(result[field])) {
    throw new TypeError(`Runtime result ${field} must be an array.`);
  }
}

function assertRuntimeRoutePayloadInvariants(result) {
  if (result.languageRoute === 'english-language-gate-rejected'
    && (result.status !== 'UNPARSED'
      || result.languageAssessment?.classification !== 'likely-non-english'
      || (result.values?.length ?? 0) > 0 || (result.provenance?.length ?? 0) > 0
      || (result.usedKbVersions?.length ?? 0) > 0 || (result.consultedKbVersions?.length ?? 0) > 0
      || result.approximation !== undefined || result.requestPlanning !== undefined
      || result.synthesis !== undefined || result.grounding !== undefined
      || !result.unresolvedSubgoals.some((item) =>
        item.operation === 'translate-input-to-english'))) {
    throw new TypeError('english-language-gate-rejected requires non-English assessment and a clean translation gap.');
  }
  if (result.languageAssessment?.classification === 'likely-non-english'
    && !['english-language-gate-rejected', 'language-agent-normalization-failed',
      'language-agent-normalization-rejected', 'language-agent-normalized']
      .includes(result.languageRoute)) {
    throw new TypeError('Likely non-English input cannot enter an English symbolic or heuristic route.');
  }
  if (result.languageAssessment?.classification === 'likely-non-english'
    && ['language-agent-normalization-failed', 'language-agent-normalization-rejected']
      .includes(result.languageRoute)
    && ((result.values?.length ?? 0) > 0 || (result.provenance?.length ?? 0) > 0
      || (result.usedKbVersions?.length ?? 0) > 0 || (result.consultedKbVersions?.length ?? 0) > 0
      || result.grounding !== undefined)) {
    throw new TypeError('Rejected non-English normalization cannot consult KBs or expose answer evidence.');
  }
  if (['heuristic-cnl-approximated', 'heuristic-cnl-ambiguous'].includes(result.languageRoute)
    && !result.approximation) throw new TypeError(`${result.languageRoute} requires approximation evidence.`);
  if (['heuristic-request-planned', 'heuristic-request-synthesis'].includes(result.languageRoute)
    && result.requestPlanning?.status !== 'PLANNED') {
    throw new TypeError(`${result.languageRoute} requires a PLANNED requestPlanning extension.`);
  }
  if (result.languageRoute === 'heuristic-request-ambiguous'
    && (result.status !== 'AMBIGUOUS' || result.requestPlanning?.status !== 'AMBIGUOUS')) {
    throw new TypeError('heuristic-request-ambiguous requires matching AMBIGUOUS result and request plan.');
  }
  if (result.languageRoute === 'heuristic-request-planned' && result.status !== 'MISSING_KNOWLEDGE') {
    throw new TypeError('heuristic-request-planned requires MISSING_KNOWLEDGE status.');
  }
  if (result.languageRoute === 'heuristic-cnl-ambiguous' && result.status !== 'AMBIGUOUS') {
    throw new TypeError('heuristic-cnl-ambiguous requires AMBIGUOUS status.');
  }
  if (result.languageRoute === 'heuristic-cnl-approximated'
    && !['DEFEASIBLE', 'PARTIAL', 'UNKNOWN', 'MISSING_KNOWLEDGE', 'NO_APPLICABLE_METHOD',
      'UNDERDETERMINED', 'INCONSISTENT_CONTEXT', 'RESOURCE_LIMIT', 'UNSUPPORTED_OUTPUT']
      .includes(result.status)) {
    throw new TypeError('heuristic-cnl-approximated requires a supported non-strict interpreted status.');
  }
  if (result.languageRoute === 'heuristic-request-synthesis' && !result.synthesis) {
    throw new TypeError('heuristic-request-synthesis requires a synthesis extension.');
  }
  if (result.synthesis && result.languageRoute !== 'heuristic-request-synthesis') {
    throw new TypeError('A synthesis extension is valid only on heuristic-request-synthesis.');
  }
  if (result.languageRoute.startsWith('language-agent-') && !result.normalization?.attempted) {
    throw new TypeError(`${result.languageRoute} requires attempted normalization evidence.`);
  }
  const normalizationStatus = result.normalization?.status;
  if (result.languageRoute === 'language-agent-normalized' && normalizationStatus !== 'accepted') {
    throw new TypeError('language-agent-normalized requires accepted normalization evidence.');
  }
  if (result.languageRoute === 'language-agent-normalization-failed'
    && (normalizationStatus !== 'failed' || result.status !== 'UNPARSED')) {
    throw new TypeError('language-agent-normalization-failed requires failed normalization evidence.');
  }
  if (result.languageRoute === 'language-agent-normalization-rejected'
    && (!['rejected', 'reparse-rejected', 'proposal-limit-exhausted'].includes(normalizationStatus)
      || result.status !== 'UNVERIFIED_NORMALIZATION')) {
    throw new TypeError('language-agent-normalization-rejected requires matching rejected evidence and status.');
  }
  if (result.normalization?.attempted
    && !result.languageRoute.startsWith('language-agent-')) {
    throw new TypeError('Attempted normalization requires a Language Agent language route.');
  }
  if (result.languageRoute === 'heuristic-request-synthesis') {
    if ((result.values?.length ?? 0) !== 0) {
      throw new TypeError('heuristic-request-synthesis cannot expose entailed semantic values.');
    }
    if (JSON.stringify(result.usedKbVersions)
      !== JSON.stringify(result.synthesis.contributingKbVersions)) {
      throw new TypeError('heuristic-request-synthesis KB accounting must match selected source claims.');
    }
    const realizedEvidenceIds = new Set(result.synthesis.realization.claims.filter((claim) =>
      claim.sourceKind === 'kb-evidence' && claim.status === 'realized').map((claim) => claim.evidenceIdentity));
    const realizedEntries = result.synthesis.evidence.selected.map((item) => item.entry).filter((entry) =>
      realizedEvidenceIds.has(`${entry.kbId}@${entry.kbVersion ?? 'unversioned'}:${entry.recordId}`));
    if ((result.provenance?.length ?? 0) !== realizedEntries.length) {
      throw new TypeError('heuristic-request-synthesis provenance must match realized KB records.');
    }
    result.provenance.forEach((provenance, index) => {
      const entry = realizedEntries[index];
      if (provenance.fact !== entry.recordId || provenance.kbId !== entry.kbId
        || provenance.kbVersion !== entry.kbVersion
        || JSON.stringify(provenance.source) !== JSON.stringify(entry.provenance)
        || provenance.method !== 'grounded-symbolic-realization' || provenance.sourceClaim !== true) {
        throw new TypeError('heuristic-request-synthesis provenance must identify its ordered source claims.');
      }
    });
  }
}

export function assertRuntimeResultContract(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new TypeError('Runtime result must be an object.');
  }
  if (result.protocol !== 'eslm-runtime-result-v1') {
    throw new TypeError('Runtime result protocol must be eslm-runtime-result-v1.');
  }
  if (!PUBLIC_RUNTIME_STATUS_SET.has(result.status)) {
    throw new TypeError(`Runtime result has unsupported public status ${String(result.status)}.`);
  }
  if (typeof result.languageRoute !== 'string' || result.languageRoute.length === 0) {
    throw new TypeError('Runtime result languageRoute must be a non-empty string.');
  }
  for (const field of [
    'usedKbVersions', 'selectedKbVersions', 'consultedKbVersions', 'unresolvedSubgoals',
  ]) requireArray(result, field);
  if (!result.model || typeof result.model !== 'object' || Array.isArray(result.model)) {
    throw new TypeError('Runtime result model must be an object.');
  }
  if (result.model.memory !== undefined) assertRuntimeMemoryPlanContract(result.model.memory);
  if (result.workPolicy !== undefined) assertWorkPolicy(result.workPolicy);
  assertRuntimePayloadContracts(result);
  assertRuntimeRoutePayloadInvariants(result);
  return result;
}

export function assertRuntimeTextResultContract(result) {
  assertRuntimeResultContract(result);
  if (typeof result.answer !== 'string') {
    throw new TypeError('Text runtime result answer must be a string.');
  }
  if (!result.context || typeof result.context !== 'object' || Array.isArray(result.context)
    || !result.context.session || typeof result.context.session !== 'object') {
    throw new TypeError('Text runtime result context must contain session state.');
  }
  if (!result.episode || typeof result.episode !== 'object' || Array.isArray(result.episode)
    || typeof result.episode.original !== 'string' || !Array.isArray(result.episode.segments)
    || !Array.isArray(result.episode.unsupportedStatements)) {
    throw new TypeError('Text runtime result episode must expose original, segments, and unsupported statements.');
  }
  return result;
}
