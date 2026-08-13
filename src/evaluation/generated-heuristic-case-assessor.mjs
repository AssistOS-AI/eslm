import { assertGeneratedHeuristicOracle } from './generated-heuristic-oracle-contract.mjs';

const FAILURE_STAGE_ORDER = Object.freeze([
  'execution', 'resource', 'route', 'status', 'candidate', 'strategy-family',
  'semantic-query', 'request-plan', 'result-construction', 'safety', 'answer',
]);

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const item of Object.values(value)) freeze(item);
    Object.freeze(value);
  }
  return value;
}

function diagnostic(stage, code, explanation) {
  return Object.freeze({ stage, code, explanation });
}

function tokenPresent(surface, token) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`, 'iu').test(surface);
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

function expectedCandidate(result, expectedText) {
  return [
    result?.approximation?.selectedCandidate,
    result?.approximation?.recommendedCandidate,
    ...(result?.approximation?.candidates ?? []),
  ].find((candidate) => candidate?.text === expectedText);
}

function queryMatches(expected, actual) {
  if (!actual || typeof actual !== 'object') return false;
  return Object.entries(expected).every(([key, value]) => actual[key] === value);
}

function requestPlanMatches(oracle, result) {
  const plan = result.requestPlanning?.selectedPlan;
  if (!plan) return false;
  const operationContracts = plan.operationPlans?.map((item) => ({
    intent: item.intent,
    artifact: item.outputContract?.artifact,
    format: item.outputContract?.format,
  }));
  if (JSON.stringify(operationContracts) !== JSON.stringify(oracle.operationContracts)) return false;
  return plan.primaryIntent === oracle.operation
    && plan.outputContract?.artifact === oracle.artifact
    && plan.outputContract?.format === oracle.format;
}

function executionGate(context) {
  if (context.executionError) {
    return [diagnostic('execution', 'runtime-exception', context.executionError)];
  }
  if (!context.result) {
    return [diagnostic('execution', 'missing-runtime-result',
      'The runtime did not return a result and did not report an exception.')];
  }
  return [];
}

function resourceGate({ result }) {
  if (result.status !== 'RESOURCE_LIMIT' && result.approximation?.receipt?.complete !== false) return [];
  return [diagnostic('resource', 'bounded-work-exhausted',
    'The runtime exhausted a declared work bound.')];
}

function routeGate({ oracle, result }) {
  const alternateRoutes = oracle.kind === 'boolean-entailment' ? oracle.alternateRoutes : [];
  if (result.languageRoute === oracle.expectedRoute
      || alternateRoutes.includes(result.languageRoute)) return [];
  return [diagnostic('route', 'unexpected-language-route',
    `Expected ${oracle.expectedRoute}; observed ${result.languageRoute}.`)];
}

function statusGate({ oracle, result }) {
  if (oracle.acceptableStatuses.includes(result.status)) return [];
  return [diagnostic('status', 'unexpected-status',
    `Expected ${oracle.acceptableStatuses.join(' or ')}; observed ${result.status}.`)];
}

function answerCandidateGate({ oracle, result, successfulDirect }) {
  if (oracle.expectedCandidateText === null
      || candidateTexts(result).includes(oracle.expectedCandidateText)
      || oracle.candidateOptionalOnDirectSuccess && successfulDirect) return [];
  return [diagnostic('candidate', 'expected-candidate-not-generated',
    'No retained approximation matched the structural oracle.')];
}

function proposalCandidateGate({ oracle, result }) {
  if (candidateTexts(result).includes(oracle.expectedCandidateText)) return [];
  return [diagnostic('candidate', 'expected-candidate-not-generated',
    'No retained approximation matched the structural oracle.')];
}

function selectedCandidateGate({ oracle, result }) {
  const selected = result.approximation?.selectedCandidate;
  if (selected?.text !== oracle.expectedCandidateText) {
    return [diagnostic('candidate', 'expected-candidate-not-selected',
      'The selected approximation differs from the structural candidate oracle.')];
  }
  const failures = [];
  if (result.episode?.interpretedText !== oracle.expectedCandidateText) {
    failures.push(diagnostic('candidate', 'selected-candidate-not-executed',
      'The query-local episode did not execute the selected structural candidate.'));
  }
  const reparse = result.approximation?.reparses?.find((item) =>
    item.candidateId === selected.candidateId && item.text === selected.text);
  if (!reparse || reparse.status !== 'PARSED' || reparse.acceptedSemanticIr !== true) {
    failures.push(diagnostic('candidate', 'selected-candidate-not-reparsed',
      'The selected candidate has no matching accepted parse-only receipt.'));
  }
  for (const family of oracle.requiredFamilies) {
    if (!selected.supportingFamilies?.includes(family)) {
      failures.push(diagnostic('strategy-family', 'selected-family-missing',
        `The selected candidate is not supported by the required ${family} strategy.`));
    }
  }
  return failures;
}

function observedFamilyGate({ oracle, families, successfulDirect }) {
  const failures = [];
  for (const family of oracle.requiredFamilies) {
    if (!families.includes(family) && !(oracle.familyOptionalOnDirectSuccess && successfulDirect)) {
      failures.push(diagnostic('strategy-family', 'required-family-not-observed',
        `The ${family} strategy produced no retained proposal.`));
    }
  }
  return failures;
}

function proposalFamilyGate({ oracle, result }) {
  const candidate = expectedCandidate(result, oracle.expectedCandidateText);
  const failures = [];
  for (const family of oracle.requiredFamilies) {
    if (!candidate?.supportingFamilies?.includes(family)) {
      failures.push(diagnostic('strategy-family', 'candidate-family-not-bound',
        `The expected proposal is not supported by the required ${family} strategy.`));
    }
  }
  return failures;
}

function semanticQueryGate({ oracle, result }) {
  if (queryMatches(oracle.expectedQuery, result.query)) return [];
  return [diagnostic('semantic-query', 'semantic-ir-mismatch',
    'The accepted query differs from the generating semantic structure.')];
}

function requestGate({ oracle, result }) {
  if (requestPlanMatches(oracle, result)) return [];
  return [diagnostic('request-plan', 'request-obligations-missing',
    'The ordered request plan or output contract is incomplete.')];
}

function artifactFormatPresent(surface, format) {
  if (format === 'table') return /^\|.+\|$/mu.test(surface);
  if (['outline', 'bullets'].includes(format)) return /^\s*-\s+\S/mu.test(surface);
  if (format === 'sections') return /^#{2,3}\s+\S/mu.test(surface);
  return /\p{L}/u.test(surface);
}

function constructionReceiptFailures(oracle, result) {
  const synthesis = result.synthesis;
  if (!synthesis || synthesis.protocol !== 'eslm-heuristic-request-synthesis-v2'
      || synthesis.status !== 'PARTIAL' || typeof synthesis.answer !== 'string'
      || synthesis.answer.length === 0 || result.answer !== synthesis.answer) {
    return [diagnostic('result-construction', 'construction-receipt-missing',
      'The request route did not expose a matching bounded synthesis receipt and public artifact.')];
  }
  const artifacts = synthesis.operationArtifacts;
  if (!Array.isArray(artifacts) || artifacts.length !== oracle.operationContracts.length) {
    return [diagnostic('result-construction', 'operation-artifacts-missing',
      'Synthesis did not produce one ordered artifact receipt per requested operation.')];
  }
  const realization = synthesis.realization;
  if (!realization || realization.protocol !== 'eslm-grounded-response-realization-v1'
      || !Array.isArray(realization.claims) || !Array.isArray(realization.paragraphs)
      || !Array.isArray(realization.citations) || !Array.isArray(realization.strategyTrace)
      || realization.answer !== synthesis.answer) {
    return [diagnostic('result-construction', 'realization-receipt-missing',
      'Synthesis did not expose the closed rhetorical, claim, paragraph, and citation realization receipt.')];
  }
  const failures = [];
  artifacts.forEach((artifact, index) => {
    const contract = oracle.operationContracts[index];
    const observed = {
      intent: artifact?.intent,
      artifact: artifact?.outputContract?.artifact,
      format: artifact?.outputContract?.format,
    };
    if (artifact?.order !== index + 1
        || JSON.stringify(observed) !== JSON.stringify(contract)
        || artifact.complete !== false || !Array.isArray(artifact.gaps)
        || artifact.gaps.length === 0) {
      failures.push(diagnostic('result-construction', 'operation-artifact-mismatch',
        `Constructed operation ${index + 1} does not match its ordered output contract and gap receipt.`));
      return;
    }
    if (!artifactFormatPresent(synthesis.answer, contract.format)) {
      failures.push(diagnostic('result-construction', 'operation-output-shape-missing',
        `Constructed operation ${index + 1} is absent or does not expose ${contract.format} output.`));
      return;
    }
    const claims = realization.claims.filter((claim) => claim.operationId === artifact.operationId);
    for (const sentence of artifact.sourceSummary?.selected ?? []) {
      if (!claims.some((claim) => claim.sourceKind === 'supplied-sentence'
        && claim.status === 'realized' && claim.sentence === sentence.surface)) {
        failures.push(diagnostic('result-construction', 'selected-source-not-rendered',
          `Constructed operation ${index + 1} omitted a selected source sentence.`));
      }
    }
    for (const selection of artifact.evidence?.selected ?? []) {
      const entry = selection.entry;
      const identity = `${entry.kbId}@${entry.kbVersion ?? 'unversioned'}:${entry.recordId}`;
      const claim = claims.find((item) => item.sourceKind === 'kb-evidence'
        && item.evidenceIdentity === identity);
      if (!claim) {
        failures.push(diagnostic('result-construction', 'selected-evidence-not-accounted',
          `Constructed operation ${index + 1} neither realized nor rejected selected evidence.`));
      } else if (claim.status === 'realized' && !realization.citations.some((citation) =>
        citation.citationNumber === claim.citationNumber
        && citation.evidenceIdentity === identity)) {
        failures.push(diagnostic('result-construction', 'realized-evidence-not-cited',
          `Constructed operation ${index + 1} omitted a realized evidence citation.`));
      }
    }
  });
  const realized = realization.claims.filter((claim) => claim.status === 'realized');
  if (realized.length === 0 || !realization.strategyTrace.some((identity) =>
    identity.startsWith('strategy:result:'))) {
    failures.push(diagnostic('result-construction', 'coherent-realization-missing',
      'The synthesis receipt contains no realized claim or concrete result-construction strategy.'));
  }
  return failures;
}

function requestConstructionGate(context) {
  return [
    ...requestGate(context),
    ...constructionReceiptFailures(context.oracle, context.result),
  ];
}

function safetyGate({ oracle, result }) {
  const failures = [];
  if (oracle.forbiddenStatuses.includes(result.status)) {
    failures.push(diagnostic('safety', 'unsafe-positive-status',
      `The protected contrast produced forbidden status ${result.status}.`));
  }
  if (result.answer === oracle.forbiddenAnswer) {
    failures.push(diagnostic('safety', 'unsafe-positive-answer',
      `The protected contrast produced ${oracle.forbiddenAnswer}`));
  }
  const candidate = oracle.kind === 'interpretable-complex-clause'
    ? expectedCandidate(result, oracle.expectedCandidateText)?.text
    : result.approximation?.selectedCandidate?.text;
  if (candidate && !['reference', 'if-then'].includes(oracle.protectedOperator)
      && !tokenPresent(candidate, oracle.protectedOperator)) {
    failures.push(diagnostic('safety', 'protected-operator-lost',
      `The selected approximation removed ${oracle.protectedOperator}.`));
  }
  if (candidate && oracle.protectedOperator === 'if-then'
      && (!tokenPresent(candidate, 'if') || !tokenPresent(candidate, 'then'))) {
    failures.push(diagnostic('safety', 'protected-operator-lost',
      'The selected approximation did not preserve if/then scope.'));
  }
  if ((result.values?.length ?? 0) > 0 || (result.provenance?.length ?? 0) > 0
      || (result.usedKbVersions?.length ?? 0) > 0) {
    failures.push(diagnostic('safety', 'answer-bearing-abstention',
      'A safety-abstention result exposed answer values, provenance, or answer-contributing knowledge.'));
  }
  return failures;
}

function answerGate({ oracle, result }) {
  if (result.answer === oracle.expectedAnswer) return [];
  return [diagnostic('answer', 'answer-mismatch',
    `Expected ${oracle.expectedAnswer}; observed ${result.answer}.`)];
}

const COMMON_RESULT_GATES = Object.freeze([
  Object.freeze({ id: 'resource-budget', evaluate: resourceGate }),
  Object.freeze({ id: 'language-route', evaluate: routeGate }),
  Object.freeze({ id: 'epistemic-status', evaluate: statusGate }),
]);

const ORACLE_GATES = Object.freeze({
  'boolean-entailment': Object.freeze([
    Object.freeze({ id: 'candidate-generation', evaluate: answerCandidateGate }),
    Object.freeze({ id: 'family-observation', evaluate: observedFamilyGate }),
    Object.freeze({ id: 'semantic-query', evaluate: semanticQueryGate }),
    Object.freeze({ id: 'entailed-answer', evaluate: answerGate }),
  ]),
  'semantic-query-execution': Object.freeze([
    Object.freeze({ id: 'selected-candidate', evaluate: selectedCandidateGate }),
    Object.freeze({ id: 'semantic-query', evaluate: semanticQueryGate }),
  ]),
  'interpreted-question': Object.freeze([
    Object.freeze({ id: 'selected-candidate', evaluate: selectedCandidateGate }),
  ]),
  'statement-interpretation': Object.freeze([
    Object.freeze({ id: 'selected-candidate', evaluate: selectedCandidateGate }),
  ]),
  'request-construction': Object.freeze([
    Object.freeze({ id: 'constructed-request-artifact', evaluate: requestConstructionGate }),
  ]),
  'request-planning': Object.freeze([
    Object.freeze({ id: 'missing-source-request-plan', evaluate: requestGate }),
  ]),
  'interpretable-complex-clause': Object.freeze([
    Object.freeze({ id: 'candidate-generation', evaluate: proposalCandidateGate }),
    Object.freeze({ id: 'candidate-family-binding', evaluate: proposalFamilyGate }),
    Object.freeze({ id: 'operator-and-evidence-safety', evaluate: safetyGate }),
  ]),
  'safe-abstention': Object.freeze([
    Object.freeze({ id: 'operator-and-evidence-safety', evaluate: safetyGate }),
  ]),
});

function executeGate(gate, context) {
  const failures = gate.evaluate(context);
  return Object.freeze({
    failures,
    receipt: Object.freeze({
      gateId: gate.id,
      outcome: failures.length === 0 ? 'passed' : 'failed',
      failureCodes: Object.freeze(failures.map((failure) => failure.code)),
    }),
  });
}

export function assessGeneratedHeuristicCase(testCase, result, executionError) {
  assertGeneratedHeuristicOracle(testCase?.oracle);
  const oracle = testCase.oracle;
  const families = result ? observedFamilies(result) : [];
  const resourceLimited = result?.status === 'RESOURCE_LIMIT'
    || result?.approximation?.receipt?.complete === false;
  const context = Object.freeze({
    oracle, result, executionError, families,
    successfulDirect: result?.status === 'SOLVED' && result?.languageRoute === 'direct-symbolic',
  });
  const gates = [Object.freeze({ id: 'runtime-execution', evaluate: executionGate })];
  if (result) gates.push(...COMMON_RESULT_GATES, ...ORACLE_GATES[oracle.kind]);
  const evaluations = gates.map((gate) => executeGate(gate, context));
  const failures = evaluations.flatMap((evaluation) => evaluation.failures)
    .toSorted((left, right) => FAILURE_STAGE_ORDER.indexOf(left.stage)
      - FAILURE_STAGE_ORDER.indexOf(right.stage) || left.code.localeCompare(right.code));
  const confidenceBand = result?.approximation?.selectedCandidate?.confidenceBand
    ?? result?.approximation?.recommendedCandidate?.confidenceBand ?? 'none';
  return freeze({
    pass: failures.length === 0,
    failures,
    gateReceipts: evaluations.map((evaluation) => evaluation.receipt),
    observedFamilies: families,
    confidenceBand,
    resourceOutcome: result ? resourceLimited ? 'resource-limit' : 'complete' : 'execution-error',
  });
}
