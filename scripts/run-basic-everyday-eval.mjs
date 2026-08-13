#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { createCliRuntime } from '../src/interface/cli-runtime-composition.mjs';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const DEFAULT_CASES = resolve(ROOT, 'eval/basic-everyday/cases.jsonl');
const DEFAULT_OUTPUT = resolve(ROOT, 'eval/basic-everyday/results/current.jsonl');
const PROFILE_KBS = Object.freeze({
  'core-only': '',
  'quick-assisted': 'quick',
  'real-kb': 'oewn-2025,geonames-2026,conceptnet-5.7.0-en,world-relations-1.0',
});
const SUCCESS = new Set(['SOLVED', 'PARTIAL', 'DEFEASIBLE']);

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

function digest(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

async function filesUnder(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries.toSorted((left, right) => left.name.localeCompare(right.name))) {
    const target = resolve(path, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(target));
    else if (entry.isFile()) files.push(target);
  }
  return files;
}

async function executableDigest() {
  const files = await filesUnder(resolve(ROOT, 'src'));
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(relative(ROOT, file));
    hash.update('\0');
    hash.update(await readFile(file));
    hash.update('\0');
  }
  return `sha256:${hash.digest('hex')}`;
}

async function kbDigestsFor(ids) {
  const values = [];
  for (const id of ids) {
    const manifest = resolve(ROOT, `training/KBs/${id}/package/manifest.json`);
    values.push(digest(await readFile(manifest)));
  }
  return values.toSorted();
}

function normalizeAnswer(value) {
  return String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase('en-US')
    .replace(/^the symbolic result is\s+[“"]?|[”"]?\.?$/gu, '')
    .replace(/\b(?:lei|ron)\b/gu, 'ron')
    .replace(/\s+/gu, ' ')
    .replace(/[.!?]+$/gu, '')
    .trim();
}

function answerCandidates(testCase) {
  return [testCase.reference.answer, ...(testCase.acceptableAnswers ?? [])].map(normalizeAnswer);
}

function numericEquivalent(left, right) {
  const parse = (value) => {
    const match = normalizeAnswer(value).match(/^(-?\d+(?:\.\d+)?)\s*(.*)$/u);
    if (!match) return undefined;
    return { value: Number(match[1]), unit: match[2].trim() };
  };
  const a = parse(left);
  const b = parse(right);
  return a && b && a.unit === b.unit && Math.abs(a.value - b.value) <= 1e-9;
}

function requiredCoverage(testCase, answer) {
  const required = testCase.reference.requiredConcepts ?? [];
  if (required.length === 0) return 1;
  const surface = normalizeAnswer(answer);
  return required.filter((concept) => surface.includes(normalizeAnswer(concept))).length / required.length;
}

function forbiddenPresent(testCase, answer) {
  const surface = normalizeAnswer(answer);
  return (testCase.reference.forbiddenClaims ?? []).some((claim) =>
    surface.includes(normalizeAnswer(claim)));
}

function diagnose(result, exactCorrect) {
  if (result.languageRoute === 'english-language-gate-rejected') {
    return { earliestStage: 'language-boundary', code: 'likely-non-english',
      summary: 'The local English boundary rejected the request before task framing.' };
  }
  if (result.status === 'UNPARSED') return { earliestStage: 'parse', code: 'no-supported-structure',
    summary: 'No admitted parser or bounded request framer represented the requested operation.' };
  if (!result.taskFrame) return { earliestStage: 'task-frame', code: 'missing-task-frame',
    summary: 'The request did not become an executable typed task.' };
  if (result.status === 'MISSING_KNOWLEDGE' || result.status === 'UNKNOWN') {
    return { earliestStage: 'grounding', code: 'answer-evidence-unavailable',
      summary: 'The selected profile supplied no admitted evidence for the requested answer.' };
  }
  if (result.status === 'NO_APPLICABLE_METHOD') return { earliestStage: 'planning',
    code: 'no-applicable-method', summary: 'No eligible bounded method was selected for the task frame.' };
  if (!exactCorrect) return { earliestStage: 'reasoning', code: 'answer-mismatch',
    summary: 'Execution returned an answer that does not satisfy the exact reference contract.' };
  return { earliestStage: 'realization', code: 'semantic-review-required',
    summary: 'The machine result needs semantic review for completeness and instruction fit.' };
}

function scoreCase(testCase, result) {
  const exactCorrect = answerCandidates(testCase).includes(normalizeAnswer(result.answer))
    || [testCase.reference.answer, ...(testCase.acceptableAnswers ?? [])].some((candidate) =>
      numericEquivalent(candidate, result.answer));
  if (testCase.scoring === 'exact') {
    const pass = SUCCESS.has(result.status) && exactCorrect;
    return {
      score: {
        state: pass ? 'pass' : 'fail', deterministic: true,
        dimensions: { correctness: pass ? 1 : 0, completeness: pass ? 1 : 0,
          grounding: pass ? 1 : 0, instructionFit: pass ? 1 : 0, naturalness: pass ? 1 : 0 },
        explanation: pass ? 'The normalized answer satisfies the exact case contract.'
          : 'The status or normalized answer does not satisfy the exact case contract.',
      },
      diagnosis: pass ? { earliestStage: null, code: null, summary: '' }
        : diagnose(result, exactCorrect),
    };
  }
  const coverage = requiredCoverage(testCase, result.answer);
  const forbidden = forbiddenPresent(testCase, result.answer);
  const machineFailure = !SUCCESS.has(result.status) || forbidden;
  return {
    score: {
      state: machineFailure ? 'fail' : 'review', deterministic: false,
      dimensions: {
        correctness: machineFailure ? 0 : exactCorrect ? 1 : null,
        completeness: coverage,
        grounding: machineFailure ? 0 : null,
        instructionFit: null,
        naturalness: null,
      },
      explanation: machineFailure
        ? 'The symbolic status or a forbidden claim fails the semantic preconditions.'
        : 'The result passed machine preconditions and awaits explicit semantic review.',
    },
    diagnosis: machineFailure ? diagnose(result, false)
      : { earliestStage: null, code: null, summary: 'Awaiting semantic review.' },
  };
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
  const executable = await executableDigest();
  const caseManifest = digest(source);
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
      kbDigests: await kbDigestsFor(kbIds) };
    for (const [index, testCase] of selectedCases.entries()) {
      const result = await runtime.ask(testCase.prompt, {}, { grounding: false });
      const scoring = scoreCase(testCase, result);
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
    sourceDevelopmentDisclosure: 'Every source case is development-visible and may influence implementation.',
    cases: relative(ROOT, configuration.cases), output: relative(ROOT, configuration.output),
    resultDigest: digest(body), executableDigest: executable, caseManifestDigest: caseManifest,
    profiles: Object.fromEntries(profiles.map((profile) => [profile, { knowledgeBases: PROFILE_KBS[profile] || [] }])),
    counts: summarize(records),
  };
  const summaryPath = configuration.output.replace(/\.jsonl$/u, '.summary.json');
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

await main();
