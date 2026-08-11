import { readFile } from 'node:fs/promises';
import { extname, relative } from 'node:path';
import { readJsonLines, writeJson } from './io.mjs';
import { RESEARCH_BENCHMARK_CATALOG } from './evaluation/benchmark-research-catalog.mjs';
import { PROJECT_ROOT } from './paths.mjs';
import { hashFile, sha256 } from './util.mjs';

export const BENCHMARK_CATALOG = Object.freeze({
  blimp: { task: 'minimal-pair preference', license: 'CC BY 4.0', source: 'https://github.com/alexwarstadt/blimp' },
  babi: { task: 'symbolic text understanding and reasoning', license: 'CC BY 3.0 Unported data archive', source: 'https://github.com/facebookarchive/bAbI-tasks' },
  clutrr: { task: 'compositional relational reasoning', license: 'CC BY-NC 4.0', source: 'https://github.com/facebookresearch/clutrr' },
  entityTracking: { task: 'state tracking', license: 'no explicit data license at pinned source', source: 'https://aclanthology.org/2023.acl-long.213/' },
  ewok: { task: 'world-knowledge preference', license: 'acceptance required', source: 'https://arxiv.org/abs/2405.09605' },
  storyCloze: { task: 'narrative ending selection', license: 'dataset terms', source: 'https://aclanthology.org/N16-1098/' },
  simpleqa: { task: 'short-form factual QA', license: 'MIT repository', source: 'https://github.com/openai/simple-evals' },
  ...RESEARCH_BENCHMARK_CATALOG,
});

export const PUBLIC_RESULT_CATALOG = Object.freeze([
  Object.freeze({
    id: 'h-mem-2020-babi15-10k-pe',
    model: 'H-Mem extended model, position encoding',
    dataset: 'bAbI v1.2 Task 15, 10k condition',
    reportedMetric: 'test error rate',
    reportedValue: 0,
    derivedAccuracy: 1,
    source: 'https://proceedings.neurips.cc/paper_files/paper/2020/file/f6876a9f998f6472cc26708e27444456-Supplemental.pdf',
    comparability: 'reference-only',
    reason: 'The paper reports the 10k condition, but this repository has not reproduced its preprocessing, run selection, or exact test-file hash.',
  }),
  Object.freeze({
    id: 'rrn-2018-babi-all',
    model: 'Recurrent Relational Network',
    dataset: 'bAbI, all 20 tasks',
    reportedMetric: 'tasks solved',
    reportedValue: '20/20',
    source: 'https://proceedings.neurips.cc/paper/2018/hash/b9f94c77652c9a76fc8a442748cd54bd-Abstract.html',
    comparability: 'context-only',
    reason: 'The public abstract reports aggregate task success rather than predictions scored by the local Task 15 oracle.',
  }),
]);

function normalizeAnswer(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

async function scoreCase(engine, item) {
  if (item.kind === 'preference') {
    const left = engine.score(item.good);
    const right = engine.score(item.bad);
    return {
      pass: left.score > right.score, actual: [left.score, right.score], status: 'SCORED',
      languageRoute: 'direct-symbolic', normalizationAttempted: false,
    };
  }
  const input = item.context ? `${item.context} ${item.text}` : item.text;
  const result = await engine.ask(input);
  const route = {
    status: result.status, languageRoute: result.languageRoute,
    normalizationAttempted: Boolean(result.normalization?.attempted),
    normalizationStatus: result.normalization?.status,
    normalizationCacheHit: result.normalization?.cacheHit,
    normalizationExternalInvocation: Boolean(result.normalization?.attempted
      && !result.normalization?.cacheHit && result.normalization?.receipt),
  };
  if (item.values) return { pass: JSON.stringify([...result.values ?? []].sort()) === JSON.stringify([...item.values].sort()), actual: result.values, ...route };
  const aliases = [item.answer, ...(item.aliases ?? [])].map(normalizeAnswer);
  return { pass: aliases.includes(normalizeAnswer(result.answer)), actual: result.answer, ...route };
}

export async function runBenchmark(engine, suitePath, publishPath) {
  const suite = await readJsonLines(suitePath);
  const results = [];
  for (let index = 0; index < suite.length; index += 1) {
    results.push({ id: suite[index].id ?? String(index + 1), ...await scoreCase(engine, suite[index]) });
  }
  const report = {
    format: 'eslm-benchmark-report-v2',
    protocol: 'eslm-native-v1',
    createdAt: new Date().toISOString(),
    dataset: { path: relative(PROJECT_ROOT, suitePath), sha256: await hashFile(suitePath) },
    model: {
      id: engine.model.manifest.modelId,
      knowledgeBases: engine.model.manifest.knowledgeBases ?? [],
      comparable: engine.model.manifest.benchmarkComparable !== false,
    },
    total: results.length,
    correct: results.filter((item) => item.pass).length,
    accuracy: results.length ? results.filter((item) => item.pass).length / results.length : 0,
    language: languageMetrics(results),
    results,
  };
  if (publishPath) await writeJson(publishPath, report);
  return report;
}

function accuracyOf(results) {
  return results.length ? results.filter((item) => item.pass).length / results.length : null;
}

function languageMetrics(results) {
  const attempts = results.filter((item) => item.normalizationAttempted);
  const direct = results.filter((item) => !item.normalizationAttempted);
  const normalized = results.filter((item) => item.languageRoute === 'language-agent-normalized');
  const routes = Object.fromEntries([...new Set(results.map((item) => item.languageRoute ?? 'unknown'))]
    .sort().map((route) => [route, results.filter((item) => (item.languageRoute ?? 'unknown') === route).length]));
  return {
    directSymbolicCases: direct.length,
    directSymbolicRate: results.length ? direct.length / results.length : 0,
    specialAnalysisCases: attempts.length,
    specialAnalysisRate: results.length ? attempts.length / results.length : 0,
    externalInvocations: attempts.filter((item) => item.normalizationExternalInvocation).length,
    cacheHits: attempts.filter((item) => item.normalizationCacheHit).length,
    acceptedNormalizations: normalized.length,
    rejectedNormalizations: attempts.filter((item) => item.normalizationStatus !== 'accepted').length,
    directAccuracy: accuracyOf(direct),
    normalizedAccuracy: accuracyOf(normalized),
    routes,
  };
}

export async function importComparison(inputPath, outputPath) {
  if (extname(inputPath) !== '.json') throw new Error('Comparison imports must be JSON manifests.');
  const manifest = JSON.parse(await readFile(inputPath, 'utf8'));
  for (const field of ['model', 'protocol', 'datasetSha256', 'metrics', 'evidenceRegime']) {
    if (manifest[field] === undefined) throw new Error(`Comparison manifest is missing ${field}.`);
  }
  manifest.comparability = manifest.protocol === 'eslm-native-v1' ? 'hash-check-required' : 'reference-only';
  manifest.importedAt = new Date().toISOString();
  await writeJson(outputPath, manifest);
  return manifest;
}

export async function exportBenchmark(suitePath, outputPath) {
  const suite = await readJsonLines(suitePath);
  const cases = suite.map((item, index) => {
    const id = String(item.id ?? index + 1);
    if (item.kind === 'preference') {
      const reverse = Number.parseInt(sha256(id).slice(0, 2), 16) % 2 === 1;
      return { id, kind: 'preference', options: reverse ? [item.bad, item.good] : [item.good, item.bad] };
    }
    return { id, kind: item.kind ?? 'qa', text: item.text, context: item.context };
  });
  const manifest = {
    format: 'eslm-benchmark-export-v1',
    protocol: 'eslm-external-prediction-v1',
    dataset: { sha256: await hashFile(suitePath), cases: cases.length },
    predictionSchema: {
      qa: '{"id":"...","answer":"..."} or {"id":"...","values":[]}',
      preference: '{"id":"...","choice":0}',
    },
    cases,
  };
  await writeJson(outputPath, manifest);
  return manifest;
}

export async function scoreExternalPredictions(suitePath, predictionsPath, model, outputPath) {
  const suite = await readJsonLines(suitePath);
  const predictions = await readJsonLines(predictionsPath);
  const byId = new Map(predictions.map((prediction) => [String(prediction.id), prediction]));
  const results = suite.map((item, index) => {
    const id = String(item.id ?? index + 1);
    const prediction = byId.get(id);
    if (!prediction) return { id, pass: false, diagnostic: 'missing-prediction' };
    if (item.kind === 'preference') {
      const reverse = Number.parseInt(sha256(id).slice(0, 2), 16) % 2 === 1;
      return { id, pass: Number(prediction.choice) === (reverse ? 1 : 0), actual: prediction.choice };
    }
    if (item.values && prediction.values) {
      const expected = JSON.stringify([...item.values].sort());
      return { id, pass: expected === JSON.stringify([...prediction.values].sort()), actual: prediction.values };
    }
    const aliases = [item.answer, ...(item.aliases ?? [])].map(normalizeAnswer);
    return { id, pass: aliases.includes(normalizeAnswer(prediction.answer)), actual: prediction.answer };
  });
  const report = {
    format: 'eslm-external-comparison-report-v1',
    protocol: 'eslm-external-prediction-v1',
    model,
    createdAt: new Date().toISOString(),
    dataset: { sha256: await hashFile(suitePath) },
    total: results.length,
    correct: results.filter((result) => result.pass).length,
    accuracy: results.length ? results.filter((result) => result.pass).length / results.length : 0,
    results,
  };
  await writeJson(outputPath, report);
  return report;
}
