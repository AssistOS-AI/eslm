import { readFile } from 'node:fs/promises';
import { hashFile, sha256 } from '../util.mjs';

export const CLUTRR_SOURCE = Object.freeze({
  family: 'CLUTRR',
  version: 'EMNLP-2019-paper-release',
  repository: 'https://github.com/facebookresearch/clutrr',
  repositoryCommit: 'd045fae289d3746503677ceed7631c999202501e',
  artifact: 'https://drive.google.com/file/d/1SEq_e1IVCDDzsBIBhoUQ5pOVH5kxRoZF/view',
  artifactSha256: 'b4029f68e555ba89dd5836d5f1d9049ca97fc54ed71ed880a5f5351f6c40228e',
  license: 'CC-BY-NC-4.0',
  redistribution: 'Do not promote or redistribute cached data outside the non-commercial license regime.',
});

const REQUIRED_COLUMNS = Object.freeze([
  'id', 'story', 'query', 'target', 'task_name', 'task_split', 'story_edges', 'edge_types', 'genders', 'node_mapping',
]);
const MAX_ROWS = 1_000_000;
const CLUTRR_ALGEBRA_ID = 'algebra:clutrr-family-v1';

const RELATION_FORMS = Object.freeze([
  ['daughter-in-law', 'daughter-in-law'], ['sister-in-law', 'sister-in-law'],
  ['mother-in-law', 'mother-in-law'], ['granddaughter', 'granddaughter'],
  ['grandmother', 'grandmother'], ['daughter', 'daughter'], ['mother', 'mother'],
  ['niece', 'niece'], ['aunt', 'aunt'], ['wife', 'wife'], ['sister', 'sister'],
  ['son-in-law', 'son-in-law'], ['brother-in-law', 'brother-in-law'],
  ['father-in-law', 'father-in-law'], ['grandson', 'grandson'], ['grandfather', 'grandfather'],
  ['son', 'son'], ['father', 'father'], ['nephew', 'nephew'], ['uncle', 'uncle'],
  ['husband', 'husband'], ['brother', 'brother'], ['mom', 'mother'], ['dad', 'father'],
]);

const RELATION_PATTERN = RELATION_FORMS.map(([surface]) => surface.replace(/-/gu, '[- ]'))
  .sort((left, right) => right.length - left.length).join('|');
const TARGET_SEX = Object.freeze({
  son: 'male', daughter: 'female', father: 'male', mother: 'female', husband: 'male', wife: 'female',
  brother: 'male', sister: 'female', grandson: 'male', granddaughter: 'female', grandfather: 'male',
  grandmother: 'female', 'son-in-law': 'male', 'daughter-in-law': 'female', 'father-in-law': 'male',
  'mother-in-law': 'female', 'brother-in-law': 'male', 'sister-in-law': 'female', nephew: 'male',
  niece: 'female', uncle: 'male', aunt: 'female',
});

function assertCondition(condition, message) {
  if (!condition) throw new Error(`Invalid CLUTRR source: ${message}`);
}

function parseCsvRows(text) {
  assertCondition(typeof text === 'string', 'CSV input must be a string.');
  assertCondition(!text.includes('\0'), 'CSV input contains a NUL byte.');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') {
      assertCondition(field.length === 0, `unexpected quote at character ${index}.`);
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/u, ''));
      if (row.some((value) => value.length > 0)) rows.push(row);
      assertCondition(rows.length <= MAX_ROWS + 1, `CSV input exceeds ${MAX_ROWS} data rows.`);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }
  assertCondition(!quoted, 'CSV input ends inside a quoted field.');
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/u, ''));
    if (row.some((value) => value.length > 0)) rows.push(row);
  }
  assertCondition(rows.length >= 2, 'CSV input needs a header and at least one data row.');
  return rows;
}

function recordsFromCsv(text) {
  const rows = parseCsvRows(text);
  const header = rows[0];
  assertCondition(new Set(header).size === header.length, 'CSV header contains duplicate columns.');
  for (const name of REQUIRED_COLUMNS) assertCondition(header.includes(name), `CSV header is missing ${name}.`);
  return rows.slice(1).map((values, index) => {
    assertCondition(
      values.length === header.length,
      `row ${index + 2} has ${values.length} fields; expected ${header.length}.`,
    );
    return Object.fromEntries(header.map((name, position) => [name || '__row', values[position]]));
  });
}

function parseQuery(value, rowNumber) {
  const match = value.match(/^\('([^'\r\n]+)',\s*'([^'\r\n]+)'\)$/u);
  assertCondition(match, `row ${rowNumber} has an unsafe or unsupported query tuple.`);
  for (const name of match.slice(1)) {
    assertCondition(/^[\p{L}\p{M}][\p{L}\p{M} .'-]{0,79}$/u.test(name), `row ${rowNumber} has an invalid entity name.`);
  }
  return { left: match[1], right: match[2], direction: 'right-relative-to-left' };
}

function parseIntegerPairs(value, rowNumber, field) {
  assertCondition(/^\[\s*(?:\(\s*\d+\s*,\s*\d+\s*\)\s*(?:,\s*\(\s*\d+\s*,\s*\d+\s*\)\s*)*)?\]$/u.test(value),
    `row ${rowNumber} has an invalid ${field} list.`);
  return [...value.matchAll(/\(\s*(\d+)\s*,\s*(\d+)\s*\)/gu)].map((match) => [Number(match[1]), Number(match[2])]);
}

function parseRelationList(value, rowNumber) {
  assertCondition(/^\[\s*(?:'[a-z][a-z-]{1,47}'\s*(?:,\s*'[a-z][a-z-]{1,47}'\s*)*)?\]$/u.test(value),
    `row ${rowNumber} has an invalid edge_types list.`);
  return [...value.matchAll(/'([a-z][a-z-]{1,47})'/gu)].map((match) => match[1]);
}

function parseNodeMapping(value, rowNumber) {
  assertCondition(/^\{\s*(?:\d+\s*:\s*\d+\s*(?:,\s*\d+\s*:\s*\d+\s*)*)?\}$/u.test(value),
    `row ${rowNumber} has an invalid node_mapping.`);
  return [...value.matchAll(/(\d+)\s*:\s*(\d+)/gu)].map((match) => ({ actor: Number(match[1]), node: Number(match[2]) }));
}

function parseGenderList(value, rowNumber) {
  if (!value) return [];
  const entries = value.split(',').map((part) => part.trim());
  const parsed = entries.map((entry) => entry.match(/^([\p{L}\p{M}][\p{L}\p{M} .'-]{0,79}):(male|female)$/u));
  assertCondition(parsed.every(Boolean), `row ${rowNumber} has an invalid genders list.`);
  return parsed.map((match) => ({ name: match[1], sex: match[2] }));
}

function runtimeStory(story) {
  return story.replace(/\[([^\]\r\n]+)\]/gu, '$1').replace(/\s+/gu, ' ').trim();
}

function entityId(name) {
  return `person:${sha256(name.normalize('NFKC').toLocaleLowerCase('en-US')).slice(0, 20)}`;
}

function normalizedRelation(surface) {
  const value = surface.toLocaleLowerCase('en-US').replace(/\s+/gu, '-');
  return RELATION_FORMS.find(([form]) => form === value)?.[1];
}

function relationTaskFromStory(story, query, recordId, maxDepth) {
  const facts = [];
  const features = [];
  const seenFacts = new Set();
  const seenFeatures = new Set();
  const knownSex = new Map();
  const addFeature = (name, value, source) => {
    if (!name || !value) return;
    const key = `${name}\u0000sex\u0000${value}`;
    if (seenFeatures.has(key)) return;
    seenFeatures.add(key);
    if (!knownSex.has(name)) knownSex.set(name, new Set());
    knownSex.get(name).add(value);
    features.push({ entity: entityId(name), facet: 'sex', value, source });
  };
  const addFact = (owner, relative, relation, source) => {
    if (!owner || !relative || owner === relative || !relation) return;
    const key = `${owner}\u0000${relation}\u0000${relative}`;
    if (seenFacts.has(key)) return;
    seenFacts.add(key);
    const id = `fact:${sha256(`${recordId}:${key}`).slice(0, 24)}`;
    facts.push({ id, subject: entityId(owner), relation, object: entityId(relative), source });
    addFeature(relative, TARGET_SEX[relation], id);
  };
  const text = story.normalize('NFKC').replace(/[’´]/gu, "'");
  const names = [...text.matchAll(/\[([^\]\r\n]+)\]/gu)].map((match) => ({
    name: match[1], start: match.index, end: match.index + match[0].length,
  }));
  const betweenHasName = (start, end) => names.some((name) => name.start >= start && name.end <= end);
  const antecedent = (position, sex, fallback) => names.filter((name) => name.end <= position
    && knownSex.get(name.name)?.has(sex)).at(-1)?.name ?? fallback;
  const relationRegex = new RegExp(`\\b(${RELATION_PATTERN})s?\\b`, 'giu');
  for (const match of text.matchAll(relationRegex)) {
    const relation = normalizedRelation(match[1]);
    if (!relation) continue;
    const relationStart = match.index;
    const relationEnd = relationStart + match[0].length;
    const previous = names.filter((name) => name.end <= relationStart).at(-1);
    const next = names.find((name) => name.start >= relationEnd);
    const after = text.slice(relationEnd, Math.min(text.length, relationEnd + 100));
    const before = text.slice(Math.max(0, relationStart - 100), relationStart);
    const ofMatch = after.match(/^\s+(?:of|to)\s+\[([^\]]+)\]/iu);
    if (ofMatch && previous && !betweenHasName(previous.end, relationStart)) {
      addFact(ofMatch[1], previous.name, relation, `surface:${relationStart}`);
      continue;
    }
    const nameAfter = after.match(/^[^.!?\[]*\[([^\]]+)\]/u);
    if (previous && next && nameAfter && !betweenHasName(previous.end, relationStart)) {
      const ownerCue = before.match(/\b(his|her)\b[^.!?\[]*$/iu)?.[1]?.toLocaleLowerCase('en-US');
      const ownerSex = ownerCue === 'his' ? 'male' : ownerCue === 'her' ? 'female' : undefined;
      const owner = ownerSex ? antecedent(relationStart, ownerSex, previous.name) : previous.name;
      addFact(owner, nameAfter[1], relation, `surface:${relationStart}`);
      if (ownerSex) addFeature(owner, ownerSex, `surface:${relationStart}`);
      continue;
    }
    const namedAfter = after.match(/^[.!?\s]*\b(?:his|her)\s+name\s+is\s+\[([^\]]+)\]/iu);
    if (previous && namedAfter) addFact(previous.name, namedAfter[1], relation, `surface:${relationStart}`);
  }
  const pairs = new RegExp('\\[([^\\]]+)\\]\\s+and\\s+(?:\\[([^\\]]+)\\]|(?:his|her)\\s+)?(?:older\\s+|younger\\s+)?(brothers|sisters)', 'giu');
  for (const match of text.matchAll(pairs)) {
    if (!match[2]) continue;
    const relation = match[3].toLocaleLowerCase('en-US') === 'brothers' ? 'brother' : 'sister';
    addFact(match[1], match[2], relation, `surface:${match.index}`);
    addFact(match[2], match[1], relation, `surface:${match.index}`);
  }
  const namedRelation = new RegExp(`\\[([^\\]]+)\\][^.!?]{0,80}\\b(${RELATION_PATTERN})\\b[.!?]\\s*(?:His|Her)\\s+name\\s+is\\s+\\[([^\\]]+)\\]`, 'giu');
  for (const match of text.matchAll(namedRelation)) {
    addFact(match[1], match[3], normalizedRelation(match[2]), `surface:${match.index}`);
  }
  const directMention = new RegExp(`\\[([^\\]]+)\\]([^.!?\\[]*?)\\b(${RELATION_PATTERN})\\b[^.!?\\[]*?\\[([^\\]]+)\\]`, 'giu');
  for (const match of text.matchAll(directMention)) {
    const cue = match[2].match(/\b(his|her)\b/iu)?.[1]?.toLocaleLowerCase('en-US');
    const sex = cue === 'his' ? 'male' : cue === 'her' ? 'female' : undefined;
    const owner = sex ? antecedent(match.index + match[0].indexOf(match[3]), sex, match[1]) : match[1];
    addFact(owner, match[4], normalizedRelation(match[3]), `surface:${match.index}`);
    if (sex) addFeature(owner, sex, `surface:${match.index}`);
  }
  const appositive = new RegExp(`\\[([^\\]]+)\\],\\s*(his|her)\\s+(?:favorite\\s+|lovely\\s+)?(${RELATION_PATTERN})\\b`, 'giu');
  for (const match of text.matchAll(appositive)) {
    const sex = match[2].toLocaleLowerCase('en-US') === 'his' ? 'male' : 'female';
    const owner = antecedent(match.index, sex, names.filter((name) => name.end <= match.index).at(-1)?.name);
    addFact(owner, match[1], normalizedRelation(match[3]), `surface:${match.index}`);
    addFeature(owner, sex, `surface:${match.index}`);
  }
  const groupGrandparent = /\[([^\]]+)\]\s+and\s+\[([^\]]+)\][^.!?]*?\b(brothers|sisters|siblings)\b\.\s*\[([^\]]+)\]\s+is\s+(father|mother)\s+of\s+their\s+(father|mother)/giu;
  for (const match of text.matchAll(groupGrandparent)) {
    const groupRelation = match[3].toLocaleLowerCase('en-US') === 'sisters' ? 'sister' : 'brother';
    addFact(match[1], match[2], groupRelation, `surface:${match.index}`);
    addFact(match[2], match[1], groupRelation, `surface:${match.index}`);
    const intermediate = `implicit:${sha256(`${recordId}:${match.index}:shared-parent`).slice(0, 20)}`;
    const parentRelation = match[6].toLocaleLowerCase('en-US');
    addFact(match[1], intermediate, parentRelation, `surface:${match.index}`);
    addFact(match[2], intermediate, parentRelation, `surface:${match.index}`);
    addFact(intermediate, match[4], match[5].toLocaleLowerCase('en-US'), `surface:${match.index}`);
  }
  return Object.freeze({
    schema: 'typed-relation-task-v1', algebraId: CLUTRR_ALGEBRA_ID,
    facts: Object.freeze(facts), features: Object.freeze(features),
    query: Object.freeze({ subject: entityId(query.left), object: entityId(query.right) }),
    maxDepth: Math.min(32, Math.max(1, maxDepth)),
  });
}

function relationTaskFromStructuredRecord(record, query, rowNumber, maxDepth) {
  const edges = parseIntegerPairs(record.story_edges, rowNumber, 'story_edges');
  const relations = parseRelationList(record.edge_types, rowNumber);
  const mapping = parseNodeMapping(record.node_mapping, rowNumber);
  const genders = parseGenderList(record.genders, rowNumber);
  assertCondition(edges.length === relations.length, `row ${rowNumber} has different edge and relation counts.`);
  assertCondition(mapping.length === genders.length, `row ${rowNumber} has different node and gender counts.`);
  const namesByNode = new Map(mapping.map((entry, index) => [entry.node, genders[index].name]));
  assertCondition(namesByNode.size === mapping.length, `row ${rowNumber} maps more than one actor to a graph node.`);
  const facts = edges.map(([subjectNode, objectNode], index) => {
    const subject = namesByNode.get(subjectNode);
    const object = namesByNode.get(objectNode);
    assertCondition(subject && object, `row ${rowNumber} has an edge with an unmapped node.`);
    return Object.freeze({
      id: `fact:${sha256(`${record.id}:${index}:${subjectNode}:${objectNode}:${relations[index]}`).slice(0, 24)}`,
      subject: entityId(subject), relation: relations[index], object: entityId(object),
      source: `source-edge:${index}`,
    });
  });
  assertCondition(namesByNode.size <= 10_000 && facts.length <= 10_000, `row ${rowNumber} exceeds relation task budgets.`);
  return Object.freeze({
    schema: 'typed-relation-task-v1', algebraId: CLUTRR_ALGEBRA_ID,
    facts: Object.freeze(facts),
    features: Object.freeze(genders.map((entry, index) => Object.freeze({
      entity: entityId(entry.name), facet: 'sex', value: entry.sex, source: `source-gender:${index}`,
    }))),
    query: Object.freeze({ subject: entityId(query.left), object: entityId(query.right) }),
    maxDepth: Math.min(32, Math.max(1, maxDepth)),
  });
}

function sourceRowToCase(record, datasetId, declaredSplit, rowNumber) {
  assertCondition(/^[a-z0-9][a-z0-9._-]{1,127}$/iu.test(record.id), `row ${rowNumber} has an invalid id.`);
  assertCondition(record.story.length > 0 && record.story.length <= 100_000, `row ${rowNumber} has an invalid story.`);
  assertCondition(/^[a-z][a-z-]{1,47}$/u.test(record.target), `row ${rowNumber} has an invalid target relation.`);
  assertCondition(/^task_\d+\.\d+$/u.test(record.task_name), `row ${rowNumber} has an invalid task_name.`);
  assertCondition(
    record.task_split === declaredSplit,
    `row ${rowNumber} declares split ${record.task_split}, not ${declaredSplit}.`,
  );
  const query = parseQuery(record.query, rowNumber);
  assertCondition(record.story.includes(`[${query.left}]`) && record.story.includes(`[${query.right}]`),
    `row ${rowNumber} query entities are not both present in the story.`);
  const taskParts = record.task_name.match(/^task_(\d+)\.(\d+)$/u);
  const id = `clutrr:${datasetId}:${declaredSplit}:${record.id}`;
  const context = runtimeStory(record.story);
  return {
    visible: Object.freeze({
      format: 'eslm-benchmark-case-v1',
      id,
      family: 'clutrr',
      split: declaredSplit,
      kind: 'relation-classification',
      context,
      text: `What is ${query.right}'s relationship to ${query.left}?`,
      query,
      taskFrame: Object.freeze({
        operation: 'classify-typed-relation',
        relationTask: relationTaskFromStructuredRecord(record, query, rowNumber, Number(taskParts[2]) + 2),
      }),
      metadata: Object.freeze({
        sourceRecordId: record.id,
        taskName: record.task_name,
        taskVariant: Number(taskParts[1]),
        relationDepth: Number(taskParts[2]),
      }),
    }),
    oracle: Object.freeze({ id, expectedRelation: record.target }),
  };
}

export function extractClutrrRelationTask(story, query, options = {}) {
  assertCondition(typeof story === 'string' && story.length > 0, 'story must be non-empty.');
  assertCondition(query && typeof query.left === 'string' && typeof query.right === 'string', 'query endpoints are required.');
  return relationTaskFromStory(story, query, options.recordId ?? 'operator', options.maxDepth ?? 12);
}

function takeStratified(items, limit, seed) {
  if (limit === undefined || limit >= items.length) return items;
  assertCondition(Number.isInteger(limit) && limit > 0, 'sample limit must be a positive integer.');
  const groups = new Map();
  for (const item of items) {
    const key = item.visible.metadata.taskName;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  for (const group of groups.values()) {
    group.sort((left, right) => sha256(`${seed}:${left.visible.id}`)
      .localeCompare(sha256(`${seed}:${right.visible.id}`)));
  }
  const selected = [];
  const keys = [...groups.keys()].sort();
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

export function adaptClutrrCsv(text, options = {}) {
  const datasetId = options.datasetId ?? 'emnlp-2019';
  const split = options.split ?? 'test';
  assertCondition(/^[a-z0-9][a-z0-9._-]{1,127}$/u.test(datasetId), 'datasetId is invalid.');
  assertCondition(['train', 'dev', 'test'].includes(split), 'split must be train, dev, or test.');
  const all = recordsFromCsv(text).map((record, index) => sourceRowToCase(record, datasetId, split, index + 2));
  const selected = takeStratified(all, options.limit, options.seed ?? 'eslm-clutrr-v1');
  const strata = Object.fromEntries([...new Set(selected.map((item) => item.visible.metadata.taskName))].sort()
    .map((name) => [name, selected.filter((item) => item.visible.metadata.taskName === name).length]));
  return Object.freeze({
    format: 'eslm-adapted-benchmark-v1',
    family: 'clutrr',
    datasetId,
    split,
    sourceRows: all.length,
    selectedRows: selected.length,
    strata: Object.freeze(strata),
    pool: Object.freeze(selected.map((item) => item.visible)),
    oracle: Object.freeze(selected.map((item) => item.oracle)),
    leakagePolicy: Object.freeze({
      pool: split === 'train' ? 'training-visible' : split === 'dev' ? 'development-visible' : 'evaluation-visible',
      oracle: 'host-scorer-only; omit from coding-agent packets',
    }),
  });
}

export function scoreClutrrRelation(prediction, oracle) {
  assertCondition(typeof oracle?.expectedRelation === 'string', 'oracle expectedRelation is required.');
  const actual = String(prediction ?? '').normalize('NFKC').toLocaleLowerCase('en-US').trim();
  const expected = oracle.expectedRelation.normalize('NFKC').toLocaleLowerCase('en-US').trim();
  return Object.freeze({ pass: actual === expected, actual, expected });
}

export async function probeClutrrCsv(path, options = {}) {
  const text = await readFile(path, 'utf8');
  const adapted = adaptClutrrCsv(text, options);
  return Object.freeze({
    ...adapted,
    sourceFile: Object.freeze({ path, bytes: Buffer.byteLength(text, 'utf8'), sha256: await hashFile(path) }),
  });
}
