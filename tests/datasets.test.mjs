import test from 'node:test';
import assert from 'node:assert/strict';
import { BENCHMARK_CATALOG } from '../src/benchmarks.mjs';
import { DATASET_CATALOG, datasetStatus, parseBabi } from '../src/datasets.mjs';

test('dataset and benchmark catalogs preserve multiple independent task families', () => {
  assert.deepEqual(Object.keys(DATASET_CATALOG), [
    'babi-2-en-10k-v1.2',
    'babi-3-en-10k-v1.2',
    'babi-15-en-10k-v1.2',
    'babi-16-en-10k-v1.2',
  ]);
  assert.equal(Object.keys(BENCHMARK_CATALOG).length, 23);
});

test('bAbI adapter preserves context, support lines, split, and expected semantic value', () => {
  const input = [
    '1 Mary moved to the hallway.',
    '2 John went to the kitchen.',
    '3 Where is Mary?\thallway\t1',
  ].join('\n');
  assert.deepEqual(parseBabi(input, 'train', 'fixture'), [{
    id: 'fixture:train:1',
    kind: 'qa',
    context: 'Mary moved to the hallway. John went to the kitchen.',
    text: 'Where is Mary?',
    answer: 'hallway',
    values: ['hallway'],
    supportIds: [1],
    support: ['Mary moved to the hallway.'],
  }]);
});

test('prepared datasets remain in the ignored cache rather than a persistent training dataset tree', async () => {
  const status = await datasetStatus('babi-15-en-10k-v1.2');
  assert.equal(status.storageRoot, 'training/.cache/datasets/prepared/babi-15-en-10k-v1.2');
  assert.equal(status.storageRoot.startsWith('training/datasets/'), false);
});
