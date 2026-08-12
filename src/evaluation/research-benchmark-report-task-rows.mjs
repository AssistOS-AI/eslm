import {
  executedRow, receipt,
} from './research-benchmark-report-row-common.mjs';

async function slrBenchRow() {
  const result = await receipt('training/benchmark-sources/slr-bench/development-result.json');
  return executedRow('slr-bench', {
    evidenceState: 'development-probe-executed', protocol: result.protocol,
    protocolDescription: 'The adapter compiles visible demonstrations to typed positive and negative relational examples. The registered generic method enumerates connected alpha-canonical conjunctive rules by increasing body length. A separate verifier replays every positive join and every exhaustive negative rejection. Validation programs remain inert ground-fact AST data; corpus text and Prolog are never executed.',
    samplePolicy: 'complete official validation split with the official test split sealed',
    sampleDescription: 'All ten validation cases at each of the twenty curriculum levels were submitted through the typed task boundary. Ground-truth rules, validation programs, shortcuts, and symbols remained host-only. The 1,000 official test cases were not executed.',
    splitQuality: 'official-development',
    total: result.tested, correct: result.validationExact,
    attempted: result.statusCounts.SOLVED, executedAt: result.measuredAt,
    executionRoute: result.executionRoute,
    normalizationCandidates: 0,
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
    splitQuality: 'row-IID-stratified',
    total: result.tested, correct: result.correct, attempted: result.statusCounts.ANSWERED,
    forcedChoice: true, executedAt: result.measuredAt,
    normalizationCandidates: null,
    agentInvocations: result.languageAgentInvocations,
    statusCounts: result.statusCounts,
    strata: { testedBySourceFile: result.testedBySourceFile, correctBySourceFile: result.correctBySourceFile },
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
    splitQuality: 'official-development',
    executedAt: result.executedAt ?? result.measuredAt,
    total: result.tested,
    correct: result.correct,
    attempted: result.answered,
    forcedChoice: true,
    normalizationCandidates: null,
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
    diagnosis: 'The registered runtime still returns NO_APPLICABLE_METHOD because no sound source-to-evidence compiler exists. End-to-end forced-choice accuracy is 0% over the complete denominator, attempt coverage is 0%, and selective accuracy is undefined because no answer was attempted. A development-only frame-overlap experiment exercised the generic typed comparator, but its accuracy on answered binary cases was below chance, so Core Guardian rejected that automatic projection instead of promoting a misleading lexical classifier.',
    comparability: 'Complete direct-only development task-contract diagnostic; no answers were produced, the official test split remains sealed, and this is not an official accuracy score.',
    subtrackResults: [Object.freeze({
      id: 'rejected-typed-frame-overlap',
      label: 'Rejected typed-frame experiment, accuracy on answered cases',
      track: 'structured-task', inputRoute: 'structured-task',
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
    splitQuality: 'official-development',
    executedAt: result.executedAt ?? result.measuredAt,
    total: result.tested,
    correct: result.correct,
    attempted: result.answered,
    forcedChoice: true,
    normalizationCandidates: null,
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
    diagnosis: 'The registered runtime still returns NO_APPLICABLE_METHOD because no sound source-to-evidence compiler exists. End-to-end forced-choice accuracy is 0% over the complete denominator, attempt coverage is 0%, and selective accuracy is undefined because no answer was attempted. A development-only event-frame overlap experiment exercised the generic comparator but remained near chance on answered cases, so Core Guardian rejected its automatic projection instead of promoting surface overlap as narrative abduction.',
    comparability: result.claimBoundary,
    subtrackResults: [Object.freeze({
      id: 'rejected-typed-frame-overlap',
      label: 'Rejected typed-frame experiment, accuracy on answered cases',
      track: 'structured-task', inputRoute: 'structured-task',
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
    splitQuality: 'official-development',
    total: result.tested,
    correct: result.correct,
    attempted: result.statusCounts.SOLVED,
    executedAt: result.measuredAt,
    executionRoute: result.executionRoute,
    normalizationCandidates: 0,
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
    splitQuality: 'official-development',
    total: tested,
    correct,
    attempted: tested,
    executedAt: result.measuredAt,
    executionRoute: result.executionRoute,
    normalizationCandidates: 0,
    agentInvocations: result.languageAgentInvocations,
    statusCounts: { SOLVED: tested },
    subtrackResults: [
      Object.freeze({ id: 'ps1', label: 'Full PS1 exact', track: 'solver-conformance',
        inputRoute: 'source-annotation', tested: result.full.ps1.tested,
        correct: result.full.ps1.exact, accuracy: result.full.ps1.exactAccuracy }),
      Object.freeze({ id: 'ps2', label: 'Full PS2 exact', track: 'solver-conformance',
        inputRoute: 'source-annotation', tested: result.full.ps2.tested,
        correct: result.full.ps2.exact, accuracy: result.full.ps2.exactAccuracy }),
      Object.freeze({ id: 'ps3', label: 'Full PS3 exact', track: 'solver-conformance',
        inputRoute: 'source-annotation', tested: result.full.ps3.tested,
        correct: result.full.ps3.exact, accuracy: result.full.ps3.exactAccuracy }),
      Object.freeze({ id: 'ps4', label: 'Full PS4 exact', track: 'solver-conformance',
        inputRoute: 'source-annotation', tested: result.full.ps4.tested,
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
    splitQuality: 'row-IID-size-stratified',
    total: fresh.tested,
    correct: null,
    attempted: null,
    completionCount: fresh.passed,
    completionRate: fresh.completionRate,
    executedAt: fresh.executedAt,
    selectedMethods: [fresh.methodId],
    resourceEvidence: fresh.resourceWitnessMaxima,
    normalizationCandidates: 0,
    agentInvocations: fresh.languageAgentInvocations,
    statusCounts: fresh.statusCounts,
    strata: fresh.sizeStrata,
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
    splitQuality: 'official-development',
    executedAt: result.executedAt ?? result.measuredAt,
    total: result.tested,
    correct: result.correct,
    attempted: result.answered,
    forcedChoice: true,
    normalizationCandidates: null,
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
    diagnosis: `${result.interpretation.replace(/ Accuracy is absent rather than 0% because there were no evidential attempts\.$/u, '')} End-to-end forced-choice accuracy is 0% over the complete denominator, attempt coverage is 0%, and selective accuracy is undefined because no answer was attempted.`,
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

export const TASK_ROW_FACTORIES = Object.freeze({
  iibench: iibenchRow,
  'slr-bench': slrBenchRow,
  zebralogic: zebraLogicRow,
  'defeasible-nli': defeasibleNliRow,
  'alpha-nli-art': alphaNliArtRow,
  stepgame: stepGameRow,
  'sparc-sparp': sparpRow,
  reclor: reclorRow,
  logiqa: logiqaRow,
});
