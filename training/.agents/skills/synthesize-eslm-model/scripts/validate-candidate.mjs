#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const directory = resolve(process.argv[2] ?? '.');
const files = (await readdir(directory)).filter((file) => file.endsWith('.mjs')).sort();
if (!files.includes('manifest.mjs')) throw new Error('manifest.mjs is required.');

const forbidden = [/\beval\s*\(/u, /new\s+Function\b/u, /node:(?:child_process|http|https|net|tls|vm)/u, /\bfetch\s*\(/u, /process\.env/u];
for (const file of files) {
  const source = await readFile(join(directory, file), 'utf8');
  for (const pattern of forbidden) if (pattern.test(source)) throw new Error(`${file}: forbidden capability ${pattern}`);
}

const imported = await import(`${pathToFileURL(join(directory, 'manifest.mjs')).href}?selfcheck=${Date.now()}`);
const model = imported.default ?? imported.model;
if (model?.manifest?.format !== 'eslm-code-model-v1') throw new Error('Unsupported or missing model format.');
const ids = new Set(model.entities.map(({ id }) => id));
if (ids.size !== model.entities.length) throw new Error('Duplicate entity ids.');
for (const fact of model.facts) {
  if (!ids.has(fact.subject)) throw new Error(`Unknown subject ${fact.subject}.`);
  if (fact.object && !ids.has(fact.object)) throw new Error(`Unknown object ${fact.object}.`);
  if (!fact.provenance?.length) throw new Error(`Fact ${fact.id} lacks provenance.`);
}
process.stdout.write(`${JSON.stringify({ valid: true, directory, files, entities: ids.size, facts: model.facts.length, rules: model.rules.length }, null, 2)}\n`);
