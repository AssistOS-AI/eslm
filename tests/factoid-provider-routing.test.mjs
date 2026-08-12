import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFactoidQuestion } from '../src/language/factoid-question.mjs';
import {
  routeDirectProviderQuestion, routeFactoidQuestion,
} from '../src/reasoning/factoid-provider-router.mjs';
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
  assert.equal(routed.result.status, 'SOLVED');
  assert.deepEqual(routed.result.values, ['blue-sigil']);
  assert.equal(routed.result.query.factoidFrame.subjectSurface, 'Teskal');
});

test('a provider failure on the original surface does not hide an answer to an equivalent candidate', async () => {
  const calls = [];
  const source = provider('source-a', new Map());
  source.ask = async (text) => {
    calls.push(text);
    if (text === "What is Teskal's anchor mark?") {
      return { status: 'UNKNOWN', answer: 'unknown', values: [], provenance: [] };
    }
    if (text === 'What is the anchor mark of Teskal?') {
      return {
        status: 'ANSWERED', answer: 'blue-sigil', values: ['blue-sigil'],
        provenance: [{ fact: 'source-a:mark', source: ['source-a'] }],
        query: { provider: 'source-a' }, reasoning: { method: 'nonce-retrieval' },
      };
    }
    return undefined;
  };
  const routed = await routeFactoidQuestion([source], "What is Teskal's anchor mark?");
  assert.deepEqual(routed.result.values, ['blue-sigil']);
  assert.deepEqual(calls, ["What is Teskal's anchor mark?", 'What is the anchor mark of Teskal?']);
});

test('router is invariant to provider order when independent values agree', async () => {
  const question = 'Who calibrates the zindle?';
  const left = provider('left', new Map([[question, ['Mira']]]));
  const right = provider('right', new Map([[question, ['mira']]]));
  const forward = await routeFactoidQuestion([left, right], question);
  const reverse = await routeFactoidQuestion([right, left], question);
  assert.equal(forward.result.status, 'SOLVED');
  assert.equal(reverse.result.status, 'SOLVED');
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

test('provider-specific operations are also independent of registration order', async () => {
  const question = 'Is a zindle a tool?';
  const affirmative = provider('a-source', new Map([[question, [true]]]));
  const negative = provider('z-source', new Map([[question, [false]]]));
  for (const order of [[affirmative, negative], [negative, affirmative]]) {
    const routed = await routeDirectProviderQuestion(order, question);
    assert.equal(routed.result.status, 'AMBIGUOUS');
    assert.deepEqual(routed.result.alternatives.map((item) => item.provider), ['a-source', 'z-source']);
    assert.deepEqual(new Set(routed.result.values), new Set([true, false]));
  }
});

test('equivalent provider-specific answers use stable provider identity and merged provenance', async () => {
  const question = 'Is a zindle a tool?';
  const first = provider('a-source', new Map([[question, [true]]]));
  const second = provider('z-source', new Map([[question, [true]]]));
  const forward = await routeDirectProviderQuestion([second, first], question);
  const reverse = await routeDirectProviderQuestion([first, second], question);
  assert.deepEqual(forward.result, reverse.result);
  assert.deepEqual(forward.result.query.routedProviders, ['a-source', 'z-source']);
  assert.equal(forward.result.provenance.length, 2);
});

test('agreement cannot upgrade a defeasible provider answer to strict SOLVED', async () => {
  const question = 'What tunes the nonce reed?';
  const strict = provider('strict-source', new Map([[question, ['fork']]]));
  const defeasible = provider('defeasible-source', new Map([[question, ['fork']]]));
  defeasible.ask = async () => ({
    status: 'DEFEASIBLE', answer: 'fork', values: ['fork'],
    provenance: [{ fact: 'defeasible-source:fork', source: ['defeasible-source'] }],
    query: { provider: 'defeasible-source' }, reasoning: { method: 'nonce-default' },
  });
  for (const order of [[strict, defeasible], [defeasible, strict]]) {
    const routed = await routeFactoidQuestion(order, question);
    assert.equal(routed.result.status, 'DEFEASIBLE');
    assert.deepEqual(routed.result.values, ['fork']);
    assert.deepEqual(routed.result.reasoning.providerStatuses, [
      { provider: 'defeasible-source', status: 'DEFEASIBLE' },
      { provider: 'strict-source', status: 'SOLVED' },
    ]);
  }
});

test('incompatible no-value provider outcomes become explicit ambiguity', async () => {
  const question = 'Explain the qorin state';
  const first = provider('a-source', new Map([[question, []]]));
  const second = provider('z-source', new Map([[question, []]]));
  first.ask = async () => ({ status: 'UNKNOWN', answer: 'unknown', values: [], provenance: [] });
  second.ask = async () => ({ status: 'RESOURCE_LIMIT', answer: 'limited', values: [], provenance: [] });
  const routed = await routeDirectProviderQuestion([second, first], question);
  assert.equal(routed.result.status, 'AMBIGUOUS');
  assert.deepEqual(routed.result.alternatives.map((item) => [item.provider, item.status]), [
    ['a-source', 'UNKNOWN'], ['z-source', 'RESOURCE_LIMIT'],
  ]);
});

test('router returns no fabricated result when no provider has evidence', async () => {
  const routed = await routeFactoidQuestion([provider('empty', new Map())], 'Who forged the plorin?');
  assert.equal(routed.frame.kind, 'factoid-question');
  assert.equal(routed.result, undefined);
});

test('provider lifecycle failures are diagnosed and cannot leak a partial factoid answer', async () => {
  const question = 'Who forged the plorin?';
  const working = provider('working', new Map([[question, ['Nera']]]));
  const cleanupBroken = provider('cleanup-broken', new Map([[question, ['forged-answer']]]));
  cleanupBroken.endQuery = () => { throw new Error('factoid cleanup nonce'); };
  let beganOperation = false;
  let beginFailureCleanup = 0;
  const beginBroken = provider('begin-broken', new Map([[question, ['forged-answer']]]));
  beginBroken.beginQuery = () => { throw new Error('factoid begin nonce'); };
  beginBroken.endQuery = () => { beginFailureCleanup += 1; };
  beginBroken.ask = async () => { beganOperation = true; return undefined; };

  const routed = await routeFactoidQuestion([working, cleanupBroken, beginBroken], question);
  assert.equal(routed.result.status, 'SOLVED');
  assert.deepEqual(routed.result.values, ['Nera']);
  assert.equal(beganOperation, false);
  assert.equal(beginFailureCleanup, 1);
  assert.deepEqual(routed.providerErrors.map((item) => item.stage), ['beginQuery', 'endQuery']);
});

function unparsedCore() {
  return {
    profileEnabled: false,
    model: { manifest: { modelId: 'nonce-core' } },
    ask() {
      return {
        protocol: 'eslm-runtime-result-v1', status: 'UNPARSED', answer: 'unsupported',
        values: [], provenance: [], usedKbVersions: [], selectedKbVersions: [], consultedKbVersions: [],
        unresolvedSubgoals: [], languageRoute: 'direct-symbolic',
        context: { session: { entities: [], facts: [], rules: [], history: [] } },
        episode: { original: 'unsupported', segments: ['unsupported'], unsupportedStatements: ['unsupported'] },
        model: { id: 'nonce-core', benchmarkComparable: false },
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
