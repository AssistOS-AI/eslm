import test from 'node:test';
import assert from 'node:assert/strict';
import { CapabilityRegistry, CORE_METHOD_DESCRIPTORS } from '../src/reasoning/capability-registry.mjs';
import { deriveClosure, indexFacts } from '../src/reasoning/datalog.mjs';
import { taskFrameFromQuery } from '../src/reasoning/planner.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';
import {
  assertOrdinaryMethodExecutionOutput,
  assertOrdinaryMethodPlanningOutput,
  executeOrdinaryMethod,
  ordinaryMethodResultBounds,
  ORDINARY_REASONING_PROTOCOLS,
  planOrdinaryMethod,
  verifyOrdinaryMethodResult,
} from '../src/runtime/ordinary-reasoning-processing-nodes.mjs';

function registryFor(...descriptors) {
  const registry = new CapabilityRegistry();
  for (const descriptor of descriptors) registry.register(descriptor, () => undefined);
  return registry;
}

function planningFor(query, registry, assertions = []) {
  return planOrdinaryMethod({
    format: ORDINARY_REASONING_PROTOCOLS.planningInput,
    taskFrame: taskFrameFromQuery(query, { assertions }),
    registry,
  });
}

async function deductionCase({
  subject = 'nexa', className = 'vorin', predicate = 'glim', value = 'lumo',
  irrelevantFirst = false,
} = {}) {
  const core = await createCoreModel();
  const directFact = {
    id: 'fact:nonce:class', subject, predicate: 'is_a', object: className,
    provenance: ['source:nonce:class'],
  };
  const irrelevant = {
    id: 'fact:nonce:irrelevant', subject: 'sovar', predicate: 'avoids', object: 'trem',
    provenance: ['source:nonce:irrelevant'],
  };
  const activeModel = {
    ...core,
    facts: irrelevantFirst ? [irrelevant, directFact] : [directFact, irrelevant],
    rules: [{
      id: 'rule:nonce:relation',
      when: [['?entity', 'is_a', className]],
      then: ['?entity', predicate, value],
      source: 'source:nonce:relation',
    }],
  };
  const activeClosure = deriveClosure(activeModel);
  const query = { reasoning: 'deduction', subject, predicate, object: value, target: 'boolean' };
  const planning = planningFor(query, registryFor(CORE_METHOD_DESCRIPTORS.datalog));
  const executionInput = {
    format: ORDINARY_REASONING_PROTOCOLS.executionInput,
    planning,
    activeModel,
    activeClosure,
    baseIndex: indexFacts(activeClosure.facts),
    hasSessionOverlay: false,
    sessionHistory: [],
  };
  return { query, planning, executionInput };
}

function verificationInput(executionInput, execution) {
  return {
    ...executionInput,
    format: ORDINARY_REASONING_PROTOCOLS.verificationInput,
    execution,
  };
}

test('ordinary method planning is a closed bounded selection node with no truth authority', () => {
  const registry = registryFor(
    CORE_METHOD_DESCRIPTORS.datalog,
    CORE_METHOD_DESCRIPTORS.induction,
  );
  const first = planningFor({
    reasoning: 'deduction', subject: 'nexa', predicate: 'glim', target: 'object',
  }, registry);
  const renamed = planningFor({
    reasoning: 'deduction', subject: 'tavir', predicate: 'skens', target: 'object',
  }, registry);
  assert.equal(first.stage, 'runtime.method.plan');
  assert.equal(first.truthAuthorized, false);
  assert.equal(first.plan.methodId, 'method:core:safe-horn-deduction');
  assert.equal(renamed.plan.methodId, first.plan.methodId);

  const meaningChanging = planningFor({
    reasoning: 'induction', subject: 'tavir', predicate: 'skens', target: 'object',
  }, registry);
  assert.equal(meaningChanging.plan.methodId, 'method:core:configured-induction');

  assert.throws(() => assertOrdinaryMethodPlanningOutput({
    ...first, truthAuthorized: true,
  }), /planning cannot authorize truth/u);
  assert.throws(() => assertOrdinaryMethodPlanningOutput({
    ...first, values: ['forged'],
  }), /closed field set/u);

  const oversizedTaskFrame = {
    ...first.taskFrame,
    assertions: Array.from({ length: 1_025 }, (_, index) => `fact:nonce:${index}`),
  };
  assert.throws(() => planOrdinaryMethod({
    format: ORDINARY_REASONING_PROTOCOLS.planningInput,
    taskFrame: oversizedTaskFrame,
    registry,
  }), /assertions must be an array with at most 1024 items/u);
});

test('ordinary execution cannot bypass the exact method selected for a semantic capability', async () => {
  const { planning, executionInput } = await deductionCase();
  const execution = executeOrdinaryMethod(executionInput);
  assert.equal(execution.stage, 'runtime.reason.execute');
  assert.equal(execution.methodId, planning.plan.methodId);
  assert.equal(execution.truthAuthorized, false);
  assert.equal(execution.status, 'ANSWERED');

  assert.throws(() => assertOrdinaryMethodExecutionOutput({
    ...execution, truthAuthorized: true,
  }, ordinaryMethodResultBounds(executionInput)), /execution cannot authorize truth/u);

  const unboundDescriptor = {
    ...CORE_METHOD_DESCRIPTORS.datalog,
    methodId: 'method:core:nonce-unreviewed-deduction',
  };
  const forgedPlan = {
    ...planning.plan,
    methodId: unboundDescriptor.methodId,
    method: { descriptor: unboundDescriptor, execute: () => undefined },
    steps: planning.plan.steps.map((step) => step.operator === 'DERIVE'
      ? { ...step, action: unboundDescriptor.methodId } : step),
  };
  assert.throws(() => executeOrdinaryMethod({
    ...executionInput,
    planning: { ...planning, plan: forgedPlan },
  }), /no reviewed binding for selected method/u);
});

test('the result verifier rejects altered values and Horn witnesses before granting authority', async () => {
  const { executionInput } = await deductionCase();
  const execution = executeOrdinaryMethod(executionInput);
  const verified = verifyOrdinaryMethodResult(verificationInput(executionInput, execution));
  assert.equal(verified.stage, 'runtime.result.verify');
  assert.equal(verified.accepted, true);
  assert.equal(verified.truthAuthorized, true);
  assert.deepEqual(verified.result.values, [true]);
  assert.equal(verified.result.evidence[0].reasoning, 'deduction');

  const alteredValue = {
    ...execution,
    result: { ...execution.result, values: ['forged-answer'] },
  };
  assert.throws(() => verifyOrdinaryMethodResult(
    verificationInput(executionInput, alteredValue),
  ), /rejected mismatched .* witness or result/u);

  const alteredWitness = {
    ...execution,
    result: {
      ...execution.result,
      evidence: execution.result.evidence.map((fact) => ({
        ...fact, support: ['fact:nonce:forged-support'],
      })),
    },
  };
  assert.throws(() => verifyOrdinaryMethodResult(
    verificationInput(executionInput, alteredWitness),
  ), /rejected/u);
});

test('the result verifier independently checks possession-location defaults and their confidence', async () => {
  const core = await createCoreModel();
  const facts = [
    {
      id: 'fact:nonce:owner-location', subject: 'vekan', predicate: 'located_in', object: 'orun',
      provenance: ['source:nonce:owner-location'],
    },
    {
      id: 'fact:nonce:possession', subject: 'vekan', predicate: 'owns', object: 'mirel',
      provenance: ['source:nonce:possession'],
    },
  ];
  const activeModel = { ...core, facts, rules: [] };
  const activeClosure = deriveClosure(activeModel);
  const query = {
    intent: 'location', subject: 'mirel', predicate: 'located_in', target: 'object',
    reasoning: 'finite-episodic-possession-location', owner: 'vekan', confidence: 0.62,
    assumption: 'The possessed entity normally shares the current location of its owner.',
    episodicTask: {
      schema: 'finite-episodic-world-task-v1',
      operations: [
        {
          id: facts[0].id, sequence: 0, kind: 'state', predicate: 'located_in',
          subject: 'vekan', values: ['orun'],
        },
        {
          id: facts[1].id, sequence: 1, kind: 'relation-add', relation: 'owns',
          subject: 'vekan', object: 'mirel',
        },
      ],
      query: {
        kind: 'state-values', predicate: 'located_in', subject: 'mirel', carrierRelation: 'owns',
      },
      policy: {},
    },
  };
  const planning = planningFor(query, registryFor(CORE_METHOD_DESCRIPTORS.finiteEpisodicWorld));
  const executionInput = {
    format: ORDINARY_REASONING_PROTOCOLS.executionInput,
    planning,
    activeModel,
    activeClosure,
    baseIndex: indexFacts(activeClosure.facts),
    hasSessionOverlay: false,
    sessionHistory: [],
  };
  const execution = executeOrdinaryMethod(executionInput);
  const verified = verifyOrdinaryMethodResult(verificationInput(executionInput, execution));
  assert.equal(verified.status, 'DEFAULTED');
  assert.equal(verified.accepted, true);
  assert.equal(verified.truthAuthorized, false);
  assert.deepEqual(verified.result.values, ['orun']);

  const alteredConfidence = {
    ...execution,
    result: {
      ...execution.result,
      evidence: execution.result.evidence.map((item) => ({ ...item, confidence: 0.99 })),
    },
  };
  assert.throws(() => verifyOrdinaryMethodResult(
    verificationInput(executionInput, alteredConfidence),
  ), /rejected mismatched possession-location evidence/u);
});

test('witness verification performs no hidden second retrieval or profiled method execution', async () => {
  const { executionInput } = await deductionCase();
  let indexLookups = 0;
  class CountingMap extends Map {
    get(key) {
      indexLookups += 1;
      return super.get(key);
    }
  }
  const countedInput = {
    ...executionInput,
    baseIndex: {
      ...executionInput.baseIndex,
      bySubject: new CountingMap(executionInput.baseIndex.bySubject),
      byPredicate: new CountingMap(executionInput.baseIndex.byPredicate),
      byObject: new CountingMap(executionInput.baseIndex.byObject),
    },
  };
  const profiledStages = [];
  const execution = executeOrdinaryMethod(countedInput, {
    measureSync(name, run) {
      profiledStages.push(name);
      return run();
    },
    annotate() {},
  });
  const lookupsAfterExecution = indexLookups;
  const stagesAfterExecution = [...profiledStages];
  const verified = verifyOrdinaryMethodResult(verificationInput(countedInput, execution));
  assert.equal(verified.accepted, true);
  assert.equal(indexLookups, lookupsAfterExecution);
  assert.deepEqual(profiledStages, stagesAfterExecution);
  assert.ok(verified.work.evidenceItemsInspected > 0);
  assert.ok(verified.work.factsInspected > 0);
  assert.equal(verified.work.limit, countedInput.planning.taskFrame.budgets.searchNodes);
  assert.ok(verified.work.consumed <= verified.work.limit);
});

test('the verification gate rejects oversized host envelopes and finite-work exhaustion', async () => {
  const { executionInput } = await deductionCase();
  const execution = executeOrdinaryMethod(executionInput);
  const tinyPlanning = {
    ...executionInput.planning,
    taskFrame: {
      ...executionInput.planning.taskFrame,
      budgets: { ...executionInput.planning.taskFrame.budgets, searchNodes: 3 },
    },
  };
  const tinyInput = { ...executionInput, planning: tinyPlanning };
  const tinyExecution = { ...execution, result: { ...execution.result } };
  const limited = verifyOrdinaryMethodResult(verificationInput(tinyInput, tinyExecution));
  assert.equal(limited.accepted, false);
  assert.equal(limited.status, 'RESOURCE_LIMIT');
  assert.equal(limited.truthAuthorized, false);
  assert.equal(limited.resourceLimit.operation, 'verify-ordinary-method-result');
  assert.match(limited.resourceLimit.diagnostic, /3-operation work ceiling/u);

  const oversized = {
    ...executionInput,
    activeModel: {
      ...executionInput.activeModel,
      rules: Array.from({ length: 9 }, (_, index) => ({
        id: `rule:overflow:${index}`, when: [['?x', 'is_a', 'q']], then: ['?x', 'glim', 'r'],
      })),
    },
    planning: {
      ...executionInput.planning,
      taskFrame: {
        ...executionInput.planning.taskFrame,
        budgets: { ...executionInput.planning.taskFrame.budgets, searchNodes: 8 },
      },
    },
  };
  assert.throws(() => executeOrdinaryMethod(oversized),
    /active model rules must be an array with at most 8 items/u);
});

test('renaming, source reordering, and a meaning-changing relation remain distinct at every node', async () => {
  const first = await deductionCase({
    subject: 'tavir', className: 'sken', predicate: 'vorns', value: 'ulmar',
  });
  const reordered = await deductionCase({
    subject: 'tavir', className: 'sken', predicate: 'vorns', value: 'ulmar', irrelevantFirst: true,
  });
  for (const item of [first, reordered]) {
    const execution = executeOrdinaryMethod(item.executionInput);
    const verified = verifyOrdinaryMethodResult(verificationInput(item.executionInput, execution));
    assert.deepEqual(verified.result.values, [true]);
    assert.equal(verified.truthAuthorized, true);
  }

  const contrastQuery = {
    ...first.query, predicate: 'shuns',
  };
  const contrastPlanning = planningFor(
    contrastQuery,
    registryFor(CORE_METHOD_DESCRIPTORS.datalog),
  );
  const contrastInput = {
    ...first.executionInput,
    planning: contrastPlanning,
  };
  const contrastExecution = executeOrdinaryMethod(contrastInput);
  const contrastVerified = verifyOrdinaryMethodResult(
    verificationInput(contrastInput, contrastExecution),
  );
  assert.equal(contrastVerified.status, 'UNKNOWN');
  assert.deepEqual(contrastVerified.result.values, []);
  assert.equal(contrastVerified.truthAuthorized, false);
});
