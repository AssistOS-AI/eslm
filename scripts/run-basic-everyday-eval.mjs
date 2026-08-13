#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { createCliRuntime } from '../src/interface/cli-runtime-composition.mjs';
import {
  contentDigest,
  executableCheckpointDigest,
  knowledgePackageManifestDigests,
} from '../src/evaluation/evaluation-checkpoint.mjs';
import { publishBasicEvalStatus } from './publish-basic-eval-status.mjs';
import { scoreBasicEvalCase } from '../src/evaluation/basic-eval-scoring.mjs';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const DEFAULT_CASES = resolve(ROOT, 'eval/basic-everyday/cases.jsonl');
const DEFAULT_OUTPUT = resolve(ROOT, 'eval/basic-everyday/results/current.jsonl');
const PROFILE_KBS = Object.freeze({
  'core-only': '',
  'quick-assisted': 'quick',
  'real-kb': 'oewn-2025,geonames-2026,conceptnet-5.7.0-en,world-relations-1.0',
});

function options(argv) {
  const parsed = { cases: DEFAULT_CASES, output: DEFAULT_OUTPUT, profile: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--cases') parsed.cases = resolve(argv[++index]);
    else if (value === '--output') parsed.output = resolve(argv[++index]);
    else if (value === '--profile') parsed.profile = argv[++index];
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (parsed.profile && !Object.hasOwn(PROFILE_KBS, parsed.profile)) {
    throw new Error(`Unknown profile ${parsed.profile}.`);
  }
  return parsed;
}

function resultRecord(testCase, profile, result, scoring, checkpoint) {
  return {
    format: 'eslm-basic-everyday-eval-result',
    caseId: testCase.id,
    category: testCase.category,
    pool: testCase.pool,
    profile,
    machine: {
      status: result.status,
      answer: result.answer,
      route: result.languageRoute,
      method: result.reasoning?.method ?? result.plan?.methodId ?? null,
      taskOperation: result.reasoning?.operation ?? result.taskFrame?.goals?.[0]?.operation ?? null,
      usedKnowledgeBases: result.usedKbVersions,
      consultedKnowledgeBases: result.consultedKbVersions,
    },
    renderedAnswer: result.answer,
    ...scoring,
    checkpoint,
  };
}

function summarize(records) {
  const counts = { total: records.length, pass: 0, fail: 0, review: 0, byProfile: {}, byCategory: {}, byStage: {} };
  for (const record of records) {
    counts[record.score.state] += 1;
    counts.byProfile[record.profile] ??= { total: 0, pass: 0, fail: 0, review: 0 };
    counts.byProfile[record.profile].total += 1;
    counts.byProfile[record.profile][record.score.state] += 1;
    counts.byCategory[record.category] ??= { total: 0, pass: 0, fail: 0, review: 0 };
    counts.byCategory[record.category].total += 1;
    counts.byCategory[record.category][record.score.state] += 1;
    if (record.diagnosis.earliestStage) {
      counts.byStage[record.diagnosis.earliestStage] =
        (counts.byStage[record.diagnosis.earliestStage] ?? 0) + 1;
    }
  }
  return counts;
}

async function main() {
  const configuration = options(process.argv.slice(2));
  const source = await readFile(configuration.cases, 'utf8');
  const cases = source.trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
  const profiles = configuration.profile ? [configuration.profile] : Object.keys(PROFILE_KBS);
  const executable = await executableCheckpointDigest(ROOT);
  const caseManifest = contentDigest(source);
  const records = [];
  for (const profile of profiles) {
    const selectedCases = cases.filter((testCase) => testCase.profiles.includes(profile));
    if (selectedCases.length === 0) continue;
    const runtime = await createCliRuntime({
      kb: PROFILE_KBS[profile], 'no-external-language-agent': true,
      'external-language-agent': false, 'memory-policy': profile === 'real-kb' ? 'lazy' : 'auto',
    });
    const kbIds = PROFILE_KBS[profile].split(',').filter(Boolean);
    const checkpoint = { executableDigest: executable, caseManifestDigest: caseManifest,
      kbDigests: await knowledgePackageManifestDigests(ROOT, kbIds) };
    for (const [index, testCase] of selectedCases.entries()) {
      const result = await runtime.ask(testCase.prompt, {}, { grounding: false });
      const scoring = scoreBasicEvalCase(testCase, result);
      records.push(resultRecord(testCase, profile, result, scoring, checkpoint));
      if ((index + 1) % 100 === 0) process.stderr.write(`${profile}: ${index + 1}/${selectedCases.length}\n`);
    }
  }
  const body = `${records.map((record) => JSON.stringify(record)).join('\n')}\n`;
  await mkdir(dirname(configuration.output), { recursive: true });
  await writeFile(configuration.output, body, 'utf8');
  const summary = {
    format: 'eslm-basic-everyday-eval-summary',
    generatedAt: new Date().toISOString(),
    sourceDevelopmentDisclosure: cases.every((item) => item.pool === 'structural-control')
      ? 'These independently authored controls are development-visible regression evidence over declared packages.'
      : 'Every source case is development-visible and may influence implementation.',
    cases: relative(ROOT, configuration.cases), output: relative(ROOT, configuration.output),
    resultDigest: contentDigest(body), executableDigest: executable, caseManifestDigest: caseManifest,
    profiles: Object.fromEntries(profiles.map((profile) => [profile, { knowledgeBases: PROFILE_KBS[profile] || [] }])),
    counts: summarize(records),
  };
  const summaryPath = configuration.output.replace(/\.jsonl$/u, '.summary.json');
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  const canonicalResultsDirectory = `${resolve(ROOT, 'eval/basic-everyday/results')}/`;
  if (configuration.output.startsWith(canonicalResultsDirectory)
      && configuration.output.endsWith('.current.jsonl')) {
    await publishBasicEvalStatus({ repositoryRoot: ROOT });
  }
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

await main();
