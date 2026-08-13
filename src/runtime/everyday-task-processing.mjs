import { frameEverydayTask } from '../language/everyday-task-framing.mjs';
import { executeEverydayDeterministicOperation } from '../reasoning/everyday-deterministic-operations.mjs';
import { executeEverydaySuppliedTextOperation } from '../reasoning/everyday-supplied-text-operations.mjs';
import { executeEverydayKnowledgeInspection } from '../reasoning/everyday-knowledge-inspection.mjs';
import { assertRuntimeTextResultContract } from './result-contract.mjs';

function cleanBase(direct) {
  const {
    approximation: _approximation, grounding: _grounding, requestPlanning: _requestPlanning,
    synthesis: _synthesis, normalization: _normalization, ...base
  } = direct;
  return base;
}

export function processEverydayTask({ text, direct, model }) {
  if (direct.status === 'SOLVED' || direct.status === 'DEFEASIBLE') return undefined;
  const taskFrame = frameEverydayTask(text);
  if (!taskFrame) return undefined;
  const execution = executeEverydayDeterministicOperation(taskFrame)
    ?? executeEverydaySuppliedTextOperation(taskFrame)
    ?? executeEverydayKnowledgeInspection(taskFrame, model);
  if (!execution) return undefined;
  const solved = execution.status === 'SOLVED';
  return assertRuntimeTextResultContract({
    ...cleanBase(direct),
    status: execution.status,
    answer: execution.answer,
    languageRoute: 'everyday-task-executed',
    values: execution.values,
    provenance: execution.provenance ?? (solved
      ? [{ method: execution.method ?? 'verified-everyday-deterministic-operation' }] : []),
    usedKbVersions: execution.usedKbVersions ?? [],
    consultedKbVersions: execution.consultedKbVersions ?? [],
    taskFrame: {
      taskId: 'task:runtime:everyday-request',
      instructions: [`operation:${taskFrame.operation}`],
      assertions: [], constraints: [], goals: [taskFrame],
      contextStack: ['context:runtime:baseline'], outputContract: taskFrame.output,
      languageRoute: 'everyday-task-executed',
    },
    plan: {
      methodId: `method:everyday:${execution.method ?? 'deterministic-operation'}`,
      requiredCapability: taskFrame.operation,
      steps: [{ operation: taskFrame.operation }],
    },
    reasoning: {
      method: execution.method ?? 'verified-everyday-deterministic-operation',
      operation: taskFrame.operation,
      witness: execution.witness,
      verification: solved ? (execution.verification ?? 'replayable') : 'rejected',
      ...(execution.gap ? { gap: execution.gap } : {}),
    },
    unresolvedSubgoals: solved ? [] : [{ operation: taskFrame.operation, gap: execution.gap }],
    episode: { ...direct.episode, transaction: 'everyday-request-query-local' },
  });
}
