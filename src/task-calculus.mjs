export const OPERATORS = Object.freeze([
  'OBSERVE', 'STRUCTURE', 'RELATE', 'REDUCE', 'DERIVE', 'CONSTRUCT', 'VERIFY', 'EFFECT',
]);

export const CONTROLS = Object.freeze([
  'THEN', 'ALL', 'CHOOSE', 'EACH', 'UNTIL', 'BEAM', 'MEMO', 'COMPENSATE',
]);

export const OUTCOMES = Object.freeze([
  'VALUE', 'UNKNOWN', 'UNSUPPORTED', 'AMBIGUOUS', 'NEEDS_CLARIFICATION', 'FAILED_VERIFICATION',
]);

export function taskContract({ goal, assets = [], deliverable, constraints = [], oracles = [], effects = [], budget = {}, abstentionPolicy = 'explicit' }) {
  if (!goal || !deliverable) throw new Error('A task contract requires goal and deliverable.');
  return Object.freeze({ goal, assets, deliverable, constraints, oracles, effects, budget, abstentionPolicy });
}

export function operation(operator, executor, input = {}) {
  if (!OPERATORS.includes(operator)) throw new Error(`Unknown semantic operator: ${operator}`);
  if (typeof executor !== 'function') throw new Error(`Operator ${operator} requires an executor.`);
  return Object.freeze({ kind: 'OPERATION', operator, executor, input });
}

export function then(...plans) {
  return Object.freeze({ kind: 'THEN', plans });
}

export async function execute(plan, initial = {}, trace = []) {
  if (plan.kind === 'OPERATION') {
    const started = performance.now();
    const value = await plan.executor({ ...initial, ...plan.input });
    trace.push({ operator: plan.operator, durationMs: performance.now() - started, status: 'VALUE' });
    return { value, trace };
  }
  if (plan.kind === 'THEN') {
    let value = initial;
    for (const child of plan.plans) value = (await execute(child, value, trace)).value;
    return { value, trace };
  }
  if (plan.kind === 'ALL') {
    const values = await Promise.all(plan.plans.map((child) => execute(child, initial, trace).then((result) => result.value)));
    return { value: values, trace };
  }
  if (plan.kind === 'CHOOSE') {
    const selected = plan.branches.find((branch) => branch.guard(initial)) ?? plan.fallback;
    if (!selected) return { value: { status: 'UNSUPPORTED' }, trace };
    return execute(selected.plan ?? selected, initial, trace);
  }
  throw new Error(`Control ${plan.kind} is declared but has no v0.1 executor.`);
}
