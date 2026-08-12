import { benchmarkReportFields } from './benchmark-report-contract.mjs';
import { benchmarkCatalogFields } from './benchmark-report-catalog.mjs';
import { RESEARCH_BENCHMARK_CATALOG } from './benchmark-research-catalog.mjs';
import { executedRow, receipt } from './research-benchmark-report-row-common.mjs';
import { TASK_ROW_FACTORIES } from './research-benchmark-report-task-rows.mjs';

async function logicbenchRow() {
  const [fresh, source] = await Promise.all([
    receipt('training/benchmark-sources/logicbench/fresh-result.json'),
    receipt('training/benchmark-sources/logicbench/source-manifest.json'),
  ]);
  const statuses = {};
  for (const mode of Object.values(fresh.modes)) {
    for (const [status, count] of Object.entries(mode.statuses)) statuses[status] = (statuses[status] ?? 0) + count;
  }
  return executedRow('logicbench', {
    evidenceState: 'fresh-evaluation-executed', protocol: fresh.protocol,
    protocolDescription: 'The adapter compiles controlled logical arguments into finite classical or prioritized-default tasks, then scores binary answers or multiple-choice selections against the isolated oracle.',
    samplePolicy: 'complete one-shot official evaluation source after development freeze',
    sampleDescription: 'The candidate was frozen on LogicBench(Aug) before every BQA and MCQA case in LogicBench(Eval) was scored once. Only aggregate and family counts were retained.',
    splitQuality: 'source-version',
    total: fresh.tested, correct: fresh.correct, attempted: statuses.SOLVED ?? 0,
    forcedChoice: true, executedAt: fresh.executedAt,
    normalizationCandidates: statuses.UNPARSED ?? 0,
    agentInvocations: fresh.codingAgentInvocations,
    statusCounts: statuses,
    strata: fresh.modes,
    sampleCoverage: {
      tested: fresh.tested, available: fresh.available, unit: 'official evaluation questions', comprehensive: true,
      scope: 'The latest result executed all 1,520 BQA and all 500 MCQA cases in the pinned evaluation source. The 12,908 augmented development cases belong to the earlier development checkpoint.',
    },
    capabilityCoverage: {
      level: 'fresh-generalization-gap',
      description: 'Finite classical and skeptical default reasoning execute correctly after a controlled argument is compiled, but most fresh BQA and MCQA language surfaces still fail before a usable task or choice comparison is formed.',
    },
    diagnosis: fresh.diagnosisBoundary,
    comparability: fresh.claim,
    sourceEvidence: [{ path: 'training/benchmark-sources/logicbench/source-manifest.json', sourceRevision: source.sourceRevision }],
  });
}

async function proofwriterRow() {
  const result = await receipt('training/benchmark-sources/proofwriter/development-result.json');
  return executedRow('proofwriter', {
    evidenceState: 'development-probe-executed', protocol: result.protocol,
    protocolDescription: 'The logical-form track computes open-world safe-Horn closure, distinguishes true, false, and unknown, and validates every returned support witness. A separate direct-language pass measures whether the ordinary frontend can construct the same task.',
    samplePolicy: result.coverage.selection,
    sampleDescription: 'The sample contains 20 development questions in each official depth-by-answer stratum across depths 0, 1, 2, 3, and 5.',
    splitQuality: 'row-IID-stratified',
    total: result.coverage.tested, correct: result.logicalFormTrack.correct,
    attempted: result.coverage.tested, forcedChoice: true,
    executedAt: result.executedAt ?? result.measuredAt,
    normalizationCandidates: result.directNaturalLanguageDiagnostic.statusCounts.UNPARSED,
    agentInvocations: result.directNaturalLanguageDiagnostic.codingAgentInvocations,
    statusCounts: { SOLVED_LOGICAL_FORM: result.logicalFormTrack.correct },
    sampleCoverage: {
      tested: result.coverage.tested, available: result.coverage.available,
      unit: 'main open-world development questions', comprehensive: result.coverage.comprehensive,
      scope: 'The latest run tested 300 of 50,844 main open-world development questions. It did not score CWA, staged implication, abduction, NatLang variants, or official test files.',
    },
    capabilityCoverage: {
      level: 'logical-form-strong-language-missing',
      description: 'The generic Horn core solves the selected inert logical programs and produces valid witnesses, while the ordinary natural-language frontend cannot yet compile their arbitrary unary, binary, negative, and rule statements.',
    },
    diagnosis: result.directNaturalLanguageDiagnostic.interpretation,
    comparability: 'Development diagnostic through the official logical representation; not a full ProofWriter or natural-language leaderboard score.',
    subtrackResults: [Object.freeze({
      id: 'direct-natural-language-diagnostic',
      label: 'Ordinary runtime language frontend',
      track: 'raw-language',
      inputRoute: 'raw-language',
      tested: result.directNaturalLanguageDiagnostic.tested,
      attempted: 0,
      correct: 0,
      endToEndAccuracy: 0,
      attemptCoverage: 0,
      selectiveAccuracy: null,
      statusCounts: result.directNaturalLanguageDiagnostic.statusCounts,
    })],
    sourceEvidence: [{ path: 'training/benchmark-sources/proofwriter/development-result.json' }],
  });
}

async function prontoqaRow() {
  const [fresh, development] = await Promise.all([
    receipt('training/benchmark-sources/prontoqa-ood/fresh-aggregate.json'),
    receipt('training/benchmark-sources/prontoqa-ood/development-scalable-result.json'),
  ]);
  return executedRow('prontoqa', {
    evidenceState: fresh.evidenceState, protocol: fresh.format,
    protocolDescription: 'The adapter grounds the controlled ontology formulas, explicitly declares the source calculus inconsistency policy, and invokes generic Tseitin-CNF plus query-directed DPLL entailment. Every certificate or countermodel is independently replayed before scoring.',
    samplePolicy: 'complete one-shot sealed fresh partition after behavior freeze',
    sampleDescription: 'All 6,320 label-blind fresh members were executed once after source, adapter, solver, verifier, tests, and membership were frozen. Only aggregate and rule-family counts left the evaluator.',
    splitQuality: 'row-IID-generated',
    total: fresh.tested, correct: fresh.correct, attempted: fresh.statusCounts.SOLVED,
    forcedChoice: true, executedAt: fresh.executedAt,
    selectedMethods: [fresh.methodId],
    normalizationCandidates: fresh.normalizationInvocations,
    agentInvocations: fresh.codingAgentInvocations,
    statusCounts: fresh.statusCounts,
    strata: fresh.strata,
    sampleCoverage: {
      tested: fresh.tested, available: fresh.available,
      unit: 'sealed official generated cases', comprehensive: true,
      scope: 'The latest run executed the complete 6,320-member fresh partition. Before the freeze, the separate complete development run executed all 1,580 development members and independently verified every witness.',
    },
    capabilityCoverage: {
      level: 'complete-for-frozen-generated-semantic-task',
      description: 'All eight rule families pass under the frozen finite propositional projection. The result establishes semantic entailment and independently checked witnesses for this source, not unrestricted first-order reasoning or textual equivalence to reference proof prose.',
    },
    diagnosis: fresh.claimBoundary,
    comparability: 'One-shot sealed fresh semantic execution under the pinned local protocol; not an official natural-language proof-trace leaderboard submission.',
    developmentResult: {
      tested: development.completeDevelopment.tested,
      correct: development.completeDevelopment.correct,
      accuracy: development.completeDevelopment.accuracy,
    },
    sourceEvidence: [
      { path: 'training/benchmark-sources/prontoqa-ood/pre-fresh-freeze.json' },
      { path: 'training/benchmark-sources/prontoqa-ood/fresh-aggregate.json' },
      { path: 'training/benchmark-sources/prontoqa-ood/development-scalable-result.json' },
    ],
  });
}

async function folioRow() {
  const result = await receipt('training/benchmark-sources/folio/development-result.json');
  return executedRow('folio', {
    evidenceState: 'development-probe-executed', protocol: result.protocol,
    protocolDescription: 'The formula track parses official FOL annotations, grounds the supported finite fragment, and returns entailment, counterevidence, inconsistency, unsupported syntax, or resource limits. Direct natural-language coverage is measured separately.',
    samplePolicy: 'complete pinned official v0.0 validation file',
    sampleDescription: 'Every validation record was executed. Both available labeled files are development-visible and the official v0.0 test set is unreleased, so this is not fresh evidence.',
    splitQuality: 'official-development',
    total: result.formulaTrack.tested, correct: result.formulaTrack.correct,
    attempted: result.formulaTrack.statuses.SOLVED, forcedChoice: true, executedAt: result.executedAt,
    normalizationCandidates: null,
    agentInvocations: result.runtimeFrontend.languageAgentInvocations ?? result.runtimeFrontend.codingAgentInvocations,
    statusCounts: result.formulaTrack.statuses,
    sampleCoverage: {
      tested: result.tested, available: result.available, unit: 'official v0.0 validation cases',
      comprehensive: result.comprehensive,
      scope: 'The latest run executed all 204 cases in the pinned validation file. It is comprehensive for that development-visible file, not for an unreleased official test set or the separately gated corrected v2 source.',
    },
    capabilityCoverage: {
      level: 'bounded-formula-and-development-language-candidate',
      description: 'The formula adapter handles a useful finite FOL fragment. A generic controlled quantified-English candidate now compiles some sentences and queries for adapter-guided development analysis, but it is not registered in the Stage A runtime and complete-case natural-language coverage remains low.',
    },
    diagnosis: `The complete official-formula track scored ${result.formulaTrack.correct}/${result.formulaTrack.tested}; 146 cases used exhaustive finite enumeration and 53 used certificate-producing scalable Boolean entailment, while five malformed source formulas were not executed. The separate full-language candidate compiled ${result.naturalLanguage.parsedSentences}/${result.naturalLanguage.totalSentences} sentence slots and scored ${result.naturalLanguage.correct}/${result.naturalLanguage.tested} complete cases. The diagnostic query-only track compiled ${result.naturalLanguageQuery.languageCompiled}/${result.naturalLanguageQuery.tested} conclusions and scored ${result.naturalLanguageQuery.correct}/${result.naturalLanguageQuery.tested}, but it uses premise-annotation vocabulary and is not direct-language accuracy. The deployed runtime frontend was not rerun in this candidate iteration; Language Agent use remained zero.`,
    comparability: 'Complete development run over official v0.0 validation formulas; not an untouched test score and not direct natural-language accuracy.',
    subtrackResults: [Object.freeze({
      id: 'full-natural-language-development-candidate',
      label: 'All-premises-and-query natural-language candidate',
      track: 'raw-language', inputRoute: 'source-template',
      tested: result.naturalLanguage.tested,
      correct: result.naturalLanguage.correct,
      accuracy: result.naturalLanguage.accuracy,
    }), Object.freeze({
      id: 'premise-vocabulary-assisted-query-diagnostic',
      label: 'Natural-language query with premise-annotation vocabulary',
      track: 'raw-language', inputRoute: 'source-annotation',
      tested: result.naturalLanguageQuery.tested,
      correct: result.naturalLanguageQuery.correct,
      accuracy: result.naturalLanguageQuery.accuracy,
    })],
    sourceEvidence: [{ path: 'training/benchmark-sources/folio/development-result.json' }],
  });
}

async function proverQaRow() {
  const [fresh, development, source] = await Promise.all([
    receipt('training/benchmark-sources/proverqa/fresh-aggregate.json'),
    receipt('training/benchmark-sources/proverqa/development-result.json'),
    receipt('training/benchmark-sources/proverqa/source-manifest.json'),
  ]);
  return executedRow('proverqa', {
    evidenceState: fresh.evidenceState,
    protocol: fresh.track,
    protocolDescription: 'The adapter reads the source-provided first-order annotations, performs label-blind predicate-morphology reconciliation, and invokes the generic finite entailment core. A prediction counts only after its proof or countermodel witness passes independent verification.',
    samplePolicy: 'complete aggregate-only execution of the protected partition after the development candidate and dependencies were frozen',
    sampleDescription: 'The candidate first passed all 300 development-visible cases. The latest run then executed all 1,200 protected members and returned only aggregate and declared difficulty/answer counts.',
    splitQuality: 'row-IID',
    total: fresh.tested,
    correct: fresh.correct,
    attempted: fresh.statusCounts.SOLVED,
    forcedChoice: true,
    executedAt: fresh.executedAt,
    normalizationCandidates: fresh.normalizationCandidates,
    agentInvocations: fresh.languageAgentInvocations,
    statusCounts: fresh.statusCounts,
    strata: { byLevel: fresh.byLevel, byAnswer: fresh.byAnswer },
    sampleCoverage: {
      tested: fresh.tested,
      available: fresh.available,
      unit: 'protected annotation-assisted evaluation cases',
      comprehensive: true,
      scope: 'The latest run tested every member of the 1,200-case protected partition. The other 300 public evaluation cases formed the completed development set; the separate 5,000-record training source is not part of this denominator.',
    },
    capabilityCoverage: {
      level: 'fresh-annotation-assisted-logical-execution-nearly-complete',
      description: `All ${development.tested} development tasks pass. On fresh evidence, ${fresh.proofOrCountermodelWitnessesValid}/${fresh.tested} tasks produced independently valid proof or countermodel witnesses. Predicate reconciliation is same-arity and label-blind; its modifier-omission rule requires explicit aligned surface evidence and rejects an otherwise similar contrast.`,
    },
    diagnosis: `${fresh.correct}/${fresh.tested} fresh cases matched the isolated oracle. ${fresh.statusCounts.INCONSISTENT_CONTEXT} compiled contexts were inconsistent and the aggregate shows two additional strict mismatches among solved cases; no per-case outcome escaped, so these cannot guide post-fresh tuning. Direct derivation of the formulas from English remains a separate unimplemented capability.`,
    comparability: fresh.claimBoundary,
    sourceEvidence: [
      { path: 'training/benchmark-sources/proverqa/source-manifest.json', sourceRevision: source.datasetRevision },
      { path: 'training/benchmark-sources/proverqa/partition-manifest.json' },
      { path: 'training/benchmark-sources/proverqa/development-result.json' },
      { path: 'training/benchmark-sources/proverqa/pre-fresh-freeze-v2.json' },
      { path: 'training/benchmark-sources/proverqa/fresh-aggregate.json' },
    ],
  });
}

async function satBenchRow() {
  const [fresh, development] = await Promise.all([
    receipt('training/benchmark-sources/satbench/fresh-aggregate.json'),
    receipt('training/benchmark-sources/satbench/development-result.json'),
  ]);
  return executedRow('satbench', {
    evidenceState: 'fresh-evaluation-executed',
    protocol: fresh.track,
    protocolDescription: 'The adapter converts the official signed-integer CNF annotation into generic Boolean premises. SAT answers require a satisfying assignment checked against every source clause; UNSAT answers require a replayable DPLL inconsistency certificate accepted by an independent verifier.',
    samplePolicy: 'complete one-shot sealed fresh partition after source, adapter, solver, verifier, and membership freeze',
    sampleDescription: 'All 1,680 fresh members were scored exactly once after the 420-case development partition passed. The evaluator returned only aggregate and declared stratum counts.',
    splitQuality: 'row-IID-stratified',
    total: fresh.tested,
    correct: fresh.correct,
    attempted: fresh.statusCounts.SOLVED,
    forcedChoice: true,
    executedAt: fresh.executedAt,
    selectedMethods: [fresh.methodId],
    normalizationCandidates: 0,
    agentInvocations: fresh.languageAgentInvocations,
    statusCounts: fresh.statusCounts,
    strata: fresh.strata,
    sampleCoverage: {
      tested: fresh.tested,
      available: fresh.available,
      unit: 'sealed source-annotated formula cases',
      comprehensive: true,
      scope: 'The latest run executed all 1,680 members of the sealed formula-track partition. The separate development run executed all 420 development members. This denominator does not measure the authors\' natural-language-only prompt protocol.',
    },
    capabilityCoverage: {
      level: 'complete-for-frozen-source-annotated-cnf-track',
      description: `All ${fresh.tested} fresh cases returned independently verified SAT assignments or UNSAT certificates. Development covered ${development.execution.witnessKinds['satisfying-assignment']} SAT and ${development.execution.witnessKinds['dpll-inconsistency-certificate']} UNSAT cases before the freeze. A generic natural-language constraint compiler remains a separate unimplemented capability.`,
    },
    diagnosis: fresh.oracleBoundary,
    comparability: fresh.claimBoundary,
    sourceEvidence: [
      { path: 'training/benchmark-sources/satbench/source-manifest.json', sourceRevision: fresh.source.datasetRevision },
      { path: 'training/benchmark-sources/satbench/pre-fresh-freeze.json' },
      { path: 'training/benchmark-sources/satbench/fresh-aggregate.json' },
    ],
  });
}

async function logicSkillsRow() {
  const [result, freshCountermodel] = await Promise.all([
    receipt('training/benchmark-sources/logicskills/development-result.json'),
    receipt('training/benchmark-sources/logicskills/fresh-countermodel-aggregate.json'),
  ]);
  return executedRow('logicskills', {
    evidenceState: 'development-probe-executed', protocol: result.protocol,
    protocolDescription: 'The strict adapter preserves three different output contracts: a formula whose correctness requires semantic equivalence, a validity selection whose oracle is isolated, and a finite countermodel that must be verified rather than string-matched.',
    samplePolicy: 'label-blind task-and-language-stratified 80/20 public-evaluation reclassification',
    sampleDescription: 'All 1,200 development members were submitted through the typed task boundary. A previous frozen candidate executed the 60-member fresh countermodel stratum once; the 240 fresh symbolization and validity members remain sealed.',
    splitQuality: 'row-IID-stratified',
    executedAt: result.executedAt ?? result.measuredAt,
    total: result.tested, correct: null,
    normalizationCandidates: null,
    agentInvocations: result.languageAgentInvocations,
    statusCounts: result.statusCounts,
    subtrackResults: [
      Object.freeze({
        id: 'symbolization-development', label: 'Symbolization development track',
        track: 'raw-language', inputRoute: 'source-template',
        evidenceState: 'development-probe-executed', tested: result.symbolizationTrack.tested,
        attempted: result.symbolizationTrack.attempted,
        correct: result.symbolizationTrack.correct,
        endToEndAccuracy: result.symbolizationTrack.accuracyOverCompleteDevelopmentTrack,
        attemptCoverage: result.symbolizationTrack.attempted / result.symbolizationTrack.tested,
        selectiveAccuracy: result.symbolizationTrack.accuracyOnAttempted,
        accuracy: result.symbolizationTrack.accuracyOverCompleteDevelopmentTrack,
      }),
      Object.freeze({
        id: 'validity-development', label: 'Validity development track',
        track: 'structured-task', inputRoute: 'source-annotation',
        evidenceState: 'development-probe-executed', tested: result.validityTrack.tested,
        attempted: result.validityTrack.attempted,
        correct: 0,
        endToEndAccuracy: 0,
        attemptCoverage: 0,
        selectiveAccuracy: null,
        accuracy: 0,
      }),
      Object.freeze({
        id: 'countermodel-development', label: 'Countermodel development track',
        track: 'solver-conformance', inputRoute: 'source-annotation',
        evidenceState: 'development-probe-executed', tested: result.semanticTrack.tested,
        attempted: result.semanticTrack.tested, correct: result.semanticTrack.correct,
        endToEndAccuracy: result.semanticTrack.accuracy, attemptCoverage: 1,
        selectiveAccuracy: result.semanticTrack.accuracy, accuracy: result.semanticTrack.accuracy,
      }),
      Object.freeze({
      id: 'countermodel-fresh', label: 'Countermodel fresh subtrack', evidenceState: freshCountermodel.evidenceState,
      track: 'solver-conformance', inputRoute: 'source-annotation',
      tested: freshCountermodel.tested, correct: freshCountermodel.correct,
      attempted: freshCountermodel.tested, endToEndAccuracy: freshCountermodel.accuracy,
      attemptCoverage: 1, selectiveAccuracy: freshCountermodel.accuracy,
      accuracy: freshCountermodel.accuracy, executedAt: freshCountermodel.measuredAt,
      }),
    ],
    sampleCoverage: {
      tested: result.tested, available: result.tested,
      unit: 'development-partition cases', comprehensive: true,
      scope: 'The latest run covered all 1,200 development members: 480 symbolization, 480 validity, and 240 countermodel cases. Of the separate 300-member fresh partition, 60 countermodel cases were executed once by an earlier frozen candidate and 240 symbolization or validity cases remain unopened.',
    },
    capabilityCoverage: {
      level: 'controlled-symbolization-partial-countermodel-complete-validity-absent',
      description: `The development-only controlled symbolizer emitted ${result.symbolizationTrack.correct}/${result.symbolizationTrack.tested} formulas, all witness-verified with no emitted mismatch under the sound incomplete equivalence checker. The generic finite-model method verified ${result.semanticTrack.correct}/${result.semanticTrack.tested} development and ${freshCountermodel.correct}/${freshCountermodel.tested} sealed fresh countermodels. No complete validity method is registered.`,
    },
    diagnosis: `Symbolization is ${result.symbolizationTrack.correct}/${result.symbolizationTrack.tested} over the complete development track: every emitted formula has a replayed derivation and accepted semantic equivalence, while ${result.symbolizationTrack.abstained} unsupported cases remain explicit. Countermodels are ${result.semanticTrack.correct}/${result.semanticTrack.tested} with independent semantic verification. Validity has ${result.validityTrack.attempted} attempts, so end-to-end forced-choice accuracy is 0% and selective accuracy remains undefined. The row does not fabricate one aggregate percentage across unlike output contracts.`,
    comparability: result.comparability,
    sourceEvidence: [
      { path: 'training/benchmark-sources/logicskills/source-manifest.json' },
      { path: 'training/benchmark-sources/logicskills/partition-manifest.json' },
      { path: 'training/benchmark-sources/logicskills/development-result.json' },
      { path: 'training/benchmark-sources/logicskills/pre-fresh-countermodel-freeze.json' },
      { path: 'training/benchmark-sources/logicskills/fresh-countermodel-aggregate.json' },
    ],
  });
}

function notRunRow(entry) {
  const reportFields = benchmarkReportFields(entry.id, { total: null, correct: null, attempted: null });
  return Object.freeze({
    id: entry.id, evidenceState: entry.evaluationState, ...reportFields,
    normalizationCandidates: null, normalizationCandidateRate: null,
    agentInvocations: null, agentInvocationRate: null,
    selectedMethods: Object.freeze([]),
    usedKbVersions: Object.freeze([]),
    selectedKbVersions: Object.freeze([]),
    languagePolicy: null,
    resourcePolicy: null,
    resourceEvidence: null,
    replayCommand: null,
    behaviorDependency: null,
    resultOrigin: 'access-gated',
    executionEvidence: Object.freeze({ origin: 'not-executed' }),
    protocolDescription: entry.task,
    capabilityCoverage: Object.freeze({
      level: 'registered-not-executed',
      description: `Planned capability families: ${entry.capabilities.join(', ')}. Catalog registration is not execution evidence.`,
    }),
    diagnosis: entry.nextAction,
    ...benchmarkCatalogFields(entry.id),
  });
}

const ROW_FACTORIES = Object.freeze({
  logicbench: logicbenchRow,
  proofwriter: proofwriterRow,
  prontoqa: prontoqaRow,
  logicskills: logicSkillsRow,
  folio: folioRow,
  proverqa: proverQaRow,
  satbench: satBenchRow,
  ...TASK_ROW_FACTORIES,
});

export async function researchBenchmarkReportRows(options = {}) {
  const selected = options.selectedIds === undefined
    ? new Set(Object.keys(RESEARCH_BENCHMARK_CATALOG))
    : new Set(options.selectedIds);
  for (const id of selected) {
    if (!RESEARCH_BENCHMARK_CATALOG[id]) throw new Error(`Unknown research benchmark ID: ${id}.`);
  }
  const entries = Object.values(RESEARCH_BENCHMARK_CATALOG).filter((entry) => selected.has(entry.id));
  const executedRows = await Promise.all(entries.map(async (entry) => {
    const factory = ROW_FACTORIES[entry.id];
    return factory ? factory() : notRunRow(entry);
  }));
  return Object.freeze(executedRows);
}
