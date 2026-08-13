import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HEURISTIC_SEMANTIC_TIE_MARGIN, arbitrateSemanticAlternatives,
} from '../src/runtime/heuristic-language-arbitration.mjs';
import {
  MAXIMUM_PARSE_ONLY_REPARSES, alternativeInterpretationRequired, inspectLanguageCandidates,
  semanticSignature,
} from '../src/runtime/heuristic-language-inspection-gate.mjs';

function acceptedCandidate({ id, rank, rankScore, semanticId }) {
  return Object.freeze({
    candidate: Object.freeze({
      candidateId: id,
      text: `Does ${semanticId} hold?`,
      confidence: rankScore,
      rank,
      rankScore,
    }),
    ir: Object.freeze({ parseStatus: 'PARSED' }),
    receipt: Object.freeze({ semanticSignature: semanticId }),
  });
}

test('semantic-alternative arbitration preserves a deterministic close tie independent of input order', () => {
  assert.equal(HEURISTIC_SEMANTIC_TIE_MARGIN, 0.08);
  const first = acceptedCandidate({ id: 'candidate:z', rank: 2, rankScore: 0.75, semanticId: 'ir:z' });
  const second = acceptedCandidate({ id: 'candidate:a', rank: 1, rankScore: 0.71, semanticId: 'ir:a' });
  const forward = arbitrateSemanticAlternatives([first, second]);
  const reverse = arbitrateSemanticAlternatives([second, first]);
  assert.equal(forward.status, 'AMBIGUOUS');
  assert.equal(forward.selected, null);
  assert.deepEqual(
    forward.alternatives.map((item) => item.candidate.candidateId),
    reverse.alternatives.map((item) => item.candidate.candidateId),
  );
  assert.deepEqual(forward.alternatives.map((item) => item.candidate.candidateId), [
    'candidate:z', 'candidate:a',
  ]);
});

test('same Semantic IR preserves direct success while a different accepted IR opens recovery', () => {
  const directIr = Object.freeze({
    parseStatus: 'PARSED',
    query: Object.freeze({ intent: 'yes-no', subject: 'n1', predicate: 'r1', object: 'n2' }),
    assertions: Object.freeze([]),
    rules: Object.freeze([]),
    unsupportedStatements: Object.freeze([]),
  });
  const direct = Object.freeze({ status: 'SOLVED' });
  const same = Object.freeze({ receipt: Object.freeze({ semanticSignature: semanticSignature(directIr) }) });
  const changed = Object.freeze({
    receipt: Object.freeze({
      semanticSignature: semanticSignature({
        ...directIr,
        query: Object.freeze({ ...directIr.query, predicate: 'r2' }),
      }),
    }),
  });
  assert.equal(alternativeInterpretationRequired(direct, directIr, [same]), false);
  assert.equal(alternativeInterpretationRequired(direct, directIr, [same, changed]), true);
});

test('parse-only inspection has no provider or execution capability and obeys the reparse bound', () => {
  let inspections = 0;
  let providerExecutions = 0;
  let reasoningExecutions = 0;
  const candidates = [
    acceptedCandidate({ id: 'candidate:1', rank: 1, rankScore: 0.9, semanticId: 'ir:1' }).candidate,
    acceptedCandidate({ id: 'candidate:2', rank: 2, rankScore: 0.8, semanticId: 'ir:2' }).candidate,
  ];
  const result = inspectLanguageCandidates({
    candidates,
    maximumReparses: 1,
    inspectLanguage: (text) => {
      inspections += 1;
      assert.equal(providerExecutions, 0);
      assert.equal(reasoningExecutions, 0);
      return Object.freeze({
        parseStatus: 'PARSED',
        query: Object.freeze({ intent: 'yes-no', subject: text, predicate: 'inspect', object: 'surface' }),
      });
    },
  });
  assert.equal(inspections, 1);
  assert.equal(providerExecutions, 0);
  assert.equal(reasoningExecutions, 0);
  assert.equal(result.reparses.length, 1);
  assert.equal(result.accepted.length, 1);
  assert.throws(() => inspectLanguageCandidates({
    candidates,
    maximumReparses: MAXIMUM_PARSE_ONLY_REPARSES + 1,
    inspectLanguage: () => ({ parseStatus: 'PARSED' }),
  }), /maximumReparses/u);
});
