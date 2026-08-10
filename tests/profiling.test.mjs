import test from 'node:test';
import assert from 'node:assert/strict';
import { EslmEngine } from '../src/engine.mjs';
import { loadModel } from '../src/model-loader.mjs';

test('opt-in query profiling reports initialization and semantic stages', async () => {
  const engine = new EslmEngine(await loadModel(), { profile: true });
  const result = engine.ask('Mice are afraid of wolves. Gertrude is a mouse. What is Gertrude afraid of?');
  assert.equal(result.status, 'ANSWERED');
  assert.equal(result.profile.initialization.format, 'eslm-profile-v1');
  assert.equal(result.profile.query.format, 'eslm-profile-v1');
  const names = result.profile.query.stages.map((stage) => stage.name);
  assert.equal(names.includes('language.compile-session'), true);
  assert.equal(names.includes('language.parse-question'), true);
  assert.equal(names.includes('reasoning.session-closure'), true);
  assert.equal(names.includes('retrieval.answer'), true);
  assert.equal(names.includes('language.realize'), true);
  assert.equal(result.profile.query.stages.every((stage) => stage.durationMs >= 0), true);
});

test('profiling is absent from the default low-overhead response', async () => {
  const result = new EslmEngine(await loadModel()).ask('What is Gertrude afraid of?');
  assert.equal('profile' in result, false);
});
