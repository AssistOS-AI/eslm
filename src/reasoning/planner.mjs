const STATUS = Object.freeze({
  COMPLETE: 'planned',
  GAP: 'NO_APPLICABLE_METHOD',
});

export function taskFrameFromQuery(query, options = {}) {
  return Object.freeze({
    taskId: options.taskId ?? 'task:runtime:current',
    instructions: ['instr:answer-question'],
    assertions: options.assertions ?? [],
    constraints: options.constraints ?? [],
    goals: [query],
    outputContract: {
      kind: query.target === 'boolean' ? 'boolean' : 'semantic-values',
      allowedValues: query.target === 'boolean' ? [true, false] : undefined,
    },
    contextStack: options.contextStack ?? ['context:runtime:baseline'],
    languageRoute: options.languageRoute ?? 'direct-symbolic',
    budgets: {
      timeMs: options.timeMs ?? 10_000,
      memoryBytes: options.memoryBytes ?? 512 * 1024 * 1024,
      searchNodes: options.searchNodes ?? 100_000,
      shardBytes: options.shardBytes ?? 1024 * 1024 * 1024,
    },
  });
}

function capabilityFor(query) {
  if (query.reasoning === 'temporal-predecessor') return 'temporal-predecessor';
  if (query.reasoning === 'induction') return 'induction';
  if (query.reasoning === 'abduction') return 'abduction';
  if (query.reasoning === 'finite-episodic-possession-location') return 'finite-episode-orchestration';
  return 'deduction';
}

export function createPlan(taskFrame, registry) {
  const [goal] = taskFrame.goals;
  const requiredCapability = capabilityFor(goal);
  const candidates = registry.candidates(requiredCapability);
  if (candidates.length === 0) {
    return Object.freeze({
      status: STATUS.GAP,
      requiredCapability,
      consideredMethods: registry.descriptors().map((descriptor) => descriptor.methodId),
      failedPreconditions: [`No registered method advertises ${requiredCapability}.`],
      steps: [],
    });
  }
  const selected = candidates.toSorted((left, right) =>
    left.descriptor.methodId.localeCompare(right.descriptor.methodId))[0];
  return Object.freeze({
    status: STATUS.COMPLETE,
    requiredCapability,
    methodId: selected.descriptor.methodId,
    method: selected,
    steps: Object.freeze([
      Object.freeze({ stepId: 's1', operator: 'OBSERVE', action: 'select-kb-shards' }),
      Object.freeze({ stepId: 's2', operator: 'DERIVE', action: selected.descriptor.methodId, dependsOn: ['s1'] }),
      Object.freeze({ stepId: 's3', operator: 'VERIFY', action: selected.descriptor.proofKind, dependsOn: ['s2'] }),
      Object.freeze({ stepId: 's4', operator: 'CONSTRUCT', action: 'realize-result', dependsOn: ['s3'] }),
    ]),
  });
}

export function capabilityGap(taskFrame, plan) {
  return Object.freeze({
    gapType: 'NO_APPLICABLE_METHOD',
    subgoalRef: taskFrame.goals[0],
    requiredInputTypes: ['semantic-query'],
    requiredOutputType: taskFrame.outputContract.kind,
    consideredMethods: plan.consideredMethods,
    failedPreconditions: plan.failedPreconditions,
    availableEvidenceRefs: taskFrame.assertions,
  });
}
