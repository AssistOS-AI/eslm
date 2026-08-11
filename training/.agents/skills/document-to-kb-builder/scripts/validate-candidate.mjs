#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { validateCanonicalRecords } from './canonical-schema.mjs';

const directory = resolve(process.argv[2] ?? 'candidate');
const text = await readFile(join(directory, 'records.jsonl'), 'utf8');
const records = text.split(/\r?\n/u).filter(Boolean).map((line, index) => {
  try { return JSON.parse(line); }
  catch (error) { throw new Error(`records.jsonl:${index + 1}: ${error.message}`); }
});
for (const record of records) {
  const serialized = JSON.stringify(record);
  if (/\b(?:eval|Function|child_process|node:vm|dynamic import)\b/u.test(serialized)) {
    throw new Error(`${record.recordId} contains a prohibited executable payload marker.`);
  }
}
process.stdout.write(`${JSON.stringify({ valid: true, ...validateCanonicalRecords(records) })}\n`);
