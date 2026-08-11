import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeEnglishAcceptability, compareEnglishAcceptability,
} from '../src/language/feature-grammar.mjs';
import { validateFeatureProfile } from '../src/language/feature-profile.mjs';

function profile(names = {}) {
  const noun = names.noun ?? 'dax';
  const plural = names.plural ?? 'daxen';
  const finite = names.finite ?? 'glims';
  const objectVerb = names.objectVerb ?? 'varks';
  return {
    format: 'eslm-english-feature-profile-v1',
    provenance: { source: 'nonce test fixture' },
    morphology: {},
    expansions: {},
    lexemes: {
      '.': { category: 'punctuation', sentenceForce: 'statement' },
      '?': { category: 'punctuation', sentenceForce: 'question' },
      a: { category: 'determiner', number: 'singular' },
      these: { category: 'determiner', number: 'plural' },
      who: { category: 'wh', startsClause: true, gapLicense: 'requires-gap' },
      that: { category: 'complementizer', startsClause: true, gapLicense: 'forbids-gap' },
      did: { category: 'auxiliary', finite: true, agreement: 'any', supportsInversion: true },
      not: { category: 'negator', polarityLicensor: true },
      ever: { category: 'adverb', polarityItem: 'negative' },
      himself: { category: 'reflexive', number: 'singular', gender: 'masculine' },
      [noun]: { category: 'noun', number: 'singular' },
      [plural]: { category: 'noun', number: 'plural' },
      mib: { category: 'noun', number: 'singular', gender: 'masculine', animacy: 'animate' },
      zorp: { category: 'noun', number: 'singular', gender: 'feminine', animacy: 'animate' },
      [finite]: { category: 'verb', finite: true, agreement: 'singular' },
      [objectVerb]: { category: 'verb', finite: true, agreement: 'singular', requiresObject: true },
    },
  };
}

function preferred(left, right, features = profile()) {
  return compareEnglishAcceptability(left, right, features).preferred;
}

test('nonce agreement is driven by declarative number features', () => {
  assert.equal(preferred('A dax glims.', 'These daxen glims.'), 0);
  assert.equal(preferred('These daxen glims.', 'A dax glims.'), 1);
  assert.equal(preferred('A dax glims.', 'A daxen glims.'), 0);
});

test('renaming every open-class surface preserves the grammatical preference', () => {
  const renamed = profile({ noun: 'plin', plural: 'plinar', finite: 'snoofs', objectVerb: 'krens' });
  assert.equal(preferred('A dax glims.', 'These daxen glims.'),
    preferred('A plin snoofs.', 'These plinar snoofs.', renamed));
  assert.equal(preferred('Mib varks dax.', 'Mib varks.', profile()),
    preferred('Mib krens plin.', 'Mib krens.', renamed));
});

test('binding, polarity, filler-gap, and valency constraints are contrastive', () => {
  assert.equal(preferred('Mib varks himself.', 'Zorp varks himself.'), 0);
  assert.equal(preferred('Mib did not ever varks dax.', 'Mib did ever varks dax.'), 0);
  assert.equal(preferred('Who did mib varks?', 'That mib varks?'), 0);
  assert.equal(preferred('Mib varks dax.', 'Mib varks.'), 0);
});

test('feature-profile validation rejects executable or malformed analyses', () => {
  assert.throws(() => validateFeatureProfile({ ...profile(), format: 'unknown' }), /unsupported format/u);
  const malformed = profile();
  malformed.lexemes.dax = { category: 'noun', callback: () => true };
  assert.throws(() => analyzeEnglishAcceptability('A dax glims.', malformed), /unsupported value type/u);
});

