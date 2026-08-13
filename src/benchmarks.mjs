import { readFile } from 'node:fs/promises';
import { extname, relative } from 'node:path';
import { readJsonLines, writeJson } from './io.mjs';
import { benchmarkBehaviorIdentity } from './evaluation/benchmark-execution-identity.mjs';
import {
  assertInternalAuthoredBenchmarkReport,
  INTERNAL_AUTHORED_BENCHMARK_REPORT_PROTOCOL,
  INTERNAL_REGRESSION_PROTOCOL,
} from './evaluation/internal-authored-report-contract.mjs';
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
      normalizationExternalInvocation: false,
    };
  }
  const input = item.context ? `${item.context} ${item.text}` : item.text;
  const result = await engine.ask(input);
  const route = {
    status: result.status, languageRoute: result.languageRoute,
    normalizationAttempted: Boolean(result.normalization?.attempted),
    normalizationExternalInvocation: Boolean(result.normalization?.attempted
      && !result.normalization?.cacheHit && result.normalization?.receipt),
    ...(result.normalization?.status === undefined ? {} : {
      normalizationStatus: result.normalization.status,
    }),
    ...(result.normalization?.cacheHit === undefined ? {} : {
      normalizationCacheHit: result.normalization.cacheHit,
    }),
  };
  if (item.values) {
    return {
      pass: JSON.stringify([...result.values ?? []].sort()) === JSON.stringify([...item.values].sort()),
      actual: result.values ?? null,
      ...route,
    };
  }
  const aliases = [item.answer, ...(item.aliases ?? [])].map(normalizeAnswer);
  return { pass: aliases.includes(normalizeAnswer(result.answer)), actual: result.answer ?? null, ...route };
}

export async function runBenchmark(engine, suitePath, publishPath) {
  const suite = await readJsonLines(suitePath);
  const behaviorIdentity = await benchmarkBehaviorIdentity();
  const results = [];
  for (let index = 0; index < suite.length; index += 1) {
    results.push({ id: suite[index].id ?? String(index + 1), ...await scoreCase(engine, suite[index]) });
  }
  const report = {
    format: INTERNAL_AUTHORED_BENCHMARK_REPORT_PROTOCOL,
    protocol: INTERNAL_REGRESSION_PROTOCOL,
    createdAt: new Date().toISOString(),
    evidenceRegime: 'internal-authored-smoke-fixture',
    claimScope: 'implementation-regression-only',
    behaviorIdentity,
    dataset: { path: relative(PROJECT_ROOT, suitePath), sha256: await hashFile(suitePath) },
    model: {
      id: engine.model.manifest.modelId,
      knowledgeBases: [...new Set(engine.model.manifest.knowledgeBases ?? [])].toSorted(),
      comparable: false,
    },
    total: results.length,
    correct: results.filter((item) => item.pass).length,
    accuracy: results.length ? results.filter((item) => item.pass).length / results.length : 0,
    language: languageMetrics(results),
    results,
  };
  assertInternalAuthoredBenchmarkReport(report);
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
  const sourceText = await readFile(inputPath, 'utf8');
  let parsed;
  try { parsed = JSON.parse(sourceText); } catch (error) {
    throw new Error(`Comparison import is not valid JSON: ${error.message}`);
  }
  const manifest = validateImportedComparisonManifest(parsed);
  const receipt = {
    format: 'eslm-external-result-import-receipt-v2',
    importedAt: new Date().toISOString(),
    input: { sha256: sha256(sourceText) },
    comparability: 'reference-only-unverified-aggregate',
    comparabilityReason: 'Imported aggregate metrics were schema-validated but were not predictions scored by the '
      + 'local oracle. Protocol equivalence and dataset identity require independent review.',
    manifest,
  };
  await writeJson(outputPath, receipt);
  return receipt;
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
    protocolMetadataSchema: {
      format: 'eslm-external-protocol-metadata-v1',
      required: [
        'model.id', 'model.revision', 'model.quantization', 'prompt.text', 'prompt.sha256',
        'contextWindowTokens', 'decoding', 'tools', 'retrieval.enabled', 'retrieval.description',
        'hardware', 'cost.amount', 'cost.currency', 'cost.basis', 'evidenceRegime',
      ],
      promptDigest: 'lowercase SHA-256 of the exact UTF-8 prompt text',
    },
    cases,
  };
  await writeJson(outputPath, manifest);
  return manifest;
}

const EXTERNAL_PROTOCOL_METADATA_FORMAT = 'eslm-external-protocol-metadata-v1';
const EXTERNAL_RESULT_MANIFEST_FORMAT = 'eslm-external-result-manifest-v1';

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requirePlainObject(value, path) {
  if (!isPlainObject(value)) throw new Error(`${path} must be an object.`);
}

function requireNonEmptyString(value, path) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${path} must be a non-empty string.`);
}

function requireOnlyFields(value, allowed, path) {
  const unexpected = Object.keys(value).filter((field) => !allowed.includes(field));
  if (unexpected.length) throw new Error(`${path} contains unsupported fields: ${unexpected.join(', ')}.`);
}

function requireStringArray(value, path) {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array.`);
  value.forEach((item, index) => requireNonEmptyString(item, `${path}[${index}]`));
}

function requireHttpUrl(value, path) {
  requireNonEmptyString(value, path);
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error(`${path} must be an absolute HTTP(S) URL.`); }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${path} must be an absolute HTTP(S) URL.`);
  }
}

function validateImportedMetric(metric, index) {
  const path = `External result metric ${index + 1}`;
  requirePlainObject(metric, path);
  requireOnlyFields(metric, ['id', 'value', 'unit', 'direction', 'numerator', 'denominator'], path);
  requireNonEmptyString(metric.id, `${path}.id`);
  if (typeof metric.value !== 'number' || !Number.isFinite(metric.value)) {
    throw new Error(`${path}.value must be a finite number.`);
  }
  const units = ['ratio', 'percentage', 'count', 'seconds', 'bytes', 'score'];
  if (!units.includes(metric.unit)) throw new Error(`${path}.unit must be one of ${units.join(', ')}.`);
  const directions = ['higher-is-better', 'lower-is-better', 'descriptive'];
  if (!directions.includes(metric.direction)) {
    throw new Error(`${path}.direction must be one of ${directions.join(', ')}.`);
  }
  if (metric.unit === 'ratio' && (metric.value < 0 || metric.value > 1)) {
    throw new Error(`${path}.value must be between zero and one for a ratio.`);
  }
  if (metric.unit === 'percentage' && (metric.value < 0 || metric.value > 100)) {
    throw new Error(`${path}.value must be between zero and 100 for a percentage.`);
  }
  if (['count', 'bytes'].includes(metric.unit)
      && (!Number.isSafeInteger(metric.value) || metric.value < 0)) {
    throw new Error(`${path}.value must be a non-negative safe integer for ${metric.unit}.`);
  }
  const hasNumerator = metric.numerator !== undefined;
  const hasDenominator = metric.denominator !== undefined;
  if (hasNumerator !== hasDenominator) {
    throw new Error(`${path} must provide numerator and denominator together.`);
  }
  if (hasNumerator) {
    if (!Number.isSafeInteger(metric.numerator) || metric.numerator < 0
        || !Number.isSafeInteger(metric.denominator) || metric.denominator <= 0
        || metric.numerator > metric.denominator) {
      throw new Error(`${path} requires a bounded numerator and positive denominator.`);
    }
    const expected = metric.unit === 'percentage'
      ? (100 * metric.numerator) / metric.denominator : metric.numerator / metric.denominator;
    if (!['ratio', 'percentage'].includes(metric.unit)
        || Math.abs(metric.value - expected) > 1e-12 * Math.max(1, Math.abs(metric.value), Math.abs(expected))) {
      throw new Error(`${path}.value does not match its numerator and denominator.`);
    }
  }
  return metric;
}

function validateImportedComparisonManifest(manifest) {
  const path = 'External result manifest';
  requirePlainObject(manifest, path);
  requireOnlyFields(manifest, [
    'format', 'model', 'protocol', 'dataset', 'metrics', 'source', 'evidenceRegime', 'limitations',
  ], path);
  if (manifest.format !== EXTERNAL_RESULT_MANIFEST_FORMAT) {
    throw new Error(`${path}.format must be ${EXTERNAL_RESULT_MANIFEST_FORMAT}.`);
  }
  requirePlainObject(manifest.model, `${path}.model`);
  requireOnlyFields(manifest.model, ['id', 'revision'], `${path}.model`);
  requireNonEmptyString(manifest.model.id, `${path}.model.id`);
  requireNonEmptyString(manifest.model.revision, `${path}.model.revision`);
  requirePlainObject(manifest.protocol, `${path}.protocol`);
  requireOnlyFields(manifest.protocol, ['id', 'inputRoute', 'scorer', 'tools'], `${path}.protocol`);
  requireNonEmptyString(manifest.protocol.id, `${path}.protocol.id`);
  if (!['raw-language', 'source-template', 'structured-task', 'source-annotation', 'unknown']
    .includes(manifest.protocol.inputRoute)) {
    throw new Error(`${path}.protocol.inputRoute is not a supported route label.`);
  }
  requireNonEmptyString(manifest.protocol.scorer, `${path}.protocol.scorer`);
  requireStringArray(manifest.protocol.tools, `${path}.protocol.tools`);
  requirePlainObject(manifest.dataset, `${path}.dataset`);
  requireOnlyFields(manifest.dataset, ['id', 'revision', 'split', 'sha256'], `${path}.dataset`);
  for (const field of ['id', 'revision', 'split']) {
    requireNonEmptyString(manifest.dataset[field], `${path}.dataset.${field}`);
  }
  if (manifest.dataset.sha256 !== null && !/^[0-9a-f]{64}$/u.test(manifest.dataset.sha256 ?? '')) {
    throw new Error(`${path}.dataset.sha256 must be null or a lowercase SHA-256 digest.`);
  }
  if (!Array.isArray(manifest.metrics) || manifest.metrics.length === 0 || manifest.metrics.length > 128) {
    throw new Error(`${path}.metrics must contain from one through 128 metric objects.`);
  }
  manifest.metrics.forEach(validateImportedMetric);
  const metricIds = manifest.metrics.map((metric) => metric.id);
  if (new Set(metricIds).size !== metricIds.length) throw new Error(`${path}.metrics contains duplicate IDs.`);
  requirePlainObject(manifest.source, `${path}.source`);
  requireOnlyFields(manifest.source, ['citation', 'url'], `${path}.source`);
  requireNonEmptyString(manifest.source.citation, `${path}.source.citation`);
  requireHttpUrl(manifest.source.url, `${path}.source.url`);
  requireNonEmptyString(manifest.evidenceRegime, `${path}.evidenceRegime`);
  requireStringArray(manifest.limitations, `${path}.limitations`);
  return manifest;
}

function validateExternalProtocolMetadata(metadata) {
  const path = 'External protocol metadata';
  requirePlainObject(metadata, path);
  requireOnlyFields(metadata, [
    'format', 'model', 'prompt', 'contextWindowTokens', 'decoding', 'tools', 'retrieval', 'hardware', 'cost',
    'evidenceRegime',
  ], path);
  if (metadata.format !== EXTERNAL_PROTOCOL_METADATA_FORMAT) {
    throw new Error(`${path}.format must be ${EXTERNAL_PROTOCOL_METADATA_FORMAT}.`);
  }
  requirePlainObject(metadata.model, `${path}.model`);
  requireOnlyFields(metadata.model, ['id', 'revision', 'quantization'], `${path}.model`);
  for (const field of ['id', 'revision', 'quantization']) {
    requireNonEmptyString(metadata.model[field], `${path}.model.${field}`);
  }
  requirePlainObject(metadata.prompt, `${path}.prompt`);
  requireOnlyFields(metadata.prompt, ['text', 'sha256'], `${path}.prompt`);
  requireNonEmptyString(metadata.prompt.text, `${path}.prompt.text`);
  if (!/^[0-9a-f]{64}$/u.test(metadata.prompt.sha256 ?? '')) {
    throw new Error(`${path}.prompt.sha256 must be a lowercase SHA-256 digest.`);
  }
  if (metadata.prompt.sha256 !== sha256(metadata.prompt.text)) {
    throw new Error(`${path}.prompt.sha256 does not match prompt.text.`);
  }
  if (!Number.isInteger(metadata.contextWindowTokens) || metadata.contextWindowTokens <= 0) {
    throw new Error(`${path}.contextWindowTokens must be a positive integer.`);
  }
  requirePlainObject(metadata.decoding, `${path}.decoding`);
  if (Object.keys(metadata.decoding).length === 0) {
    throw new Error(`${path}.decoding must record at least one decoding setting.`);
  }
  requireStringArray(metadata.tools, `${path}.tools`);
  requirePlainObject(metadata.retrieval, `${path}.retrieval`);
  requireOnlyFields(metadata.retrieval, ['enabled', 'description'], `${path}.retrieval`);
  if (typeof metadata.retrieval.enabled !== 'boolean') {
    throw new Error(`${path}.retrieval.enabled must be boolean.`);
  }
  requireNonEmptyString(metadata.retrieval.description, `${path}.retrieval.description`);
  requireNonEmptyString(metadata.hardware, `${path}.hardware`);
  requirePlainObject(metadata.cost, `${path}.cost`);
  requireOnlyFields(metadata.cost, ['amount', 'currency', 'basis'], `${path}.cost`);
  if (metadata.cost.amount !== null
      && (typeof metadata.cost.amount !== 'number'
        || !Number.isFinite(metadata.cost.amount) || metadata.cost.amount < 0)) {
    throw new Error(`${path}.cost.amount must be null or a finite non-negative number.`);
  }
  requireNonEmptyString(metadata.cost.currency, `${path}.cost.currency`);
  requireNonEmptyString(metadata.cost.basis, `${path}.cost.basis`);
  requireNonEmptyString(metadata.evidenceRegime, `${path}.evidenceRegime`);
  return metadata;
}

function suiteCaseIds(suite) {
  const ids = suite.map((item, index) => String(item.id ?? index + 1));
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`Benchmark suite contains duplicate case ID: ${id}.`);
    seen.add(id);
  }
  return ids;
}

function indexPredictions(predictions) {
  const byId = new Map();
  for (let index = 0; index < predictions.length; index += 1) {
    const prediction = predictions[index];
    if (!isPlainObject(prediction)) throw new Error(`Prediction record ${index + 1} must be an object.`);
    requireNonEmptyString(prediction.id, `Prediction record ${index + 1}.id`);
    if (byId.has(prediction.id)) throw new Error(`Predictions contain duplicate case ID: ${prediction.id}.`);
    byId.set(prediction.id, prediction);
  }
  return byId;
}

function formatIdList(ids) {
  const visible = ids.slice(0, 10).join(', ');
  return ids.length > 10 ? `${visible}, and ${ids.length - 10} more` : visible;
}

function validatePredictionForCase(prediction, item, id) {
  if (item.kind === 'preference') {
    requireOnlyFields(prediction, ['id', 'choice'], `Prediction ${id}`);
    if (!Number.isInteger(prediction.choice) || (prediction.choice !== 0 && prediction.choice !== 1)) {
      throw new Error(`Prediction ${id}.choice must be the numeric integer 0 or 1.`);
    }
    return;
  }
  if (item.values) {
    requireOnlyFields(prediction, ['id', 'values'], `Prediction ${id}`);
    if (!Array.isArray(prediction.values) || prediction.values.length > 256) {
      throw new Error(`Prediction ${id}.values must be an array with at most 256 items.`);
    }
    for (const [index, value] of prediction.values.entries()) {
      const scalar = value === null || ['string', 'boolean', 'number'].includes(typeof value);
      if (!scalar || (typeof value === 'number' && !Number.isFinite(value))
          || (typeof value === 'string' && value.length > 4096)) {
        throw new Error(`Prediction ${id}.values[${index}] must be a bounded JSON scalar.`);
      }
    }
    return;
  }
  requireOnlyFields(prediction, ['id', 'answer'], `Prediction ${id}`);
  if (typeof prediction.answer !== 'string' || prediction.answer.length > 16_384) {
    throw new Error(`Prediction ${id}.answer must be a string with at most 16384 characters.`);
  }
}

export async function scoreExternalPredictions(suitePath, predictionsPath, protocolMetadata, outputPath) {
  const validatedProtocolMetadata = validateExternalProtocolMetadata(protocolMetadata);
  const suite = await readJsonLines(suitePath);
  const predictionsSha256BeforeRead = await hashFile(predictionsPath);
  const predictions = await readJsonLines(predictionsPath);
  const predictionsSha256 = await hashFile(predictionsPath);
  if (predictionsSha256 !== predictionsSha256BeforeRead) {
    throw new Error('Predictions file changed while it was being read.');
  }
  const ids = suiteCaseIds(suite);
  const expectedIds = new Set(ids);
  const byId = indexPredictions(predictions);
  const extraIds = [...byId.keys()].filter((id) => !expectedIds.has(id));
  if (extraIds.length) {
    throw new Error(`Predictions contain IDs absent from the benchmark suite: ${formatIdList(extraIds)}.`);
  }
  const results = suite.map((item, index) => {
    const id = ids[index];
    const prediction = byId.get(id);
    if (!prediction) return { id, pass: false, diagnostic: 'missing-prediction' };
    validatePredictionForCase(prediction, item, id);
    if (item.kind === 'preference') {
      const reverse = Number.parseInt(sha256(id).slice(0, 2), 16) % 2 === 1;
      return { id, pass: prediction.choice === (reverse ? 1 : 0), actual: prediction.choice };
    }
    if (item.values && prediction.values) {
      const expected = JSON.stringify([...item.values].sort());
      return { id, pass: expected === JSON.stringify([...prediction.values].sort()), actual: prediction.values };
    }
    const aliases = [item.answer, ...(item.aliases ?? [])].map(normalizeAnswer);
    return { id, pass: aliases.includes(normalizeAnswer(prediction.answer)), actual: prediction.answer };
  });
  const missing = results.filter((result) => result.diagnostic === 'missing-prediction').length;
  const report = {
    format: 'eslm-external-comparison-report-v2',
    protocol: 'eslm-external-prediction-v1',
    protocolMetadata: validatedProtocolMetadata,
    createdAt: new Date().toISOString(),
    dataset: { sha256: await hashFile(suitePath) },
    predictions: {
      sha256: predictionsSha256,
      submitted: predictions.length,
      matched: predictions.length,
      missing,
      duplicates: 0,
      extra: 0,
    },
    total: results.length,
    correct: results.filter((result) => result.pass).length,
    accuracy: results.length ? results.filter((result) => result.pass).length / results.length : 0,
    results,
  };
  await writeJson(outputPath, report);
  return report;
}
