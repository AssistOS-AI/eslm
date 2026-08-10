import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CORPUS_CATALOG, corpusCatalog, corpusStatuses, selectedCorpusIds } from '../src/corpora.mjs';
import { PROJECT_ROOT } from '../src/paths.mjs';

test('knowledge corpora are distinct, ordered sources rather than benchmark adapters', () => {
  const ids = corpusCatalog().map((source) => source.id);
  assert.deepEqual(ids.slice(0, 4), [
    'oewn-2025', 'atomic-2020', 'conceptnet-5.7.0-en', 'geonames-snapshot',
  ]);
  assert.equal(CORPUS_CATALOG['oewn-2025'].priority, 1);
  assert.equal(CORPUS_CATALOG['atomic-2020'].priority, 2);
  assert.equal(CORPUS_CATALOG['wikidata-thematic'].ingestionStatus, 'future-thematic-packs-only');
  assert.equal(CORPUS_CATALOG['conceptnet-5.7.0-en'].relations.includes('IsA'), true);
  assert.equal('evaluationStatus' in CORPUS_CATALOG['oewn-2025'], false);
});

test('corpus selection rejects unknown sources and reports honest local state', async () => {
  assert.deepEqual(selectedCorpusIds('oewn-2025,atomic-2020'), ['oewn-2025', 'atomic-2020']);
  assert.throws(() => selectedCorpusIds('not-a-corpus'), /Unknown knowledge corpus/u);
  const statuses = await corpusStatuses('oewn-2025');
  assert.equal(statuses.length, 1);
  assert.equal(statuses[0].sourceCached, true);
  assert.equal(statuses[0].prepared, false);
  assert.equal(statuses[0].generatedModel, true);
  assert.equal(statuses[0].probeComplete, true);
  assert.equal(statuses[0].architectureGate, 'experimental-build-query-directed-gate-open');
  assert.equal(statuses[0].nextArtifact, 'lazy-shard-loader-and-held-out-evaluation');
});

test('published WordNet probe remains the source-shape evidence preceding the build', async () => {
  const report = JSON.parse(await readFile(`${PROJECT_ROOT}/docs/results/latest-oewn-probe.json`, 'utf8'));
  assert.equal(report.status, 'probe-complete-architecture-gate-still-blocked');
  assert.equal(report.synsets.count, 107519);
  assert.equal(report.lexicalEntries.senses, 185129);
  assert.equal(report.relations.missingRelationTargets, 0);
  assert.equal(report.gateDecision.fullCompilationAuthorized, false);
});
