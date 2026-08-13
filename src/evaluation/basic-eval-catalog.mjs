import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PROJECT_ROOT } from '../paths.mjs';

export const BASIC_EVAL_SOURCE_CASE_COUNT = 1000;
export const BASIC_EVAL_STRUCTURAL_CONTROL_COUNT = 10;
export const BASIC_EVAL_CASE_COUNT = BASIC_EVAL_SOURCE_CASE_COUNT + BASIC_EVAL_STRUCTURAL_CONTROL_COUNT;
export const BASIC_EVAL_EXAMPLES_PER_PAGE = 24;
export const BASIC_EVAL_SMOKE_SEED = 'basic-eval-development';

const CASES_PATH = join(PROJECT_ROOT, 'eval/basic-everyday/cases.jsonl');
const CONTROLS_PATH = join(PROJECT_ROOT, 'eval/basic-everyday/structural-controls.jsonl');
let casePromise;

function hash(value) {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.codePointAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function rotated(values, offset) {
  if (values.length === 0) return [];
  const start = offset % values.length;
  return [...values.slice(start), ...values.slice(0, start)];
}

function stratifiedOrder(cases, seed) {
  const buckets = new Map();
  for (const item of cases) {
    const profileClass = item.profiles.includes('core-only') ? 'core-only' : 'knowledge-backed';
    const key = `${profileClass}:${item.scoring}:${item.category}`;
    buckets.set(key, [...(buckets.get(key) ?? []), item]);
  }
  const orderedBuckets = [...buckets.entries()]
    .map(([key, values]) => [key, rotated(values, hash(`${seed}:${key}`))])
    .toSorted(([left], [right]) => {
      const leftRank = hash(`${seed}:bucket:${left}`);
      const rightRank = hash(`${seed}:bucket:${right}`);
      return leftRank - rightRank || left.localeCompare(right);
    });
  const output = [];
  for (let depth = 0; output.length < cases.length; depth += 1) {
    for (const [, bucket] of orderedBuckets) if (bucket[depth]) output.push(bucket[depth]);
  }
  return Object.freeze(output);
}

export async function loadBasicEvalCases() {
  casePromise ??= Promise.all([readFile(CASES_PATH, 'utf8'), readFile(CONTROLS_PATH, 'utf8')])
    .then(([source, controlsSource]) => {
    const sourceCases = source.trim().split(/\r?\n/u).filter(Boolean).map((line) => Object.freeze(JSON.parse(line)));
    const controls = controlsSource.trim().split(/\r?\n/u).filter(Boolean).map((line) => Object.freeze(JSON.parse(line)));
    if (sourceCases.length !== BASIC_EVAL_SOURCE_CASE_COUNT) {
      throw new Error(`Basic Eval expected ${BASIC_EVAL_SOURCE_CASE_COUNT} source cases, found ${sourceCases.length}.`);
    }
    if (controls.length !== BASIC_EVAL_STRUCTURAL_CONTROL_COUNT) {
      throw new Error(`Basic Eval expected ${BASIC_EVAL_STRUCTURAL_CONTROL_COUNT} structural controls, found ${controls.length}.`);
    }
    return Object.freeze([...sourceCases, ...controls]);
  });
  return casePromise;
}

export async function basicEvalExamplePage({ seed, page, perPage = BASIC_EVAL_EXAMPLES_PER_PAGE }) {
  const cases = await loadBasicEvalCases();
  const ordered = stratifiedOrder(cases, seed);
  const pageCount = Math.ceil(ordered.length / perPage);
  if (!Number.isSafeInteger(page) || page < 1 || page > pageCount) {
    throw new Error(`Example page must be from 1 to ${pageCount}.`);
  }
  const start = (page - 1) * perPage;
  return Object.freeze({
    page,
    pageCount,
    total: ordered.length,
    cases: Object.freeze(ordered.slice(start, start + perPage)),
  });
}

export async function basicEvalSmokeSelection({ seed, count = BASIC_EVAL_SOURCE_CASE_COUNT }) {
  const cases = await loadBasicEvalCases();
  if (!Number.isSafeInteger(count) || count < 1 || count > cases.length) {
    throw new Error(`Basic Eval smoke count must be from 1 to ${cases.length}.`);
  }
  return Object.freeze(stratifiedOrder(cases, seed).slice(0, count));
}

export function executionProfileForBasicEvalCase(testCase) {
  if (testCase.profiles.includes('core-only')) return 'core-only';
  if (testCase.profiles.includes('quick-assisted')) return 'quick-assisted';
  return 'real-kb';
}
