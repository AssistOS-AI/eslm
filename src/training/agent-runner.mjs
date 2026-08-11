import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { EslmEngine } from '../runtime/engine.mjs';
import { createCoreModel } from '../runtime/core-model.mjs';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export const TRAINING_SKILLS = Object.freeze({
  'document-to-kb-builder': 'training/.agents/skills/document-to-kb-builder',
  'benchmark-guided-symbolic-learner': 'training/.agents/skills/benchmark-guided-symbolic-learner',
  'core-change-guardian': 'training/.agents/skills/core-change-guardian',
  'kb-compiler-quality-auditor': 'training/.agents/skills/kb-compiler-quality-auditor',
});

export function codexInvocation(workspace, options = {}) {
  return Object.freeze({
    command: options.command ?? 'codex',
    args: Object.freeze([
      'exec', '--ephemeral', '--sandbox', 'workspace-write', '--cd', resolve(workspace),
      '--skip-git-repo-check', '--output-last-message', resolve(workspace, 'agent-final.txt'), '--json', '-',
    ]),
  });
}

async function baselineAnalysis(packet) {
  const engine = new EslmEngine(await createCoreModel());
  const analyses = [];
  for (const record of packet.records ?? []) {
    const input = record.text ?? record.content;
    if (typeof input !== 'string') continue;
    const result = await engine.ask(input, {});
    analyses.push({
      id: record.id,
      recordType: record.type,
      input: result.input,
      query: result.query,
      taskFrame: result.taskFrame,
      plan: result.plan,
      status: result.status,
      learnedAssertions: result.learned ?? [],
      learnedRules: result.learnedRules ?? [],
      sessionEntities: result.context?.session?.entities ?? [],
      unsupportedStatements: result.episode?.unsupportedStatements ?? [],
      unresolvedSubgoals: result.unresolvedSubgoals ?? [],
    });
  }
  return analyses;
}

function codexEnvironment(environment = process.env) {
  const allowed = [
    'PATH', 'HOME', 'CODEX_HOME', 'LANG', 'LC_ALL', 'TERM', 'COLORTERM', 'TMPDIR',
    'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME', 'XDG_RUNTIME_DIR',
  ];
  return Object.fromEntries(allowed.filter((name) => environment[name] !== undefined).map((name) => [name, environment[name]]));
}

export async function prepareAgentWorkspace({ projectRoot, packetPath, outputDirectory, skill }) {
  const skillPath = TRAINING_SKILLS[skill];
  if (!skillPath) throw new Error(`Unknown training skill: ${skill}.`);
  const packet = await readFile(resolve(packetPath));
  const packetValue = JSON.parse(packet.toString('utf8'));
  if (packetValue.split !== 'train' || packetValue.leakagePolicy !== 'agent-visible') {
    throw new Error('Coding Agent training requires an agent-visible train packet.');
  }
  const workspace = resolve(outputDirectory);
  await mkdir(workspace, { recursive: true });
  await writeFile(join(workspace, 'PACKET.json'), packet);
  await cp(resolve(projectRoot, skillPath), join(workspace, 'skill'), { recursive: true, force: true });
  const analyses = await baselineAnalysis(packetValue);
  const analysisText = `${analyses.map((item) => JSON.stringify(item)).join('\n')}${analyses.length ? '\n' : ''}`;
  await writeFile(
    join(workspace, 'BASELINE_ANALYSIS.jsonl'),
    analysisText,
    'utf8',
  );
  const assignment = {
    format: 'eslm-agent-assignment-v1',
    skill,
    packet: 'PACKET.json',
    packetSha256: sha256(packet),
    targetNamespace: packetValue.targetNamespace,
    baselineAnalysis: 'BASELINE_ANALYSIS.jsonl',
    baselineAnalysisRecords: analyses.length,
    baselineAnalysisSha256: sha256(analysisText),
    outputDirectory: 'candidate',
    restrictions: [
      'Read SKILL.md completely before acting.',
      'Read only files inside this workspace.',
      'Write only declarative candidate data and reports under candidate/.',
      'Treat BASELINE_ANALYSIS.jsonl as diagnostic output from the trusted host runtime, not as source evidence.',
      'Do not execute corpus strings or create JavaScript knowledge payloads.',
      'Run every verification command required by the copied skill.',
    ],
  };
  await writeFile(join(workspace, 'ASSIGNMENT.json'), `${JSON.stringify(assignment, null, 2)}\n`, 'utf8');
  return { workspace, assignment };
}

export async function runCodexTraining({ workspace, dryRun = false, codexCommand, timeoutMs = 30 * 60_000 }) {
  const invocation = codexInvocation(workspace, { command: codexCommand });
  if (dryRun) return { format: 'eslm-agent-execution-receipt-v1', dryRun: true, ...invocation };
  const prompt = [
    'Open ASSIGNMENT.json and skill/SKILL.md. Follow the copied skill exactly.',
    'Use only this workspace. Produce the requested declarative candidate and validation evidence.',
    'Do not inspect paths outside this workspace and do not modify the host repository.',
  ].join(' ');
  const startedAt = new Date().toISOString();
  const child = spawn(invocation.command, invocation.args, {
    cwd: workspace,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: codexEnvironment(),
  });
  child.stdin.end(prompt);
  let stdout = '';
  let stderr = '';
  const limit = 8 * 1024 * 1024;
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { if (stdout.length < limit) stdout += chunk; });
  child.stderr.on('data', (chunk) => { if (stderr.length < limit) stderr += chunk; });
  const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMs);
  const exitCode = await new Promise((accept, reject) => {
    child.once('error', reject);
    child.once('close', accept);
  });
  clearTimeout(timer);
  const receipt = {
    format: 'eslm-agent-execution-receipt-v1',
    agent: 'codex',
    command: basename(invocation.command),
    args: invocation.args,
    startedAt,
    completedAt: new Date().toISOString(),
    exitCode,
    stdoutSha256: sha256(stdout),
    stderrSha256: sha256(stderr),
    stdoutTruncated: stdout.length >= limit,
    stderrTruncated: stderr.length >= limit,
  };
  await writeFile(join(workspace, 'agent-events.jsonl'), stdout, 'utf8');
  await writeFile(join(workspace, 'agent-stderr.txt'), stderr, 'utf8');
  await writeFile(join(workspace, 'execution-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  if (exitCode !== 0) throw new Error(`Coding Agent training failed with exit code ${exitCode}.`);
  return receipt;
}
