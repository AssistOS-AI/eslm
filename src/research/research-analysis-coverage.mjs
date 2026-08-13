import { stableStringify } from '../util.mjs';

export const RESEARCH_ANALYSIS_COVERAGE_PROTOCOL =
  'eslm-processing-graph-research-coverage-v1';

const PHASES = Object.freeze(['received', 'selected', 'analyzed']);
const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const IDENTIFIER = /^[a-z0-9]+(?:[._:-][a-z0-9]+)*$/u;
const WORK_FIELDS = Object.freeze(['episodes', 'sourceBytes', 'tokens', 'actions', 'dependencies']);

function exact(value, fields, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
      || stableStringify(Object.keys(value).toSorted())
        !== stableStringify([...fields].toSorted())) {
    throw new TypeError(`${path} must contain exactly: ${fields.join(', ')}.`);
  }
}

function count(value, path) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${path} must be a bounded non-negative integer.`);
  }
}

function identifier(value, path) {
  if (typeof value !== 'string' || value.length > 128 || !IDENTIFIER.test(value)) {
    throw new TypeError(`${path} must be a bounded canonical identifier.`);
  }
}

function assertWork(work, path) {
  exact(work, WORK_FIELDS, path);
  for (const field of WORK_FIELDS) count(work[field], `${path}.${field}`);
}

function emptyWork() {
  return { episodes: 0, sourceBytes: 0, tokens: 0, actions: 0, dependencies: 0 };
}

function addWork(target, work) {
  target.episodes += work.episodes;
  target.sourceBytes += work.sourceBytes;
  target.tokens += work.tokens;
  target.actions += work.actions;
  target.dependencies += work.dependencies;
}

function componentKey(value) {
  return `${value.sourceId}@${value.revision}:${value.componentId}`;
}

function sourceKey(value) {
  return `${value.sourceId}@${value.revision}`;
}

function completeComponent(row) {
  return row.received.episodes === row.availableEpisodes
    && row.selected.episodes === row.availableEpisodes
    && row.analyzed.episodes === row.availableEpisodes
    && row.upstreamIncompleteEpisodes === 0;
}

export function createResearchCoverageTracker(registry) {
  return new Map(registry.components.map((component) => [componentKey(component), {
    sourceId: component.sourceId,
    revision: component.revision,
    independenceGroup: registry.sources.find((source) =>
      source.sourceId === component.sourceId && source.revision === component.revision)
      .independenceGroup,
    componentId: component.componentId,
    projectionId: component.projection.projectionId,
    projectionDigest: component.projection.membershipDigest,
    contentMembershipDigest: component.projection.contentMembershipDigest,
    splitCoverage: component.visibility.map((split) => ({
      ...structuredClone(split), rowsReceived: 0, rowsSelected: 0, rowsAnalyzed: 0,
    })),
    availableEpisodes: component.projection.rows,
    received: emptyWork(),
    selected: emptyWork(),
    analyzed: emptyWork(),
    upstreamIncompleteEpisodes: 0,
    complete: false,
  }]));
}

export function recordResearchCoverageWork(tracker, phase, episode) {
  if (!PHASES.includes(phase)) throw new TypeError(`Unknown research coverage phase ${phase}.`);
  const row = tracker.get(componentKey(episode.source));
  if (!row) throw new TypeError('Research coverage episode has no registered component projection.');
  const split = row.splitCoverage.find((item) => item.split === episode.source.split
    && item.visibility === episode.source.visibility);
  if (!split || split.visibility !== 'training-visible') {
    throw new TypeError('Research coverage episode has no admitted training split.');
  }
  split[`rows${phase[0].toUpperCase()}${phase.slice(1)}`] += 1;
  addWork(row[phase], {
    episodes: 1,
    sourceBytes: episode.work.sourceBytes,
    tokens: episode.work.tokens,
    actions: episode.work.actions,
    dependencies: episode.work.dependencies,
  });
  if (phase === 'analyzed' && !episode.work.complete) row.upstreamIncompleteEpisodes += 1;
}

export function summarizeResearchCoverageSources(componentProjections) {
  const grouped = new Map();
  for (const component of componentProjections) {
    const key = sourceKey(component);
    const row = grouped.get(key) ?? {
      sourceId: component.sourceId,
      revision: component.revision,
      independenceGroup: component.independenceGroup,
      componentCount: 0,
      projectionCount: 0,
      availableEpisodes: 0,
      received: emptyWork(),
      selected: emptyWork(),
      analyzed: emptyWork(),
      upstreamIncompleteEpisodes: 0,
      complete: true,
    };
    if (row.independenceGroup !== component.independenceGroup) {
      throw new TypeError(`Research source ${key} has conflicting independence groups.`);
    }
    row.componentCount += 1;
    row.projectionCount += 1;
    row.availableEpisodes += component.availableEpisodes;
    for (const phase of PHASES) addWork(row[phase], component[phase]);
    row.upstreamIncompleteEpisodes += component.upstreamIncompleteEpisodes;
    row.complete &&= component.complete;
    grouped.set(key, row);
  }
  return [...grouped.values()].toSorted((left, right) =>
    sourceKey(left).localeCompare(sourceKey(right)));
}

export function finalizeResearchCoverage(tracker) {
  const componentProjections = [...tracker.values()]
    .map((row) => ({ ...row, complete: completeComponent(row) }))
    .toSorted((left, right) => componentKey(left).localeCompare(componentKey(right)));
  return {
    format: RESEARCH_ANALYSIS_COVERAGE_PROTOCOL,
    sources: summarizeResearchCoverageSources(componentProjections),
    componentProjections,
  };
}

function assertComponentCoverage(row, index) {
  const path = `Research component projection coverage[${index}]`;
  exact(row, [
    'sourceId', 'revision', 'independenceGroup', 'componentId', 'projectionId', 'projectionDigest',
    'contentMembershipDigest', 'splitCoverage',
    'availableEpisodes', 'received', 'selected', 'analyzed',
    'upstreamIncompleteEpisodes', 'complete',
  ], path);
  for (const field of ['sourceId', 'revision', 'independenceGroup', 'componentId', 'projectionId']) {
    identifier(row[field], `${path}.${field}`);
  }
  if (![row.projectionDigest, row.contentMembershipDigest]
    .every((value) => typeof value === 'string' && DIGEST.test(value))) {
    throw new TypeError(`${path} projection identities must be SHA-256 digests.`);
  }
  if (!Array.isArray(row.splitCoverage) || row.splitCoverage.length < 1) {
    throw new TypeError(`${path}.splitCoverage must be non-empty.`);
  }
  let priorSplit = '';
  let declaredRows = 0;
  let admittedRows = 0;
  for (const [splitIndex, split] of row.splitCoverage.entries()) {
    const splitPath = `${path}.splitCoverage[${splitIndex}]`;
    exact(split, [
      'split', 'visibility', 'rowsDeclared', 'rowsAdmitted',
      'rowsReceived', 'rowsSelected', 'rowsAnalyzed',
    ], splitPath);
    identifier(split.split, `${splitPath}.split`);
    count(split.rowsDeclared, `${splitPath}.rowsDeclared`);
    for (const field of [
      'rowsAdmitted', 'rowsReceived', 'rowsSelected', 'rowsAnalyzed',
    ]) count(split[field], `${splitPath}.${field}`);
    if (!['training-visible', 'development-visible', 'protected'].includes(split.visibility)
        || split.split <= priorSplit || split.rowsAdmitted > split.rowsDeclared
        || split.rowsReceived > split.rowsAdmitted || split.rowsSelected > split.rowsReceived
        || split.rowsAnalyzed > split.rowsSelected
        || (split.visibility !== 'training-visible'
          && [split.rowsAdmitted, split.rowsReceived, split.rowsSelected, split.rowsAnalyzed]
            .some((value) => value !== 0))) {
      throw new TypeError(`${splitPath} is not a canonical visible split.`);
    }
    priorSplit = split.split;
    declaredRows += split.rowsDeclared;
    admittedRows += split.rowsAdmitted;
  }
  if (declaredRows < admittedRows || admittedRows !== row.availableEpisodes) {
    throw new TypeError(`${path}.splitCoverage does not reproduce available episodes.`);
  }
  count(row.availableEpisodes, `${path}.availableEpisodes`);
  if (row.availableEpisodes < 1) throw new TypeError(`${path}.availableEpisodes must be positive.`);
  for (const phase of PHASES) assertWork(row[phase], `${path}.${phase}`);
  for (const phase of PHASES) {
    const field = `rows${phase[0].toUpperCase()}${phase.slice(1)}`;
    if (row.splitCoverage.reduce((sum, split) => sum + split[field], 0) !== row[phase].episodes) {
      throw new TypeError(`${path}.splitCoverage does not reproduce ${phase} episodes.`);
    }
  }
  count(row.upstreamIncompleteEpisodes, `${path}.upstreamIncompleteEpisodes`);
  if (row.received.episodes > row.availableEpisodes
      || row.selected.episodes > row.received.episodes
      || row.analyzed.episodes > row.selected.episodes
      || row.upstreamIncompleteEpisodes > row.analyzed.episodes) {
    throw new TypeError(`${path} episode phases do not reconcile.`);
  }
  for (const field of WORK_FIELDS.slice(1)) {
    if (row.selected[field] > row.received[field]
        || row.analyzed[field] > row.selected[field]) {
      throw new TypeError(`${path} ${field} phases do not reconcile.`);
    }
  }
  if (typeof row.complete !== 'boolean' || row.complete !== completeComponent(row)) {
    throw new TypeError(`${path}.complete does not reproduce from its phase counts.`);
  }
}

export function researchSplitCoverage(coverage) {
  const rows = coverage.componentProjections.flatMap((component) =>
    component.splitCoverage.map((split) => ({
      sourceId: component.sourceId,
      revision: component.revision,
      componentId: component.componentId,
      ...structuredClone(split),
    })));
  return rows.toSorted((left, right) =>
    `${componentKey(left)}:${left.split}`.localeCompare(`${componentKey(right)}:${right.split}`));
}

function assertSourceCoverage(row, index) {
  const path = `Research source coverage[${index}]`;
  exact(row, [
    'sourceId', 'revision', 'independenceGroup', 'componentCount', 'projectionCount', 'availableEpisodes',
    'received', 'selected', 'analyzed', 'upstreamIncompleteEpisodes', 'complete',
  ], path);
  identifier(row.sourceId, `${path}.sourceId`);
  identifier(row.revision, `${path}.revision`);
  identifier(row.independenceGroup, `${path}.independenceGroup`);
  for (const field of [
    'componentCount', 'projectionCount', 'availableEpisodes', 'upstreamIncompleteEpisodes',
  ]) count(row[field], `${path}.${field}`);
  for (const phase of PHASES) assertWork(row[phase], `${path}.${phase}`);
  if (typeof row.complete !== 'boolean') throw new TypeError(`${path}.complete must be boolean.`);
}

function sum(componentProjections, select) {
  return componentProjections.reduce((total, row) => total + select(row), 0);
}

export function assertResearchAnalysisCoverage(coverage, { registry, work, inputComplete }) {
  exact(coverage, ['format', 'sources', 'componentProjections'], 'Research analysis coverage');
  if (coverage.format !== RESEARCH_ANALYSIS_COVERAGE_PROTOCOL
      || !Array.isArray(coverage.sources) || coverage.sources.length !== registry.sourceCount
      || !Array.isArray(coverage.componentProjections)
      || coverage.componentProjections.length !== registry.componentCount) {
    throw new TypeError('Research analysis coverage protocol or identity counts are inconsistent.');
  }
  let priorComponent = '';
  for (const [index, row] of coverage.componentProjections.entries()) {
    assertComponentCoverage(row, index);
    const key = componentKey(row);
    if (key <= priorComponent) throw new TypeError('Research component coverage must be unique and canonical.');
    priorComponent = key;
  }
  let priorSource = '';
  for (const [index, row] of coverage.sources.entries()) {
    assertSourceCoverage(row, index);
    const key = sourceKey(row);
    if (key <= priorSource) throw new TypeError('Research source coverage must be unique and canonical.');
    priorSource = key;
  }
  const recomputedSources = summarizeResearchCoverageSources(coverage.componentProjections);
  if (stableStringify(coverage.sources) !== stableStringify(recomputedSources)) {
    throw new TypeError('Research source coverage does not reproduce from component projections.');
  }
  const projectionDigests = [...new Set(coverage.componentProjections
    .map((row) => row.projectionDigest))].toSorted();
  if (stableStringify(projectionDigests) !== stableStringify(registry.projectionDigests)) {
    throw new TypeError('Research coverage projection identities do not match the registry summary.');
  }
  for (const component of registry.components) {
    const row = coverage.componentProjections.find((item) =>
      componentKey(item) === componentKey(component));
    const source = registry.sources.find((item) => item.sourceId === component.sourceId
      && item.revision === component.revision);
    if (!row || !source
        || row.sourceId !== component.sourceId || row.revision !== component.revision
        || row.componentId !== component.componentId
        || row.independenceGroup !== source.independenceGroup
        || row.projectionId !== component.projection.projectionId
        || row.projectionDigest !== component.projection.membershipDigest
        || row.contentMembershipDigest !== component.projection.contentMembershipDigest
        || stableStringify(row.splitCoverage.map((split) => ({
          split: split.split, visibility: split.visibility,
          rowsDeclared: split.rowsDeclared, rowsAdmitted: split.rowsAdmitted,
        }))) !== stableStringify(component.visibility)) {
      throw new TypeError('Research coverage does not bind exact content membership and split coverage.');
    }
  }
  const aggregateFields = [
    ['availableEpisodes', (row) => row.availableEpisodes, 'episodesAvailable'],
    ['receivedEpisodes', (row) => row.received.episodes, 'episodesReceived'],
    ['selectedEpisodes', (row) => row.selected.episodes, 'episodesSelected'],
    ['analyzedEpisodes', (row) => row.analyzed.episodes, 'episodesAnalyzed'],
    ['receivedBytes', (row) => row.received.sourceBytes, 'sourceBytesDeclared'],
    ['selectedBytes', (row) => row.selected.sourceBytes, 'sourceBytesSelected'],
    ['analyzedBytes', (row) => row.analyzed.sourceBytes, 'sourceBytesAnalyzed'],
    ['receivedTokens', (row) => row.received.tokens, 'tokensDeclared'],
    ['selectedTokens', (row) => row.selected.tokens, 'tokensSelected'],
    ['analyzedTokens', (row) => row.analyzed.tokens, 'tokensAnalyzed'],
    ['receivedActions', (row) => row.received.actions, 'actionsDeclared'],
    ['selectedActions', (row) => row.selected.actions, 'actionsSelected'],
    ['analyzedActions', (row) => row.analyzed.actions, 'actionsAnalyzed'],
    ['receivedDependencies', (row) => row.received.dependencies, 'dependenciesDeclared'],
    ['selectedDependencies', (row) => row.selected.dependencies, 'dependenciesSelected'],
    ['analyzedDependencies', (row) => row.analyzed.dependencies, 'dependenciesAnalyzed'],
  ];
  for (const [label, select, workField] of aggregateFields) {
    if (sum(coverage.componentProjections, select) !== work[workField]) {
      throw new TypeError(`Research ${label} coverage does not reconcile with aggregate work.`);
    }
  }
  const coverageComplete = coverage.componentProjections.every((row) => row.complete);
  if (coverageComplete !== inputComplete) {
    throw new TypeError('Research input completeness does not reproduce from component coverage.');
  }
  return coverage;
}
