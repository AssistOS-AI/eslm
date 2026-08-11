import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { prepareTraining } from '../src/training/packet.mjs';
import { codexInvocation, prepareAgentWorkspace, runCodexTraining } from '../src/training/agent-runner.mjs';
import { PROJECT_ROOT } from '../src/paths.mjs';

test('training preparation isolates non-train records from agent-visible packets', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-training-'));
  const input = join(directory, 'records.jsonl');
  const records = [
    { type: 'source', id: 'source:test', uri: 'packet:doc:1', mediaType: 'text/plain', language: 'en', license: 'MIT', sha256: '5bb03bbbf8b1a49f8cfde72e8da5503053e5aef31c42d024162dad368a9e6c42' },
    { type: 'document', id: 'doc:1', text: 'A dog is an animal.', sourceId: 'source:test' },
  ];
  await writeFile(input, `${records.map((record) => JSON.stringify(record)).join('\n')}\n`);
  const hiddenPath = join(directory, 'hidden.json');
  await prepareTraining({ input, output: hiddenPath, split: 'test' });
  const hidden = JSON.parse(await readFile(hiddenPath, 'utf8'));
  assert.equal(hidden.leakagePolicy, 'agent-hidden');
  assert.equal(hidden.records, undefined);
});

test('Codex training uses an isolated copied skill and supports a no-agent dry run', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-agent-'));
  const input = join(directory, 'records.jsonl');
  const packetPath = join(directory, 'packet.json');
  const records = [
    { type: 'source', id: 'source:test', uri: 'packet:doc:1', mediaType: 'text/plain', language: 'en', license: 'MIT', sha256: '5bb03bbbf8b1a49f8cfde72e8da5503053e5aef31c42d024162dad368a9e6c42' },
    { type: 'document', id: 'doc:1', text: 'A dog is an animal.', sourceId: 'source:test' },
  ];
  await writeFile(input, `${records.map((record) => JSON.stringify(record)).join('\n')}\n`);
  await prepareTraining({ input, output: packetPath, split: 'train' });
  const prepared = await prepareAgentWorkspace({
    projectRoot: PROJECT_ROOT, packetPath, outputDirectory: join(directory, 'workspace'),
    skill: 'document-to-kb-builder',
  });
  assert.match(await readFile(join(prepared.workspace, 'skill/SKILL.md'), 'utf8'), /Document-to-KB Builder/u);
  assert.equal(prepared.assignment.baselineAnalysisRecords, 1);
  assert.match(await readFile(join(prepared.workspace, 'BASELINE_ANALYSIS.jsonl'), 'utf8'), /learnedAssertions/u);
  const invocation = codexInvocation(prepared.workspace);
  assert.deepEqual(invocation.args.slice(0, 4), ['exec', '--ephemeral', '--sandbox', 'workspace-write']);
  assert.equal((await runCodexTraining({ workspace: prepared.workspace, dryRun: true })).dryRun, true);
});
