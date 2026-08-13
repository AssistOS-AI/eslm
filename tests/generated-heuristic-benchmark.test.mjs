import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { loadKnowledgeBase, mergeModels } from '../src/kbs.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';
import { EslmEngine } from '../src/runtime/engine.mjs';
import { EslmRuntime } from '../src/runtime/runtime.mjs';
import { HeuristicLanguageRuntime } from '../src/runtime/heuristic-language-runtime.mjs';
import { resolveWorkPolicy } from '../src/runtime/work-policy.mjs';
import { planHeuristicRequest } from '../src/language/heuristic-request-planning.mjs';
import { synthesizeHeuristicRequest } from '../src/runtime/heuristic-request-synthesis.mjs';
import {
  DEFAULT_GENERATED_HEURISTIC_BENCHMARK_SIZE,
  GENERATED_HEURISTIC_BENCHMARK_REPORT_PROTOCOL,
  assessGeneratedHeuristicCase,
  assertGeneratedHeuristicBenchmarkReport,
  generateHeuristicBenchmarkCases,
  runGeneratedHeuristicBenchmark,
} from '../src/evaluation/generated-heuristic-benchmark.mjs';
import { generatedHeuristicSuiteDigest } from '../src/evaluation/generated-heuristic-cases.mjs';
import {
  assertGeneratedHeuristicOracle,
  createGeneratedHeuristicOracle,
  GENERATED_HEURISTIC_ORACLE_KIND_TO_LEVEL,
} from '../src/evaluation/generated-heuristic-oracle-contract.mjs';

async function quickRuntime() {
  const workPolicy = resolveWorkPolicy('balanced');
  const model = mergeModels(await createCoreModel(), [await loadKnowledgeBase('quick')]);
  return new HeuristicLanguageRuntime(new EslmRuntime(
    new EslmEngine(model, { workPolicy }), [], ['quick'], undefined, workPolicy,
  ));
}

test('default generated heuristic suite has a deterministic broad structural distribution', () => {
  const first = generateHeuristicBenchmarkCases();
  const replay = generateHeuristicBenchmarkCases();
  assert.equal(first.length, DEFAULT_GENERATED_HEURISTIC_BENCHMARK_SIZE);
  assert.equal(first.length, 1_200);
  assert.deepEqual(first, replay);
  assert.equal(new Set(first.map((item) => item.id)).size, first.length);
  assert.equal(new Set(first.map((item) => item.domain)).size, 18);
  assert.equal(new Set(first.map((item) => item.technique)).size, 43);
  assert.equal(new Set(first.map((item) => item.targetFamily)).size, 28);
  assert.equal(new Set(first.map((item) => `${item.technique}\u0000${item.domain}`)).size, 593);
  assert.ok(first.every((item) => item.input.length > 10 && item.input.length < 1_024));
  assert.ok(first.every((item) => item.oracle && item.structuralTags.length > 0));
  assert.ok(first.every((item) =>
    GENERATED_HEURISTIC_ORACLE_KIND_TO_LEVEL[item.oracle.kind] === item.oracle.oracleLevel));
  assert.ok(first.some((item) => item.structuralTags.includes('multi-family')));
  assert.ok(first.some((item) => item.structuralTags.includes('multi-operation')));
  assert.ok(first.some((item) => item.structuralTags.includes('negative-control')));
  assert.deepEqual([...new Set(first.map((item) => item.oracle.oracleLevel))].toSorted(), [
    'answer-execution', 'candidate-selection', 'proposal-only', 'query-local-decomposition',
    'request-execution', 'request-planning', 'safety-abstention', 'semantic-query-execution',
  ]);
  assert.ok(first.some((item) => item.oracle.oracleLevel === 'candidate-selection'));
  assert.ok(first.every((item) => item.oracle.oracleLevel !== 'semantic-ir'));
  assert.doesNotMatch(JSON.stringify(first), /\b(?:Abura|mura|bana)\b/u);
});

test('oracle contract is an exact discriminated union and rejects stale spread combinations', () => {
  const cases = generateHeuristicBenchmarkCases({ size: 200, seed: 'oracle-discriminants' });
  assert.deepEqual([...new Set(cases.map((item) => item.oracle.kind))].toSorted(),
    Object.keys(GENERATED_HEURISTIC_ORACLE_KIND_TO_LEVEL).toSorted());
  for (const testCase of cases) assert.equal(assertGeneratedHeuristicOracle(testCase.oracle), testCase.oracle);

  const semantic = cases.find((item) => item.oracle.kind === 'semantic-query-execution').oracle;
  const staleEntailmentSpread = { ...structuredClone(semantic), kind: 'boolean-entailment' };
  assert.throws(() => assertGeneratedHeuristicOracle(staleEntailmentSpread), /kind and oracleLevel/u);
  const wrongLevel = { ...structuredClone(semantic), oracleLevel: 'answer-execution' };
  assert.throws(() => assertGeneratedHeuristicOracle(wrongLevel), /kind and oracleLevel/u);
  const safety = structuredClone(cases.find((item) => item.oracle.kind === 'safe-abstention').oracle);
  safety.requiredFamilies = [];
  assert.throws(() => assertGeneratedHeuristicOracle(safety), /must contain exactly/u);
  const request = structuredClone(cases.find((item) => item.oracle.kind === 'request-planning').oracle);
  delete request.operationSequence;
  assert.throws(() => assertGeneratedHeuristicOracle(request), /must contain exactly/u);
  const mismatchedOperation = structuredClone(
    cases.find((item) => item.oracle.kind === 'request-construction'
      && item.oracle.operationContracts.length > 1).oracle,
  );
  mismatchedOperation.operationContracts[1].intent = 'outline';
  assert.throws(() => assertGeneratedHeuristicOracle(mismatchedOperation), /follow operationSequence/u);
  const relabeledPlan = structuredClone(
    cases.find((item) => item.oracle.kind === 'request-planning').oracle,
  );
  relabeledPlan.kind = 'request-construction';
  relabeledPlan.oracleLevel = 'request-execution';
  assert.throws(() => assertGeneratedHeuristicOracle(relabeledPlan), /incoherent route or status/u);
  assert.throws(() => createGeneratedHeuristicOracle('safe-abstention', {
    ...structuredClone(cases.find((item) => item.oracle.kind === 'safe-abstention').oracle),
  }), /owns kind and oracleLevel/u);
});

test('candidate-selection contracts require the expected candidate to win, not merely appear', () => {
  const testCase = generateHeuristicBenchmarkCases({ size: 100, seed: 'selection-contract' })
    .find((item) => item.oracle.oracleLevel === 'candidate-selection');
  assert.ok(testCase);
  const expected = testCase.oracle.expectedCandidateText;
  const base = {
    status: 'UNKNOWN', languageRoute: 'heuristic-cnl-approximated', answer: null,
    approximation: {
      selectedCandidate: {
        text: 'Does a different subject map a different object?',
        supportingFamilies: testCase.oracle.requiredFamilies,
        confidenceBand: 'medium',
      },
      recommendedCandidate: { text: expected, supportingFamilies: testCase.oracle.requiredFamilies },
      candidates: [
        { text: expected, supportingFamilies: testCase.oracle.requiredFamilies },
      ],
      receipt: { complete: true, familyReceipts: [] },
    },
  };
  const assessment = assessGeneratedHeuristicCase(testCase, base);
  assert.equal(assessment.pass, false);
  assert.ok(assessment.failures.some((item) => item.code === 'expected-candidate-not-selected'));
});

test('candidate-selection evidence binds the winner to its family, reparse, and executed episode', () => {
  const testCase = generateHeuristicBenchmarkCases({ size: 100, seed: 'selection-evidence' })
    .find((item) => item.oracle.oracleLevel === 'candidate-selection');
  const text = testCase.oracle.expectedCandidateText;
  const family = testCase.oracle.requiredFamilies[0];
  const valid = {
    status: 'UNKNOWN', languageRoute: 'heuristic-cnl-approximated', answer: null,
    episode: { interpretedText: text },
    approximation: {
      selectedCandidate: {
        candidateId: 'candidate:1', text, supportingFamilies: [family], confidenceBand: 'medium',
      },
      recommendedCandidate: { text, supportingFamilies: [family] },
      candidates: [{ text, supportingFamilies: [family] }],
      reparses: [{
        candidateId: 'candidate:1', text, status: 'PARSED', acceptedSemanticIr: true,
      }],
      receipt: { complete: true, familyReceipts: [] },
    },
  };
  assert.equal(assessGeneratedHeuristicCase(testCase, valid).pass, true);
  const mutations = [
    { ...valid, episode: { interpretedText: 'Does something else happen?' } },
    { ...valid, approximation: { ...valid.approximation, reparses: [] } },
    { ...valid, approximation: {
      ...valid.approximation,
      selectedCandidate: { ...valid.approximation.selectedCandidate, supportingFamilies: [] },
    } },
  ];
  for (const mutation of mutations) {
    assert.equal(assessGeneratedHeuristicCase(testCase, mutation).pass, false);
  }
});

test('query-local decomposition requires the selected and executed candidate, not a spare proposal', () => {
  const testCase = generateHeuristicBenchmarkCases({ size: 100, seed: 'decomposition-selection' })
    .find((item) => item.oracle.oracleLevel === 'query-local-decomposition');
  const text = testCase.oracle.expectedCandidateText;
  const family = testCase.oracle.requiredFamilies[0];
  const valid = {
    status: 'PARTIAL', languageRoute: 'heuristic-cnl-approximated', answer: 'query-local',
    values: [], provenance: [], episode: { interpretedText: text },
    approximation: {
      selectedCandidate: {
        candidateId: 'candidate:selected', text, supportingFamilies: [family], confidenceBand: 'medium',
      },
      recommendedCandidate: { text, supportingFamilies: [family] },
      candidates: [{ text, supportingFamilies: [family] }],
      reparses: [{
        candidateId: 'candidate:selected', text, status: 'PARSED', acceptedSemanticIr: true,
      }],
      receipt: { complete: true, familyReceipts: [] },
    },
  };
  assert.equal(assessGeneratedHeuristicCase(testCase, valid).pass, true);
  const unselected = {
    ...valid,
    episode: { interpretedText: 'A different decomposition.' },
    approximation: {
      ...valid.approximation,
      selectedCandidate: {
        candidateId: 'candidate:different', text: 'A different decomposition.',
        supportingFamilies: [], confidenceBand: 'medium',
      },
      candidates: [valid.approximation.selectedCandidate],
      reparses: [],
    },
  };
  const assessment = assessGeneratedHeuristicCase(testCase, unselected);
  assert.equal(assessment.pass, false);
  assert.ok(assessment.failures.some((item) => item.code === 'expected-candidate-not-selected'));
});

test('safety abstention rejects answer-bearing outcomes even under an allowed status', () => {
  const testCase = generateHeuristicBenchmarkCases({ size: 100, seed: 'safety-evidence' })
    .find((item) => item.oracle.oracleLevel === 'safety-abstention');
  const unsafe = {
    status: 'UNPARSED', languageRoute: 'direct-symbolic', answer: 'Unsupported.',
    values: ['fabricated'], provenance: [{ fact: 'fabricated' }], usedKbVersions: [],
  };
  const assessment = assessGeneratedHeuristicCase(testCase, unsafe);
  assert.equal(assessment.pass, false);
  assert.ok(assessment.failures.some((item) => item.code === 'answer-bearing-abstention'));
});

test('proposal-only evidence binds the required family to the exact retained proposal', () => {
  const testCase = generateHeuristicBenchmarkCases({ size: 100, seed: 'proposal-family-binding' })
    .find((item) => item.oracle.oracleLevel === 'proposal-only');
  const text = testCase.oracle.expectedCandidateText;
  const family = testCase.oracle.requiredFamilies[0];
  const result = {
    status: 'UNPARSED', languageRoute: 'direct-symbolic', answer: null,
    values: [], provenance: [], usedKbVersions: [],
    approximation: {
      candidates: [{ text, supportingFamilies: ['unrelated-family'] }],
      recommendedCandidate: { text, supportingFamilies: ['unrelated-family'] },
      receipt: { complete: true, familyReceipts: [{ family, proposalsRetained: 1 }] },
    },
  };
  const assessment = assessGeneratedHeuristicCase(testCase, result);
  assert.equal(assessment.pass, false);
  assert.ok(assessment.failures.some((item) => item.code === 'candidate-family-not-bound'));
  result.approximation.candidates[0].supportingFamilies.push(family);
  result.approximation.recommendedCandidate.supportingFamilies.push(family);
  assert.equal(assessGeneratedHeuristicCase(testCase, result).pass, true);
});

test('request planning and request construction remain distinct oracle gates', () => {
  const cases = generateHeuristicBenchmarkCases({ size: 200, seed: 'request-oracle-kinds' });
  const construction = cases.find((item) => item.oracle.kind === 'request-construction');
  const planning = cases.find((item) => item.oracle.kind === 'request-planning');
  assert.ok(construction && planning);
  const resultFor = (testCase) => ({
    status: testCase.oracle.acceptableStatuses[0],
    languageRoute: testCase.oracle.expectedRoute,
    requestPlanning: { selectedPlan: {
      primaryIntent: testCase.oracle.operation,
      operationPlans: testCase.oracle.operationContracts.map((contract) => ({
        intent: contract.intent,
        outputContract: { artifact: contract.artifact, format: contract.format },
      })),
      outputContract: {
        artifact: testCase.oracle.artifact,
        format: testCase.oracle.format,
      },
    } },
  });
  const constructedPlanning = planHeuristicRequest(construction.input);
  const constructedSynthesis = synthesizeHeuristicRequest(constructedPlanning);
  const constructedResult = {
    ...resultFor(construction), requestPlanning: constructedPlanning,
    answer: constructedSynthesis.answer, synthesis: constructedSynthesis,
  };
  const constructed = assessGeneratedHeuristicCase(construction, constructedResult);
  const planned = assessGeneratedHeuristicCase(planning, resultFor(planning));
  assert.equal(constructed.pass, true);
  assert.equal(planned.pass, true);
  assert.ok(constructed.gateReceipts.some((item) => item.gateId === 'constructed-request-artifact'));
  assert.ok(planned.gateReceipts.some((item) => item.gateId === 'missing-source-request-plan'));

  const constructionAsPlanning = assessGeneratedHeuristicCase(construction, resultFor(planning));
  const planningAsConstruction = assessGeneratedHeuristicCase(planning, resultFor(construction));
  assert.equal(constructionAsPlanning.pass, false);
  assert.equal(planningAsConstruction.pass, false);
  assert.ok(constructionAsPlanning.failures.some((item) => item.stage === 'route'));
  assert.ok(planningAsConstruction.failures.some((item) => item.stage === 'route'));

  const multi = cases.find((item) => item.oracle.kind === 'request-construction'
    && item.oracle.operationContracts.length > 1);
  assert.ok(multi);
  const wrongSecondaryShape = resultFor(multi);
  wrongSecondaryShape.requestPlanning.selectedPlan.operationPlans[1].outputContract.format = 'paragraphs';
  const wrongSecondary = assessGeneratedHeuristicCase(multi, wrongSecondaryShape);
  assert.equal(wrongSecondary.pass, false);
  assert.ok(wrongSecondary.failures.some((item) => item.code === 'request-obligations-missing'));

  const noConstruction = assessGeneratedHeuristicCase(construction, resultFor(construction));
  assert.equal(noConstruction.pass, false);
  assert.ok(noConstruction.failures.some((item) => item.code === 'construction-receipt-missing'));
  const wrongPublicAnswer = structuredClone(constructedResult);
  wrongPublicAnswer.answer = 'Unrelated prose.';
  assert.equal(assessGeneratedHeuristicCase(construction, wrongPublicAnswer).pass, false);
});

test('seed changes nonce surfaces and suite identity without changing structural coverage', () => {
  const left = generateHeuristicBenchmarkCases({ size: 128, seed: 'independent-left' });
  const right = generateHeuristicBenchmarkCases({ size: 128, seed: 'independent-right' });
  assert.notEqual(generatedHeuristicSuiteDigest(left, 'independent-left'),
    generatedHeuristicSuiteDigest(right, 'independent-right'));
  assert.notEqual(left[0].input, right[0].input);
  assert.deepEqual(
    [...new Set(left.map((item) => item.targetFamily))].toSorted(),
    [...new Set(right.map((item) => item.targetFamily))].toSorted(),
  );
});

test('generated runner executes the real runtime and preserves every case in aggregate denominators', async () => {
  const report = await runGeneratedHeuristicBenchmark(await quickRuntime(), {
    size: 64, seed: 'focused-runner', maximumRepresentativeFailures: 7,
    replayCommand: 'node src/cli.mjs benchmark generated --cases 64 --seed focused-runner',
  });
  assert.equal(report.format, GENERATED_HEURISTIC_BENCHMARK_REPORT_PROTOCOL);
  assert.equal(report.evidenceRegime, 'internal-generated-development');
  assert.equal(report.benchmarkComparable, false);
  assert.equal(report.generator.casesGenerated, 64);
  assert.equal(report.generator.uniqueInputs, 64);
  assert.ok(report.generator.observedTargetFamilies >= 2);
  assert.ok(report.generator.observedOracleLevels >= 2);
  assert.ok(report.generator.observedTechniqueDomainCells >= report.generator.domains);
  assert.equal(report.execution.casesExecuted, 64);
  assert.equal(report.total, 64);
  assert.equal(report.passed + report.failed, 64);
  assert.equal(report.accuracy, report.passed / 64);
  assert.ok(report.aggregates.domain.reduce((sum, row) => sum + row.total, 0) === 64);
  assert.ok(report.aggregates.technique.reduce((sum, row) => sum + row.total, 0) === 64);
  assert.ok(report.aggregates.targetFamily.reduce((sum, row) => sum + row.total, 0) === 64);
  assert.ok(report.aggregates.oracleLevel.reduce((sum, row) => sum + row.total, 0) === 64);
  assert.ok(report.failureClusters.reduce((sum, row) => sum + row.count, 0) === report.failed);
  assert.ok(report.representativeFailures.length <= 7);
  assert.ok(report.conclusions.every((item) => item.promotionGate.includes('independent seed')));
  assert.equal(report.strategyConfiguration.mode, 'runtime-work-policy');
  assert.equal(report.execution.grounding, false);
  assert.equal(report.execution.externalLanguageAgent, false);
  assert.equal(Object.isFrozen(report), true);
  const inventedOracle = structuredClone(report);
  inventedOracle.aggregates.oracleLevel[0].key = 'semantic-ir';
  assert.throws(() => assertGeneratedHeuristicBenchmarkReport(inventedOracle), /oracle level/u);
});

test('generated benchmark metadata cannot become runtime dispatch input', async () => {
  for (const path of [
    'src/runtime/engine.mjs', 'src/runtime/runtime.mjs',
    'src/runtime/heuristic-language-runtime.mjs', 'src/reasoning/datalog.mjs',
  ]) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /generated-heuristic|targetFamily|structuralTags/u, path);
  }
  const assessor = await readFile(new URL(
    '../src/evaluation/generated-heuristic-case-assessor.mjs', import.meta.url,
  ), 'utf8');
  assert.doesNotMatch(assessor,
    /testCase\.(?:id|input|domain|technique|targetFamily|complexity|structuralTags)/u);
  assert.doesNotMatch(assessor, /\b(?:Abura|mura|bana)\b/u);
});

test('generated suite rejects unbounded or invalid controls', async () => {
  assert.throws(() => generateHeuristicBenchmarkCases({ size: 0 }), RangeError);
  assert.throws(() => generateHeuristicBenchmarkCases({ size: 20_001 }), RangeError);
  assert.throws(() => generateHeuristicBenchmarkCases({ seed: '' }), TypeError);
  await assert.rejects(runGeneratedHeuristicBenchmark({}, { size: 1 }), TypeError);
});
