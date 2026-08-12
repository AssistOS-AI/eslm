import test from 'node:test';
import assert from 'node:assert/strict';
import { loadKnowledgeBase, mergeModels } from '../src/kbs.mjs';
import {
  createGroundingBundle, createGroundingRequest, groundingTerms, makeGroundingEntry,
  shouldRetrieveGrounding,
} from '../src/reasoning/grounding-retrieval.mjs';
import {
  createSessionGroundingProjection, retrieveSessionGrounding,
} from '../src/reasoning/grounding-model-retrieval.mjs';
import { EslmEngine } from '../src/runtime/engine.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';
import { EslmRuntime } from '../src/runtime/runtime.mjs';

async function quickRuntime() {
  const model = mergeModels(await createCoreModel(), [await loadKnowledgeBase('quick')]);
  return new EslmRuntime(new EslmEngine(model), [], ['quick']);
}

function entry(kbId, recordId, score = 1) {
  return makeGroundingEntry({
    kbId,
    kbVersion: '1',
    recordId,
    statement: `${recordId} is a bounded related record.`,
    semantic: { subject: recordId, predicate: 'related_to', object: 'question' },
    provenance: [`source:${recordId}`],
    relevance: { score, reasons: ['nonce-term-match'] },
  });
}

test('unknown answers remain unsupported while related QUICK records are separate grounding', async () => {
  const result = await (await quickRuntime()).ask('Can Penguin fly?');
  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.answer, 'I understand the question, but I do not have evidence for a yes or no answer.');
  assert.deepEqual(result.values, []);
  assert.deepEqual(result.provenance, []);
  assert.deepEqual(result.usedKbVersions, []);
  assert.deepEqual(result.selectedKbVersions, [{ kbId: 'quick', version: '1.0.0' }]);
  assert.equal(result.grounding.answerSupported, false);
  assert.equal(result.grounding.status, 'RELATED_EVIDENCE_FOUND');
  assert.ok(result.grounding.entries.some((item) => item.statement === 'Penguin can swim.'));
  assert.deepEqual(result.grounding.search.receipts.map((item) => item.kbId), ['quick']);
});

test('a solved answer has contributor versions and does not run failure grounding', async () => {
  const result = await (await quickRuntime()).ask('Can Penguin swim?');
  assert.equal(result.status, 'SOLVED');
  assert.deepEqual(result.usedKbVersions, [{ kbId: 'quick', version: '1.0.0' }]);
  assert.equal(result.grounding, undefined);
});

test('duplicate semantic facts retain every contributing KB identity', async () => {
  const quick = await loadKnowledgeBase('quick');
  const second = structuredClone(quick);
  second.manifest = {
    ...second.manifest,
    modelId: 'second-source@2',
    knowledgeBases: ['second-source'],
    knowledgeBaseVersions: [{ kbId: 'second-source', version: '2' }],
  };
  second.facts = second.facts.map((fact) => ({
    ...fact,
    id: `second:${fact.id}`,
    kbId: 'second-source',
    kbVersion: '2',
    kbSources: [{ kbId: 'second-source', version: '2' }],
    provenance: ['prov:second'],
  }));
  second.rules = second.rules.map((rule) => ({
    ...rule,
    id: `second:${rule.id}`,
    kbId: 'second-source',
    kbVersion: '2',
    kbSources: [{ kbId: 'second-source', version: '2' }],
    source: 'prov:second',
  }));
  const model = mergeModels(await createCoreModel(), [quick, second]);
  const result = new EslmEngine(model).ask('Can Penguin swim?');
  assert.deepEqual(result.usedKbVersions, [
    { kbId: 'quick', version: '1.0.0' },
    { kbId: 'second-source', version: '2' },
  ]);
  assert.deepEqual(result.provenance[0].kbSources, result.usedKbVersions);

  const failed = await new EslmRuntime(new EslmEngine(model), [], [
    'quick', 'second-source',
  ]).ask('Write a report about Penguin.');
  const sourceReceipts = failed.grounding.search.receipts.filter((receipt) =>
    ['quick', 'second-source'].includes(receipt.kbId));
  assert.deepEqual(sourceReceipts.map((receipt) => receipt.status),
    ['matches-found', 'matches-found']);
  assert.ok(sourceReceipts.every((receipt) => receipt.candidatesConsidered > 0));
  assert.ok(failed.grounding.entries.some((entry) => entry.statement === 'Penguin is a bird.'
    && entry.contributingKbVersions.length === 2));
});

test('grounding fact realization selects a grammatical indefinite article', async () => {
  const model = await createCoreModel();
  model.manifest = {
    ...model.manifest,
    modelId: 'article-grounding',
    knowledgeBases: ['article-grounding'],
    knowledgeBaseVersions: [{ kbId: 'article-grounding', version: '1' }],
  };
  model.entities = [{ id: 'dog', names: ['Dog'], kind: 'entity' }];
  model.facts = [{
    id: 'fact:dog:animal', subject: 'dog', predicate: 'is_a', value: 'animal',
    kbId: 'article-grounding', kbVersion: '1',
    kbSources: [{ kbId: 'article-grounding', version: '1' }],
    provenance: ['source:dog'],
  }];
  const result = await new EslmRuntime(new EslmEngine(model), [], [
    'article-grounding',
  ]).ask('Write a report about Dog.');
  assert.ok(result.grounding.entries.some((entry) => entry.statement === 'Dog is an animal.'));
});

test('configured induction attributes the policy KB instead of every selected package', async () => {
  const model = mergeModels(await createCoreModel(), [await loadKnowledgeBase('babi-v1.2-language')]);
  const result = new EslmEngine(model).ask(
    'Ari is a zorb. Bela is a zorb. Cora is a zorb. Ari is yellow. Cora is green. What color is Bela?',
  );
  assert.equal(result.status, 'DEFEASIBLE');
  assert.deepEqual(result.usedKbVersions, [{ kbId: 'babi-v1.2-language', version: '1.0.0' }]);
});

test('unparsed input retrieves by original surface and includes previously committed session facts', async () => {
  const runtime = await quickRuntime();
  const learned = await runtime.ask('Zara is a pilot.');
  const result = await runtime.ask('Write a report about Zara.', learned.context);
  assert.equal(result.status, 'UNPARSED');
  assert.equal(result.context.session.facts.length, 1);
  assert.deepEqual(result.usedKbVersions, []);
  assert.ok(result.grounding.entries.some((item) =>
    item.kbId === 'session' && item.statement === 'Zara is a pilot.'));
  assert.ok(result.grounding.search.receipts.some((item) => item.kbId === 'session'));
  assert.deepEqual(result.consultedKbVersions, [{ kbId: 'quick', version: '1.0.0' }]);
});

test('QUICK grounding consultation is recorded for unparsed input without claiming answer contribution', async () => {
  const result = await (await quickRuntime()).ask('Write a short report about Penguin.');
  assert.equal(result.status, 'UNPARSED');
  assert.deepEqual(result.consultedKbVersions, [{ kbId: 'quick', version: '1.0.0' }]);
  assert.deepEqual(result.usedKbVersions, []);
  assert.ok(result.grounding.entries.some((item) => item.statement === 'Penguin can swim.'));
});

test('session grounding uses a bounded overlay without re-iterating a large immutable base', async () => {
  const model = await createCoreModel();
  model.manifest = {
    ...model.manifest,
    modelId: 'large-grounding-base',
    knowledgeBases: ['large-base'],
    knowledgeBaseVersions: [{ kbId: 'large-base', version: '1' }],
  };
  model.entities = Array.from({ length: 2_000 }, (_, index) => ({
    id: `base-${index}`,
    names: [`Base ${index}`],
  }));
  model.facts = model.entities.map((entity, index) => ({
    id: `base-fact-${index}`,
    subject: entity.id,
    predicate: 'has_nonce_value',
    value: `nonce-${index}`,
    kbId: 'large-base',
    kbVersion: '1',
    provenance: [`large-base:${index}`],
  }));
  const engine = new EslmEngine(model);
  engine.model.facts = new Proxy(engine.model.facts, {
    get(target, property, receiver) {
      if (property === Symbol.iterator || property === 'some') {
        throw new Error('immutable base facts were re-iterated');
      }
      return Reflect.get(target, property, receiver);
    },
  });
  const result = engine.retrieveRelatedEvidence(
    createGroundingRequest('Write a report about Zara', 'UNPARSED'),
    { session: {
      entities: [{ id: 'zara', names: ['Zara'] }],
      facts: [{
        id: 'session:fact:1', subject: 'zara', predicate: 'is_a', value: 'pilot',
        provenance: ['session:utterance:1'],
      }],
      rules: [],
    } },
  );
  assert.ok(result.entries.some((item) => item.kbId === 'session'
    && item.statement === 'Zara is a pilot.'));
});

test('session overlay indexing is bounded and reports omitted direct facts', () => {
  const session = {
    entities: [{ id: 'zara', names: ['Zara'] }],
    facts: Array.from({ length: 600 }, (_, index) => ({
      id: `session:fact:${index}`,
      subject: 'zara',
      predicate: 'has_nonce_value',
      value: `nonce-${index}`,
      provenance: [`session:${index}`],
    })),
    rules: [],
  };
  const projection = createSessionGroundingProjection(session, { maximumFacts: 7 });
  assert.equal(projection.factIndex.facts.length, 7);
  assert.equal(projection.omittedFactCount, 593);
  const result = retrieveSessionGrounding(createGroundingRequest(
    'Write about Zara', 'UNPARSED', undefined, { maximumCandidateEntries: 256 },
  ), session);
  assert.equal(result.receipts[0].complete, false);
  assert.ok(result.receipts[0].truncationReasons.includes('session-fact-index-budget'));
});

test('original-surface grounding keeps informative unigrams and conservative plural variants', () => {
  const terms = groundingTerms('Why do dogs make good companions?');
  assert.ok(terms.includes('dogs'));
  assert.ok(terms.includes('dog'));
  assert.ok(terms.includes('companions'));
  assert.ok(terms.includes('companion'));
  assert.ok(!terms.includes('does'));
});

test('instruction envelopes focus grounding on the requested topic and prioritize exact compounds', () => {
  const reportTerms = groundingTerms('Write a short report about dogs');
  assert.deepEqual(reportTerms, ['dogs', 'dog']);

  const explanationTerms = groundingTerms('Explain quantum chromodynamics');
  assert.equal(explanationTerms[0], 'quantum chromodynamics');
  assert.ok(explanationTerms.includes('quantum'));
  assert.ok(!explanationTerms.includes('explain'));

  const renamedTerms = groundingTerms(
    'Could you please give me a concise overview of qorin vector systems?',
  );
  assert.equal(renamedTerms[0], 'qorin vector systems');
  assert.ok(!renamedTerms.some((term) => /^(?:concise|give|overview)$/u.test(term)));
});

test('request-looking words remain searchable when they are the topic rather than the instruction', () => {
  assert.ok(groundingTerms('What does explain mean?').includes('explain'));
  assert.deepEqual(groundingTerms('What is a report?'), ['report']);
  assert.equal(groundingTerms('Explain the theory of relativity')[0], 'theory of relativity');
});

test('grounding ranking is provider-order independent, diverse, and explicitly bounded', () => {
  const request = createGroundingRequest('What is known about qorin?', 'UNKNOWN');
  const values = [entry('kb-a', 'a-high', 9), entry('kb-a', 'a-low', 8), entry('kb-b', 'b', 3)];
  const receipts = ['kb-a', 'kb-b'].map((kbId) => ({
    kbId, kbVersion: '1', status: 'matches-found',
    coverage: 'exact-nonce-postings', complete: true, candidatesConsidered: 2,
    truncationReasons: [],
  }));
  const forward = createGroundingBundle({ request, triggerStatus: 'UNKNOWN', entries: values,
    searchReceipts: receipts, maximumEntries: 2 });
  const reverse = createGroundingBundle({ request, triggerStatus: 'UNKNOWN', entries: values.toReversed(),
    searchReceipts: receipts.toReversed(), maximumEntries: 2 });
  assert.deepEqual(forward, reverse);
  assert.deepEqual(forward.entries.map((item) => item.recordId), ['a-high', 'b']);
  assert.equal(forward.limits.outputTruncated, true);
});

test('a complete empty search differs from an incomplete empty search', () => {
  const request = createGroundingRequest('qorin', 'UNKNOWN');
  const complete = createGroundingBundle({ request, triggerStatus: 'UNKNOWN', searchReceipts: [{
    kbId: 'kb-a', status: 'no-match', coverage: 'exact-nonce-postings', complete: true,
    candidatesConsidered: 0, truncationReasons: [],
  }] });
  const incomplete = createGroundingBundle({ request, triggerStatus: 'UNKNOWN', searchReceipts: [{
    kbId: 'kb-a', status: 'provider-error', coverage: 'search-failed', complete: false,
    candidatesConsidered: 0, truncationReasons: ['provider-error'],
  }] });
  assert.equal(complete.status, 'NO_RELATED_EVIDENCE');
  assert.equal(incomplete.status, 'SEARCH_INCOMPLETE');
});

test('search receipts cannot disguise failure or truncation as complete absence', () => {
  const request = createGroundingRequest('qorin', 'UNKNOWN');
  assert.throws(() => createGroundingBundle({
    request,
    triggerStatus: 'UNKNOWN',
    searchReceipts: [{
      kbId: 'kb-a', status: 'provider-error', coverage: 'search-failed', complete: true,
      candidatesConsidered: 0, truncationReasons: [],
    }],
  }), /cannot mark provider-error complete/u);
  assert.throws(() => createGroundingBundle({
    request,
    triggerStatus: 'UNKNOWN',
    searchReceipts: [{
      kbId: 'kb-a', status: 'no-match', coverage: 'bounded-search', complete: true,
      candidatesConsidered: 0, truncationReasons: ['lookup-budget'],
    }],
  }), /cannot be complete after truncation/u);
});

test('grounding entries require provenance and enforce semantic limits as UTF-8 bytes', () => {
  assert.throws(() => makeGroundingEntry({
    kbId: 'kb-a', recordId: 'record-a', statement: 'A related statement.',
    semantic: { subject: 'qorin' }, provenance: [],
    relevance: { score: 1, reasons: ['nonce-term-match'] },
  }), /requires provenance/u);
  assert.throws(() => makeGroundingEntry({
    kbId: 'kb-a', recordId: 'record-a', statement: 'A related statement.',
    semantic: { payload: '💡'.repeat(1_100) }, provenance: ['source:a'],
    relevance: { score: 1, reasons: ['nonce-term-match'] },
  }), /byte limit/u);
});

test('derived grounding entries require a bounded rule and non-empty support witness', () => {
  const derived = {
    kbId: 'kb-a', recordId: 'derived-a', statement: 'A derived related statement.',
    semantic: { subject: 'qorin', derived: true }, provenance: ['source:a'],
    epistemicStatus: 'strict-derived',
    relevance: { score: 1, reasons: ['nonce-term-match'] },
  };
  assert.throws(() => makeGroundingEntry(derived), /requires a derivation witness/u);
  assert.throws(() => makeGroundingEntry({
    ...derived,
    witness: { rule: 'rule-a', support: [], depth: 0 },
  }), /non-empty witness support/u);
  assert.throws(() => makeGroundingEntry({
    ...derived,
    witness: { rule: 'rule-a', support: ['fact-a'], depth: 999 },
  }), /bounded witness depth/u);
  assert.equal(makeGroundingEntry({
    ...derived,
    witness: { rule: 'rule-a', support: ['fact-a'], depth: 1 },
  }).witness.rule, 'rule-a');
});

test('resource exhaustion never launches an unreserved grounding search', () => {
  assert.equal(shouldRetrieveGrounding('RESOURCE_LIMIT'), false);
  assert.equal(shouldRetrieveGrounding('UNKNOWN'), true);
});

test('a grounding provider failure preserves the primary result and reports incomplete search', async () => {
  const runtime = await quickRuntime();
  runtime.core.retrieveRelatedEvidence = async () => { throw new Error('nonce grounding failure'); };
  const result = await runtime.ask('Can Penguin fly?');
  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.answer, 'I understand the question, but I do not have evidence for a yes or no answer.');
  assert.deepEqual(result.values, []);
  assert.equal(result.grounding.status, 'SEARCH_INCOMPLETE');
  assert.equal(result.grounding.search.complete, false);
  assert.match(result.grounding.search.receipts[0].diagnostic, /nonce grounding failure/u);
});

test('invalid provider entries cannot erase valid related evidence or imply complete search', async () => {
  const runtime = await quickRuntime();
  runtime.core.retrieveRelatedEvidence = async () => ({
    entries: [{ ...entry('quick', 'valid-related', 4), kbVersion: '1.0.0' }, { unbounded: true }],
    receipt: {
      kbId: 'quick', kbVersion: '1.0.0', status: 'matches-found',
      coverage: 'exact-test-posting', complete: true, candidatesConsidered: 2,
      truncationReasons: [],
    },
  });
  const result = await runtime.ask('Can Penguin fly?');
  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.grounding.status, 'RELATED_EVIDENCE_FOUND');
  assert.equal(result.grounding.search.complete, false);
  assert.deepEqual(result.grounding.entries.map((item) => item.recordId), ['valid-related']);
  assert.ok(result.grounding.search.receipts.some((receipt) =>
    receipt.status === 'invalid-grounding-result'));
});

test('an empty provider result without a receipt cannot imply complete absence', async () => {
  const runtime = await quickRuntime();
  runtime.core.retrieveRelatedEvidence = async () => ({ entries: [] });
  const result = await runtime.ask('Can Penguin fly?');
  assert.equal(result.grounding.status, 'SEARCH_INCOMPLETE');
  assert.equal(result.grounding.search.complete, false);
  assert.ok(result.grounding.search.receipts.some((receipt) =>
    receipt.status === 'invalid-grounding-result'));
});

test('a public provider cannot attribute grounding evidence or receipts to another KB', async () => {
  const runtime = await quickRuntime();
  runtime.providers = [{
    manifest: { id: 'provider-a', kbId: 'provider-a', kbVersion: '1' },
    retrieveGrounding: async () => ({
    entries: [entry('forged-kb', 'forged-related', 4)],
    receipt: {
      kbId: 'forged-kb', kbVersion: '1', status: 'matches-found',
      coverage: 'forged-posting', complete: true, candidatesConsidered: 1,
      truncationReasons: [],
    },
    }),
  }];
  const result = await runtime.ask('Can Penguin fly?');
  assert.ok(!result.grounding.entries.some((item) => item.kbId === 'forged-kb'));
  assert.ok(result.grounding.search.receipts.some((receipt) =>
    receipt.kbId === 'provider-a' && receipt.status === 'invalid-grounding-result'));
});

test('a valid oversized provider response is visibly truncated rather than mislabeled invalid', async () => {
  const runtime = await quickRuntime();
  runtime.core.retrieveRelatedEvidence = async () => ({
    entries: Array.from({ length: 33 }, (_, index) => ({
      ...entry('quick', `related-${index}`, 40 - index), kbVersion: '1.0.0',
    })),
    receipt: {
      kbId: 'quick', kbVersion: '1.0.0', status: 'matches-found',
      coverage: 'bounded-test-posting', complete: true, candidatesConsidered: 33,
      truncationReasons: [],
    },
  });
  const result = await runtime.ask('Can Penguin fly?');
  assert.equal(result.grounding.status, 'RELATED_EVIDENCE_FOUND');
  assert.equal(result.grounding.search.complete, false);
  assert.ok(result.grounding.search.receipts.some((receipt) =>
    receipt.status === 'runtime-boundary-truncated'
      && receipt.truncationReasons.includes('runtime-candidate-entry-budget')));
  assert.ok(!result.grounding.search.receipts.some((receipt) =>
    receipt.status === 'invalid-grounding-result'));
});

test('receipt overflow always reserves an aggregate incomplete receipt', async () => {
  const runtime = await quickRuntime();
  runtime.core.retrieveRelatedEvidence = async () => ({
    entries: [],
    receipts: Array.from({ length: 20 }, () => ({
      kbId: 'quick',
      kbVersion: '1.0.0',
      status: 'no-match',
      coverage: 'exact-empty-test-index',
      complete: true,
      candidatesConsidered: 0,
      truncationReasons: [],
    })),
  });
  const result = await runtime.ask('Can Penguin fly?');
  assert.equal(result.grounding.status, 'SEARCH_INCOMPLETE');
  assert.equal(result.grounding.search.complete, false);
  assert.equal(result.grounding.search.receipts.length, 16);
  const aggregate = result.grounding.search.receipts.find((receipt) =>
    receipt.kbId === 'grounding-aggregator');
  assert.ok(aggregate);
  assert.ok(aggregate.truncationReasons.includes('runtime-search-receipt-budget'));
});

test('many providers share deterministic aggregate source, lookup, candidate, and concurrency budgets', async () => {
  const runtime = await quickRuntime();
  const retrieveCore = runtime.core.retrieveRelatedEvidence.bind(runtime.core);
  let coreLookupLimit = 0;
  runtime.core.retrieveRelatedEvidence = (request, context) => {
    coreLookupLimit = request.limits.maximumLookups;
    return retrieveCore(request, context);
  };
  const calls = [];
  const lookupLimits = [];
  let active = 0;
  let maximumActive = 0;
  runtime.providers = Array.from({ length: 17 }, (_, offset) => {
    const index = 16 - offset;
    const kbId = `provider-${String(index).padStart(2, '0')}`;
    return {
      manifest: { id: kbId, kbId, kbVersion: '1' },
      ask: async () => undefined,
      beginQuery() {},
      endQuery() {},
      async retrieveGrounding(request) {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        calls.push(kbId);
        lookupLimits.push(request.limits.maximumLookups);
        await Promise.resolve();
        active -= 1;
        return {
          entries: Array.from({ length: 32 }, (_, entryIndex) =>
            entry(kbId, `${kbId}-related-${entryIndex}`, 100 - entryIndex)),
          receipt: {
            kbId, kbVersion: '1', status: 'matches-found',
            coverage: 'bounded-provider-test-postings', complete: true,
            candidatesConsidered: 32, truncationReasons: [],
          },
        };
      },
    };
  });
  const result = await runtime.ask('Can Penguin fly?');
  assert.equal(result.grounding.status, 'RELATED_EVIDENCE_FOUND');
  assert.equal(result.grounding.search.complete, false);
  assert.ok(result.grounding.search.receipts.length <= 16);
  assert.ok(result.grounding.limits.candidatesConsidered <= 256);
  assert.equal(result.grounding.limits.maximumCandidateEntries, 256);
  assert.equal(maximumActive, 1);
  assert.deepEqual(calls, Array.from({ length: 14 }, (_, index) =>
    `provider-${String(index).padStart(2, '0')}`));
  assert.ok(coreLookupLimit + lookupLimits.reduce((sum, value) => sum + value, 0)
    <= result.grounding.limits.maximumLookups);
  const aggregate = result.grounding.search.receipts.find((receipt) =>
    receipt.kbId === 'grounding-aggregator');
  assert.ok(aggregate.truncationReasons.includes('aggregate-source-budget'));
  assert.ok(aggregate.truncationReasons.includes('runtime-candidate-entry-budget'));
  assert.deepEqual(result.usedKbVersions, []);
});

test('a large merged core searches only receipt-budgeted sources and accounts only those consultations', async () => {
  const model = await createCoreModel();
  model.manifest = {
    ...model.manifest,
    modelId: 'many-source-core',
    knowledgeBases: Array.from({ length: 20 }, (_, index) =>
      `core-source-${String(index).padStart(2, '0')}`),
    knowledgeBaseVersions: Array.from({ length: 20 }, (_, index) => ({
      kbId: `core-source-${String(index).padStart(2, '0')}`,
      version: '1',
    })),
  };
  model.entities = Array.from({ length: 20 }, (_, index) => ({
    id: `qorin-${index}`,
    names: [`Qorin ${index}`],
  }));
  model.facts = model.entities.map((entity, index) => ({
    id: `qorin-fact-${index}`,
    subject: entity.id,
    predicate: 'has_nonce_value',
    value: 'qorin',
    kbId: `core-source-${String(index).padStart(2, '0')}`,
    kbVersion: '1',
    kbSources: [{ kbId: `core-source-${String(index).padStart(2, '0')}`, version: '1' }],
    provenance: [`source:${index}`],
  }));
  const runtime = new EslmRuntime(new EslmEngine(model), [], model.manifest.knowledgeBases);
  const result = await runtime.ask('Write a note about qorin.');
  const sourceReceipts = result.grounding.search.receipts.filter((receipt) =>
    receipt.kbId !== 'grounding-aggregator');
  assert.equal(sourceReceipts.length, 15);
  assert.deepEqual(sourceReceipts.map((receipt) => receipt.kbId),
    Array.from({ length: 15 }, (_, index) => `core-source-${String(index).padStart(2, '0')}`));
  assert.deepEqual(result.consultedKbVersions.map((identity) => identity.kbId),
    sourceReceipts.map((receipt) => receipt.kbId));
  assert.ok(result.grounding.search.receipts.at(-1).truncationReasons
    .includes('aggregate-source-budget'));
  assert.deepEqual(result.usedKbVersions, []);
});

test('grounding bundle rejects an unbounded candidate collection before ranking it', () => {
  const request = createGroundingRequest('qorin', 'UNKNOWN');
  assert.throws(() => createGroundingBundle({
    request,
    triggerStatus: 'UNKNOWN',
    entries: Array.from({ length: 513 }, (_, index) => entry('kb-a', `record-${index}`)),
    searchReceipts: [],
  }), /at most 512 candidates/u);
});
