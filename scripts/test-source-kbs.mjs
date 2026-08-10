#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { loadPublicKnowledgeBase } from '../src/public-kbs.mjs';

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function sample(values, count, next) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const selected = Math.floor(next() * (index + 1));
    [copy[index], copy[selected]] = [copy[selected], copy[index]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

async function runCase(results, kb, kind, input, check, provider) {
  const started = performance.now();
  const answer = await provider.ask(input);
  const passed = Boolean(answer && check(answer));
  results.push({ kb, kind, input, passed, status: answer?.status ?? 'NO_MATCH', answer: answer?.answer, milliseconds: performance.now() - started });
}

const cases = Number.parseInt(option('--cases', '100'), 10);
const seed = Number.parseInt(option('--seed', '20260810'), 10);
const output = resolve(option('--output', 'docs/results/latest-kb-random-tests.json'));
if (!Number.isInteger(cases) || cases < 1) throw new Error('--cases must be a positive integer.');
const next = random(seed);
const started = performance.now();
const startMemory = process.memoryUsage();
const [wordnet, atomic] = await Promise.all([
  loadPublicKnowledgeBase('oewn-2025'), loadPublicKnowledgeBase('atomic-2020'),
]);
const results = [];

const definable = Object.entries(wordnet.lemmas).filter(([, ids]) => ids.some((id) => wordnet.synsets[id]?.d?.length));
for (const [lemma] of sample(definable, cases, next)) {
  await runCase(results, 'oewn-2025', 'definition', `Define ${lemma}`, (answer) => answer.status === 'ANSWERED' && answer.values.length > 0, wordnet);
}
const synonymPairs = [];
for (const synset of Object.values(wordnet.synsets)) {
  if (synset.m.length > 1) synonymPairs.push([synset.m[0], synset.m[1]]);
}
for (const [lemma, synonym] of sample(synonymPairs, cases, next)) {
  await runCase(results, 'oewn-2025', 'synonym', `What are synonyms of ${lemma}?`, (answer) => answer.values.some((value) => value.toLocaleLowerCase('en-US') === synonym.toLocaleLowerCase('en-US')), wordnet);
}
const hypernymPairs = [];
for (const synset of Object.values(wordnet.synsets)) {
  const parent = wordnet.synsets[synset.h[0]];
  if (synset.m[0] && parent?.m?.[0]) hypernymPairs.push([synset.m[0], parent.m[0]]);
}
for (const [child, parent] of sample(hypernymPairs, cases, next)) {
  await runCase(results, 'oewn-2025', 'hypernym', `Is a ${child} a ${parent}?`, (answer) => answer.values[0] === true, wordnet);
}

const atomicCases = [
  { relations: ['xEffect', 'oEffect', 'isAfter', 'Causes'], kind: 'effect', question: (event) => `What might happen after ${event.h}?` },
  { relations: ['xIntent', 'xReason'], kind: 'intent', question: (event) => `Why might ${event.h}?` },
  { relations: ['xReact'], kind: 'reaction', question: (event) => `How might PersonX feel after ${event.h}?` },
  { relations: ['HinderedBy'], kind: 'obstacle', question: (event) => `What could prevent ${event.h}?` },
];
for (const definition of atomicCases) {
  const events = Object.values(atomic.events).filter((event) => definition.relations.some((relation) => event.r[relation]?.length));
  for (const event of sample(events, cases, next)) {
    const expected = new Set(definition.relations.flatMap((relation) => (event.r[relation] ?? []).map(([tail]) => tail)));
    await runCase(results, 'atomic-2020', definition.kind, definition.question(event), (answer) => answer.status === 'ANSWERED' && answer.values.some((value) => expected.has(value)), atomic);
  }
}

const failed = results.filter((item) => !item.passed);
const memory = process.memoryUsage();
const report = {
  format: 'eslm-random-kb-test-v1', seed, requestedCasesPerFamily: cases,
  datasets: {
    'oewn-2025': wordnet.manifest.counts,
    'atomic-2020': atomic.manifest.counts,
  },
  summary: { total: results.length, passed: results.length - failed.length, failed: failed.length, passRate: (results.length - failed.length) / results.length },
  profile: {
    elapsedMilliseconds: performance.now() - started,
    rssDeltaBytes: memory.rss - startMemory.rss,
    heapUsedDeltaBytes: memory.heapUsed - startMemory.heapUsed,
    slowest: results.toSorted((left, right) => right.milliseconds - left.milliseconds).slice(0, 10),
  },
  failures: failed.slice(0, 100),
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failed.length > 0) process.exitCode = 1;
