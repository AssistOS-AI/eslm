import { CORE_METHOD_DESCRIPTORS } from '../reasoning/capability-registry.mjs';
import { executeCategoricalTask } from '../reasoning/categorical-logic.mjs';
import { executeContainerStateTask } from '../reasoning/container-state.mjs';
import { selectNarrativeContinuation } from '../reasoning/continuation-selection.mjs';
import { executeEpisodicWorldTask } from '../reasoning/episodic-world.mjs';
import { constructFiniteFirstOrderCountermodel } from '../reasoning/finite-first-order-model.mjs';
import { induceFiniteConjunctiveRule } from '../reasoning/finite-conjunctive-rule-induction.mjs';
import { executeQualitativeRelationTask } from '../reasoning/qualitative-relation-closure.mjs';
import { executeTypedRelationTask } from '../reasoning/relation-algebra.mjs';
import { decideBooleanEntailment } from '../reasoning/sat-entailment.mjs';
import { executeSpatialExtentTask } from '../reasoning/spatial-extent.mjs';
import { executeSpatialVectorTask } from '../reasoning/spatial-vector.mjs';
import {
  assertRuntimeResultContract, directCoreMemorySnapshot, normalizeRuntimeStatus,
} from './result-contract.mjs';

function compareKbIdentity(left, right) {
  return left.kbId.localeCompare(right.kbId)
    || String(left.version).localeCompare(String(right.version));
}

function uniqueKbVersions(values) {
  const byIdentity = new Map(values.filter((item) => item?.kbId).map((item) => [
    `${item.kbId}\u0000${item.version ?? ''}`,
    { kbId: item.kbId, ...(item.version ? { version: item.version } : {}) },
  ]));
  return [...byIdentity.values()].toSorted(compareKbIdentity);
}

function coreModelMetadata(model) {
  return {
    id: model.manifest.modelId,
    knowledgeBases: model.manifest.knowledgeBases ?? [],
    memory: directCoreMemorySnapshot(),
  };
}

function taskMethods(model) {
  return {
    'complete-container-contents': Object.freeze({
      descriptor: CORE_METHOD_DESCRIPTORS.containerState,
      execute: executeContainerStateTask,
      route: 'direct-symbolic-task-adapter',
    }),
    'select-narrative-continuation': Object.freeze({
      descriptor: CORE_METHOD_DESCRIPTORS.narrativeContinuation,
      execute: selectNarrativeContinuation,
      route: 'direct-symbolic-task-adapter',
    }),
    'induce-symbolic-classification-rule': Object.freeze({
      descriptor: CORE_METHOD_DESCRIPTORS.finiteConjunctiveRuleInduction,
      execute(value) {
        const result = induceFiniteConjunctiveRule(value.inductionTask);
        return { ...result, values: result.status === 'SOLVED' ? [result.rule] : [] };
      },
      route: 'direct-symbolic-task-adapter',
    }),
    'execute-finite-episodic-world': Object.freeze({
      descriptor: CORE_METHOD_DESCRIPTORS.finiteEpisodicWorld,
      execute: (value) => executeEpisodicWorldTask(value.episodicWorldTask),
      route: 'direct-symbolic-task-adapter',
    }),
    'classify-typed-relation': Object.freeze({
      descriptor: CORE_METHOD_DESCRIPTORS.typedRelationAlgebra,
      execute: (value) => executeTypedRelationTask(
        value.relationTask,
        model.reasoning?.relationAlgebras?.[value.relationTask?.algebraId],
      ),
      usedKbVersions: (value) => model.reasoning
        ?.relationAlgebras?.[value.relationTask?.algebraId]?.sourceKbVersions ?? [],
      route: 'direct-symbolic-task-adapter',
    }),
    'spatial-vector-relation': Object.freeze({
      descriptor: CORE_METHOD_DESCRIPTORS.spatialVectorConstraints,
      execute: (value) => executeSpatialVectorTask(value.relationTask, value.vectorSystem),
      route: 'direct-symbolic-task-adapter',
    }),
    'spatial-extent-relations': Object.freeze({
      descriptor: CORE_METHOD_DESCRIPTORS.spatialExtentInequalities,
      execute: (value) => executeSpatialExtentTask(value.extentTask, value.extentSystem),
      route: 'direct-symbolic-task-adapter',
    }),
    'qualitative-spatial-relations': Object.freeze({
      descriptor: CORE_METHOD_DESCRIPTORS.qualitativeRelationClosure,
      execute: (value) => executeQualitativeRelationTask(value.qualitativeTask, value.qualitativeSystem),
      route: 'direct-symbolic-task-adapter',
    }),
    'judge-categorical-opposition': Object.freeze({
      descriptor: CORE_METHOD_DESCRIPTORS.categoricalLogic,
      execute: executeCategoricalTask,
      route: 'direct-symbolic-task-adapter',
    }),
    'transform-categorical-proposition': Object.freeze({
      descriptor: CORE_METHOD_DESCRIPTORS.categoricalLogic,
      execute: executeCategoricalTask,
      route: 'direct-symbolic-task-adapter',
    }),
    'derive-categorical-syllogism': Object.freeze({
      descriptor: CORE_METHOD_DESCRIPTORS.categoricalLogic,
      execute: executeCategoricalTask,
      route: 'direct-symbolic-task-adapter',
    }),
    'decide-boolean-entailment': Object.freeze({
      descriptor: CORE_METHOD_DESCRIPTORS.scalableBooleanEntailment,
      execute(value) {
        const result = decideBooleanEntailment(value);
        return { ...result, values: result.status === 'SOLVED' ? [result.entailed] : [] };
      },
      route: 'direct-symbolic-task-adapter',
    }),
    'construct-finite-countermodel': Object.freeze({
      descriptor: CORE_METHOD_DESCRIPTORS.finiteFirstOrderCountermodel,
      execute(value) {
        const result = constructFiniteFirstOrderCountermodel(value.argument, {
          domainSize: value.domainSize,
          maximumConstantAssignments: value.maximumConstantAssignments,
          booleanBudgets: value.booleanBudgets,
        });
        return {
          ...result,
          countermodel: result.model,
          values: result.status === 'SOLVED' ? [result.model] : [],
        };
      },
      route: 'direct-symbolic-task-adapter',
    }),
  };
}

function taskFrame(task) {
  return {
    taskId: task.taskId,
    goals: [{
      operation: task.operation,
      mask: task.mask,
      query: task.query ?? task.relationTask?.query ?? task.extentTask?.query,
    }],
    outputContract: {
      kind: task.operation === 'decide-boolean-entailment' ? 'entailed-boolean'
        : task.operation === 'construct-finite-countermodel' ? 'finite-countermodel'
          : 'semantic-values',
    },
  };
}

export function executeTypedTask(model, task) {
  const selectedKbVersions = model.manifest.knowledgeBaseVersions
    ?? (model.manifest.knowledgeBases ?? []).map((kbId) => ({ kbId }));
  const method = taskMethods(model)[task?.operation];
  if (!method) {
    return assertRuntimeResultContract({
      status: 'NO_APPLICABLE_METHOD',
      protocol: 'eslm-runtime-result-v1',
      languageRoute: 'direct-symbolic-task-adapter',
      values: [],
      usedKbVersions: [],
      selectedKbVersions,
      consultedKbVersions: [],
      unresolvedSubgoals: [{ operation: task?.operation, gap: 'no-registered-method' }],
      model: coreModelMetadata(model),
    });
  }
  const result = method.execute(task);
  const status = normalizeRuntimeStatus(result.status);
  const consultedKbVersions = uniqueKbVersions(method.usedKbVersions?.(task) ?? []);
  const completed = ['DEFEASIBLE', 'SOLVED'].includes(status);
  return assertRuntimeResultContract({
    ...result,
    status,
    protocol: 'eslm-runtime-result-v1',
    languageRoute: method.route,
    taskFrame: taskFrame(task),
    plan: { methodId: method.descriptor.methodId },
    usedKbVersions: completed ? consultedKbVersions : [],
    selectedKbVersions,
    consultedKbVersions,
    unresolvedSubgoals: completed ? [] : [{
      operation: task.operation,
      diagnostic: result.diagnostic ?? `Method returned ${status}.`,
    }],
    model: coreModelMetadata(model),
  });
}
