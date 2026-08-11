import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFactoidQuestion } from '../src/language/factoid-question.mjs';
import { routeFactoidQuestion } from '../src/reasoning/factoid-provider-router.mjs';
import { EslmRuntime } from '../src/runtime/runtime.mjs';

function provider(id, answers) {
  return {
    manifest: { id },
    async ask(text) {
      const value = answers.get(text);
      if (value === undefined) return undefined;
      return {
        status: value.length > 0 ? 'ANSWERED' : 'UNKNOWN', values: value,
        answer: value.join(', '), provenance: [{ fact: `${id}:nonce`, source: [id] }],
        query: { provider: id }, reasoning: { method: 'nonce-retrieval' },
      };
    },
  };
}

test('factoid frontend preserves a typed property request under complete nonce renaming', () => {
  const first = parseFactoidQuestion("What is Novera's chief glyph?");
  const renamed = parseFactoidQuestion("What is Teskal's anchor mark?");
  assert.deepEqual(
    [first.construction, first.direction, first.wh],
    [renamed.construction, renamed.direction, renamed.wh],
  );
  assert.equal(first.subjectSurface, 'Novera');
  assert.equal(first.relationSurface, 'chief glyph');
  assert.equal(first.candidates[1].text, 'What is the chief glyph of Novera?');
  assert.equal(renamed.candidates[1].text, 'What is the anchor mark of Teskal?');
});

test('factoid frontend distinguishes a meaning-changing relation control', () => {
  const property = parseFactoidQuestion("What is Vesk's origin seal?");
  const location = parseFactoidQuestion('Where can Vesk be found?');
  assert.equal(property.construction, 'possessive-property');
  assert.equal(location.construction, 'location');
  assert.equal(location.relationSurface, 'location');
  assert.notEqual(property.relationSurface, location.relationSurface);
});

test('definition paraphrase preserves the requested lemma as data', () => {
  const frame = parseFactoidQuestion('What is the meaning of glorp?');
  assert.equal(frame.construction, 'definition');
  assert.equal(frame.subjectSurface, 'glorp');
  assert.equal(frame.candidates[1].text, 'What does glorp mean?');
});

test('router reaches a provider through an equivalent generic paraphrase', async () => {
  const source = provider('source-a', new Map([
    ['What is the anchor mark of Teskal?', ['blue-sigil']],
  ]));
  const routed = await routeFactoidQuestion([source], "What is Teskal's anchor mark?");
  assert.equal(routed.result.status, 'ANSWERED');
  assert.deepEqual(routed.result.values, ['blue-sigil']);
  assert.equal(routed.result.query.factoidFrame.subjectSurface, 'Teskal');
});

test('router is invariant to provider order when independent values agree', async () => {
  const question = 'Who calibrates the zindle?';
  const left = provider('left', new Map([[question, ['Mira']]]));
  const right = provider('right', new Map([[question, ['mira']]]));
  const forward = await routeFactoidQuestion([left, right], question);
  const reverse = await routeFactoidQuestion([right, left], question);
  assert.equal(forward.result.status, 'ANSWERED');
  assert.equal(reverse.result.status, 'ANSWERED');
  assert.deepEqual(forward.result.query.routedProviders, ['left', 'right']);
  assert.deepEqual(reverse.result.query.routedProviders, ['left', 'right']);
});

test('router preserves disagreement as ambiguity rather than selecting the first provider', async () => {
  const question = 'What tunes the qorim?';
  const one = provider('one', new Map([[question, ['fork']]]));
  const two = provider('two', new Map([[question, ['reed']]]));
  for (const order of [[one, two], [two, one]]) {
    const routed = await routeFactoidQuestion(order, question);
    assert.equal(routed.result.status, 'AMBIGUOUS');
    assert.deepEqual(new Set(routed.result.values), new Set(['fork', 'reed']));
  }
});

test('router returns no fabricated result when no provider has evidence', async () => {
  const routed = await routeFactoidQuestion([provider('empty', new Map())], 'Who forged the plorin?');
  assert.equal(routed.frame.kind, 'factoid-question');
  assert.equal(routed.result, undefined);
});

function unparsedCore() {
  return {
    profileEnabled: false,
    model: { manifest: { modelId: 'nonce-core' } },
    ask() {
      return {
        protocol: 'eslm-runtime-result-v1', status: 'UNPARSED', answer: 'unsupported',
        values: [], provenance: [], model: { id: 'nonce-core', benchmarkComparable: false },
      };
    },
  };
}

test('runtime returns UNKNOWN for a parsed factoid with no provider evidence', async () => {
  const empty = provider('empty', new Map());
  empty.manifest = { id: 'empty', kbId: 'empty', kbVersion: '1' };
  const runtime = new EslmRuntime(unparsedCore(), [empty], ['empty']);
  const result = await runtime.ask('Who forged the plorin?');
  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.reasoning.gap, 'no-provider-evidence');
  assert.equal(result.query.factoidFrame.wh, 'who');
});

test('runtime retains non-factoid provider operations outside the new frontend', async () => {
  const taxonomy = provider('taxonomy', new Map([['Is a zindle a tool?', [true]]]));
  taxonomy.manifest = { id: 'taxonomy', kbId: 'taxonomy', kbVersion: '1' };
  const runtime = new EslmRuntime(unparsedCore(), [taxonomy], ['taxonomy']);
  const result = await runtime.ask('Is a zindle a tool?');
  assert.equal(result.status, 'SOLVED');
  assert.deepEqual(result.values, [true]);
});
