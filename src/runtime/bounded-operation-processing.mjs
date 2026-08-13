import { frameBoundedOperation } from '../language/bounded-operation-framing.mjs';
import { executeDeterministicValueOperation } from '../reasoning/deterministic-value-operations.mjs';
import { executeSuppliedTextOperation } from '../reasoning/supplied-text-operations.mjs';
import { executeGroundedKnowledgeInspection } from '../reasoning/grounded-knowledge-inspection.mjs';
import { assertRuntimeTextResultContract } from './result-contract.mjs';

function cleanBase(direct) {
  const {
    approximation: _approximation, grounding: _grounding, requestPlanning: _requestPlanning,
    synthesis: _synthesis, normalization: _normalization, ...base
  } = direct;
  return base;
}

export function processBoundedOperation({ text, direct, model }) {
  if (direct.status === 'SOLVED' || direct.status === 'DEFEASIBLE') return undefined;
  const taskFrame = frameBoundedOperation(text);
  if (!taskFrame) return undefined;
  const execution = executeDeterministicValueOperation(taskFrame)
    ?? executeSuppliedTextOperation(taskFrame)
    ?? executeGroundedKnowledgeInspection(taskFrame, model);
  if (!execution) return undefined;
  const solved = execution.status === 'SOLVED';
  return assertRuntimeTextResultContract({
    ...cleanBase(direct),
    status: execution.status,
    answer: execution.answer,
    languageRoute: 'bounded-operation-executed',
    values: execution.values,
    provenance: execution.provenance ?? (solved
      ? [{ method: execution.method ?? 'verified-bounded-operation' }] : []),
    usedKbVersions: execution.usedKbVersions ?? [],
    consultedKbVersions: execution.consultedKbVersions ?? [],
    taskFrame: {
      taskId: 'task:runtime:bounded-operation-request',
      instructions: [`operation:${taskFrame.operation}`],
      assertions: [], constraints: [], goals: [taskFrame],
      contextStack: ['context:runtime:baseline'], outputContract: taskFrame.output,
      languageRoute: 'bounded-operation-executed',
    },
    plan: {
      methodId: `method:bounded-operation:${execution.method ?? 'deterministic-operation'}`,
      requiredCapability: taskFrame.operation,
      steps: [{ operation: taskFrame.operation }],
    },
    reasoning: {
      method: execution.method ?? 'verified-bounded-operation',
      operation: taskFrame.operation,
      witness: execution.witness,
      verification: solved ? (execution.verification ?? 'replayable') : 'rejected',
      ...(execution.gap ? { gap: execution.gap } : {}),
    },
    unresolvedSubgoals: solved ? [] : [{ operation: taskFrame.operation, gap: execution.gap }],
    episode: { ...direct.episode, transaction: 'bounded-operation-query-local' },
  });
}
