import { readFile } from 'node:fs/promises';
import { hashFile, sha256 } from '../util.mjs';

export const ENTITY_TRACKING_SOURCE = Object.freeze({
  family: 'Entity Tracking in Language Models',
  version: 'boxes-dataset-v1 / repository tag v1.0.0',
  repository: 'https://github.com/sebschu/entity-tracking-lms',
  repositoryCommit: '8400de051ef4ad9483cc37dee3017b37a48dafd7',
  artifactPath: 'data/boxes-dataset-v1.zip',
  artifactSha256: '9378b9f43040729a1646bc6b0eec6d4b1fe063355e27138ca03ee4f0f713ad89',
  access: 'Password is published in the repository README to discourage training-data leakage.',
  license: 'No LICENSE file or explicit reusable-data license is present at the pinned commit.',
  redistribution: 'The README says not to include uncompressed files in repositories; '
    + 'keep extracted data in ignored cache.',
});

const MAX_LINE_BYTES = 2 * 1024 * 1024;
const MASK = '<extra_id_0>';

function assertCondition(condition, message) {
  if (!condition) throw new Error(`Invalid Entity Tracking source: ${message}`);
}

function canonicalSurface(value) {
  return value.normalize('NFKC').replace(/\s+([,.!?])/gu, '$1').replace(/\s+/gu, ' ').trim();
}

function sourceItems(value, lineNumber) {
  const normalized = value.normalize('NFKC').toLocaleLowerCase('en-US').trim()
    .replace(/[,.!?]+$/u, '').trim();
  if (normalized === 'nothing') return [];
  const items = normalized.split(/\s+and\s+/u)
    .map((item) => item.replace(/^(?:the|a|an)\s+/u, '').trim());
  assertCondition(items.length <= 1_000 && items.every((item) =>
    /^[\p{L}\p{N}][\p{L}\p{N} _-]{0,127}$/u.test(item)),
  `line ${lineNumber} contains an invalid source item list.`);
  return [...new Set(items)].sort();
}

function compileContainerProgram(text, lineNumber) {
  const queryMatch = text.match(/Box\s+(\d+)\s+contains\s+<extra_id_0>\s*[.!?]?\s*$/iu);
  assertCondition(queryMatch, `line ${lineNumber} has no final masked container query.`);
  const programText = text.slice(0, queryMatch.index).trim();
  const initialEnd = programText.indexOf('.');
  assertCondition(initialEnd >= 0, `line ${lineNumber} has no terminated initial state.`);
  const initialText = programText.slice(0, initialEnd);
  const clauses = [...initialText.matchAll(/Box\s+(\d+)\s+contains\s+(.+?)(?=,\s*Box\s+\d+\s+contains|$)/giu)];
  assertCondition(clauses.length > 0, `line ${lineNumber} has no initial container clauses.`);
  const initial = clauses.map((match) => Object.freeze({
    subject: `box:${match[1]}`, relation: 'contains', values: Object.freeze(sourceItems(match[2], lineNumber)),
  }));
  const operationText = programText.slice(initialEnd + 1).trim();
  const sourceOperations = operationText
    ? operationText.split(/\.\s*/u).map((item) => item.trim()).filter(Boolean) : [];
  assertCondition(sourceOperations.length <= 10_000, `line ${lineNumber} exceeds the operation limit.`);
  const transitions = sourceOperations.map((operation, index) => {
    let match;
    if ((match = operation.match(/^Move\s+(.+?)\s+from\s+Box\s+(\d+)\s+to\s+Box\s+(\d+)$/iu))) {
      return Object.freeze({
        operator: 'transfer', relation: 'contains', values: Object.freeze(sourceItems(match[1], lineNumber)),
        from: `box:${match[2]}`, to: `box:${match[3]}`,
      });
    }
    if ((match = operation.match(/^Put\s+(.+?)\s+into\s+Box\s+(\d+)$/iu))) {
      return Object.freeze({
        operator: 'add', relation: 'contains', values: Object.freeze(sourceItems(match[1], lineNumber)),
        to: `box:${match[2]}`,
      });
    }
    if ((match = operation.match(/^Remove\s+(.+?)\s+from\s+Box\s+(\d+)$/iu))) {
      return Object.freeze({
        operator: 'remove', relation: 'contains', values: Object.freeze(sourceItems(match[1], lineNumber)),
        from: `box:${match[2]}`,
      });
    }
    throw new Error(`Invalid Entity Tracking source: line ${lineNumber} has unsupported operation ${index + 1}.`);
  });
  return Object.freeze({
    schema: 'finite-relation-state-program-v1', relation: 'contains',
    initial: Object.freeze(initial), transitions: Object.freeze(transitions),
    query: Object.freeze({ subject: `box:${queryMatch[1]}`, relation: 'contains' }),
  });
}

function parseLine(rawLine, lineNumber, datasetId, split) {
  assertCondition(Buffer.byteLength(rawLine, 'utf8') <= MAX_LINE_BYTES, `line ${lineNumber} exceeds 2 MiB.`);
  let record;
  try {
    record = JSON.parse(rawLine);
  } catch (error) {
    throw new Error(`Invalid Entity Tracking source: line ${lineNumber} is not JSON: ${error.message}`);
  }
  assertCondition(
    record && !Array.isArray(record) && typeof record === 'object',
    `line ${lineNumber} must be an object.`,
  );
  for (const field of ['sentence', 'sentence_masked', 'masked_content']) {
    assertCondition(typeof record[field] === 'string' && record[field].length > 0,
      `line ${lineNumber} field ${field} must be a non-empty string.`);
  }
  assertCondition(Number.isSafeInteger(record.sample_id) && record.sample_id >= 0,
    `line ${lineNumber} sample_id must be a non-negative integer.`);
  assertCondition(Number.isSafeInteger(record.numops) && record.numops >= 0,
    `line ${lineNumber} numops must be a non-negative integer.`);
  assertCondition(record.sentence_masked.split(MASK).length === 2,
    `line ${lineNumber} must contain exactly one ${MASK} mask.`);
  const expectedPrefix = `${MASK} `;
  assertCondition(record.masked_content.startsWith(expectedPrefix),
    `line ${lineNumber} masked_content must begin with ${expectedPrefix}.`);
  const expectedSpan = record.masked_content.slice(expectedPrefix.length).trim();
  assertCondition(expectedSpan.length > 0 && expectedSpan.length <= 10_000,
    `line ${lineNumber} has an invalid expected span.`);
  const reconstructed = record.sentence_masked.replace(MASK, expectedSpan);
  assertCondition(canonicalSurface(reconstructed) === canonicalSurface(record.sentence),
    `line ${lineNumber} masked span does not reconstruct sentence.`);
  const globalOperationCount = Math.max(0, (record.sentence.match(/\./gu)?.length ?? 0) - 2);
  const fingerprint = sha256(`${record.sample_id}\0${record.numops}\0${record.sentence_masked}`).slice(0, 24);
  const id = `entity-tracking:${datasetId}:${split}:${fingerprint}`;
  return {
    visible: Object.freeze({
      format: 'eslm-benchmark-case-v1',
      id,
      family: 'entity-tracking',
      split,
      kind: 'masked-span',
      text: record.sentence_masked,
      taskFrame: Object.freeze({
        operation: 'complete-container-contents', mask: MASK,
        stateProgram: compileContainerProgram(record.sentence_masked, lineNumber),
      }),
      metadata: Object.freeze({
        sampleId: record.sample_id,
        localOperationCount: record.numops,
        globalOperationCount,
      }),
    }),
    oracle: Object.freeze({ id, expectedSpan, officialTarget: record.masked_content }),
  };
}

function takeStratified(items, limit, seed) {
  if (limit === undefined || limit >= items.length) return items;
  assertCondition(Number.isInteger(limit) && limit > 0, 'sample limit must be a positive integer.');
  const groups = new Map();
  for (const item of items) {
    const key = item.visible.metadata.localOperationCount;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  for (const group of groups.values()) {
    group.sort((left, right) => sha256(`${seed}:${left.visible.id}`)
      .localeCompare(sha256(`${seed}:${right.visible.id}`)));
  }
  const selected = [];
  const keys = [...groups.keys()].sort((left, right) => left - right);
  while (selected.length < limit) {
    let progressed = false;
    for (const key of keys) {
      const item = groups.get(key).shift();
      if (item) {
        selected.push(item);
        progressed = true;
        if (selected.length === limit) break;
      }
    }
    if (!progressed) break;
  }
  return selected;
}

export function adaptEntityTrackingJsonl(text, options = {}) {
  assertCondition(typeof text === 'string', 'JSONL input must be a string.');
  assertCondition(!text.includes('\0'), 'JSONL input contains a NUL byte.');
  const datasetId = options.datasetId ?? 'boxes-dataset-v1-base';
  const split = options.split ?? 'dev';
  assertCondition(/^[a-z0-9][a-z0-9._-]{1,127}$/u.test(datasetId), 'datasetId is invalid.');
  assertCondition(['train', 'dev', 'test'].includes(split), 'split must be train, dev, or test.');
  const lines = text.split(/\r?\n/u).filter((line) => line.trim().length > 0);
  assertCondition(lines.length > 0, 'JSONL input is empty.');
  const all = lines.map((line, index) => parseLine(line, index + 1, datasetId, split));
  assertCondition(new Set(all.map((item) => item.visible.id)).size === all.length, 'adapted case ids are not unique.');
  const selected = takeStratified(all, options.limit, options.seed ?? 'eslm-entity-tracking-v1');
  const localOperationCounts = selected.map((item) => item.visible.metadata.localOperationCount);
  const operationCounts = Object.fromEntries([...new Set(localOperationCounts)]
    .sort((left, right) => left - right)
    .map((count) => [String(count), localOperationCounts.filter((item) => item === count).length]));
  return Object.freeze({
    format: 'eslm-adapted-benchmark-v1',
    family: 'entity-tracking',
    datasetId,
    split,
    sourceRows: all.length,
    selectedRows: selected.length,
    strata: Object.freeze({ numOperations: Object.freeze(operationCounts) }),
    pool: Object.freeze(selected.map((item) => item.visible)),
    oracle: Object.freeze(selected.map((item) => item.oracle)),
    leakagePolicy: Object.freeze({
      pool: split === 'train' ? 'training-visible' : split === 'dev' ? 'development-visible' : 'evaluation-visible',
      oracle: 'host-scorer-only; omit from coding-agent packets',
    }),
  });
}

function itemSet(value) {
  if (Array.isArray(value)) {
    const items = value.flatMap((item) => itemSet(item));
    return [...new Set(items)].sort();
  }
  let text = String(value ?? '').normalize('NFKC').toLocaleLowerCase('en-US').trim();
  text = text.replace(/^<extra_id_0>\s*/u, '').replace(/[.!?]+$/u, '').trim();
  if (/^(?:nothing|is empty|empty)$/u.test(text)) return [];
  text = text.replace(/^contains\s+/u, '');
  const items = text.split(/\s*(?:,|\band\b)\s*/u)
    .map((item) => item.replace(/^(?:the|a|an)\s+/u, '').trim())
    .filter(Boolean);
  return [...new Set(items)].sort();
}

export function scoreEntityTrackingSpan(prediction, oracle) {
  assertCondition(typeof oracle?.expectedSpan === 'string', 'oracle expectedSpan is required.');
  const actualItems = itemSet(prediction);
  const expectedItems = itemSet(oracle.expectedSpan);
  return Object.freeze({
    pass: JSON.stringify(actualItems) === JSON.stringify(expectedItems),
    actualItems: Object.freeze(actualItems),
    expectedItems: Object.freeze(expectedItems),
  });
}

export async function probeEntityTrackingJsonl(path, options = {}) {
  const text = await readFile(path, 'utf8');
  const adapted = adaptEntityTrackingJsonl(text, options);
  return Object.freeze({
    ...adapted,
    sourceFile: Object.freeze({ path, bytes: Buffer.byteLength(text, 'utf8'), sha256: await hashFile(path) }),
  });
}
