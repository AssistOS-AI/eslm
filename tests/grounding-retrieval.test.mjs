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
import { selectGroundingTerms } from '../src/reasoning/grounding-query-focus.mjs';
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

test('unknown answers may realize explicit source context without promoting it to the missing answer', async () => {
  const result = await (await quickRuntime()).ask('Can Penguin fly?');
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.languageRoute, 'knowledge-context-fallback');
  assert.match(result.answer, /could not establish a precise answer/u);
  assert.match(result.answer, /do not establish the missing conclusion/u);
  assert.deepEqual(result.values, []);
  assert.ok(result.provenance.every((item) => item.sourceClaim === true
    && item.method === 'query-local-contextual-source-realization'));
  assert.deepEqual(result.usedKbVersions, [{ kbId: 'quick', version: '1.1.0' }]);
  assert.deepEqual(result.selectedKbVersions, [{ kbId: 'quick', version: '1.1.0' }]);
  assert.equal(result.grounding.answerSupported, false);
  assert.equal(result.grounding.status, 'RELATED_EVIDENCE_FOUND');
  assert.ok(result.grounding.entries.some((item) => item.statement === 'Penguin can swim.'));
  assert.deepEqual(result.grounding.search.receipts.map((item) => item.kbId), ['quick']);
});

test('a solved answer has contributor versions and does not run failure grounding', async () => {
  const result = await (await quickRuntime()).ask('Can Penguin swim?');
  assert.equal(result.status, 'SOLVED');
  assert.deepEqual(result.usedKbVersions, [{ kbId: 'quick', version: '1.1.0' }]);
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
    { kbId: 'quick', version: '1.1.0' },
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

test('unparsed input can realize previously committed session facts as explicit partial context', async () => {
  const runtime = await quickRuntime();
  const learned = await runtime.ask('Zara is a pilot.');
  const result = await runtime.ask('Write a report about Zara.', learned.context);
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.languageRoute, 'knowledge-context-fallback');
  assert.equal(result.context.session.facts.length, 1);
  assert.deepEqual(result.usedKbVersions, [{ kbId: 'session', version: 'current' }]);
  assert.equal(result.provenance[0].sourceClaim, true);
  assert.ok(result.grounding.entries.some((item) =>
    item.kbId === 'session' && item.statement === 'Zara is a pilot.'));
  assert.ok(result.grounding.search.receipts.some((item) => item.kbId === 'session'));
  assert.deepEqual(result.consultedKbVersions, [{ kbId: 'quick', version: '1.1.0' }]);
});

test('QUICK records can be cited as partial context without claiming the requested report is complete', async () => {
  const result = await (await quickRuntime()).ask('Write a short report about Penguin.');
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.languageRoute, 'knowledge-context-fallback');
  assert.deepEqual(result.consultedKbVersions, [{ kbId: 'quick', version: '1.1.0' }]);
  assert.deepEqual(result.usedKbVersions, [{ kbId: 'quick', version: '1.1.0' }]);
  assert.match(result.answer, /could not represent the full request precisely/u);
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

test('structural grounding focus excludes quantifiers and auxiliaries when content terms exist', () => {
  const input = 'Abura is an mura. All mura et bana. Is Abura eating bana?';
  const terms = groundingTerms(input);
  assert.equal(terms[0], 'abura eating bana');
  assert.ok(terms.includes('mura'));
  assert.ok(terms.includes('eating'));
  assert.ok(terms.includes('bana'));
  assert.ok(!terms.some((term) => ['a', 'all', 'an', 'et', 'is'].includes(term)));

  const renamed = groundingTerms(
    'Every qorin is a velm. Does Nera skulpt amber?',
  );
  assert.ok(renamed.includes('skulpt'));
  assert.ok(renamed.includes('amber'));
  assert.ok(!renamed.some((term) => ['a', 'does', 'every', 'is'].includes(term)));

  const request = createGroundingRequest(input, 'UNPARSED', {
    subject: 'abura', predicate: 'all', object: 'bana',
  });
  assert.equal(request.query.predicate, undefined);
  assert.equal(request.query.subject, 'abura');
  assert.equal(request.query.object, 'bana');
});

test('grounding morphology spends tight budgets on typed lemmas instead of malformed suffixes', () => {
  const machineTerms = groundingTerms('Are machines eating berries?', { maximumTerms: 6 });
  assert.deepEqual(machineTerms, [
    'machines eating berries', 'eat', 'eating', 'berry', 'machine', 'berries',
  ]);
  assert.ok(!machineTerms.some((term) => ['machin', 'berri', 'berrie'].includes(term)));

  const watchTerms = groundingTerms('Do watches pass boxes?', { maximumTerms: 6 });
  assert.deepEqual(watchTerms, ['watches pass boxes', 'pass', 'box', 'watch', 'boxes', 'watches']);
  assert.ok(!watchTerms.some((term) => ['watche', 'boxe'].includes(term)));

  const request = createGroundingRequest('Are machines eating berries?', 'UNKNOWN');
  assert.equal(request.termSelection.strategy, 'semantic-role-phrase-morphology-v3');
  const lemma = request.termSelection.candidates.find((candidate) => candidate.term === 'eat');
  assert.equal(lemma.role, 'predicate');
  assert.equal(lemma.kind, 'morphological-variant');
  assert.equal(lemma.variantOf, 'eating');
  assert.deepEqual(lemma.span, { start: 13, end: 19 });
  assert.equal(lemma.selected, true);
  const auxiliary = request.termSelection.candidates.find((candidate) => candidate.term === 'are');
  assert.equal(auxiliary.exclusionReason, 'grammatical-or-request-scaffolding');
});

test('a function word is searchable only when the request explicitly treats it as a term', () => {
  assert.deepEqual(groundingTerms('What does all mean?'), ['all']);
  assert.deepEqual(groundingTerms('Define every'), ['every']);
  assert.ok(!groundingTerms('All qorin can shimmer. What can qorin do?').includes('all'));
  const request = createGroundingRequest('What does all mean?', 'UNKNOWN', { subject: 'all' });
  assert.equal(request.query.subject, 'all');
});

test('typed request topics remove leading grammatical scaffolding before tight-budget retrieval', () => {
  const request = createGroundingRequest(
    'Write a report about all mura eating bana.', 'UNPARSED', undefined, {
      maximumTerms: 4,
      focus: [{ focusId: 'topic:1', term: 'all mura eating bana', role: 'request-topic' }],
    },
  );
  assert.deepEqual(request.terms, ['mura eating bana', 'eat', 'eating', 'bana']);
  assert.deepEqual(request.termSelection.obligations, [{
    focusId: 'topic:1', term: 'mura eating bana', role: 'request-topic', selected: true,
  }]);
  assert.ok(!request.terms.some((term) => /(?:^|\s)all(?:\s|$)/u.test(term)));
  const lemma = request.termSelection.candidates.find((candidate) => candidate.term === 'eat');
  assert.equal(lemma.role, 'predicate');
  assert.equal(lemma.kind, 'morphological-variant');
  assert.equal(lemma.selected, true);

  const renamed = createGroundingRequest(
    'Write a note about every qorin carrying velm.', 'UNPARSED', undefined, {
      maximumTerms: 3,
      focus: [{ focusId: 'topic:7', term: 'every qorin carrying velm', role: 'request-topic' }],
    },
  );
  assert.deepEqual(renamed.terms, ['qorin carrying velm', 'carry', 'carrying']);
  assert.equal(renamed.termSelection.obligations[0].term, 'qorin carrying velm');
  assert.deepEqual(groundingTerms('What does all mean?', { maximumTerms: 1 }), ['all']);
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

test('negated request scaffolding cannot displace the actual topic', () => {
  const focus = selectGroundingTerms('Do not write or draft a report about zorals.', {
    maximumTerms: 4,
  });
  assert.deepEqual(focus.terms, ['zorals', 'zoral']);
  assert.equal(focus.candidates.find((candidate) => candidate.term === 'not')?.included, false);
  assert.equal(focus.candidates.find((candidate) => candidate.term === 'report')?.included, false);
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

test('bounded relevance voting combines active frequency, term coverage, cooccurrence, and answer bridges', () => {
  const request = createGroundingRequest('What does a qorin use to open a velm?', 'UNKNOWN', {
    subject: 'qorin', predicate: 'used_for', object: 'open_velm',
  });
  const commonOnly = makeGroundingEntry({
    ...entry('kb-a', 'common-only', 3),
    statement: 'A qorin is frequently mentioned.',
    semantic: { subject: 'qorin', predicate: 'mentioned' },
    relevance: { score: 3, reasons: ['posting-match'], activeKbOccurrences: 1_000_000 },
  });
  const bridged = makeGroundingEntry({
    ...entry('kb-b', 'bridged', 1),
    statement: 'A qorin uses a key to open a velm.',
    semantic: { subject: 'qorin', predicate: 'used_for', object: 'open_velm' },
    relevance: { score: 1, reasons: ['posting-match'], activeKbOccurrences: 2 },
  });
  const receipts = ['kb-a', 'kb-b'].map((kbId) => ({
    kbId, kbVersion: '1', status: 'matches-found', coverage: 'bounded-test-posting',
    complete: true, candidatesConsidered: 1, truncationReasons: [],
  }));
  const result = createGroundingBundle({
    request, triggerStatus: 'UNKNOWN', entries: [commonOnly, bridged],
    searchReceipts: receipts, maximumEntries: 2,
  });
  assert.equal(result.entries[0].recordId, 'bridged');
  assert.ok(result.entries[0].relevance.estimator.answerBridgeScore > 0);
  assert.ok(result.entries[0].relevance.estimator.matchedTerms.length >= 2);
  assert.equal(result.entries[0].relevance.estimator.answerSupported, false);
  assert.ok(result.entries[1].relevance.estimator.activeKbOccurrences > 100_000);
  assert.ok(result.entries[0].relevance.score > result.entries[1].relevance.score,
    'frequency is a capped vote and cannot outrank a multi-role answer bridge by itself');
});

test('grounding entry payload obeys its exact UTF-8 byte budget', () => {
  const request = createGroundingRequest('qorin', 'UNKNOWN', undefined, {
    maximumEntries: 8,
    maximumCandidateEntries: 32,
    maximumOutputBytes: 4_096,
  });
  const entries = Array.from({ length: 12 }, (_, index) => makeGroundingEntry({
    kbId: 'kb-byte', kbVersion: '1', recordId: `byte-${index}`,
    statement: `${'q'.repeat(430)} ${index}`,
    semantic: { subject: `qorin-${index}`, predicate: 'related_to', object: 'bytes' },
    provenance: [`source:byte:${index}`],
    relevance: { score: 100 - index, reasons: ['nonce-term-match'] },
  }));
  const bundle = createGroundingBundle({
    request,
    triggerStatus: 'UNKNOWN',
    entries,
    searchReceipts: [{
      kbId: 'kb-byte', kbVersion: '1', status: 'matches-found',
      coverage: 'exact-byte-fixture', complete: true,
      candidatesConsidered: entries.length, truncationReasons: [],
    }],
    maximumEntries: 8,
  });
  assert.ok(bundle.limits.returnedEntryBytes <= 4_096);
  assert.equal(bundle.limits.maximumOutputBytes, 4_096);
  assert.equal(bundle.limits.returnedEntryBytes, bundle.entries.reduce((total, item) =>
    total + Buffer.byteLength(JSON.stringify(item), 'utf8'), 0));
  assert.equal(bundle.limits.outputTruncated, true);
});

test('grounding can be deferred until heuristic and assisted language routes have finished', async () => {
  const createRuntime = async (calls) => {
    const provider = {
      manifest: { id: 'related-source', kbId: 'related-source', kbVersion: '1' },
      memorySnapshot: () => ({ mode: 'fixture' }),
      ask: async () => undefined,
      beginQuery() {},
      endQuery() {},
      retrieveGrounding: async (request) => {
        calls.push([...request.terms]);
        return {
          entries: [],
          receipt: {
            kbId: 'related-source', kbVersion: '1', status: 'no-match',
            coverage: 'exact-fixture-postings', complete: true,
            candidatesConsidered: 0, truncationReasons: [],
          },
        };
      },
    };
    return new EslmRuntime(
      new EslmEngine(await createCoreModel()), [provider], ['related-source'],
    );
  };
  const deferredCalls = [];
  const deferredRuntime = await createRuntime(deferredCalls);
  const primary = await deferredRuntime.ask(
    'Write a report about qorin.', {}, { grounding: false },
  );
  assert.equal(primary.status, 'UNPARSED');
  assert.equal(primary.grounding, undefined);
  assert.equal(primary.workPolicy.requested.profile, 'balanced');
  assert.deepEqual(deferredCalls, []);
  const attached = await deferredRuntime.attachGrounding(primary);
  assert.equal(deferredCalls.length, 1);
  assert.equal(attached.grounding.answerSupported, false);
  assert.equal(attached.grounding.limits.maximumLookups,
    attached.workPolicy.effective.limits.maximumGroundingLookups);
  assert.equal(attached.grounding.limits.maximumOutputBytes,
    attached.workPolicy.effective.limits.maximumGroundingOutputBytes);

  const automaticCalls = [];
  const automatic = await (await createRuntime(automaticCalls)).ask('Write a report about qorin.');
  assert.equal(automaticCalls.length, 1);
  assert.deepEqual(attached, automatic);
  assert.deepEqual(await deferredRuntime.attachGrounding(attached), attached);
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
  assert.equal(shouldRetrieveGrounding('UNVERIFIED_NORMALIZATION'), true);
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
    entries: [{ ...entry('quick', 'valid-related', 4), kbVersion: '1.1.0' }, { unbounded: true }],
    receipt: {
      kbId: 'quick', kbVersion: '1.1.0', status: 'matches-found',
      coverage: 'exact-test-posting', complete: true, candidatesConsidered: 2,
      truncationReasons: [],
    },
  });
  const result = await runtime.ask('Can Penguin fly?');
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.languageRoute, 'knowledge-context-fallback');
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

test('grounding commits provider evidence only after successful lifecycle cleanup', async () => {
  let cleanupCalls = 0;
  const provider = {
    manifest: { id: 'provider-cleanup', kbId: 'provider-cleanup', kbVersion: '1' },
    beginQuery() {},
    endQuery() {
      cleanupCalls += 1;
      throw new Error('cleanup nonce');
    },
    async retrieveGrounding() {
      return {
        entries: [entry('provider-cleanup', 'must-not-leak', 10)],
        receipt: {
          kbId: 'provider-cleanup', kbVersion: '1', status: 'matches-found',
          coverage: 'exact-transaction-fixture', complete: true, candidatesConsidered: 1,
          truncationReasons: [],
        },
      };
    },
  };
  const runtime = new EslmRuntime(
    new EslmEngine(await createCoreModel()), [provider], ['provider-cleanup'],
  );
  const primary = runtime.core.ask('Can Qorin glim vepa?');
  const primaryAuthority = {
    status: primary.status,
    answer: primary.answer,
    values: primary.values,
    provenance: primary.provenance,
    usedKbVersions: primary.usedKbVersions,
  };
  const result = await runtime.attachGrounding(primary);
  assert.equal(cleanupCalls, 1);
  assert.equal(result.status, 'UNKNOWN');
  assert.deepEqual({
    status: result.status,
    answer: result.answer,
    values: result.values,
    provenance: result.provenance,
    usedKbVersions: result.usedKbVersions,
  }, primaryAuthority);
  assert.equal(result.grounding.status, 'SEARCH_INCOMPLETE');
  assert.deepEqual(result.grounding.entries, []);
  assert.deepEqual(result.grounding.search.receipts.map((receipt) => receipt.status),
    ['provider-error']);
  assert.equal(result.grounding.search.receipts[0].coverage,
    'grounding-provider-cleanup-failed');
  assert.match(result.grounding.search.receipts[0].diagnostic, /cleanup nonce/u);
});

test('grounding performs best-effort cleanup after begin failure without retrieval', async () => {
  let retrieveCalls = 0;
  let cleanupCalls = 0;
  const provider = {
    manifest: { id: 'provider-begin', kbId: 'provider-begin', kbVersion: '1' },
    beginQuery() { throw new Error('begin nonce'); },
    endQuery() { cleanupCalls += 1; },
    async retrieveGrounding() { retrieveCalls += 1; return {}; },
  };
  const runtime = new EslmRuntime(
    new EslmEngine(await createCoreModel()), [provider], ['provider-begin'],
  );
  const primary = runtime.core.ask('Can Qorin glim vepa?');
  const result = await runtime.attachGrounding(primary);
  assert.equal(retrieveCalls, 0);
  assert.equal(cleanupCalls, 1);
  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.grounding.status, 'SEARCH_INCOMPLETE');
  assert.deepEqual(result.grounding.entries, []);
  assert.equal(result.grounding.search.receipts[0].status, 'provider-error');
  assert.match(result.grounding.search.receipts[0].diagnostic, /begin nonce/u);
});

test('a valid oversized provider response is visibly truncated rather than mislabeled invalid', async () => {
  const runtime = await quickRuntime();
  runtime.core.retrieveRelatedEvidence = async () => ({
    entries: Array.from({ length: 33 }, (_, index) => ({
      ...entry('quick', `related-${index}`, 40 - index), kbVersion: '1.1.0',
    })),
    receipt: {
      kbId: 'quick', kbVersion: '1.1.0', status: 'matches-found',
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
      kbVersion: '1.1.0',
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
  assert.deepEqual(result.usedKbVersions.map((identity) => identity.kbId), [
    'provider-00', 'provider-01', 'provider-02', 'provider-03',
  ]);
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
  assert.deepEqual(result.usedKbVersions.map((identity) => identity.kbId), [
    'core-source-00', 'core-source-01', 'core-source-02', 'core-source-03',
  ]);
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
