import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PROJECT_ROOT } from '../src/paths.mjs';
import { main } from '../src/cli.mjs';

async function captureMain(arguments_) {
  return (await captureMainStreams(arguments_)).stdout;
}

async function captureMainStreams(arguments_) {
  let output = '';
  let errorOutput = '';
  await main(arguments_, {
    write: (chunk) => { output += String(chunk); },
    writeError: (chunk) => { errorOutput += String(chunk); },
  });
  return { stdout: output, stderr: errorOutput };
}

function parseCapturedJson(output) {
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');
  return JSON.parse(output.slice(start, end + 1));
}

async function fakeLanguageAgentExecutable(directory) {
  const executable = join(directory, 'fake-language-agent.mjs');
  const candidate = {
    protocol: 'eslm-language-agent-normalization-v2',
    operation: 'simplification',
    sourceLanguage: 'en',
    normalizedEnglish: 'Is Gertrude in the garden?',
    alignments: [
      { kind: 'directed-relation', source: 'In', target: 'in' },
      { kind: 'named-entity', source: 'Gertrude', target: 'Gertrude' },
    ],
  };
  await writeFile(executable, `#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
const args = process.argv.slice(2);
const output = args[args.indexOf('--output-last-message') + 1];
writeFileSync(output, JSON.stringify(${JSON.stringify(candidate)}));
`, 'utf8');
  await chmod(executable, 0o755);
  return executable;
}

test('CLI one-shot output exposes task, plan, KB, result, and exact work contracts', async () => {
  const stdout = await captureMain([
    'ask', 'Can Penguin swim?', '--kb', 'quick', '--work-profile', 'quick',
    '--horn-max-rounds', '6', '--grounding-max-lookups', '31',
  ]);
  const result = parseCapturedJson(stdout);
  assert.equal(result.status, 'SOLVED');
  assert.equal(result.protocol, 'eslm-runtime-result-v1');
  assert.equal(result.taskFrame.goals.length, 1);
  assert.equal(result.plan.methodId, 'method:core:safe-horn-deduction');
  assert.deepEqual(result.model.knowledgeBases, ['quick']);
  assert.equal(result.workPolicy.requested.profile, 'quick');
  assert.equal(result.workPolicy.effective.limits.maximumHornRounds, 6);
  assert.equal(result.workPolicy.effective.limits.maximumGroundingLookups, 31);
});

test('CLI help presents bounded work controls and explicit Language Agent opt in', async () => {
  const output = await captureMain(['--help']);
  assert.match(output, /--work-profile balanced/u);
  assert.match(output, /--grounding-max-bytes N/u);
  assert.match(output, /--horn-max-joins N/u);
  assert.match(output, /--external-language-agent\s+opt in to the external/u);
  assert.match(output, /--no-external-language-agent\s+explicitly retain the default entirely local/u);
});

test('CLI offline profile rejects likely non-English input before parsing or KB search', async () => {
  const output = await captureMain([
    'ask', 'Жарум кивес Нолта?', '--kb', 'quick', '--no-external-language-agent',
  ]);
  const result = parseCapturedJson(output);
  assert.equal(result.status, 'UNPARSED');
  assert.equal(result.languageRoute, 'english-language-gate-rejected');
  assert.equal(result.languageAssessment.classification, 'likely-non-english');
  assert.deepEqual(result.consultedKbVersions, []);
  assert.deepEqual(result.usedKbVersions, []);
  assert.equal(result.grounding, undefined);
  assert.deepEqual(result.unresolvedSubgoals, [{
    operation: 'translate-input-to-english', gap: 'likely-non-english',
  }]);
});

test('CLI ask reports one real Language Agent invocation on stderr and keeps stdout as JSON', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-cli-language-activity-'));
  const executable = await fakeLanguageAgentExecutable(directory);
  const streams = await captureMainStreams([
    'ask', 'In the garden, is Gertrude?', '--kb', 'quick',
    '--external-language-agent',
    '--language-agent-command', executable, '--no-normalization-cache', '--color', 'never',
  ]);

  assert.equal(
    streams.stderr,
    'Thinking: bounded symbolic processing started — balanced; up to 24 local interpretations, 12 reparses, 0 loaded KB source(s), and 96 context lookups.\n'
      + 'Thinking: Language Agent English simplification proposal 1/3 — external codex call, timeout 120s.\n',
  );
  assert.doesNotMatch(streams.stdout, /Thinking: interpreting/u);
  const result = JSON.parse(streams.stdout);
  assert.equal(result.languageRoute, 'language-agent-normalized');
  assert.equal(result.normalization.externalInvocations, 1);
});

test('CLI run reports bounded symbolic starts and only actual Language Agent calls on stderr', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-cli-batch-language-activity-'));
  const executable = await fakeLanguageAgentExecutable(directory);
  const input = join(directory, 'questions.jsonl');
  await writeFile(input, [
    JSON.stringify({ id: 'direct', text: 'Can Penguin swim?' }),
    JSON.stringify({ id: 'assisted', text: 'In the garden, is Gertrude?' }),
  ].join('\n') + '\n', 'utf8');
  const streams = await captureMainStreams([
    'run', '--input', input, '--kb', 'quick', '--language-agent-command', executable,
    '--external-language-agent',
    '--no-normalization-cache', '--color', 'never',
  ]);

  assert.equal(
    streams.stderr,
    'Thinking: bounded symbolic processing started — balanced; up to 24 local interpretations, 12 reparses, 0 loaded KB source(s), and 96 context lookups.\n'
      + 'Thinking: bounded symbolic processing started — balanced; up to 24 local interpretations, 12 reparses, 0 loaded KB source(s), and 96 context lookups.\n'
      + 'Thinking: Language Agent English simplification proposal 1/3 — external codex call, timeout 120s.\n',
  );
  assert.doesNotMatch(streams.stdout, /Thinking: interpreting/u);
  const records = streams.stdout.trim().split('\n').map((line) => JSON.parse(line));
  assert.deepEqual(records.map((record) => record.id), ['direct', 'assisted']);
  assert.equal(records[0].normalization.attempted, false);
  assert.equal(records[1].normalization.externalInvocations, 1);
});

test('CLI generated benchmark executes a bounded offline diagnostic with replay identity', async () => {
  const output = await captureMain([
    'benchmark', 'generated', '--cases', '32', '--seed', 'cli-generated-contract',
    '--kb', 'quick', '--no-external-language-agent',
  ]);
  const report = parseCapturedJson(output);
  assert.equal(report.format, 'eslm-generated-heuristic-benchmark-report-v1');
  assert.equal(report.total, 32);
  assert.equal(report.passed + report.failed, 32);
  assert.equal(report.execution.grounding, false);
  assert.equal(report.execution.externalLanguageAgent, false);
  assert.match(report.execution.replayCommand, /--cases 32 --seed 'cli-generated-contract'/u);
  assert.deepEqual(report.execution.runtimeIdentity.knowledgeBases, ['quick']);
});

test('CLI generated seed audit keeps independent runs and aggregate counts separate', async () => {
  const output = await captureMain([
    'benchmark', 'generated-seed-audit', '--cases', '8', '--seeds', 'cli-audit-alpha,cli-audit-beta',
    '--kb', 'quick', '--no-external-language-agent',
  ]);
  const audit = parseCapturedJson(output);
  assert.equal(audit.format, 'eslm-generated-heuristic-multi-seed-audit-v1');
  assert.deepEqual(audit.plan.seeds, ['cli-audit-alpha', 'cli-audit-beta']);
  assert.equal(audit.plan.totalPlanned, 16);
  assert.equal(audit.runs.length, 2);
  assert.equal(audit.aggregates.total, 16);
  assert.match(audit.plan.replayCommand, /generated-seed-audit --cases 8/u);
  assert.ok(audit.runs.every((run) => run.execution.externalLanguageAgent === false));
});

test('CLI research graph status is explicitly read-only', async () => {
  await assert.rejects(captureMain(['research', 'graph', 'status', '--publish']),
    /status is read-only and rejects --publish/u);
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
  assert.equal(result.manifest.canonicalSource.recordCount, 24);
});
