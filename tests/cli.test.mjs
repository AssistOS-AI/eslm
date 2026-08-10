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

test('CLI exposes the compiled WordNet corpus state accurately', async () => {
  const { stdout } = await run(process.execPath, [
    'src/cli.mjs', 'corpus', 'status', '--corpus', 'oewn-2025',
  ], { cwd: PROJECT_ROOT });
  const [status] = JSON.parse(stdout);
  assert.equal(status.id, 'oewn-2025');
  assert.equal(status.sourceCached, true);
  assert.equal(status.probeComplete, true);
  assert.equal(status.prepared, false);
  assert.equal(status.generatedModel, true);
  assert.equal(status.buildStatus, 'complete');
  assert.equal(status.architectureGate, 'experimental-build-query-directed-gate-open');
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

test('CLI can query compiled public KBs explicitly', async () => {
  const { stdout: wordnetOutput } = await run(process.execPath, [
    'src/cli.mjs', 'ask', 'Is a dog an animal?', '--kb', 'oewn-2025',
  ], { cwd: PROJECT_ROOT });
  const wordnet = JSON.parse(wordnetOutput);
  assert.equal(wordnet.status, 'ANSWERED');
  assert.match(wordnet.answer, /WordNet path/u);

  const { stdout: atomicOutput } = await run(process.execPath, [
    'src/cli.mjs', 'ask', 'Why might apologize?', '--kb', 'atomic-2020',
  ], { cwd: PROJECT_ROOT });
  const atomic = JSON.parse(atomicOutput);
  assert.equal(atomic.status, 'ANSWERED');
  assert.match(atomic.answer, /possibilit/u);
});
