import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  CODEX_NORMALIZATION_PROTOCOL, CodexLanguageNormalizer, classifyNormalizationOperation, codexNormalizationInvocation,
  DEFAULT_CODEX_NORMALIZATION_MODEL, validateCodexNormalization,
} from '../src/language/codex-normalizer.mjs';
import { LanguageAgentAssistedRuntime } from '../src/runtime/language-agent-assisted-runtime.mjs';
import { EslmEngine } from '../src/runtime/engine.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';

function candidate(normalizedEnglish) {
  return {
    protocol: CODEX_NORMALIZATION_PROTOCOL,
    operation: 'translation',
    sourceLanguage: 'ro',
    normalizedEnglish,
    alignments: [{ kind: 'named-entity', source: 'Gertrude', target: 'Gertrude' }],
  };
}

test('Codex normalization invocation pins Spark, low reasoning, and a tool-disabled ephemeral boundary', () => {
  const invocation = codexNormalizationInvocation('/tmp/eslm-normalization-contract');
  assert.equal(invocation.model, DEFAULT_CODEX_NORMALIZATION_MODEL);
  assert.equal(invocation.args[invocation.args.indexOf('--model') + 1], 'gpt-5.3-codex-spark');
  assert.ok(invocation.args.includes('--ephemeral'));
  assert.ok(invocation.args.includes('--ignore-user-config'));
  assert.ok(invocation.args.includes('read-only'));
  assert.ok(invocation.args.includes('model_reasoning_effort="low"'));
  assert.ok(invocation.args.includes('shell_tool'));
});

test('host validation preserves question force, names, numbers, and protected operators', () => {
  assert.equal(validateCodexNormalization('Unde este Gertrude?', candidate('Where is Gertrude?')).accepted, true);
  const changedNegation = candidate('Is Gertrude in room 4?');
  assert.equal(validateCodexNormalization('Gertrude nu este în camera 4?', changedNegation).accepted, false);
  assert.match(validateCodexNormalization('Gertrude nu este în camera 4?', changedNegation).errors.join(' '), /negation/u);
});

test('Romanian idiomatic mai is not mistaken for a comparison operator', () => {
  const checkIn = {
    protocol: CODEX_NORMALIZATION_PROTOCOL,
    operation: 'translation',
    sourceLanguage: 'ro',
    normalizedEnglish: 'How are you?',
    alignments: [],
  };
  assert.equal(classifyNormalizationOperation('Ce mai faci?').operation, 'translation');
  const validation = validateCodexNormalization('Ce mai faci?', checkIn, {
    expectedOperation: 'translation', operationConfidence: 'high',
  });
  assert.equal(validation.accepted, true, validation.errors?.join('; '));
  const comparative = {
    ...checkIn,
    normalizedEnglish: 'Is Nera bigger than Vela?',
    alignments: [
      { kind: 'named-entity', source: 'Nera', target: 'Nera' },
      { kind: 'named-entity', source: 'Vela', target: 'Vela' },
    ],
  };
  const preserved = validateCodexNormalization('Este Nera mai mare decât Vela?', comparative, {
    expectedOperation: 'translation', operationConfidence: 'high',
  });
  assert.equal(preserved.accepted, true, preserved.errors?.join('; '));
});

test('host validation accepts conservative English simplification and rejects an answered question', () => {
  const simplified = {
    protocol: CODEX_NORMALIZATION_PROTOCOL,
    operation: 'simplification',
    sourceLanguage: 'en',
    normalizedEnglish: 'Is Gertrude in the garden?',
    alignments: [{ kind: 'named-entity', source: 'Gertrude', target: 'Gertrude' }],
  };
  assert.equal(validateCodexNormalization('In the garden, is Gertrude?', simplified).accepted, true);
  assert.equal(validateCodexNormalization('In the garden, is Gertrude?', {
    ...simplified, normalizedEnglish: 'Gertrude is in the garden.',
  }).accepted, false);
});

test('normalizer accepts a schema-bound subprocess result and reuses it only as an attributed cache hit', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-normalizer-test-'));
  const executable = join(directory, 'fake-codex.mjs');
  await writeFile(executable, `#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
const args = process.argv.slice(2);
const output = args[args.indexOf('--output-last-message') + 1];
writeFileSync(output, JSON.stringify(${JSON.stringify(candidate('Where is Gertrude?'))}));
process.stdout.write('{"type":"turn.completed"}\\n');
`, 'utf8');
  await chmod(executable, 0o755);
  const normalizer = new CodexLanguageNormalizer({
    command: executable, cacheDirectory: join(directory, 'cache'), timeoutMs: 5_000,
  });
  const first = await normalizer.normalize('Unde este Gertrude?');
  const second = await normalizer.normalize('Unde este Gertrude?');
  assert.equal(first.status, 'accepted');
  assert.equal(first.cacheHit, false);
  assert.equal(second.status, 'accepted');
  assert.equal(second.cacheHit, true);
  assert.equal(second.receipt.model, DEFAULT_CODEX_NORMALIZATION_MODEL);
});

test('normalizer makes one bounded language-only repair after a rejected surface proposal', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-normalizer-repair-test-'));
  const executable = join(directory, 'fake-codex.mjs');
  const rejected = { ...candidate('Gertrude is in the garden.'), operation: 'simplification', sourceLanguage: 'en' };
  const repaired = { ...candidate('Is Gertrude in the garden?'), operation: 'simplification', sourceLanguage: 'en' };
  await writeFile(executable, `#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
const args = process.argv.slice(2);
const output = args[args.indexOf('--output-last-message') + 1];
let prompt = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { prompt += chunk; });
process.stdin.on('end', () => {
  const value = prompt.includes('bounded feedback attempt')
    ? ${JSON.stringify(repaired)}
    : ${JSON.stringify(rejected)};
  writeFileSync(output, JSON.stringify(value));
  process.stdout.write('{"type":"turn.completed"}\\n');
});
`, 'utf8');
  await chmod(executable, 0o755);
  const normalizer = new CodexLanguageNormalizer({
    command: executable, cache: false, timeoutMs: 5_000,
  });
  const result = await normalizer.normalize('In the garden, is Gertrude?');
  assert.equal(result.status, 'accepted');
  assert.equal(result.externalInvocations, 2);
  assert.deepEqual(result.receipts.map((receipt) => receipt.attempt), [1, 2]);
});

test('assisted runtime invokes normalization only for UNPARSED and reparses through the same runtime', async () => {
  const calls = [];
  const runtime = {
    model: { manifest: {} }, providers: [], selected: [], core: {},
    memorySnapshot: () => undefined, score: () => ({ score: 0 }),
    ask: async (text) => {
      calls.push(text);
      if (text === 'unsupported wording') return { status: 'UNPARSED', languageRoute: 'direct-symbolic' };
      return { status: 'SOLVED', answer: 'yes', values: [true], languageRoute: 'direct-symbolic' };
    },
  };
  let normalizationCalls = 0;
  const normalizer = {
    configuration: () => ({ enabled: true }),
    normalize: async () => {
      normalizationCalls += 1;
      return {
        status: 'accepted', model: DEFAULT_CODEX_NORMALIZATION_MODEL, cacheHit: false,
        candidate: candidate('Is Gertrude present?'), validation: { accepted: true },
      };
    },
  };
  const assisted = new LanguageAgentAssistedRuntime(runtime, normalizer);
  assert.equal((await assisted.ask('already supported')).languageRoute, 'direct-symbolic');
  assert.equal(normalizationCalls, 0);
  const result = await assisted.ask('unsupported wording');
  assert.equal(result.languageRoute, 'language-agent-normalized');
  assert.equal(normalizationCalls, 1);
  assert.deepEqual(calls, ['already supported', 'unsupported wording', 'Is Gertrude present?']);
});

test('Language Agent receives bounded parser feedback and can propose a different CNL form', async () => {
  const calls = [];
  const runtime = {
    model: { manifest: {} }, providers: [], selected: [], core: {},
    memorySnapshot: () => undefined, score: () => ({ score: 0 }),
    ask: async (text) => {
      calls.push(text);
      if (text === 'Is Gertrude present?') return { status: 'SOLVED', answer: 'yes', values: [true] };
      return { status: 'UNPARSED', languageRoute: 'direct-symbolic' };
    },
  };
  const episodes = [];
  const normalizer = {
    configuration: () => ({ enabled: true }),
    normalize: async (_text, episode) => {
      episodes.push(episode);
      const second = episodes.length === 2;
      return {
        status: 'accepted', model: DEFAULT_CODEX_NORMALIZATION_MODEL, cacheHit: false,
        externalInvocations: 1, receipts: [{ attempt: episodes.length }],
        candidate: candidate(second ? 'Is Gertrude present?' : 'Gertrude present?'),
        validation: { accepted: true },
      };
    },
  };
  const result = await new LanguageAgentAssistedRuntime(runtime, normalizer).ask('unsupported wording');
  assert.equal(result.status, 'SOLVED');
  assert.equal(result.languageRoute, 'language-agent-normalized');
  assert.equal(result.normalization.proposalCount, 2);
  assert.equal(result.normalization.externalInvocations, 2);
  assert.deepEqual(episodes[0].feedback, []);
  assert.match(episodes[1].feedback.join(' '), /frontend returned UNPARSED/u);
  assert.equal(episodes[1].previousCandidate, 'Gertrude present?');
  assert.deepEqual(calls, ['unsupported wording', 'Gertrude present?', 'Is Gertrude present?']);
});

test('Romanian check-in translation returns through the generic symbolic meta-intent', async () => {
  const runtime = new EslmEngine(await createCoreModel());
  const normalizer = {
    configuration: () => ({ enabled: true }),
    normalize: async () => ({
      status: 'accepted', model: DEFAULT_CODEX_NORMALIZATION_MODEL, cacheHit: false,
      requestedOperation: 'translation', externalInvocations: 1,
      candidate: {
        protocol: CODEX_NORMALIZATION_PROTOCOL, operation: 'translation', sourceLanguage: 'ro',
        normalizedEnglish: 'How are you?', alignments: [],
      },
      validation: { accepted: true },
    }),
  };
  const result = await new LanguageAgentAssistedRuntime(runtime, normalizer).ask('Ce mai faci?');
  assert.equal(result.languageRoute, 'language-agent-normalized');
  assert.equal(result.status, 'SOLVED');
  assert.deepEqual(result.values, ['ready']);
});
