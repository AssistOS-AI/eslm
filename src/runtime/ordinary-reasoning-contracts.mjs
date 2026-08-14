export const ORDINARY_REASONING_PROTOCOLS = Object.freeze({
  planningInput: 'eslm-ordinary-method-planning-input-v1',
  planningOutput: 'eslm-ordinary-method-planning-output-v1',
  executionInput: 'eslm-ordinary-method-execution-input-v1',
  executionOutput: 'eslm-ordinary-method-execution-output-v1',
  verificationInput: 'eslm-ordinary-result-verification-input-v1',
  verificationOutput: 'eslm-ordinary-result-verification-output-v1',
});

export const ORDINARY_REASONING_STAGES = Object.freeze({
  planning: 'runtime.method.plan',
  execution: 'runtime.reason.execute',
  verification: 'runtime.result.verify',
});

export const ORDINARY_METHOD_BY_CAPABILITY = Object.freeze({
  deduction: 'method:core:safe-horn-deduction',
  induction: 'method:core:configured-induction',
  abduction: 'method:core:guarded-abduction',
  'temporal-predecessor': 'method:core:temporal-state-predecessor',
  'finite-episode-orchestration': 'method:core:finite-episodic-world',
});

const EXECUTION_STATUSES = new Set([
  'ANSWERED', 'INDUCTIVE', 'ABDUCTIVE', 'DEFAULTED', 'UNKNOWN', 'RESOURCE_LIMIT',
]);

const TASK_FRAME_FIELDS = new Set([
  'taskId', 'instructions', 'assertions', 'constraints', 'goals', 'outputContract',
  'contextStack', 'languageRoute', 'budgets',
]);

export function requirePlainRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  return value;
}

export function requireExactFields(value, fields, label) {
  requirePlainRecord(value, label);
  const unknown = Object.keys(value).filter((field) => !fields.has(field));
  const missing = [...fields].filter((field) => !Object.hasOwn(value, field));
  if (unknown.length > 0 || missing.length > 0) {
    throw new TypeError(`${label} must use its closed field set; unknown [${unknown.join(', ')}], `
      + `missing [${missing.join(', ')}].`);
  }
}

export function requireBoundedArray(value, label, maximum, { exactLength } = {}) {
  if (!Array.isArray(value) || value.length > maximum
    || (exactLength !== undefined && value.length !== exactLength)) {
    const length = exactLength === undefined ? `at most ${maximum}` : `exactly ${exactLength}`;
    throw new TypeError(`${label} must be an array with ${length} items.`);
  }
  return value;
}

export function requireNonNegativeSafeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative safe integer.`);
  }
}

export function ordinaryMethodResultBounds(input) {
  const closureFacts = input.activeClosure.facts.length;
  const hypothesisLimit = input.activeModel.reasoning?.abduction?.maxHypotheses ?? 0;
  requireNonNegativeSafeInteger(closureFacts, 'Ordinary active closure fact count');
  requireNonNegativeSafeInteger(hypothesisLimit, 'Ordinary abduction hypothesis limit');
  return Object.freeze({
    maximumValues: Math.max(1, closureFacts, hypothesisLimit),
    maximumEvidence: Math.max(1, closureFacts, hypothesisLimit),
  });
}

export function ordinaryVerificationWorkLimit(input) {
  return input.planning.taskFrame.budgets.searchNodes;
}

function capabilityForQuery(query) {
  if (query.reasoning === 'temporal-predecessor') return 'temporal-predecessor';
  if (query.reasoning === 'induction') return 'induction';
  if (query.reasoning === 'abduction') return 'abduction';
  if (query.reasoning === 'finite-episodic-possession-location') return 'finite-episode-orchestration';
  return 'deduction';
}

function assertTaskFrame(taskFrame) {
  requireExactFields(taskFrame, TASK_FRAME_FIELDS, 'Ordinary method task frame');
  if (typeof taskFrame.taskId !== 'string' || taskFrame.taskId.length === 0) {
    throw new TypeError('Ordinary method task frame requires a taskId.');
  }
  requireBoundedArray(taskFrame.instructions, 'Ordinary method instructions', 16);
  requireBoundedArray(taskFrame.assertions, 'Ordinary method assertions', 1_024);
  requireBoundedArray(taskFrame.constraints, 'Ordinary method constraints', 256);
  requireBoundedArray(taskFrame.goals, 'Ordinary method goals', 1, { exactLength: 1 });
  requireBoundedArray(taskFrame.contextStack, 'Ordinary method context stack', 16);
  requirePlainRecord(taskFrame.goals[0], 'Ordinary method goal');
  requirePlainRecord(taskFrame.outputContract, 'Ordinary method output contract');
  requireExactFields(taskFrame.budgets, new Set(['timeMs', 'memoryBytes', 'searchNodes', 'shardBytes']),
    'Ordinary method budgets');
  for (const [field, value] of Object.entries(taskFrame.budgets)) {
    requireNonNegativeSafeInteger(value, `Ordinary method budget ${field}`);
  }
  return taskFrame;
}

function assertPlan(plan, taskFrame) {
  requirePlainRecord(plan, 'Ordinary method plan');
  const requiredCapability = capabilityForQuery(taskFrame.goals[0]);
  if (plan.requiredCapability !== requiredCapability) {
    throw new TypeError('Ordinary method plan requiredCapability contradicts its task goal.');
  }
  if (plan.status === 'NO_APPLICABLE_METHOD') {
    requireExactFields(plan, new Set([
      'status', 'requiredCapability', 'consideredMethods', 'failedPreconditions', 'steps',
    ]), 'Ordinary method capability-gap plan');
    requireBoundedArray(plan.consideredMethods, 'Ordinary method consideredMethods', 256);
    requireBoundedArray(plan.failedPreconditions, 'Ordinary method failedPreconditions', 256);
    requireBoundedArray(plan.steps, 'Ordinary method gap steps', 0, { exactLength: 0 });
    return plan;
  }
  if (plan.status !== 'planned') throw new TypeError('Ordinary method plan has an unsupported status.');
  requireExactFields(plan, new Set([
    'status', 'requiredCapability', 'methodId', 'method', 'steps',
  ]), 'Ordinary method selected plan');
  const method = requirePlainRecord(plan.method, 'Ordinary method binding');
  requireExactFields(method, new Set(['descriptor', 'execute']), 'Ordinary method binding');
  const descriptor = requirePlainRecord(method.descriptor, 'Ordinary method descriptor');
  if (descriptor.methodId !== plan.methodId
    || !descriptor.capabilities?.includes(requiredCapability)) {
    throw new TypeError('Ordinary method plan does not bind the selected capability and method identity.');
  }
  const expectedMethodId = ORDINARY_METHOD_BY_CAPABILITY[requiredCapability];
  if (plan.methodId !== expectedMethodId) {
    throw new TypeError(`Ordinary execution has no reviewed binding for selected method ${plan.methodId}.`);
  }
  const steps = requireBoundedArray(plan.steps, 'Ordinary method plan steps', 4, { exactLength: 4 });
  if (steps[1]?.operator !== 'DERIVE' || steps[1]?.action !== plan.methodId
    || steps[2]?.operator !== 'VERIFY' || steps[2]?.action !== descriptor.proofKind) {
    throw new TypeError('Ordinary method plan steps contradict the selected method or witness kind.');
  }
  return plan;
}

export function assertOrdinaryMethodPlanningInput(value) {
  requireExactFields(value, new Set(['format', 'taskFrame', 'registry']), 'Ordinary method planning input');
  if (value.format !== ORDINARY_REASONING_PROTOCOLS.planningInput) {
    throw new TypeError('Ordinary method planning input has an unsupported format.');
  }
  assertTaskFrame(value.taskFrame);
  if (typeof value.registry?.candidates !== 'function'
    || typeof value.registry?.descriptors !== 'function') {
    throw new TypeError('Ordinary method planning input requires the closed host capability registry.');
  }
  return value;
}

export function assertOrdinaryMethodPlanningOutput(value) {
  requireExactFields(value, new Set([
    'format', 'stage', 'taskFrame', 'plan', 'truthAuthorized',
  ]), 'Ordinary method planning output');
  if (value.format !== ORDINARY_REASONING_PROTOCOLS.planningOutput
    || value.stage !== ORDINARY_REASONING_STAGES.planning) {
    throw new TypeError('Ordinary method planning output has an unsupported format or stage.');
  }
  assertTaskFrame(value.taskFrame);
  assertPlan(value.plan, value.taskFrame);
  if (value.truthAuthorized !== false) {
    throw new TypeError('Method planning cannot authorize truth.');
  }
  return value;
}

function assertFactIndex(value, label) {
  requirePlainRecord(value, label);
  if (!Array.isArray(value.facts) || !(value.bySubject instanceof Map)
    || !(value.byPredicate instanceof Map) || !(value.byObject instanceof Map)) {
    throw new TypeError(`${label} must be a trusted finite fact index.`);
  }
}

export function assertOrdinaryExecutionContext(value) {
  const planning = assertOrdinaryMethodPlanningOutput(value.planning);
  if (planning.plan.status !== 'planned') {
    throw new TypeError('Ordinary method execution requires a selected plan.');
  }
  const model = requirePlainRecord(value.activeModel, 'Ordinary method active model');
  if (!Array.isArray(model.facts) || !Array.isArray(model.rules)) {
    throw new TypeError('Ordinary method active model requires facts and rules.');
  }
  const closure = requirePlainRecord(value.activeClosure, 'Ordinary method active closure');
  if (!Array.isArray(closure.facts) || typeof closure.complete !== 'boolean') {
    throw new TypeError('Ordinary method active closure requires finite facts and completeness.');
  }
  const maximumWork = ordinaryVerificationWorkLimit(value);
  requireBoundedArray(model.facts, 'Ordinary method active model facts', maximumWork);
  requireBoundedArray(model.rules, 'Ordinary method active model rules', maximumWork);
  requireBoundedArray(closure.facts, 'Ordinary method active closure facts', maximumWork);
  for (const [index, fact] of model.facts.entries()) {
    requirePlainRecord(fact, `Ordinary method active model facts[${index}]`);
  }
  for (const [index, rule] of model.rules.entries()) {
    requirePlainRecord(rule, `Ordinary method active model rules[${index}]`);
    requireBoundedArray(rule.when, `Ordinary method active model rules[${index}].when`, maximumWork);
    requireBoundedArray(rule.then, `Ordinary method active model rules[${index}].then`, 3, { exactLength: 3 });
  }
  for (const [index, fact] of closure.facts.entries()) {
    requirePlainRecord(fact, `Ordinary method active closure facts[${index}]`);
  }
  assertFactIndex(value.baseIndex, 'Ordinary method base index');
  requireBoundedArray(value.baseIndex.facts, 'Ordinary method base index facts', maximumWork);
  if (typeof value.hasSessionOverlay !== 'boolean') {
    throw new TypeError('Ordinary method hasSessionOverlay must be a boolean.');
  }
  requireBoundedArray(value.sessionHistory, 'Ordinary method session history', Math.min(1_024, maximumWork));
  for (const [index, event] of value.sessionHistory.entries()) {
    requirePlainRecord(event, `Ordinary method session history[${index}]`);
  }
  return value;
}

export function assertOrdinaryMethodExecutionInput(value) {
  requireExactFields(value, new Set([
    'format', 'planning', 'activeModel', 'activeClosure', 'baseIndex',
    'hasSessionOverlay', 'sessionHistory',
  ]), 'Ordinary method execution input');
  if (value.format !== ORDINARY_REASONING_PROTOCOLS.executionInput) {
    throw new TypeError('Ordinary method execution input has an unsupported format.');
  }
  return assertOrdinaryExecutionContext(value);
}

export function assertOrdinaryMethodExecutionOutput(value, bounds) {
  requireExactFields(bounds, new Set(['maximumValues', 'maximumEvidence']),
    'Ordinary method execution result bounds');
  requireNonNegativeSafeInteger(bounds.maximumValues, 'Ordinary method maximum values');
  requireNonNegativeSafeInteger(bounds.maximumEvidence, 'Ordinary method maximum evidence');
  requireExactFields(value, new Set([
    'format', 'stage', 'methodId', 'requiredCapability', 'status', 'result',
    'reasoning', 'resourceLimit', 'truthAuthorized',
  ]), 'Ordinary method execution output');
  if (value.format !== ORDINARY_REASONING_PROTOCOLS.executionOutput
    || value.stage !== ORDINARY_REASONING_STAGES.execution || !EXECUTION_STATUSES.has(value.status)) {
    throw new TypeError('Ordinary method execution output has an unsupported format, stage, or status.');
  }
  if (ORDINARY_METHOD_BY_CAPABILITY[value.requiredCapability] !== value.methodId) {
    throw new TypeError('Ordinary method execution cannot bypass the selected capability.');
  }
  const result = requirePlainRecord(value.result, 'Ordinary method result candidate');
  requireBoundedArray(result.values, 'Ordinary method result values', bounds.maximumValues);
  requireBoundedArray(result.evidence, 'Ordinary method result evidence', bounds.maximumEvidence);
  requirePlainRecord(value.reasoning, 'Ordinary method reasoning candidate');
  if ((value.status === 'RESOURCE_LIMIT') !== (value.resourceLimit !== null)) {
    throw new TypeError('Ordinary method execution resource-limit status and receipt must agree.');
  }
  if (value.truthAuthorized !== false) {
    throw new TypeError('Method execution cannot authorize truth before verification.');
  }
  return value;
}

export function assertOrdinaryResultVerificationInput(value) {
  requireExactFields(value, new Set([
    'format', 'planning', 'execution', 'activeModel', 'activeClosure', 'baseIndex',
    'hasSessionOverlay', 'sessionHistory',
  ]), 'Ordinary result verification input');
  if (value.format !== ORDINARY_REASONING_PROTOCOLS.verificationInput) {
    throw new TypeError('Ordinary result verification input has an unsupported format.');
  }
  assertOrdinaryExecutionContext(value);
  const execution = assertOrdinaryMethodExecutionOutput(value.execution, ordinaryMethodResultBounds(value));
  if (execution.methodId !== value.planning.plan.methodId
    || execution.requiredCapability !== value.planning.plan.requiredCapability) {
    throw new TypeError('Ordinary result witness does not belong to the selected plan.');
  }
  return value;
}

export function assertOrdinaryResultVerificationOutput(value, bounds) {
  requireExactFields(bounds, new Set(['maximumValues', 'maximumEvidence']),
    'Ordinary result verification bounds');
  requireNonNegativeSafeInteger(bounds.maximumValues, 'Ordinary verification maximum values');
  requireNonNegativeSafeInteger(bounds.maximumEvidence, 'Ordinary verification maximum evidence');
  requireExactFields(value, new Set([
    'format', 'stage', 'methodId', 'status', 'result', 'reasoning', 'resourceLimit',
    'accepted', 'truthAuthorized', 'work',
  ]), 'Ordinary result verification output');
  if (value.format !== ORDINARY_REASONING_PROTOCOLS.verificationOutput
    || value.stage !== ORDINARY_REASONING_STAGES.verification || typeof value.accepted !== 'boolean'
    || !EXECUTION_STATUSES.has(value.status)) {
    throw new TypeError('Ordinary result verification output has an unsupported format, stage, or decision.');
  }
  const result = requirePlainRecord(value.result, 'Verified ordinary method result');
  requireBoundedArray(result.values, 'Verified ordinary method values', bounds.maximumValues);
  requireBoundedArray(result.evidence, 'Verified ordinary method evidence', bounds.maximumEvidence);
  requireExactFields(value.work, new Set([
    'evidenceItemsInspected', 'supportReferencesInspected', 'factsInspected',
    'rulesInspected', 'historyEventsInspected', 'consumed', 'limit',
  ]), 'Ordinary result verification work');
  for (const [field, amount] of Object.entries(value.work)) {
    requireNonNegativeSafeInteger(amount, `Ordinary result verification work ${field}`);
  }
  const componentSum = value.work.evidenceItemsInspected + value.work.supportReferencesInspected
    + value.work.factsInspected + value.work.rulesInspected + value.work.historyEventsInspected;
  if (value.work.consumed !== componentSum || value.work.consumed > value.work.limit) {
    throw new TypeError('Ordinary result verification work must match its components and finite ceiling.');
  }
  if (!value.accepted && (value.status !== 'RESOURCE_LIMIT' || result.values.length > 0
    || result.evidence.length > 0 || value.resourceLimit === null)) {
    throw new TypeError('A rejected ordinary verification result must be a clean RESOURCE_LIMIT gap.');
  }
  const expectedAuthority = value.accepted && value.status === 'ANSWERED' && result.values.length > 0;
  if (value.truthAuthorized !== expectedAuthority) {
    throw new TypeError('Ordinary result truth authority contradicts verified strict result semantics.');
  }
  return value;
}
