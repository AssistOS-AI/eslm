import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { assertProcessingGraphResearchAnalysis } from
  '../src/research/processing-graph-research-analysis-contract.mjs';
import {
  createResearchSourceRegistry,
  researchAnalysisRegistrySnapshot,
  researchProjectionContentMembershipDigest,
} from '../src/research/processing-graph-research.mjs';
import {
  researchDiscoveryCycleSplitAccounting,
  sealResearchDiscoveryCycle,
} from '../src/research/research-discovery-cycle-contract.mjs';
import { createSyntheticDiscoveryCycleFixture } from './fixtures/research-discovery-cycle-fixture.mjs';
import { assertPortableResearchAnalysis } from
  '../training/.agents/skills/rl-dataset-graph-discovery/scripts/analysis-replay-validator.mjs';
import { DISCOVERY_TECHNIQUES } from
  '../training/.agents/skills/rl-dataset-graph-discovery/scripts/research-contract.mjs';

const execute = promisify(execFile);
const skillScripts = resolve('training/.agents/skills/rl-dataset-graph-discovery/scripts');

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).toSorted().map((key) =>
      `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function sealAnalysis(value) {
  const unsigned = structuredClone(value);
  delete unsigned.receiptDigest;
  return { ...unsigned, receiptDigest: sha256(stable(unsigned)) };
}

function analysisBinding(analysis) {
  return {
    protocol: analysis.format,
    receiptDigest: analysis.receiptDigest,
    implementationAggregateDigest: analysis.implementationIdentity.aggregateDigest,
    registryDigest: analysis.registry.digest,
    baselineGraphDigest: analysis.baselineGraph.catalogDigest,
    analysisId: analysis.analysis.analysisId,
    version: analysis.analysis.version,
    seed: analysis.analysis.seed,
  };
}

function bindCycleToAnalysis(cycle, analysis) {
  return sealResearchDiscoveryCycle({
    ...structuredClone(cycle),
    analysisBinding: analysisBinding(analysis),
  });
}

function bindCycle(cycle, plan, analysis) {
  return sealResearchDiscoveryCycle({
    ...structuredClone(cycle),
    planBinding: { planId: plan.planId, planDigest: sha256(stable(plan)) },
    analysisBinding: analysisBinding(analysis),
  });
}

async function runCycleScript(plan, analysis, cycle) {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-rl-cycle-hostile-'));
  const paths = [join(directory, 'plan.json'), join(directory, 'analysis.json'), join(directory, 'cycle.json')];
  await Promise.all([
    writeFile(paths[0], JSON.stringify(plan), 'utf8'),
    writeFile(paths[1], JSON.stringify(analysis), 'utf8'),
    writeFile(paths[2], JSON.stringify(cycle), 'utf8'),
  ]);
  return execute(process.execPath, [join(skillScripts, 'validate-discovery-cycle.mjs'), ...paths]);
}

async function runPlanScript(plan) {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-rl-plan-hostile-'));
  const path = join(directory, 'plan.json');
  await writeFile(path, JSON.stringify(plan), 'utf8');
  return execute(process.execPath, [join(skillScripts, 'validate-discovery-plan.mjs'), path]);
}

test('portable plan gate separates reviewed admission from observed analysis results', async () => {
  const plan = JSON.parse(await readFile(
    'training/research-sources/helpsteer2-gsm8k-pilot/discovery-plan.json', 'utf8',
  ));
  const valid = await runPlanScript(plan);
  assert.equal(JSON.parse(valid.stdout).admittedRows, 17_634);
  const protectedExposure = structuredClone(plan);
  protectedExposure.sourceScopes[0].splits.push({
    name: 'test', visibility: 'protected', rowsDeclared: 1, rowsAdmitted: 1,
  });
  await assert.rejects(() => runPlanScript(protectedExposure), /outside reviewed training visibility/iu);

  const excessiveEvidence = structuredClone(plan);
  excessiveEvidence.workPolicy.limits.maxEvidenceDigestsPerVote = 15;
  await assert.rejects(() => runPlanScript(excessiveEvidence), /cannot exceed 14/iu);
});

test('portable replay covers nine sealed techniques and seven evidence-derived hypothesis types', async () => {
  const { analysis } = await createSyntheticDiscoveryCycleFixture();
  assert.doesNotThrow(() => assertPortableResearchAnalysis(structuredClone(analysis)));
  assert.deepEqual(analysis.techniques.map((item) => item.techniqueId),
    DISCOVERY_TECHNIQUES.map((item) => item.id));
  assert.equal(new Set(analysis.techniques.map((item) => item.correlationGroup)).size, 9);
  assert.deepEqual([...new Set(analysis.hypotheses.map((item) => item.candidate.type))].toSorted(), [
    'authority-gate', 'coordination-node', 'edge', 'nested-circuit', 'packet-field',
    'processing-node', 'strategy',
  ]);
  const featureByEvidence = new Map(analysis.featureLedger.map((row) => [
    row.evidenceDigest, row.features,
  ]));
  const processing = analysis.proposalLedger.filter((item) =>
    item.techniqueId === 'typed-operation-responsibility-v1');
  const nested = analysis.proposalLedger.filter((item) =>
    item.techniqueId === 'bounded-subcircuit-motif-v1');
  assert.ok(processing.length > 0 && nested.length > 0);
  for (const proposal of processing) {
    const operation = proposal.candidate.responsibility.split(':').at(-1);
    assert.ok(proposal.evidence.evidenceDigests.every((evidenceDigest) =>
      featureByEvidence.get(evidenceDigest).request.operationKinds.includes(operation)));
  }
  for (const proposal of nested) {
    const invariant = proposal.candidate.invariant.slice('bounded-subcircuit:'.length);
    assert.ok(proposal.evidence.evidenceDigests.every((evidenceDigest) =>
      featureByEvidence.get(evidenceDigest).dependencyMotifs.some((motif) =>
        `${motif.fromPhase}/${motif.fromKind}->${motif.toPhase}/${motif.toKind}` === invariant)));
  }
});

test('portable cycle gate binds machine analysis and closes hypothesis consolidation', async () => {
  const { plan, analysis, cycle } = await createSyntheticDiscoveryCycleFixture();
  const valid = await runCycleScript(plan, analysis, cycle);
  assert.equal(JSON.parse(valid.stdout).reviewedHypotheses, cycle.hypotheses.length);
  const answerConditioned = structuredClone(cycle);
  answerConditioned.hypotheses[0].responsibility = 'select expectedAnswer from dataset row';
  await assert.rejects(() => runCycleScript(
    plan, analysis, sealResearchDiscoveryCycle(answerConditioned),
  ), /source- or answer-conditioned architecture/u);
  const sourceConditioned = structuredClone(cycle);
  sourceConditioned.hypotheses[0].responsibility =
    `specialize processing for ${analysis.registry.sources[0].sourceId}`;
  await assert.rejects(() => runCycleScript(
    plan, analysis, sealResearchDiscoveryCycle(sourceConditioned),
  ), /source- or answer-conditioned architecture/u);
  const invented = structuredClone(cycle);
  invented.hypotheses[0].analysisHypothesisIds = [`hypothesis:${'f'.repeat(64)}`];
  await assert.rejects(() => runCycleScript(
    plan, analysis, sealResearchDiscoveryCycle(invented),
  ), /absent or repeated machine-analysis hypothesis/u);
  const undecided = structuredClone(cycle);
  undecided.consolidation = [];
  await assert.rejects(() => runCycleScript(
    plan, analysis, sealResearchDiscoveryCycle(undecided),
  ), /consolidation must decide every reviewed hypothesis/u);

  const seedDrift = structuredClone(plan);
  seedDrift.analysisIdentity.seed = 'forged-post-observation-seed';
  await assert.rejects(() => runCycleScript(
    seedDrift, analysis, bindCycle(cycle, seedDrift, analysis),
  ), /precommitted execution identity/u);

  const forgedPlanAuthority = structuredClone(plan);
  forgedPlanAuthority.authority.answer = 'plan-decides-answer';
  await assert.rejects(() => runCycleScript(
    forgedPlanAuthority, analysis, bindCycle(cycle, forgedPlanAuthority, analysis),
  ), /plan failed validation|authority is inconsistent/iu);
});

test('host and portable analysis gates reject re-signed authority and executable policy', async () => {
  const { plan, analysis, cycle } = await createSyntheticDiscoveryCycleFixture();
  for (const mutate of [
    (value) => { value.authority.answer = 'analysis-decides-answer'; },
    (value) => { value.authority.executablePolicy = true; },
  ]) {
    const forged = structuredClone(analysis);
    mutate(forged);
    const sealed = sealAnalysis(forged);
    assert.throws(() => assertProcessingGraphResearchAnalysis(sealed), /non-authoritative/u);
    await assert.rejects(() => runCycleScript(
      plan, sealed, bindCycleToAnalysis(cycle, sealed),
    ), /non-authoritative and non-executable/u);
  }
  const hypothesis = structuredClone(analysis);
  hypothesis.hypotheses[0].authority.promotion = 'automatic';
  const sealedHypothesis = sealAnalysis(hypothesis);
  await assert.rejects(() => runCycleScript(
    plan, sealedHypothesis, bindCycleToAnalysis(cycle, sealedHypothesis),
  ), /must remain non-authoritative and non-executable/u);
  const handoff = structuredClone(analysis);
  handoff.handoff.authority = 'execution-admission';
  const sealedHandoff = sealAnalysis(handoff);
  await assert.rejects(() => runCycleScript(
    plan, sealedHandoff, bindCycleToAnalysis(cycle, sealedHandoff),
  ), /must remain (?:exact and )?recommendation-only/u);

  const unsafeImplementation = structuredClone(analysis);
  unsafeImplementation.implementationIdentity.files[0].path = '/tmp/forged-executor.mjs';
  unsafeImplementation.implementationIdentity.aggregateDigest = sha256(stable({
    format: unsafeImplementation.implementationIdentity.format,
    fileCount: unsafeImplementation.implementationIdentity.fileCount,
    files: unsafeImplementation.implementationIdentity.files,
  }));
  const sealedImplementation = sealAnalysis(unsafeImplementation);
  assert.throws(() => assertProcessingGraphResearchAnalysis(sealedImplementation),
    /canonical source-relative paths/u);
  await assert.rejects(() => runCycleScript(
    plan, sealedImplementation, bindCycleToAnalysis(cycle, sealedImplementation),
  ), /canonical safe paths/u);
});

test('portable deterministic replay rejects receipt, proposal, hypothesis, and zero-check forgeries', async () => {
  const fixture = await createSyntheticDiscoveryCycleFixture();
  const variants = [
    [(value) => {
      value.techniques[1].techniqueId = value.techniques[0].techniqueId;
    }, /techniques, proposals, or hypotheses do not reproduce/u],
    [(value) => {
      value.techniques[1].correlationGroup = value.techniques[0].correlationGroup;
    }, /techniques, proposals, or hypotheses do not reproduce/u],
    [(value) => {
      const proposal = value.proposalLedger.find((item) =>
        item.techniqueId === 'typed-operation-responsibility-v1');
      proposal.candidate.responsibility = 'process-typed-operation:fabricated';
    }, /proposal identity|techniques, proposals, or hypotheses/u],
    [(value) => {
      const proposal = value.proposalLedger.find((item) =>
        item.techniqueId === 'bounded-subcircuit-motif-v1');
      proposal.candidate.invariant = 'bounded-subcircuit:fabricated';
    }, /proposal identity|techniques, proposals, or hypotheses/u],
    [(value) => { value.hypotheses[1].rank = value.hypotheses[0].rank; },
      /techniques, proposals, or hypotheses/u],
    [(value) => {
      value.hypotheses[0].status = value.hypotheses[0].status === 'plausible'
        ? 'exploratory' : 'plausible';
    }, /techniques, proposals, or hypotheses/u],
    [(value) => { value.hypotheses[0].votes.push(structuredClone(value.hypotheses[0].votes[0])); },
      /techniques, proposals, or hypotheses/u],
    [(value) => {
      const receipt = value.techniques.find((item) =>
        item.techniqueId === 'metamorphic-recurrence-v1');
      receipt.preservationChecks = 0;
      receipt.controlChecks = 0;
    }, /techniques, proposals, or hypotheses/u],
    [(value) => { value.inputMembership[0].complete = false; },
      /registry-bound projection|unauthenticated membership/u],
    [(value) => { value.hypotheses[1].hypothesisId = value.hypotheses[0].hypothesisId; },
      /techniques, proposals, or hypotheses/u],
  ];
  for (const [mutate, error] of variants) {
    const forged = structuredClone(fixture.analysis);
    mutate(forged);
    const sealed = sealAnalysis(forged);
    await assert.rejects(() => runCycleScript(
      fixture.plan, sealed, bindCycleToAnalysis(fixture.cycle, sealed),
    ), error);
  }
});

test('portable replay rejects coherently lowered member work against structural features', async () => {
  const fixture = await createSyntheticDiscoveryCycleFixture();
  const analysis = structuredClone(fixture.analysis);
  const plan = structuredClone(fixture.plan);
  const membership = analysis.inputMembership[0];
  const member = membership.members.find((item) => item.work.actions > 0);
  member.work.actions -= 1;
  const contentDigest = researchProjectionContentMembershipDigest(
    membership.projectionId, membership.members, membership.rawRows,
  );
  membership.expectedContentMembershipDigest = contentDigest;
  membership.observedContentMembershipDigest = contentDigest;
  const components = analysis.registry.components.map((component) => {
    const value = structuredClone(component);
    if (value.sourceId === membership.sourceId && value.revision === membership.revision
        && value.componentId === membership.componentId) {
      value.projection.contentMembershipDigest = contentDigest;
    }
    return value;
  });
  const registry = createResearchSourceRegistry({
    sources: analysis.registry.sources, components,
  });
  analysis.registry = researchAnalysisRegistrySnapshot(registry);
  const componentCoverage = analysis.coverage.componentProjections.find((item) =>
    item.sourceId === membership.sourceId && item.revision === membership.revision
      && item.componentId === membership.componentId);
  componentCoverage.contentMembershipDigest = contentDigest;
  for (const phase of ['received', 'selected', 'analyzed']) {
    componentCoverage[phase].actions -= 1;
  }
  const sourceCoverage = analysis.coverage.sources.find((item) =>
    item.sourceId === membership.sourceId && item.revision === membership.revision);
  for (const phase of ['received', 'selected', 'analyzed']) sourceCoverage[phase].actions -= 1;
  for (const field of ['actionsDeclared', 'actionsSelected', 'actionsAnalyzed']) {
    analysis.work[field] -= 1;
  }
  plan.sourceScopes.find((scope) => scope.sourceRevision
    === `${membership.sourceId}@${membership.revision}`
    && scope.componentId === membership.componentId).contentMembershipDigest = contentDigest;
  const sealed = sealAnalysis(analysis);
  await assert.rejects(() => runCycleScript(
    plan, sealed, bindCycle(fixture.cycle, plan, sealed),
  ), /member work does not reproduce structural features/u);
});

test('portable cycle gate rejects reviewed type, authority, state, and decision contradictions', async () => {
  const { plan, analysis, cycle } = await createSyntheticDiscoveryCycleFixture();
  const variants = [
    [(value) => {
      value.hypotheses[0].type = 'strategy';
      value.hypotheses[0].authority = 'proposal';
    }, /different structural type/u],
    [(value) => { value.hypotheses[0].authority = 'coordination'; },
      /authority contradicts its hypothesis type/u],
    [(value) => { value.hypotheses[0].state = 'rejected'; },
      /contradicts the reviewed hypothesis state or result identity/u],
    [(value) => { value.consolidation[0].resultId = null; },
      /contradicts the reviewed hypothesis state or result identity/u],
  ];
  for (const [mutate, error] of variants) {
    const forged = structuredClone(cycle);
    mutate(forged);
    await assert.rejects(() => runCycleScript(
      plan, analysis, sealResearchDiscoveryCycle(forged),
    ), error);
  }
});

test('portable cycle state and split accounting are derived from machine analysis', async () => {
  const { plan, analysis, cycle } = await createSyntheticDiscoveryCycleFixture();
  const incomplete = structuredClone(cycle);
  const reviewed = incomplete.hypotheses.find((item) => item.analysisHypothesisIds.length > 1);
  const [unreviewedId] = reviewed.analysisHypothesisIds.splice(-1);
  incomplete.unreviewedAnalysisHypothesisIds = [unreviewedId];
  await assert.rejects(() => runCycleScript(
    plan, analysis, sealResearchDiscoveryCycle(incomplete),
  ), /state or omissions contradict its bound analysis/u);
  assert.deepEqual(cycle.splitAccounting, researchDiscoveryCycleSplitAccounting(analysis));
  const fabricated = structuredClone(cycle);
  fabricated.splitAccounting[0].rowsVisited -= 1;
  await assert.rejects(() => runCycleScript(
    plan, analysis, sealResearchDiscoveryCycle(fabricated),
  ), /split accounting does not reproduce its analysis/u);
});
