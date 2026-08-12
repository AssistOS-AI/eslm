import {
  array, boolean, boundedJson, finite, integer, jsonBytes, kbIdentityArray, record, string,
  stringArray,
} from './result-payload-shapes.mjs';
import { assertGroundingEntry } from './result-grounding-entry-contract.mjs';

const SYNTHESIS_PROTOCOL = 'eslm-heuristic-request-synthesis-v1';

function synthesisSelection(selection, path, selectedIdentities) {
  const value = record(selection, path);
  assertGroundingEntry(value.entry, `${path}.entry`);
  stringArray(value.topicIds, `${path}.topicIds`, 64);
  finite(value.topicScore, `${path}.topicScore`, 0, 1_000_000);
  finite(value.selectionScore, `${path}.selectionScore`, 0, 1_000_000);
  stringArray(value.reasons, `${path}.reasons`, 64, 512);
  for (const identity of value.entry.contributingKbVersions) {
    selectedIdentities?.set(`${identity.kbId}\u0000${identity.version ?? ''}`, identity);
  }
  return value;
}

function synthesisEvidence(value, path, selectedIdentities) {
  const evidence = record(value, path);
  const selected = array(evidence.selected, `${path}.selected`, 32);
  const seen = new Set();
  selected.forEach((selection, index) => synthesisSelection(
    selection, `${path}.selected[${index}]`, selectedIdentities,
  ));
  selected.forEach((selection) => {
    const identity = `${selection.entry.kbId}\u0000${selection.entry.kbVersion ?? ''}`
      + `\u0000${selection.entry.recordId}`;
    if (seen.has(identity)) throw new TypeError(`${path}.selected contains duplicate source evidence.`);
    seen.add(identity);
  });
  for (const field of ['candidatesConsidered', 'unrelatedEntriesOmitted', 'budgetOmitted']) {
    integer(evidence[field], `${path}.${field}`, 512);
  }
  if (evidence.candidatesConsidered < selected.length
    || evidence.budgetOmitted !== evidence.candidatesConsidered - selected.length) {
    throw new TypeError(`${path} has inconsistent evidence-selection counters.`);
  }
  return evidence;
}

function synthesisEvidencePopulation(evidence, groundingEntryCount, path) {
  if (groundingEntryCount !== undefined
    && evidence.candidatesConsidered + evidence.unrelatedEntriesOmitted !== groundingEntryCount) {
    throw new TypeError(`${path} does not account for the grounding entry population.`);
  }
}

function synthesisSourceSummary(value, path) {
  if (value === null) return null;
  const summary = record(value, path);
  const selected = array(summary.selected, `${path}.selected`, 8);
  selected.forEach((item, index) => {
    const itemPath = `${path}.selected[${index}]`;
    const sentence = record(item, itemPath);
    integer(sentence.index, `${itemPath}.index`, 1_000_000);
    string(sentence.surface, `${itemPath}.surface`, 480);
    integer(sentence.originalCharacters, `${itemPath}.originalCharacters`, 65_536, 1);
    integer(sentence.retainedCharacters, `${itemPath}.retainedCharacters`, 480, 1);
    boolean(sentence.complete, `${itemPath}.complete`);
    stringArray(sentence.tokens, `${itemPath}.tokens`, 256, 480);
    finite(sentence.score, `${itemPath}.score`, 0, 1_000_000);
    if (sentence.retainedCharacters !== sentence.surface.length
      || sentence.originalCharacters < sentence.retainedCharacters
      || sentence.complete !== (sentence.originalCharacters === sentence.retainedCharacters)) {
      throw new TypeError(`${itemPath} has inconsistent source-summary character accounting.`);
    }
  });
  integer(summary.omitted, `${path}.omitted`, 1_000_000);
  boolean(summary.complete, `${path}.complete`);
  integer(summary.truncatedSentences, `${path}.truncatedSentences`, 1_000_000);
  if (summary.complete !== (summary.omitted === 0 && summary.truncatedSentences === 0)) {
    throw new TypeError(`${path}.complete contradicts summary omissions or truncations.`);
  }
  return summary;
}

function synthesisCorrelation(value, path) {
  if (value === null) return null;
  const correlation = record(value, path);
  stringArray(correlation.sharedRelations, `${path}.sharedRelations`, 64, 480);
  string(correlation.statement, `${path}.statement`, 4_096);
  boundedJson(correlation, path, 65_536);
  return correlation;
}

function synthesisOperationArtifacts(synthesis, result, groundingEntryCount) {
  const path = 'Runtime result synthesis.operationArtifacts';
  const artifacts = array(synthesis.operationArtifacts, path, 8);
  const operationPlans = result.requestPlanning.selectedPlan.operationPlans;
  if (artifacts.length !== operationPlans.length || artifacts.length === 0) {
    throw new TypeError(`${path} must correspond one-to-one with selectedPlan.operationPlans.`);
  }
  const selectedByIdentity = new Map();
  artifacts.forEach((value, index) => {
    const artifactPath = `${path}[${index}]`;
    const artifact = record(value, artifactPath);
    const operation = operationPlans[index];
    if (artifact.operationId !== operation.operationId || artifact.order !== operation.order
      || artifact.intent !== operation.intent
      || JSON.stringify(artifact.topicIds) !== JSON.stringify(operation.topicIds)
      || JSON.stringify(artifact.outputContract) !== JSON.stringify(operation.outputContract)) {
      throw new TypeError(`${artifactPath} contradicts its ordered selected operation.`);
    }
    synthesisSourceSummary(artifact.sourceSummary, `${artifactPath}.sourceSummary`);
    const evidence = synthesisEvidence(artifact.evidence, `${artifactPath}.evidence`);
    synthesisEvidencePopulation(evidence, groundingEntryCount, `${artifactPath}.evidence`);
    synthesisCorrelation(artifact.correlation, `${artifactPath}.correlation`);
    stringArray(artifact.gaps, `${artifactPath}.gaps`, 64, 2_048);
    if (artifact.gaps.length === 0 || artifact.complete !== false) {
      throw new TypeError(`${artifactPath} must retain an incomplete structural coverage gap.`);
    }
    for (const selection of evidence.selected) {
      const identity = `${selection.entry.kbId}@${selection.entry.kbVersion ?? 'unversioned'}`
        + `:${selection.entry.recordId}`;
      const previous = selectedByIdentity.get(identity);
      if (!previous) selectedByIdentity.set(identity, selection);
      else selectedByIdentity.set(identity, {
        ...previous,
        topicIds: [...new Set([...previous.topicIds, ...selection.topicIds])],
        topicScore: Math.max(previous.topicScore, selection.topicScore),
        selectionScore: Math.max(previous.selectionScore, selection.selectionScore),
        reasons: [...new Set([...previous.reasons, ...selection.reasons])],
      });
    }
    boundedJson(artifact, artifactPath, 524_288);
  });
  return [...selectedByIdentity.values()];
}

export function assertSynthesisExtension(value, result) {
  const synthesis = record(value, 'Runtime result synthesis');
  if (synthesis.protocol !== SYNTHESIS_PROTOCOL || synthesis.status !== 'PARTIAL') {
    throw new TypeError(`Runtime result synthesis must use ${SYNTHESIS_PROTOCOL} with PARTIAL status.`);
  }
  string(synthesis.answer, 'Runtime result synthesis.answer', 262_144);
  if (synthesis.claimMode !== 'extractive-source-and-related-kb-draft'
    || synthesis.answerAuthority !== 'related-evidence-is-not-entailment') {
    throw new TypeError('Runtime result synthesis must preserve extractive non-entailment authority.');
  }
  record(synthesis.plan, 'Runtime result synthesis.plan');
  const selectedIdentities = new Map();
  const aggregateEvidence = synthesisEvidence(
    synthesis.evidence, 'Runtime result synthesis.evidence', selectedIdentities,
  );
  const groundingEntryCount = Array.isArray(result.grounding?.entries)
    ? result.grounding.entries.length : undefined;
  synthesisEvidencePopulation(
    aggregateEvidence, groundingEntryCount, 'Runtime result synthesis.evidence',
  );
  stringArray(synthesis.gaps, 'Runtime result synthesis.gaps', 64, 2_048);
  if (synthesis.gaps.length === 0) {
    throw new TypeError('Runtime result synthesis must retain at least one structural coverage gap.');
  }
  kbIdentityArray(synthesis.contributingKbVersions,
    'Runtime result synthesis.contributingKbVersions', 32, true);
  const declaredIdentities = new Set(synthesis.contributingKbVersions.map((identity) =>
    `${identity.kbId}\u0000${identity.version ?? ''}`));
  if (declaredIdentities.size !== selectedIdentities.size
    || [...selectedIdentities.keys()].some((identity) => !declaredIdentities.has(identity))) {
    throw new TypeError('Runtime result synthesis contributing KBs must match selected evidence.');
  }
  if (result.answer !== synthesis.answer || result.status !== 'PARTIAL') {
    throw new TypeError('heuristic request synthesis must own the matching PARTIAL answer.');
  }
  if (!result.requestPlanning?.selectedPlan) {
    throw new TypeError('Runtime result synthesis requires requestPlanning.selectedPlan.');
  }
  if (jsonBytes(synthesis.plan, 'Runtime result synthesis.plan', 262_144)
    !== jsonBytes(result.requestPlanning.selectedPlan,
      'Runtime result requestPlanning.selectedPlan', 262_144)) {
    throw new TypeError('Runtime result synthesis plan must match requestPlanning.selectedPlan.');
  }
  const mergedOperationSelections = synthesisOperationArtifacts(
    synthesis, result, groundingEntryCount,
  );
  if (JSON.stringify(aggregateEvidence.selected) !== JSON.stringify(mergedOperationSelections)) {
    throw new TypeError('Runtime result synthesis aggregate evidence must merge ordered operation evidence.');
  }
  synthesisSourceSummary(synthesis.sourceSummary, 'Runtime result synthesis.sourceSummary');
  synthesisCorrelation(synthesis.correlation, 'Runtime result synthesis.correlation');
  const firstCorrelation = synthesis.operationArtifacts.find((artifact) => artifact.correlation)?.correlation ?? null;
  if (JSON.stringify(synthesis.correlation) !== JSON.stringify(firstCorrelation)) {
    throw new TypeError('Runtime result synthesis correlation must match its first operation correlation.');
  }
  if (synthesis.operationArtifacts.length === 1
    && JSON.stringify(synthesis.sourceSummary)
      !== JSON.stringify(synthesis.operationArtifacts[0].sourceSummary)) {
    throw new TypeError('Single-operation synthesis source summary must match its operation artifact.');
  }
  boundedJson(synthesis, 'Runtime result synthesis', 1_048_576);
  return synthesis;
}
