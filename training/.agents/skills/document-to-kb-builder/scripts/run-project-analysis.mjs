#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const [projectRootValue, inputValue, outputValue] = process.argv.slice(2);
if (!projectRootValue || !inputValue || !outputValue) throw new Error('Usage: run-project-analysis.mjs PROJECT_ROOT INPUT_JSONL OUTPUT_JSONL');
const projectRoot = resolve(projectRootValue);
const lines = (await readFile(resolve(inputValue), 'utf8')).split(/\r?\n/u).filter(Boolean);
const output = [];
for (const [index, line] of lines.entries()) {
  const record = JSON.parse(line);
  const text = record.text ?? record.content;
  if (typeof text !== 'string') throw new Error(`Input line ${index + 1} requires text or content.`);
  const result = await run(process.execPath, [join(projectRoot, 'src/cli.mjs'), 'ask', text, '--profile'], {
    cwd: projectRoot, maxBuffer: 4 * 1024 * 1024,
  });
  output.push(JSON.stringify({ id: record.id ?? index + 1, analysis: JSON.parse(result.stdout) }));
}
await writeFile(resolve(outputValue), `${output.join('\n')}\n`, 'utf8');
