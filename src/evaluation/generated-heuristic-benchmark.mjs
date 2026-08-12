import { performance } from 'node:perf_hooks';
import { benchmarkBehaviorIdentity } from './benchmark-execution-identity.mjs';
import { createRuntimeBenchmarkStrategyConfiguration } from './benchmark-strategy-configuration.mjs';
import { assertGeneratedHeuristicBenchmarkReport } from './generated-heuristic-benchmark-contract.mjs';
import {
  DEFAULT_GENERATED_HEURISTIC_BENCHMARK_SIZE,
  GENERATED_HEURISTIC_BENCHMARK_PROTOCOL,
  GENERATED_HEURISTIC_BENCHMARK_SEED,
  generateHeuristicBenchmarkCases,
  generatedHeuristicBenchmarkDefinition,
  generatedHeuristicSuiteDigest,
} from './generated-heuristic-cases.mjs';

export {
  assertGeneratedHeuristicBenchmarkReport,
  DEFAULT_GENERATED_HEURISTIC_BENCHMARK_SIZE,
  GENERATED_HEURISTIC_BENCHMARK_PROTOCOL,
  GENERATED_HEURISTIC_BENCHMARK_SEED,
  generateHeuristicBenchmarkCases,
};

export const GENERATED_HEURISTIC_BENCHMARK_REPORT_PROTOCOL =
  'eslm-generated-heuristic-benchmark-report-v1';

const FAILURE_STAGE_ORDER = Object.freeze([
  'execution', 'resource', 'route', 'status', 'candidate', 'strategy-family',
  'semantic-query', 'request-plan', 'safety', 'answer',
]);

function frozen(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) frozen(item);
  }
  return value;
}

function tokenPresent(surface, token) {
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${token.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}(?:$|[^\\p{L}\\p{N}])`, 'iu')
    .test(surface);
}

function observedFamilies(result) {
  const families = new Set(result?.approximation?.selectedCandidate?.supportingFamilies ?? []);
  for (const candidate of result?.approximation?.candidates ?? []) {
    for (const family of candidate.supportingFamilies ?? []) families.add(family);
  }
  for (const receipt of result?.approximation?.receipt?.familyReceipts ?? []) {
    if (receipt.proposalsRetained > 0) families.add(receipt.family);
  }
  return [...families].toSorted();
}

function candidateTexts(result) {
  return [...new Set([
    result?.approximation?.selectedCandidate?.text,
    result?.approximation?.recommendedCandidate?.text,
    ...(result?.approximation?.candidates ?? []).map((candidate) => candidate.text),
  ].filter(Boolean))];
}

function resultQueryMatches(expected, actual) {
  if (!expected) return true;
  if (!actual || typeof actual !== 'object') return false;
  return Object.entries(expected).every(([key, value]) => actual[key] === value);
}

function requestPlanMatches(oracle, result) {
  const plan = result.requestPlanning?.selectedPlan;
  if (!plan) return false;
  if (oracle.operationSequence) {
    return JSON.stringify(plan.operationPlans?.map((item) => item.intent))
      === JSON.stringify(oracle.operationSequence);
  }
  return plan.primaryIntent === oracle.operation
    && plan.outputContract?.artifact === oracle.artifact
    && (oracle.format === undefined || plan.outputContract?.format === oracle.format);
}

export function assessGeneratedHeuristicCase(testCase, result, executionError) {
  const oracle = testCase.oracle;
  const failures = [];
  const fail = (stage, code, explanation) => failures.push(Object.freeze({ stage, code, explanation }));
  if (executionError) fail('execution', 'runtime-exception', executionError);
  if (!result) return frozen({ pass: false, failures, observedFamilies: [], confidenceBand: 'none' });
  const resourceLimited = result.status === 'RESOURCE_LIMIT'
    || result.approximation?.receipt?.complete === false;
  if (resourceLimited) fail('resource', 'bounded-work-exhausted', 'The runtime exhausted a declared work bound.');
  const routeAccepted = !oracle.expectedRoute
    || result.languageRoute === oracle.expectedRoute
    || oracle.alternateRoutes?.includes(result.languageRoute);
  if (!routeAccepted) {
    fail('route', 'unexpected-language-route', `Expected ${oracle.expectedRoute}; observed ${result.languageRoute}.`);
  }
  if (oracle.acceptableStatuses && !oracle.acceptableStatuses.includes(result.status)) {
    fail('status', 'unexpected-status', `Expected ${oracle.acceptableStatuses.join(' or ')}; observed ${result.status}.`);
  }
  if (oracle.forbiddenStatuses?.includes(result.status)) {
    fail('safety', 'unsafe-positive-status', `The protected contrast produced forbidden status ${result.status}.`);
  }
  const texts = candidateTexts(result);
  const successfulDirect = result.status === 'SOLVED' && result.languageRoute === 'direct-symbolic';
  if (oracle.expectedCandidateText && !texts.includes(oracle.expectedCandidateText)
      && !(oracle.candidateOptionalOnDirectSuccess && successfulDirect)) {
    fail('candidate', 'expected-candidate-not-generated', 'No retained approximation matched the structural oracle.');
  }
  if (oracle.requireSelectedCandidate) {
    const selected = result.approximation?.selectedCandidate;
    if (selected?.text !== oracle.expectedCandidateText) {
      fail('candidate', 'expected-candidate-not-selected',
        'The selected approximation differs from the structural candidate oracle.');
    } else {
      if (result.episode?.interpretedText !== oracle.expectedCandidateText) {
        fail('candidate', 'selected-candidate-not-executed',
          'The query-local episode did not execute the selected structural candidate.');
      }
      const reparse = result.approximation?.reparses?.find((item) =>
        item.candidateId === selected.candidateId && item.text === selected.text);
      if (!reparse || reparse.status !== 'PARSED' || reparse.acceptedSemanticIr !== true) {
        fail('candidate', 'selected-candidate-not-reparsed',
          'The selected candidate has no matching accepted parse-only receipt.');
      }
      for (const family of oracle.requiredFamilies ?? []) {
        if (!selected.supportingFamilies?.includes(family)) {
          fail('strategy-family', 'selected-family-missing',
            `The selected candidate is not supported by the required ${family} strategy.`);
        }
      }
    }
  }
  const families = observedFamilies(result);
  for (const family of oracle.requiredFamilies ?? []) {
    if (oracle.requireSelectedCandidate) continue;
    if (!families.includes(family)) {
      if (!(oracle.familyOptionalOnDirectSuccess && successfulDirect)) {
        fail('strategy-family', 'required-family-not-observed', `The ${family} strategy produced no retained proposal.`);
      }
    }
  }
  if (!resultQueryMatches(oracle.expectedQuery, result.query)) {
    fail('semantic-query', 'semantic-ir-mismatch', 'The accepted query differs from the generating semantic structure.');
  }
  if (oracle.kind === 'request-construction' && !requestPlanMatches(oracle, result)) {
    fail('request-plan', 'request-obligations-missing', 'The ordered request plan or output contract is incomplete.');
  }
  if (oracle.kind === 'safe-abstention' || oracle.kind === 'interpretable-complex-clause') {
    if (oracle.forbiddenAnswer && result.answer === oracle.forbiddenAnswer) {
      fail('safety', 'unsafe-positive-answer', `The protected contrast produced ${oracle.forbiddenAnswer}`);
    }
    const selected = result.approximation?.selectedCandidate?.text;
    if (selected && !['reference', 'if-then'].includes(oracle.protectedOperator)
        && !tokenPresent(selected, oracle.protectedOperator)) {
      fail('safety', 'protected-operator-lost', `The selected approximation removed ${oracle.protectedOperator}.`);
    }
    if (selected && oracle.protectedOperator === 'if-then'
        && (!tokenPresent(selected, 'if') || !tokenPresent(selected, 'then'))) {
      fail('safety', 'protected-operator-lost', 'The selected approximation did not preserve if/then scope.');
    }
  }
  if (oracle.expectedAnswer !== null && result.answer !== oracle.expectedAnswer) {
    fail('answer', 'answer-mismatch', `Expected ${oracle.expectedAnswer}; observed ${result.answer}.`);
  }
  if (oracle.expectedValues && !oracle.expectedValues.every((value) => result.values?.includes(value))) {
    fail('answer', 'value-mismatch', 'The expected structurally generated value is absent.');
  }
  const confidenceBand = result.approximation?.selectedCandidate?.confidenceBand
    ?? result.approximation?.recommendedCandidate?.confidenceBand ?? 'none';
  return frozen({
    pass: failures.length === 0,
    failures: failures.toSorted((left, right) =>
      FAILURE_STAGE_ORDER.indexOf(left.stage) - FAILURE_STAGE_ORDER.indexOf(right.stage)
        || left.code.localeCompare(right.code)),
    observedFamilies: families,
    confidenceBand,
    resourceOutcome: resourceLimited ? 'resource-limit' : 'complete',
  });
}

function increment(map, key, passed) {
  const current = map.get(key) ?? { key, total: 0, passed: 0, failed: 0 };
  current.total += 1;
  current.passed += passed ? 1 : 0;
  current.failed += passed ? 0 : 1;
  map.set(key, current);
}

function aggregateRows(map) {
  return frozen([...map.values()].map((item) => ({
    ...item, passRate: item.total === 0 ? null : item.passed / item.total,
  })).toSorted((left, right) => left.key.localeCompare(right.key)));
}

function resultStrategyEvidence(result) {
  return Object.freeze({
    workPolicy: result.workPolicy,
    ...(result.approximation?.receipt?.strategyExecution ? {
      approximation: Object.freeze({ receipt: Object.freeze({
        strategyExecution: result.approximation.receipt.strategyExecution,
      }) }),
    } : {}),
    strategyExecutionReceipts: Object.freeze(result.strategyExecutionReceipts ?? []),
  });
}

function recommendationFor(stage, family) {
  if (family === 'multi-family-consensus') {
    return 'Improve cross-form spelling and morphology arbitration so article, quantifier, rule-predicate, and progressive votes converge on one Semantic IR; preserve ambiguity when they do not.';
  }
  if (family === 'embedded-polar-question') {
    return 'Strengthen embedded-question force detection before sentence-like material can be accepted as a direct assertion.';
  }
  if (family === 'contextual-predicate-spelling') {
    return 'Expand bounded spelling-process evidence and reject direct parses that conflict with a uniquely aligned class-rule/query predicate.';
  }
  const recommendations = {
    execution: 'Harden the bounded runner or result contract before changing language semantics.',
    resource: 'Rebalance work units or add a bounded specialist without changing the semantic threshold.',
    route: 'Improve intent or language-route arbitration using renamed and contrastive controls.',
    status: 'Align the public epistemic status with the accepted interpretation and proof strength.',
    candidate: `Develop or recalibrate the ${family} proposal strategy on this structural family.`,
    'strategy-family': `Inspect eligibility and proposal generation for ${family}; do not add lexical case dispatch.`,
    'semantic-query': 'Improve parse-only Semantic IR preservation before executing knowledge or reasoning.',
    'request-plan': 'Refine segment-aware request decomposition and obligation-specific result construction.',
    safety: 'Tighten protected-operator, nominal-surface, or request-scope validation.',
    answer: 'Inspect proof/retrieval integration only after interpretation and route checks pass.',
  };
  return recommendations[stage] ?? 'Inspect the aggregate cluster under a renamed independent seed.';
}

function failureClusterRows(clusters) {
  return frozen([...clusters.values()].map((cluster) => ({
    ...cluster,
    techniques: Object.freeze([...cluster.techniques.entries()]
      .map(([technique, count]) => Object.freeze({ technique, count }))
      .toSorted((left, right) => right.count - left.count || left.technique.localeCompare(right.technique))),
    domains: Object.freeze([...cluster.domains.entries()]
      .map(([domain, count]) => Object.freeze({ domain, count }))
      .toSorted((left, right) => right.count - left.count || left.domain.localeCompare(right.domain))),
  })).map(({ techniques, domains, ...cluster }) => ({ ...cluster, techniques, domains }))
    .toSorted((left, right) => right.count - left.count || left.id.localeCompare(right.id)));
}

function topConclusions(clusters, total) {
  return frozen(clusters.slice(0, 12).map((cluster, index) => ({
    rank: index + 1,
    clusterId: cluster.id,
    count: cluster.count,
    shareOfSuite: cluster.count / total,
    recommendation: recommendationFor(cluster.stage, cluster.targetFamily),
    promotionGate: 'Require a generic structural explanation, renamed controls, an independent seed, and no core dispatch on case metadata.',
  })));
}

function runtimeIdentity(runtime) {
  const modelId = runtime.model?.manifest?.modelId;
  const knowledgeBases = runtime.model?.manifest?.knowledgeBases ?? runtime.selected;
  if (typeof modelId !== 'string' || !modelId
      || !Array.isArray(knowledgeBases)
      || knowledgeBases.some((identity) => typeof identity !== 'string' || !identity)
      || new Set(knowledgeBases).size !== knowledgeBases.length) {
    throw new TypeError('Generated benchmark requires a runtime with a stable model and KB identity.');
  }
  return Object.freeze({ modelId, knowledgeBases: Object.freeze([...knowledgeBases]) });
}

export async function runGeneratedHeuristicBenchmark(runtime, options = {}) {
  if (!runtime || typeof runtime.ask !== 'function') throw new TypeError('Generated benchmark requires a runtime with ask().');
  const size = options.size ?? DEFAULT_GENERATED_HEURISTIC_BENCHMARK_SIZE;
  const seed = options.seed ?? GENERATED_HEURISTIC_BENCHMARK_SEED;
  const maximumRepresentativeFailures = options.maximumRepresentativeFailures ?? 24;
  const replayCommand = options.replayCommand;
  if (typeof replayCommand !== 'string' || replayCommand.length < 1 || replayCommand.length > 4_096) {
    throw new TypeError('Generated benchmark requires an explicit bounded replayCommand.');
  }
  if (!Number.isSafeInteger(maximumRepresentativeFailures)
      || maximumRepresentativeFailures < 0 || maximumRepresentativeFailures > 100) {
    throw new RangeError('maximumRepresentativeFailures must be an integer from 0 to 100.');
  }
  const cases = generateHeuristicBenchmarkCases({ size, seed });
  const aggregates = Object.fromEntries([
    'domain', 'technique', 'targetFamily', 'oracleLevel', 'status', 'route',
    'confidence', 'resource', 'complexity',
  ].map((key) => [key, new Map()]));
  const failures = [];
  const clusters = new Map();
  const strategyResults = [];
  let passed = 0;
  const started = performance.now();
  const startRssBytes = process.memoryUsage().rss;
  let sampledPeakRssBytes = startRssBytes;
  for (const testCase of cases) {
    let result;
    let error;
    try {
      result = await runtime.ask(testCase.input, {}, { grounding: false });
      strategyResults.push(resultStrategyEvidence(result));
    } catch (caught) {
      error = caught instanceof Error ? caught.message.slice(0, 512) : 'Non-Error runtime exception.';
    }
    sampledPeakRssBytes = Math.max(sampledPeakRssBytes, process.memoryUsage().rss);
    const assessment = assessGeneratedHeuristicCase(testCase, result, error);
    passed += assessment.pass ? 1 : 0;
    increment(aggregates.domain, testCase.domain, assessment.pass);
    increment(aggregates.technique, testCase.technique, assessment.pass);
    increment(aggregates.targetFamily, testCase.targetFamily, assessment.pass);
    increment(aggregates.oracleLevel, testCase.oracle.oracleLevel, assessment.pass);
    increment(aggregates.status, result?.status ?? 'EXECUTION_ERROR', assessment.pass);
    increment(aggregates.route, result?.languageRoute ?? 'none', assessment.pass);
    increment(aggregates.confidence, assessment.confidenceBand, assessment.pass);
    increment(aggregates.resource, assessment.resourceOutcome ?? 'execution-error', assessment.pass);
    increment(aggregates.complexity, String(testCase.complexity), assessment.pass);
    if (assessment.pass) continue;
    const earliest = assessment.failures[0] ?? { stage: 'execution', code: 'unclassified' };
    const clusterId = `${earliest.stage}:${earliest.code}:${testCase.targetFamily}`;
    const cluster = clusters.get(clusterId) ?? {
      id: clusterId, stage: earliest.stage, code: earliest.code, targetFamily: testCase.targetFamily,
      count: 0, techniques: new Map(), domains: new Map(), representativeCaseIds: [],
    };
    cluster.count += 1;
    cluster.techniques.set(testCase.technique, (cluster.techniques.get(testCase.technique) ?? 0) + 1);
    cluster.domains.set(testCase.domain, (cluster.domains.get(testCase.domain) ?? 0) + 1);
    if (cluster.representativeCaseIds.length < 3) cluster.representativeCaseIds.push(testCase.id);
    clusters.set(clusterId, cluster);
    if (failures.length < maximumRepresentativeFailures) {
      failures.push(frozen({
        id: testCase.id, domain: testCase.domain, technique: testCase.technique,
        targetFamily: testCase.targetFamily, input: testCase.input, oracle: testCase.oracle,
        actual: Object.freeze({
          status: result?.status ?? 'EXECUTION_ERROR', route: result?.languageRoute ?? null,
          answer: result?.answer ?? null, query: result?.query ?? null,
          selectedCandidate: result?.approximation?.selectedCandidate?.text ?? null,
          observedFamilies: assessment.observedFamilies,
        }),
        failures: assessment.failures,
      }));
    }
  }
  const wallMilliseconds = performance.now() - started;
  if (strategyResults.length === 0) throw new Error('Generated benchmark produced no valid runtime results.');
  const failureClusters = failureClusterRows(clusters);
  const definition = generatedHeuristicBenchmarkDefinition();
  const report = {
    format: GENERATED_HEURISTIC_BENCHMARK_REPORT_PROTOCOL,
    createdAt: new Date().toISOString(),
    evidenceRegime: 'internal-generated-development',
    benchmarkComparable: false,
    claimScope: 'heuristic-strategy-development-and-regression-only',
    generator: Object.freeze({
      format: GENERATED_HEURISTIC_BENCHMARK_PROTOCOL,
      seed,
      requestedCases: size,
      casesGenerated: cases.length,
      uniqueInputs: new Set(cases.map((item) => item.input)).size,
      definitionDigest: definition.digest,
      suiteDigest: generatedHeuristicSuiteDigest(cases, seed),
      domains: definition.domains.length,
      techniques: definition.techniques.length,
      observedTargetFamilies: new Set(cases.map((item) => item.targetFamily)).size,
      observedOracleLevels: new Set(cases.map((item) => item.oracle.oracleLevel)).size,
      observedTechniqueDomainCells: new Set(
        cases.map((item) => `${item.technique}\u0000${item.domain}`),
      ).size,
    }),
    execution: Object.freeze({
      casesExecuted: cases.length,
      grounding: false,
      externalLanguageAgent: false,
      replayCommand,
      runtimeIdentity: runtimeIdentity(runtime),
      behaviorIdentity: await benchmarkBehaviorIdentity(),
      wallMilliseconds,
      startRssBytes,
      endRssBytes: process.memoryUsage().rss,
      sampledPeakRssBytes,
    }),
    workPolicy: strategyResults[0].workPolicy,
    strategyConfiguration: createRuntimeBenchmarkStrategyConfiguration(strategyResults),
    total: cases.length,
    passed,
    failed: cases.length - passed,
    accuracy: passed / cases.length,
    aggregates: Object.freeze(Object.fromEntries(Object.entries(aggregates)
      .map(([key, value]) => [key, aggregateRows(value)]))),
    failureClusters,
    representativeFailures: Object.freeze(failures),
    conclusions: topConclusions(failureClusters, cases.length),
  };
  assertGeneratedHeuristicBenchmarkReport(report);
  return frozen(report);
}
