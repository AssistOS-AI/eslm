#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { PROJECT_ROOT } from '../src/paths.mjs';

const ROOTS = ['src', 'scripts', 'tests', 'training/.agents/skills'];
const EXTENSIONS = new Set(['.mjs', '.md', '.yaml']);

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(path));
    else if (EXTENSIONS.has(extname(path))) files.push(path);
  }
  return files;
}

const findings = [];
for (const root of ROOTS) {
  for (const path of await filesUnder(join(PROJECT_ROOT, root))) {
    const lines = (await readFile(path, 'utf8')).split('\n');
    const longLines = lines.reduce((count, line) => count + Number(line.length > 120), 0);
    if (lines.length > 500 || longLines > 0) {
      findings.push({ file: relative(PROJECT_ROOT, path), lines: lines.length, longLines });
    }
  }
}
process.stdout.write(`${JSON.stringify({ format: 'eslm-source-size-report-v1', findings }, null, 2)}\n`);
