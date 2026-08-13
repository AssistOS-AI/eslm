import assert from 'node:assert/strict';
import test from 'node:test';
import { readdir, readFile } from 'node:fs/promises';
import {
  PROCESSING_GRAPH_DISCOVERY_TECHNIQUES,
  PROCESSING_GRAPH_RESEARCH_ANALYSIS_PROTOCOL,
  RESEARCH_EPISODE_FEATURE_PROTOCOL,
  RESEARCH_MEANING_CHANGING_CONTROLS,
  RESEARCH_PRESERVING_TRANSFORMS,
  analyzeProcessingGraphResearch,
  assertCurrentProcessingGraphResearchAnalysis,
  assertProcessingGraphResearchAnalysis,
  assertResearchEpisode,
  auditResearchEpisodeMetamorphs,
  authorizeResearchEpisode,
  compactResearchMetamorphicAudit,
  createResearchEpisode,
  createResearchSourceRegistry,
  processingGraphResearchImplementationIdentity,
  projectResearchEpisodeFeatures,
  researchAnalysisRegistrySnapshot,
  researchEpisodeContentDigest,
  researchEpisodeContentMember,
  researchEpisodeFeatureSemanticDigest,
  researchProjectionContentMembershipDigest,
  researchProjectionMembershipDigest,
  resolveProcessingGraphResearchWorkPolicy,
} from '../src/research/processing-graph-research.mjs';
import { projectCompactResearchMetamorphicAudit } from
  '../src/research/research-metamorphic-controls.mjs';
import {
  PROCESSING_GRAPH_CATALOG,
  processingGraphCatalogDigest,
  processingGraphTopologyDigest,
} from '../src/processing-graph/index.mjs';
import { sha256, stableStringify } from '../src/util.mjs';
import {
  createStructuralNegativeContrast,
  createSyntheticProcessingGraphResearchFixture,
} from './fixtures/processing-graph-research-fixture.mjs';

function rebuildRegistry(registry, mutateComponent, mutateSource = (value) => value) {
  return createResearchSourceRegistry({
    sources: registry.sources.map((source, index) => mutateSource(structuredClone(source), index)),
    components: registry.components.map((component, index) =>
      mutateComponent(structuredClone(component), index)),
  });
}

function registryForEpisodes(registry, episodes) {
  return rebuildRegistry(registry, (component) => {
    const componentEpisodes = episodes.filter((episode) => episode.source.sourceId === component.sourceId
      && episode.source.revision === component.revision
      && episode.source.componentId === component.componentId);
    const members = componentEpisodes.map((episode) => episode.provenance.recordDigest);
    component.projection.membershipDigest = researchProjectionMembershipDigest(
      component.projection.projectionId, members, component.identity.rows,
    );
    component.projection.contentMembershipDigest = researchProjectionContentMembershipDigest(
      component.projection.projectionId,
      componentEpisodes.map(researchEpisodeContentMember),
      component.identity.rows,
    );
    return component;
  });
}

function alignEpisodesToRegistry(episodes, registry) {
  const components = new Map(registry.components.map((component) => [
    `${component.sourceId}@${component.revision}:${component.componentId}`, component,
  ]));
  return episodes.map((episode) => {
    const value = structuredClone(episode);
    const key = `${value.source.sourceId}@${value.source.revision}:${value.source.componentId}`;
    value.source.projectionDigest = components.get(key).projection.membershipDigest;
    return createResearchEpisode(value);
  });
}

function semanticHypothesisView(report) {
  return report.hypotheses.map((hypothesis) => ({
    hypothesisId: hypothesis.hypothesisId,
    candidate: hypothesis.candidate,
    score: hypothesis.score,
    status: hypothesis.status,
    votes: hypothesis.votes.map((vote) => ({
      techniqueId: vote.techniqueId,
      correlationGroup: vote.correlationGroup,
      direction: vote.direction,
      confidence: vote.confidence,
      episodeCount: vote.evidence.episodeCount,
      independenceGroupCount: vote.evidence.independenceGroupCount,
    })),
  }));
}

function resignReport(report) {
  delete report.receiptDigest;
  report.receiptDigest = `sha256:${sha256(stableStringify(report))}`;
  return report;
}

function resignImplementationIdentity(identity) {
  identity.aggregateDigest = `sha256:${sha256(stableStringify({
    format: identity.format,
    fileCount: identity.fileCount,
    files: identity.files,
  }))}`;
}

test('synthetic research corpus covers multi-step task families and all hypothesis types', async () => {
  const { registry, episodes } = createSyntheticProcessingGraphResearchFixture();
  assert.equal(registry.sources.length, 3);
  assert.equal(episodes.length, 16);
  for (const episode of episodes) {
    assert.equal(assertResearchEpisode(episode), episode);
    assert.ok(episode.actions.length >= 4);
    assert.equal(authorizeResearchEpisode(registry, episode).allowed, true);
  }
  const operations = new Set(episodes.flatMap((episode) => episode.request.operationKinds));
  assert.deepEqual([...operations].toSorted(), [
    'acquire-evidence', 'compare', 'construct', 'invoke-tool', 'plan', 'reason', 'repair',
    'summarize', 'verify',
  ]);
  assert.ok(episodes.some((episode) => episode.actions.some((action) => action.kind === 'select-tool')));
  assert.ok(episodes.some((episode) => episode.actions.some((action) => action.outcome === 'failed')));

  const report = await analyzeProcessingGraphResearch({ registry, episodes });
  assert.equal(report.format, PROCESSING_GRAPH_RESEARCH_ANALYSIS_PROTOCOL);
  assert.equal(assertProcessingGraphResearchAnalysis(report), report);
  assert.equal(report.completeness.complete, true);
  assert.equal(report.handoff.recommendedStage, 'pilot');
  assert.equal(report.handoff.authority, 'recommendation-only');
  const crossSource = report.techniques.find((item) =>
    item.techniqueId === 'cross-source-recurrence-v1');
  assert.ok(crossSource.eventsAvailable > 0);
  assert.equal(crossSource.eventsAvailable, crossSource.proposalsAvailable);
  assert.deepEqual([...new Set(report.hypotheses.map((item) => item.candidate.type))].toSorted(), [
    'authority-gate', 'coordination-node', 'edge', 'nested-circuit', 'packet-field',
    'processing-node', 'strategy',
  ]);
  assert.deepEqual(report.techniques.map((item) => item.techniqueId),
    PROCESSING_GRAPH_DISCOVERY_TECHNIQUES.map((item) => item.id));
  assert.ok(report.hypotheses.some((item) => item.score.supportCorrelationGroups >= 2));
  assert.ok(report.hypotheses.every((item) => item.authority.runtime === 'none'
    && item.authority.answer === 'none' && item.authority.executablePolicy === false));
});

test('rights denial is authoritative and prevents feature analysis', async () => {
  const fixture = createSyntheticProcessingGraphResearchFixture();
  const deniedRegistry = rebuildRegistry(fixture.registry, (component, index) => {
    if (index === 0) component.rights.state = 'denied';
    return component;
  });
  const episode = fixture.episodes.find((item) =>
    item.source.sourceId === deniedRegistry.components[0].sourceId);
  const receipt = authorizeResearchEpisode(deniedRegistry, episode);
  assert.equal(receipt.allowed, false);
  assert.ok(receipt.reasons.includes('component-rights-not-approved'));
  await assert.rejects(
    analyzeProcessingGraphResearch({ registry: deniedRegistry, episodes: [episode] }),
    /not authorized.*component-rights-not-approved/u,
  );
});

test('development, hidden, and test visibility cannot support discovery', async () => {
  const fixture = createSyntheticProcessingGraphResearchFixture();
  const base = fixture.episodes[0];
  for (const split of ['development', 'test', 'shadow']) {
    const visibility = split === 'development' ? 'development-visible' : 'protected';
    const registry = rebuildRegistry(fixture.registry, (component) => {
      if (component.sourceId === base.source.sourceId) {
        component.visibility.push({
          split, visibility, rowsDeclared: 0, rowsAdmitted: 0,
        });
        component.visibility.sort((left, right) => left.split.localeCompare(right.split));
      }
      return component;
    });
    const changed = structuredClone(base);
    changed.episodeId = `${base.episodeId}-${split}`;
    changed.source.split = split;
    changed.source.visibility = visibility;
    changed.provenance.sourceNativeIds = [`native-${split}`];
    const episode = createResearchEpisode(changed);
    assert.deepEqual(authorizeResearchEpisode(registry, episode).reasons,
      ['episode-not-training-visible', 'split-not-admitted', 'split-not-training-visible']);
    await assert.rejects(analyzeProcessingGraphResearch({ registry, episodes: [episode] }),
      /split-not-training-visible/u);
  }
});

test('zero-admitted and over-quota training splits are rejected before semantic projection', async () => {
  const fixture = createSyntheticProcessingGraphResearchFixture({ namespace: 'split-quota' });
  const base = fixture.episodes[0];
  const zeroRegistry = rebuildRegistry(fixture.registry, (component) => {
    if (component.sourceId === base.source.sourceId) {
      component.visibility.unshift({
        split: 'not-admitted', visibility: 'training-visible', rowsDeclared: 0, rowsAdmitted: 0,
      });
      component.visibility.sort((left, right) => left.split.localeCompare(right.split));
    }
    return component;
  });
  const zero = structuredClone(base);
  zero.source.split = 'not-admitted';
  const zeroEpisode = createResearchEpisode(zero);
  assert.ok(authorizeResearchEpisode(zeroRegistry, zeroEpisode).reasons.includes('split-not-admitted'));
  await assert.rejects(analyzeProcessingGraphResearch({
    registry: zeroRegistry, episodes: [zeroEpisode],
  }), /split-not-admitted/u);

  const quotaRegistry = rebuildRegistry(fixture.registry, (component) => {
    if (component.sourceId === base.source.sourceId) {
      component.visibility[0].rowsAdmitted = 1;
      component.projection.rows = 1;
    }
    return component;
  });
  const sameSource = fixture.episodes.filter((episode) => episode.source.sourceId === base.source.sourceId);
  await assert.rejects(analyzeProcessingGraphResearch({
    registry: quotaRegistry, episodes: sameSource.slice(0, 2),
  }), /exceeds its admitted row quota/u);
});

test('semantic projection excludes source identities, lexical values, and provenance joins', () => {
  const first = createSyntheticProcessingGraphResearchFixture({ namespace: 'synthetic' });
  const renamed = createSyntheticProcessingGraphResearchFixture({ namespace: 'renamed' });
  for (let index = 0; index < first.episodes.length; index += 1) {
    const originalEpisode = first.episodes[index];
    const renamedEpisode = renamed.episodes[index];
    const features = projectResearchEpisodeFeatures(originalEpisode);
    assert.equal(features.format, RESEARCH_EPISODE_FEATURE_PROTOCOL);
    assert.deepEqual(features, projectResearchEpisodeFeatures(renamedEpisode));
    const serialized = JSON.stringify(features);
    assert.doesNotMatch(serialized, /synthetic-source|native-|complete the|synthetic-summarization/u);
    assert.doesNotMatch(serialized, new RegExp(originalEpisode.actions[0].arguments[0].value, 'u'));
  }
});

test('metamorphic technique proves preserving transforms and rejects a meaning-changing control', async () => {
  const fixture = createSyntheticProcessingGraphResearchFixture({ namespace: 'metamorphic-nonce' });
  const audit = auditResearchEpisodeMetamorphs(fixture.episodes[0]);
  assert.equal(audit.format, 'eslm-research-episode-metamorphic-audit-v1');
  assert.equal(audit.preservationComplete, true);
  assert.equal(audit.controlsDiscriminated, true);
  assert.deepEqual(audit.preservingVariants.map((item) => item.transformId), [
    'opaque-join-identity-renaming',
    'nonce-argument-value-renaming',
    'request-surface-paraphrase',
    'independent-equivalent-action-ordering',
    'irrelevant-provenance-evidence-insertion',
    'unordered-feedback-permutation',
  ]);
  assert.deepEqual(audit.controlVariants.map((item) => item.transformId), [
    'structural-contract-inversion', 'constraint-contract-change', 'outcome-witness-change',
  ]);
  const report = await analyzeProcessingGraphResearch({
    registry: fixture.registry, episodes: fixture.episodes,
  });
  const receipt = report.techniques.find((item) =>
    item.techniqueId === 'metamorphic-recurrence-v1');
  assert.equal(receipt.transformProtocol, audit.format);
  assert.ok(receipt.preservationChecks > 0);
  assert.equal(receipt.preservationFailures, 0);
  assert.ok(receipt.controlChecks > 0);
  assert.equal(receipt.controlFailures, 0);
  assert.ok(report.hypotheses.some((hypothesis) => hypothesis.votes.some((vote) =>
    vote.techniqueId === 'metamorphic-recurrence-v1' && vote.direction === 'support')));
  for (const type of ['processing-node', 'nested-circuit']) {
    assert.ok(report.hypotheses.some((hypothesis) => hypothesis.candidate.type === type
      && hypothesis.votes.some((vote) =>
        vote.techniqueId === 'metamorphic-recurrence-v1' && vote.direction === 'support')));
  }
});

test('compact metamorphic projection is exactly equivalent to the review audit projection', () => {
  const fixture = createSyntheticProcessingGraphResearchFixture({ namespace: 'metamorphic-compact' });
  const episode = fixture.episodes[0];
  const fullAudit = auditResearchEpisodeMetamorphs(episode);
  const compactProjection = projectCompactResearchMetamorphicAudit(episode);
  assert.deepEqual(compactProjection, {
    features: fullAudit.baseline,
    metamorphicAudit: compactResearchMetamorphicAudit(fullAudit),
  });
});

test('metamorphic work budget bounds transformed records instead of post-hoc counters', async () => {
  const fixture = createSyntheticProcessingGraphResearchFixture({ namespace: 'metamorphic-budget' });
  const workPolicy = resolveProcessingGraphResearchWorkPolicy({
    techniqueBudgets: { 'metamorphic-recurrence-v1': { maxEvents: 1, maxProposals: 8 } },
  });
  const report = await analyzeProcessingGraphResearch({
    registry: fixture.registry, episodes: fixture.episodes, workPolicy,
  });
  const receipt = report.techniques.find((item) =>
    item.techniqueId === 'metamorphic-recurrence-v1');
  assert.equal(receipt.eventsVisited, 1);
  assert.equal(receipt.preservationChecks, report.metamorphicAuditLedger
    .flatMap((row) => row.preserving).filter((variant) => variant.applied).length);
  assert.equal(receipt.controlChecks, report.metamorphicAuditLedger
    .flatMap((row) => row.controls).filter((variant) => variant.applied).length);
  assert.ok(receipt.preservationChecks < RESEARCH_PRESERVING_TRANSFORMS.length);
  assert.equal(receipt.complete, false);
});

test('metamorphic checks require transform-specific target changes, not collateral edits', () => {
  const fixture = createSyntheticProcessingGraphResearchFixture({ namespace: 'metamorphic-noop' });
  const input = structuredClone(fixture.episodes[0]);
  input.request.visibleText =
    'Carry out the same bounded typed task using the declared constraints.';
  input.provenance.spans = [{ field: 'request-text', start: 0, end: 5 }];
  const audit = auditResearchEpisodeMetamorphs(createResearchEpisode(input));
  const requestParaphrase = audit.preservingVariants.find((variant) =>
    variant.transformId === 'request-surface-paraphrase');
  assert.equal(requestParaphrase.applied, false);
  assert.equal(researchEpisodeContentDigest(requestParaphrase.episode),
    researchEpisodeContentDigest(input));
  assert.equal(requestParaphrase.targetBeforeDigest, requestParaphrase.targetAfterDigest);
});

test('bulk analysis is deterministic for arrays, reversed input, and async shards', async () => {
  const fixture = createSyntheticProcessingGraphResearchFixture();
  async function* shards() {
    yield* fixture.episodes.slice(8);
    yield* fixture.episodes.slice(0, 8);
  }
  const [ordered, reversed, streamed] = await Promise.all([
    analyzeProcessingGraphResearch({ registry: fixture.registry, episodes: fixture.episodes }),
    analyzeProcessingGraphResearch({ registry: fixture.registry, episodes: [...fixture.episodes].reverse() }),
    analyzeProcessingGraphResearch({ registry: fixture.registry, episodes: shards() }),
  ]);
  assert.deepEqual(ordered, reversed);
  assert.deepEqual(ordered, streamed);
  assert.equal(streamed.handoff.shardContract.inputMode, 'iterable-or-async-iterable');
  assert.equal(streamed.handoff.shardContract.selection, 'bounded-min-hash-v1');
});

test('stream analysis detaches compact carriers before requesting the next episode', async () => {
  const fixture = createSyntheticProcessingGraphResearchFixture({ namespace: 'detached-carrier' });
  async function* mutatingSource() {
    for (const original of fixture.episodes) {
      const episode = structuredClone(original);
      yield episode;
      episode.source.sourceId = 'post-yield-mutation';
      episode.provenance.recordDigest = `sha256:${'f'.repeat(64)}`;
      episode.request.operationKinds = ['post-yield-mutation'];
      episode.actions[0].kind = 'post-yield-mutation';
      episode.work.sourceBytes = 1;
    }
  }
  const expected = await analyzeProcessingGraphResearch({
    registry: fixture.registry, episodes: fixture.episodes,
  });
  const actual = await analyzeProcessingGraphResearch({
    registry: fixture.registry, episodes: mutatingSource(),
  });
  assert.deepEqual(actual, expected);
});

test('projection completeness rejects a duplicate episode substituted for a missing member', async () => {
  const fixture = createSyntheticProcessingGraphResearchFixture({ namespace: 'duplicate-membership' });
  const duplicated = [...fixture.episodes.slice(0, -1), fixture.episodes[0]];
  await assert.rejects(
    analyzeProcessingGraphResearch({ registry: fixture.registry, episodes: duplicated }),
    /duplicate episode or projection membership/u,
  );
});

test('projection completeness rejects a unique fabricated member with valid aggregate metadata', async () => {
  const fixture = createSyntheticProcessingGraphResearchFixture({ namespace: 'forged-membership' });
  const forged = structuredClone(fixture.episodes.at(-1));
  forged.episodeId = `${forged.episodeId}-forged`;
  forged.provenance.recordDigest = `sha256:${'f'.repeat(64)}`;
  const episodes = [...fixture.episodes.slice(0, -1), createResearchEpisode(forged)];
  await assert.rejects(
    analyzeProcessingGraphResearch({ registry: fixture.registry, episodes }),
    /does not match its registered projection membership/u,
  );
});

test('frozen projection content rejects structural mutation with unchanged raw record identity', async () => {
  const fixture = createSyntheticProcessingGraphResearchFixture({ namespace: 'content-commitment' });
  const changed = structuredClone(fixture.episodes[0]);
  changed.request.operationKinds = ['verify'];
  changed.request.artifactKind = 'verification-report';
  changed.request.requiredCapabilities = ['verify'];
  const forged = createResearchEpisode(changed);
  assert.equal(forged.provenance.recordDigest, fixture.episodes[0].provenance.recordDigest);
  assert.notEqual(researchEpisodeContentDigest(forged),
    researchEpisodeContentDigest(fixture.episodes[0]));
  await assert.rejects(analyzeProcessingGraphResearch({
    registry: fixture.registry,
    episodes: [forged, ...fixture.episodes.slice(1)],
  }), /does not match its registered projection membership/u);
});

test('incomplete membership cannot turn a rogue allowed row into evidence or hypotheses', async () => {
  const fixture = createSyntheticProcessingGraphResearchFixture({ namespace: 'rogue-frontier' });
  const rogue = structuredClone(fixture.episodes[0]);
  rogue.episodeId = 'rogue-frontier-episode';
  rogue.request.operationKinds = ['verify'];
  rogue.provenance.recordDigest = `sha256:${sha256('rogue-frontier-record')}`;
  const report = await analyzeProcessingGraphResearch({
    registry: fixture.registry, episodes: [createResearchEpisode(rogue)],
  });
  assert.equal(report.completeness.inputComplete, false);
  assert.equal(report.evidenceLedger.length, 0);
  assert.equal(report.featureLedger.length, 0);
  assert.equal(report.proposalLedger.length, 0);
  assert.equal(report.hypotheses.length, 0);
  assert.ok(report.omissions.some((item) => item.reason === 'membership-not-authenticated'));
  assert.equal(assertProcessingGraphResearchAnalysis(report), report);
});

test('content membership preserves repeated semantic projections from distinct raw records', () => {
  const contentDigest = `sha256:${sha256('same-projected-content')}`;
  const members = [0, 1].map((index) => ({
    episodeId: `episode-${index}`,
    recordDigest: `sha256:${sha256(`record-${index}`)}`,
    episodeContentDigest: contentDigest,
    featureSemanticDigest: `sha256:${sha256('same-feature-content')}`,
    metamorphicAuditDigest: `sha256:${sha256('same-metamorphic-audit')}`,
    split: 'training', visibility: 'training-visible',
    work: { sourceBytes: 1, tokens: 1, actions: 0, dependencies: 0, complete: true },
    projectionWork: {
      featureEvaluations: 10, metamorphicTransformsAttempted: 9,
      metamorphicTransformsApplied: 9,
      appliedTransformIds: [
        ...RESEARCH_PRESERVING_TRANSFORMS, ...RESEARCH_MEANING_CHANGING_CONTROLS,
      ].toSorted(),
      complete: true,
    },
  })).toSorted((left, right) => left.recordDigest.localeCompare(right.recordDigest));
  assert.doesNotThrow(() => researchProjectionContentMembershipDigest(
    'projection:repeated-semantics', members, 2,
  ));
  assert.throws(() => researchProjectionMembershipDigest(
    'projection:repeated-raw-record', [contentDigest, contentDigest], 2,
  ), /membership inputs are invalid/u);
});

test('analysis binds canonical implementation files and the validated baseline graph', async () => {
  const fixture = createSyntheticProcessingGraphResearchFixture();
  const [report, directIdentity] = await Promise.all([
    analyzeProcessingGraphResearch({ registry: fixture.registry, episodes: fixture.episodes }),
    processingGraphResearchImplementationIdentity(),
  ]);
  assert.equal(report.format, 'eslm-processing-graph-research-analysis-v6');
  assert.deepEqual(report.implementationIdentity, directIdentity);
  assert.equal(report.implementationIdentity.fileCount, report.implementationIdentity.files.length);
  assert.deepEqual(report.implementationIdentity.files.map((file) => file.path),
    report.implementationIdentity.files.map((file) => file.path).toSorted());
  assert.ok(report.implementationIdentity.files.some((file) =>
    file.path === 'src/research/processing-graph-research-analyzer.mjs'));
  assert.ok(report.implementationIdentity.files.some((file) =>
    file.path === 'src/processing-graph/processing-graph-catalog.mjs'));
  for (const path of [
    'src/research/research-episode-membership.mjs',
    'src/strategy/builtin-strategy-catalog.mjs',
    'src/strategy/strategy-contract.mjs',
    'src/reasoning/capability-registry.mjs',
    'src/language/heuristic-request-patterns.mjs',
    'src/util.mjs',
  ]) {
    assert.ok(report.implementationIdentity.files.some((file) => file.path === path), path);
  }
  const serializedIdentity = JSON.stringify(report.implementationIdentity);
  assert.doesNotMatch(serializedIdentity, /training\/\.cache|\/home\/|timestamp|mtime|ctime/u);
  assert.deepEqual(report.baselineGraph, {
    format: PROCESSING_GRAPH_CATALOG.format,
    catalogDigest: processingGraphCatalogDigest(PROCESSING_GRAPH_CATALOG),
    topologyDigest: processingGraphTopologyDigest(PROCESSING_GRAPH_CATALOG),
  });
  assert.equal(await assertCurrentProcessingGraphResearchAnalysis(report, {
    expectedRegistryDigest: fixture.registry.digest,
  }), report);
});

test('currentness rejects re-signed implementation and baseline mutations', async () => {
  const fixture = createSyntheticProcessingGraphResearchFixture();
  const report = await analyzeProcessingGraphResearch({
    registry: fixture.registry, episodes: fixture.episodes,
  });

  const brokenLedger = structuredClone(report);
  brokenLedger.implementationIdentity.files[0].sha256 = `sha256:${'0'.repeat(64)}`;
  resignReport(brokenLedger);
  assert.throws(() => assertProcessingGraphResearchAnalysis(brokenLedger),
    /aggregate digest does not match/u);

  const staleImplementation = structuredClone(report);
  staleImplementation.implementationIdentity.files[0].sha256 = `sha256:${'0'.repeat(64)}`;
  resignImplementationIdentity(staleImplementation.implementationIdentity);
  resignReport(staleImplementation);
  assert.equal(assertProcessingGraphResearchAnalysis(staleImplementation), staleImplementation);
  await assert.rejects(assertCurrentProcessingGraphResearchAnalysis(staleImplementation, {
    expectedRegistryDigest: fixture.registry.digest,
  }),
    /stale implementation identity/u);

  const staleGraph = structuredClone(report);
  staleGraph.baselineGraph.catalogDigest = `sha256:${'0'.repeat(64)}`;
  resignReport(staleGraph);
  assert.equal(assertProcessingGraphResearchAnalysis(staleGraph), staleGraph);
  await assert.rejects(assertCurrentProcessingGraphResearchAnalysis(staleGraph, {
    expectedRegistryDigest: fixture.registry.digest,
  }),
    /stale baseline processing graph/u);
});

test('coverage reconciles every source and component projection through bounded selection', async () => {
  const fixture = createSyntheticProcessingGraphResearchFixture({ namespace: 'coverage-nonce' });
  const report = await analyzeProcessingGraphResearch({
    registry: fixture.registry,
    episodes: fixture.episodes,
    workPolicy: { limits: { maxEpisodes: 5 } },
  });
  assert.equal(report.coverage.format, 'eslm-processing-graph-research-coverage-v1');
  assert.equal(report.coverage.sources.length, fixture.registry.sources.length);
  assert.equal(report.coverage.componentProjections.length, fixture.registry.components.length);
  assert.deepEqual(report.coverage.sources.map((row) => `${row.sourceId}@${row.revision}`),
    report.coverage.sources.map((row) => `${row.sourceId}@${row.revision}`).toSorted());
  assert.deepEqual(report.coverage.componentProjections.map((row) =>
    `${row.sourceId}@${row.revision}:${row.componentId}`),
  report.coverage.componentProjections.map((row) =>
    `${row.sourceId}@${row.revision}:${row.componentId}`).toSorted());
  for (const row of report.coverage.componentProjections) {
    assert.deepEqual(Object.keys(row.received).toSorted(), [
      'actions', 'dependencies', 'episodes', 'sourceBytes', 'tokens',
    ]);
    assert.equal(row.received.episodes, row.availableEpisodes);
    assert.equal(row.analyzed.episodes, row.selected.episodes);
    assert.equal(row.complete, false);
  }
  assert.equal(report.coverage.sources.reduce((sum, row) => sum + row.received.episodes, 0),
    report.work.episodesReceived);
  assert.equal(report.coverage.sources.reduce((sum, row) => sum + row.selected.episodes, 0), 5);
  assert.equal(report.coverage.sources.reduce((sum, row) => sum + row.selected.sourceBytes, 0),
    report.work.sourceBytesSelected);
  assert.equal(report.coverage.sources.reduce((sum, row) => sum + row.analyzed.actions, 0),
    report.work.actionsAnalyzed);
  assert.equal(report.coverage.sources.reduce((sum, row) => sum + row.analyzed.dependencies, 0),
    report.work.dependenciesAnalyzed);
  assert.equal(report.coverage.sources.reduce((sum, row) => sum + row.analyzed.tokens, 0),
    report.work.tokensAnalyzed);
  assert.equal(report.completeness.inputComplete, false);
  assert.ok(report.omissions.some((item) => item.reason === 'max-episodes'));

  const mismatchedSource = structuredClone(report);
  mismatchedSource.coverage.sources[0].selected.episodes += 1;
  resignReport(mismatchedSource);
  assert.throws(() => assertProcessingGraphResearchAnalysis(mismatchedSource),
    /source coverage does not reproduce/u);

  const mismatchedComponent = structuredClone(report);
  mismatchedComponent.coverage.componentProjections[0].complete = true;
  resignReport(mismatchedComponent);
  assert.throws(() => assertProcessingGraphResearchAnalysis(mismatchedComponent),
    /complete does not reproduce/u);
});

test('finite input, technique, vote, and hypothesis budgets expose an incomplete frontier', async () => {
  const fixture = createSyntheticProcessingGraphResearchFixture();
  const techniqueBudgets = Object.fromEntries(PROCESSING_GRAPH_DISCOVERY_TECHNIQUES.map(({ id }) => [
    id, { maxEvents: 1, maxProposals: 1 },
  ]));
  const report = await analyzeProcessingGraphResearch({
    registry: fixture.registry,
    episodes: fixture.episodes,
    workPolicy: {
      progressionStage: 'probe',
      limits: { maxRowsScanned: 6, maxEpisodes: 4, maxInputBytes: 2_000, maxActions: 16, maxDependencies: 16,
        maxVotes: 3, maxHypotheses: 2, maxEvidenceDigestsPerVote: 1 },
      techniqueBudgets,
    },
  });
  assert.equal(report.completeness.complete, false);
  assert.equal(report.completeness.scopeAbsenceClaimsAllowed, false);
  assert.equal(report.handoff.eligible, false);
  assert.equal(report.handoff.recommendedStage, 'hold');
  assert.ok(report.omissions.some((item) => item.reason === 'max-rows-scanned'));
  assert.ok(report.omissions.some((item) => item.reason === 'membership-not-authenticated'));
  assert.equal(report.evidenceLedger.length, 0);
  assert.equal(report.proposalLedger.length, 0);
  assert.equal(report.hypotheses.length, 0);
  assert.ok(report.work.episodesAnalyzed <= 4);
  assert.ok(report.work.votesRetained <= 3);
  assert.ok(report.work.hypothesesRetained <= 2);
  assert.equal(assertProcessingGraphResearchAnalysis(report), report);
});

test('token work is independently bounded and cannot disappear from receipts', async () => {
  const fixture = createSyntheticProcessingGraphResearchFixture({ namespace: 'token-budget' });
  const episodes = fixture.episodes.map((episode) => {
    const value = structuredClone(episode);
    value.work.tokens = 1_000_000;
    return createResearchEpisode(value);
  });
  const rebuiltRegistry = registryForEpisodes(fixture.registry, episodes);
  const report = await analyzeProcessingGraphResearch({
    registry: rebuiltRegistry, episodes: alignEpisodesToRegistry(episodes, rebuiltRegistry),
    workPolicy: { limits: { maxTokens: 2_500_000 } },
  });
  assert.equal(report.work.tokensDeclared, 16_000_000);
  assert.ok(report.work.tokensAnalyzed <= 2_500_000);
  assert.ok(report.omissions.some((item) => item.reason === 'max-tokens'));
  assert.equal(report.completeness.inputComplete, false);
  assert.equal(report.handoff.eligible, false);
});

test('evidence-per-vote policy bound preserves the 128-digest hypothesis union', () => {
  assert.doesNotThrow(() => resolveProcessingGraphResearchWorkPolicy({
    limits: { maxEvidenceDigestsPerVote: 14 },
  }));
  assert.throws(() => resolveProcessingGraphResearchWorkPolicy({
    limits: { maxEvidenceDigestsPerVote: 15 },
  }), /cannot exceed 14/u);
});

test('renamed transfer preserves structural hypotheses without carrying source constants', async () => {
  const original = createSyntheticProcessingGraphResearchFixture({ namespace: 'synthetic' });
  const renamed = createSyntheticProcessingGraphResearchFixture({ namespace: 'nonce' });
  const [first, second] = await Promise.all([
    analyzeProcessingGraphResearch({ registry: original.registry, episodes: original.episodes }),
    analyzeProcessingGraphResearch({ registry: renamed.registry, episodes: renamed.episodes }),
  ]);
  assert.deepEqual(semanticHypothesisView(first), semanticHypothesisView(second));
  assert.notEqual(first.registry.digest, second.registry.digest);
  assert.notEqual(first.receiptDigest, second.receiptDigest);
  assert.doesNotMatch(JSON.stringify(first.hypotheses.map((item) => item.candidate)),
    /synthetic|source-[123]|native-/u);
});

test('handoff independence counts reviewed lineages rather than source aliases', async () => {
  const fixture = createSyntheticProcessingGraphResearchFixture({ namespace: 'shared-lineage' });
  const registry = rebuildRegistry(fixture.registry, (component) => component, (source) => {
    source.independenceGroup = 'one-shared-collection';
    return source;
  });
  const report = await analyzeProcessingGraphResearch({ registry, episodes: fixture.episodes });
  assert.equal(report.registry.sourceCount, 3);
  assert.equal(report.registry.independenceGroupCount, 1);
  assert.equal(report.handoff.independenceGroupCount, 1);
  assert.equal(report.handoff.eligible, false);
  assert.equal(report.handoff.recommendedStage, 'hold');
  assert.ok(report.handoff.blockingReasons.includes('insufficient-independent-sources'));
});

test('current analysis binds self-consistent lineage claims to the reviewed external registry', async () => {
  const fixture = createSyntheticProcessingGraphResearchFixture({ namespace: 'lineage-anchor' });
  const reviewedRegistry = rebuildRegistry(
    fixture.registry, (component) => component, (source) => {
      source.independenceGroup = 'one-reviewed-collection';
      return source;
    },
  );
  const report = await analyzeProcessingGraphResearch({
    registry: reviewedRegistry, episodes: fixture.episodes,
  });
  const forged = structuredClone(report);
  const forgedRegistry = createResearchSourceRegistry({
    sources: forged.registry.sources.map((source, index) => ({
      ...source, independenceGroup: `fabricated-independent-lineage-${index + 1}`,
    })),
    components: forged.registry.components,
  });
  forged.registry = researchAnalysisRegistrySnapshot(forgedRegistry);
  const groupBySource = new Map(forgedRegistry.sources.map((source) => [
    `${source.sourceId}@${source.revision}`, source.independenceGroup,
  ]));
  for (const row of forged.coverage.componentProjections) {
    row.independenceGroup = groupBySource.get(`${row.sourceId}@${row.revision}`);
  }
  for (const row of forged.coverage.sources) {
    row.independenceGroup = groupBySource.get(`${row.sourceId}@${row.revision}`);
  }
  for (const entry of forged.evidenceLedger) {
    entry.independenceGroup = groupBySource.get(`${entry.sourceId}@${entry.revision}`);
  }
  const ledger = new Map(forged.evidenceLedger.map((entry) => [entry.evidenceDigest, entry]));
  for (const hypothesis of forged.hypotheses) {
    for (const vote of hypothesis.votes) {
      vote.evidence.independenceGroupCount = new Set(vote.evidence.evidenceDigests
        .map((item) => ledger.get(item).independenceGroup)).size;
    }
    hypothesis.evidence.independenceGroupCount = new Set(hypothesis.evidence.evidenceDigests
      .map((item) => ledger.get(item).independenceGroup)).size;
  }
  forged.handoff.independenceGroupCount = forged.registry.independenceGroupCount;
  forged.handoff.blockingReasons = forged.handoff.blockingReasons
    .filter((item) => item !== 'insufficient-independent-sources');
  forged.handoff.eligible = true;
  forged.handoff.recommendedStage = 'pilot';
  resignReport(forged);
  assert.throws(() => assertProcessingGraphResearchAnalysis(forged),
    /do not reproduce from committed features/u);
});

test('meaning-changing structural contrast creates distinct hypotheses instead of merging', async () => {
  const fixture = createSyntheticProcessingGraphResearchFixture();
  const original = fixture.episodes[0];
  const contrast = createStructuralNegativeContrast(original);
  assert.notEqual(projectResearchEpisodeFeatures(original).semanticDigest,
    projectResearchEpisodeFeatures(contrast).semanticDigest);
  const baseline = await analyzeProcessingGraphResearch({
    registry: fixture.registry, episodes: fixture.episodes,
  });
  const changedEpisodes = [contrast, ...fixture.episodes.slice(1)];
  const changedRegistry = registryForEpisodes(fixture.registry, changedEpisodes);
  const changed = await analyzeProcessingGraphResearch({
    registry: changedRegistry, episodes: alignEpisodesToRegistry(changedEpisodes, changedRegistry),
  });
  const baselineSignatures = new Set(baseline.hypotheses.map((item) => item.semanticSignature));
  const novel = changed.hypotheses.filter((item) => !baselineSignatures.has(item.semanticSignature));
  assert.ok(novel.some((item) => item.candidate.type === 'coordination-node'
    && item.candidate.invariant.includes('verify+summarize')));
  assert.ok(novel.some((item) => item.candidate.type === 'edge'
    || item.candidate.type === 'packet-field'));
});

test('episode and analysis envelopes are closed and reject executable or authoritative mutations', async () => {
  const fixture = createSyntheticProcessingGraphResearchFixture();
  const executable = structuredClone(fixture.episodes[0]);
  executable.actions[0].command = 'untrusted program';
  assert.throws(() => createResearchEpisode(executable), /must contain exactly/u);
  const duplicateFeedback = structuredClone(fixture.episodes[0]);
  duplicateFeedback.feedback.push({ ...duplicateFeedback.feedback[0] });
  assert.throws(() => createResearchEpisode(duplicateFeedback), /feedback identifiers must be unique/u);
  const duplicatePreference = structuredClone(fixture.episodes[0]);
  duplicatePreference.preferences.push({ ...duplicatePreference.preferences[0] });
  assert.throws(() => createResearchEpisode(duplicatePreference), /preference identifiers must be unique/u);

  const report = await analyzeProcessingGraphResearch({
    registry: fixture.registry, episodes: fixture.episodes,
  });
  const extra = structuredClone(report);
  extra.policyExecutor = './untrusted.mjs';
  assert.throws(() => assertProcessingGraphResearchAnalysis(extra), /must contain exactly/u);
  const authoritative = structuredClone(report);
  authoritative.authority = { ...authoritative.authority, runtime: 'execute' };
  assert.throws(() => assertProcessingGraphResearchAnalysis(authoritative), /non-authoritative/u);
  const inflated = structuredClone(report);
  inflated.hypotheses[0].score.confidence = 1;
  assert.throws(() => assertProcessingGraphResearchAnalysis(inflated), /does not reproduce/u);

  const forgedEvidence = structuredClone(report);
  for (const hypothesis of forgedEvidence.hypotheses) {
    hypothesis.evidence.evidenceDigests = [`sha256:${'f'.repeat(64)}`];
    hypothesis.evidence.episodeCount = 1;
    for (const vote of hypothesis.votes) {
      vote.evidence.evidenceDigests = [`sha256:${'f'.repeat(64)}`];
      vote.evidence.episodeCount = 1;
    }
  }
  resignReport(forgedEvidence);
  assert.throws(() => assertProcessingGraphResearchAnalysis(forgedEvidence),
    /outside the analyzed ledger/u);

  const forgedLedger = structuredClone(report);
  forgedLedger.evidenceLedger[0].recordDigest = `sha256:${'e'.repeat(64)}`;
  resignReport(forgedLedger);
  assert.throws(() => assertProcessingGraphResearchAnalysis(forgedLedger),
    /registry-bound/u);

  const swappedContent = structuredClone(report);
  const membership = swappedContent.inputMembership.find((item) => item.members.length >= 2);
  [membership.members[0].episodeContentDigest, membership.members[1].episodeContentDigest] =
    [membership.members[1].episodeContentDigest, membership.members[0].episodeContentDigest];
  membership.observedContentMembershipDigest = researchProjectionContentMembershipDigest(
    membership.projectionId, membership.members, membership.rawRows,
  );
  resignReport(swappedContent);
  assert.throws(() => assertProcessingGraphResearchAnalysis(swappedContent),
    /registry-bound projection membership/u);

  const forgedRegistry = structuredClone(report);
  forgedRegistry.registry.sources.forEach((source, index) => {
    source.independenceGroup = `forged-lineage-${index}`;
  });
  const unsignedRegistry = {
    format: forgedRegistry.registry.format,
    sources: forgedRegistry.registry.sources,
    components: forgedRegistry.registry.components,
  };
  forgedRegistry.registry.digest = `sha256:${sha256(stableStringify(unsignedRegistry))}`;
  forgedRegistry.registry.independenceGroups = forgedRegistry.registry.sources
    .map((source) => source.independenceGroup).toSorted();
  forgedRegistry.registry.independenceGroupCount = forgedRegistry.registry.independenceGroups.length;
  resignReport(forgedRegistry);
  assert.throws(() => assertProcessingGraphResearchAnalysis(forgedRegistry),
    /registry-bound|coverage/u);
  await assert.rejects(assertCurrentProcessingGraphResearchAnalysis(forgedRegistry, {
    expectedRegistryDigest: fixture.registry.digest,
  }), /registry-bound|different reviewed source registry/u);

  const forgedIndependence = structuredClone(report);
  forgedIndependence.hypotheses[0].evidence.independenceGroupCount = 999;
  forgedIndependence.hypotheses[0].votes[0].evidence.independenceGroupCount = 999;
  resignReport(forgedIndependence);
  assert.throws(() => assertProcessingGraphResearchAnalysis(forgedIndependence),
    /evidence counts do not reproduce|evidence does not reproduce/u);

  const sourceConditioned = structuredClone(report);
  sourceConditioned.hypotheses[0].candidate.responsibility =
    `route-${report.coverage.sources[0].sourceId}-gold-label-candidates`;
  sourceConditioned.hypotheses[0].candidate.invariant = 'expected-answer-from-source-row-id';
  const signature = `sha256:${sha256(stableStringify(sourceConditioned.hypotheses[0].candidate))}`;
  sourceConditioned.hypotheses[0].semanticSignature = signature;
  sourceConditioned.hypotheses[0].hypothesisId = `hypothesis:${signature.slice(7)}`;
  resignReport(sourceConditioned);
  assert.throws(() => assertProcessingGraphResearchAnalysis(sourceConditioned),
    /answer- or source-conditioned|registered source identity|do not reproduce/u);

  const componentConditioned = structuredClone(report);
  const component = componentConditioned.coverage.componentProjections[0];
  componentConditioned.hypotheses[0].candidate.responsibility =
    `route-${component.componentId}-candidates`;
  componentConditioned.hypotheses[0].candidate.invariant =
    `prefer-${component.projectionId}`;
  const componentSignature = `sha256:${sha256(stableStringify(
    componentConditioned.hypotheses[0].candidate,
  ))}`;
  componentConditioned.hypotheses[0].semanticSignature = componentSignature;
  componentConditioned.hypotheses[0].hypothesisId =
    `hypothesis:${componentSignature.slice(7)}`;
  resignReport(componentConditioned);
  assert.throws(() => assertProcessingGraphResearchAnalysis(componentConditioned),
    /registered source identity|do not reproduce/u);
});

test('analysis replay rejects coherent receipt, proposal, work, and descriptor forgeries', async () => {
  const fixture = createSyntheticProcessingGraphResearchFixture({ namespace: 'replay-hostile' });
  const report = await analyzeProcessingGraphResearch({
    registry: fixture.registry, episodes: fixture.episodes,
  });

  const proposal = structuredClone(report);
  proposal.proposalLedger[0].candidate.responsibility = 'coordinate-alternate-typed-task-frame';
  proposal.proposalLedger[0].candidateSignature = `sha256:${sha256(stableStringify(
    proposal.proposalLedger[0].candidate,
  ))}`;
  const unsignedProposal = structuredClone(proposal.proposalLedger[0]);
  delete unsignedProposal.proposalDigest;
  proposal.proposalLedger[0].proposalDigest = `sha256:${sha256(stableStringify({
    format: 'eslm-processing-graph-research-proposal-v1', ...unsignedProposal,
  }))}`;
  proposal.proposalLedger.sort((left, right) =>
    left.proposalDigest.localeCompare(right.proposalDigest));
  resignReport(proposal);
  assert.throws(() => assertProcessingGraphResearchAnalysis(proposal),
    /do not reproduce from committed features/u);

  const metamorphic = structuredClone(report);
  const receipt = metamorphic.techniques.find((item) =>
    item.techniqueId === 'metamorphic-recurrence-v1');
  receipt.preservationFailures = 1;
  receipt.complete = false;
  resignReport(metamorphic);
  assert.throws(() => assertProcessingGraphResearchAnalysis(metamorphic),
    /metamorphic receipt|do not reproduce/iu);

  const authorization = structuredClone(report);
  authorization.authorization.receiptsDigest = `sha256:${'a'.repeat(64)}`;
  resignReport(authorization);
  assert.throws(() => assertProcessingGraphResearchAnalysis(authorization),
    /authorization summary does not reproduce/u);

  const omissions = structuredClone(report);
  omissions.omissions = [{
    scope: 'input', reason: 'invented-frontier', count: 999,
    frontierDigest: `sha256:${'e'.repeat(64)}`,
  }];
  omissions.handoff.blockingReasons = ['invented-frontier'];
  omissions.handoff.eligible = false;
  omissions.handoff.recommendedStage = 'hold';
  resignReport(omissions);
  assert.throws(() => assertProcessingGraphResearchAnalysis(omissions),
    /omissions do not reproduce/u);

  const budget = structuredClone(report);
  budget.workPolicy.limits.maxEpisodes = 1;
  budget.workPolicy.limits.maxInputBytes = 1;
  budget.workPolicy.limits.maxTokens = 1;
  budget.workPolicy.limits.maxActions = 1;
  budget.workPolicy.limits.maxDependencies = 1;
  budget.workPolicy.limits.maxVotes = 1;
  budget.workPolicy.limits.maxHypotheses = 1;
  resignReport(budget);
  assert.throws(() => assertProcessingGraphResearchAnalysis(budget),
    /budget|bounded|reproduce/iu);

  const zeroWork = structuredClone(report);
  zeroWork.inputMembership[0].members[0].work.sourceBytes = 0;
  zeroWork.inputMembership[0].members[0].work.tokens = 0;
  resignReport(zeroWork);
  assert.throws(() => assertProcessingGraphResearchAnalysis(zeroWork),
    /canonical joint records/u);

  const leakedFeature = structuredClone(report);
  leakedFeature.featureLedger[0].features.request.rawSourceText =
    'PRIVATE RAW RESPONSE AND SOURCE-NATIVE-ID';
  leakedFeature.featureLedger[0].features.semanticDigest = researchEpisodeFeatureSemanticDigest(
    leakedFeature.featureLedger[0].features,
  );
  resignReport(leakedFeature);
  assert.throws(() => assertProcessingGraphResearchAnalysis(leakedFeature),
    /must contain exactly/u);

  const overlappingState = structuredClone(report);
  const feature = overlappingState.featureLedger[0].features;
  feature.state.unknownKinds = [...new Set([
    ...feature.state.unknownKinds, ...feature.state.initialStateKinds,
  ])].toSorted();
  feature.semanticDigest = researchEpisodeFeatureSemanticDigest(feature);
  resignReport(overlappingState);
  assert.throws(() => assertProcessingGraphResearchAnalysis(overlappingState),
    /must be disjoint/u);

  const appliedWork = structuredClone(report);
  const auditRow = appliedWork.metamorphicAuditLedger[0];
  const auditEvidence = appliedWork.evidenceLedger.find((row) =>
    row.evidenceDigest === auditRow.evidenceDigest);
  const membership = appliedWork.inputMembership.find((entry) =>
    entry.sourceId === auditEvidence.sourceId && entry.revision === auditEvidence.revision
      && entry.componentId === auditEvidence.componentId);
  const member = membership.members.find((row) =>
    row.recordDigest === auditEvidence.recordDigest);
  assert.ok(member.projectionWork.appliedTransformIds.length > 0);
  member.projectionWork.appliedTransformIds.pop();
  member.projectionWork.metamorphicTransformsApplied -= 1;
  const forgedContentMembership = researchProjectionContentMembershipDigest(
    membership.projectionId, membership.members, membership.rawRows,
  );
  membership.expectedContentMembershipDigest = forgedContentMembership;
  membership.observedContentMembershipDigest = forgedContentMembership;
  const components = appliedWork.registry.components.map((component) => {
    const value = structuredClone(component);
    if (value.sourceId === membership.sourceId && value.revision === membership.revision
        && value.componentId === membership.componentId) {
      value.projection.contentMembershipDigest = forgedContentMembership;
    }
    return value;
  });
  const forgedAppliedRegistry = createResearchSourceRegistry({
    sources: appliedWork.registry.sources, components,
  });
  appliedWork.registry = researchAnalysisRegistrySnapshot(forgedAppliedRegistry);
  appliedWork.coverage.componentProjections.find((row) =>
    row.sourceId === membership.sourceId && row.revision === membership.revision
      && row.componentId === membership.componentId)
    .contentMembershipDigest = forgedContentMembership;
  appliedWork.work.projectionCommittedMetamorphicTransformsApplied -= 1;
  resignReport(appliedWork);
  assert.throws(() => assertProcessingGraphResearchAnalysis(appliedWork),
    /projection-committed metamorphic applications/u);

  for (const mutate of [
    (value) => { value.featureSchema.excludedSemanticFields = []; },
    (value) => { value.correlationGroups = []; },
    (value) => { value.handoff.requiredVerifierInputs = []; },
    (value) => { value.coverage.componentProjections[0].projectionId = 'forged-projection'; },
  ]) {
    const forged = structuredClone(report);
    mutate(forged);
    resignReport(forged);
    assert.throws(() => assertProcessingGraphResearchAnalysis(forged));
  }
});

test('research modules have no deployed-runtime dependency and runtime has no research import', async () => {
  const researchFiles = (await readdir(new URL('../src/research/', import.meta.url)))
    .filter((name) => name.endsWith('.mjs'));
  for (const name of researchFiles) {
    const source = await readFile(new URL(`../src/research/${name}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source,
      /from ['"]\.\.\/(?:runtime|reasoning|language|kb|strategy|interface)\//u);
    assert.doesNotMatch(source, /child_process|\beval\s*\(|new Function|import\s*\(/u);
  }
  const runtimeFiles = (await readdir(new URL('../src/runtime/', import.meta.url)))
    .filter((name) => name.endsWith('.mjs'));
  for (const name of runtimeFiles) {
    const source = await readFile(new URL(`../src/runtime/${name}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /research\//u);
  }
});
