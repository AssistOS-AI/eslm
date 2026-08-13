import {
  array, boolean, boundedJson, exactKeys, finite, integer, record, string, stringArray,
} from './result-payload-shapes.mjs';
import {
  GROUNDED_RESPONSE_REALIZATION_PROTOCOL, reproduceGroundedResponseRealization,
  RESULT_REALIZATION_STRATEGIES,
} from './grounded-response-realization.mjs';

const REALIZATION_FIELDS = [
  'protocol', 'rhetoricalPlan', 'claims', 'paragraphs', 'citations', 'strategyTrace',
  'confidence', 'confidenceKind', 'coverage', 'answer',
];
const PLAN_FIELDS = ['artifact', 'format', 'length', 'title', 'sections'];
const SECTION_FIELDS = ['sectionId', 'heading', 'purpose', 'claimIds'];
const CLAIM_FIELDS = [
  'claimId', 'operationId', 'sourceKind', 'evidenceIdentity', 'citationNumber', 'strategyId',
  'status', 'confidence', 'reason', 'sentence',
];
const PARAGRAPH_FIELDS = ['paragraphId', 'sectionId', 'strategyId', 'claimIds', 'surface'];
const CITATION_FIELDS = ['citationNumber', 'evidenceIdentity', 'label', 'statement'];
const COVERAGE_FIELDS = [
  'evidenceConsidered', 'evidenceRealized', 'evidenceRejected', 'suppliedSentencesRealized',
  'complete', 'reasons',
];
const STRATEGY_IDENTITIES = new Set(Object.values(RESULT_REALIZATION_STRATEGIES));

function nullableString(value, path, maximum = 2_048) {
  if (value === null) return null;
  return string(value, path, maximum);
}

function nullableInteger(value, path, maximum = 1_000_000) {
  if (value === null) return null;
  return integer(value, path, maximum, 1);
}

function assertRhetoricalPlan(value, synthesis) {
  const path = 'Runtime result synthesis.realization.rhetoricalPlan';
  const plan = record(value, path);
  exactKeys(plan, PLAN_FIELDS, path);
  for (const field of ['artifact', 'format', 'length']) {
    string(plan[field], `${path}.${field}`);
    if (plan[field] !== synthesis.plan.outputContract[field]) {
      throw new TypeError(`${path}.${field} must match the selected output contract.`);
    }
  }
  string(plan.title, `${path}.title`, 240);
  const sections = array(plan.sections, `${path}.sections`, 64);
  const ids = new Set();
  sections.forEach((item, index) => {
    const sectionPath = `${path}.sections[${index}]`;
    const section = record(item, sectionPath);
    exactKeys(section, SECTION_FIELDS, sectionPath);
    string(section.sectionId, `${sectionPath}.sectionId`);
    nullableString(section.heading, `${sectionPath}.heading`, 240);
    string(section.purpose, `${sectionPath}.purpose`, 160);
    stringArray(section.claimIds, `${sectionPath}.claimIds`, 64);
    if (ids.has(section.sectionId)) throw new TypeError(`${path} contains a duplicate sectionId.`);
    ids.add(section.sectionId);
  });
  return { plan, sectionIds: ids };
}

function assertClaims(value, synthesis) {
  const path = 'Runtime result synthesis.realization.claims';
  const claims = array(value, path, 128);
  const ids = new Set();
  const operationIds = new Set(synthesis.operationArtifacts.map((item) => item.operationId));
  const selectedEvidence = new Set(synthesis.evidence.selected.map(({ entry }) =>
    `${entry.kbId}@${entry.kbVersion ?? 'unversioned'}:${entry.recordId}`));
  claims.forEach((item, index) => {
    const claimPath = `${path}[${index}]`;
    const claim = record(item, claimPath);
    exactKeys(claim, CLAIM_FIELDS, claimPath);
    string(claim.claimId, `${claimPath}.claimId`);
    if (claim.claimId !== `claim:${index + 1}` || ids.has(claim.claimId)) {
      throw new TypeError(`${path} claim identities must be unique and canonical.`);
    }
    ids.add(claim.claimId);
    string(claim.operationId, `${claimPath}.operationId`);
    if (!operationIds.has(claim.operationId)) {
      throw new TypeError(`${claimPath}.operationId is absent from operationArtifacts.`);
    }
    if (!['kb-evidence', 'supplied-sentence'].includes(claim.sourceKind)) {
      throw new TypeError(`${claimPath}.sourceKind is unsupported.`);
    }
    string(claim.evidenceIdentity, `${claimPath}.evidenceIdentity`, 512);
    string(claim.strategyId, `${claimPath}.strategyId`, 192);
    if (!STRATEGY_IDENTITIES.has(claim.strategyId)) {
      throw new TypeError(`${claimPath}.strategyId is not a result-realization strategy.`);
    }
    if (!['realized', 'rejected'].includes(claim.status)) {
      throw new TypeError(`${claimPath}.status is unsupported.`);
    }
    finite(claim.confidence, `${claimPath}.confidence`, 0, 1);
    string(claim.reason, `${claimPath}.reason`, 240);
    nullableString(claim.sentence, `${claimPath}.sentence`);
    nullableInteger(claim.citationNumber, `${claimPath}.citationNumber`, 128);
    if (claim.sourceKind === 'kb-evidence' && !selectedEvidence.has(claim.evidenceIdentity)) {
      throw new TypeError(`${claimPath} does not identify selected KB evidence.`);
    }
    if (claim.status === 'realized' && (!claim.sentence || claim.confidence <= 0)
      || claim.status === 'rejected' && (claim.sentence !== null || claim.confidence !== 0
        || claim.citationNumber !== null)) {
      throw new TypeError(`${claimPath} status contradicts its surface, confidence, or citation.`);
    }
    if (claim.sourceKind === 'supplied-sentence' && claim.citationNumber !== null) {
      throw new TypeError(`${claimPath} supplied material cannot masquerade as a KB citation.`);
    }
  });
  return { claims, claimIds: ids };
}

function assertCitations(value, claims) {
  const path = 'Runtime result synthesis.realization.citations';
  const citations = array(value, path, 128);
  const realizedEvidence = claims.filter((claim) =>
    claim.sourceKind === 'kb-evidence' && claim.status === 'realized');
  const evidenceIds = new Set();
  citations.forEach((item, index) => {
    const citationPath = `${path}[${index}]`;
    const citation = record(item, citationPath);
    exactKeys(citation, CITATION_FIELDS, citationPath);
    integer(citation.citationNumber, `${citationPath}.citationNumber`, 128, 1);
    if (citation.citationNumber !== index + 1) {
      throw new TypeError(`${path} citation numbers must be contiguous.`);
    }
    string(citation.evidenceIdentity, `${citationPath}.evidenceIdentity`, 512);
    string(citation.label, `${citationPath}.label`, 512);
    string(citation.statement, `${citationPath}.statement`, 2_048);
    if (evidenceIds.has(citation.evidenceIdentity)) {
      throw new TypeError(`${path} contains duplicate evidence identities.`);
    }
    evidenceIds.add(citation.evidenceIdentity);
  });
  const citedClaims = new Set(realizedEvidence.map((claim) => claim.evidenceIdentity));
  if (citedClaims.size !== citations.length
    || [...citedClaims].some((identity) => !evidenceIds.has(identity))
    || realizedEvidence.some((claim) => citations[claim.citationNumber - 1]?.evidenceIdentity
      !== claim.evidenceIdentity)) {
    throw new TypeError(`${path} must map every realized KB claim to its exact evidence identity.`);
  }
  return citations;
}

function assertParagraphs(value, claims, sectionIds, answer) {
  const path = 'Runtime result synthesis.realization.paragraphs';
  const paragraphs = array(value, path, 128);
  if (paragraphs.length === 0) throw new TypeError(`${path} must not be empty.`);
  const realizedIds = new Set(claims.filter((claim) => claim.status === 'realized')
    .map((claim) => claim.claimId));
  const represented = new Set();
  paragraphs.forEach((item, index) => {
    const paragraphPath = `${path}[${index}]`;
    const paragraph = record(item, paragraphPath);
    exactKeys(paragraph, PARAGRAPH_FIELDS, paragraphPath);
    if (paragraph.paragraphId !== `paragraph:${index + 1}`) {
      throw new TypeError(`${path} paragraph identities must be canonical.`);
    }
    string(paragraph.sectionId, `${paragraphPath}.sectionId`);
    if (!sectionIds.has(paragraph.sectionId)) {
      throw new TypeError(`${paragraphPath}.sectionId is absent from the rhetorical plan.`);
    }
    string(paragraph.strategyId, `${paragraphPath}.strategyId`, 192);
    if (!STRATEGY_IDENTITIES.has(paragraph.strategyId)) {
      throw new TypeError(`${paragraphPath}.strategyId is not registered for realization.`);
    }
    stringArray(paragraph.claimIds, `${paragraphPath}.claimIds`, 64);
    paragraph.claimIds.forEach((claimId) => {
      if (!realizedIds.has(claimId)) {
        throw new TypeError(`${paragraphPath} references an unrealized or unknown claim.`);
      }
      represented.add(claimId);
    });
    string(paragraph.surface, `${paragraphPath}.surface`, 16_384);
    if (paragraph.claimIds.length === 0 && ![
      RESULT_REALIZATION_STRATEGIES.coverageGap,
      RESULT_REALIZATION_STRATEGIES.comparisonBridge,
    ].includes(paragraph.strategyId)) {
      throw new TypeError(`${paragraphPath} without claims must be a gap or comparison paragraph.`);
    }
    if (!answer.includes(paragraph.surface)) {
      throw new TypeError(`${paragraphPath} surface is absent from the final answer.`);
    }
  });
  if (represented.size !== realizedIds.size
    || [...realizedIds].some((claimId) => !represented.has(claimId))) {
    throw new TypeError(`${path} must represent every realized claim.`);
  }
  return paragraphs;
}

function assertCoverage(value, synthesis, claims) {
  const path = 'Runtime result synthesis.realization.coverage';
  const coverage = record(value, path);
  exactKeys(coverage, COVERAGE_FIELDS, path);
  for (const field of [
    'evidenceConsidered', 'evidenceRealized', 'evidenceRejected', 'suppliedSentencesRealized',
  ]) integer(coverage[field], `${path}.${field}`, 1_000_000);
  boolean(coverage.complete, `${path}.complete`);
  stringArray(coverage.reasons, `${path}.reasons`, 64, 2_048);
  const evidenceClaims = claims.filter((claim) => claim.sourceKind === 'kb-evidence');
  const sourceClaims = claims.filter((claim) => claim.sourceKind === 'supplied-sentence');
  const operationEvidenceCount = synthesis.operationArtifacts.reduce((sum, artifact) =>
    sum + artifact.evidence.selected.length, 0);
  if (coverage.evidenceConsidered !== operationEvidenceCount
    || coverage.evidenceRealized !== evidenceClaims.filter((claim) => claim.status === 'realized').length
    || coverage.evidenceRejected !== evidenceClaims.filter((claim) => claim.status === 'rejected').length
    || coverage.suppliedSentencesRealized !== sourceClaims.filter((claim) =>
      claim.status === 'realized').length
    || coverage.evidenceRealized + coverage.evidenceRejected !== coverage.evidenceConsidered
    || coverage.complete !== false
    || JSON.stringify(coverage.reasons) !== JSON.stringify(synthesis.gaps)) {
    throw new TypeError(`${path} does not reproduce synthesis evidence and gap accounting.`);
  }
  return coverage;
}

export function assertGroundedResponseRealization(value, synthesis) {
  const path = 'Runtime result synthesis.realization';
  const realization = record(value, path);
  exactKeys(realization, REALIZATION_FIELDS, path);
  if (realization.protocol !== GROUNDED_RESPONSE_REALIZATION_PROTOCOL) {
    throw new TypeError(`${path}.protocol must be ${GROUNDED_RESPONSE_REALIZATION_PROTOCOL}.`);
  }
  string(realization.answer, `${path}.answer`, 262_144);
  if (realization.answer !== synthesis.answer) {
    throw new TypeError(`${path}.answer must own the final synthesis answer.`);
  }
  const { sectionIds } = assertRhetoricalPlan(realization.rhetoricalPlan, synthesis);
  const { claims } = assertClaims(realization.claims, synthesis);
  assertCitations(realization.citations, claims);
  assertParagraphs(realization.paragraphs, claims, sectionIds, realization.answer);
  stringArray(realization.strategyTrace, `${path}.strategyTrace`, 32, 192);
  if (new Set(realization.strategyTrace).size !== realization.strategyTrace.length
    || realization.strategyTrace.some((identity) => !STRATEGY_IDENTITIES.has(identity))) {
    throw new TypeError(`${path}.strategyTrace must contain unique registered result strategies.`);
  }
  const usedStrategies = new Set([
    RESULT_REALIZATION_STRATEGIES.rhetoricalPlanner,
    ...claims.map((claim) => claim.strategyId),
    ...realization.paragraphs.map((paragraph) => paragraph.strategyId),
  ]);
  if ([...usedStrategies].some((identity) => !realization.strategyTrace.includes(identity))) {
    throw new TypeError(`${path}.strategyTrace omits an executed realization strategy.`);
  }
  finite(realization.confidence, `${path}.confidence`, 0, 1);
  const realized = claims.filter((claim) => claim.status === 'realized');
  const expectedConfidence = Number((realized.reduce((sum, claim) => sum + claim.confidence, 0)
    / realized.length).toFixed(6));
  if (realization.confidence !== expectedConfidence
    || realization.confidenceKind !== 'construction-evidence-coverage') {
    throw new TypeError(`${path} confidence must reproduce realized claim coverage.`);
  }
  assertCoverage(realization.coverage, synthesis, claims);
  boundedJson(realization, path, 524_288);
  const reproduced = reproduceGroundedResponseRealization(synthesis);
  if (!reproduced || JSON.stringify(reproduced) !== JSON.stringify(realization)) {
    throw new TypeError(`${path} must reproduce exactly from the selected evidence and output contract.`);
  }
  return realization;
}
