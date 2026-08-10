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
    assert.match(cli, new RegExp(id, 'u'));
    assert.match(catalog, new RegExp(id, 'u'));
    assert.equal(await page(definition.documentation).then(() => true), true);
  }
  assert.match(cli, /hand-authored regression fixtures/u);
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
  for (const label of ['Open English WordNet 2025', 'ATOMIC 2020', 'ConceptNet', 'GeoNames', 'Wikidata']) {
    assert.match(home, new RegExp(label, 'u'));
    assert.match(sources, new RegExp(label, 'u'));
  }
  const wordnet = statuses.find((status) => status.id === 'oewn-2025');
  assert.equal(wordnet.probeComplete, true);
  assert.equal(wordnet.generatedModel, false);
  assert.match(cli, /WordNet probe is complete/u);
  assert.match(home, /none of the planned WordNet, ATOMIC, ConceptNet, or GeoNames KBs has been built/u);
  assert.match(sources, /Wikidata is future and thematic only/u);
});

test('documentation does not resurrect disproven chunk or Task 16 status claims', async () => {
  const [model, benchmarks, training] = await Promise.all([
    page('model.html'), page('benchmarks.html'), page('training.html'),
  ]);
  assert.doesNotMatch(model, /20\/20 chunk analysis/u);
  assert.match(model, /every ledger entry remains <code>pending<\/code>/u);
  assert.match(benchmarks, /Tasks 2, 3, and 16 have cached, prepared train\/test splits/u);
  assert.match(training, /does not yet implement atomic worker claims/u);
});
