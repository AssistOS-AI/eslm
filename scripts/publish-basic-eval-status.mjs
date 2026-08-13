#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import {
  contentDigest,
  executableCheckpointDigest,
} from '../src/evaluation/evaluation-checkpoint.mjs';

const DEFAULT_ROOT = resolve(new URL('..', import.meta.url).pathname);
const PROFILE_IDS = Object.freeze(['core-only', 'quick-assisted', 'real-kb']);

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readOptionalJson(path) {
  try {
    return await readJson(path);
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined;
    throw error;
  }
}

function countBy(values, selector) {
  const counts = {};
  for (const value of values) {
    const key = selector(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).toSorted(([left], [right]) =>
    left.localeCompare(right)));
}

function sortedClusters(summary) {
  return Object.entries(summary.counts.byStage ?? {})
    .map(([stage, count]) => ({ stage, count }))
    .toSorted((left, right) => right.count - left.count || left.stage.localeCompare(right.stage));
}

export async function publishBasicEvalStatus({ repositoryRoot = DEFAULT_ROOT } = {}) {
  const casesPath = resolve(repositoryRoot, 'eval/basic-everyday/cases.jsonl');
  const controlsPath = resolve(repositoryRoot, 'eval/basic-everyday/structural-controls.jsonl');
  const [caseSource, controlsSource] = await Promise.all([
    readFile(casesPath, 'utf8'), readFile(controlsPath, 'utf8'),
  ]);
  const cases = caseSource.trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
  const controls = controlsSource.trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
  const executableDigest = await executableCheckpointDigest(repositoryRoot);
  const caseManifestDigest = contentDigest(caseSource);
  const controlManifestDigest = contentDigest(controlsSource);
  const semanticReview = await readOptionalJson(resolve(repositoryRoot,
    'eval/basic-everyday/results/semantic-reviews.current.summary.json'));
  const profiles = [];
  for (const profileId of PROFILE_IDS) {
    const summaryPath = resolve(repositoryRoot,
      `eval/basic-everyday/results/${profileId}.current.summary.json`);
    const summary = await readJson(summaryPath);
    const counts = summary.counts.byProfile[profileId];
    const reviewed = semanticReview?.profiles?.[profileId];
    const reviewCurrent = counts.review === 0 || reviewed?.resultDigest === summary.resultDigest;
    const reviewedPass = reviewCurrent ? (reviewed?.pass ?? 0) : 0;
    const reviewedFail = reviewCurrent ? (reviewed?.fail ?? 0) : 0;
    const reviewedCount = reviewCurrent ? (reviewed?.reviewed ?? 0) : 0;
    const validatedPass = counts.pass + reviewedPass;
    const qualitativeFail = counts.fail + reviewedFail;
    const pendingReview = Math.max(0, counts.review - reviewedCount);
    profiles.push({
      profileId,
      generatedAt: summary.generatedAt,
      current: summary.executableDigest === executableDigest
        && summary.caseManifestDigest === caseManifestDigest,
      executableDigest: summary.executableDigest,
      caseManifestDigest: summary.caseManifestDigest,
      resultDigest: summary.resultDigest,
      counts,
      semanticReview: {
        current: reviewCurrent, reviewed: reviewedCount, pass: reviewedPass, fail: reviewedFail,
      },
      validated: { pass: validatedPass, fail: qualitativeFail, pendingReview },
      validatedPassPercent: counts.total === 0 ? 0
        : Number((validatedPass * 100 / counts.total).toFixed(1)),
      passPercent: counts.total === 0 ? 0 : Number((counts.pass * 100 / counts.total).toFixed(1)),
      reviewPercent: counts.total === 0 ? 0 : Number((counts.review * 100 / counts.total).toFixed(1)),
      failureClusters: sortedClusters(summary),
      byCategory: summary.counts.byCategory,
    });
  }
  const controlSummary = await readOptionalJson(resolve(repositoryRoot,
    'eval/basic-everyday/results/structural-controls.current.summary.json'));
  const controlCounts = controlSummary?.counts?.byProfile?.['quick-assisted']
    ?? { total: controls.length, pass: 0, fail: controls.length, review: 0 };
  const controlCurrent = controlSummary?.executableDigest === executableDigest
    && controlSummary?.caseManifestDigest === controlManifestDigest;
  const preferredProfiles = profiles.filter((profile) => ['core-only', 'real-kb'].includes(profile.profileId));
  const preferredTotal = preferredProfiles.reduce((sum, profile) => sum + profile.counts.total, 0);
  if (preferredTotal !== cases.length) {
    throw new Error(`Preferred Basic Eval profiles account for ${preferredTotal} of ${cases.length} source cases.`);
  }
  const preferredPass = preferredProfiles.reduce((sum, profile) => sum + profile.validated.pass, 0);
  const preferredFail = preferredProfiles.reduce((sum, profile) => sum + profile.validated.fail, 0);
  const preferredPending = preferredProfiles.reduce((sum, profile) =>
    sum + profile.validated.pendingReview, 0);
  const status = {
    format: 'eslm-basic-eval-status',
    generatedAt: new Date().toISOString(),
    sourceDevelopmentDisclosure: 'All converted source cases are development-visible and may influence implementation.',
    inventory: {
      sourceCases: cases.length,
      structuralControls: controls.length,
      totalCasesAndControls: cases.length + controls.length,
      convertedCases: cases.filter((item) => item.pool === 'source-development').length,
      categories: Object.keys(countBy(cases, (item) => item.category)).length,
      byCategory: countBy(cases, (item) => item.category),
      byScoring: countBy(cases, (item) => item.scoring),
      profileAssignments: countBy(cases.flatMap((item) => item.profiles), (profile) => profile),
      caseManifestDigest,
      controlManifestDigest,
    },
    checkpoint: {
      executableDigest,
      allProfilesCurrent: profiles.every((profile) => profile.current),
      currentProfileCount: profiles.filter((profile) => profile.current).length,
      expectedProfileCount: profiles.length,
    },
    profiles,
    preferredSourceOutcome: {
      profiles: ['core-only', 'real-kb'], total: preferredTotal, pass: preferredPass,
      fail: preferredFail, pendingReview: preferredPending,
      passPercent: Number((preferredPass * 100 / preferredTotal).toFixed(1)),
      meaning: 'Each source case is counted once through its core-only or source-derived real-KB profile; QUICK is auxiliary development evidence.',
    },
    structuralControls: {
      current: controlCurrent, generatedAt: controlSummary?.generatedAt ?? null,
      counts: controlCounts,
    },
    baseline: {
      sourceCases: 1000,
      status: 'diagnostic-only',
      observation: 'The original Romanian prompts all stopped at the English boundary; this is not a score for the converted English corpus.',
    },
  };
  const outputPath = resolve(repositoryRoot, 'docs/results/latest-basic-eval-status.json');
  await writeFile(outputPath, `${JSON.stringify(status, null, 2)}\n`, 'utf8');
  return { outputPath, status };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { outputPath, status } = await publishBasicEvalStatus();
  process.stdout.write(`${outputPath}\n${JSON.stringify(status.checkpoint, null, 2)}\n`);
}
