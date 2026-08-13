import {
  canonicalStrings, digest, exactKeys, integer, same, sha256, stable,
} from './contract-helpers.mjs';
import {
  ANALYSIS_AUTHORITY,
  DISCOVERY_HYPOTHESIS_TYPES,
  DISCOVERY_TECHNIQUES,
  EXCLUDED_SEMANTIC_FIELDS,
  MEANING_CHANGING_CONTROLS,
  PRESERVING_TRANSFORMS,
  RESEARCH_ANALYSIS_PROTOCOL,
  RESEARCH_FEATURE_PROTOCOL,
  RESEARCH_FEATURE_SCHEMA_DIGEST,
} from './research-contract.mjs';
import { assertResearchFeatures } from './research-feature-contract.mjs';
import { runResearchStrategies, metamorphicEvidenceDigests } from './research-strategy-replay.mjs';
import {
  buildHypotheses, candidateSignature, correlationGroups, proposalLedger,
  retainedTechniqueReceipts, selectFairVotes,
} from './research-hypothesis-replay.mjs';
import { assertAnalysisLineage, componentKey } from './analysis-lineage-validator.mjs';
import { assertSplitCoverage } from './split-coverage.mjs';
import {
  assertWorkAndCoverage, deriveOmissions, expectedHandoff, replayMembers,
} from './research-work-replay.mjs';

const TECHNIQUE_IDS = DISCOVERY_TECHNIQUES.map((item) => item.id);
const ANALYSIS_IDENTIFIER = /^[a-z0-9]+(?:[._:+>-][a-z0-9]+)*$/u;
const SOURCE_PATH = /^src\/(?:[a-z0-9.-]+\/)*[a-z0-9.-]+\.mjs$/u;

function analysisIdentifier(value, path) {
  if (typeof value !== 'string' || value.length > 256 || !ANALYSIS_IDENTIFIER.test(value)) {
    throw new TypeError(`${path} must be a bounded analysis identifier.`);
  }
}

function assertAuthority(value, path, expected = ANALYSIS_AUTHORITY) {
  exactKeys(value, Object.keys(expected), path);
  if (!same(value, expected)) throw new TypeError(`${path} must remain non-authoritative and non-executable.`);
}

function validatePolicy(policy) {
  exactKeys(policy, ['format', 'progressionStage', 'limits', 'techniqueBudgets'],
    'Analysis work policy');
  if (policy.format !== 'eslm-processing-graph-research-work-policy-v1'
      || !['probe', 'pilot', 'scale'].includes(policy.progressionStage)) {
    throw new TypeError('Analysis work policy identity is unsupported.');
  }
  exactKeys(policy.limits, [
    'maxRowsScanned', 'maxEpisodes', 'maxInputBytes', 'maxTokens', 'maxActions',
    'maxDependencies', 'maxVotes', 'maxHypotheses', 'maxEvidenceDigestsPerVote',
  ], 'Analysis work policy limits');
  for (const [field, value] of Object.entries(policy.limits)) {
    integer(value, `Analysis work policy.${field}`, 1);
  }
  if (policy.limits.maxEvidenceDigestsPerVote > 14) {
    throw new TypeError('Analysis evidence-per-vote limit exceeds the nine-technique union bound.');
  }
  exactKeys(policy.techniqueBudgets, TECHNIQUE_IDS, 'Analysis technique budgets');
  for (const id of TECHNIQUE_IDS) {
    exactKeys(policy.techniqueBudgets[id], ['maxEvents', 'maxProposals'], `${id} budget`);
    integer(policy.techniqueBudgets[id].maxEvents, `${id}.maxEvents`, 1);
    integer(policy.techniqueBudgets[id].maxProposals, `${id}.maxProposals`, 1);
  }
}

function assertAnalysisEnvelope(analysis) {
  exactKeys(analysis, [
    'format', 'implementationIdentity', 'baselineGraph', 'analysis', 'registry',
    'featureSchema', 'workPolicy', 'authorization', 'inputMembership', 'evidenceLedger',
    'featureLedger', 'coverage', 'splitCoverage', 'work', 'techniques',
    'metamorphicAuditLedger', 'proposalLedger', 'correlationGroups', 'hypotheses',
    'omissions', 'completeness', 'handoff', 'authority', 'receiptDigest',
  ], 'Analysis receipt');
  if (analysis.format !== RESEARCH_ANALYSIS_PROTOCOL) {
    throw new TypeError('Analysis receipt must use the current v6 protocol.');
  }
  const unsigned = structuredClone(analysis);
  delete unsigned.receiptDigest;
  digest(analysis.receiptDigest, 'Analysis receipt digest');
  if (analysis.receiptDigest !== sha256(stable(unsigned))) {
    throw new TypeError('Analysis receipt digest does not reproduce.');
  }
  exactKeys(analysis.implementationIdentity, [
    'format', 'fileCount', 'files', 'aggregateDigest',
  ], 'Analysis implementation identity');
  if (analysis.implementationIdentity.format
      !== 'eslm-processing-graph-research-implementation-v1'
      || !Number.isSafeInteger(analysis.implementationIdentity.fileCount)
      || analysis.implementationIdentity.fileCount > 512
      || !Array.isArray(analysis.implementationIdentity.files)
      || analysis.implementationIdentity.files.length < 1
      || analysis.implementationIdentity.fileCount
        !== analysis.implementationIdentity.files.length) {
    throw new TypeError('Analysis implementation identity is incomplete.');
  }
  let priorPath = '';
  for (const file of analysis.implementationIdentity.files) {
    exactKeys(file, ['path', 'sha256'], 'Analysis implementation file');
    digest(file.sha256, 'Analysis implementation file digest');
    if (typeof file.path !== 'string' || !SOURCE_PATH.test(file.path)
        || file.path <= priorPath || file.path.includes('..')) {
      throw new TypeError('Analysis implementation files must be canonical safe paths.');
    }
    priorPath = file.path;
  }
  if (analysis.implementationIdentity.aggregateDigest !== sha256(stable({
    format: analysis.implementationIdentity.format,
    fileCount: analysis.implementationIdentity.fileCount,
    files: analysis.implementationIdentity.files,
  }))) {
    throw new TypeError('Analysis implementation aggregate digest does not reproduce.');
  }
  exactKeys(analysis.baselineGraph, ['format', 'catalogDigest', 'topologyDigest'],
    'Analysis baseline graph');
  digest(analysis.baselineGraph.catalogDigest, 'Analysis baseline catalog digest');
  digest(analysis.baselineGraph.topologyDigest, 'Analysis baseline topology digest');
  if (analysis.baselineGraph.format !== 'eslm-processing-graph-catalog-v1') {
    throw new TypeError('Analysis baseline graph protocol is unsupported.');
  }
  exactKeys(analysis.analysis, [
    'analysisId', 'version', 'seed', 'progressionStage', 'inputMode', 'selectionMethod',
  ], 'Analysis identity');
  for (const field of ['analysisId', 'version', 'seed']) {
    analysisIdentifier(analysis.analysis[field], `Analysis identity.${field}`);
  }
  if (!['probe', 'pilot', 'scale'].includes(analysis.analysis.progressionStage)
      || analysis.analysis.inputMode !== 'iterable-or-async-iterable'
      || analysis.analysis.selectionMethod !== 'bounded-min-hash-v1') {
    throw new TypeError('Analysis execution identity is unsupported.');
  }
  exactKeys(analysis.featureSchema, ['format', 'digest', 'excludedSemanticFields'],
    'Analysis feature schema');
  if (analysis.featureSchema.format !== RESEARCH_FEATURE_PROTOCOL
      || analysis.featureSchema.digest !== RESEARCH_FEATURE_SCHEMA_DIGEST
      || !same(analysis.featureSchema.excludedSemanticFields, EXCLUDED_SEMANTIC_FIELDS)) {
    throw new TypeError('Analysis feature schema is unsupported.');
  }
  validatePolicy(analysis.workPolicy);
  if (analysis.analysis.progressionStage !== analysis.workPolicy.progressionStage) {
    throw new TypeError('Analysis identity and work policy stages disagree.');
  }
  assertAuthority(analysis.authority, 'Analysis receipt.authority');
}

function replayAuthorization(analysis) {
  let allowed = 0;
  let denied = 0;
  const receipts = [];
  for (const entry of analysis.inputMembership) {
    const component = analysis.registry.components.find((item) => componentKey(item) === componentKey(entry));
    const source = analysis.registry.sources.find((item) => item.sourceId === entry.sourceId
      && item.revision === entry.revision);
    for (const member of entry.members) {
      const mapping = component?.visibility.find((item) => item.split === member.split);
      const reasons = [];
      if (!source) reasons.push('source-revision-unregistered');
      if (!component) reasons.push('component-unregistered');
      if (source?.registryState !== 'pilot-approved') reasons.push('source-not-pilot-approved');
      if (component?.rights.state !== 'approved') reasons.push('component-rights-not-approved');
      if (component && !component.rights.allowedUses.includes('processing-graph-discovery')) {
        reasons.push('analysis-use-not-authorized');
      }
      if (!mapping) reasons.push('split-unregistered');
      if (mapping && mapping.visibility !== 'training-visible') reasons.push('split-not-training-visible');
      if (mapping && mapping.rowsAdmitted < 1) reasons.push('split-not-admitted');
      if (member.visibility !== 'training-visible') reasons.push('episode-not-training-visible');
      const canonicalReasons = [...new Set(reasons)].toSorted();
      const receipt = {
        format: 'eslm-research-episode-authorization-v1',
        episodeId: member.episodeId,
        sourceId: entry.sourceId,
        componentId: entry.componentId,
        split: member.split,
        allowed: canonicalReasons.length === 0,
        reasons: canonicalReasons,
        analysisUse: 'processing-graph-discovery',
        authority: 'analysis-input-only',
      };
      receipts.push(stable(receipt));
      if (receipt.allowed) allowed += 1;
      else denied += 1;
    }
  }
  let sum = 0n;
  let xor = 0n;
  for (const receipt of receipts) {
    const value = BigInt(`0x${sha256(receipt).slice(7)}`);
    sum = (sum + value) % (1n << 256n);
    xor ^= value;
  }
  const receiptsDigest = sha256(stable({
    label: 'authorization-receipts', count: receipts.length,
    sum: sum.toString(16).padStart(64, '0'), xor: xor.toString(16).padStart(64, '0'),
  }));
  const expected = { episodesAllowed: allowed, episodesDenied: denied, receiptsDigest };
  if (!same(analysis.authorization, expected) || denied !== 0) {
    throw new TypeError('Analysis authorization does not reproduce from committed members.');
  }
}

function assertAuditVariant(variant, transformId, baselineContent, baselineSemantic, preserving) {
  exactKeys(variant, [
    'transformId', 'applied', 'episodeContentDigest', 'targetBeforeDigest',
    'targetAfterDigest', 'semanticDigest', 'passed',
  ], 'Metamorphic variant');
  for (const field of [
    'episodeContentDigest', 'targetBeforeDigest', 'targetAfterDigest', 'semanticDigest',
  ]) digest(variant[field], `Metamorphic variant.${field}`);
  const applied = variant.targetBeforeDigest !== variant.targetAfterDigest;
  const passed = applied && (preserving
    ? variant.semanticDigest === baselineSemantic : variant.semanticDigest !== baselineSemantic);
  if (variant.transformId !== transformId || variant.applied !== applied
      || (applied && variant.episodeContentDigest === baselineContent)
      || (!applied && variant.episodeContentDigest !== baselineContent)
      || variant.passed !== passed) {
    throw new TypeError('Metamorphic variant does not reproduce its target comparison.');
  }
}

function assertFeatureAndAuditLedgers(analysis, memberships, evidence) {
  if (!Array.isArray(analysis.featureLedger)
      || analysis.featureLedger.length !== evidence.size) {
    throw new TypeError('Analysis feature ledger must cover every evidence row.');
  }
  const records = [];
  let prior = '';
  for (const row of analysis.featureLedger) {
    exactKeys(row, ['evidenceDigest', 'features'], 'Analysis feature ledger row');
    assertResearchFeatures(row.features);
    const entry = evidence.get(row.evidenceDigest);
    if (row.evidenceDigest <= prior || !entry
        || row.features.semanticDigest !== entry.featureSemanticDigest) {
      throw new TypeError('Analysis feature ledger is not canonical and evidence-bound.');
    }
    const member = memberships.get(componentKey(entry)).get(entry.recordDigest);
    const dependencies = row.features.dependencyMotifs.reduce((sum, motif) => sum + motif.count, 0);
    if (member.work.actions !== row.features.trajectory.actionSignatures.length
        || member.work.dependencies !== dependencies) {
      throw new TypeError('Analysis member work does not reproduce structural features.');
    }
    records.push({
      evidenceDigest: row.evidenceDigest,
      independenceGroup: entry.independenceGroup,
      features: row.features,
    });
    prior = row.evidenceDigest;
  }
  const expectedAuditIds = metamorphicEvidenceDigests(
    records.toSorted((left, right) =>
      left.features.semanticDigest.localeCompare(right.features.semanticDigest)
        || left.evidenceDigest.localeCompare(right.evidenceDigest)),
    analysis.workPolicy.techniqueBudgets['metamorphic-recurrence-v1'],
  );
  if (!same(analysis.metamorphicAuditLedger.map((row) => row.evidenceDigest), expectedAuditIds)) {
    throw new TypeError('Metamorphic audit ledger does not cover exact selected evidence.');
  }
  const auditByEvidence = new Map();
  for (const row of analysis.metamorphicAuditLedger) {
    exactKeys(row, [
      'evidenceDigest', 'baselineEpisodeContentDigest', 'baselineSemanticDigest',
      'preserving', 'controls',
    ], 'Metamorphic audit row');
    const entry = evidence.get(row.evidenceDigest);
    if (!entry || row.baselineEpisodeContentDigest !== entry.episodeContentDigest
        || row.baselineSemanticDigest !== entry.featureSemanticDigest
        || row.preserving.length !== PRESERVING_TRANSFORMS.length
        || row.controls.length !== MEANING_CHANGING_CONTROLS.length) {
      throw new TypeError('Metamorphic audit row is not evidence-bound.');
    }
    row.preserving.forEach((variant, index) => assertAuditVariant(
      variant, PRESERVING_TRANSFORMS[index], row.baselineEpisodeContentDigest,
      row.baselineSemanticDigest, true,
    ));
    row.controls.forEach((variant, index) => assertAuditVariant(
      variant, MEANING_CHANGING_CONTROLS[index], row.baselineEpisodeContentDigest,
      row.baselineSemanticDigest, false,
    ));
    const committed = structuredClone(row);
    delete committed.evidenceDigest;
    const auditDigest = sha256(stable({
      format: 'eslm-research-metamorphic-commitment-v1', audit: committed,
    }));
    if (auditDigest !== entry.metamorphicAuditDigest) {
      throw new TypeError('Metamorphic audit does not match committed member digest.');
    }
    const appliedIds = [...row.preserving, ...row.controls]
      .filter((variant) => variant.applied).map((variant) => variant.transformId).toSorted();
    const member = memberships.get(componentKey(entry)).get(entry.recordDigest);
    if (!same(member.projectionWork.appliedTransformIds, appliedIds)) {
      throw new TypeError('Metamorphic applications do not match projection work.');
    }
    auditByEvidence.set(row.evidenceDigest, committed);
  }
  return records.toSorted((left, right) =>
    left.features.semanticDigest.localeCompare(right.features.semanticDigest)
      || left.evidenceDigest.localeCompare(right.evidenceDigest))
    .map((record) => ({ ...record, metamorphicAudit: auditByEvidence.get(record.evidenceDigest) }));
}

function assertCandidate(candidate) {
  exactKeys(candidate, [
    'type', 'responsibility', 'placement', 'inputKinds', 'outputKinds', 'invariant',
    'failureKinds', 'resourceDimensions',
  ], 'Research candidate');
  if (!DISCOVERY_HYPOTHESIS_TYPES.includes(candidate.type)) {
    throw new TypeError('Research candidate type is unsupported.');
  }
  exactKeys(candidate.placement, ['earliestAfter', 'latestBefore', 'owner'],
    'Research candidate placement');
  for (const field of ['inputKinds', 'outputKinds', 'failureKinds', 'resourceDimensions']) {
    canonicalStrings(candidate[field], `Research candidate.${field}`);
  }
}

function assertPublicLedger(analysis, evidence) {
  let prior = '';
  for (const proposal of analysis.proposalLedger) {
    exactKeys(proposal, [
      'proposalDigest', 'candidateSignature', 'candidate', 'techniqueId',
      'correlationGroup', 'direction', 'confidence', 'episodeSemanticDigests', 'evidence',
    ], 'Analysis proposal');
    assertCandidate(proposal.candidate);
    if (proposal.proposalDigest <= prior || proposal.candidateSignature !== candidateSignature(proposal.candidate)
        || !TECHNIQUE_IDS.includes(proposal.techniqueId)
        || !['support', 'oppose'].includes(proposal.direction)
        || !Number.isFinite(proposal.confidence) || proposal.confidence < 0 || proposal.confidence > 1) {
      throw new TypeError('Analysis proposal identity or vote is invalid.');
    }
    exactKeys(proposal.evidence, ['episodeCount', 'independenceGroupCount', 'evidenceDigests'],
      'Analysis proposal evidence');
    canonicalStrings(proposal.evidence.evidenceDigests, 'Analysis proposal evidence digests');
    const groups = new Set(proposal.evidence.evidenceDigests.map((item) => {
      const row = evidence.get(item);
      if (!row) throw new TypeError('Analysis proposal cites absent evidence.');
      return row.independenceGroup;
    }));
    if (proposal.evidence.episodeCount !== proposal.evidence.evidenceDigests.length
        || proposal.evidence.independenceGroupCount !== groups.size) {
      throw new TypeError('Analysis proposal evidence counters do not reproduce.');
    }
    prior = proposal.proposalDigest;
  }
}

function assertTechniqueReplay(analysis, records, evidence) {
  const strategyRun = runResearchStrategies(records, analysis.workPolicy.techniqueBudgets);
  const retained = selectFairVotes(strategyRun.proposals, analysis.workPolicy.limits.maxVotes);
  const ledger = proposalLedger(retained, analysis.workPolicy);
  const receipts = retainedTechniqueReceipts(strategyRun, ledger);
  const hypotheses = buildHypotheses(ledger, analysis.workPolicy, evidence);
  assertPublicLedger(analysis, evidence);
  for (const [index, hypothesis] of analysis.hypotheses.entries()) {
    assertCandidate(hypothesis.candidate);
    assertAuthority(hypothesis.authority, `Analysis hypothesis[${index}].authority`);
  }
  if (!same(analysis.techniques, receipts)
      || !same(analysis.metamorphicAuditLedger, strategyRun.metamorphicAuditLedger)
      || !same(analysis.proposalLedger, ledger)
      || !same(analysis.hypotheses, hypotheses.retained)
      || !same(analysis.correlationGroups, correlationGroups())) {
    throw new TypeError('Analysis techniques, proposals, or hypotheses do not reproduce from committed features.');
  }
  const expectedCounters = {
    eventsAvailable: receipts.reduce((sum, item) => sum + item.eventsAvailable, 0),
    eventsVisited: receipts.reduce((sum, item) => sum + item.eventsVisited, 0),
    votesAvailable: receipts.reduce((sum, item) => sum + item.proposalsAvailable, 0),
    votesRetained: hypotheses.retained.reduce((sum, item) => sum + item.votes.length, 0),
    hypothesesAvailable: hypotheses.available.length,
    hypothesesRetained: hypotheses.retained.length,
  };
  for (const [field, value] of Object.entries(expectedCounters)) {
    if (analysis.work[field] !== value) {
      throw new TypeError(`Analysis work.${field} does not reproduce technique replay.`);
    }
  }
  return { strategyRun, ledger, hypotheses };
}

function assertCompletenessAndHandoff(analysis, replay, techniqueReplay) {
  exactKeys(analysis.completeness, [
    'complete', 'inputComplete', 'techniquesComplete', 'votesComplete',
    'hypothesesComplete', 'scopeAbsenceClaimsAllowed',
  ], 'Analysis completeness');
  const inputComplete = replay.authenticated && replay.received.length === replay.selected.length
    && replay.selected.length === replay.analyzed.length
    && replay.analyzed.every((member) => member.work.complete);
  const techniquesComplete = analysis.techniques.every((item) => item.complete);
  const votesComplete = analysis.proposalLedger.length === analysis.work.votesAvailable;
  const hypothesesComplete = analysis.hypotheses.length === analysis.work.hypothesesAvailable;
  const complete = inputComplete && techniquesComplete && votesComplete && hypothesesComplete;
  if (analysis.completeness.inputComplete !== inputComplete
      || analysis.completeness.techniquesComplete !== techniquesComplete
      || analysis.completeness.votesComplete !== votesComplete
      || analysis.completeness.hypothesesComplete !== hypothesesComplete
      || analysis.completeness.complete !== complete
      || analysis.completeness.scopeAbsenceClaimsAllowed !== complete) {
    throw new TypeError('Analysis completeness does not reproduce from machine work.');
  }
  const omissions = deriveOmissions(
    analysis, replay, techniqueReplay.strategyRun, techniqueReplay.ledger,
    techniqueReplay.hypotheses,
  );
  if (!same(analysis.omissions, omissions)) {
    throw new TypeError('Analysis omissions do not reproduce deterministic work replay.');
  }
  if (!same(analysis.handoff, expectedHandoff(analysis, complete, omissions))) {
    throw new TypeError('Analysis handoff must remain exact and recommendation-only.');
  }
}

export function assertPortableResearchAnalysis(analysis, { expectedRegistry } = {}) {
  assertAnalysisEnvelope(analysis);
  const { memberships, evidence } = assertAnalysisLineage(analysis, expectedRegistry);
  replayAuthorization(analysis);
  const replay = replayMembers(analysis);
  assertWorkAndCoverage(analysis, replay);
  assertSplitCoverage(analysis, analysis.registry);
  if (!replay.authenticated && (analysis.evidenceLedger.length > 0
      || analysis.proposalLedger.length > 0 || analysis.hypotheses.length > 0)) {
    throw new TypeError('Unauthenticated membership cannot support evidence or hypotheses.');
  }
  const records = assertFeatureAndAuditLedgers(analysis, memberships, evidence);
  const techniqueReplay = assertTechniqueReplay(analysis, records, evidence);
  assertCompletenessAndHandoff(analysis, replay, techniqueReplay);
  return analysis;
}
