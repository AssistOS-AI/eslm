import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { loadPublicKnowledgeBase } from '../src/public-kbs.mjs';
import { GeoNamesProvider } from '../src/public-kb-providers/geonames.mjs';
import {
  createGroundingRequest, createKnowledgeContextRequest,
} from '../src/reasoning/grounding-retrieval.mjs';

function syntheticGeoNamesProvider({
  placeId = 'nonce-place-1', canonicalName = 'Șora', asciiName = 'Sora', foldedName = 'sora',
} = {}) {
  const placeRef = `places/${createHash('sha256').update(placeId).digest('hex')[0]}.json`;
  const nameRef = `names/${foldedName[0]}.json`;
  return new GeoNamesProvider({
    manifest: {
      id: 'geonames-nonce', kbId: 'geonames-nonce', kbVersion: 'test',
    },
    data: {
      'countries/all.json': {
        countries: {
          TV: ['Torvia', 'Toria', 'EU', 'TVC', 'Torvian credit', ['tv'], 1000, 100, 'TV', '', '', 'country-1'],
        },
        index: { tv: 'TV', torvia: 'TV' },
      },
      [nameRef]: { [foldedName]: [placeId] },
      [placeRef]: {
        [placeId]: [canonicalName, asciiName, 'TV', 100, '1', '2', 'Etc/UTC'],
      },
    },
  }, { mode: 'eager', shardsByRef: new Map() });
}

function noncePlaceContextRequest(surface, role) {
  return createKnowledgeContextRequest(`Where is ${surface} located?`, undefined, {
    focus: [{ focusId: 'nonce-place-focus', term: surface, role }],
    maximumLookups: 4,
    maximumValuesPerLookup: 4,
  });
}

test('WordNet declarative shards support lazy bounded taxonomy proofs', async () => {
  const provider = await loadPublicKnowledgeBase('oewn-2025', { mode: 'lazy', cacheBytes: 32 * 1024 * 1024 });
  const result = await provider.ask('Is a dog an animal?');
  assert.equal(result.status, 'SOLVED');
  assert.deepEqual(result.values, [true]);
  assert.equal(provider.memorySnapshot().mode, 'lazy');
});

test('ATOMIC train shards preserve defeasible status and line provenance', async () => {
  const provider = await loadPublicKnowledgeBase('atomic-2020', { mode: 'lazy', cacheBytes: 32 * 1024 * 1024 });
  const result = await provider.ask('Why might apologize?');
  assert.equal(result.status, 'DEFEASIBLE');
  assert.match(result.answer, /defeasible possibilities/u);
  assert.match(result.provenance[0].source[0], /^atomic-2020:train\.tsv:/u);
});

test('GeoNames uses typed source relations and preserves place-name ambiguity', async () => {
  const provider = await loadPublicKnowledgeBase('geonames-2026', { mode: 'lazy', cacheBytes: 16 * 1024 * 1024 });
  const capital = await provider.ask('What is the capital of Romania?');
  assert.equal(capital.status, 'SOLVED');
  assert.equal(capital.answer, 'Bucharest');
  assert.match(capital.provenance[0].source[0], /^GeoNames:/u);

  const renamedForm = await provider.ask('Which country has Bucharest as its capital?');
  assert.equal(renamedForm.answer, 'Romania');
  assert.equal(provider.memorySnapshot().mode, 'lazy');
});

test('GeoNames context requires a proper-name role and Unicode-exact canonical admission', async () => {
  const provider = syntheticGeoNamesProvider();

  const commonNoun = await provider.retrieveGrounding(noncePlaceContextRequest('sora', 'entity'));
  assert.deepEqual(commonNoun.entries, []);
  assert.match(commonNoun.receipt.diagnostic, /not typed as proper names/u);

  const capitalizedCommonNoun = await provider.retrieveGrounding(noncePlaceContextRequest('Șora', 'entity'));
  assert.deepEqual(capitalizedCommonNoun.entries, []);
  assert.match(capitalizedCommonNoun.receipt.diagnostic, /not typed as proper names/u);

  const foldedAlias = await provider.retrieveGrounding(noncePlaceContextRequest('Sora', 'named-entity'));
  assert.deepEqual(foldedAlias.entries, []);
  assert.match(foldedAlias.receipt.diagnostic, /Unicode-different canonical name/u);

  const exactName = await provider.retrieveGrounding(noncePlaceContextRequest('Șora', 'named-entity'));
  assert.equal(exactName.entries.length, 1);
  assert.equal(exactName.entries[0].semantic.name, 'Șora');
  assert.deepEqual(exactName.entries[0].relevance.reasons, ['typed-unicode-exact-place-name-match']);

  const renamedProvider = syntheticGeoNamesProvider({
    placeId: 'nonce-place-2', canonicalName: 'Ŕune', asciiName: 'Rune', foldedName: 'rune',
  });
  const renamedFoldedAlias = await renamedProvider.retrieveGrounding(
    noncePlaceContextRequest('Rune', 'named-entity'),
  );
  assert.deepEqual(renamedFoldedAlias.entries, []);
  const renamedExactName = await renamedProvider.retrieveGrounding(
    noncePlaceContextRequest('Ŕune', 'named-entity'),
  );
  assert.equal(renamedExactName.entries[0].semantic.name, 'Ŕune');
});

test('ConceptNet retrieves typed relation edges without treating them as universal laws', async () => {
  const provider = await loadPublicKnowledgeBase('conceptnet-5.7.0-en', { mode: 'lazy', cacheBytes: 16 * 1024 * 1024 });
  const result = await provider.ask('What is a knife used for?');
  assert.equal(result.status, 'DEFEASIBLE');
  assert.equal(result.reasoning.relation, 'UsedFor');
  assert.equal(result.reasoning.policy, 'defeasible-edge');
  assert.match(result.provenance[0].source[0], /^ConceptNet-5\.7\.0:/u);
});

test('ConceptNet declared-edge relations remain strict while defeasible families do not upgrade', async () => {
  const provider = await loadPublicKnowledgeBase('conceptnet-5.7.0-en', {
    mode: 'lazy', cacheBytes: 16 * 1024 * 1024,
  });
  const strict = await provider.ask('What is a knife made of?');
  const defeasible = await provider.ask('What is a knife used for?');
  assert.equal(strict.status, 'SOLVED');
  assert.equal(strict.reasoning.policy, 'declared-edge-only');
  assert.equal(defeasible.status, 'DEFEASIBLE');
  assert.equal(defeasible.reasoning.policy, 'defeasible-edge');
});

test('WordNet preserves source sense order and part of speech for singular lexical requests', async () => {
  const provider = await loadPublicKnowledgeBase('oewn-2025', {
    mode: 'lazy', cacheBytes: 32 * 1024 * 1024,
  });
  const verb = await provider.ask('Give a suitable synonym for “to finish”.');
  assert.equal(verb.answer, 'complete');
  const adjective = await provider.ask('Give a suitable synonym for difficult.');
  assert.equal(adjective.answer, 'hard');
  const adverb = await provider.ask('Give a suitable antonym for quickly.');
  assert.equal(adverb.answer, 'slowly');
});

test('ConceptNet lexical-edge provenance omits empty optional identifiers', async () => {
  const provider = await loadPublicKnowledgeBase('conceptnet-5.7.0-en', {
    mode: 'lazy', cacheBytes: 16 * 1024 * 1024,
  });
  const antonym = await provider.ask('What is an antonym of difficult?');
  assert.equal(antonym.reasoning.relation, 'Antonym');
  assert.ok(antonym.values.length > 0);
  assert.ok(antonym.provenance.every((item) => item.provenanceIds === undefined
    || item.provenanceIds.every(Boolean)));
  const renamed = await provider.ask('What is a synonym of challenging?');
  assert.equal(renamed.reasoning.relation, 'Synonym');
});

test('public providers expose bounded related-evidence retrieval with source receipts', async () => {
  const cases = [
    ['oewn-2025', 'What is known about dogs?', 'dog'],
    ['geonames-2026', 'What is known about Romania?', 'Romania'],
    ['conceptnet-5.7.0-en', 'What is known about dogs?', 'dog'],
    ['world-relations-1.0', 'What is known about containment?', 'containment'],
  ];
  for (const [id, text, expected] of cases) {
    const provider = await loadPublicKnowledgeBase(id, { mode: 'lazy', cacheBytes: 16 * 1024 * 1024 });
    const result = await provider.retrieveGrounding(createGroundingRequest(text, 'UNKNOWN'));
    assert.equal(result.receipt.kbId, id);
    assert.match(result.receipt.coverage, /^bounded-exact/u);
    assert.ok(result.entries.some((entry) => entry.statement.toLocaleLowerCase('en-US')
      .includes(expected.toLocaleLowerCase('en-US'))), id);
  }
});

test('public grounding prioritizes an instruction topic and respects the provider candidate boundary', async () => {
  const wordnet = await loadPublicKnowledgeBase('oewn-2025', {
    mode: 'lazy', cacheBytes: 16 * 1024 * 1024,
  });
  const definition = await wordnet.retrieveGrounding(createGroundingRequest(
    'Explain quantum chromodynamics', 'UNPARSED', undefined, { maximumEntries: 2 },
  ));
  assert.equal(definition.entries[0].semantic.lemma, 'quantum chromodynamics');
  assert.ok(!definition.entries.some((entry) => entry.semantic.lemma === 'explain'));

  const conceptnet = await loadPublicKnowledgeBase('conceptnet-5.7.0-en', {
    mode: 'lazy', cacheBytes: 16 * 1024 * 1024,
  });
  const neighborhood = await conceptnet.retrieveGrounding(createGroundingRequest(
    'Write a short report about dogs', 'UNPARSED', undefined, { maximumEntries: 2 },
  ));
  assert.ok(neighborhood.entries.length <= 8);
  assert.ok(neighborhood.entries.some((entry) => entry.semantic.subject === 'dogs'
    || entry.semantic.subject === 'dog'));
  assert.ok(!neighborhood.entries.some((entry) => entry.semantic.subject === 'short'));
});

test('automatic ATOMIC grounding does not construct the global fuzzy event index', async () => {
  const provider = await loadPublicKnowledgeBase('atomic-2020', {
    mode: 'lazy', cacheBytes: 16 * 1024 * 1024,
  });
  const result = await provider.retrieveGrounding(createGroundingRequest(
    'What is known about personx apologizes?', 'UNKNOWN', undefined, { maximumLookups: 4 },
  ));
  assert.match(result.receipt.coverage, /exact-event/u);
  assert.equal(provider.eventKeyIndex, undefined);
});

test('lazy World Relations grounding loads only its compiled exact-posting shard', async () => {
  const provider = await loadPublicKnowledgeBase('world-relations-1.0', {
    mode: 'lazy', cacheBytes: 2 * 1024 * 1024,
  });
  assert.equal(provider.ontology, undefined);
  assert.equal(provider.groundingPostings, undefined);
  const result = await provider.retrieveGrounding(createGroundingRequest(
    'What is known about containment?', 'UNKNOWN', undefined, { maximumLookups: 4 },
  ));
  assert.ok(result.entries.some((item) => item.semantic.relation === 'containment'));
  assert.equal(provider.ontology, undefined);
  assert.ok(provider.groundingPostings);
  assert.deepEqual(provider.memorySnapshot(), {
    mode: 'lazy',
    groundingMode: 'loaded',
    estimatedBytes: (provider.shard.compressedBytes + provider.groundingShard.compressedBytes) * 5,
  });
});
