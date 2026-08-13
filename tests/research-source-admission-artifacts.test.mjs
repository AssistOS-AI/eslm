import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { PROJECT_ROOT } from '../src/paths.mjs';

const execute = promisify(execFile);
const skillRoot = join(PROJECT_ROOT, 'training/.agents/skills/rl-dataset-graph-discovery');
const sourceRoot = join(PROJECT_ROOT, 'training/research-sources');
const logPath = join(PROJECT_ROOT, 'processing_graph_discoveries.md');

async function run(script, ...args) {
  const { stdout } = await execute(process.execPath, [join(skillRoot, 'scripts', script), ...args], {
    cwd: PROJECT_ROOT,
  });
  return JSON.parse(stdout);
}

test('committed small-source discovery bundle preserves its exact visible projections', async () => {
  const manifests = [
    join(sourceRoot, 'helpsteer2-990b2711/source-manifest.json'),
    join(sourceRoot, 'gsm8k-3101c7d5/source-manifest.json'),
  ];
  for (const manifest of manifests) {
    assert.equal((await run('validate-source-manifest.mjs', manifest)).valid, true);
  }
  const result = await run(
    'validate-discovery-bundle.mjs',
    manifests.join(','),
    join(sourceRoot, 'helpsteer2-gsm8k-pilot/discovery-plan.json'),
    join(PROJECT_ROOT, 'docs/results/latest-processing-graph-pilot.json'),
    join(sourceRoot, 'helpsteer2-gsm8k-pilot/discovery-cycle.json'),
    logPath,
  );
  assert.deepEqual({
    sources: result.sourceRevisions.length,
    rowsAvailable: result.trainingRowsAvailable,
    rowsVisited: result.trainingRowsVisited,
    protectedRowsVisited: result.protectedRowsVisited,
    readiness: result.readinessProvided,
  }, {
    sources: 2,
    rowsAvailable: 17_634,
    rowsVisited: 17_634,
    protectedRowsVisited: 0,
    readiness: false,
  });
});

test('committed OASST1 bundle passes the signed bounded-memory scale gate', async () => {
  const manifest = join(sourceRoot, 'oasst1-fdf72ae0/source-manifest.json');
  const cycle = join(sourceRoot, 'oasst1-fdf72ae0/discovery-cycle.json');
  const readiness = join(sourceRoot, 'oasst1-fdf72ae0/large-source-readiness.json');
  assert.equal((await run('validate-source-manifest.mjs', manifest)).valid, true);
  const admission = await run('audit-large-source-readiness.mjs', readiness);
  assert.deepEqual(admission, {
    valid: true,
    eligibleForScale: true,
    failures: [],
    stage: 'large-corpus',
  });
  const bundle = await run(
    'validate-discovery-bundle.mjs',
    manifest,
    join(sourceRoot, 'oasst1-fdf72ae0/discovery-plan.json'),
    join(PROJECT_ROOT, 'docs/results/latest-oasst1-processing-graph-research.json'),
    cycle,
    logPath,
    readiness,
  );
  assert.deepEqual({
    rowsAvailable: bundle.trainingRowsAvailable,
    rowsVisited: bundle.trainingRowsVisited,
    protectedRowsVisited: bundle.protectedRowsVisited,
    readiness: bundle.readinessProvided,
  }, {
    rowsAvailable: 2_220,
    rowsVisited: 2_220,
    protectedRowsVisited: 0,
    readiness: true,
  });
});

test('committed combined discovery bundle preserves all admitted rows under bounded analysis',
  async () => {
    const manifests = [
      join(sourceRoot, 'helpsteer2-990b2711/source-manifest.json'),
      join(sourceRoot, 'gsm8k-3101c7d5/source-manifest.json'),
      join(sourceRoot, 'oasst1-fdf72ae0/source-manifest.json'),
    ];
    const bundle = await run(
      'validate-discovery-bundle.mjs',
      manifests.join(','),
      join(sourceRoot, 'helpsteer2-gsm8k-oasst1-scale/discovery-plan.json'),
      join(PROJECT_ROOT, 'docs/results/latest-processing-graph-research.json'),
      join(sourceRoot, 'helpsteer2-gsm8k-oasst1-scale/discovery-cycle.json'),
      logPath,
    );
    assert.equal(bundle.trainingRowsAvailable, 19_854);
    assert.equal(bundle.trainingRowsVisited, 19_854);
    assert.equal(bundle.protectedRowsVisited, 0);
    assert.equal(bundle.readinessProvided, false);
  });

test('committed discovery ledger has four contiguous reviewed cycles', async () => {
  const result = await run('validate-discovery-log.mjs', logPath);
  assert.equal(result.valid, true);
  assert.equal(result.cycles, 4);
});
