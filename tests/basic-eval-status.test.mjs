import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { publishBasicEvalStatus } from '../scripts/publish-basic-eval-status.mjs';
import {
  BASIC_EVAL_CASE_COUNT, BASIC_EVAL_SOURCE_CASE_COUNT, loadBasicEvalCases,
} from '../src/evaluation/basic-eval-catalog.mjs';

test('Basic Eval inventory separates source cases, controls, and knowledge profiles', async () => {
  const cases = await loadBasicEvalCases();
  assert.equal(cases.length, BASIC_EVAL_CASE_COUNT);
  assert.equal(cases.filter((item) => item.pool === 'source-development').length,
    BASIC_EVAL_SOURCE_CASE_COUNT);
  assert.ok(cases.filter((item) => item.category === 'vocabulary')
    .every((item) => item.profiles.join(',') === 'real-kb'));
});

test('status excludes raw review rows and stale decisions from qualitative success', async () => {
  const { status } = await publishBasicEvalStatus();
  assert.equal(status.checkpoint.allProfilesCurrent, true);
  assert.deepEqual(status.preferredSourceOutcome, {
    profiles: ['core-only', 'real-kb'], total: 1000, pass: 639, fail: 361,
    pendingReview: 0, passPercent: 63.9,
    meaning: 'Each source case is counted once through its core-only or source-derived real-KB profile; QUICK is auxiliary development evidence.',
  });
  assert.equal(status.structuralControls.counts.pass, 10);
  const real = status.profiles.find((profile) => profile.profileId === 'real-kb');
  assert.deepEqual(real.semanticReview, { current: true, reviewed: 83, pass: 35, fail: 48 });
});

test('semantic review ledger rejects ambiguous lexical senses instead of counting fluency', async () => {
  const source = await readFile('eval/basic-everyday/results/semantic-reviews.current.jsonl', 'utf8');
  const reviews = source.trim().split(/\r?\n/u).map(JSON.parse);
  for (const caseId of ['everyday-0188', 'everyday-0389', 'everyday-0479', 'everyday-0484']) {
    assert.equal(reviews.find((item) => item.caseId === caseId)?.decision, 'fail');
  }
  for (const caseId of ['everyday-0108', 'everyday-0474', 'everyday-0772']) {
    assert.equal(reviews.find((item) => item.caseId === caseId)?.decision, 'fail');
  }
});
