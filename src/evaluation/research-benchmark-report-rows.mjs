import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PROJECT_ROOT } from '../paths.mjs';
import { RESEARCH_BENCHMARK_CATALOG } from './benchmark-research-catalog.mjs';

async function receipt(relativePath) {
  return JSON.parse(await readFile(join(PROJECT_ROOT, relativePath), 'utf8'));
}

function rate(count, total) {
  return Number.isInteger(count) && total ? count / total : null;
}

function executedRow(id, data) {
  return Object.freeze({
    id,
    evidenceState: data.evidenceState,
    protocol: data.protocol,
    protocolDescription: data.protocolDescription,
    samplePolicy: data.samplePolicy,
    sampleDescription: data.sampleDescription,
    total: data.total,
    correct: data.correct,
    accuracy: rate(data.correct, data.total),
    normalizationCandidates: data.normalizationCandidates,
    normalizationCandidateRate: rate(data.normalizationCandidates, data.total),
    directSymbolicRate: data.directSymbolicRate ?? (
      Number.isInteger(data.normalizationCandidates) ? rate(data.total - data.normalizationCandidates, data.total) : null
    ),
    agentInvocations: data.agentInvocations,
    agentInvocationRate: rate(data.agentInvocations, data.total),
    statusCounts: data.statusCounts,
    sampleCoverage: Object.freeze(data.sampleCoverage),
    capabilityCoverage: Object.freeze(data.capabilityCoverage),
    diagnosis: data.diagnosis,
    comparability: data.comparability,
    sourceEvidence: Object.freeze(data.sourceEvidence),
    ...(data.subtrackResults ? { subtrackResults: Object.freeze(data.subtrackResults) } : {}),
  });
}

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
    total: fresh.tested, correct: fresh.correct,
    normalizationCandidates: statuses.UNPARSED ?? 0,
    agentInvocations: fresh.codingAgentInvocations,
    statusCounts: statuses,
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
    total: result.coverage.tested, correct: result.logicalFormTrack.correct,
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
    total: fresh.tested, correct: fresh.correct,
    normalizationCandidates: fresh.normalizationInvocations,
    directSymbolicRate: 1,
    agentInvocations: fresh.codingAgentInvocations,
    statusCounts: fresh.statusCounts,
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
    total: result.formulaTrack.tested, correct: result.formulaTrack.correct,
    normalizationCandidates: null,
    directSymbolicRate: null,
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
      tested: result.naturalLanguage.tested,
      correct: result.naturalLanguage.correct,
      accuracy: result.naturalLanguage.accuracy,
    }), Object.freeze({
      id: 'premise-vocabulary-assisted-query-diagnostic',
      label: 'Natural-language query with premise-annotation vocabulary',
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
    total: fresh.tested,
    correct: fresh.correct,
    normalizationCandidates: fresh.normalizationCandidates,
    directSymbolicRate: 1,
    agentInvocations: fresh.languageAgentInvocations,
    statusCounts: fresh.statusCounts,
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
    total: fresh.tested,
    correct: fresh.correct,
    normalizationCandidates: 0,
    directSymbolicRate: 1,
    agentInvocations: fresh.languageAgentInvocations,
    statusCounts: fresh.statusCounts,
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
    total: result.tested, correct: null,
    normalizationCandidates: null, directSymbolicRate: result.answered / result.tested,
    agentInvocations: result.languageAgentInvocations,
    statusCounts: result.statusCounts,
    subtrackResults: [
      Object.freeze({
        id: 'symbolization-development', label: 'Symbolization development track',
        evidenceState: 'development-probe-executed', tested: result.symbolizationTrack.tested,
        correct: result.symbolizationTrack.correct,
        accuracy: result.symbolizationTrack.accuracyOverCompleteDevelopmentTrack,
      }),
      Object.freeze({
        id: 'countermodel-development', label: 'Countermodel development track',
        evidenceState: 'development-probe-executed', tested: result.semanticTrack.tested,
        correct: result.semanticTrack.correct, accuracy: result.semanticTrack.accuracy,
      }),
      Object.freeze({
      id: 'countermodel-fresh', label: 'Countermodel fresh subtrack', evidenceState: freshCountermodel.evidenceState,
      tested: freshCountermodel.tested, correct: freshCountermodel.correct,
      accuracy: freshCountermodel.accuracy,
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
    diagnosis: `Symbolization is ${result.symbolizationTrack.correct}/${result.symbolizationTrack.tested} over the complete development track: every emitted formula has a replayed derivation and accepted semantic equivalence, while ${result.symbolizationTrack.abstained} unsupported cases remain explicit. Countermodels are ${result.semanticTrack.correct}/${result.semanticTrack.tested} with independent semantic verification. Validity has ${result.validityTrack.attempted} attempts, so its accuracy remains absent rather than 0%. The row does not fabricate one aggregate percentage across unlike output contracts.`,
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

async function slrBenchRow() {
  const result = await receipt('training/benchmark-sources/slr-bench/development-result.json');
  return executedRow('slr-bench', {
    evidenceState: 'development-probe-executed', protocol: result.protocol,
    protocolDescription: 'The adapter compiles visible demonstrations to typed positive and negative relational examples. The registered generic method enumerates connected alpha-canonical conjunctive rules by increasing body length. A separate verifier replays every positive join and every exhaustive negative rejection. Validation programs remain inert ground-fact AST data; corpus text and Prolog are never executed.',
    samplePolicy: 'complete official validation split with the official test split sealed',
    sampleDescription: 'All ten validation cases at each of the twenty curriculum levels were submitted through the typed task boundary. Ground-truth rules, validation programs, shortcuts, and symbols remained host-only. The 1,000 official test cases were not executed.',
    total: result.tested, correct: result.validationExact,
    normalizationCandidates: 0, directSymbolicRate: 1,
    agentInvocations: result.languageAgentInvocations,
    statusCounts: result.statusCounts,
    sampleCoverage: {
      tested: result.tested, available: result.availableDevelopment,
      unit: 'official validation cases', comprehensive: true,
      scope: 'The latest run covered all 200 official validation cases, ten at each of twenty levels. The complete source contains 18,053 training rows and an untouched 1,000-case official test split; those are not part of this development denominator.',
    },
    capabilityCoverage: {
      level: 'registered-finite-conjunctive-rule-induction',
      description: 'The runtime synthesizes and verifies finite connected positive conjunctive rules. Quantification, negation, inequality, arithmetic, aggregation, and recursive rule induction remain distinct unimplemented hypothesis families.',
    },
    diagnosis: `${result.validationExact}/${result.tested} complete validation cases produced rules that cover every positive and reject every negative inert validation example; all ${result.witnessVerified} solved witnesses replayed. ${result.statusCounts.UNKNOWN} cases exhaust the declared finite conjunctive hypothesis space without a separator. ${result.statusCounts.RESOURCE_LIMIT} cases reach an explicit candidate or match-search limit and remain in the denominator. Levels 1–5 are 10/10 each. The visible train and validation release contains no self-recursive target rule, so this run makes no recursion claim.`,
    comparability: result.comparability,
    sourceEvidence: [
      { path: 'training/benchmark-sources/slr-bench/source-manifest.json' },
      { path: 'training/benchmark-sources/slr-bench/schema-inventory.json' },
      { path: 'training/benchmark-sources/slr-bench/lifecycle-manifest.json' },
      { path: 'training/benchmark-sources/slr-bench/development-result.json' },
      { path: 'training/benchmark-sources/slr-bench/core-change-proposal.json' },
      { path: 'training/benchmark-sources/slr-bench/core-change-guardian-result.json' },
    ],
  });
}

async function iibenchRow() {
  const [result, development] = await Promise.all([
    receipt('training/benchmark-sources/iibench/fresh-result.json'),
    receipt('training/benchmark-sources/iibench/development-result.json'),
  ]);
  return executedRow('iibench', {
    evidenceState: 'fresh-evaluation-executed', protocol: result.protocol,
    protocolDescription: 'The typed adapter executes the traditional square of opposition, required-form immediate transformations, and exhaustive finite-population syllogistic entailment. Syllogism scoring accepts only the source-declared reversible equivalence closure.',
    samplePolicy: 'frozen label-blind 80/20 reclassification of the author release',
    sampleDescription: 'The categorical candidate, adapter, tests, and specification were frozen before all 1,088 protected members were scored once. Only aggregate and source-family counts were retained.',
    total: result.tested, correct: result.correct,
    normalizationCandidates: null,
    agentInvocations: result.languageAgentInvocations,
    statusCounts: result.statusCounts,
    sampleCoverage: {
      tested: result.tested, available: 5_284, unit: 'validated author-release cases', comprehensive: false,
      scope: 'The latest run scored the complete 1,088-member fresh partition once. The separate development run executed the other 4,196 cases before the candidate freeze.',
    },
    capabilityCoverage: {
      level: 'implemented-categorical-method-with-proved-gold-strength-ambiguity',
      description: 'All opposition and immediate-transformation development cases pass. Every syllogism receives a sound model-entailed conclusion; strict source equivalence rejects some stronger universal conclusions when the gold selects their particular subaltern.',
    },
    diagnosis: `${result.soundSyllogismConclusions}/${result.testedBySourceFile['Syllogism_generation.jsonl']} fresh syllogism conclusions are model-entailed. ${result.strongerSubalternationAlternatives} are stronger A/E conclusions where the source gold selects I/O without exposing a requested mood; the development proof shows conflicting gold forms inside rename-equivalent input classes.`,
    comparability: 'One-shot fresh local partition under the pinned typed protocol; not an official natural-language leaderboard score.',
    developmentResult: { tested: development.tested, correct: development.correct, accuracy: development.accuracy },
    sourceEvidence: [
      { path: 'training/benchmark-sources/iibench/pre-fresh-freeze.json' },
      { path: 'training/benchmark-sources/iibench/fresh-result.json' },
      { path: 'training/benchmark-sources/iibench/impossibility-proof.json' },
    ],
  });
}

async function defeasibleNliRow() {
  const [result, typedEvidence, source] = await Promise.all([
    receipt('training/benchmark-sources/defeasible-nli/development-result.json'),
    receipt('training/benchmark-sources/defeasible-nli/typed-evidence-development-result.json'),
    receipt('training/benchmark-sources/defeasible-nli/source-manifest.json'),
  ]);
  return executedRow('defeasible-nli', {
    evidenceState: 'development-probe-executed',
    protocol: result.format,
    protocolDescription: 'The adapter preserves premise or social situation, hypothesis, and the proposed update as a typed strengthen-or-weaken task. Owner-declared impossible updates remain in source accounting but are excluded from scoring exactly as required by the published protocol. Labels and impossible reasons remain host-only.',
    samplePolicy: 'complete official development split after the source-declared impossible-update exclusion',
    sampleDescription: 'All 14,968 paper-eligible development rows across ATOMIC, SNLI, and Social Chemistry were submitted to the direct typed-task boundary. All 1,040 owner-declared impossible development rows remain retained and separately counted. The official test split was not executed.',
    total: result.tested,
    correct: null,
    normalizationCandidates: null,
    directSymbolicRate: null,
    agentInvocations: result.languageAgentInvocations,
    statusCounts: result.statusCounts,
    sampleCoverage: {
      tested: result.tested,
      available: result.tested,
      unit: 'officially eligible development updates',
      comprehensive: true,
      scope: `The latest run exercised every one of the ${result.tested.toLocaleString('en-US')} paper-eligible development cases. The source development split contains ${result.officialSourceRows.toLocaleString('en-US')} rows in total; ${Object.values(result.excludedImpossible).reduce((sum, count) => sum + count, 0).toLocaleString('en-US')} owner-declared impossible rows are retained but excluded by the official protocol. The test split remains sealed.`,
    },
    capabilityCoverage: {
      level: 'complete-adapter-no-general-semantic-update-method',
      description: 'Source identity, complete streaming retention, compound-family schema validation, official eligibility policy, oracle isolation, and the strengthen-or-weaken task contract are implemented. The core does not yet compile arbitrary event, causal, physical, and normative prose into comparable provenance-bearing default theories.',
    },
    diagnosis: 'The registered runtime still returns NO_APPLICABLE_METHOD because no sound source-to-evidence compiler exists. A development-only frame-overlap experiment exercised the generic typed comparator, but its accuracy on answered binary cases was below chance, so Core Guardian rejected that automatic projection instead of promoting a misleading lexical classifier.',
    comparability: 'Complete direct-only development task-contract diagnostic; no answers were produced, the official test split remains sealed, and this is not an official accuracy score.',
    subtrackResults: [Object.freeze({
      id: 'rejected-typed-frame-overlap',
      label: 'Rejected typed-frame experiment, accuracy on answered cases',
      tested: typedEvidence.answered,
      correct: typedEvidence.correct,
      accuracy: typedEvidence.accuracyOnAnswered,
    })],
    sourceEvidence: [
      { path: 'training/benchmark-sources/defeasible-nli/source-manifest.json', sourceRevision: source.revision },
      { path: 'training/benchmark-sources/defeasible-nli/schema-inventory.json' },
      { path: 'training/benchmark-sources/defeasible-nli/development-result.json' },
      { path: 'training/benchmark-sources/defeasible-nli/core-change-proposal.json' },
      { path: 'training/benchmark-sources/defeasible-nli/typed-evidence-development-result.json' },
      { path: 'training/benchmark-sources/defeasible-nli/typed-evidence-core-review.json' },
    ],
  });
}

async function alphaNliArtRow() {
  const [result, typedEvidence, source] = await Promise.all([
    receipt('training/benchmark-sources/alpha-nli-art/development-result.json'),
    receipt('training/benchmark-sources/alpha-nli-art/typed-evidence-development-result.json'),
    receipt('training/benchmark-sources/alpha-nli-art/source-manifest.json'),
  ]);
  return executedRow('alpha-nli-art', {
    evidenceState: 'development-probe-executed',
    protocol: result.protocol,
    protocolDescription: 'The adapter exposes the earlier observation, two candidate bridge events, and the later observation as a typed narrative-bridge selection task. The preferred candidate remains in a host-only oracle. A future method must rank causal and temporal compatibility with explicit evidence rather than infer from candidate position.',
    samplePolicy: 'complete official development split with the official test split sealed',
    sampleDescription: 'All 1,532 official development cases exercised the label-free task boundary. The complete 169,654-row training split remains available for train-visible analysis; all 3,059 official test cases remain sealed and no test loader is exported.',
    total: result.tested,
    correct: null,
    normalizationCandidates: null,
    directSymbolicRate: null,
    agentInvocations: result.languageAgentInvocations,
    statusCounts: result.statusCounts,
    sampleCoverage: {
      tested: result.tested,
      available: result.available,
      unit: 'official development narrative pairs',
      comprehensive: true,
      scope: 'The latest run exercised every one of the 1,532 official development cases. It did not execute the 3,059-case official test split and does not treat the much larger training split as evaluation evidence.',
    },
    capabilityCoverage: {
      level: 'complete-adapter-no-general-narrative-bridge-method',
      description: 'Source identity, complete retention, split isolation, label-free candidate projection, and the narrative-bridge output contract are implemented. Arbitrary observations and alternatives are not yet compiled into typed event, temporal, causal, goal, state, and contradiction relations backed by sufficient commonsense evidence.',
    },
    diagnosis: 'The registered runtime still returns NO_APPLICABLE_METHOD because no sound source-to-evidence compiler exists. A development-only event-frame overlap experiment exercised the generic comparator but remained near chance on answered cases, so Core Guardian rejected its automatic projection instead of promoting surface overlap as narrative abduction.',
    comparability: result.claimBoundary,
    subtrackResults: [Object.freeze({
      id: 'rejected-typed-frame-overlap',
      label: 'Rejected typed-frame experiment, accuracy on answered cases',
      tested: typedEvidence.answered,
      correct: typedEvidence.correct,
      accuracy: typedEvidence.accuracyOnAnswered,
    })],
    sourceEvidence: [
      { path: 'training/benchmark-sources/alpha-nli-art/source-manifest.json', sourceRevision: source.codeRevision },
      { path: 'training/benchmark-sources/alpha-nli-art/schema-inventory.json' },
      { path: 'training/benchmark-sources/alpha-nli-art/development-result.json' },
      { path: 'training/benchmark-sources/alpha-nli-art/core-change-proposal.json' },
      { path: 'training/benchmark-sources/alpha-nli-art/typed-evidence-development-result.json' },
      { path: 'training/benchmark-sources/alpha-nli-art/typed-evidence-core-review.json' },
    ],
  });
}

async function stepGameRow() {
  const [result, source] = await Promise.all([
    receipt('training/benchmark-sources/stepgame/development-result.json'),
    receipt('training/benchmark-sources/stepgame/source-manifest.json'),
  ]);
  return executedRow('stepgame', {
    evidenceState: 'development-probe-executed',
    protocol: result.protocol,
    protocolDescription: 'The adapter maps validated official direction templates to a declarative vector relation system and submits the resulting task through the public engine route. The generic core propagates exact displacements and accepts a prediction only with a replayable path-sum witness.',
    samplePolicy: 'complete corrected official validation split across hop depths one through five',
    sampleDescription: 'All 5,000 official validation cases were processed. The source template catalog and task labels remained adapter/evaluator concerns; the generic vector solver received only typed entities, vectors, facts, and query endpoints. The 100,000-case official test split was not executed.',
    total: result.tested,
    correct: result.correct,
    normalizationCandidates: 0,
    directSymbolicRate: 1,
    agentInvocations: result.languageAgentInvocations,
    statusCounts: result.statusCounts,
    sampleCoverage: {
      tested: result.tested,
      available: result.availableDevelopment,
      unit: 'official validation cases',
      comprehensive: true,
      scope: 'The latest run executed all 5,000 corrected-release validation cases. The complete source also contains 50,000 training and 100,000 untouched test cases; they are not part of this development denominator.',
    },
    capabilityCoverage: {
      level: 'complete-vector-method-with-source-template-gap',
      description: `Every one of the ${result.statusCounts.SOLVED} solved cases is exact and has an independently replayed displacement witness. The ${result.statusCounts.UNKNOWN} unknown cases contain malformed or semantically ambiguous official generator sentences, including one official template that omits an entity placeholder; no answer-guided repair is permitted.`,
    },
    diagnosis: result.interpretation,
    comparability: 'Complete development execution of the corrected official validation split; not an untouched test or leaderboard score.',
    sourceEvidence: [
      { path: 'training/benchmark-sources/stepgame/source-manifest.json', sourceRevision: source.officialDataset.revision },
      { path: 'training/benchmark-sources/stepgame/schema-inventory.json' },
      { path: 'training/benchmark-sources/stepgame/development-result.json' },
    ],
  });
}

async function sparpRow() {
  const [result, source] = await Promise.all([
    receipt('training/benchmark-sources/sparp/development-result.json'),
    receipt('training/benchmark-sources/sparp/source-manifest.json'),
  ]);
  const tracks = [result.full.ps1, result.full.ps2, result.full.ps3, result.full.ps4];
  const tested = tracks.reduce((sum, track) => sum + track.tested, 0);
  const correct = tracks.reduce((sum, track) => sum + track.exact, 0);
  const available = tracks.reduce((sum, track) => sum + track.availableDevelopment, 0);
  return executedRow('sparc-sparp', {
    evidenceState: 'development-probe-executed',
    protocol: result.protocol,
    protocolDescription: 'PS1 executes a declarative qualitative relation closure with reciprocal inverses, explicit binary composition and selective containment lifting. PS2 and PS3 compile point tasks into generic vector constraints; PS4 compiles extended-object directions into generic extent inequalities. Every output has an independently replayed proof tree or path witness.',
    samplePolicy: 'complete official full validation configurations PS1 through PS4; small validation configurations retained only as overlapping controls',
    sampleDescription: 'The headline combines every full-validation PS1–PS4 property regime. It does not count small configurations as independent evidence because they are transformed subsets. All official test configurations remain sealed.',
    total: tested,
    correct,
    normalizationCandidates: 0,
    directSymbolicRate: 1,
    agentInvocations: result.languageAgentInvocations,
    statusCounts: { SOLVED: tested },
    subtrackResults: [
      Object.freeze({ id: 'ps1', label: 'Full PS1 exact', tested: result.full.ps1.tested,
        correct: result.full.ps1.exact, accuracy: result.full.ps1.exactAccuracy }),
      Object.freeze({ id: 'ps2', label: 'Full PS2 exact', tested: result.full.ps2.tested,
        correct: result.full.ps2.exact, accuracy: result.full.ps2.exactAccuracy }),
      Object.freeze({ id: 'ps3', label: 'Full PS3 exact', tested: result.full.ps3.tested,
        correct: result.full.ps3.exact, accuracy: result.full.ps3.exactAccuracy }),
      Object.freeze({ id: 'ps4', label: 'Full PS4 exact', tested: result.full.ps4.tested,
        correct: result.full.ps4.exact, accuracy: result.full.ps4.exactAccuracy }),
    ],
    sampleCoverage: {
      tested,
      available,
      unit: 'full official validation cases across PS1–PS4',
      comprehensive: true,
      scope: `The latest full-source run tested all ${tested.toLocaleString('en-US')} available validation cases across PS1–PS4. Every case produced a replay-verified symbolic result. All test configurations remain untouched.`,
    },
    capabilityCoverage: {
      level: 'qualitative-closure-vector-and-extent-methods-complete',
      description: `PS1, PS3, and PS4 pass completely. PS2 returns valid vector witnesses for every case; ${result.full.ps2.oracleIncompatibilities} official targets disagree with the relation entailed by their own relation-complete quantified symbolic contexts. The core does not imitate those incompatible targets.`,
    },
    diagnosis: `${result.full.ps1.exact}/${result.full.ps1.tested} PS1 exact, ${result.full.ps2.exact}/${result.full.ps2.tested} PS2 exact, ${result.full.ps3.exact}/${result.full.ps3.tested} PS3 exact, and ${result.full.ps4.exact}/${result.full.ps4.tested} PS4 exact. All ${tested.toLocaleString('en-US')} outputs have verified witnesses. The four small validation controls are each 500/500, but the overlap audit proves these property configurations are transformed subsets and must not be summed as independent evidence.`,
    comparability: `${result.comparability} SpaRP StepGame configurations overlap the StepGame source and are not independent benchmark evidence.`,
    sourceEvidence: [
      { path: 'training/benchmark-sources/sparp/source-manifest.json', sourceRevision: source.officialDataset.revision },
      { path: 'training/benchmark-sources/sparp/schema-inventory.json' },
      { path: 'training/benchmark-sources/sparp/overlap-audit.json' },
      { path: 'training/benchmark-sources/sparp/development-result.json' },
      { path: 'training/benchmark-sources/sparp/core-change-proposal-ps1.json' },
    ],
  });
}

async function zebraLogicRow() {
  const [fresh, development, source] = await Promise.all([
    receipt('training/benchmark-sources/zebralogic/fresh-aggregate.json'),
    receipt('training/benchmark-sources/zebralogic/development-result.json'),
    receipt('training/benchmark-sources/zebralogic/source-manifest.json'),
  ]);
  return executedRow('zebralogic', {
    evidenceState: 'fresh-evaluation-executed',
    protocol: fresh.format,
    protocolDescription: 'The adapter parses every public clue into typed finite-domain constraints, encodes the all-different puzzle as Boolean clauses, and invokes the generic SAT method. A result passes only when a direct interpreter replays every clue against the complete assignment and a second blocked-assignment search proves uniqueness.',
    samplePolicy: 'complete one-shot sealed public-clue partition after development freeze',
    sampleDescription: 'The public 1,000-puzzle grid configuration was partitioned by size before puzzle inspection: eight development and thirty-two sealed members in each of twenty-five size strata. After 200/200 development puzzles passed, all 800 sealed members were executed once and only aggregates left the evaluator.',
    total: fresh.tested,
    correct: fresh.passed,
    normalizationCandidates: 0,
    directSymbolicRate: 1,
    agentInvocations: fresh.languageAgentInvocations,
    statusCounts: fresh.statusCounts,
    sampleCoverage: {
      tested: fresh.tested,
      available: fresh.available,
      unit: 'sealed public grid puzzles',
      comprehensive: true,
      scope: 'The latest run executed all 800 sealed public-clue puzzles. The public multiple-choice configuration contains 3,259 additional answer-redacted rows and was inventoried but is not part of this CSP denominator.',
    },
    capabilityCoverage: {
      level: 'fresh-public-clue-csp-near-complete-private-oracle-unavailable',
      description: `${fresh.completeAssignmentsAndUniquenessWitnessesValid}/${fresh.tested} sealed puzzles produced a complete clue-satisfying assignment and an independently verified uniqueness certificate. Nine cases stopped at PARSE_ERROR and remained aggregate-only. Public labels are redacted, so this is method completion evidence rather than official answer accuracy.`,
    },
    diagnosis: `Development passed ${development.execution.passed}/${development.execution.tested}. The sealed run passed ${fresh.passed}/${fresh.tested}; every pass has both a replayed assignment and a uniqueness proof. The nine failed sealed inputs cannot be inspected or used for repair under this lifecycle.`,
    comparability: fresh.claimBoundary,
    sourceEvidence: [
      { path: 'training/benchmark-sources/zebralogic/source-manifest.json', sourceRevision: source.source.publicDatasetRevision },
      { path: 'training/benchmark-sources/zebralogic/partition-manifest.json' },
      { path: 'training/benchmark-sources/zebralogic/development-result.json' },
      { path: 'training/benchmark-sources/zebralogic/fresh-aggregate.json' },
    ],
  });
}

async function logicalReadingRow(id, receiptPath, sourcePath, description) {
  const [result, source] = await Promise.all([receipt(receiptPath), receipt(sourcePath)]);
  return executedRow(id, {
    evidenceState: 'development-probe-executed',
    protocol: result.protocol,
    protocolDescription: 'The source adapter preserves the passage, question, and four ordered candidates as a typed logical-reading-comprehension task while keeping the preferred candidate in a host-only oracle. The capability registry is then asked for a method; it must abstain when no method can justify a choice.',
    samplePolicy: description.samplePolicy,
    sampleDescription: description.sampleDescription,
    total: result.tested,
    correct: null,
    normalizationCandidates: null,
    directSymbolicRate: 1,
    agentInvocations: result.languageAgentInvocations,
    statusCounts: result.statusCounts,
    sampleCoverage: {
      tested: result.tested,
      available: result.available,
      unit: description.unit,
      comprehensive: true,
      scope: description.scope,
    },
    capabilityCoverage: {
      level: 'complete-development-task-construction-no-applicable-argument-method',
      description: 'Every visible development record reached the typed task boundary, but no registered generic method can yet compile unrestricted passages into argument structures and prove which candidate follows, weakens, strengthens, resolves, or diagnoses the argument. Abstention is evidence of a missing method, not an incorrect option choice.',
    },
    diagnosis: result.interpretation,
    comparability: result.claimBoundary,
    sourceEvidence: [
      { path: sourcePath, sourceRevision: description.sourceRevision(source) },
      { path: receiptPath },
      { path: description.inventoryPath },
      { path: description.decisionPath },
    ],
  });
}

function reclorRow() {
  return logicalReadingRow(
    'reclor',
    'training/benchmark-sources/reclor/development-result.json',
    'training/benchmark-sources/reclor/source-manifest.json',
    {
      samplePolicy: 'complete official validation split',
      sampleDescription: 'All 500 official validation records were streamed and projected. The 4,638 training records remain development-visible; the 1,000-case test file stayed sealed and was checked only by byte identity.',
      unit: 'official validation questions',
      scope: 'The latest run exercised all 500 validation tasks. It did not open or execute the 1,000-case official test split.',
      sourceRevision: (source) => `release ${source.dataEdition}; code ${source.codeRevision}`,
      inventoryPath: 'training/benchmark-sources/reclor/schema-inventory.json',
      decisionPath: 'training/benchmark-sources/reclor/core-change-decision.json',
    },
  );
}

function logiqaRow() {
  return logicalReadingRow(
    'logiqa',
    'training/benchmark-sources/logiqa/development-result.json',
    'training/benchmark-sources/logiqa/source-manifest.json',
    {
      samplePolicy: 'complete official English development split',
      sampleDescription: 'All 651 English development records were streamed and projected. The parallel 651 Chinese development records are retained outside this English-only execution profile; both 651-case test files stayed byte-sealed.',
      unit: 'official English development questions',
      scope: 'The latest run exercised all 651 English development tasks. The complete Chinese source is retained, but no Chinese score is claimed; neither official test file was opened or executed.',
      sourceRevision: (source) => source.revision,
      inventoryPath: 'training/benchmark-sources/logiqa/schema-inventory.json',
      decisionPath: 'training/benchmark-sources/logiqa/core-change-decision.json',
    },
  );
}

function notRunRow(entry) {
  return Object.freeze({
    id: entry.id, evidenceState: entry.evaluationState, total: null, correct: null, accuracy: null,
    normalizationCandidates: null, normalizationCandidateRate: null, directSymbolicRate: null,
    agentInvocations: null, agentInvocationRate: null,
    protocolDescription: entry.task,
    capabilityCoverage: Object.freeze({
      level: 'registered-not-executed',
      description: `Planned capability families: ${entry.capabilities.join(', ')}. Catalog registration is not execution evidence.`,
    }),
    diagnosis: entry.nextAction,
    access: Object.freeze({
      state: entry.access.state,
      actionUrl: entry.access.actionUrl,
      actionLabel: 'Open the official source or access page',
      operatorAction: entry.nextAction,
    }),
  });
}

export async function researchBenchmarkReportRows() {
  const executed = new Map((await Promise.all([
    logicbenchRow(), iibenchRow(), proofwriterRow(), prontoqaRow(), slrBenchRow(), logicSkillsRow(), folioRow(),
    proverQaRow(), satBenchRow(), zebraLogicRow(), defeasibleNliRow(), alphaNliArtRow(), stepGameRow(), sparpRow(),
    reclorRow(), logiqaRow(),
  ])).map((row) => [row.id, row]));
  return Object.freeze(Object.values(RESEARCH_BENCHMARK_CATALOG)
    .map((entry) => executed.get(entry.id) ?? notRunRow(entry)));
}
