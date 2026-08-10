#!/usr/bin/env node
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { readJsonLines, writeJsonLines } from '../src/io.mjs';
import { sha256 } from '../src/util.mjs';

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const input = resolve(option('--input'));
const output = resolve(option('--output'));
const seed = option('--seed', '20260810');
const workingCount = Number.parseInt(option('--working', '200'), 10);
const freshCount = Number.parseInt(option('--fresh', '1000'), 10);
if (!input || !output) throw new Error('--input and --output are required.');
const cases = await readJsonLines(input);
if (workingCount + freshCount > cases.length) throw new Error('Requested pools exceed the input case count.');
const ranked = cases.toSorted((left, right) => sha256(`${seed}:${left.id}`).localeCompare(sha256(`${seed}:${right.id}`)));
await mkdir(output, { recursive: true });
await writeJsonLines(resolve(output, 'working.jsonl'), ranked.slice(0, workingCount));
await writeJsonLines(resolve(output, 'fresh.jsonl'), ranked.slice(workingCount, workingCount + freshCount));
process.stdout.write(`${JSON.stringify({
  format: 'eslm-learning-pool-preparation-v1', seed, inputBytes: (await readFile(input)).length,
  inputCases: cases.length, workingCases: workingCount, freshCases: freshCount,
}, null, 2)}\n`);
