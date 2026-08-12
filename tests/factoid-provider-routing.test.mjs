import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFactoidQuestion } from '../src/language/factoid-question.mjs';
import {
  routeDirectProviderQuestion, routeFactoidQuestion,
} from '../src/reasoning/factoid-provider-router.mjs';
import { EslmRuntime } from '../src/runtime/runtime.mjs';
import { resolveWorkPolicy } from '../src/runtime/work-policy.mjs';

function provider(id, answers) {
  return {
    manifest: { id },
    async ask(text) {
      const value = answers.get(text);
      if (value === undefined) return undefined;
      return {
        status: value.length > 0 ? 'ANSWERED' : 'UNKNOWN', values: value,
        answer: value.join(', '), provenance: [{ fact: `${id}:nonce`, source: [id] }],
        query: { provider: id }, reasoning: {
          method: 'nonce-retrieval', methodId: 'method:core:indexed-lookup',
        },
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
      return {
        status: 'UNKNOWN', answer: 'unknown', values: [], provenance: [],
        reasoning: { method: 'nonce-retrieval', methodId: 'method:core:indexed-lookup' },
      };
    }
    if (text === 'What is the anchor mark of Teskal?') {
      return {
        status: 'ANSWERED', answer: 'blue-sigil', values: ['blue-sigil'],
        provenance: [{ fact: 'source-a:mark', source: ['source-a'] }],
        query: { provider: 'source-a' }, reasoning: {
          method: 'nonce-retrieval', methodId: 'method:core:indexed-lookup',
        },
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
    query: { provider: 'defeasible-source' }, reasoning: {
      method: 'nonce-default', methodId: 'method:core:indexed-lookup',
    },
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
  first.ask = async () => ({
    status: 'UNKNOWN', answer: 'unknown', values: [], provenance: [],
    reasoning: { method: 'nonce-retrieval', methodId: 'method:core:indexed-lookup' },
  });
  second.ask = async () => ({
    status: 'RESOURCE_LIMIT', answer: 'limited', values: [], provenance: [],
    reasoning: { method: 'nonce-retrieval', methodId: 'method:core:indexed-lookup' },
  });
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

test('provider-source and paraphrase bounds refuse incomplete routing before claiming absence', async () => {
  const question = "What is Teskal's anchor mark?";
  const first = provider('first', new Map([[question, ['amber']]]));
  const second = provider('second', new Map([[question, ['cobalt']]]));
  const sourceBound = await routeFactoidQuestion([first, second], question, {
    maximumSources: 1,
    maximumParaphrases: 2,
  });
  assert.equal(sourceBound.result.status, 'RESOURCE_LIMIT');
  assert.deepEqual(sourceBound.consultedProviders, []);

  const paraphraseBound = await routeFactoidQuestion([first], question, {
    maximumSources: 1,
    maximumParaphrases: 1,
  });
  assert.equal(paraphraseBound.result.status, 'RESOURCE_LIMIT');
  assert.deepEqual(paraphraseBound.consultedProviders, []);
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

test('a provider result whose method differs from its predeclared method is discarded', async () => {
  const question = 'Who forged the plorin?';
  const mismatched = provider('mismatched', new Map());
  mismatched.reasoningMethodForQuestion = () => 'method:core:indexed-lookup';
  mismatched.ask = async () => ({
    status: 'SOLVED', answer: 'Nera', values: ['Nera'],
    provenance: [{ fact: 'mismatched:record', source: ['mismatched:source'] }],
    reasoning: {
      method: 'bounded-deduction', methodId: 'method:core:safe-horn-deduction',
    },
  });
  const routed = await routeFactoidQuestion([mismatched], question);
  assert.equal(routed.result, undefined);
  assert.deepEqual(routed.consultedProviders, [{ kbId: 'mismatched', version: undefined }]);
  assert.equal(routed.providerErrors.length, 1);
  assert.equal(routed.providerErrors[0].stage, 'operation');
  assert.match(routed.providerErrors[0].diagnostic, /does not match declared/u);
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

test('exact reasoning selection excludes provider lookup before any provider operation', async () => {
  let calls = 0;
  const source = provider('renamed-source', new Map([
    ['Who forged the plorin?', ['Nera']],
    ['Is a zindle a tool?', [true]],
  ]));
  source.manifest = { id: 'renamed-source', kbId: 'renamed-kb', kbVersion: '7' };
  source.ask = async (text) => {
    calls += 1;
    const values = text === 'Who forged the plorin?' ? ['Nera']
      : text === 'Is a zindle a tool?' ? [true] : [];
    return values.length > 0 ? {
      status: 'SOLVED', answer: values.join(', '), values,
      provenance: [{ fact: 'renamed-kb:record', source: ['renamed-kb:source'] }],
      query: { provider: 'renamed-source' }, reasoning: {
        method: 'nonce-retrieval', methodId: 'method:core:indexed-lookup',
      },
    } : undefined;
  };
  const policy = resolveWorkPolicy({
    strategies: { selected: {
      'runtime.reason.execute': ['strategy:core:categorical-logic@1'],
    } },
  });
  const runtime = new EslmRuntime(unparsedCore(), [source], ['renamed-kb'], undefined, policy);

  const factoid = await runtime.ask('Who forged the plorin?', {}, { grounding: false });
  assert.equal(factoid.status, 'NO_APPLICABLE_METHOD');
  assert.equal(factoid.reasoning.gap, 'method-not-selected-by-strategy-policy');
  assert.equal(factoid.plan.methodId, undefined);
  assert.deepEqual(factoid.consultedKbVersions, []);
  assert.equal(calls, 0);

  const providerSpecific = await runtime.ask('Is a zindle a tool?', {}, { grounding: false });
  assert.equal(providerSpecific.status, 'NO_APPLICABLE_METHOD');
  assert.deepEqual(providerSpecific.consultedKbVersions, []);
  assert.equal(calls, 0);
});

test('exact indexed-lookup selection admits the same renamed provider route', async () => {
  let calls = 0;
  const source = provider('renamed-source', new Map([['Who forged the plorin?', ['Nera']]]));
  source.manifest = { id: 'renamed-source', kbId: 'renamed-kb', kbVersion: '7' };
  const originalAsk = source.ask;
  source.ask = async (text) => {
    calls += 1;
    return originalAsk(text);
  };
  const policy = resolveWorkPolicy({
    strategies: { selected: {
      'runtime.reason.execute': ['strategy:core:indexed-lookup@1'],
    } },
  });
  const runtime = new EslmRuntime(unparsedCore(), [source], ['renamed-kb'], undefined, policy);

  const result = await runtime.ask('Who forged the plorin?', {}, { grounding: false });
  assert.equal(result.status, 'SOLVED');
  assert.equal(result.plan.methodId, 'method:core:indexed-lookup');
  assert.deepEqual(result.values, ['Nera']);
  assert.ok(calls > 0);
});

test('a provider-declared deduction route requires safe Horn selection before execution', async () => {
  let calls = 0;
  const source = provider('renamed-taxonomy', new Map([['Is a zindle a tool?', [true]]]));
  source.manifest = { id: 'renamed-taxonomy', kbId: 'renamed-taxonomy-kb', kbVersion: '3' };
  source.reasoningMethodForQuestion = () => 'method:core:safe-horn-deduction';
  const originalAsk = source.ask;
  source.ask = async (text) => {
    calls += 1;
    const result = await originalAsk(text);
    return result ? {
      ...result,
      reasoning: { ...result.reasoning, methodId: 'method:core:safe-horn-deduction' },
    } : result;
  };
  const indexedOnly = resolveWorkPolicy({ strategies: { selected: {
    'runtime.reason.execute': ['strategy:core:indexed-lookup@1'],
  } } });
  const blocked = new EslmRuntime(
    unparsedCore(), [source], ['renamed-taxonomy-kb'], undefined, indexedOnly,
  );
  const gap = await blocked.ask('Is a zindle a tool?', {}, { grounding: false });
  assert.equal(gap.status, 'NO_APPLICABLE_METHOD');
  assert.deepEqual(gap.plan.excludedMethods, ['method:core:safe-horn-deduction']);
  assert.equal(calls, 0);

  const deductionOnly = resolveWorkPolicy({ strategies: { selected: {
    'runtime.reason.execute': ['strategy:core:safe-horn-deduction@1'],
  } } });
  const admitted = new EslmRuntime(
    unparsedCore(), [source], ['renamed-taxonomy-kb'], undefined, deductionOnly,
  );
  const answer = await admitted.ask('Is a zindle a tool?', {}, { grounding: false });
  assert.equal(answer.status, 'SOLVED');
  assert.equal(answer.plan.methodId, 'method:core:safe-horn-deduction');
  assert.deepEqual(answer.reasoning.routedMethodIds, ['method:core:safe-horn-deduction']);
  assert.equal(calls, 1);
});
