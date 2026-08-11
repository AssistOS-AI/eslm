import test from 'node:test';
import assert from 'node:assert/strict';
import { EslmEngine } from '../src/runtime/engine.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';
import {
  interactiveExamplePage, interactiveExamples, interactiveResultText, interactiveSmoke,
} from '../src/interface/interactive-presenter.mjs';

const style = Object.freeze({
  blue: String, bold: String, dim: String, green: String, magenta: String, red: String,
  yellow: String, status: (_status, text) => text ?? _status,
});

test('examples uses deterministic 24-case pages from the executable smoke catalog', () => {
  assert.deepEqual(interactiveExamplePage('2 review-seed'), {
    page: 2, seed: 'review-seed', pageCount: 171,
  });
  const first = interactiveExamples(style, 'review-seed', 1);
  const second = interactiveExamples(style, 'review-seed', 2);
  assert.match(first, /Page: 1 of 171/u);
  assert.match(second, /Page: 2 of 171/u);
  assert.equal((first.match(/Template:/gu) ?? []).length, 24);
  assert.equal((second.match(/Template:/gu) ?? []).length, 24);
  assert.notEqual(first, second);
});

test('smoke output displays representative input, expected contract, and actual runtime response', async () => {
  const engine = new EslmEngine(await createCoreModel());
  const output = await interactiveSmoke(engine, [], style, 'review-seed', 24);
  assert.match(output, /Input:/u);
  assert.match(output, /Expected:/u);
  assert.match(output, /Actual:/u);
  assert.match(output, /24 passed, 0 failed, 0 skipped/u);
  assert.equal((output.match(/^PASS \[/gmu) ?? []).length, 24);
});

test('accepted Language Agent normalization is shown as original, transformation, and symbolic result', () => {
  const output = interactiveResultText({
    status: 'SOLVED', answer: 'I am ready.', languageRoute: 'language-agent-normalized',
    normalization: {
      cacheHit: false,
      candidate: { operation: 'translation', normalizedEnglish: 'How are you?' },
    },
  }, 'Ce mai faci?', style);
  assert.match(output, /Original: Ce mai faci\?/u);
  assert.match(output, /Translation: How are you\?/u);
  assert.match(output, /Symbolic result: \[SOLVED\] I am ready\./u);
});
