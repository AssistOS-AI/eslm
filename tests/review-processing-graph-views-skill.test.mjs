import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { PROJECT_ROOT } from '../src/paths.mjs';

const SKILL_ROOT = join(PROJECT_ROOT,
  'training/.agents/skills/review-processing-graph-views');

test('processing-graph view review skill is self-contained and requires semantic and browser evidence', async () => {
  const [skill, contract, repositoryAudit, browserAudit, agentMetadata] = await Promise.all([
    readFile(join(SKILL_ROOT, 'SKILL.md'), 'utf8'),
    readFile(join(SKILL_ROOT, 'references/review-contract.md'), 'utf8'),
    readFile(join(SKILL_ROOT, 'scripts/audit-repository.mjs'), 'utf8'),
    readFile(join(SKILL_ROOT, 'scripts/audit-browser-views.mjs'), 'utf8'),
    readFile(join(SKILL_ROOT, 'agents/openai.yaml'), 'utf8'),
  ]);
  assert.match(skill, /^name: review-processing-graph-views$/mu);
  assert.match(skill, /inspect every owner/iu);
  assert.match(skill, /every reachable explorer focus/iu);
  assert.match(skill, /equal horizontal distribution/iu);
  assert.match(skill, /independent boundary modules.*stack vertically/iu);
  assert.match(skill, /top\/bottom\/top for exactly three/iu);
  assert.match(skill, /Human actors, software boundaries/iu);
  assert.match(contract, /Executable owners/u);
  assert.match(contract, /center intervals and visible edge-to-edge gaps/u);
  assert.match(contract, /Every rendered component boundary must expose both sides/u);
  assert.match(contract, /minimum visible arrow segment/u);
  assert.match(contract, /reciprocal-path audit/u);
  assert.match(contract, /automatic top\/bottom\/middle lanes/iu);
  assert.match(contract, /four visibly distinct encodings/iu);
  assert.match(repositoryAudit, /--check/u);
  assert.match(browserAudit, /equal-visible-gaps/u);
  assert.match(browserAudit, /minimum-visible-gap/u);
  assert.match(browserAudit, /complete-component-boundary/u);
  assert.match(browserAudit, /external-interaction-kinds/u);
  assert.match(browserAudit, /automatic-vertical-distribution/u);
  assert.match(browserAudit, /lineBoxOverlaps/u);
  assert.match(browserAudit, /monotonic-bezier-controls/u);
  assert.match(browserAudit, /legend-only-view-context/u);
  assert.match(browserAudit, /duplicate-navigation-controls/u);
  assert.match(browserAudit, /large-information-dialog/u);
  assert.match(browserAudit, /opposed-aggregate-color/u);
  assert.doesNotMatch(skill + contract + repositoryAudit + browserAudit,
    /from ['"](?:\.\.\/)+src\//u);
  assert.match(agentMetadata, /\$review-processing-graph-views/u);
});

test('processing-graph view repository auditor passes its self-contained static checks', () => {
  const result = spawnSync(process.execPath, [
    join(SKILL_ROOT, 'scripts/audit-repository.mjs'),
    '--root', PROJECT_ROOT,
    '--skip-commands',
  ], { cwd: PROJECT_ROOT, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'machine-checks-passed-semantic-review-required');
  assert.equal(report.inventory.circuits, 22);
  assert.equal(report.inventory.nodes, 52);
  assert.equal(report.inventory.edges, 79);
  assert.equal(report.inventory.strategyFamilies, 6);
  assert.equal(report.inventory.strategies, 79);
  assert.equal(report.semanticReviewRequired, true);
});
