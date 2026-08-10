import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { corpusCatalog, corpusStatuses } from '../src/corpora.mjs';
import { KB_CATALOG } from '../src/kbs.mjs';
import { PROJECT_ROOT } from '../src/paths.mjs';

async function page(name) {
  return readFile(join(PROJECT_ROOT, 'docs', name), 'utf8');
}

test('documentation lists every selectable KB and its actual evidence boundary', async () => {
  const [cli, catalog] = await Promise.all([page('cli.html'), page('knowledge-bases.html')]);
  for (const [id, definition] of Object.entries(KB_CATALOG)) {
    if (!definition.internal) assert.match(cli, new RegExp(id, 'u'));
    assert.match(catalog, new RegExp(id, 'u'));
    assert.equal(await page(definition.documentation).then(() => true), true);
  }
  assert.match(catalog, /hand-authored regression fixtures/u);
  assert.match(catalog, /not evidence of broad world knowledge/u);
});

test('knowledge-source pages follow the machine priority and artifact state', async () => {
  const [home, sources, cli, statuses] = await Promise.all([
    page('index.html'), page('knowledge-sources.html'), page('cli.html'), corpusStatuses('all'),
  ]);
  const priorities = corpusCatalog().slice(0, 5).map((source) => source.id);
  assert.deepEqual(priorities, [
    'oewn-2025', 'atomic-2020', 'conceptnet-5.7.0-en', 'geonames-snapshot', 'wikidata-thematic',
  ]);
  for (const label of ['Open English WordNet 2025', 'ATOMIC 2020']) assert.match(home, new RegExp(label, 'u'));
  for (const label of ['Open English WordNet 2025', 'ATOMIC 2020', 'ConceptNet', 'GeoNames', 'Wikidata']) {
    assert.match(sources, new RegExp(label, 'u'));
  }
  const wordnet = statuses.find((status) => status.id === 'oewn-2025');
  assert.equal(wordnet.probeComplete, true);
  assert.equal(wordnet.generatedModel, true);
  const atomic = statuses.find((status) => status.id === 'atomic-2020');
  assert.equal(atomic.generatedModel, true);
  assert.match(cli, /Open English WordNet 2025/u);
  assert.match(cli, /ATOMIC 2020/u);
  assert.match(home, /107,519 synsets/u);
  assert.match(home, /940,427 unique non-/u);
  assert.match(home, /All 700 passed/u);
  assert.match(sources, /Wikidata thematic packs/u);
});

test('documentation distinguishes unused chunk ledgers from the accepted Task 16 learning cycle', async () => {
  const [model, benchmarks, training] = await Promise.all([
    page('model.html'), page('benchmarks.html'), page('training.html'),
  ]);
  assert.doesNotMatch(model, /20\/20 chunk analysis/u);
  assert.match(model, /every ledger entry remains <code>pending<\/code>/u);
  assert.match(benchmarks, /bAbI Task 16 learning/u);
  assert.match(benchmarks, /bAbI Tasks 2 and 3 ingestion/u);
  assert.match(training, /No accepted synthesis or promoted capability/u);
});

test('public benchmark documentation separates completed, prepared, and source-exposed evidence', async () => {
  const benchmarks = await page('benchmarks.html');
  assert.match(benchmarks, /completed local public-data results for bAbI v1.2 Tasks 15 and 16/u);
  assert.match(benchmarks, /1,000\/1,000 semantic answers correct/u);
  assert.match(benchmarks, /Tasks 2 and 3 are locally prepared but have not been learned or scored/u);
  assert.match(benchmarks, /not a public benchmark/u);
  assert.match(benchmarks, /latest-benchmark\.html/u);
  assert.match(benchmarks, /latest-conversation-benchmark\.html/u);
});
