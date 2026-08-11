import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  evaluateFolioFormulaCase, evaluateFolioNaturalLanguageQueryCase, hasFolioSource, inventoryFolioSource,
  loadFolioDevelopmentPool, loadFolioTrainingPool, parseFolioFormula, parseFolioNaturalLanguage,
  runFolioDevelopmentBaseline,
} from '../src/benchmark-adapters/folio.mjs';
import { PROJECT_ROOT } from '../src/paths.mjs';

const CACHE_ROOT = join(PROJECT_ROOT, 'training/.cache/benchmarks/folio');

test('FOLIO formula adapter performs renamed quantified entailment through typed formulas', () => {
  for (const [predicate, entity] of [['Glows', 'nira'], ['Resonates', 'quartz_unit']]) {
    const result = evaluateFolioFormulaCase([
      `∀x (${predicate}(x) → Stable(x))`,
      `${predicate}(${entity})`,
    ], `Stable(${entity})`);
    assert.equal(result.status, 'SOLVED');
    assert.equal(result.predicted, 'True');
  }
});

test('FOLIO formula adapter distinguishes contradiction from open-world uncertainty', () => {
  const contradicted = evaluateFolioFormulaCase(['¬Calm(tarin)'], 'Calm(tarin)');
  assert.equal(contradicted.predicted, 'False');
  const unresolved = evaluateFolioFormulaCase(['Bright(tarin)'], 'Calm(tarin)');
  assert.equal(unresolved.predicted, 'Unknown');
});

test('ground theories above the exhaustive atom threshold use scalable certified entailment', () => {
  const premises = Array.from({ length: 17 }, (_, index) => `Signal${index}(node${index})`);
  const result = evaluateFolioFormulaCase(premises, 'Signal0(node0)', { maxAtoms: 16 });
  assert.equal(result.status, 'SOLVED');
  assert.equal(result.predicted, 'True');
  assert.equal(result.method, 'scalable-boolean-entailment');
  assert.equal(result.finiteFallback.status, 'RESOURCE_LIMIT');
});

test('FOLIO parser accepts source notation without executing annotation text', () => {
  const parsed = parseFolioFormula('∀x (Path(x) → (Marked(x) ⊕ Hidden(x)))');
  assert.equal(parsed.type, 'quantifier');
  assert.equal(parsed.quantifier, 'forall');
  assert.equal(parsed.body.type, 'binary');
  assert.throws(() => parseFolioFormula('Path(x))'), /unexpected token/u);
});

test('FOLIO surface adapter uses premise vocabulary without conclusion annotations or answer labels', () => {
  const premiseFormulas = ['∀x (Glows(x) → Stable(x))', 'Glows(nira)'];
  const parsed = parseFolioNaturalLanguage('Nira glows.', premiseFormulas);
  assert.equal(parsed.status, 'PARSED');
  assert.equal(parsed.formula.predicate, 'Glows');
  const query = evaluateFolioNaturalLanguageQueryCase(premiseFormulas, 'Nira is stable.');
  assert.equal(query.status, 'SOLVED');
  assert.equal(query.predicted, 'True');
  const reordered = evaluateFolioNaturalLanguageQueryCase([...premiseFormulas].reverse(), 'Nira is stable.');
  assert.equal(reordered.predicted, 'True');
});

test('pinned FOLIO source is streamed, validated, and retains source anomalies', async (context) => {
  if (!await hasFolioSource(CACHE_ROOT)) {
    context.skip('Pinned local FOLIO source cache is unavailable.');
    return;
  }
  const inventory = await inventoryFolioSource(CACHE_ROOT);
  assert.equal(inventory.sourceSetSha256, '5157453a3938447308d9df627418cbbeb1e363894bad2c8fcffe5b7f3dcfad1a');
  assert.equal(inventory.train.records, 1_004);
  assert.equal(inventory.validation.records, 204);
  assert.equal(inventory.train.emptyFormulaAnnotations, 6);
  assert.equal(inventory.validation.premiseAlignmentMismatches, 10);
  assert.equal(inventory.test.records, 0);
});

test('development pool exposes all inputs but no host oracle labels', async (context) => {
  if (!await hasFolioSource(CACHE_ROOT)) {
    context.skip('Pinned local FOLIO source cache is unavailable.');
    return;
  }
  const pool = await loadFolioDevelopmentPool(CACHE_ROOT);
  assert.equal(pool.cases.length, 204);
  assert.equal(pool.oracle, 'host-only-not-returned');
  for (const item of pool.cases) {
    assert.equal(Object.hasOwn(item, 'label'), false);
    assert.equal(Object.hasOwn(item, 'answer'), false);
  }
});

test('training pool exposes all v0.0 inputs while preserving its missing conclusion-FOL field', async (context) => {
  if (!await hasFolioSource(CACHE_ROOT)) {
    context.skip('Pinned local FOLIO source cache is unavailable.');
    return;
  }
  const pool = await loadFolioTrainingPool(CACHE_ROOT);
  assert.equal(pool.cases.length, 1_004);
  assert.equal(pool.oracle, 'host-only-not-returned');
  assert.equal(pool.cases.every((item) => item.conclusionFormula === undefined), true);
  assert.equal(pool.cases.every((item) => !Object.hasOwn(item, 'label')), true);
});

test('complete official-formula development baseline is deterministic and agent-free', async (context) => {
  if (!await hasFolioSource(CACHE_ROOT)) {
    context.skip('Pinned local FOLIO source cache is unavailable.');
    return;
  }
  const report = await runFolioDevelopmentBaseline(undefined, CACHE_ROOT, { maxAtoms: 16 });
  assert.equal(report.tested, 204);
  assert.equal(report.formulaTrack.correct, 161);
  assert.equal(report.formulaTrack.statuses.SOLVED, 175);
  assert.equal(report.naturalLanguage.parsedSentences, 545);
  assert.equal(report.naturalLanguageQuery.languageCompiled, 108);
  assert.equal(report.naturalLanguageQuery.correct, 75);
  assert.equal(report.semanticAudit.exactSentenceFormulas, 383);
  assert.equal(report.semanticAudit.exactQueryFormulas, 73);
  assert.equal(report.runtimeFrontend.tested, 0);
  assert.equal(report.runtimeProfile, 'direct-symbolic-no-language-agent');
});

test('FOLIO receipts preserve the development-only lifecycle', async () => {
  const partition = JSON.parse(await readFile(
    join(PROJECT_ROOT, 'training/benchmark-sources/folio/partition-manifest.json'), 'utf8',
  ));
  const result = JSON.parse(await readFile(
    join(PROJECT_ROOT, 'training/benchmark-sources/folio/development-result.json'), 'utf8',
  ));
  const candidate = JSON.parse(await readFile(
    join(PROJECT_ROOT, 'training/benchmark-sources/folio/candidate-manifest.json'), 'utf8',
  ));
  assert.equal(partition.fresh.records, 0);
  assert.equal(result.fresh.executed, false);
  assert.equal(result.tested, 204);
  assert.equal(result.available, 204);
  assert.equal(result.formulaTrack.tested, 204);
  assert.equal(result.formulaTrack.correct, 161);
  assert.equal(result.naturalLanguage.parsedSentences, 545);
  assert.equal(result.semanticAudit.exactSentenceFormulas, 383);
  assert.equal(result.naturalLanguageQuery.languageCompiled, 108);
  assert.equal(result.naturalLanguageQuery.correct, 75);
  assert.equal(result.runtimeFrontend.tested, 0);
  assert.equal(result.runtimeFrontend.directSymbolicRate, null);
  assert.equal(result.runtimeFrontend.languageAgentInvocations, 0);
  for (const [path, expected] of Object.entries(candidate.dependencies)) {
    const bytes = await readFile(join(PROJECT_ROOT, path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, path);
  }
  assert.equal(createHash('sha256').update(JSON.stringify(candidate.dependencies)).digest('hex'),
    candidate.dependencySetSha256);
  for (const [field, path] of [
    ['coreChangeProposalSha256', 'training/benchmark-sources/folio/core-change-proposal.json'],
    ['guardianReviewSha256', 'training/benchmark-sources/folio/language-core-guardian-review.json'],
  ]) {
    const bytes = await readFile(join(PROJECT_ROOT, path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), candidate[field], path);
  }
  const source = await readFile(join(PROJECT_ROOT, 'src/benchmark-adapters/folio.mjs'), 'utf8');
  assert.doesNotMatch(source, /from ['"](?:node:child_process|.*codex.*)['"]|spawn\s*\(/iu);
});
