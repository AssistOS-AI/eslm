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

function romanianWhereCandidate() {
  return {
    protocol: CODEX_NORMALIZATION_PROTOCOL,
    operation: 'translation',
    sourceLanguage: 'ro',
    normalizedEnglish: 'Where is Gertrude?',
    alignments: [
      { kind: 'interrogative', source: 'Unde', target: 'Where' },
      { kind: 'lexical-content', source: 'este', target: 'is' },
      { kind: 'named-entity', source: 'Gertrude', target: 'Gertrude' },
    ],
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
  assert.equal(validateCodexNormalization('Unde este Gertrude?', romanianWhereCandidate()).accepted, true);
  const changedNegation = {
    ...candidate('Is Gertrude in room 4?'),
    alignments: [
      { kind: 'named-entity', source: 'Gertrude', target: 'Gertrude' },
      { kind: 'directed-relation', source: 'în', target: 'in' },
      { kind: 'number', source: '4', target: '4' },
      { kind: 'lexical-content', source: 'camera', target: 'room' },
    ],
  };
  assert.equal(validateCodexNormalization('Gertrude nu este în camera 4?', changedNegation).accepted, false);
  assert.match(validateCodexNormalization('Gertrude nu este în camera 4?', changedNegation).errors.join(' '), /negation/u);
});

test('Romanian idiomatic mai is not mistaken for a comparison operator', () => {
  const checkIn = {
    protocol: CODEX_NORMALIZATION_PROTOCOL,
    operation: 'translation',
    sourceLanguage: 'ro',
    normalizedEnglish: 'How are you?',
    alignments: [
      { kind: 'interrogative', source: 'Ce', target: 'How' },
      { kind: 'lexical-content', source: 'Ce mai faci', target: 'How are you' },
    ],
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
      { kind: 'comparison', source: 'mai mare decât', target: 'bigger than' },
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
    alignments: [
      { kind: 'directed-relation', source: 'In', target: 'in' },
      { kind: 'named-entity', source: 'Gertrude', target: 'Gertrude' },
    ],
  };
  assert.equal(validateCodexNormalization('In the garden, is Gertrude?', simplified).accepted, true);
  assert.equal(validateCodexNormalization('In the garden, is Gertrude?', {
    ...simplified, normalizedEnglish: 'Gertrude is in the garden.',
  }).accepted, false);
});

test('protected operators preserve typed identity and relation direction instead of only counts', () => {
  const simplification = (normalizedEnglish, alignments) => ({
    protocol: CODEX_NORMALIZATION_PROTOCOL,
    operation: 'simplification',
    sourceLanguage: 'en',
    normalizedEnglish,
    alignments,
  });
  const names = [
    { kind: 'named-entity', source: 'Nera', target: 'Nera' },
    { kind: 'named-entity', source: 'Vela', target: 'Vela' },
  ];
  const leftToRight = validateCodexNormalization('Is Nera left of Vela?', simplification(
    'Is Nera right of Vela?',
    [...names, { kind: 'directed-relation', source: 'left', target: 'right' }],
  ));
  assert.equal(leftToRight.accepted, false);
  assert.match(leftToRight.errors.join(' '), /identity or direction/u);

  const aboveToBelow = validateCodexNormalization('Is Nera above Vela?', simplification(
    'Is Nera below Vela?',
    [...names, { kind: 'directed-relation', source: 'above', target: 'below' }],
  ));
  assert.equal(aboveToBelow.accepted, false);
  assert.match(aboveToBelow.errors.join(' '), /identity or direction/u);

  const allToSome = validateCodexNormalization('Can all penguins swim?', simplification(
    'Can some penguins swim?',
    [
      { kind: 'modality', source: 'Can', target: 'Can' },
      { kind: 'quantifier', source: 'all', target: 'some' },
    ],
  ));
  assert.equal(allToSome.accepted, false);
  assert.match(allToSome.errors.join(' '), /identity or direction/u);

  const swimToFly = validateCodexNormalization('Can all penguins swim?', simplification(
    'Can all penguins fly?',
    [
      { kind: 'modality', source: 'Can', target: 'Can' },
      { kind: 'quantifier', source: 'all', target: 'all' },
    ],
  ));
  assert.equal(swimToFly.accepted, false);
  assert.match(swimToFly.errors.join(' '), /open-class content/u);
});

test('valid left, above, universal, and predicate preservation remains accepted', () => {
  const simplification = (normalizedEnglish, alignments) => ({
    protocol: CODEX_NORMALIZATION_PROTOCOL,
    operation: 'simplification',
    sourceLanguage: 'en',
    normalizedEnglish,
    alignments,
  });
  const cases = [
    {
      source: 'Is Nera left of Vela?', target: 'Is Nera left of Vela?',
      alignments: [
        { kind: 'named-entity', source: 'Nera', target: 'Nera' },
        { kind: 'directed-relation', source: 'left', target: 'left' },
        { kind: 'named-entity', source: 'Vela', target: 'Vela' },
      ],
    },
    {
      source: 'Is Nera above Vela?', target: 'Is Nera above Vela?',
      alignments: [
        { kind: 'named-entity', source: 'Nera', target: 'Nera' },
        { kind: 'directed-relation', source: 'above', target: 'above' },
        { kind: 'named-entity', source: 'Vela', target: 'Vela' },
      ],
    },
    {
      source: 'Can all penguins swim?', target: 'Can all penguins swim?',
      alignments: [
        { kind: 'modality', source: 'Can', target: 'Can' },
        { kind: 'quantifier', source: 'all', target: 'all' },
      ],
    },
  ];
  for (const fixture of cases) {
    const validation = validateCodexNormalization(
      fixture.source,
      simplification(fixture.target, fixture.alignments),
    );
    assert.equal(validation.accepted, true, `${fixture.source}: ${validation.errors.join('; ')}`);
  }
});

test('every recognized protected source anchor requires a compatible exact-substring alignment', () => {
  const base = {
    protocol: CODEX_NORMALIZATION_PROTOCOL,
    operation: 'simplification',
    sourceLanguage: 'en',
    normalizedEnglish: 'Is Nera left of Vela?',
    alignments: [
      { kind: 'named-entity', source: 'Nera', target: 'Nera' },
      { kind: 'named-entity', source: 'Vela', target: 'Vela' },
    ],
  };
  const missing = validateCodexNormalization('Is Nera left of Vela?', base);
  assert.equal(missing.accepted, false);
  assert.match(missing.errors.join(' '), /lacks a compatible exact alignment/u);
  const wrongKind = validateCodexNormalization('Is Nera left of Vela?', {
    ...base,
    alignments: [...base.alignments, { kind: 'quantifier', source: 'left', target: 'left' }],
  });
  assert.equal(wrongKind.accepted, false);
  assert.match(wrongKind.errors.join(' '), /kind does not identify/u);
});

test('reviewed Romanian translations require operator and non-function-content evidence', () => {
  const roomTranslation = {
    protocol: CODEX_NORMALIZATION_PROTOCOL,
    operation: 'translation',
    sourceLanguage: 'ro',
    normalizedEnglish: 'Is Gertrude not in room 4?',
    alignments: [
      { kind: 'named-entity', source: 'Gertrude', target: 'Gertrude' },
      { kind: 'negation', source: 'nu', target: 'not' },
      { kind: 'lexical-content', source: 'este', target: 'Is' },
      { kind: 'directed-relation', source: 'în', target: 'in' },
      { kind: 'lexical-content', source: 'camera', target: 'room' },
      { kind: 'number', source: '4', target: '4' },
    ],
  };
  const accepted = validateCodexNormalization('Gertrude nu este în camera 4?', roomTranslation, {
    expectedOperation: 'translation', operationConfidence: 'high',
  });
  assert.equal(accepted.accepted, true, accepted.errors.join('; '));

  const unreviewed = validateCodexNormalization('Gertrude nu este în camera 4?', {
    ...roomTranslation,
    normalizedEnglish: 'Is Gertrude not in garden 4?',
    alignments: roomTranslation.alignments.map((alignment) => alignment.kind === 'lexical-content'
      ? { ...alignment, target: 'garden' }
      : alignment),
  });
  assert.equal(unreviewed.accepted, false);
  assert.match(unreviewed.errors.join(' '), /not a reviewed equivalence|unverified/u);

  for (const fixture of [
    { source: 'Este Nera la stânga de Vela?', target: 'Is Nera left of Vela?', sourceRelation: 'stânga', targetRelation: 'left' },
    { source: 'Este Nera deasupra Vela?', target: 'Is Nera above Vela?', sourceRelation: 'deasupra', targetRelation: 'above' },
  ]) {
    const directional = validateCodexNormalization(fixture.source, {
      protocol: CODEX_NORMALIZATION_PROTOCOL,
      operation: 'translation',
      sourceLanguage: 'ro',
      normalizedEnglish: fixture.target,
      alignments: [
        { kind: 'named-entity', source: 'Nera', target: 'Nera' },
        { kind: 'directed-relation', source: fixture.sourceRelation, target: fixture.targetRelation },
        { kind: 'named-entity', source: 'Vela', target: 'Vela' },
      ],
    });
    assert.equal(directional.accepted, true, directional.errors.join('; '));
  }
});

test('normalizer accepts a schema-bound subprocess result and reuses it only as an attributed cache hit', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-normalizer-test-'));
  const executable = join(directory, 'fake-codex.mjs');
  await writeFile(executable, `#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
const args = process.argv.slice(2);
const output = args[args.indexOf('--output-last-message') + 1];
writeFileSync(output, JSON.stringify(${JSON.stringify(romanianWhereCandidate())}));
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

test('normalizer escalates from TERM to KILL and completes when a timed-out child ignores TERM', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-normalizer-timeout-test-'));
  const executable = join(directory, 'ignore-term.mjs');
  await writeFile(executable, `#!/usr/bin/env node
process.on('SIGTERM', () => {});
setInterval(() => {}, 1_000);
`, 'utf8');
  await chmod(executable, 0o755);
  const normalizer = new CodexLanguageNormalizer({ command: executable, cache: false, timeoutMs: 500 });
  const started = Date.now();
  const result = await normalizer.normalize('Unde este Gertrude?');
  assert.equal(result.status, 'failed');
  assert.match(result.diagnostic, /timed out/u);
  assert.equal(result.receipt.timedOut, true);
  assert.equal(result.receipt.terminationReason, 'timeout');
  assert.equal(result.receipt.terminationEscalated, true);
  assert.equal(result.receipt.terminationSignal, 'SIGKILL');
  assert.ok(Date.now() - started < 2_500, 'timeout escalation must itself remain bounded');
});

test('normalizer caps multibyte process output in UTF-8 bytes and terminates the producer', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-normalizer-output-test-'));
  const executable = join(directory, 'oversized-output.mjs');
  await writeFile(executable, `#!/usr/bin/env node
process.on('SIGTERM', () => {});
process.stdout.write('🙂'.repeat(600_000));
setInterval(() => {}, 1_000);
`, 'utf8');
  await chmod(executable, 0o755);
  const result = await new CodexLanguageNormalizer({
    command: executable, cache: false, timeoutMs: 5_000,
  }).normalize('Unde este Gertrude?');
  assert.equal(result.status, 'failed');
  assert.match(result.diagnostic, /process output exceeded/u);
  assert.equal(result.receipt.outputLimitExceeded, true);
  assert.equal(result.receipt.stdoutTruncated, true);
  assert.equal(result.receipt.stdoutBytes, 2 * 1024 * 1024);
  assert.equal(result.receipt.stdoutBytes, result.receipt.outputLimitBytes);
  assert.equal(result.receipt.terminationReason, 'output-limit');
});

test('normalizer rejects an oversized response file before reading or parsing it in full', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-normalizer-response-limit-test-'));
  const executable = join(directory, 'oversized-response.mjs');
  await writeFile(executable, `#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
const args = process.argv.slice(2);
const output = args[args.indexOf('--output-last-message') + 1];
writeFileSync(output, Buffer.alloc(1024 * 1024 + 1, 0x20));
`, 'utf8');
  await chmod(executable, 0o755);
  const result = await new CodexLanguageNormalizer({
    command: executable, cache: false, timeoutMs: 5_000,
  }).normalize('Unde este Gertrude?');
  assert.equal(result.status, 'failed');
  assert.match(result.diagnostic, /response exceeds .* UTF-8 bytes/u);
  assert.equal(result.receipt.responseReadStatus, 'oversized');
  assert.equal(result.receipt.responseBytes, 1024 * 1024 + 1);
  assert.equal(result.receipt.responseByteLimit, 1024 * 1024);
});

test('normalizer ignores an oversized cache entry using a bounded read and records the cache failure', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-normalizer-cache-limit-test-'));
  const cacheDirectory = join(directory, 'cache');
  const executable = join(directory, 'fake-codex.mjs');
  await writeFile(executable, `#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
const args = process.argv.slice(2);
const output = args[args.indexOf('--output-last-message') + 1];
writeFileSync(output, JSON.stringify(${JSON.stringify(romanianWhereCandidate())}));
`, 'utf8');
  await chmod(executable, 0o755);
  const normalizer = new CodexLanguageNormalizer({ command: executable, cacheDirectory, timeoutMs: 5_000 });
  const first = await normalizer.normalize('Unde este Gertrude?');
  assert.equal(first.status, 'accepted');
  await writeFile(join(cacheDirectory, `${first.cacheKey}.json`), Buffer.alloc(4 * 1024 * 1024 + 1, 0x20));
  const second = await normalizer.normalize('Unde este Gertrude?');
  assert.equal(second.status, 'accepted');
  assert.equal(second.cacheHit, false);
  assert.equal(second.cacheReadStatus, 'oversized');
  assert.match(second.cacheDiagnostic, /cache entry exceeds .* UTF-8 bytes/u);
  assert.equal(second.externalInvocations, 1);
});

test('normalizer makes one bounded language-only repair after a rejected surface proposal', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-normalizer-repair-test-'));
  const executable = join(directory, 'fake-codex.mjs');
  const protectedAlignments = [
    { kind: 'directed-relation', source: 'In', target: 'in' },
    { kind: 'named-entity', source: 'Gertrude', target: 'Gertrude' },
  ];
  const rejected = {
    ...candidate('Gertrude is in the garden.'), operation: 'simplification', sourceLanguage: 'en',
    alignments: protectedAlignments,
  };
  const repaired = {
    ...candidate('Is Gertrude in the garden?'), operation: 'simplification', sourceLanguage: 'en',
    alignments: protectedAlignments,
  };
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

test('related KB grounding is never included in Language Agent normalization input', async () => {
  const runtime = {
    model: { manifest: {} }, providers: [], selected: [], core: {},
    memorySnapshot: () => undefined, score: () => ({ score: 0 }),
    ask: async (text) => text === 'unsupported wording'
      ? {
        status: 'UNPARSED',
        languageRoute: 'direct-symbolic',
        grounding: { entries: [{ statement: 'PRIVATE_GROUNDING_SENTINEL' }] },
      }
      : { status: 'SOLVED', answer: 'yes', values: [true], languageRoute: 'direct-symbolic' },
  };
  const observed = [];
  const normalizer = {
    configuration: () => ({ enabled: true }),
    normalize: async (text, options) => {
      observed.push({ text, options });
      return {
        status: 'accepted', model: DEFAULT_CODEX_NORMALIZATION_MODEL, cacheHit: false,
        candidate: candidate('Is Gertrude present?'), validation: { accepted: true },
      };
    },
  };
  const result = await new LanguageAgentAssistedRuntime(runtime, normalizer).ask('unsupported wording');
  assert.equal(result.status, 'SOLVED');
  assert.equal(observed.length, 1);
  assert.doesNotMatch(JSON.stringify(observed[0]), /PRIVATE_GROUNDING_SENTINEL/u);
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
