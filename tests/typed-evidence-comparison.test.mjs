import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  classifyTypedUpdate,
  compareTypedEvidence,
  verifyTypedEvidenceComparison,
} from '../src/reasoning/typed-evidence-comparison.mjs';
import {
  declaredSemanticEvidence,
  deriveBridgeEvidence,
  deriveFramePairEvidence,
} from '../src/reasoning/typed-event-evidence.mjs';
import { compileNarrativeSentence } from '../src/reasoning/narrative-state.mjs';

function policy(minimumMargin = 1) {
  return {
    minimumMargin,
    familyWeights: {
      causal: 1,
      contradiction: 1,
      default: 1,
      goal: 1,
      participant: 1,
      state: 1,
      temporal: 1,
    },
  };
}

function evidence(alternativeId, semanticFamily, direction, strength, suffix = 'one') {
  return declaredSemanticEvidence({
    alternativeId,
    semanticFamily,
    direction,
    strength,
    sourceRef: `packet:${suffix}`,
    relation: `typed-relation:${suffix}`,
    origin: 'validated-declarative-record',
  });
}

test('typed comparison aggregates provenance-bearing semantic evidence and verifies its witness', () => {
  const input = {
    alternatives: ['route:amber', 'route:cobalt'],
    evidence: [
      evidence('route:amber', 'causal', 'support', 300, 'cause'),
      evidence('route:amber', 'goal', 'support', 140, 'goal'),
      evidence('route:amber', 'contradiction', 'attack', 50, 'exception'),
      evidence('route:cobalt', 'default', 'support', 80, 'default'),
    ],
    policy: policy(100),
  };
  const result = compareTypedEvidence(input);
  assert.deepEqual(result.values, ['route:amber']);
  assert.equal(result.status, 'DEFEASIBLE');
  assert.equal(result.witness.margin, 310);
  assert.equal(verifyTypedEvidenceComparison(input, result), true);

  const tampered = { ...result, witness: { ...result.witness, requiredMargin: 0 } };
  assert.equal(verifyTypedEvidenceComparison(input, tampered), false);
});

test('ties and absent evidence are explicit UNKNOWN even with a zero required margin', () => {
  const absent = compareTypedEvidence({
    alternatives: ['option:north', 'option:south'], evidence: [], policy: policy(0),
  });
  assert.equal(absent.status, 'UNKNOWN');
  assert.equal(absent.uncertainty.kind, 'insufficient-evidence');

  const tied = compareTypedEvidence({
    alternatives: ['option:north', 'option:south'],
    evidence: [
      evidence('option:north', 'state', 'support', 20, 'north'),
      evidence('option:south', 'state', 'support', 20, 'south'),
    ],
    policy: policy(0),
  });
  assert.equal(tied.status, 'UNKNOWN');
  assert.equal(tied.uncertainty.kind, 'score-tie-or-insufficient-margin');
});

test('full renaming and evidence or alternative permutation preserve the comparison structure', () => {
  const original = {
    alternatives: ['choice:one', 'choice:two'],
    evidence: [
      evidence('choice:one', 'state', 'support', 180, 'first'),
      evidence('choice:two', 'contradiction', 'attack', 40, 'second'),
    ],
    policy: policy(),
  };
  const permuted = {
    ...original,
    alternatives: original.alternatives.toReversed(),
    evidence: original.evidence.toReversed(),
  };
  assert.deepEqual(compareTypedEvidence(permuted).values, ['choice:one']);

  const rename = new Map([['choice:one', 'nonce:saffron'], ['choice:two', 'nonce:indigo']]);
  const renamed = {
    alternatives: original.alternatives.map((id) => rename.get(id)),
    evidence: original.evidence.map((item, index) => ({
      ...item,
      evidenceId: `renamed:evidence:${index}`,
      alternativeId: rename.get(item.alternativeId),
      provenance: {
        origin: `renamed-origin-${index}`,
        relation: `renamed-relation-${index}`,
        sourceRef: `renamed-packet-${index}`,
      },
    })),
    policy: original.policy,
  };
  assert.deepEqual(compareTypedEvidence(renamed).values, ['nonce:saffron']);
});

test('meaning-changing attack and support controls change update classification without lexical dispatch', () => {
  const supportive = {
    alternatives: ['state:before', 'state:after'],
    evidence: [evidence('state:after', 'state', 'support', 160, 'aligned')],
    policy: policy(100),
  };
  const attacking = {
    ...supportive,
    evidence: [evidence('state:after', 'contradiction', 'attack', 160, 'conflict')],
  };
  assert.deepEqual(classifyTypedUpdate(supportive).values, ['strengthener']);
  assert.deepEqual(classifyTypedUpdate(attacking).values, ['weakener']);
});

test('frame evidence exposes causal, state, contradiction, participant, and temporal provenance', () => {
  const aligned = deriveFramePairEvidence({
    alternativeId: 'bridge:aligned',
    source: compileNarrativeSentence('Qorin opened the norvex chamber.', 0),
    target: compileNarrativeSentence('Qorin opened the chamber.', 1),
    sourceRef: 'nonce:pair',
    includeParticipantContinuity: true,
  });
  assert.ok(aligned.some((item) => item.semanticFamily === 'state'));
  assert.ok(aligned.some((item) => item.semanticFamily === 'causal'));
  assert.ok(aligned.some((item) => item.semanticFamily === 'participant'));
  assert.ok(aligned.every((item) => item.provenance.sourceRef === 'nonce:pair'));

  const conflicting = deriveFramePairEvidence({
    alternativeId: 'bridge:conflict',
    source: compileNarrativeSentence('Qorin opened the chamber.', 0),
    target: compileNarrativeSentence('Qorin did not open the chamber.', 1),
    sourceRef: 'nonce:conflict',
  });
  assert.ok(conflicting.some((item) => item.semanticFamily === 'contradiction'
    && item.direction === 'attack'));

  const bridged = deriveBridgeEvidence({
    before: compileNarrativeSentence('Zava carried the trel.', 0),
    after: compileNarrativeSentence('Zava stored the trel.', 2),
    candidates: [
      { alternativeId: 'bridge:carry', event: compileNarrativeSentence('Zava carried the trel.', 1) },
      { alternativeId: 'bridge:unrelated', event: compileNarrativeSentence('Miro painted a wall.', 1) },
    ],
    taskRef: 'nonce:bridge-task',
  });
  assert.ok(bridged.some((item) => item.semanticFamily === 'temporal'));
});

test('typed comparison rejects malformed provenance, undeclared alternatives, and resource overflow', () => {
  assert.throws(() => compareTypedEvidence({
    alternatives: ['a:one', 'a:two'],
    evidence: [{ ...evidence('a:one', 'state', 'support', 1), provenance: { origin: 'missing-fields' } }],
    policy: policy(),
  }), /provenance must contain exactly/u);
  assert.throws(() => compareTypedEvidence({
    alternatives: ['a:one', 'a:two'],
    evidence: [evidence('a:other', 'state', 'support', 1)],
    policy: policy(),
  }), /alternativeId is not declared/u);
  assert.throws(() => compareTypedEvidence({
    alternatives: ['a:one', 'a:two'],
    evidence: Array.from({ length: 2_049 }, (_, index) => ({
      ...evidence('a:one', 'state', 'support', 1, String(index)),
      evidenceId: `evidence:overflow:${index}`,
    })),
    policy: policy(),
  }), /at most 2048/u);
});

test('typed evidence core contains no benchmark, source-row, answer, or inspected vocabulary dispatch',
  async () => {
    const sources = await Promise.all([
      readFile(new URL('../src/reasoning/typed-evidence-comparison.mjs', import.meta.url), 'utf8'),
      readFile(new URL('../src/reasoning/typed-event-evidence.mjs', import.meta.url), 'utf8'),
    ]);
    const combined = sources.join('\n').toLocaleLowerCase('en-US');
    for (const forbidden of [
      'defeasible nli', 'alpha-nli', 'alphanli', 'story_id', 'atomicrelation', 'snlipair',
      'socialchemsituation', 'expectedanswer', 'benchmarkname', 'datasetid', 'source row',
    ]) {
      assert.equal(combined.includes(forbidden), false, `generic core contains ${forbidden}`);
    }
  });
