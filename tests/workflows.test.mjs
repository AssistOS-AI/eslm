import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exportBenchmark, importComparison, scoreExternalPredictions } from '../src/benchmarks.mjs';
import { prepareTraining } from '../src/training.mjs';
import { PROJECT_ROOT } from '../src/paths.mjs';

test('hidden preparation records hashes but withholds corpus records', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-hidden-'));
  const output = join(directory, 'packet.json');
  await prepareTraining({ input: join(PROJECT_ROOT, 'tests/fixtures/training.jsonl'), output, split: 'test' });
  const packet = JSON.parse(await readFile(output, 'utf8'));
  assert.equal(packet.leakagePolicy, 'agent-hidden');
  assert.equal(packet.records, undefined);
  assert.equal(packet.source.recordCount, 2);
});

test('profiled training preparation persists stage and resource evidence', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-profiled-training-'));
  const output = join(directory, 'packet.json');
  const report = await prepareTraining({
    input: join(PROJECT_ROOT, 'tests/fixtures/training.jsonl'), output, split: 'train', profile: true,
  });
  assert.equal(report.profile.format, 'eslm-profile-v1');
  assert.equal(report.profile.kind, 'training-preparation');
  assert.equal(report.profile.stages.some((stage) => stage.name === 'input.read-jsonl'), true);
  assert.equal(report.profile.stages.some((stage) => stage.name === 'output.write-packet'), true);
  const persisted = JSON.parse(await readFile(`${output}.profile.json`, 'utf8'));
  assert.equal(persisted.metrics.records, 2);
});

test('comparison imports label foreign protocols as reference-only', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-comparison-'));
  const input = join(directory, 'input.json');
  const output = join(directory, 'output.json');
  await writeFile(input, JSON.stringify({
    model: 'published-model', protocol: 'official-foreign-v2', datasetSha256: 'abc', metrics: { accuracy: 0.8 }, evidenceRegime: 'E3',
  }));
  const manifest = await importComparison(input, output);
  assert.equal(manifest.comparability, 'reference-only');
});

test('external comparison export withholds labels and scores returned predictions', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-external-'));
  const suite = join(PROJECT_ROOT, 'tests/fixtures/benchmark.jsonl');
  const exportedPath = join(directory, 'export.json');
  const predictionsPath = join(directory, 'predictions.jsonl');
  const reportPath = join(directory, 'report.json');
  const exported = await exportBenchmark(suite, exportedPath);
  assert.equal(JSON.stringify(exported).includes('observatory'), false);
  const goodById = { 'preference-order': 'Where is Mira?', 'preference-auxiliary': 'Who owns Lumen?' };
  const predictions = exported.cases.map((item) => {
    if (item.kind === 'preference') return JSON.stringify({ id: item.id, choice: item.options.indexOf(goodById[item.id]) });
    const valuesById = {
      'qa-direct': ['garden'],
      'qa-rule': ['observatory'],
      'qa-relation': ['observatory'],
      'qa-deduction-depth-3': [true],
    };
    const values = valuesById[item.id];
    return JSON.stringify({ id: item.id, values });
  });
  await writeFile(predictionsPath, `${predictions.join('\n')}\n`);
  const report = await scoreExternalPredictions(suite, predictionsPath, 'fixture-model', reportPath);
  assert.equal(report.accuracy, 1);
});
