#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { contentDigest } from '../src/evaluation/evaluation-checkpoint.mjs';
import { normalizeBasicEvalAnswer } from '../src/evaluation/basic-eval-scoring.mjs';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const CASES_PATH = resolve(ROOT, 'eval/basic-everyday/cases.jsonl');
const POLICY_PATH = resolve(ROOT, 'eval/basic-everyday/semantic-review-policy.json');
const OUTPUT_PATH = resolve(ROOT, 'eval/basic-everyday/results/semantic-reviews.current.jsonl');
const SUMMARY_PATH = resolve(ROOT, 'eval/basic-everyday/results/semantic-reviews.current.summary.json');

function lines(source) {
  return source.trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
}

function wordCount(value) {
  return String(value).match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

function normalizedTokens(value) {
  return new Set(normalizeBasicEvalAnswer(value).match(/[\p{L}\p{N}]+/gu) ?? []);
}

function assertCommonPassGuards(testCase, result) {
  const answer = String(result.machine.answer ?? '');
  if (!answer.trim()) throw new Error(`${testCase.id}: reviewed pass has an empty answer.`);
  for (const concept of testCase.reference.requiredConcepts ?? []) {
    if (!normalizeBasicEvalAnswer(answer).includes(normalizeBasicEvalAnswer(concept))) {
      throw new Error(`${testCase.id}: reviewed pass omits required concept ${concept}.`);
    }
  }
  for (const claim of testCase.reference.forbiddenClaims ?? []) {
    if (normalizeBasicEvalAnswer(answer).includes(normalizeBasicEvalAnswer(claim))) {
      throw new Error(`${testCase.id}: reviewed pass contains forbidden claim ${claim}.`);
    }
  }
  const count = wordCount(answer);
  if (testCase.constraints?.expectedMaxWords && count > testCase.constraints.expectedMaxWords) {
    throw new Error(`${testCase.id}: reviewed pass exceeds the word limit.`);
  }
}

function assertCategoryPassGuards(testCase, result) {
  const answer = String(result.machine.answer);
  if (['text-correction', 'extraction'].includes(testCase.category)
      && answer.trim() !== testCase.reference.answer.trim()) {
    throw new Error(`${testCase.id}: exact semantic surface changed after review.`);
  }
  if (testCase.category === 'structured-extraction'
      && (!answer.includes('| Field | Value |') || !/Observations:/u.test(answer))) {
    throw new Error(`${testCase.id}: structured extraction lost its table or observations.`);
  }
  if (testCase.category === 'rewriting'
      && !/^(?:Please\b|I noticed\b)/u.test(answer)) {
    throw new Error(`${testCase.id}: polite rewriting lacks a reviewed courtesy construction.`);
  }
  if (testCase.category === 'rewriting' && /\bPlease\s+(?:i|you)\b/u.test(answer)) {
    throw new Error(`${testCase.id}: polite rewriting retained an ungrammatical wrapper.`);
  }
  if (testCase.category === 'title-generation') {
    const finalWord = normalizeBasicEvalAnswer(answer).split(' ').at(-1);
    if (['a', 'an', 'and', 'for', 'in', 'of', 'the', 'to'].includes(finalWord)) {
      throw new Error(`${testCase.id}: title ends in an incomplete connector.`);
    }
  }
  if (testCase.category === 'summarization') {
    const referenceTokens = normalizedTokens(testCase.reference.answer);
    const answerTokens = normalizedTokens(answer);
    const shared = [...referenceTokens].filter((token) => answerTokens.has(token)).length;
    if (referenceTokens.size > 0 && shared / referenceTokens.size < 0.45) {
      throw new Error(`${testCase.id}: summary lacks sufficient reference-content overlap.`);
    }
  }
  if (testCase.category === 'vocabulary'
      && !result.machine.usedKnowledgeBases.some((identity) => identity.kbId === 'oewn-2025')) {
    throw new Error(`${testCase.id}: lexical review pass lacks source-derived WordNet provenance.`);
  }
}

const [caseSource, policySource] = await Promise.all([
  readFile(CASES_PATH, 'utf8'), readFile(POLICY_PATH, 'utf8'),
]);
const cases = new Map(lines(caseSource).map((item) => [item.id, item]));
const policy = JSON.parse(policySource);
const reviews = [];
const profileSummaries = {};
for (const [profile, categories] of Object.entries(policy.profiles)) {
  const resultPath = resolve(ROOT, `eval/basic-everyday/results/${profile}.current.jsonl`);
  const summaryPath = resolve(ROOT, `eval/basic-everyday/results/${profile}.current.summary.json`);
  const [resultSource, resultSummary] = await Promise.all([
    readFile(resultPath, 'utf8'), readFile(summaryPath, 'utf8').then(JSON.parse),
  ]);
  if (contentDigest(resultSource) !== resultSummary.resultDigest) {
    throw new Error(`${profile}: result bytes do not match the summary digest.`);
  }
  const pending = lines(resultSource).filter((item) => item.score.state === 'review');
  const accounted = new Set();
  const counts = { reviewed: 0, pass: 0, fail: 0 };
  for (const [category, categoryPolicy] of Object.entries(categories)) {
    const categoryResults = pending.filter((item) => item.category === category);
    if (categoryResults.length !== categoryPolicy.expectedCount) {
      throw new Error(`${profile}/${category}: expected ${categoryPolicy.expectedCount} review rows, found ${categoryResults.length}.`);
    }
    for (const result of categoryResults) {
      const testCase = cases.get(result.caseId);
      if (!testCase) throw new Error(`${result.caseId}: no matching Basic Eval case.`);
      const decision = categoryPolicy.failCaseIds?.includes(result.caseId)
        ? 'fail' : categoryPolicy.decision;
      if (decision === 'pass') {
        assertCommonPassGuards(testCase, result);
        assertCategoryPassGuards(testCase, result);
      }
      accounted.add(result.caseId);
      counts.reviewed += 1;
      counts[decision] += 1;
      reviews.push({
        format: 'eslm-basic-eval-semantic-review',
        caseId: result.caseId,
        profile,
        category,
        resultDigest: resultSummary.resultDigest,
        decision,
        dimensions: decision === 'pass'
          ? { correctness: 1, completeness: 1, grounding: 1, instructionFit: 1, naturalness: 1 }
          : { correctness: 0, completeness: 0, grounding: 0, instructionFit: 0, naturalness: 0 },
        reviewer: policy.reviewer,
        reviewerKind: policy.reviewerKind,
        explanation: decision === 'pass'
          ? categoryPolicy.explanation : categoryPolicy.failureExplanation ?? categoryPolicy.explanation,
      });
    }
  }
  const unaccounted = pending.filter((item) => !accounted.has(item.caseId));
  if (unaccounted.length > 0) {
    throw new Error(`${profile}: ${unaccounted.length} semantic results remain outside the review policy.`);
  }
  profileSummaries[profile] = {
    resultDigest: resultSummary.resultDigest,
    executableDigest: resultSummary.executableDigest,
    ...counts,
  };
}
reviews.sort((left, right) => left.profile.localeCompare(right.profile)
  || left.caseId.localeCompare(right.caseId));
const body = `${reviews.map((item) => JSON.stringify(item)).join('\n')}\n`;
await writeFile(OUTPUT_PATH, body, 'utf8');
const summary = {
  format: 'eslm-basic-eval-semantic-review-summary',
  generatedAt: new Date().toISOString(),
  policy: 'eval/basic-everyday/semantic-review-policy.json',
  policyDigest: contentDigest(policySource),
  output: 'eval/basic-everyday/results/semantic-reviews.current.jsonl',
  outputDigest: contentDigest(body),
  profiles: profileSummaries,
};
await writeFile(SUMMARY_PATH, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
