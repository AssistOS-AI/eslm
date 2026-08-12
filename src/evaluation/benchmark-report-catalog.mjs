import { isDeepStrictEqual } from 'node:util';
import { BENCHMARK_ACCESS_MANIFESTS } from './benchmark-access-manifests.mjs';
import { RESEARCH_BENCHMARK_CATALOG } from './benchmark-research-catalog.mjs';

function legacyRegistration(definition) {
  return Object.freeze({
    format: 'eslm-benchmark-report-registration-v1',
    ...definition,
    access: Object.freeze({ ...definition.access }),
  });
}

const legacyAccess = Object.freeze({
  blimp: Object.freeze({
    state: 'public-direct-repository',
    actionUrl: 'https://github.com/alexwarstadt/blimp',
  }),
  babi: Object.freeze({
    state: 'public-direct-archive',
    actionUrl: 'https://github.com/facebookarchive/bAbI-tasks',
  }),
  clutrr: Object.freeze({
    state: 'public-direct-repository',
    actionUrl: 'https://github.com/facebookresearch/clutrr',
  }),
  entityTracking: Object.freeze({
    state: 'public-research-artifact-license-uncertain',
    actionUrl: 'https://aclanthology.org/2023.acl-long.213/',
  }),
  ewok: BENCHMARK_ACCESS_MANIFESTS['ewok-core-1.0'].access,
  storyCloze: BENCHMARK_ACCESS_MANIFESTS['story-cloze-winter-2018'].access,
  simpleqa: Object.freeze({
    ...BENCHMARK_ACCESS_MANIFESTS['simpleqa-official-test-2024'].access,
    actionUrl: BENCHMARK_ACCESS_MANIFESTS['simpleqa-official-test-2024'].sourceRepository,
  }),
});

export const LEGACY_BENCHMARK_REPORT_CATALOG = Object.freeze({
  blimp: legacyRegistration({
    id: 'blimp', adapterState: 'implemented-fresh',
    evaluationState: 'fresh-evaluation-executed', access: legacyAccess.blimp,
  }),
  babi: legacyRegistration({
    id: 'babi', adapterState: 'implemented-development',
    evaluationState: 'development-probe-executed', access: legacyAccess.babi,
  }),
  clutrr: legacyRegistration({
    id: 'clutrr', adapterState: 'implemented-development',
    evaluationState: 'development-probe-executed', access: legacyAccess.clutrr,
  }),
  entityTracking: legacyRegistration({
    id: 'entityTracking', adapterState: 'implemented-development',
    evaluationState: 'development-probe-executed', access: legacyAccess.entityTracking,
  }),
  ewok: legacyRegistration({
    id: 'ewok', adapterState: 'implemented-fresh',
    evaluationState: 'fresh-evaluation-executed', access: legacyAccess.ewok,
  }),
  storyCloze: legacyRegistration({
    id: 'storyCloze', adapterState: 'implemented-development',
    evaluationState: 'development-probe-executed', access: legacyAccess.storyCloze,
  }),
  simpleqa: legacyRegistration({
    id: 'simpleqa', adapterState: 'implemented-development',
    evaluationState: 'diagnostic-probe-executed', access: legacyAccess.simpleqa,
  }),
});

function researchRegistration(entry) {
  return Object.freeze({
    format: 'eslm-benchmark-report-registration-v1',
    id: entry.id,
    adapterState: entry.adapterState,
    evaluationState: entry.evaluationState,
    access: entry.access,
  });
}

export const BENCHMARK_REPORT_CATALOG = Object.freeze({
  ...LEGACY_BENCHMARK_REPORT_CATALOG,
  ...Object.fromEntries(Object.values(RESEARCH_BENCHMARK_CATALOG)
    .map((entry) => [entry.id, researchRegistration(entry)])),
});

const ADAPTER_STATES = Object.freeze([
  'not-implemented', 'implemented-development', 'implemented-fresh',
]);
const EVALUATION_STATES = Object.freeze([
  'not-run', 'diagnostic-probe-executed', 'development-probe-executed',
  'fresh-evaluation-executed',
]);

export function validateBenchmarkReportCatalog(catalog = BENCHMARK_REPORT_CATALOG) {
  for (const [key, entry] of Object.entries(catalog)) {
    if (entry.format !== 'eslm-benchmark-report-registration-v1' || entry.id !== key) {
      throw new Error(`${key}: invalid benchmark report registration identity.`);
    }
    if (!ADAPTER_STATES.includes(entry.adapterState)) {
      throw new Error(`${key}: unsupported benchmark report adapter state.`);
    }
    if (!EVALUATION_STATES.includes(entry.evaluationState)) {
      throw new Error(`${key}: unsupported benchmark report evaluation state.`);
    }
    if (entry.adapterState === 'not-implemented' && entry.evaluationState !== 'not-run') {
      throw new Error(`${key}: an unimplemented adapter cannot have an executed evaluation state.`);
    }
    if (!entry.access || typeof entry.access.state !== 'string' || !entry.access.state) {
      throw new Error(`${key}: benchmark report access metadata requires a state.`);
    }
  }
  return true;
}

export function benchmarkCatalogFields(id) {
  const entry = BENCHMARK_REPORT_CATALOG[id];
  if (!entry) throw new Error(`Benchmark ${id} has no typed report registration.`);
  return Object.freeze({
    adapterState: entry.adapterState,
    evaluationState: entry.evaluationState,
    access: entry.access,
  });
}

export function validateBenchmarkCatalogFields(row) {
  if (!row || typeof row.id !== 'string') throw new Error('Benchmark report row requires an id.');
  const expected = benchmarkCatalogFields(row.id);
  if (row.adapterState !== expected.adapterState) {
    throw new Error(`${row.id}: adapterState differs from the typed benchmark catalog.`);
  }
  if (row.evaluationState !== expected.evaluationState) {
    throw new Error(`${row.id}: evaluationState differs from the typed benchmark catalog.`);
  }
  if (!isDeepStrictEqual(row.access, expected.access)) {
    throw new Error(`${row.id}: access metadata differs from the typed benchmark catalog.`);
  }
  return true;
}

validateBenchmarkReportCatalog();
