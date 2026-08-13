export const GENERATED_HEURISTIC_ORACLE_KIND_TO_LEVEL = Object.freeze({
  'boolean-entailment': 'answer-execution',
  'semantic-query-execution': 'semantic-query-execution',
  'interpreted-question': 'candidate-selection',
  'statement-interpretation': 'query-local-decomposition',
  'request-construction': 'request-execution',
  'request-planning': 'request-planning',
  'interpretable-complex-clause': 'proposal-only',
  'safe-abstention': 'safety-abstention',
});

export const GENERATED_HEURISTIC_ORACLE_LEVELS = Object.freeze(
  Object.values(GENERATED_HEURISTIC_ORACLE_KIND_TO_LEVEL).toSorted(),
);

const STATUS_VALUES = new Set([
  'SOLVED', 'PARTIAL', 'UNKNOWN', 'AMBIGUOUS', 'UNPARSED', 'UNVERIFIED_NORMALIZATION',
  'DEFEASIBLE', 'MISSING_KNOWLEDGE', 'NO_APPLICABLE_METHOD', 'UNDERDETERMINED',
  'INCONSISTENT_CONTEXT', 'UNSUPPORTED_OUTPUT', 'RESOURCE_LIMIT',
]);
const ROUTE_VALUES = new Set([
  'direct-symbolic', 'heuristic-cnl-approximated', 'heuristic-cnl-ambiguous',
  'heuristic-request-synthesis', 'heuristic-request-planned',
]);

const FIELDS_BY_KIND = Object.freeze({
  'boolean-entailment': Object.freeze([
    'kind', 'oracleLevel', 'acceptableStatuses', 'expectedRoute', 'alternateRoutes',
    'expectedAnswer', 'expectedQuery', 'expectedCandidateText', 'requiredFamilies',
    'candidateOptionalOnDirectSuccess', 'familyOptionalOnDirectSuccess',
  ]),
  'semantic-query-execution': Object.freeze([
    'kind', 'oracleLevel', 'acceptableStatuses', 'expectedRoute', 'expectedAnswer',
    'expectedQuery', 'expectedCandidateText', 'requiredFamilies', 'requireSelectedCandidate',
  ]),
  'interpreted-question': Object.freeze([
    'kind', 'oracleLevel', 'acceptableStatuses', 'expectedRoute', 'expectedAnswer',
    'expectedCandidateText', 'requiredFamilies', 'requireSelectedCandidate',
  ]),
  'statement-interpretation': Object.freeze([
    'kind', 'oracleLevel', 'acceptableStatuses', 'expectedRoute', 'expectedAnswer',
    'expectedCandidateText', 'requiredFamilies', 'requireSelectedCandidate',
  ]),
  'request-construction': Object.freeze([
    'kind', 'oracleLevel', 'acceptableStatuses', 'expectedRoute', 'expectedAnswer',
    'operation', 'artifact', 'format', 'operationSequence', 'operationContracts',
  ]),
  'request-planning': Object.freeze([
    'kind', 'oracleLevel', 'acceptableStatuses', 'expectedRoute', 'expectedAnswer',
    'operation', 'artifact', 'format', 'operationSequence', 'operationContracts',
  ]),
  'interpretable-complex-clause': Object.freeze([
    'kind', 'oracleLevel', 'acceptableStatuses', 'expectedRoute', 'expectedAnswer',
    'expectedCandidateText', 'requiredFamilies', 'requireCandidateFamilyBinding',
    'forbiddenStatuses', 'forbiddenAnswer', 'protectedOperator', 'requireNoAnswerEvidence',
  ]),
  'safe-abstention': Object.freeze([
    'kind', 'oracleLevel', 'acceptableStatuses', 'expectedRoute', 'expectedAnswer',
    'forbiddenStatuses', 'forbiddenAnswer', 'protectedOperator', 'requireNoAnswerEvidence',
  ]),
});

function record(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${path} must be a plain object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} must be a plain object.`);
  }
  return value;
}

function exactFields(value, fields, path) {
  record(value, path);
  const actual = Object.keys(value).toSorted();
  const expected = [...fields].toSorted();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new TypeError(`${path} must contain exactly: ${fields.join(', ')}.`);
  }
}

function boundedText(value, path, maximum = 4_096) {
  if (typeof value !== 'string' || value.length < 1 || Buffer.byteLength(value, 'utf8') > maximum) {
    throw new TypeError(`${path} must be bounded non-empty text.`);
  }
}

function nullableText(value, path, maximum = 4_096) {
  if (value !== null) boundedText(value, path, maximum);
}

function stringArray(value, path, maximum, allowed) {
  if (!Array.isArray(value) || value.length > maximum || new Set(value).size !== value.length
      || value.some((item) => typeof item !== 'string' || item.length < 1 || item.length > 256)
      || allowed && value.some((item) => !allowed.has(item))) {
    throw new TypeError(`${path} must be a bounded unique array of supported strings.`);
  }
}

function semanticQuery(value) {
  exactFields(value, ['intent', 'subject', 'predicate', 'object'], 'Generated oracle expectedQuery');
  if (value.intent !== 'yes-no') {
    throw new TypeError('Generated oracle expectedQuery intent must be yes-no.');
  }
  for (const field of ['subject', 'predicate', 'object']) {
    boundedText(value[field], `Generated oracle expectedQuery.${field}`, 256);
  }
}

function validateCommon(oracle) {
  stringArray(oracle.acceptableStatuses, 'Generated oracle acceptableStatuses', 8, STATUS_VALUES);
  if (oracle.acceptableStatuses.length < 1) {
    throw new TypeError('Generated oracle must accept at least one status.');
  }
  if (!ROUTE_VALUES.has(oracle.expectedRoute)) {
    throw new TypeError('Generated oracle expectedRoute is unsupported.');
  }
  nullableText(oracle.expectedAnswer, 'Generated oracle expectedAnswer');
}

function exactExecutionContract(oracle, expectedRoute, statuses) {
  if (oracle.expectedRoute !== expectedRoute
      || oracle.acceptableStatuses.length !== statuses.length
      || statuses.some((status) => !oracle.acceptableStatuses.includes(status))) {
    throw new TypeError(`Generated ${oracle.kind} oracle has an incoherent route or status contract.`);
  }
}

function validateCandidateContract(oracle) {
  boundedText(oracle.expectedCandidateText, 'Generated oracle expectedCandidateText');
  stringArray(oracle.requiredFamilies, 'Generated oracle requiredFamilies', 24);
  if (oracle.requiredFamilies.length < 1 || oracle.requireSelectedCandidate !== true) {
    throw new TypeError('Selected-candidate oracle requires a candidate, a family, and explicit selection.');
  }
}

function validateRequestContract(oracle) {
  for (const field of ['operation', 'artifact', 'format']) {
    boundedText(oracle[field], `Generated oracle ${field}`, 64);
    if (!/^[a-z][a-z0-9-]*$/u.test(oracle[field])) {
      throw new TypeError(`Generated oracle ${field} must be a canonical identifier.`);
    }
  }
  stringArray(oracle.operationSequence, 'Generated oracle operationSequence', 12);
  if (oracle.operationSequence.length < 1 || oracle.operationSequence[0] !== oracle.operation) {
    throw new TypeError('Generated request oracle sequence must begin with its primary operation.');
  }
  if (!Array.isArray(oracle.operationContracts)
      || oracle.operationContracts.length !== oracle.operationSequence.length
      || oracle.operationContracts.length > 12) {
    throw new TypeError('Generated request oracle requires one output contract per ordered operation.');
  }
  oracle.operationContracts.forEach((contract, index) => {
    exactFields(contract, ['intent', 'artifact', 'format'],
      `Generated request oracle operationContracts[${index}]`);
    for (const field of ['intent', 'artifact', 'format']) {
      boundedText(contract[field], `Generated request oracle operationContracts[${index}].${field}`, 64);
      if (!/^[a-z][a-z0-9-]*$/u.test(contract[field])) {
        throw new TypeError('Generated request operation contract fields must be canonical identifiers.');
      }
    }
    if (contract.intent !== oracle.operationSequence[index]) {
      throw new TypeError('Generated request operation contracts must follow operationSequence exactly.');
    }
  });
  if (oracle.operationContracts[0].intent !== oracle.operation
      || oracle.operationContracts.length === 1
        && (oracle.operationContracts[0].artifact !== oracle.artifact
          || oracle.operationContracts[0].format !== oracle.format)) {
    throw new TypeError('Generated request primary intent or aggregate output contract is inconsistent.');
  }
}

function validateSafetyContract(oracle) {
  stringArray(oracle.forbiddenStatuses, 'Generated oracle forbiddenStatuses', 8, STATUS_VALUES);
  if (oracle.forbiddenStatuses.length < 1
      || oracle.forbiddenStatuses.some((status) => oracle.acceptableStatuses.includes(status))) {
    throw new TypeError('Generated safety oracle statuses must be non-empty and disjoint.');
  }
  boundedText(oracle.forbiddenAnswer, 'Generated oracle forbiddenAnswer');
  boundedText(oracle.protectedOperator, 'Generated oracle protectedOperator', 64);
  if (oracle.requireNoAnswerEvidence !== true) {
    throw new TypeError('Generated safety oracle must forbid answer-contributing evidence.');
  }
}

const VALIDATORS = Object.freeze({
  'boolean-entailment': (oracle) => {
    stringArray(oracle.alternateRoutes, 'Generated oracle alternateRoutes', 4, ROUTE_VALUES);
    if (oracle.alternateRoutes.includes(oracle.expectedRoute)) {
      throw new TypeError('Generated oracle alternateRoutes cannot repeat expectedRoute.');
    }
    semanticQuery(oracle.expectedQuery);
    nullableText(oracle.expectedCandidateText, 'Generated oracle expectedCandidateText');
    stringArray(oracle.requiredFamilies, 'Generated oracle requiredFamilies', 24);
    for (const field of ['candidateOptionalOnDirectSuccess', 'familyOptionalOnDirectSuccess']) {
      if (typeof oracle[field] !== 'boolean') throw new TypeError(`Generated oracle ${field} must be Boolean.`);
    }
    if (oracle.candidateOptionalOnDirectSuccess !== oracle.familyOptionalOnDirectSuccess
        || oracle.expectedCandidateText === null && oracle.candidateOptionalOnDirectSuccess
        || oracle.expectedCandidateText === null && oracle.requiredFamilies.length > 0) {
      throw new TypeError('Generated answer oracle direct-success policy is internally inconsistent.');
    }
    if (oracle.expectedAnswer !== 'Yes.'
        || !['direct-symbolic', 'heuristic-cnl-approximated'].includes(oracle.expectedRoute)
        || oracle.acceptableStatuses.some((status) => !['SOLVED', 'DEFEASIBLE'].includes(status))) {
      throw new TypeError('Generated answer oracle has an incoherent answer execution contract.');
    }
    if (oracle.expectedRoute === 'direct-symbolic') {
      exactExecutionContract(oracle, 'direct-symbolic', ['SOLVED']);
      if (oracle.expectedCandidateText !== null || oracle.alternateRoutes.length > 0) {
        throw new TypeError('Direct answer oracle cannot require or alternate through an approximation.');
      }
    } else if (oracle.expectedCandidateText === null || oracle.requiredFamilies.length < 1
        || !oracle.acceptableStatuses.includes('DEFEASIBLE')) {
      throw new TypeError('Approximate answer oracle requires a candidate, family, and defeasible status.');
    }
    const admitsDirectSuccess = oracle.alternateRoutes.includes('direct-symbolic');
    if (oracle.expectedRoute === 'heuristic-cnl-approximated'
        && (oracle.candidateOptionalOnDirectSuccess !== admitsDirectSuccess
          || oracle.acceptableStatuses.includes('SOLVED') !== admitsDirectSuccess)) {
      throw new TypeError('Approximate answer oracle direct-success fields disagree.');
    }
  },
  'semantic-query-execution': (oracle) => {
    validateCandidateContract(oracle);
    semanticQuery(oracle.expectedQuery);
    exactExecutionContract(oracle, 'heuristic-cnl-approximated', ['UNKNOWN']);
    if (oracle.expectedAnswer !== null) throw new TypeError('Semantic-query oracle cannot require an answer.');
  },
  'interpreted-question': (oracle) => {
    validateCandidateContract(oracle);
    exactExecutionContract(oracle, 'heuristic-cnl-approximated', ['UNKNOWN']);
    if (oracle.expectedAnswer !== null) throw new TypeError('Candidate-selection oracle cannot require an answer.');
  },
  'statement-interpretation': (oracle) => {
    validateCandidateContract(oracle);
    exactExecutionContract(oracle, 'heuristic-cnl-approximated', ['PARTIAL']);
    if (oracle.expectedAnswer !== null) throw new TypeError('Decomposition oracle cannot require an answer.');
  },
  'request-construction': (oracle) => {
    validateRequestContract(oracle);
    exactExecutionContract(oracle, 'heuristic-request-synthesis', ['PARTIAL']);
    if (oracle.expectedAnswer !== null) throw new TypeError('Request oracle cannot predeclare generated prose.');
  },
  'request-planning': (oracle) => {
    validateRequestContract(oracle);
    exactExecutionContract(oracle, 'heuristic-request-planned', ['MISSING_KNOWLEDGE']);
    if (oracle.expectedAnswer !== null) throw new TypeError('Request-plan oracle cannot predeclare generated prose.');
  },
  'interpretable-complex-clause': (oracle) => {
    boundedText(oracle.expectedCandidateText, 'Generated oracle expectedCandidateText');
    stringArray(oracle.requiredFamilies, 'Generated oracle requiredFamilies', 24);
    if (oracle.requiredFamilies.length < 1 || oracle.requireCandidateFamilyBinding !== true) {
      throw new TypeError('Proposal oracle requires exact candidate-to-family binding.');
    }
    validateSafetyContract(oracle);
    exactExecutionContract(oracle, 'direct-symbolic', ['UNPARSED']);
    if (oracle.expectedAnswer !== null) throw new TypeError('Proposal oracle cannot require an answer.');
  },
  'safe-abstention': (oracle) => {
    validateSafetyContract(oracle);
    exactExecutionContract(oracle, 'direct-symbolic', ['UNPARSED']);
    if (oracle.expectedAnswer !== null) throw new TypeError('Safety oracle cannot require an answer.');
  },
});

export function assertGeneratedHeuristicOracle(oracle) {
  record(oracle, 'Generated heuristic oracle');
  const expectedLevel = GENERATED_HEURISTIC_ORACLE_KIND_TO_LEVEL[oracle.kind];
  if (!expectedLevel || oracle.oracleLevel !== expectedLevel) {
    throw new TypeError('Generated heuristic oracle kind and oracleLevel are inconsistent.');
  }
  exactFields(oracle, FIELDS_BY_KIND[oracle.kind], `Generated ${oracle.kind} oracle`);
  validateCommon(oracle);
  VALIDATORS[oracle.kind](oracle);
  return oracle;
}

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const item of Object.values(value)) freeze(item);
    Object.freeze(value);
  }
  return value;
}

export function createGeneratedHeuristicOracle(kind, fields) {
  if (!Object.hasOwn(GENERATED_HEURISTIC_ORACLE_KIND_TO_LEVEL, kind)) {
    throw new TypeError(`Unknown generated heuristic oracle kind: ${kind}.`);
  }
  record(fields, `Generated ${kind} oracle fields`);
  if (Object.hasOwn(fields, 'kind') || Object.hasOwn(fields, 'oracleLevel')) {
    throw new TypeError('Generated oracle factory owns kind and oracleLevel discriminants.');
  }
  const oracle = {
    kind,
    oracleLevel: GENERATED_HEURISTIC_ORACLE_KIND_TO_LEVEL[kind],
    ...fields,
  };
  assertGeneratedHeuristicOracle(oracle);
  return freeze(oracle);
}
