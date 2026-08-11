import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { PROJECT_ROOT } from '../src/paths.mjs';

const CORE_FILES = [
  'src/language/parser.mjs',
  'src/language/session.mjs',
  'src/language/feature-profile.mjs',
  'src/language/feature-grammar.mjs',
  'src/language/feature-grammar-comparison.mjs',
  'src/language/quantified-english.mjs',
  'src/reasoning/container-state.mjs',
  'src/reasoning/temporal-state.mjs',
  'src/reasoning/relation-algebra.mjs',
  'src/reasoning/spatial-vector.mjs',
  'src/reasoning/spatial-extent.mjs',
  'src/reasoning/qualitative-relation-closure.mjs',
  'src/reasoning/categorical-logic.mjs',
  'src/reasoning/sat-entailment.mjs',
  'src/reasoning/datalog.mjs',
  'src/reasoning/planner.mjs',
  'src/runtime/engine.mjs',
];

test('benchmark-guided core contains no dataset dispatch or inspected answer vocabulary', async () => {
  const source = (await Promise.all(CORE_FILES.map(async (file) => ({
    file, text: await readFile(join(PROJECT_ROOT, file), 'utf8'),
  }))));
  const forbiddenDataset = /\b(?:BLiMP|bAbI|CLUTRR|SimpleQA|EWOK|Story Cloze|Entity Tracking|LogicBench|IIBench|PrOntoQA|FOLIO|LogicSkills)\b/iu;
  const inspectedAnswerVocabulary = /\b(?:gray|green|white|yellow)\b/iu;
  for (const item of source) {
    assert.doesNotMatch(item.text, forbiddenDataset, `${item.file} dispatches on a benchmark identity`);
    assert.doesNotMatch(item.text, inspectedAnswerVocabulary, `${item.file} embeds a source answer domain`);
  }
});

test('finite relation-state core does not parse adapter-owned source vocabulary', async () => {
  const text = await readFile(join(PROJECT_ROOT, 'src/reasoning/container-state.mjs'), 'utf8');
  assert.doesNotMatch(text, /\b(?:Box|Move|Put|Remove|extra_id)\b/u);
  for (const operator of ['transfer', 'add', 'remove']) assert.match(text, new RegExp(`'${operator}'`, 'u'));
});

test('typed relation algebra contains no kinship or benchmark vocabulary', async () => {
  const text = await readFile(join(PROJECT_ROOT, 'src/reasoning/relation-algebra.mjs'), 'utf8');
  assert.doesNotMatch(text, /\b(?:father|mother|son|daughter|brother|sister|husband|wife|kinship|CLUTRR)\b/iu);
});

test('spatial vector core contains no source direction vocabulary or benchmark identity', async () => {
  const text = await readFile(join(PROJECT_ROOT, 'src/reasoning/spatial-vector.mjs'), 'utf8');
  assert.doesNotMatch(text, /(?:['"](?:left|right|above|below)['"]|\b(?:StepGame|SpaRP|SpaRC)\b)/iu);
});

test('spatial extent core contains no source direction vocabulary or benchmark identity', async () => {
  const text = await readFile(join(PROJECT_ROOT, 'src/reasoning/spatial-extent.mjs'), 'utf8');
  assert.doesNotMatch(text, /(?:['"](?:left|right|above|below)['"]|\b(?:StepGame|SpaRP|SpaRC)\b)/iu);
});

test('qualitative relation closure contains no spatial source vocabulary or benchmark identity', async () => {
  const text = await readFile(join(PROJECT_ROOT, 'src/reasoning/qualitative-relation-closure.mjs'), 'utf8');
  assert.doesNotMatch(text,
    /(?:['"](?:left|right|above|below|front|behind|near|far|dc|ec|po|tpp|ntpp|tppi|ntppi)['"]|\b(?:StepGame|SpaRP|SpaRC|SpaRTUN)\b)/iu);
});

test('benchmark adapters do not reject complete sources by arbitrary file-size quotas', async () => {
  for (const directory of ['src/benchmark-adapters', 'src/evaluation']) {
    const files = (await readdir(join(PROJECT_ROOT, directory))).filter((file) => file.endsWith('.mjs'));
    for (const file of files) {
      const text = await readFile(join(PROJECT_ROOT, directory, file), 'utf8');
      assert.doesNotMatch(text, /MAX_(?:FILE|SOURCE)_BYTES/u,
        `${directory}/${file} uses source size as an acceptance criterion`);
      assert.doesNotMatch(text, /(?:input|file) exceeds \d+ MiB/iu,
        `${directory}/${file} rejects a complete source instead of streaming or sharding it`);
    }
  }
});
