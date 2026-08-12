import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { probeBlimpArchive } from '../benchmark-adapters/blimp-babi.mjs';
import { adaptClutrrCsv, scoreClutrrRelation } from '../benchmark-adapters/clutrr.mjs';
import { adaptEntityTrackingJsonl, scoreEntityTrackingSpan } from '../benchmark-adapters/entity-tracking.mjs';
import { ewokCacheStatus, probeEwokProtectedCache } from '../benchmark-adapters/ewok.mjs';
import { PROJECT_ROOT } from '../paths.mjs';
import { hashFile } from '../util.mjs';
import { BENCHMARK_ACCESS_MANIFESTS } from './benchmark-access-manifests.mjs';
import { benchmarkCatalogFields } from './benchmark-report-catalog.mjs';
import { benchmarkReportFields } from './benchmark-report-contract.mjs';
import {
  createRuntimeBenchmarkStrategyConfiguration,
} from './benchmark-strategy-configuration.mjs';
import {
  openSimpleQaCache, runSimpleQaDiagnosticProbe,
} from './simpleqa-adapter.mjs';
import { scoreStoryClozeSelections } from './story-cloze-2018-adapter.mjs';
import {
  openStoryCloze2018Partition, storyCloze2018CacheStatus,
} from './story-cloze-2018-cache.mjs';

export const PUBLIC_PROBE_DEFAULTS = Object.freeze({
  blimpPerParadigm: 2,
  clutrrPerDepth: 12,
  entityTracking: 100,
  ewok: 110,
  simpleqa: 100,
});

const CLUTRR_DEPTHS = Object.freeze([2, 3, 4, 5, 6, 7, 8, 9, 10]);
const ENTITY_TRACKING_DEV = 'training/.cache/datasets/entity-tracking/extracted/boxes-dataset-v1/few_shot_boxes_nso_exp2_max3/dev-t5.jsonl';
const STORY_CLOZE_PARTITION = 'training/benchmark-sources/story-cloze-2018/fresh-partition.json';
const BLIMP_CANDIDATE_RECEIPT = 'training/benchmark-sources/blimp-acceptability/candidate-manifest.json';
const BLIMP_FRESH_RECEIPT = 'training/benchmark-sources/blimp-acceptability/fresh-result.json';
const EWOK_FRESH_RECEIPT = 'training/benchmark-sources/ewok-core-1.0/fresh-result.json';
const BABI_ALL_TWENTY_RECEIPT = 'training/benchmark-sources/blimp-babi/all-20-candidate-result.json';
const BABI_AMBIGUITY_RECEIPT = 'training/benchmark-sources/blimp-babi/all-20-ambiguity-proof.json';

function rate(count, total) {
  return total ? count / total : 0;
}

function statusCounts(results) {
  const counts = {};
  for (const item of results) counts[item.status ?? 'SCORED'] = (counts[item.status ?? 'SCORED'] ?? 0) + 1;
  return counts;
}

function engineKnowledgeBaseVersions(engine) {
  const modelValues = engine?.model?.manifest?.knowledgeBaseVersions
    ?? (engine?.model?.manifest?.knowledgeBases ?? []).map((kbId) => ({ kbId }));
  const providerValues = (engine?.providers ?? []).map((provider) => ({
    kbId: provider.manifest.kbId ?? provider.manifest.id,
    version: provider.manifest.kbVersion,
  }));
  const known = new Set([...modelValues, ...providerValues].map((value) => value.kbId));
  const selectedWithoutVersion = (engine?.selected ?? [])
    .filter((kbId) => !known.has(kbId)).map((kbId) => ({ kbId }));
  return aggregateKbVersions([{ usedKbVersions: [
    ...modelValues, ...providerValues, ...selectedWithoutVersion,
  ] }]);
}

function aggregateKbVersions(results) {
  const byIdentity = new Map();
  for (const value of results.flatMap((result) => result.usedKbVersions ?? [])) {
    const kbId = value.kbId;
    if (!kbId) continue;
    const version = value.version;
    byIdentity.set(`${kbId}\u0000${version ?? ''}`, Object.freeze({
      kbId, ...(version ? { version } : {}),
    }));
  }
  return [...byIdentity.values()].toSorted((left, right) =>
    left.kbId.localeCompare(right.kbId) || String(left.version).localeCompare(String(right.version)));
}

function aggregateMethodIds(results) {
  return [...new Set(results.map((result) => result.plan?.methodId).filter(Boolean))].toSorted();
}

function measuredRow(id, data) {
  const { strategyResults, ...publicData } = data;
  const reportFields = benchmarkReportFields(id, data);
  const resultOrigin = data.resultOrigin ?? 'current-execution';
  const executedAt = data.executedAt ?? (resultOrigin === 'current-execution'
    ? new Date().toISOString() : null);
  return Object.freeze({
    id, evidenceState: 'development-probe-executed',
    ...publicData,
    ...reportFields,
    normalizationCandidates: reportFields.inputRoute === 'raw-language' ? data.normalizationCandidates : null,
    normalizationCandidateRate: reportFields.inputRoute === 'raw-language'
      ? rate(data.normalizationCandidates, data.total) : null,
    agentInvocations: 0, agentInvocationRate: 0,
    evaluationIdentities: Object.freeze({
      scorer: data.scorerIdentity ?? data.protocol,
      oracle: data.oracleIdentity ?? 'host-only source oracle joined after prediction',
      partition: data.partitionIdentity ?? data.samplePolicy,
    }),
    selectedMethods: Object.freeze(data.selectedMethods ?? []),
    usedKbVersions: Object.freeze(data.usedKbVersions ?? []),
    selectedKbVersions: Object.freeze(data.selectedKbVersions ?? []),
    languagePolicy: Object.freeze({
      externalLanguageAgent: false,
      routeMeasurement: reportFields.inputRoute === 'raw-language' ? 'measured' : 'not-applicable-to-adapter-route',
    }),
    resourcePolicy: Object.freeze(data.resourcePolicy ?? { state: 'command-default-or-not-recorded' }),
    resourceEvidence: data.resourceEvidence ? Object.freeze(data.resourceEvidence) : null,
    replayCommand: data.replayCommand ?? null,
    behaviorDependency: data.behaviorDependency ?? null,
    ...(resultOrigin === 'current-execution' ? {
      strategyConfiguration: createRuntimeBenchmarkStrategyConfiguration(strategyResults),
    } : {}),
    resultOrigin,
    ...(resultOrigin === 'stored-receipt'
      ? { checkpointState: 'historical-unverified' } : {}),
    executionEvidence: Object.freeze({
      origin: resultOrigin,
      ...(executedAt ? { executedAt } : {}),
      ...(resultOrigin === 'stored-receipt' ? {
        checkpointVerification: Object.freeze({
          state: 'not-audited',
          currentnessClaim: false,
          meaning: 'The stored receipt is historical until a registered cryptographic audit proves its checkpoint.',
        }),
        ...(!executedAt ? {
          reportingCompleteness: Object.freeze({
            state: 'incomplete', missingFields: Object.freeze(['executedAt']),
          }),
        } : {}),
      } : {}),
    }),
    ...benchmarkCatalogFields(id),
  });
}

async function frozenBlimpRow() {
  const [candidate, fresh, source] = await Promise.all([
    readFile(join(PROJECT_ROOT, BLIMP_CANDIDATE_RECEIPT), 'utf8').then(JSON.parse),
    readFile(join(PROJECT_ROOT, BLIMP_FRESH_RECEIPT), 'utf8').then(JSON.parse),
    probeBlimpArchive({ perParadigm: 1 }),
  ]);
  if (candidate.format !== 'eslm-blimp-feature-candidate-freeze-v1'
      || fresh.protocol !== 'blimp-feature-acceptability-fresh-v1'
      || fresh.membership !== candidate.partition.freshIdSha256
      || fresh.total !== candidate.partition.fresh) {
    throw new Error('BLiMP frozen candidate and fresh aggregate receipts do not agree.');
  }
  return measuredRow('blimp', {
    resultOrigin: 'stored-receipt',
    evidenceState: 'fresh-evaluation-executed',
    protocol: fresh.protocol,
    samplePolicy: 'frozen-label-blind-stratified-partition',
    splitQuality: 'row-IID-paradigm-stratified',
    protocolDescription: 'For each minimally different sentence pair, the system earns a point only when the generic feature grammar assigns the higher acceptability score to the grammatical sentence.',
    sampleDescription: 'Every one of the 67 grammar paradigms contributes 800 development pairs and 200 fresh pairs. The candidate was frozen before the 13,400 fresh pairs were scored once, and only aggregate results were retained.',
    total: fresh.total,
    correct: fresh.correct,
    attempted: fresh.total - fresh.ties,
    forcedChoice: true,
    normalizationCandidates: 0,
    ties: fresh.ties,
    reversedPreferences: fresh.reverse,
    statusCounts: { SCORED: fresh.total },
    sourceEvidence: [source.archive, {
      path: BLIMP_CANDIDATE_RECEIPT,
      sha256: await hashFile(join(PROJECT_ROOT, BLIMP_CANDIDATE_RECEIPT)),
    }, {
      path: BLIMP_FRESH_RECEIPT,
      sha256: await hashFile(join(PROJECT_ROOT, BLIMP_FRESH_RECEIPT)),
    }],
    developmentResult: candidate.candidate.development,
    sampleCoverage: {
      tested: fresh.total,
      available: source.validation.cases,
      unit: 'minimal sentence pairs',
      comprehensive: false,
      scope: 'The latest run scored the frozen fresh partition. The separate development run scored the other 53,600 pairs, so all 67 paradigms have lifecycle evidence, but the latest result is not presented as one undifferentiated full-corpus run.',
    },
    capabilityCoverage: {
      level: 'broad-but-incomplete',
      description: 'All 67 BLiMP grammar paradigms are represented in the fresh partition. The remaining gap is concentrated in phrase structure, attachment, lexical selection, and binding rather than missing paradigm sampling.',
    },
    diagnosis: 'The remaining failures cluster in long-distance subject-gap attachment, adjunct islands, lexical animacy selection, N-bar ellipsis, adjective-mediated and relative-clause agreement, optional or inchoative valency, participle ambiguity, and binding-domain attachment. Progress requires a fuller phrase-structure and clause-attachment representation, not paradigm-name dispatch or memorized sentences.',
  });
}

async function runClutrr(engine, perDepth) {
  const outcomes = [];
  const runtimeResults = [];
  const fileEvidence = [];
  for (const depth of CLUTRR_DEPTHS) {
    const relativePath = `training/.cache/datasets/clutrr/official/data_089907f8/1.${depth}_test.csv`;
    const path = join(PROJECT_ROOT, relativePath);
    const adapted = adaptClutrrCsv(await readFile(path, 'utf8'), {
      datasetId: 'data-089907f8', split: 'test', limit: perDepth,
      seed: 'eslm-public-probe-clutrr-v1',
    });
    const oracle = new Map(adapted.oracle.map((item) => [item.id, item]));
    for (const item of adapted.pool) {
      const result = engine.executeTask({ ...item.taskFrame, taskId: item.id });
      runtimeResults.push(result);
      const score = scoreClutrrRelation(result.values?.[0] ?? result.answer, oracle.get(item.id));
      outcomes.push({ id: item.id, depth, pass: score.pass, status: result.status });
    }
    fileEvidence.push({ path: relativePath, sha256: await hashFile(path), sourceRows: adapted.sourceRows, sampled: adapted.pool.length });
  }
  return measuredRow('clutrr', {
    protocol: 'clutrr-relation-classification-development-probe-v1',
    protocolDescription: 'The system must infer the requested typed family relationship from the people and relationships stated in each story.',
    samplePolicy: 'stable-hash-equal-count-per-relation-depth',
    splitQuality: 'row-IID-depth-stratified',
    sampleDescription: 'The development sample is selected deterministically with the same number of cases at every relationship-chain depth from 2 through 10.',
    total: outcomes.length, correct: outcomes.filter((item) => item.pass).length,
    attempted: outcomes.filter((item) => item.status === 'SOLVED').length,
    forcedChoice: true,
    normalizationCandidates: outcomes.filter((item) => item.status === 'UNPARSED').length,
    statusCounts: statusCounts(outcomes), strata: { relationDepths: CLUTRR_DEPTHS, perDepth },
    selectedMethods: aggregateMethodIds(runtimeResults),
    usedKbVersions: aggregateKbVersions(runtimeResults),
    selectedKbVersions: engineKnowledgeBaseVersions(engine),
    strategyResults: runtimeResults,
    sourceEvidence: fileEvidence,
    sampleCoverage: {
      tested: outcomes.length,
      available: fileEvidence.reduce((sum, item) => sum + item.sourceRows, 0),
      unit: 'validated structured relation cases',
      comprehensive: false,
      scope: 'The latest development run sampled the same count from every relation depth from 2 through 10; it did not execute every validated row.',
    },
    diagnosis: 'The runtime composes typed relations with a source-local kinship algebra and returns AMBIGUOUS when the available graph cannot distinguish structurally identical labels. Remaining ambiguity is preserved instead of resolved from names, row identifiers, answer frequency, or candidate order.',
    capabilityCoverage: {
      level: 'broad-for-structured-kinship',
      description: 'The probe covers relation chains at every depth from 2 through 10. Coverage is strong for structured typed graphs, while narrative extraction and source-label ambiguity remain separate limits.',
    },
  });
}

async function runEntityTracking(engine, count) {
  const path = join(PROJECT_ROOT, ENTITY_TRACKING_DEV);
  const adapted = adaptEntityTrackingJsonl(await readFile(path, 'utf8'), {
    datasetId: 'boxes-dataset-v1-base', split: 'dev', limit: count,
    seed: 'eslm-public-probe-entity-tracking-v1',
  });
  const oracle = new Map(adapted.oracle.map((item) => [item.id, item]));
  const outcomes = [];
  const runtimeResults = [];
  for (const item of adapted.pool) {
    const result = engine.executeTask({ ...item.taskFrame, taskId: item.id });
    runtimeResults.push(result);
    outcomes.push({
      id: item.id, status: result.status,
      pass: scoreEntityTrackingSpan(result.values, oracle.get(item.id)).pass,
    });
  }
  return measuredRow('entityTracking', {
    protocol: 'entity-tracking-masked-span-development-probe-v1',
    protocolDescription: 'The system executes the stated object movements and must return the exact final contents of the queried container.',
    samplePolicy: 'stable-hash-round-robin-operation-count',
    splitQuality: 'row-IID-operation-stratified',
    sampleDescription: 'The development sample is selected deterministically while cycling across stories with different numbers of operations.',
    total: outcomes.length, correct: outcomes.filter((item) => item.pass).length,
    attempted: outcomes.filter((item) => item.status === 'SOLVED').length,
    normalizationCandidates: outcomes.filter((item) => item.status === 'UNPARSED').length,
    statusCounts: statusCounts(outcomes),
    selectedMethods: aggregateMethodIds(runtimeResults),
    usedKbVersions: aggregateKbVersions(runtimeResults),
    selectedKbVersions: engineKnowledgeBaseVersions(engine),
    strategyResults: runtimeResults,
    sourceEvidence: [{ path: ENTITY_TRACKING_DEV, sha256: await hashFile(path), sourceRows: adapted.sourceRows }],
    sampleCoverage: {
      tested: outcomes.length,
      available: adapted.sourceRows,
      unit: 'development stories',
      comprehensive: false,
      scope: 'The latest run used a deterministic operation-count-stratified sample from the validated development file.',
    },
    diagnosis: 'The reviewed adapter projects the story into generic container-state operations. The core executes additions, removals, moves, and final-content queries as finite state transitions rather than treating the task as raw mask completion.',
    capabilityCoverage: {
      level: 'complete-for-current-bounded-schema',
      description: 'The measured schema covers the declared add, remove, and move operations through the sampled operation depths. It does not establish unrestricted event language or arbitrary container programs.',
    },
  });
}

async function runSimpleQa(engine, count) {
  const { manifest, pool } = await openSimpleQaCache();
  const report = await runSimpleQaDiagnosticProbe(engine, pool, { count });
  return measuredRow('simpleqa', {
    protocol: report.protocol,
    protocolDescription: 'This local diagnostic compares a normalized short answer exactly; it is deliberately not presented as the official semantic-grader score.',
    comparability: report.comparability,
    samplePolicy: 'stable topic-stratified evaluation-visible questions; host-only answers',
    splitQuality: 'row-IID-topic-stratified',
    sampleDescription: 'The diagnostic sample is selected deterministically across question topics. Questions are visible to the runtime, while reference answers remain available only to the local evaluator.',
    total: report.total, correct: report.exact,
    attempted: report.statusCounts.SOLVED ?? report.statusCounts.ANSWERED ?? 0,
    normalizationCandidates: report.wouldRequireLanguageFallback,
    statusCounts: report.statusCounts,
    selectedMethods: report.selectedMethods,
    usedKbVersions: report.usedKbVersions,
    selectedKbVersions: engineKnowledgeBaseVersions(engine),
    strategyResults: report.strategyResults,
    sourceEvidence: [manifest.artifact],
    sampleCoverage: {
      tested: report.total,
      available: manifest.artifact.records,
      unit: 'official test questions',
      comprehensive: false,
      scope: 'The latest diagnostic used a deterministic topic-stratified subset. Because SimpleQA publishes only a test set, these questions remain evaluation-only and cannot become training examples.',
    },
    diagnosis: 'Most failures are unsupported broad factoid interrogatives; parsed cases lack independently sourced encyclopedic evidence. Exact match is diagnostic because official SimpleQA uses semantic grading.',
    capabilityCoverage: {
      level: 'low-factoid-coverage',
      description: 'The frontend recognizes a bounded set of factoid frames and the loaded public KBs cover selected lexical, geographic, commonsense, and relational facts. The stratified diagnostic exposes large gaps in both question forms and encyclopedic breadth.',
    },
  });
}

async function runStoryCloze(engine) {
  const partition = JSON.parse(await readFile(join(PROJECT_ROOT, STORY_CLOZE_PARTITION), 'utf8'));
  const adapted = await openStoryCloze2018Partition(partition, 'development');
  const predictions = new Map();
  const statuses = [];
  const runtimeResults = [];
  for (const item of adapted.pool) {
    const result = typeof engine.executeTaskWithKnowledge === 'function'
      ? await engine.executeTaskWithKnowledge({ ...item.taskFrame, taskId: item.id })
      : engine.executeTask({ ...item.taskFrame, taskId: item.id });
    runtimeResults.push(result);
    predictions.set(item.id, result.values?.[0]);
    statuses.push({ status: result.status });
  }
  const score = scoreStoryClozeSelections(predictions, adapted.oracle);
  return measuredRow('storyCloze', {
    protocol: score.protocol,
    protocolDescription: 'The system compiles the four-sentence story into bounded narrative state, evaluates both candidate events with structural and typed commonsense evidence, and abstains when neither candidate has a sufficient margin.',
    samplePolicy: 'frozen-label-blind-development-partition',
    splitQuality: 'row-IID-hash-partition',
    sampleDescription: 'A label-blind SHA-256 partition reserves 314 validation cases as fresh and exposes the remaining 1,257 cases for development. This row measures only that development partition; the official label-free test split was not used.',
    total: score.total,
    correct: score.correct,
    attempted: score.total - score.omissions,
    forcedChoice: true,
    normalizationCandidates: 0,
    omissions: score.omissions,
    statusCounts: statusCounts(statuses),
    selectedMethods: aggregateMethodIds(runtimeResults),
    usedKbVersions: aggregateKbVersions(runtimeResults),
    selectedKbVersions: engineKnowledgeBaseVersions(engine),
    strategyResults: runtimeResults,
    sourceEvidence: [{
      path: STORY_CLOZE_PARTITION,
      sha256: await hashFile(join(PROJECT_ROOT, STORY_CLOZE_PARTITION)),
      partitionDigest: partition.partitionDigest,
    }],
    sampleCoverage: {
      tested: score.total,
      available: partition.sourceCases,
      unit: 'labeled validation stories',
      comprehensive: false,
      scope: 'The latest run measured the 1,257-case development partition. The other 314 validation stories are reserved fresh evidence for a separately frozen candidate; the 1,571-case official test file has no local labels.',
    },
    diagnosis: 'The method is executable and auditable, but current narrative state and public KB evidence do not yet cover enough goals, causal consequences, social expectations, contradictions, and multi-event temporal dependencies. This is an unresolved capability gap, not a proof that the task is impossible.',
    capabilityCoverage: {
      level: 'partial-narrative-coverage',
      description: 'The current method models participants, lexical bridges, polarity, tense, goals, causes, events, social effects, and states. Its development score shows that this inventory is not yet a complete account of story coherence.',
    },
  });
}

async function runEwok(engine, count) {
  void engine;
  void count;
  const [probe, fresh] = await Promise.all([
    probeEwokProtectedCache({ limit: 1 }),
    readFile(join(PROJECT_ROOT, EWOK_FRESH_RECEIPT), 'utf8').then(JSON.parse),
  ]);
  if (fresh.format !== 'eslm-ewok-fresh-aggregate-v1'
      || fresh.total !== 8_634
      || fresh.partitionMembershipSha256 !== '83437a3163a2d1efa6dadac0e789b5db670ed90c8f4df7d8065254adba2b6a46') {
    throw new Error('EWoK fresh aggregate does not match the frozen partition receipt.');
  }
  return measuredRow('ewok', {
    resultOrigin: 'stored-receipt',
    evidenceState: 'fresh-evaluation-executed',
    protocol: 'ewok-symbolic-context-preference-fresh-v1',
    protocolDescription: 'For each target statement, the system must prefer the context in which that statement is more plausible according to ordinary physical, social, spatial, material, and quantitative knowledge.',
    samplePolicy: 'frozen-complement-of-development-probe',
    splitQuality: 'row-IID-source-item-grouped',
    sampleDescription: 'The candidate was frozen after a balanced 110-decision development probe. Every other decision in the protected analysis snapshot formed an 8,634-decision fresh partition, which was scored once without retaining item outcomes.',
    comparability: 'Direct scalar-preference diagnostic over the protected paper-analysis snapshot; not the official language-model probability protocol.',
    total: fresh.total, correct: fresh.correct, attempted: fresh.total - fresh.ties,
    forcedChoice: true, normalizationCandidates: 0,
    ties: fresh.ties, reversedPreferences: fresh.wrong,
    statusCounts: { SCORED: fresh.total },
    sourceEvidence: [...probe.archives, {
      path: EWOK_FRESH_RECEIPT,
      sha256: await hashFile(join(PROJECT_ROOT, EWOK_FRESH_RECEIPT)),
    }],
    sourceValidation: probe.validation,
    sampleCoverage: {
      tested: fresh.total,
      available: probe.validation.decisions,
      unit: 'target-context preference decisions',
      comprehensive: false,
      scope: 'The latest run scored the 8,634-decision fresh complement once. The other 110 decisions were the separate development probe used before the candidate freeze.',
    },
    developmentResult: fresh.developmentResultAtFreeze,
    byDomain: fresh.byDomain,
    capabilityCoverage: {
      level: 'low-generalization-coverage',
      description: 'The large fresh partition spans all 11 EWoK domains and shows that the current ontology covers only a minority of required world-knowledge preferences; spatial relations are strongest and social interactions are weakest.',
    },
    diagnosis: 'The typed world-relation method achieved complete coverage of its 110-case development probe but generalized poorly to the frozen fresh complement, with many ties. The authored ontology is therefore too narrow. A new candidate must broaden source-independent physical, social, material, quantitative, and spatial knowledge under a new version and a new untouched evaluation partition; it must not patch the opened fresh cases. The protected inventory contains 4,397 rows and its explicit removal list excludes 25, leaving 4,372.',
  });
}

function gatedRow(id, manifest) {
  const reportFields = benchmarkReportFields(id, { total: null, correct: null, attempted: null });
  return Object.freeze({
    id, evidenceState: manifest.scoreState, ...reportFields,
    splitQuality: null,
    normalizationCandidates: null, normalizationCandidateRate: null,
    agentInvocations: null, agentInvocationRate: null,
    evaluationIdentities: null,
    selectedMethods: Object.freeze([]), usedKbVersions: Object.freeze([]), selectedKbVersions: Object.freeze([]),
    languagePolicy: null, resourcePolicy: null, resourceEvidence: null,
    replayCommand: null, behaviorDependency: null,
    resultOrigin: 'access-gated',
    executionEvidence: Object.freeze({ origin: 'not-executed' }),
    diagnosis: manifest.access.reason,
    ...benchmarkCatalogFields(id),
  });
}

export async function executePublicBenchmarkRows(engines, options = {}) {
  const settings = { ...PUBLIC_PROBE_DEFAULTS, ...options };
  const selected = new Set(options.selected ?? ['blimp', 'babi', 'clutrr', 'entityTracking', 'ewok', 'storyCloze', 'simpleqa']);
  const rows = [];
  if (selected.has('blimp')) {
    rows.push(await frozenBlimpRow());
  }
  if (selected.has('babi')) {
    const score = JSON.parse(await readFile(join(PROJECT_ROOT, BABI_ALL_TWENTY_RECEIPT), 'utf8'));
    rows.push(measuredRow('babi', {
      resultOrigin: 'stored-receipt', executedAt: score.createdAt,
      protocol: score.protocol, samplePolicy: 'complete-official-English-10k-training-split-all-twenty-families',
      splitQuality: 'official-development',
      protocolDescription: 'The adapter compiles each visible story into a finite typed episode. The registered generic executor applies state changes, relations, event roles, paths, vectors, counting, and source-declared policies, then returns semantic values with replayable operation references.',
      sampleDescription: 'The latest run executed every one of the 200,000 questions in all twenty official English 10k training files. These train-visible cases are development evidence, not an untouched test score.',
      total: score.tested, correct: score.correct,
      attempted: score.statusCounts.SOLVED ?? score.correct,
      normalizationCandidates: 0,
      statusCounts: score.statusCounts, byTask: score.byTask,
      sourceEvidence: [{
        path: BABI_ALL_TWENTY_RECEIPT,
        sha256: await hashFile(join(PROJECT_ROOT, BABI_ALL_TWENTY_RECEIPT)),
      }, {
        path: BABI_AMBIGUITY_RECEIPT,
        sha256: await hashFile(join(PROJECT_ROOT, BABI_AMBIGUITY_RECEIPT)),
      }],
      sampleCoverage: {
        tested: score.tested,
        available: score.available,
        unit: 'official English 10k training questions',
        comprehensive: true,
        scope: 'The latest development run executed all 10,000 questions in each of all twenty task families. Official test files were not opened or scored.',
      },
      usedKbVersions: [{ kbId: 'babi-v1.2-language', version: '1.0.0' }],
      selectedKbVersions: [{ kbId: 'babi-v1.2-language', version: '1.0.0' }],
      diagnosis: `${score.correct}/${score.tested} cases match the single-label development oracle and all ${score.witnessesVerified} execution witnesses replay. Tasks 1–4 and 6–20 are each 10,000/10,000. Task 5 is 9,872/10,000; its 128 remaining inputs each expose at least two distinct transfer themes satisfying the same visible event-role query. Five alpha-renamed structural signatures require contradictory oracle choices, which falsifies first, latest, and verb-priority tie-breakers. The sound runtime returns AMBIGUOUS instead of reading host-only support-line annotations.`,
      capabilityCoverage: {
        level: 'complete-all-twenty-development-family-coverage',
        description: 'Every official English 10k training question in all twenty families was executed. The method covers the delivered finite episode operations; this does not establish unrestricted natural-language, temporal, spatial, or causal reasoning outside the declared schemas.',
      },
    }));
  }
  if (selected.has('clutrr')) rows.push(await runClutrr(engines.clutrr ?? engines.base, settings.clutrrPerDepth));
  if (selected.has('entityTracking')) rows.push(await runEntityTracking(engines.base, settings.entityTracking));
  if (selected.has('ewok')) {
    const cache = await ewokCacheStatus();
    rows.push(cache.cached
      ? await runEwok(engines.ewok ?? engines.base, settings.ewok)
      : gatedRow('ewok', BENCHMARK_ACCESS_MANIFESTS['ewok-core-1.0']));
  }
  if (selected.has('storyCloze')) {
    const cache = await storyCloze2018CacheStatus();
    rows.push(cache.cached
      ? await runStoryCloze(engines.storyCloze ?? engines.base)
      : gatedRow('storyCloze', BENCHMARK_ACCESS_MANIFESTS['story-cloze-winter-2018']));
  }
  if (selected.has('simpleqa')) rows.push(await runSimpleQa(engines.simpleqa ?? engines.base, settings.simpleqa));
  return Object.freeze(rows);
}
