import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  inventoryLogicBenchSource, logicBenchDependencyDigests,
} from '../src/benchmark-adapters/logicbench.mjs';
import { PROJECT_ROOT } from '../src/paths.mjs';
import { CORE_METHOD_DESCRIPTORS } from '../src/reasoning/capability-registry.mjs';

const RECEIPT_ROOT = join(PROJECT_ROOT, 'training/benchmark-sources/logicbench');
const CACHE_ROOT = join(PROJECT_ROOT, 'training/.cache/benchmarks/logicbench');

async function receipt(name) {
  return JSON.parse(await readFile(join(RECEIPT_ROOT, name), 'utf8'));
}

test('LogicBench fresh aggregate is bound to the frozen source and behavioral dependencies', async () => {
  const [freeze, fresh, inventory, dependencies] = await Promise.all([
    receipt('candidate-manifest.json'), receipt('fresh-result.json'), inventoryLogicBenchSource(CACHE_ROOT),
    logicBenchDependencyDigests(PROJECT_ROOT),
  ]);
  assert.equal(freeze.sourceSetSha256, inventory.sourceSetSha256);
  assert.deepEqual(freeze.dependencies, dependencies);
  assert.equal(fresh.sourceSetSha256, freeze.sourceSetSha256);
  assert.equal(fresh.dependencySetSha256,
    createHash('sha256').update(JSON.stringify(dependencies)).digest('hex'));
  assert.equal(fresh.tested, 2_020);
  assert.equal(fresh.modes.BQA.tested, inventory.evaluation.BQA.cases);
  assert.equal(fresh.modes.MCQA.tested, inventory.evaluation.MCQA.cases);
  assert.equal(fresh.codingAgentInvocations, 0);
});

test('LogicBench fresh receipt contains aggregates but no protected row outcomes', async () => {
  const fresh = await receipt('fresh-result.json');
  assert.equal(fresh.results, undefined);
  assert.equal(fresh.cases, undefined);
  assert.equal(fresh.questions, undefined);
  assert.equal(fresh.answers, undefined);
  assert.equal(fresh.choices, undefined);
  assert.equal(Object.values(fresh.modes.BQA.families).reduce((sum, item) => sum + item.tested, 0), 1_520);
  assert.equal(Object.values(fresh.modes.MCQA.families).reduce((sum, item) => sum + item.tested, 0), 500);
});

test('generic finite methods publish their semantic capabilities and proof contracts', () => {
  assert.equal(CORE_METHOD_DESCRIPTORS.finiteEntailment.methodId, 'method:core:finite-entailment');
  assert.match(CORE_METHOD_DESCRIPTORS.finiteEntailment.proofKind, /countermodel/u);
  assert.equal(CORE_METHOD_DESCRIPTORS.preferredEntailment.methodId, 'method:core:preferred-entailment');
  assert.match(CORE_METHOD_DESCRIPTORS.preferredEntailment.uncertaintySemantics, /skeptical/u);
});
