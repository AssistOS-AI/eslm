import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createGroundingRequest, makeGroundingEntry, relevanceRankedEntries,
} from '../src/reasoning/grounding-retrieval.mjs';

function candidate(recordId, statement, semantic, activeKbOccurrences) {
  return makeGroundingEntry({
    kbId: 'nonce-kb', kbVersion: '1', recordId, statement, semantic,
    epistemicStatus: 'source-assertion', provenance: [`nonce:${recordId}`],
    relevance: {
      score: 1,
      reasons: ['bounded-posting-candidate'],
      activeKbOccurrences,
    },
  });
}

test('role combinations and typed bridges outrank isolated high-frequency overlap', () => {
  const request = createGroundingRequest('What does a velin use to open a qorin?', 'UNKNOWN', {
    subject: 'velin', predicate: 'used_for', object: 'open_qorin',
  });
  const ranked = relevanceRankedEntries([
    candidate('common', 'Velin appears in many records.', {
      subject: 'velin', predicate: 'mentioned', object: 'record',
    }, 9_000_000),
    candidate('bridge', 'A velin uses a key to open a qorin.', {
      subject: 'velin', predicate: 'used_for', object: 'open_qorin',
    }, 2),
  ], request);
  assert.equal(ranked[0].recordId, 'bridge');
  assert.ok(ranked[0].relevance.estimator.answerBridgeScore > 0);
  assert.equal(ranked[0].relevance.estimator.answerSupported, false);
  assert.ok(ranked[0].relevance.estimator.strategyVotes.some((vote) =>
    vote.strategyId === 'strategy:retrieval:typed-answer-bridge'));
  assert.ok(ranked[0].relevance.estimator.strategyVotes.every((vote) => vote.truthAuthorized === false));
});

test('cooccurrence is super-additive and ranking is deterministic under input permutation', () => {
  const request = createGroundingRequest('Compare zorals with velins.', 'UNKNOWN', undefined, {
    focus: [
      { focusId: 'topic:1', term: 'zorals', role: 'request-topic' },
      { focusId: 'topic:2', term: 'velins', role: 'request-topic' },
    ],
  });
  const values = [
    candidate('z-only', 'Zorals have amber shells.', { subject: 'zoral', value: 'amber' }, 30),
    candidate('both', 'Zorals and velins use lattice shells.', {
      subject: 'zorals', predicate: 'compared_with', object: 'velins',
    }, 3),
  ];
  const forward = relevanceRankedEntries(values, request);
  const reverse = relevanceRankedEntries(values.toReversed(), request);
  assert.deepEqual(forward, reverse);
  assert.equal(forward[0].recordId, 'both');
  assert.ok(forward[0].relevance.estimator.matchedTerms.length >= 2);
  assert.ok(forward[0].relevance.estimator.strategyVotes.some((vote) =>
    vote.strategyId === 'strategy:retrieval:focus-term-cooccurrence'));
});
