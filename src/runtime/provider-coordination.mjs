import { runOptionalProviderQuery } from './provider-query-lifecycle.mjs';

export function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function kbIdentity(value) {
  return {
    kbId: value.manifest?.kbId ?? value.kbId ?? value.manifest?.id ?? value.id,
    version: value.manifest?.kbVersion ?? value.version,
  };
}

function providerIdentityKey(provider) {
  const identity = kbIdentity(provider);
  return `${identity.kbId}\u0000${identity.version}`;
}

export function canonicalProviders(providers) {
  if (!Array.isArray(providers)) throw new TypeError('Runtime providers must be an array.');
  for (const provider of providers) {
    const identity = kbIdentity(provider);
    if (typeof provider?.manifest?.id !== 'string' || provider.manifest.id.length === 0
      || typeof identity.kbId !== 'string' || identity.kbId.length === 0
      || typeof identity.version !== 'string' || identity.version.length === 0) {
      throw new TypeError('Runtime providers require non-empty id, kbId, and kbVersion strings.');
    }
  }
  const ordered = [...providers].toSorted((left, right) =>
    compareText(providerIdentityKey(left), providerIdentityKey(right)));
  const identities = ordered.map(providerIdentityKey);
  if (new Set(identities).size !== identities.length) {
    throw new Error('Runtime providers require a unique immutable (kbId, kbVersion) identity.');
  }
  return ordered;
}

export function canonicalMemoryPlan(memoryPlan) {
  if (!memoryPlan) return undefined;
  return {
    ...memoryPlan,
    providers: [...(memoryPlan.providers ?? [])].toSorted((left, right) =>
      compareText(String(left.id), String(right.id))),
  };
}

export function uniqueKbVersions(values) {
  const seen = new Set();
  const result = [];
  for (const value of values.filter((item) => item?.kbId)) {
    const key = `${value.kbId}\u0000${value.version ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ kbId: value.kbId, ...(value.version ? { version: value.version } : {}) });
  }
  return result.toSorted((left, right) =>
    compareText(left.kbId, right.kbId) || compareText(String(left.version), String(right.version)));
}

export function resultProviderIds(result) {
  return new Set([
    ...(result.query?.routedProviders ?? []),
    result.query?.provider,
  ].filter(Boolean));
}

function validateScoreContribution(contribution) {
  if (!contribution || typeof contribution !== 'object' || Array.isArray(contribution)
    || !Number.isFinite(contribution.score) || !Array.isArray(contribution.evidence)
    || contribution.evidence.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new TypeError('Provider score contribution requires a finite score and an array of evidence objects.');
  }
  return contribution;
}

export async function scoreWithProviderContributions(core, providers, operation, args) {
  const coreResult = core.score(args.join(' '));
  let score = coreResult.score;
  const evidence = [];
  const knowledgeDiagnostics = [];
  for (const provider of providers) {
    if (typeof provider[operation] !== 'function') continue;
    const queried = await runOptionalProviderQuery(provider, operation, async () =>
      validateScoreContribution(await provider[operation](...args)));
    knowledgeDiagnostics.push(...queried.diagnostics);
    if (!queried.value) continue;
    score += queried.value.score;
    evidence.push(...queried.value.evidence.map((item) => ({
      ...item,
      provider: provider.manifest.id,
    })));
  }
  return {
    ...coreResult,
    score,
    evidence,
    ...(knowledgeDiagnostics.length > 0 ? { knowledgeDiagnostics } : {}),
  };
}

function narrativeEvidenceRequest(task) {
  if (task?.operation !== 'select-narrative-continuation') return undefined;
  return Object.freeze({
    kind: 'event-continuation-ranking',
    narrative: task.narrative,
    candidates: task.candidates,
  });
}

function validateSemanticEvidence(evidence, provider, request) {
  if (evidence === undefined || evidence === null) return undefined;
  const candidateIds = new Set(request.candidates.map((candidate) => candidate.candidateId));
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)
    || evidence.providerId !== provider.manifest.id
    || evidence.providerVersion !== provider.manifest.kbVersion
    || typeof evidence.semanticType !== 'string' || evidence.semanticType.length === 0
    || !Array.isArray(evidence.candidates) || evidence.candidates.length > 32) {
    throw new TypeError('Provider semantic evidence has an invalid identity or top-level contract.');
  }
  const seen = new Set();
  let supportRecords = 0;
  for (const candidate of evidence.candidates) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)
      || !candidateIds.has(candidate.candidateId) || seen.has(candidate.candidateId)
      || !Array.isArray(candidate.support) || candidate.support.length > 64) {
      throw new TypeError('Provider semantic evidence has an invalid candidate contract.');
    }
    seen.add(candidate.candidateId);
    supportRecords += candidate.support.length;
    if (candidate.support.some((item) => !item || typeof item !== 'object' || Array.isArray(item)
      || !Number.isFinite(item.score))) {
      throw new TypeError('Provider semantic evidence support requires finite numeric scores.');
    }
  }
  if (supportRecords > 512) throw new TypeError('Provider semantic evidence exceeds 512 support records.');
  return evidence;
}

export async function collectTaskProviderEvidence(providers, task) {
  const request = narrativeEvidenceRequest(task);
  const semanticEvidence = [];
  const consultedProviders = [];
  const providersByAdapterId = new Map();
  const knowledgeDiagnostics = [];
  if (!request) {
    return { semanticEvidence, consultedProviders, providersByAdapterId, knowledgeDiagnostics };
  }
  for (const provider of providers) {
    if (typeof provider.semanticEvidence !== 'function') continue;
    const identity = kbIdentity(provider);
    consultedProviders.push(identity);
    const queried = await runOptionalProviderQuery(provider, 'semanticEvidence', async () =>
      validateSemanticEvidence(await provider.semanticEvidence(request), provider, request));
    knowledgeDiagnostics.push(...queried.diagnostics);
    if (!queried.value) continue;
    semanticEvidence.push(queried.value);
    providersByAdapterId.set(provider.manifest.id, identity);
  }
  return { semanticEvidence, consultedProviders, providersByAdapterId, knowledgeDiagnostics };
}

export function contributingEvidenceProviders(result, evidence, providersByAdapterId) {
  const selectedCandidateId = result.status === 'DEFEASIBLE' ? result.values?.[0] : undefined;
  if (!selectedCandidateId) return [];
  return evidence.filter((providerEvidence) => providerEvidence.candidates?.some((candidate) =>
    candidate.candidateId === selectedCandidateId
      && candidate.support?.some((item) => Number.isFinite(item.score) && item.score !== 0)))
    .map((providerEvidence) => providersByAdapterId.get(providerEvidence.providerId))
    .filter(Boolean);
}
