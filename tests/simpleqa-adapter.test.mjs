import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  parseSimpleQaEvaluationCsv,
  runSimpleQaDiagnosticProbe,
  sampleSimpleQa,
  simpleQaCacheStatus,
} from '../src/evaluation/simpleqa-adapter.mjs';
import {
  assertBenchmarkAcquirable,
  benchmarkAccessManifest,
} from '../src/evaluation/benchmark-access-manifests.mjs';

const FIXTURE = Buffer.from([
  'metadata,problem,answer',
  '"{\'topic\': \'Science\', \'answer_type\': \'Person\'}","Who said ""hello, world""?","Ada, Lovelace"',
  '"{\'topic\': \'History\', \'answer_type\': \'Text\'}","Which line has a',
  'break?",Second',
].join('\r\n'));

test('SimpleQA adapter separates label-free cases from its evaluation-only oracle', () => {
  const pool = parseSimpleQaEvaluationCsv(FIXTURE);
  assert.equal(pool.cases.length, 2);
  assert.deepEqual(pool.cases[0], {
    id: 'simpleqa:test:00001',
    family: 'SimpleQA',
    split: 'test',
    kind: 'qa',
    text: 'Who said "hello, world"?',
    strata: { topic: 'Science', answerType: 'Person' },
  });
  assert.equal('answer' in pool.cases[0], false);
  assert.equal(pool.oracle.get('simpleqa:test:00001'), 'Ada, Lovelace');
  assert.equal(pool.cases[1].text, 'Which line has a\r\nbreak?');
  assert.equal(pool.leakagePolicy.oracle, 'local-evaluator-only-never-synthesis-visible');
});

test('SimpleQA adapter rejects malformed schema and preserves deterministic stratification', () => {
  assert.throws(
    () => parseSimpleQaEvaluationCsv(Buffer.from('problem,answer\nQuestion?,Answer\n')),
    /header mismatch/u,
  );
  const pool = parseSimpleQaEvaluationCsv(FIXTURE);
  assert.deepEqual(sampleSimpleQa(pool, 2, 'fixed').map((item) => item.strata.topic), ['History', 'Science']);
  assert.deepEqual(sampleSimpleQa(pool, 2, 'fixed'), sampleSimpleQa(pool, 2, 'fixed'));
});

test('benchmark registrations distinguish gated, delivered, and public acquisition authority', () => {
  const ewok = benchmarkAccessManifest('ewok-core-1.0');
  const storyCloze = benchmarkAccessManifest('story-cloze-winter-2018');
  assert.equal(ewok.access.state, 'gated-explicit-acceptance-required');
  assert.match(ewok.access.operatorAction, /Sign in to Hugging Face/u);
  assert.equal(storyCloze.access.state, 'authorized-delivered-links');
  assert.match(storyCloze.access.actionUrl, /cs\.rochester\.edu/u);
  assert.throws(() => assertBenchmarkAcquirable('ewok-core-1.0'), /cannot be acquired automatically/u);
  assert.throws(() => assertBenchmarkAcquirable('story-cloze-winter-2018'), /cannot be acquired automatically/u);
  assert.equal(assertBenchmarkAcquirable('simpleqa-official-test-2024').access.state, 'public-direct-download');
});

test('SimpleQA diagnostic probe reports parser fallback separately from strict exact match', async () => {
  const pool = parseSimpleQaEvaluationCsv(FIXTURE);
  const engine = {
    async ask(text) {
      return text.startsWith('Who')
        ? { status: 'SOLVED', answer: 'Ada Lovelace', languageRoute: 'direct-symbolic' }
        : { status: 'UNPARSED', answer: 'Unsupported', languageRoute: 'direct-symbolic' };
    },
  };
  const report = await runSimpleQaDiagnosticProbe(engine, pool, { count: 2, seed: 'fixed' });
  assert.equal(report.exact, 1);
  assert.equal(report.exactRate, 0.5);
  assert.equal(report.wouldRequireLanguageFallback, 1);
  assert.equal(report.languageFallbackRate, 0.5);
  assert.equal(report.comparability, 'not-an-official-simpleqa-score');
  assert.deepEqual(report.statusCounts, { UNPARSED: 1, SOLVED: 1 });
});

test('SimpleQA cache status reports an absent cache without claiming acquisition', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'eslm-simpleqa-status-'));
  const status = await simpleQaCacheStatus({ cacheRoot: join(temporary, 'absent') });
  assert.deepEqual(status, {
    benchmarkId: 'simpleqa-official-test-2024',
    cached: false,
    reason: 'Run explicit SimpleQA acquisition before evaluation.',
  });
});
