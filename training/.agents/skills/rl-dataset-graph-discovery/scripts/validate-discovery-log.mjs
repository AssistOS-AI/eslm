#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { output } from './contract-helpers.mjs';

const path = process.argv[2];
if (!path) throw new Error('Usage: validate-discovery-log.mjs DISCOVERY_LOG.md');
const markdown = await readFile(resolve(path), 'utf8');
const required = [
  /^# .+Processing-Graph Discovery Log$/mu,
  /^## How .+discovery cycle works$/mu,
  /^## Cycle \d{3} .+$/gmu,
  /\*\*Evidence scope\.\*\*/u,
  /\*\*(?:Decision|Consolidation decision)\.\*\*/u,
  /^## Next review$/mu,
];
const missing = required.flatMap((pattern) => pattern.test(markdown) ? [] : [String(pattern)]);
if (missing.length > 0) throw new TypeError(`Discovery log is missing required structures: ${missing.join(', ')}.`);
const cycles = [...markdown.matchAll(/^## Cycle (\d{3}) .+$/gmu)];
const receiptDigest = /sha256:[0-9a-f]{64}/u;
for (const [index, cycle] of cycles.entries()) {
  if (Number(cycle[1]) !== index) throw new TypeError('Discovery log cycle numbering must be contiguous from 000.');
  const start = cycle.index;
  const end = cycles[index + 1]?.index ?? markdown.search(/^## Next review$/mu);
  const section = markdown.slice(start, end < 0 ? markdown.length : end);
  const cycleFields = index === 0
    ? [/\*\*Evidence scope\.\*\*/u, /\*\*Decision\.\*\*/u]
    : [
        /`cycle:[a-z0-9:.-]+`/u,
        /\*\*Evidence scope\.\*\*/u,
        /Question:\s*`[^`]+`/u,
        /Null hypothesis:\s*`[^`]+`/u,
        /\*\*Receipts\.\*\*/u,
        /\*\*Consolidation decision\.\*\*/u,
      ];
  const missingCycleFields = cycleFields.filter((pattern) => !pattern.test(section));
  if (missingCycleFields.length > 0) {
    throw new TypeError(`Discovery log Cycle ${cycle[1]} is missing required cycle-local fields: ${missingCycleFields.join(', ')}.`);
  }
  if (index > 0) {
    const receipts = section.match(/\*\*Receipts\.\*\*([\s\S]*?)(?=\n\*\*[^*]+\.\*\*|$)/u)?.[1] ?? '';
    const consolidation = section.match(/\*\*Consolidation decision\.\*\*([\s\S]*?)(?=\n\*\*[^*]+\.\*\*|$)/u)?.[1] ?? '';
    if (!receiptDigest.test(receipts) || /^\s*(?:None|N\/A)\b/iu.test(receipts)) {
      throw new TypeError(`Discovery log Cycle ${cycle[1]} must cite at least one concrete receipt digest.`);
    }
    if (consolidation.trim().length < 24 || /^\s*(?:None|N\/A)\b/iu.test(consolidation)) {
      throw new TypeError(`Discovery log Cycle ${cycle[1]} must record a substantive consolidation decision.`);
    }
  }
}
if (/expectedAnswer|answerText|sourceNativeId|recordId|datasetId/iu.test(markdown)) {
  throw new TypeError('Discovery log contains forbidden answer-conditioned or source-native vocabulary.');
}
if (Buffer.byteLength(markdown) > 1_048_576) throw new TypeError('Discovery log must remain bounded.');
output({ valid: true, cycles: cycles.length, bytes: Buffer.byteLength(markdown) });
