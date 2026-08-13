import { sha256, stableStringify } from '../util.mjs';
import {
  assertResearchProjectionContentMembers,
  researchProjectionContentMembershipDigest,
  researchProjectionMembershipDigest,
} from './research-projection-membership.mjs';
import { assertResearchSourceRegistry } from './research-source-registry.mjs';

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const IDENTIFIER = /^[a-z0-9]+(?:[._:+>-][a-z0-9]+)*$/u;

function exact(value, fields, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
      || stableStringify(Object.keys(value).toSorted()) !== stableStringify([...fields].toSorted())) {
    throw new TypeError(`${path} must contain exactly: ${fields.join(', ')}.`);
  }
}

function digest(value, path) {
  if (typeof value !== 'string' || !DIGEST.test(value)) {
    throw new TypeError(`${path} must be a SHA-256 digest.`);
  }
}

function identifier(value, path) {
  if (typeof value !== 'string' || value.length > 256 || !IDENTIFIER.test(value)) {
    throw new TypeError(`${path} must be a bounded canonical identifier.`);
  }
}

function count(value, path) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${path} must be a bounded non-negative integer.`);
  }
}

function componentKey(value) {
  return `${value.sourceId}@${value.revision}:${value.componentId}`;
}

function sourceRegistry(snapshot) {
  return {
    format: snapshot.format,
    sources: snapshot.sources,
    components: snapshot.components,
    digest: snapshot.digest,
  };
}

export function researchAnalysisRegistrySnapshot(registry) {
  assertResearchSourceRegistry(registry);
  const independenceGroups = [...new Set(registry.sources
    .map((source) => source.independenceGroup))].toSorted();
  return {
    format: registry.format,
    digest: registry.digest,
    sources: structuredClone(registry.sources),
    components: structuredClone(registry.components),
    sourceCount: registry.sources.length,
    independenceGroupCount: independenceGroups.length,
    independenceGroups,
    componentCount: registry.components.length,
    projectionDigests: [...new Set(registry.components
      .map((component) => component.projection.membershipDigest))].toSorted(),
  };
}

export function researchInputMembership(registry, observedByComponent) {
  assertResearchSourceRegistry(registry);
  return registry.components.map((component) => {
    const observed = [...(observedByComponent.get(componentKey(component)) ?? [])]
      .toSorted((left, right) => left.recordDigest.localeCompare(right.recordDigest));
    const recordDigests = observed.map((item) => item.recordDigest);
    const observedMembershipDigest = researchProjectionMembershipDigest(
      component.projection.projectionId, recordDigests, component.identity.rows,
    );
    const observedContentMembershipDigest = researchProjectionContentMembershipDigest(
      component.projection.projectionId, observed, component.identity.rows,
    );
    return {
      sourceId: component.sourceId,
      revision: component.revision,
      componentId: component.componentId,
      projectionId: component.projection.projectionId,
      rawRows: component.identity.rows,
      expectedEpisodes: component.projection.rows,
      receivedEpisodes: recordDigests.length,
      expectedMembershipDigest: component.projection.membershipDigest,
      observedMembershipDigest,
      expectedContentMembershipDigest: component.projection.contentMembershipDigest,
      observedContentMembershipDigest,
      members: observed,
      complete: recordDigests.length === component.projection.rows
        && observedMembershipDigest === component.projection.membershipDigest
        && observedContentMembershipDigest === component.projection.contentMembershipDigest,
    };
  }).toSorted((left, right) => componentKey(left).localeCompare(componentKey(right)));
}

function assertRegistrySnapshot(snapshot) {
  exact(snapshot, [
    'format', 'digest', 'sources', 'components', 'sourceCount', 'independenceGroupCount',
    'independenceGroups', 'componentCount', 'projectionDigests',
  ], 'Research analysis registry');
  const registry = sourceRegistry(snapshot);
  assertResearchSourceRegistry(registry);
  const expected = researchAnalysisRegistrySnapshot(registry);
  if (stableStringify(snapshot) !== stableStringify(expected)) {
    throw new TypeError('Research analysis registry summary does not reproduce from its frozen registry.');
  }
  return registry;
}

function assertMembership(entries, registry, coverage, work) {
  if (!Array.isArray(entries) || entries.length !== registry.components.length) {
    throw new TypeError('Research input membership must cover every registered component.');
  }
  const memberships = new Map();
  let priorKey = '';
  let received = 0;
  const episodeIds = new Set();
  for (const [index, entry] of entries.entries()) {
    const path = `Research input membership[${index}]`;
    exact(entry, [
      'sourceId', 'revision', 'componentId', 'projectionId', 'rawRows',
      'expectedEpisodes', 'receivedEpisodes', 'expectedMembershipDigest',
      'observedMembershipDigest', 'expectedContentMembershipDigest',
      'observedContentMembershipDigest', 'members', 'complete',
    ], path);
    for (const field of ['sourceId', 'revision', 'componentId', 'projectionId']) {
      identifier(entry[field], `${path}.${field}`);
    }
    for (const field of ['rawRows', 'expectedEpisodes', 'receivedEpisodes']) {
      count(entry[field], `${path}.${field}`);
    }
    digest(entry.expectedMembershipDigest, `${path}.expectedMembershipDigest`);
    digest(entry.observedMembershipDigest, `${path}.observedMembershipDigest`);
    digest(entry.expectedContentMembershipDigest, `${path}.expectedContentMembershipDigest`);
    digest(entry.observedContentMembershipDigest, `${path}.observedContentMembershipDigest`);
    assertResearchProjectionContentMembers(entry.members, entry.rawRows);
    if (entry.members.length !== entry.receivedEpisodes || entry.members.length > 1_000_000) {
      throw new TypeError(`${path}.members must cover the received projection rows.`);
    }
    for (const member of entry.members) {
      if (episodeIds.has(member.episodeId)) {
        throw new TypeError('Research input membership episode identities must be globally unique.');
      }
      episodeIds.add(member.episodeId);
    }
    const recordDigests = entry.members.map((member) => member.recordDigest);
    const key = componentKey(entry);
    const component = registry.components.find((item) => componentKey(item) === key);
    const coverageRow = coverage.componentProjections.find((item) => componentKey(item) === key);
    const recomputedDigest = researchProjectionMembershipDigest(
      entry.projectionId, recordDigests, entry.rawRows,
    );
    const recomputedContentDigest = researchProjectionContentMembershipDigest(
      entry.projectionId, entry.members, entry.rawRows,
    );
    const expectedComplete = entry.receivedEpisodes === entry.expectedEpisodes
      && entry.observedMembershipDigest === entry.expectedMembershipDigest
      && entry.observedContentMembershipDigest === entry.expectedContentMembershipDigest;
    if (key <= priorKey || !component || !coverageRow
        || entry.projectionId !== component.projection.projectionId
        || entry.rawRows !== component.identity.rows
        || entry.expectedEpisodes !== component.projection.rows
        || entry.expectedMembershipDigest !== component.projection.membershipDigest
        || entry.expectedContentMembershipDigest !== component.projection.contentMembershipDigest
        || entry.receivedEpisodes !== coverageRow.received.episodes
        || entry.observedMembershipDigest !== recomputedDigest
        || entry.observedContentMembershipDigest !== recomputedContentDigest
        || entry.complete !== expectedComplete) {
      throw new TypeError(`${path} does not reproduce its registry-bound projection membership.`);
    }
    memberships.set(key, new Map(entry.members.map((member) => [
      member.recordDigest, member,
    ])));
    received += entry.receivedEpisodes;
    priorKey = key;
  }
  if (received !== work.episodesReceived) {
    throw new TypeError('Research input membership does not reproduce received episode work.');
  }
  return memberships;
}

function expectedEvidenceDigest(entry) {
  return `sha256:${sha256(stableStringify({
    format: 'eslm-research-evidence-reference-v3',
    sourceId: entry.sourceId,
    revision: entry.revision,
    componentId: entry.componentId,
    projectionDigest: entry.projectionDigest,
    recordDigest: entry.recordDigest,
    episodeContentDigest: entry.episodeContentDigest,
    featureSemanticDigest: entry.featureSemanticDigest,
    metamorphicAuditDigest: entry.metamorphicAuditDigest,
  }))}`;
}

function assertEvidence(entries, registry, coverage, memberships, work) {
  if (!Array.isArray(entries) || entries.length !== work.episodesAnalyzed) {
    throw new TypeError('Research evidence ledger must cover every analyzed episode.');
  }
  const evidence = new Map();
  let priorEvidence = '';
  for (const [index, entry] of entries.entries()) {
    const path = `Evidence ledger[${index}]`;
    exact(entry, [
      'evidenceDigest', 'sourceId', 'revision', 'componentId', 'projectionDigest',
      'recordDigest', 'episodeContentDigest', 'featureSemanticDigest', 'independenceGroup',
      'metamorphicAuditDigest',
    ], path);
    for (const field of [
      'evidenceDigest', 'projectionDigest', 'recordDigest', 'episodeContentDigest',
      'featureSemanticDigest',
      'metamorphicAuditDigest',
    ]) {
      digest(entry[field], `${path}.${field}`);
    }
    for (const field of ['sourceId', 'revision', 'componentId', 'independenceGroup']) {
      identifier(entry[field], `${path}.${field}`);
    }
    const key = componentKey(entry);
    const source = registry.sources.find((item) =>
      item.sourceId === entry.sourceId && item.revision === entry.revision);
    const component = registry.components.find((item) => componentKey(item) === key);
    const coverageRow = coverage.componentProjections.find((item) => componentKey(item) === key);
    if (entry.evidenceDigest <= priorEvidence || evidence.has(entry.evidenceDigest)
        || !source || !component || !coverageRow
        || source.independenceGroup !== entry.independenceGroup
        || component.projection.membershipDigest !== entry.projectionDigest
        || coverageRow.independenceGroup !== entry.independenceGroup
        || memberships.get(key)?.get(entry.recordDigest)?.episodeContentDigest
          !== entry.episodeContentDigest
        || memberships.get(key)?.get(entry.recordDigest)?.featureSemanticDigest
          !== entry.featureSemanticDigest
        || memberships.get(key)?.get(entry.recordDigest)?.metamorphicAuditDigest
          !== entry.metamorphicAuditDigest
        || entry.evidenceDigest !== expectedEvidenceDigest(entry)) {
      throw new TypeError('Research evidence ledger must be canonical and registry-bound.');
    }
    evidence.set(entry.evidenceDigest, entry);
    priorEvidence = entry.evidenceDigest;
  }
  return evidence;
}

export function assertResearchAnalysisLineage(report) {
  const registry = assertRegistrySnapshot(report.registry);
  const memberships = assertMembership(
    report.inputMembership, registry, report.coverage, report.work,
  );
  const evidenceLedger = assertEvidence(
    report.evidenceLedger, registry, report.coverage, memberships, report.work,
  );
  return { registry, memberships, evidenceLedger };
}

export function assertExpectedResearchRegistry(report, expectedRegistryDigest) {
  digest(expectedRegistryDigest, 'Expected research registry digest');
  if (report.registry.digest !== expectedRegistryDigest) {
    throw new TypeError('Processing-graph research analysis uses a different reviewed source registry.');
  }
  return report;
}
