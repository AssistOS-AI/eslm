import { sha256 } from '../util.mjs';

export const BLIMP_PARTITION_POLICY = Object.freeze({
  format: 'eslm-grouped-development-fresh-partition-v1',
  seed: 'eslm-blimp-development-fresh-v1',
  developmentPerParadigm: 800,
  freshPerParadigm: 200,
  expectedParadigms: 67,
  expectedCasesPerParadigm: 1_000,
});

function requireCondition(condition, message) {
  if (!condition) throw new Error(`Invalid grouped development/fresh partition: ${message}`);
}

function membershipDigest(cases) {
  return sha256(`${cases.map((item) => item.id).sort().join('\n')}\n`);
}

function ranked(cases, seed) {
  return cases.map((item) => ({
    item,
    rank: sha256(`${seed}\0${item.metadata.paradigm}\0${item.id}`),
  })).sort((left, right) => left.rank.localeCompare(right.rank) || left.item.id.localeCompare(right.item.id));
}

export function partitionBlimpCases(cases, options = {}) {
  requireCondition(Array.isArray(cases) && cases.length > 0, 'cases must be a non-empty array.');
  const policy = { ...BLIMP_PARTITION_POLICY, ...options };
  requireCondition(typeof policy.seed === 'string' && policy.seed.length > 0, 'seed must be non-empty text.');
  requireCondition(Number.isInteger(policy.developmentPerParadigm) && policy.developmentPerParadigm > 0,
    'developmentPerParadigm must be a positive integer.');
  requireCondition(Number.isInteger(policy.freshPerParadigm) && policy.freshPerParadigm > 0,
    'freshPerParadigm must be a positive integer.');
  requireCondition(policy.developmentPerParadigm + policy.freshPerParadigm === policy.expectedCasesPerParadigm,
    'development and fresh counts must cover every case in a paradigm exactly once.');

  const identifiers = new Set();
  const groups = new Map();
  for (const item of cases) {
    requireCondition(item && typeof item === 'object', 'every case must be an object.');
    requireCondition(typeof item.id === 'string' && item.id.length > 0, 'every case must have an ID.');
    requireCondition(!identifiers.has(item.id), `duplicate case ID ${item.id}.`);
    identifiers.add(item.id);
    const paradigm = item.metadata?.paradigm;
    requireCondition(typeof paradigm === 'string' && paradigm.length > 0,
      `case ${item.id} has no paradigm metadata.`);
    if (!groups.has(paradigm)) groups.set(paradigm, []);
    groups.get(paradigm).push(item);
  }
  requireCondition(groups.size === policy.expectedParadigms,
    `expected ${policy.expectedParadigms} paradigms, found ${groups.size}.`);

  const development = [];
  const fresh = [];
  const strata = [];
  for (const [paradigm, group] of [...groups.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    requireCondition(group.length === policy.expectedCasesPerParadigm,
      `${paradigm} has ${group.length} cases instead of ${policy.expectedCasesPerParadigm}.`);
    const ordered = ranked(group, policy.seed).map(({ item }) => item);
    const developmentCases = ordered.slice(0, policy.developmentPerParadigm);
    const freshCases = ordered.slice(policy.developmentPerParadigm);
    development.push(...developmentCases);
    fresh.push(...freshCases);
    strata.push(Object.freeze({
      paradigm,
      development: developmentCases.length,
      fresh: freshCases.length,
      developmentIdSha256: membershipDigest(developmentCases),
      freshIdSha256: membershipDigest(freshCases),
    }));
  }

  return Object.freeze({
    policy: Object.freeze(policy),
    development: Object.freeze(development),
    fresh: Object.freeze(fresh),
    receipt: Object.freeze({
      format: policy.format,
      seed: policy.seed,
      total: cases.length,
      paradigms: groups.size,
      development: development.length,
      fresh: fresh.length,
      developmentIdSha256: membershipDigest(development),
      freshIdSha256: membershipDigest(fresh),
      strata: Object.freeze(strata),
    }),
  });
}
