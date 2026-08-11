import test from 'node:test';
import assert from 'node:assert/strict';
import { compileNarrativeSentence, compileNarrativeSequence } from '../src/reasoning/narrative-state.mjs';
import { selectNarrativeContinuation } from '../src/reasoning/continuation-selection.mjs';
import { collectCompatibilityEvidence } from '../src/public-kb-providers/compatibility-evidence.mjs';

function task(sentences, candidates, options = {}) {
  return {
    operation: 'select-narrative-continuation',
    narrative: compileNarrativeSequence(sentences),
    candidates: candidates.map((surface, index) => ({
      candidateId: `candidate:nonce-${index + 1}`,
      event: compileNarrativeSentence(surface, sentences.length),
    })),
    policy: { minimumMargin: 1, ...options.policy },
    semanticEvidence: options.semanticEvidence,
  };
}

function typedEvidence(semanticFamily, scores) {
  return [{
    providerId: 'kb:nonce-semantics',
    semanticType: 'provider-neutral-semantic-compatibility-v1',
    candidates: scores.map((score, index) => ({
      candidateId: `candidate:nonce-${index + 1}`,
      support: [{
        relation: `nonce-${semanticFamily}-relation`,
        semanticFamily,
        score,
        sourceRef: `kb:nonce-semantics:${semanticFamily}:${index + 1}`,
        matchType: score < 0 ? 'declared-semantic-conflict' : 'declared-semantic-support',
      }],
    })),
  }];
}

test('narrative continuation ranking uses participant and state bridges with an explicit witness', () => {
  const input = task([
    'Zorlin repaired the glider.',
    'The glider motor started.',
  ], [
    'Zorlin flew the glider home.',
    'Pavex buried an unrelated spoon.',
  ]);
  const result = selectNarrativeContinuation(input);
  assert.equal(result.status, 'DEFEASIBLE');
  assert.equal(result.values[0], 'candidate:nonce-1');
  assert.equal(result.witness.method, 'bounded-feature-ranking');
  assert.ok(result.rankings[0].features.some((item) => item.id === 'recent-content-bridge'
    && item.provenance.includes('narrative:token:glider')));
});

test('fully renamed narrative structure preserves the same selection', () => {
  const input = task([
    'Mirel calibrated the thalen.',
    'The thalen rotor started.',
  ], [
    'Mirel guided the thalen home.',
    'Kovax folded an unrelated prism.',
  ]);
  assert.equal(selectNarrativeContinuation(input).values[0], 'candidate:nonce-1');
});

test('provider semantic metadata can support a lexically novel continuation without hiding provenance', () => {
  const input = task([
    'Aven completed the ritual.',
  ], [
    'The crowd celebrated.',
    'The harbor evaporated.',
  ], {
    semanticEvidence: [{
      providerId: 'kb:nonce-events',
      semanticType: 'defeasible-event-continuation-support-v1',
      candidates: [{
        candidateId: 'candidate:nonce-1',
        support: [{
          relation: 'consequence', score: 0.8,
          sourceRef: 'kb:nonce-events:record:42', matchType: 'declared-event-consequence',
        }],
      }],
    }],
  });
  const result = selectNarrativeContinuation(input);
  assert.equal(result.values[0], 'candidate:nonce-1');
  const providerFeature = result.rankings[0].features.find((item) => item.id.startsWith('provider-event:'));
  assert.deepEqual(providerFeature.provenance, [
    'kb:nonce-events:record:42', 'consequence', 'declared-event-consequence',
  ]);
});

test('causal and goal evidence remain distinct bounded mechanisms', () => {
  for (const semanticFamily of ['causal', 'goal']) {
    const input = task(['Ruvan initiated a nonce process.'], [
      'The first nonce state followed.',
      'The second nonce state followed.',
    ], {
      semanticEvidence: typedEvidence(semanticFamily, [0.8, 0]),
      policy: { featureWeights: { [`provider-${semanticFamily}`]: 600 } },
    });
    const result = selectNarrativeContinuation(input);
    assert.equal(result.values[0], 'candidate:nonce-1');
    assert.ok(result.rankings[0].features.some((item) =>
      item.id.startsWith(`provider-${semanticFamily}:`) && item.contribution > 0));
  }
});

test('social and contradiction evidence can defeat a surface-similar continuation', () => {
  for (const semanticFamily of ['social', 'contradiction']) {
    const input = task(['Tovin and Mera completed the nonce exchange.'], [
      'Tovin and Mera repeated the nonce exchange.',
      'Tovin and Mera concluded the nonce exchange.',
    ], {
      semanticEvidence: typedEvidence(semanticFamily, [-0.9, 0.7]),
      policy: { featureWeights: { [`provider-${semanticFamily}`]: 700 } },
    });
    const result = selectNarrativeContinuation(input);
    assert.equal(result.values[0], 'candidate:nonce-2');
    const rejected = result.rankings.find((item) => item.candidateId === 'candidate:nonce-1');
    assert.ok(rejected.features.some((item) =>
      item.id.startsWith(`provider-${semanticFamily}:`) && item.contribution < 0));
  }
});

test('renaming all narrative surfaces preserves typed semantic selection', () => {
  const evidence = typedEvidence('causal', [0, 0.9]);
  const first = task(['Neral performed the vak ritual.'], [
    'Neral observed the vak object.',
    'Neral reached the declared vak consequence.',
  ], { semanticEvidence: evidence });
  const renamed = task(['Poval performed the zim procedure.'], [
    'Poval observed the zim artifact.',
    'Poval reached the declared zim outcome.',
  ], { semanticEvidence: evidence });
  assert.equal(selectNarrativeContinuation(first).values[0], 'candidate:nonce-2');
  assert.equal(selectNarrativeContinuation(renamed).values[0], 'candidate:nonce-2');
});

test('provider-neutral compatibility evidence preserves support and contradiction signs', async () => {
  const input = task(['Neral placed the vial inside the case.'], [
    'The vial remained inside the case.',
    'The vial was outside the case.',
  ]);
  const provider = {
    manifest: { id: 'kb:nonce-relations', kbVersion: '1' },
    async scoreCompatibility(context, target) {
      assert.match(context, /inside/u);
      return target.includes('remained')
        ? { score: 3, evidence: [{ relation: 'containment', contribution: 3, proof: ['declared:inside'] }] }
        : { score: -3, evidence: [{ relation: 'containment', contribution: -3, proof: ['inverse:outside'] }] };
    },
  };
  const evidence = await collectCompatibilityEvidence(provider, {
    kind: 'event-continuation-ranking', narrative: input.narrative, candidates: input.candidates,
  });
  assert.ok(evidence.candidates[0].support[0].score > 0);
  assert.ok(evidence.candidates[1].support[0].score < 0);
  assert.match(evidence.candidates[1].support[0].sourceRef, /inverse:outside/u);
  const result = selectNarrativeContinuation({ ...input, semanticEvidence: [evidence] });
  assert.equal(result.values[0], 'candidate:nonce-1');
});

test('indistinguishable candidate structures abstain instead of using candidate order', () => {
  const input = task(['Vela waited by the arch.'], [
    'Luma danced near the pond.',
    'Nero danced near the hill.',
  ]);
  const result = selectNarrativeContinuation(input);
  assert.equal(result.status, 'UNKNOWN');
  assert.deepEqual(result.values, []);
  assert.equal(result.uncertainty.kind, 'score-tie-or-insufficient-margin');
});

test('meaning-changing polarity conflict remains visible as a negative contribution', () => {
  const input = task([
    'Sorin did not repair the engine.',
  ], [
    'Sorin repaired the engine.',
    'Sorin inspected the engine.',
  ]);
  const result = selectNarrativeContinuation(input);
  const conflicting = result.rankings.find((item) => item.candidateId === 'candidate:nonce-1');
  const conflict = conflicting.features.find((item) => item.id === 'polarity-conflict');
  assert.equal(conflict.value, 1);
  assert.ok(conflict.contribution < 0);
});

test('narrative task validation rejects untyped candidate payloads', () => {
  const result = selectNarrativeContinuation({
    operation: 'select-narrative-continuation',
    narrative: compileNarrativeSequence(['Tovan waited.']),
    candidates: [{ candidateId: 'candidate:one' }, { candidateId: 'candidate:two' }],
  });
  assert.equal(result.status, 'UNPARSED');
  assert.match(result.diagnostic, /event frame/u);
});
