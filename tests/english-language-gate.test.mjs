import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessEnglishLikelihood, assertEnglishLikelihoodReceipt, ENGLISH_LIKELIHOOD_PROTOCOL,
} from '../src/language/english-likelihood.mjs';
import { EnglishLanguageGateRuntime } from '../src/runtime/english-language-gate-runtime.mjs';
import {
  assertRuntimeTextResultContract, directCoreMemorySnapshot,
} from '../src/runtime/result-contract.mjs';

function runtimeStub(overrides = {}) {
  return {
    model: { manifest: { modelId: 'test:english-gate', knowledgeBaseVersions: [] } },
    providers: [], selected: [], core: {}, workPolicy: undefined,
    memorySnapshot: () => directCoreMemorySnapshot(),
    score: () => ({ score: 0 }),
    ask: async () => ({
      protocol: 'eslm-runtime-result-v1', status: 'UNPARSED', answer: 'not parsed',
      languageRoute: 'direct-symbolic', values: [], provenance: [], usedKbVersions: [],
      selectedKbVersions: [], consultedKbVersions: [], unresolvedSubgoals: [],
      context: { session: { entities: [], facts: [], rules: [], history: [] } },
      episode: { original: 'x', segments: ['x'], unsupportedStatements: ['x'], transaction: 'rejected' },
      model: {
        id: 'test:english-gate', knowledgeBases: [], benchmarkComparable: true,
        memory: directCoreMemorySnapshot(),
      },
    }),
    askDirect: async () => { throw new Error('not used'); },
    attachGrounding: (result) => result,
    ...overrides,
  };
}

test('English likelihood receipt is closed, bounded, and exact', () => {
  const receipt = assessEnglishLikelihood('Every qorin glims vepa. Does Nera glim vepa?');
  assert.equal(receipt.protocol, ENGLISH_LIKELIHOOD_PROTOCOL);
  assert.equal(receipt.classification, 'likely-english');
  assert.ok(receipt.confidence >= receipt.threshold);
  assert.equal(receipt.complete, true);
  assert.ok(receipt.tokensInspected <= receipt.work.maximumTokens);
  assert.doesNotThrow(() => assertEnglishLikelihoodReceipt(receipt));
  assert.throws(() => assertEnglishLikelihoodReceipt({ ...receipt, language: 'en' }),
    /unsupported or missing fields/u);
  assert.throws(() => assertEnglishLikelihoodReceipt({ ...receipt, classification: 'english' }),
    /identity or classification/u);
  assert.throws(() => assertEnglishLikelihoodReceipt({ ...receipt, confidence: 0.5 }),
    /contradicts its signals/u);
  assert.throws(() => assessEnglishLikelihood('Is Nera calm?', { language: 'en' }),
    /only threshold/u);
  const mutatedSignals = receipt.signals.map((item, index) =>
    index === 0 ? { ...item, contribution: item.contribution + 0.1 } : item);
  assert.throws(() => assertEnglishLikelihoodReceipt({ ...receipt, signals: mutatedSignals }),
    /signal is invalid/u);
});

test('English likelihood uses generic script evidence without naming or translating a language', () => {
  for (const input of [
    'Žàrûm kývès nôlta?',
    'Жарум кивес Нолта?',
  ]) {
    const receipt = assessEnglishLikelihood(input);
    assert.equal(receipt.classification, 'likely-non-english', input);
    assert.ok(receipt.confidence >= receipt.threshold, input);
    assert.ok(receipt.signals.some((item) =>
      ['latin-diacritic', 'non-latin-script'].includes(item.kind) && item.count >= 1));
    assert.doesNotMatch(receipt.diagnostic, /language identifier|translation/iu);
  }
});

test('nonce controlled English survives while names, technical tokens, and formulas stay indeterminate', () => {
  for (const input of [
    'Tarin is a zoral. Every zoral glims vepa. Does Tarin glim vepa?',
    'Abura is a mura. All mura et bana. Is Abura eating bana?',
  ]) assert.equal(assessEnglishLikelihood(input).classification, 'likely-english', input);
  for (const input of ['Qorin zeta_4', 'x >= y && foo(bar)', 'HTTP2 JSONL Node.js']) {
    const receipt = assessEnglishLikelihood(input);
    assert.equal(receipt.classification, 'indeterminate', input);
    assert.ok(receipt.confidence < receipt.threshold, input);
  }
  assert.equal(assessEnglishLikelihood('Qorin zeta').classification, 'indeterminate');
  assert.notEqual(assessEnglishLikelihood('Café is open.').classification, 'likely-non-english');
});

test('indeterminate confidence reflects bounded evidence mass instead of hugging the threshold', () => {
  const weak = ['abc', 'mura', 'hello', 'the'].map((text) => assessEnglishLikelihood(text));
  assert.deepEqual(weak.map((receipt) => receipt.classification),
    ['indeterminate', 'indeterminate', 'indeterminate', 'indeterminate']);
  assert.deepEqual(weak.map((receipt) => receipt.confidence), [0, 0, 0, 0.56]);
  assert.ok(weak.every((receipt) => receipt.confidence < receipt.threshold));
  const strong = assessEnglishLikelihood('Is Penguin a bird?');
  assert.equal(strong.classification, 'likely-english');
  assert.ok(strong.confidence >= strong.threshold);
});

test('ASCII length and generic suffixes are compatibility evidence, not English authority', () => {
  for (const input of [
    'x'.repeat(64),
    'qorin '.repeat(80),
    'zaru melik toran vesu narik polen daru fesik lomar ketu',
    'vemor talun serek pavor nimet raluk dosen kifar belun tavik',
  ]) {
    const receipt = assessEnglishLikelihood(input);
    assert.equal(receipt.classification, 'indeterminate', input);
    assert.ok(receipt.confidence < receipt.threshold, input);
  }
  const control = assessEnglishLikelihood(
    'Every qorin glims vepa. Does Tarin glim vepa?',
  );
  assert.equal(control.classification, 'likely-english');
  assert.ok(control.confidence >= control.threshold);
});

test('script and diacritic evidence is generic and a multibyte prefix is byte bounded', () => {
  assert.equal(assessEnglishLikelihood('Жарум кивес Нолта?').classification,
    'likely-non-english');
  assert.equal(assessEnglishLikelihood('Žàrûm kývès nôlta?').classification,
    'likely-non-english');
  const oversized = assessEnglishLikelihood('🙂'.repeat(40_000));
  assert.equal(oversized.complete, false);
  assert.equal(oversized.classification, 'indeterminate');
  assert.equal(oversized.work.inputBytes, oversized.work.maximumInputBytes + 1);
  assert.ok(oversized.tokensInspected <= oversized.work.maximumTokens);
});

test('likely non-English gate does not call parser or providers and preserves session snapshot', async () => {
  let innerCalls = 0;
  let providerCalls = 0;
  const provider = {
    manifest: { id: 'nonce-provider', kbVersion: '2.1.0' },
    ask: async () => { providerCalls += 1; },
  };
  const inner = runtimeStub({
    providers: [provider], selected: ['nonce-provider'],
    ask: async () => { innerCalls += 1; throw new Error('English parser must not run'); },
  });
  const context = { session: { entities: [], facts: [], rules: [], history: [] } };
  const result = await new EnglishLanguageGateRuntime(inner).ask('Жарум кивес Нолта?', context);
  assert.equal(innerCalls, 0);
  assert.equal(providerCalls, 0);
  assert.equal(result.status, 'UNPARSED');
  assert.equal(result.languageRoute, 'english-language-gate-rejected');
  assert.equal(result.languageAssessment.classification, 'likely-non-english');
  assert.deepEqual(result.context, context);
  assert.deepEqual(result.selectedKbVersions, [{ kbId: 'nonce-provider', version: '2.1.0' }]);
  assert.deepEqual(result.consultedKbVersions, []);
  assert.deepEqual(result.usedKbVersions, []);
  assert.deepEqual(result.unresolvedSubgoals, [{
    operation: 'translate-input-to-english', gap: 'likely-non-english',
  }]);
});

test('indeterminate input continues to the wrapped runtime with its assessment', async () => {
  let innerCalls = 0;
  const inner = runtimeStub({
    ask: async () => {
      innerCalls += 1;
      return runtimeStub().ask();
    },
  });
  const result = await new EnglishLanguageGateRuntime(inner).ask('Qorin zeta_4');
  assert.equal(innerCalls, 1);
  assert.equal(result.languageAssessment.classification, 'indeterminate');
  assert.equal(result.languageRoute, 'direct-symbolic');
});

test('result contract rejects answer-bearing or grounded English-gate mutations', async () => {
  const result = await new EnglishLanguageGateRuntime(runtimeStub())
    .ask('Жарум кивес Нолта?');
  assert.throws(() => assertRuntimeTextResultContract({
    ...result, values: [true], answer: 'Yes.',
  }), /clean translation gap/u);
  assert.throws(() => assertRuntimeTextResultContract({
    ...result,
    grounding: {
      protocol: 'eslm-grounding-bundle-v1', status: 'NO_RELATED_EVIDENCE',
      answerSupported: false, entries: [], search: { complete: true, receipts: [] },
    },
  }), /grounding|clean translation gap/u);
});
