import test from 'node:test';
import assert from 'node:assert/strict';
import { execute, operation, taskContract, then } from '../src/task-calculus.mjs';

test('executes a typed semantic circuit and records its trace', async () => {
  const contract = taskContract({ goal: 'answer', deliverable: 'response' });
  assert.equal(contract.abstentionPolicy, 'explicit');
  const plan = then(
    operation('OBSERVE', () => ({ evidence: 2 })),
    operation('DERIVE', ({ evidence }) => ({ answer: evidence + 1 })),
    operation('VERIFY', ({ answer }) => ({ answer, verified: answer === 3 })),
  );
  const result = await execute(plan);
  assert.deepEqual(result.value, { answer: 3, verified: true });
  assert.deepEqual(result.trace.map(({ operator }) => operator), ['OBSERVE', 'DERIVE', 'VERIFY']);
});
