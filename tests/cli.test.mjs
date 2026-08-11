import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PROJECT_ROOT } from '../src/paths.mjs';
import { main } from '../src/cli.mjs';

async function captureMain(arguments_) {
  let output = '';
  await main(arguments_, { write: (chunk) => { output += String(chunk); } });
  return output;
}

function parseCapturedJson(output) {
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');
  return JSON.parse(output.slice(start, end + 1));
}

test('CLI one-shot output exposes the new task, plan, KB, and result contracts', async () => {
  const stdout = await captureMain(['ask', 'Can Penguin swim?', '--kb', 'quick']);
  const result = parseCapturedJson(stdout);
  assert.equal(result.status, 'SOLVED');
  assert.equal(result.protocol, 'eslm-runtime-result-v1');
  assert.equal(result.taskFrame.goals.length, 1);
  assert.equal(result.plan.methodId, 'method:core:safe-horn-deduction');
  assert.deepEqual(result.model.knowledgeBases, ['quick']);
});

test('CLI Codex training dry-run constructs an isolated subprocess receipt', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-cli-agent-'));
  const packet = join(directory, 'packet.json');
  const workspace = join(directory, 'workspace');
  await captureMain(['train', 'prepare', '--input', 'tests/fixtures/training.jsonl', '--output', packet]);
  const stdout = await captureMain(['train', 'run', '--packet', packet, '--output', workspace, '--skill', 'document-to-kb-builder', '--dry-run']);
  assert.equal(parseCapturedJson(stdout).receipt.dryRun, true);
});

test('CLI compiles canonical records without registering or executing them', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-cli-compile-'));
  const stdout = await captureMain([
    'kb', 'compile', '--input', 'training/KBs/quick/canonical/records.jsonl',
    '--output', directory, '--id', 'compiled-fixture', '--version', '1.0.0', '--namespace', 'quick',
  ]);
  const result = parseCapturedJson(stdout);
  assert.equal(result.manifest.kbId, 'compiled-fixture');
  assert.equal(result.manifest.canonicalSource.recordCount, 14);
});
