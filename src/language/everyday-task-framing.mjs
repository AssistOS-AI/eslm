import { frameEverydaySuppliedTextTask } from './everyday-supplied-text-framing.mjs';
import { frameEverydayConstraintSynthesis } from './everyday-constraint-framing.mjs';

const MAXIMUM_EVERYDAY_INPUT_BYTES = 64 * 1024;

function finiteNumber(surface) {
  const value = Number(surface.replaceAll(',', ''));
  return Number.isFinite(value) ? value : undefined;
}

function frame(operation, inputs, output = {}) {
  return Object.freeze({
    format: 'eslm-everyday-task-frame',
    operation,
    inputs: Object.freeze(inputs),
    output: Object.freeze({ mode: 'direct', ...output }),
  });
}

function arithmeticFrame(text) {
  const symbolic = text.match(/\bwhat is\s+(-?\d[\d,]*(?:\.\d+)?)\s*([+\-\u2212\u00d7x*\u00f7/])\s*(-?\d[\d,]*(?:\.\d+)?)\s*\?/iu);
  if (symbolic) return frame('scalar-arithmetic', {
    left: finiteNumber(symbolic[1]), operator: symbolic[2], right: finiteNumber(symbolic[3]),
  }, { kind: 'number' });
  const verbal = text.match(/\bwhat is\s+(-?\d[\d,]*(?:\.\d+)?)\s+(plus|minus|times|multiplied by|divided by)\s+(-?\d[\d,]*(?:\.\d+)?)\s*\?/iu);
  if (!verbal) return undefined;
  return frame('scalar-arithmetic', {
    left: finiteNumber(verbal[1]), operator: verbal[2].toLocaleLowerCase('en-US'),
    right: finiteNumber(verbal[3]),
  }, { kind: 'number' });
}

function percentageFrame(text) {
  const portion = text.match(/\bwhat is\s+(\d+(?:\.\d+)?)\s*%\s+of\s+(\d[\d,]*(?:\.\d+)?)\s*\?/iu);
  if (portion) return frame('percentage-of', {
    percentage: finiteNumber(portion[1]), base: finiteNumber(portion[2]),
  }, { kind: 'number' });
  const increase = text.match(/\b(?:a\s+)?price\s+of\s+(\d[\d,]*(?:\.\d+)?)\s*(RON|lei|euros?|EUR|dollars?|USD)?\s+increases?\s+by\s+(\d+(?:\.\d+)?)\s*%/iu);
  if (!increase) return undefined;
  return frame('percentage-increase', {
    base: finiteNumber(increase[1]), unit: increase[2] ?? '', percentage: finiteNumber(increase[3]),
  }, { kind: 'quantity' });
}

function parityFrame(text) {
  const match = text.match(/\bis\s+(?:the\s+number\s+)?(-?\d+)\s+(?:an\s+)?even(?:\s+number)?\s*\?/iu);
  return match ? frame('integer-parity', { value: finiteNumber(match[1]) }, {
    kind: 'choice', choices: Object.freeze(['yes', 'no']),
  }) : undefined;
}

function sequenceFrame(text) {
  if (!/\b(?:continue|complete)\s+the\s+(?:number\s+)?sequence\b/iu.test(text)) return undefined;
  const beforeEllipsis = text.split(/\.{3}|\u2026/u)[0];
  const numbers = [...beforeEllipsis.matchAll(/-?\d+(?:\.\d+)?/gu)].map((match) => Number(match[0]));
  return numbers.length >= 3 ? frame('arithmetic-sequence-next', {
    values: Object.freeze(numbers.slice(-16)),
  }, { kind: 'number' }) : undefined;
}

function ratioFrame(text) {
  const match = text.match(/\b(?:the\s+)?ratio\s+is\s+(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)\.\s*if\s+the\s+first\s+term\s+becomes\s+(\d+(?:\.\d+)?),?\s+what\s+(?:must|should)\s+the\s+second\s+(?:term\s+)?be/iu);
  return match ? frame('proportional-scale', {
    first: finiteNumber(match[1]), second: finiteNumber(match[2]),
    scaledFirst: finiteNumber(match[3]),
  }, { kind: 'number' }) : undefined;
}

function conversionFrame(text) {
  let match = text.match(/\bhow many hours? (?:are(?: there)? )?in\s+(\d+(?:\.\d+)?)\s+minutes?\b/iu);
  if (match) return frame('unit-conversion', {
    value: finiteNumber(match[1]), from: 'minute', to: 'hour', factor: 1 / 60,
  }, { kind: 'quantity' });
  match = text.match(/\bhow many meters? (?:are(?: there)? )?in\s+(\d+(?:\.\d+)?)\s+kilometers?\b/iu);
  if (match) return frame('unit-conversion', {
    value: finiteNumber(match[1]), from: 'kilometer', to: 'meter', factor: 1_000,
  }, { kind: 'quantity' });
  return undefined;
}

function clockFrame(text) {
  const match = text.match(/\b(?:an\s+)?activity\s+starts?\s+at\s+(\d{1,2}):(\d{2})\s+and\s+lasts?\s+(\d+(?:\.\d+)?)\s+hours?\b/iu);
  return match ? frame('clock-duration', {
    hour: Number(match[1]), minute: Number(match[2]), durationHours: finiteNumber(match[3]),
  }, { kind: 'time' }) : undefined;
}

function shortProblemFrame(text) {
  let match = text.match(/\b(?:there\s+are\s+(\d+)\s+people\s+at\s+a\s+table|(?:at\s+)?a\s+table\s+(?:there\s+are\s+)?(\d+)\s+people)\b[\s\S]*?each\s+(?:person\s+)?(?:receives?|gets?)\s+(\d+)\s+glasses?\b[\s\S]*?how\s+many\s+glasses?\s+(?:are\s+)?(?:needed|required)/iu);
  if (match) return frame('equal-group-total', {
    groups: Number(match[1] ?? match[2]), perGroup: Number(match[3]), item: 'glass',
  }, { kind: 'number' });
  match = text.match(/\b([A-Z][\p{L}'-]*)\s+has\s+(\d+)\s+pages?\s+to\s+read\s+and\s+has\s+read\s+(\d+)\b[\s\S]*?how\s+many\s+pages?\s+(?:are\s+)?(?:left|remain)/iu);
  if (match) return frame('remaining-quantity', {
    total: Number(match[2]), consumed: Number(match[3]), item: 'page',
  }, { kind: 'number' });
  match = text.match(/\bthere\s+are\s+(\d+)\s+boxes?\s+with\s+(\d+)\s+objects?\s+each\b[\s\S]*?how\s+many\s+objects?\s+are\s+there\s+in\s+total/iu);
  if (match) return frame('equal-group-total', {
    groups: Number(match[1]), perGroup: Number(match[2]), item: 'object',
  }, { kind: 'number' });
  return undefined;
}

function meanFrame(text) {
  const match = text.match(/\bwhat\s+is\s+the\s+(?:arithmetic\s+)?mean\s+of\s+(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),?\s+and\s+(-?\d+(?:\.\d+)?)\s*\?/iu);
  return match ? frame('arithmetic-mean', {
    values: Object.freeze(match.slice(1).map(Number)), precision: 2,
  }, { kind: 'number' }) : undefined;
}

function orderFrame(text) {
  const match = text.match(/\b([A-Z][\p{L}'-]*)\s+is\s+taller\s+than\s+([A-Z][\p{L}'-]*),?\s+(?:and\s+)?\2\s+is\s+taller\s+than\s+([A-Z][\p{L}'-]*)\.\s*who\s+is\s+(?:the\s+)?shortest/iu);
  return match ? frame('ordered-relation-extreme', {
    relation: 'taller-than', chain: Object.freeze([match[1], match[2], match[3]]),
    requestedExtreme: 'minimum',
  }, { kind: 'entity' }) : undefined;
}

function knowledgeInspectionFrame(text) {
  let match = text.match(/^(?:what\s+do\s+you\s+know\s+about|tell\s+me\s+about)\s+(.+?)\s*\?$/iu);
  if (match) return frame('knowledge-summary', { subjectSurface: match[1].trim() }, {
    kind: 'grounded-prose', maximumSentences: 4,
  });
  match = text.match(/^what\s+(?:persons?|people)\s+do\s+you\s+know\s*\?$/iu);
  return match ? frame('knowledge-entity-list', { entityClass: 'person' }, {
    kind: 'grounded-list',
  }) : undefined;
}

const FRAMERS = Object.freeze([
  arithmeticFrame, percentageFrame, parityFrame, sequenceFrame, ratioFrame,
  conversionFrame, clockFrame, shortProblemFrame, meanFrame, orderFrame,
  knowledgeInspectionFrame,
]);

export function frameEverydayTask(text) {
  if (typeof text !== 'string') throw new TypeError('Everyday task input must be a string.');
  if (Buffer.byteLength(text, 'utf8') > MAXIMUM_EVERYDAY_INPUT_BYTES) return undefined;
  const normalized = text.normalize('NFC').replace(/[“”]/gu, '"').replace(/[’]/gu, "'").trim();
  for (const framer of FRAMERS) {
    const candidate = framer(normalized);
    if (candidate) return candidate;
  }
  return frameEverydayConstraintSynthesis(normalized) ?? frameEverydaySuppliedTextTask(normalized);
}
