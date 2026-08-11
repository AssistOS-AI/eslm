import { gunzipSync } from 'node:zlib';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { PROJECT_ROOT } from '../paths.mjs';
import { sha256 } from '../util.mjs';
import { compareEnglishAcceptability } from '../language/feature-grammar.mjs';
import {
  executeEpisodicWorldTask,
  verifyEpisodicWorldResult,
} from '../reasoning/episodic-world.mjs';

const MAX_COMPRESSED_BYTES = 128 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 512 * 1024 * 1024;
const MAX_TEXT_BYTES = 16 * 1024 * 1024;
const BLIMP_FIELDS = Object.freeze([
  'sentence_good', 'sentence_bad', 'field', 'linguistics_term', 'UID', 'simple_LM_method',
  'one_prefix_method', 'two_prefix_method', 'lexically_identical', 'pairID',
  'crucial_item', 'dependency_length', 'one_prefix_prefix', 'one_prefix_word_bad',
  'one_prefix_word_good', 'two_prefix_prefix_bad', 'two_prefix_prefix_good', 'two_prefix_word',
]);
const BLIMP_OPTIONAL_TEXT_FIELDS = Object.freeze([
  'crucial_item', 'one_prefix_prefix', 'one_prefix_word_bad', 'one_prefix_word_good',
  'two_prefix_prefix_bad', 'two_prefix_prefix_good', 'two_prefix_word',
]);

export const BLIMP_BABI_SOURCES = Object.freeze({
  blimp: Object.freeze({
    id: 'blimp-git-3e56b06f',
    family: 'BLiMP',
    version: 'git:3e56b06fcabca9b30822fc66435fca6b1aa40bb1',
    source: 'https://github.com/alexwarstadt/blimp',
    archiveUrl: 'https://codeload.github.com/alexwarstadt/blimp/tar.gz/3e56b06fcabca9b30822fc66435fca6b1aa40bb1',
    cachePath: 'training/.cache/datasets/blimp/3e56b06fcabca9b30822fc66435fca6b1aa40bb1/blimp.tar.gz',
    sha256: 'cbada5cc59b41798f0f0a6b2525166c7a1d82c4a40ed726c78810b898e1979f6',
    license: 'CC BY 4.0',
    licenseEvidence: 'README.md in the pinned source archive',
  }),
  babi: Object.freeze({
    id: 'babi-en-10k-v1.2',
    family: 'bAbI',
    version: '1.2',
    source: 'https://github.com/facebookarchive/bAbI-tasks',
    archiveUrl: 'https://s3.amazonaws.com/text-datasets/babi_tasks_1-20_v1-2.tar.gz',
    cachePath: 'training/.cache/datasets/babi-v1.2/babi_tasks_1-20_v1-2.tar.gz',
    sha256: '84f5296ab9a1ad0dc9464e08c491d65cd08830fca3acae9ab86f75e0fb81573c',
    license: 'CC BY 3.0 Unported',
    licenseEvidence: 'tasks_1-20_v1-2/LICENSE.txt in the source archive',
  }),
});

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function requireText(value, field, sourceName, maxLength = 4096) {
  requireCondition(typeof value === 'string' && value.length > 0, `${sourceName}: ${field} must be non-empty text.`);
  requireCondition(value.length <= maxLength, `${sourceName}: ${field} exceeds ${maxLength} characters.`);
  requireCondition(!value.includes('\0'), `${sourceName}: ${field} contains a NUL byte.`);
}

function tarEntries(compressed, sourceName) {
  requireCondition(Buffer.isBuffer(compressed), `${sourceName}: archive must be a Buffer.`);
  requireCondition(
    compressed.length <= MAX_COMPRESSED_BYTES,
    `${sourceName}: compressed archive exceeds the safety limit.`,
  );
  const expanded = gunzipSync(compressed, { maxOutputLength: MAX_EXPANDED_BYTES });
  const entries = [];
  const names = new Set();
  for (let offset = 0; offset + 512 <= expanded.length;) {
    const header = expanded.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const shortName = header.subarray(0, 100).toString('utf8').replace(/\0.*$/u, '');
    const prefix = header.subarray(345, 500).toString('utf8').replace(/\0.*$/u, '');
    const name = prefix ? `${prefix}/${shortName}` : shortName;
    const sizeField = header.subarray(124, 136).toString('ascii').replace(/\0.*$/u, '').trim();
    requireCondition(/^[0-7]*$/u.test(sizeField), `${sourceName}: invalid TAR size for ${name}.`);
    const size = Number.parseInt(sizeField || '0', 8);
    const dataStart = offset + 512;
    const nextOffset = dataStart + Math.ceil(size / 512) * 512;
    requireCondition(Number.isSafeInteger(size) && size >= 0 && nextOffset <= expanded.length,
      `${sourceName}: truncated or oversized TAR entry ${name}.`);
    requireCondition(!name.startsWith('/') && !name.split('/').includes('..'),
      `${sourceName}: unsafe TAR entry path ${name}.`);
    requireCondition(!names.has(name), `${sourceName}: duplicate TAR entry ${name}.`);
    names.add(name);
    entries.push({ name, bytes: expanded.subarray(dataStart, dataStart + size) });
    offset = nextOffset;
  }
  return entries;
}

function textOf(entry, sourceName) {
  requireCondition(
    entry.bytes.length <= MAX_TEXT_BYTES,
    `${sourceName}: ${entry.name} exceeds the text-file safety limit.`,
  );
  const text = entry.bytes.toString('utf8');
  requireCondition(!text.includes('\uFFFD'), `${sourceName}: ${entry.name} is not valid UTF-8.`);
  return text;
}

export async function acquireBenchmarkArchive(source, options = {}) {
  requireCondition(
    Object.values(BLIMP_BABI_SOURCES).includes(source),
    'Source must be a registered BLiMP/bAbI descriptor.',
  );
  const cachePath = join(PROJECT_ROOT, source.cachePath);
  let bytes;
  let reused = true;
  try {
    bytes = await readFile(cachePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    requireCondition(options.allowNetwork === true,
      `${source.id}: immutable archive is absent; an explicit allowNetwork=true acquisition is required.`);
    const response = await fetch(source.archiveUrl);
    requireCondition(response.ok, `${source.id}: download failed with HTTP ${response.status}.`);
    bytes = Buffer.from(await response.arrayBuffer());
    reused = false;
  }
  requireCondition(bytes.length <= MAX_COMPRESSED_BYTES, `${source.id}: compressed archive exceeds the safety limit.`);
  const digest = sha256(bytes);
  requireCondition(digest === source.sha256, `${source.id}: archive checksum mismatch: ${digest}.`);
  if (!reused) {
    await mkdir(dirname(cachePath), { recursive: true });
    await writeFile(cachePath, bytes, { flag: 'wx' });
  }
  return { source, path: source.cachePath, bytes, byteLength: bytes.length, sha256: digest, reused };
}

export function parseBlimpJsonLines(text, sourceName = 'BLiMP input') {
  requireText(text, 'content', sourceName, MAX_TEXT_BYTES);
  const cases = [];
  const identifiers = new Set();
  for (const [index, line] of text.split(/\r?\n/u).entries()) {
    if (!line.trim()) continue;
    let record;
    try {
      record = JSON.parse(line);
    } catch (error) {
      throw new Error(`${sourceName}:${index + 1}: invalid JSON: ${error.message}`);
    }
    requireCondition(record && !Array.isArray(record) && typeof record === 'object',
      `${sourceName}:${index + 1}: record must be an object.`);
    requireCondition(Object.keys(record).every((field) => BLIMP_FIELDS.includes(field)),
      `${sourceName}:${index + 1}: record contains an unrecognized field.`);
    for (const field of ['sentence_good', 'sentence_bad', 'field', 'linguistics_term', 'UID']) {
      requireText(record[field], field, `${sourceName}:${index + 1}`);
    }
    for (const field of ['simple_LM_method', 'one_prefix_method', 'two_prefix_method', 'lexically_identical']) {
      requireCondition(typeof record[field] === 'boolean', `${sourceName}:${index + 1}: ${field} must be boolean.`);
    }
    for (const field of BLIMP_OPTIONAL_TEXT_FIELDS) {
      if (record[field] !== undefined) requireText(record[field], field, `${sourceName}:${index + 1}`);
    }
    if (record.dependency_length !== undefined) {
      requireCondition(Number.isSafeInteger(record.dependency_length) && record.dependency_length >= 0,
        `${sourceName}:${index + 1}: dependency_length must be a non-negative integer.`);
    }
    const pairId = String(record.pairID);
    requireCondition(/^\d+$/u.test(pairId), `${sourceName}:${index + 1}: pairID must be a non-negative integer.`);
    const id = `blimp:${record.UID}:${pairId}`;
    requireCondition(!identifiers.has(id), `${sourceName}:${index + 1}: duplicate pair ${id}.`);
    identifiers.add(id);
    cases.push({
      id,
      kind: 'preference',
      good: record.sentence_good,
      bad: record.sentence_bad,
      metadata: {
        family: 'BLiMP', paradigm: record.UID, field: record.field,
        linguisticsTerm: record.linguistics_term, pairId,
        lexicallyIdentical: record.lexically_identical,
        ...(record.crucial_item === undefined ? {} : { crucialItem: record.crucial_item }),
        ...(record.dependency_length === undefined ? {} : { dependencyLength: record.dependency_length }),
      },
    });
  }
  requireCondition(cases.length > 0, `${sourceName}: no BLiMP records were found.`);
  return cases;
}

export function parseBabiTask(text, options) {
  const { datasetId = BLIMP_BABI_SOURCES.babi.id, split, task } = options ?? {};
  requireCondition(['train', 'test'].includes(split), 'bAbI split must be train or test.');
  requireCondition(
    Number.isInteger(task) && task >= 1 && task <= 20,
    'bAbI task must be an integer from 1 through 20.',
  );
  requireText(text, 'content', `bAbI task ${task}`, MAX_TEXT_BYTES);
  const cases = [];
  let story = 0;
  let previousLineId = 0;
  let statements = [];
  let sourceLines = new Map();
  for (const [index, rawLine] of text.split(/\r?\n/u).entries()) {
    if (!rawLine.trim()) continue;
    const match = rawLine.match(/^(\d+)\s+(.+)$/u);
    requireCondition(Boolean(match), `bAbI task ${task}:${index + 1}: invalid numbered line.`);
    const lineId = Number(match[1]);
    if (lineId === 1) {
      story += 1;
      previousLineId = 0;
      statements = [];
      sourceLines = new Map();
    }
    requireCondition(lineId === previousLineId + 1, `bAbI task ${task}:${index + 1}: non-contiguous story line ID.`);
    previousLineId = lineId;
    const fields = match[2].split('\t');
    if (fields.length === 1) {
      requireText(fields[0], 'statement', `bAbI task ${task}:${index + 1}`);
      statements.push(fields[0]);
      sourceLines.set(lineId, fields[0]);
      continue;
    }
    requireCondition(fields.length === 3, `bAbI task ${task}:${index + 1}: question must have three tab fields.`);
    const [question, answer, supportText] = fields;
    requireText(question, 'question', `bAbI task ${task}:${index + 1}`);
    requireText(answer, 'answer', `bAbI task ${task}:${index + 1}`);
    const supportIds = supportText.split(' ').filter(Boolean).map(Number);
    requireCondition(supportIds.length > 0 && supportIds.every((id) => sourceLines.has(id)),
      `bAbI task ${task}:${index + 1}: support IDs must reference preceding statements in the story.`);
    cases.push({
      id: `${datasetId}:task-${task}:${split}:story-${story}:line-${lineId}`,
      kind: 'qa',
      context: statements.join(' '),
      text: question,
      answer,
      values: [answer],
      supportIds,
      support: supportIds.map((id) => sourceLines.get(id)),
      metadata: { family: 'bAbI', version: '1.2', task, split, story, questionLine: lineId },
    });
  }
  requireCondition(cases.length > 0, `bAbI task ${task}: no cases were found.`);
  return cases;
}

function selectStable(items, limit, seed) {
  requireCondition(Number.isInteger(limit) && limit >= 1, 'Sample limit must be a positive integer.');
  return items.map((item) => ({ item, rank: sha256(`${seed}\0${item.id}`) }))
    .sort((left, right) => left.rank.localeCompare(right.rank))
    .slice(0, limit)
    .map(({ item }) => item);
}

export async function probeBlimpArchive(options = {}) {
  const acquired = await acquireBenchmarkArchive(BLIMP_BABI_SOURCES.blimp, options);
  const entries = tarEntries(acquired.bytes, acquired.source.id)
    .filter((entry) => /\/data\/[^/]+\.jsonl$/u.test(entry.name));
  requireCondition(
    entries.length === 67,
    `${acquired.source.id}: expected 67 paradigm files, found ${entries.length}.`,
  );
  const files = [];
  const sampledCases = [];
  const perParadigm = options.perParadigm ?? 2;
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const cases = parseBlimpJsonLines(textOf(entry, acquired.source.id), entry.name);
    const paradigm = entry.name.match(/\/([^/]+)\.jsonl$/u)[1];
    requireCondition(cases.length === 1000, `${entry.name}: expected 1000 pairs, found ${cases.length}.`);
    requireCondition(
      cases.every((item) => item.metadata.paradigm === paradigm),
      `${entry.name}: UID does not match its filename.`,
    );
    sampledCases.push(...selectStable(cases, perParadigm, options.seed ?? 'eslm-blimp-probe-v1'));
    files.push({ path: entry.name, sha256: sha256(entry.bytes), cases: cases.length, paradigm });
  }
  return {
    format: 'eslm-benchmark-source-probe-v1', source: acquired.source, archive: {
      path: acquired.path, bytes: acquired.byteLength, sha256: acquired.sha256, reused: acquired.reused,
    },
    validation: { files: files.length, cases: files.reduce((sum, file) => sum + file.cases, 0), filesDetail: files },
    sample: {
      policy: 'stable-hash-per-paradigm', seed: options.seed ?? 'eslm-blimp-probe-v1',
      perParadigm, visibility: 'development-visible', cases: sampledCases,
    },
  };
}

const BABI_TASK_FILES = Object.freeze({
  2: 'qa2_two-supporting-facts',
  3: 'qa3_three-supporting-facts',
  15: 'qa15_basic-deduction',
  16: 'qa16_basic-induction',
});

export const BABI_ALL_TASK_FILES = Object.freeze({
  1: 'qa1_single-supporting-fact',
  2: 'qa2_two-supporting-facts',
  3: 'qa3_three-supporting-facts',
  4: 'qa4_two-arg-relations',
  5: 'qa5_three-arg-relations',
  6: 'qa6_yes-no-questions',
  7: 'qa7_counting',
  8: 'qa8_lists-sets',
  9: 'qa9_simple-negation',
  10: 'qa10_indefinite-knowledge',
  11: 'qa11_basic-coreference',
  12: 'qa12_conjunction',
  13: 'qa13_compound-coreference',
  14: 'qa14_time-reasoning',
  15: 'qa15_basic-deduction',
  16: 'qa16_basic-induction',
  17: 'qa17_positional-reasoning',
  18: 'qa18_size-reasoning',
  19: 'qa19_path-finding',
  20: 'qa20_agents-motivations',
});

const DIRECTION_SURFACES = Object.freeze({
  north: 'n', south: 's', east: 'e', west: 'w',
  'north of': 'n', 'south of': 's', 'east of': 'e', 'west of': 'w',
  above: 'n', below: 's', 'to the right of': 'e', 'to the left of': 'w',
});
const INVERSE_DIRECTIONS = Object.freeze({ n: 's', s: 'n', e: 'w', w: 'e' });
const RELATION_VECTORS = Object.freeze({ n: Object.freeze([0, 1]), s: Object.freeze([0, -1]),
  e: Object.freeze([1, 0]), w: Object.freeze([-1, 0]) });
const COUNT_WORDS = Object.freeze({ none: '0', one: '1', two: '2', three: '3', four: '4', five: '5' });
const MOTIVE_GOALS = Object.freeze({
  tired: Object.freeze({ destination: 'bedroom' }),
  bored: Object.freeze({ destination: 'garden' }),
  thirsty: Object.freeze({ destination: 'kitchen' }),
  hungry: Object.freeze({ destination: 'kitchen' }),
});

function semanticId(value) {
  return value.toLocaleLowerCase('en-US').trim().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/gu, '');
}

function singularClass(value) {
  const normalized = semanticId(value);
  if (normalized === 'mice') return 'mouse';
  if (normalized.endsWith('ves')) return `${normalized.slice(0, -3)}f`;
  if (normalized.endsWith('s') && !normalized.endsWith('ss')) return normalized.slice(0, -1);
  return normalized;
}

function sentencesFromContext(context) {
  return context.match(/[^.]+\./gu)?.map((sentence) => sentence.trim()) ?? [];
}

function relationFromSurface(surface) {
  return DIRECTION_SURFACES[surface.toLocaleLowerCase('en-US')];
}

function addOperation(state, operation) {
  state.operations.push(Object.freeze({ id: `op:${state.operations.length + 1}`, sequence: state.operations.length + 1,
    ...operation }));
}

function movementMatch(text) {
  return text.match(/^([A-Z][a-z]+(?: and [A-Z][a-z]+)?) (?:moved|went|journeyed|travelled)(?: back)? to the ([a-z]+)$/u);
}

function compileStatement(sentence, state) {
  let text = sentence.replace(/\.$/u, '').trim();
  let semanticTime;
  const leadingTime = text.match(/^(Yesterday|This morning|This afternoon|This evening) (.+)$/u);
  if (leadingTime) {
    semanticTime = { Yesterday: 0, 'This morning': 1, 'This afternoon': 2, 'This evening': 3 }[leadingTime[1]];
    text = leadingTime[2];
  } else {
    const trailingTime = text.match(/^(.+) (yesterday|this morning|this afternoon|this evening)$/u);
    if (trailingTime) {
      semanticTime = { yesterday: 0, 'this morning': 1, 'this afternoon': 2, 'this evening': 3 }[trailingTime[2]];
      text = trailingTime[1];
    }
  }
  const reference = text.match(/^(?:After that|Afterwards|Following that|Then) (she|he|they) (.+)$/u);
  if (reference) {
    const subjects = reference[1] === 'they' ? state.lastGroup : state.lastSubjects?.slice(0, 1);
    if (!subjects?.length) return false;
    text = `${subjects.map((subject) => subject[0].toUpperCase() + subject.slice(1)).join(' and ')} ${reference[2]}`;
  }
  const move = movementMatch(text);
  if (move) {
    const subjects = move[1].split(' and ').map(semanticId);
    const location = semanticId(move[2]);
    for (const subject of subjects) {
      addOperation(state, { kind: 'state', predicate: 'location', subject, values: [location],
        polarity: 'positive', ...(semanticTime === undefined ? {} : { semanticTime }) });
      addOperation(state, { kind: 'event', eventType: 'move', roles: { agent: subject, destination: location } });
      for (const object of state.possessions.get(subject) ?? []) {
        addOperation(state, { kind: 'state', predicate: 'location', subject: object, values: [location],
          polarity: 'positive', ...(semanticTime === undefined ? {} : { semanticTime }) });
      }
    }
    state.lastSubjects = subjects;
    if (subjects.length > 1) state.lastGroup = subjects;
    return true;
  }
  let match = text.match(/^([A-Z][a-z]+) (?:got|grabbed|took|picked up) the ([a-z]+)(?: there)?$/u);
  if (match) {
    const subject = semanticId(match[1]);
    const object = semanticId(match[2]);
    addOperation(state, { kind: 'relation-add', relation: 'carries', subject, object });
    addOperation(state, { kind: 'event', eventType: 'acquire', roles: { agent: subject, theme: object } });
    if (!state.possessions.has(subject)) state.possessions.set(subject, new Set());
    state.possessions.get(subject).add(object);
    state.lastSubjects = [subject];
    return true;
  }
  match = text.match(/^([A-Z][a-z]+) (?:dropped|left|discarded|put down) the ([a-z]+)(?: there)?$/u);
  if (match) {
    const subject = semanticId(match[1]);
    const object = semanticId(match[2]);
    addOperation(state, { kind: 'relation-remove', relation: 'carries', subject, object });
    state.possessions.get(subject)?.delete(object);
    const location = [...state.operations].reverse().find((operation) => operation.kind === 'state'
      && operation.predicate === 'location' && operation.subject === subject && operation.polarity === 'positive');
    if (location) addOperation(state, { kind: 'state', predicate: 'location', subject: object,
      values: [...location.values], polarity: 'positive' });
    state.lastSubjects = [subject];
    return true;
  }
  match = text.match(/^([A-Z][a-z]+) (gave|handed|passed) the ([a-z]+) to ([A-Z][a-z]+)$/u);
  if (match) {
    const agent = semanticId(match[1]);
    const theme = semanticId(match[3]);
    const recipient = semanticId(match[4]);
    addOperation(state, { kind: 'relation-transfer', relation: 'carries', from: agent, to: recipient, object: theme });
    addOperation(state, { kind: 'event', eventType: 'transfer',
      mode: match[2] === 'passed' ? 'pass' : 'direct-give', roles: { agent, theme, recipient } });
    state.possessions.get(agent)?.delete(theme);
    if (!state.possessions.has(recipient)) state.possessions.set(recipient, new Set());
    state.possessions.get(recipient).add(theme);
    state.lastSubjects = [agent];
    return true;
  }
  match = text.match(/^([A-Z][a-z]+) is either in the ([a-z]+) or the ([a-z]+)$/u);
  if (match) {
    addOperation(state, { kind: 'state', predicate: 'location', subject: semanticId(match[1]),
      values: [semanticId(match[2]), semanticId(match[3])], polarity: 'possible' });
    state.lastSubjects = [semanticId(match[1])];
    return true;
  }
  match = text.match(/^([A-Z][a-z]+) is (?:not|no longer) in the ([a-z]+)$/u);
  if (match) {
    addOperation(state, { kind: 'state', predicate: 'location', subject: semanticId(match[1]),
      values: [semanticId(match[2])], polarity: 'negative' });
    state.lastSubjects = [semanticId(match[1])];
    return true;
  }
  match = text.match(/^([A-Z][a-z]+) is in the ([a-z]+)$/u);
  if (match) {
    addOperation(state, { kind: 'state', predicate: 'location', subject: semanticId(match[1]),
      values: [semanticId(match[2])], polarity: 'positive' });
    state.lastSubjects = [semanticId(match[1])];
    return true;
  }
  match = text.match(/^The (.+) is (north of|south of|east of|west of|above|below|to the right of|to the left of) the (.+)$/u);
  if (match) {
    const relation = relationFromSurface(match[2]);
    addOperation(state, { kind: 'edge', relation, subject: semanticId(match[3]), object: semanticId(match[1]) });
    return true;
  }
  match = text.match(/^The (.+) (?:fits inside|fits in) the (.+)$/u);
  if (match) {
    const subject = semanticId(match[1]);
    const object = semanticId(match[2]);
    addOperation(state, { kind: 'edge', relation: 'fits', subject, object });
    addOperation(state, { kind: 'edge', relation: 'bigger', subject, object });
    return true;
  }
  match = text.match(/^The (.+) is bigger than the (.+)$/u);
  if (match) {
    const subject = semanticId(match[2]);
    const object = semanticId(match[1]);
    addOperation(state, { kind: 'edge', relation: 'bigger', subject, object });
    addOperation(state, { kind: 'edge', relation: 'fits', subject, object });
    return true;
  }
  match = text.match(/^([A-Z][a-z]+) is a ([a-z]+)$/u);
  if (match) {
    addOperation(state, { kind: 'type', subject: semanticId(match[1]), objectClass: singularClass(match[2]) });
    state.lastSubjects = [semanticId(match[1])];
    return true;
  }
  match = text.match(/^([A-Z][a-z]+) is ([a-z]+)$/u);
  if (match) {
    const subject = semanticId(match[1]);
    const value = semanticId(match[2]);
    addOperation(state, { kind: 'property', predicate: 'attribute', subject, value });
    addOperation(state, { kind: 'state', predicate: 'condition', subject, values: [value], polarity: 'positive' });
    state.lastSubjects = [subject];
    return true;
  }
  match = text.match(/^([A-Z][a-z]+) are afraid of ([a-z]+)$/u);
  if (match) {
    addOperation(state, { kind: 'class-rule', subjectClass: singularClass(match[1]), relation: 'afraid_of',
      objectClass: singularClass(match[2]) });
    return true;
  }
  return false;
}

function compileQuestion(question, state) {
  const text = question.trim().replace(/\?\s*$/u, '');
  let match = text.match(/^Where is (?:the )?(.+)$/iu);
  if (match) return { kind: 'state-values', predicate: 'location', subject: semanticId(match[1]),
    carrierRelation: 'carries' };
  match = text.match(/^Where was (?:the )?(.+) before the (.+)$/iu);
  if (match) return { kind: 'state-predecessor', predicate: 'location', subject: semanticId(match[1]),
    before: semanticId(match[2]) };
  match = text.match(/^What is (north|south|east|west) of the (.+)$/iu);
  if (match) return { kind: 'edge-values', subject: semanticId(match[2]), relation: relationFromSurface(match[1]) };
  match = text.match(/^What is the (.+) (north|south|east|west) of$/iu);
  if (match) return { kind: 'edge-values', subject: semanticId(match[1]),
    relation: INVERSE_DIRECTIONS[relationFromSurface(match[2])] };
  match = text.match(/^What did ([A-Z][a-z]+) give to ([A-Z][a-z]+)$/u);
  if (match) return { kind: 'event-role', eventType: 'transfer',
    constraints: { agent: semanticId(match[1]), recipient: semanticId(match[2]) }, outputRole: 'theme',
    requireUnique: true };
  match = text.match(/^Who received the ([a-z]+)$/u);
  if (match) return { kind: 'event-role', eventType: 'transfer', constraints: { theme: semanticId(match[1]) },
    outputRole: 'recipient', selection: 'latest' };
  match = text.match(/^Who did ([A-Z][a-z]+) give the ([a-z]+) to$/u);
  if (match) return { kind: 'event-role', eventType: 'transfer',
    constraints: { agent: semanticId(match[1]), theme: semanticId(match[2]) }, outputRole: 'recipient',
    selection: 'latest' };
  match = text.match(/^Who gave the ([a-z]+) to ([A-Z][a-z]+)$/u);
  if (match) return { kind: 'event-role', eventType: 'transfer',
    constraints: { theme: semanticId(match[1]), recipient: semanticId(match[2]) }, outputRole: 'agent',
    selection: 'latest' };
  match = text.match(/^Who gave the ([a-z]+)$/u);
  if (match) return { kind: 'event-role', eventType: 'transfer', constraints: { theme: semanticId(match[1]) },
    outputRole: 'agent', selection: 'latest' };
  match = text.match(/^Is ([A-Z][a-z]+) in the ([a-z]+)$/u);
  if (match) return { kind: 'state-membership', predicate: 'location', subject: semanticId(match[1]),
    value: semanticId(match[2]) };
  match = text.match(/^How many objects is ([A-Z][a-z]+) carrying$/u);
  if (match) return { kind: 'relation-count', relation: 'carries', subject: semanticId(match[1]) };
  match = text.match(/^What is ([A-Z][a-z]+) carrying$/u);
  if (match) return { kind: 'relation-values', relation: 'carries', subject: semanticId(match[1]) };
  match = text.match(/^What is ([a-z]+) afraid of$/iu);
  if (match) return { kind: 'class-rule-value', relation: 'afraid_of', subject: semanticId(match[1]) };
  match = text.match(/^What color is ([A-Z][a-z]+)$/u);
  if (match) return { kind: 'induce-property', predicate: 'attribute', subject: semanticId(match[1]) };
  match = text.match(/^Is the (.+) (above|below|to the right of|to the left of) the (.+)$/u);
  if (match) return { kind: 'vector-membership', subject: semanticId(match[1]),
    relation: relationFromSurface(match[2]), object: semanticId(match[3]) };
  match = text.match(/^Is the (.+) bigger than the (.+)$/u);
  if (match) return { kind: 'edge-membership', relation: 'bigger', subject: semanticId(match[2]),
    object: semanticId(match[1]) };
  match = text.match(/^Does the (.+) fit (?:in|inside) the (.+)$/u);
  if (match) return { kind: 'edge-membership', relation: 'fits', subject: semanticId(match[1]),
    object: semanticId(match[2]) };
  match = text.match(/^How do you go from the (.+) to the (.+)$/u);
  if (match) return { kind: 'edge-path', from: semanticId(match[1]), to: semanticId(match[2]) };
  match = text.match(/^Where will ([a-z]+) go$/iu);
  if (match) return { kind: 'motive-goal', motivePredicate: 'condition', subject: semanticId(match[1]),
    goalRelation: 'destination' };
  match = text.match(/^Why did ([a-z]+) go to the ([a-z]+)$/iu);
  if (match) return { kind: 'event-cause', eventType: 'move', motivePredicate: 'condition',
    subject: semanticId(match[1]), constraints: { agent: semanticId(match[1]), destination: semanticId(match[2]) } };
  match = text.match(/^Why did ([a-z]+) get the ([a-z]+)$/iu);
  if (match) return { kind: 'event-cause', eventType: 'acquire', motivePredicate: 'condition',
    subject: semanticId(match[1]), constraints: { agent: semanticId(match[1]), theme: semanticId(match[2]) } };
  return undefined;
}

export function compileBabiCase(item) {
  requireCondition(item?.kind === 'qa', 'A bAbI QA case is required.');
  const state = { operations: [], lastSubjects: [], lastGroup: [], possessions: new Map() };
  const unsupportedStatements = [];
  for (const sentence of sentencesFromContext(item.context)) {
    if (!compileStatement(sentence, state)) unsupportedStatements.push(sentence);
  }
  const query = compileQuestion(item.text, state);
  const task = query ? Object.freeze({ schema: 'finite-episodic-world-task-v1',
      operations: Object.freeze(state.operations), query: Object.freeze(query),
      policy: Object.freeze({ policyId: 'policy:babi_train_visible_v1',
        inverseRelations: INVERSE_DIRECTIONS,
        relationVectors: RELATION_VECTORS,
        vectorQueryPolicy: 'axis-sign',
        transitiveRelations: Object.freeze(['bigger', 'fits']),
        inductionSelection: 'latest-member',
        motiveGoals: MOTIVE_GOALS }) }) : undefined;
  return Object.freeze({
    task,
    engineTask: task ? Object.freeze({ operation: 'execute-finite-episodic-world', episodicWorldTask: task }) : undefined,
    unsupportedStatements: Object.freeze(unsupportedStatements),
    unsupportedQuestion: query ? undefined : item.text,
  });
}

function normalizedBabiValues(item, values) {
  if (/^How many objects/iu.test(item.text)) return values;
  if (/^Is |^Does /u.test(item.text)) {
    return values.map((value) => ({ true: 'yes', false: 'no', unknown: 'maybe' })[value] ?? value);
  }
  return values;
}

function normalizedBabiOracle(item) {
  if (/^How many objects/iu.test(item.text)) return [COUNT_WORDS[item.answer] ?? item.answer];
  if (/^How do you go/iu.test(item.text)) return item.answer.split(',');
  if (/^What is [A-Z][a-z]+ carrying/iu.test(item.text)) {
    return item.answer === 'nothing' ? [] : item.answer.split(',').map(semanticId);
  }
  return [semanticId(item.answer)];
}

export function scoreBabiEpisodicCases(cases, options = {}) {
  const results = [];
  let proofValid = 0;
  for (const item of cases) {
    const compiled = compileBabiCase(item);
    const result = compiled.task ? executeEpisodicWorldTask(compiled.task)
      : { status: 'UNPARSED', values: [], evidence: [] };
    const verified = compiled.task ? verifyEpisodicWorldResult(compiled.task, result) : false;
    if (verified) proofValid += 1;
    const values = normalizedBabiValues(item, result.values ?? []);
    const oracle = normalizedBabiOracle(item);
    const pass = JSON.stringify([...values].toSorted()) === JSON.stringify([...oracle].toSorted()) && verified;
    if (options.retainAllResults !== false || !pass) {
      results.push({ id: item.id, task: item.metadata.task, pass, status: result.status, values,
        oracle, witnessVerified: verified, unsupportedStatements: compiled.unsupportedStatements,
        unsupportedQuestion: compiled.unsupportedQuestion });
    }
  }
  const correct = results.filter((item) => item.pass).length;
  return Object.freeze({ protocol: 'finite-episodic-world-train-visible-v1', total: cases.length,
    correct: options.retainAllResults === false ? cases.length - results.length : correct,
    proofValid, agentNormalizations: 0, results: Object.freeze(results) });
}

export async function evaluateAllBabiTraining(options = {}) {
  const acquired = await acquireBenchmarkArchive(BLIMP_BABI_SOURCES.babi, options);
  const entries = tarEntries(acquired.bytes, acquired.source.id);
  const byTask = {};
  const failures = [];
  let total = 0;
  let correct = 0;
  let proofValid = 0;
  const fileDigests = {};
  for (const [taskText, stem] of Object.entries(BABI_ALL_TASK_FILES)) {
    const task = Number(taskText);
    const suffix = `/en-10k/${stem}_train.txt`;
    const matches = entries.filter((entry) => entry.name.endsWith(suffix));
    requireCondition(matches.length === 1, `${acquired.source.id}: expected exactly one ${suffix} entry.`);
    const entry = matches[0];
    const cases = parseBabiTask(textOf(entry, acquired.source.id), { split: 'train', task });
    const scored = scoreBabiEpisodicCases(cases, { retainAllResults: false });
    total += scored.total;
    correct += scored.correct;
    proofValid += scored.proofValid;
    failures.push(...scored.results.slice(0, options.maxFailuresPerTask ?? 25));
    fileDigests[String(task)] = sha256(entry.bytes);
    byTask[String(task)] = Object.freeze({ total: scored.total, correct: scored.correct,
      proofValid: scored.proofValid, accuracy: scored.total ? scored.correct / scored.total : 0,
      retainedFailures: scored.results.length });
  }
  return Object.freeze({ format: 'eslm-babi-all-training-evaluation-v1', source: acquired.source,
    archive: Object.freeze({ path: acquired.path, bytes: acquired.byteLength, sha256: acquired.sha256 }),
    visibility: 'development-visible-official-training-only', protocol: 'finite-episodic-world-train-visible-v1',
    total, correct, proofValid, accuracy: total ? correct / total : 0, agentNormalizations: 0,
    byTask: Object.freeze(byTask), fileDigests: Object.freeze(fileDigests), failures: Object.freeze(failures) });
}

export async function probeBabiArchive(options = {}) {
  const acquired = await acquireBenchmarkArchive(BLIMP_BABI_SOURCES.babi, options);
  const entries = tarEntries(acquired.bytes, acquired.source.id);
  const files = [];
  const sampledCases = [];
  const perTask = options.perTask ?? 25;
  for (const [taskText, stem] of Object.entries(BABI_TASK_FILES)) {
    const task = Number(taskText);
    const split = 'train';
    const suffix = `/en-10k/${stem}_${split}.txt`;
    const matches = entries.filter((entry) => entry.name.endsWith(suffix));
    requireCondition(matches.length === 1, `${acquired.source.id}: expected exactly one ${suffix} entry.`);
    const entry = matches[0];
    const cases = parseBabiTask(textOf(entry, acquired.source.id), { split, task });
    files.push({ path: entry.name, sha256: sha256(entry.bytes), cases: cases.length, task, split });
    sampledCases.push(...selectStable(cases, perTask, options.seed ?? 'eslm-babi-probe-v1'));
  }
  return {
    format: 'eslm-benchmark-source-probe-v1', source: acquired.source, archive: {
      path: acquired.path, bytes: acquired.byteLength, sha256: acquired.sha256, reused: acquired.reused,
    },
    validation: { files: files.length, cases: files.reduce((sum, file) => sum + file.cases, 0), filesDetail: files },
    sample: {
      policy: 'stable-hash-per-task-train-visible', seed: options.seed ?? 'eslm-babi-probe-v1',
      perTask, visibility: 'development-visible', cases: sampledCases,
    },
  };
}

export function scoreBlimpProbe(engine, cases) {
  const results = cases.map((item) => {
    const good = engine.score(item.good);
    const bad = engine.score(item.bad);
    return {
      id: item.id, pass: good.score > bad.score, tie: good.score === bad.score,
      scores: [good.score, bad.score],
    };
  });
  const correct = results.filter((item) => item.pass).length;
  return {
    protocol: 'blimp-full-sentence-symbolic-preference-v1', total: results.length, correct,
    accuracy: results.length ? correct / results.length : 0,
    ties: results.filter((item) => item.tie).length,
    languageRoute: 'direct-symbolic-grammar-score', agentNormalizations: 0, results,
  };
}

export function scoreBlimpFeatureProbe(cases, featureProfile) {
  requireCondition(Array.isArray(cases), 'BLiMP feature probe cases must be an array.');
  const results = cases.map((item) => {
    requireCondition(item?.kind === 'preference', 'Every BLiMP feature probe case must be a preference pair.');
    const comparison = compareEnglishAcceptability(item.good, item.bad, featureProfile);
    return Object.freeze({
      id: item.id,
      paradigm: item.metadata.paradigm,
      pass: comparison.preferred === 0,
      tie: comparison.preferred === null,
      preferred: comparison.preferred,
      contrast: comparison.contrast,
      scores: Object.freeze(comparison.analyses.map((analysis) => analysis.score)),
      violations: Object.freeze(comparison.analyses.map((analysis) => analysis.violations)),
    });
  });
  const correct = results.filter((item) => item.pass).length;
  const ties = results.filter((item) => item.tie).length;
  return Object.freeze({
    protocol: 'blimp-feature-acceptability-preference-v1',
    total: results.length,
    correct,
    accuracy: results.length ? correct / results.length : 0,
    ties,
    reverse: results.length - correct - ties,
    languageRoute: 'direct-declarative-feature-grammar',
    agentNormalizations: 0,
    results: Object.freeze(results),
  });
}

export async function scoreBabiProbe(engine, cases) {
  const results = [];
  for (const item of cases) {
    const result = await engine.ask(`${item.context} ${item.text}`);
    const pass = JSON.stringify([...(result.values ?? [])].sort()) === JSON.stringify([...item.values].sort());
    results.push({
      id: item.id, task: item.metadata.task, pass, status: result.status,
      values: result.values ?? [], unsupportedStatements: result.episode?.unsupportedStatements?.length ?? 0,
    });
  }
  const correct = results.filter((item) => item.pass).length;
  return {
    protocol: 'babi-direct-symbolic-semantic-values-v1', total: results.length, correct,
    accuracy: results.length ? correct / results.length : 0,
    unsupportedStatementCases: results.filter((item) => item.unsupportedStatements > 0).length,
    agentNormalizations: 0,
    byTask: Object.fromEntries(Object.keys(BABI_TASK_FILES).map((task) => {
      const selected = results.filter((item) => item.task === Number(task));
      const taskCorrect = selected.filter((item) => item.pass).length;
      return [task, { total: selected.length, correct: taskCorrect, accuracy: taskCorrect / selected.length }];
    })),
    results,
  };
}
