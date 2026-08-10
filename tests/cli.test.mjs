import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PROJECT_ROOT } from '../src/paths.mjs';

const run = promisify(execFile);

test('CLI resolves its model when launched from training directory', async () => {
  const input = 'Mice are afraid of wolves. Gertrude is a mouse. What is Gertrude afraid of?';
  const { stdout } = await run(process.execPath, ['../src/cli.mjs', 'ask', input], {
    cwd: `${PROJECT_ROOT}/training`,
  });
  const result = JSON.parse(stdout);
  assert.deepEqual(result.values, ['wolf']);
});

test('CLI emits JSONL for plain-text batch input', async () => {
  const { stdout } = await run(process.execPath, ['src/cli.mjs', 'run', '--input', 'tests/fixtures/questions.txt'], {
    cwd: PROJECT_ROOT,
  });
  assert.equal(stdout.trim().split('\n').length, 4);
});

test('CLI exposes corpus state without claiming planned sources are trained', async () => {
  const { stdout } = await run(process.execPath, [
    'src/cli.mjs', 'corpus', 'status', '--corpus', 'oewn-2025',
  ], { cwd: PROJECT_ROOT });
  const [status] = JSON.parse(stdout);
  assert.equal(status.id, 'oewn-2025');
  assert.equal(status.sourceCached, false);
  assert.equal(status.probeComplete, true);
  assert.equal(status.prepared, false);
  assert.equal(status.generatedModel, false);
});

test('CLI rejects an unsupported corpus probe before invoking an adapter', async () => {
  await assert.rejects(run(process.execPath, [
    'src/cli.mjs', 'corpus', 'probe', '--corpus', 'wikidata-thematic', '--archive', 'unused.zip',
  ], { cwd: PROJECT_ROOT }), /currently supports only/u);
});

test('CLI profile option includes stage measurements', async () => {
  const input = 'Mice are afraid of wolves. Gertrude is a mouse. What is Gertrude afraid of?';
  const { stdout } = await run(process.execPath, ['src/cli.mjs', 'ask', input, '--profile'], {
    cwd: PROJECT_ROOT,
  });
  const result = JSON.parse(stdout);
  assert.equal(result.profile.query.format, 'eslm-profile-v1');
  assert.equal(result.profile.query.stages.some((stage) => stage.name === 'retrieval.answer'), true);
});

test('CLI answers disclose active knowledge modules and comparability', async () => {
  const { stdout } = await run(process.execPath, [
    'src/cli.mjs', 'ask', 'Can Penguin swim?', '--kb', 'animals',
  ], { cwd: PROJECT_ROOT });
  const result = JSON.parse(stdout);
  assert.deepEqual(result.model.knowledgeBases, ['animals']);
  assert.equal(result.model.benchmarkComparable, false);
});
