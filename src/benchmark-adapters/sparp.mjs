import { createReadStream } from 'node:fs';
import { hashFile, sha256 } from '../util.mjs';
import { STEPGAME_VECTOR_SYSTEM } from './stepgame.mjs';

export const SPARP_SOURCE = Object.freeze({
  family: 'SpaRC / SpaRP',
  version: '1.1.0',
  dataset: 'https://huggingface.co/datasets/UKPLab/sparp',
  datasetRevision: '2706ed464416758c67a09716ed0262c880ee6bdd',
  repository: 'https://github.com/UKPLab/acl2024-sparc-and-sparp',
  repositoryCommit: 'b4568a8030976941cb0037fb6399d48f893d8fa4',
  paper: 'https://aclanthology.org/2024.acl-long.261/',
  license: 'CC-BY-SA-4.0',
  codeLicense: 'Apache-2.0',
  citation: 'Rizvi, Zhu, and Gurevych, SpaRC and SpaRP, ACL 2024, DOI 10.18653/v1/2024.acl-long.261.',
});

export const SPARP_EXTENT_SYSTEM = Object.freeze({
  schema: 'typed-spatial-extent-system-v1',
  systemId: 'system:sparp-directional-extents-v1',
  dimensions: Object.freeze(['axis:horizontal', 'axis:vertical']),
  relations: Object.freeze([
    { id: 'right', dimension: 'axis:horizontal', polarity: 'positive', output: true },
    { id: 'left', dimension: 'axis:horizontal', polarity: 'negative', output: true },
    { id: 'above', dimension: 'axis:vertical', polarity: 'positive', output: true },
    { id: 'below', dimension: 'axis:vertical', polarity: 'negative', output: true },
  ]),
});

const QUALITATIVE_INVERSES = Object.freeze({
  left: 'right', right: 'left', above: 'below', below: 'above', front: 'behind', behind: 'front',
  near: 'near', far: 'far', dc: 'dc', ec: 'ec', po: 'po',
  tpp: 'tppi', tppi: 'tpp', ntpp: 'ntppi', ntppi: 'ntpp',
});
const DIRECTIONAL_RELATIONS = Object.freeze(['left', 'right', 'above', 'below', 'front', 'behind']);
const MEMBER_RELATIONS = Object.freeze(['tpp', 'ntpp']);
const HOLDER_RELATIONS = Object.freeze(['tppi', 'ntppi']);
const LIFTABLE_RELATIONS = Object.freeze([...DIRECTIONAL_RELATIONS, 'far', 'dc']);

function qualitativeCompositionRules() {
  const rules = [];
  const add = (id, left, right, result) => rules.push(Object.freeze({ id, left, right, results: [result] }));
  for (const relation of DIRECTIONAL_RELATIONS) add(`transitive:${relation}`, relation, relation, relation);
  for (const left of MEMBER_RELATIONS) {
    for (const right of MEMBER_RELATIONS) add(`nested-member:${left}:${right}`, left, right, 'ntpp');
  }
  for (const left of HOLDER_RELATIONS) {
    for (const right of HOLDER_RELATIONS) add(`nested-holder:${left}:${right}`, left, right, 'ntppi');
  }
  for (const relation of LIFTABLE_RELATIONS) {
    for (const member of MEMBER_RELATIONS) add(`lift-member:${member}:${relation}`, member, relation, relation);
    for (const holder of HOLDER_RELATIONS) add(`lift-holder:${relation}:${holder}`, relation, holder, relation);
  }
  return Object.freeze(rules);
}

export const SPARP_QUALITATIVE_SYSTEM = Object.freeze({
  schema: 'declarative-qualitative-relation-system-v1',
  systemId: 'system:sparp-qualitative-spatial-v1',
  relations: Object.freeze(Object.entries(QUALITATIVE_INVERSES).map(([id, inverse]) =>
    Object.freeze({ id, inverse, output: true }))),
  compositionRules: qualitativeCompositionRules(),
  exclusiveGroups: Object.freeze([
    Object.freeze(['left', 'right']), Object.freeze(['above', 'below']),
    Object.freeze(['front', 'behind']), Object.freeze(['near', 'far']),
    Object.freeze(['dc', 'ec', 'po', 'tpp', 'ntpp', 'tppi', 'ntppi']),
  ]),
  outputOrder: Object.freeze(Object.keys(QUALITATIVE_INVERSES)),
  provenance: Object.freeze({
    source: 'SpaRC/SpaRP ACL 2024 Table 3 and development-visible SpaRP PS1 symbolic reasoning',
    policy: 'inverse-symmetry-direction-transitivity-containment-composition-and-selective-lifting',
  }),
});

const REQUIRED_FIELDS = Object.freeze([
  'canary', 'comments', 'commonsense_question', 'context', 'context_id',
  'num_context_entities', 'num_hop', 'num_question_entities', 'question', 'question_id', 'question_type',
  'reasoning', 'reasoning_types', 'source_data', 'spatial_types', 'symbolic_context', 'symbolic_entity_map',
  'symbolic_question', 'symbolic_reasoning', 'target_choices', 'target_scores', 'targets',
]);

const CONFIG_CONTRACTS = Object.freeze({
  ps1: Object.freeze({ sourceData: 'SpaRTUN', properties: ['extended-object', 'relation-incomplete', 'unquantified'] }),
  ps2: Object.freeze({ sourceData: 'StepGame', properties: ['point-object', 'relation-complete', 'quantified'] }),
  ps3: Object.freeze({ sourceData: 'StepGame', properties: ['point-object', 'relation-complete', 'unquantified'] }),
  ps4: Object.freeze({ sourceData: 'StepGame', properties: ['extended-object', 'relation-complete', 'unquantified'] }),
});

const VECTOR_RELATIONS = new Set(['left', 'right', 'above', 'below']);
const QUALITATIVE_RELATIONS = new Set(Object.keys(QUALITATIVE_INVERSES));
const VECTOR_BY_SET = new Map([
  ['left', 'left'], ['right', 'right'], ['above', 'above'], ['below', 'below'],
  ['above\u0000left', 'upper-left'], ['above\u0000right', 'upper-right'],
  ['below\u0000left', 'lower-left'], ['below\u0000right', 'lower-right'],
]);

function assertCondition(condition, message) {
  if (!condition) throw new Error(`Invalid SpaRP source: ${message}`);
}

function entityId(value) {
  assertCondition(typeof value === 'string' && value.length > 0 && value.length <= 256 && !value.includes('\0'),
    'a symbolic entity is malformed.');
  return `entity:${sha256(value.normalize('NFKC')).slice(0, 24)}`;
}

export async function* streamJsonArrayRecords(path) {
  const input = createReadStream(path, { encoding: 'utf8' });
  let started = false;
  let finished = false;
  let depth = 0;
  let inString = false;
  let escaped = false;
  let buffer = '';
  let row = 0;
  for await (const chunk of input) {
    for (const character of chunk) {
      if (finished) {
        assertCondition(/\s/u.test(character), `unexpected content after the array at character after row ${row}.`);
        continue;
      }
      if (!started) {
        if (/\s/u.test(character)) continue;
        assertCondition(character === '[', 'the source root must be a JSON array.');
        started = true;
        depth = 1;
        continue;
      }
      if (inString) {
        buffer += character;
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') {
        inString = true;
        buffer += character;
      } else if (character === '{' || character === '[') {
        depth += 1;
        buffer += character;
      } else if (character === '}' || character === ']') {
        if (character === ']' && depth === 1) {
          if (buffer.trim()) {
            row += 1;
            try { yield Object.freeze({ row, value: JSON.parse(buffer) }); }
            catch (error) { throw new Error(`Invalid SpaRP source: row ${row} is not JSON: ${error.message}`); }
          }
          buffer = '';
          depth = 0;
          finished = true;
        } else {
          depth -= 1;
          assertCondition(depth >= 1, `row ${row + 1} has unbalanced JSON delimiters.`);
          buffer += character;
        }
      } else if (character === ',' && depth === 1) {
        assertCondition(buffer.trim(), `row ${row + 1} is empty.`);
        row += 1;
        try { yield Object.freeze({ row, value: JSON.parse(buffer) }); }
        catch (error) { throw new Error(`Invalid SpaRP source: row ${row} is not JSON: ${error.message}`); }
        buffer = '';
      } else {
        buffer += character;
      }
    }
  }
  assertCondition(started && finished && !inString && depth === 0, 'the JSON array is incomplete.');
}

function parseJsonField(value, field, rowNumber, expected) {
  assertCondition(typeof value === 'string', `row ${rowNumber} field ${field} must be a JSON string.`);
  let parsed;
  try { parsed = JSON.parse(value); }
  catch (error) { throw new Error(`Invalid SpaRP source: row ${rowNumber} field ${field} is invalid JSON: ${error.message}`); }
  assertCondition(expected(parsed), `row ${rowNumber} field ${field} has the wrong shape.`);
  return parsed;
}

function inspectNonTaskJsonField(value, field, rowNumber, expected) {
  if (typeof value !== 'string') return Object.freeze({ field, status: 'NOT_TEXT' });
  try {
    const parsed = JSON.parse(value);
    return expected(parsed) ? undefined : Object.freeze({ field, status: 'WRONG_JSON_SHAPE' });
  } catch {
    return Object.freeze({ field, status: 'NONSTANDARD_JSON', rowNumber });
  }
}

function validateRecord(record, options) {
  const { config, split, rowNumber } = options;
  const contract = CONFIG_CONTRACTS[config];
  assertCondition(contract, `row ${rowNumber} uses unknown configuration ${config}.`);
  assertCondition(['train', 'validation', 'test'].includes(split), `row ${rowNumber} uses unknown split ${split}.`);
  assertCondition(record && typeof record === 'object' && !Array.isArray(record), `row ${rowNumber} is not an object.`);
  const keys = Object.keys(record);
  const missing = REQUIRED_FIELDS.filter((field) => !keys.includes(field));
  const unexpected = keys.filter((field) => !REQUIRED_FIELDS.includes(field) && field !== 'instruction');
  assertCondition(missing.length === 0 && unexpected.length === 0,
    `row ${rowNumber} has unexpected or missing fields.`);
  for (const field of ['context', 'question', 'reasoning', 'source_data', 'symbolic_context',
    'symbolic_entity_map', 'symbolic_reasoning', 'commonsense_question', 'canary']) {
    assertCondition(typeof record[field] === 'string' && !record[field].includes('\0'),
      `row ${rowNumber} field ${field} must be NUL-free text.`);
  }
  if (Object.hasOwn(record, 'instruction')) {
    assertCondition(typeof record.instruction === 'string' && !record.instruction.includes('\0'),
      `row ${rowNumber} field instruction must be NUL-free text.`);
  }
  assertCondition(record.source_data === contract.sourceData,
    `row ${rowNumber} source_data does not match configuration ${config}.`);
  assertCondition(record.question_type === 'FR', `row ${rowNumber} has unsupported question_type.`);
  for (const field of ['num_context_entities', 'num_question_entities', 'question_id', 'num_hop']) {
    assertCondition(Number.isInteger(record[field]) && record[field] >= 0,
      `row ${rowNumber} field ${field} must be a non-negative integer.`);
  }
  assertCondition(typeof record.context_id === 'string' || Number.isInteger(record.context_id),
    `row ${rowNumber} context_id has an invalid type.`);
  for (const field of ['targets', 'target_choices', 'target_scores', 'reasoning_types', 'spatial_types', 'comments']) {
    assertCondition(Array.isArray(record[field]), `row ${rowNumber} field ${field} must be an array.`);
  }
  assertCondition(record.target_choices.every((value) => typeof value === 'string')
    && new Set(record.target_choices).size === record.target_choices.length,
  `row ${rowNumber} target_choices must be unique strings.`);
  assertCondition(record.targets.every((value) => record.target_choices.includes(value)),
    `row ${rowNumber} targets contain a value outside target_choices.`);
  assertCondition(record.target_scores.length === record.target_choices.length
    && record.target_scores.every((value) => value === 0 || value === 1),
  `row ${rowNumber} target_scores must be a binary vector over target_choices.`);
  const scored = record.target_choices.filter((_, index) => record.target_scores[index] === 1).sort();
  assertCondition(JSON.stringify(scored) === JSON.stringify([...record.targets].sort()),
    `row ${rowNumber} targets disagree with target_scores.`);
  assertCondition(record.reasoning_types.every((value) => typeof value === 'string')
    && record.spatial_types.every((value) => typeof value === 'string')
    && record.comments.every((value) => typeof value === 'string'),
  `row ${rowNumber} metadata arrays must contain strings.`);
  const symbolicContext = parseJsonField(record.symbolic_context, 'symbolic_context', rowNumber,
    (value) => value && typeof value === 'object' && !Array.isArray(value));
  const sourceIssues = [
    inspectNonTaskJsonField(record.symbolic_entity_map, 'symbolic_entity_map', rowNumber,
      (value) => value && typeof value === 'object' && !Array.isArray(value)),
    inspectNonTaskJsonField(record.symbolic_reasoning, 'symbolic_reasoning', rowNumber, Array.isArray),
  ].filter(Boolean);
  assertCondition(Array.isArray(record.symbolic_question) && record.symbolic_question.length === 2
    && record.symbolic_question.every((value) => typeof value === 'string'),
  `row ${rowNumber} symbolic_question must contain two entity strings.`);
  return Object.freeze({ contract, symbolicContext, sourceIssues: Object.freeze(sourceIssues) });
}

function vectorTask(symbolicContext, symbolicQuestion, rowNumber) {
  const facts = [];
  const unsupportedRelations = new Set();
  for (const [edge, rawRelations] of Object.entries(symbolicContext)) {
    const match = edge.match(/^(.{1,256})-->(.{1,256})$/u);
    assertCondition(match, `row ${rowNumber} has an invalid symbolic edge key.`);
    assertCondition(Array.isArray(rawRelations) && rawRelations.length > 0
      && rawRelations.every((value) => typeof value === 'string'),
    `row ${rowNumber} symbolic edge ${edge} requires relation strings.`);
    for (const relation of rawRelations) if (!VECTOR_RELATIONS.has(relation)) unsupportedRelations.add(relation);
    const supported = [...new Set(rawRelations.filter((relation) => VECTOR_RELATIONS.has(relation)))].sort();
    if (supported.length === 0) continue;
    const relation = VECTOR_BY_SET.get(supported.join('\u0000'));
    if (!relation) {
      unsupportedRelations.add(`combination:${supported.join('+')}`);
      continue;
    }
    facts.push(Object.freeze({
      id: `fact:${rowNumber}:${facts.length}`,
      subject: entityId(match[1]),
      relation,
      object: entityId(match[2]),
      source: Object.freeze({ sourceEdge: edge, sourceRelations: Object.freeze([...rawRelations]) }),
    }));
  }
  return Object.freeze({
    task: Object.freeze({
      schema: 'typed-spatial-vector-task-v1',
      systemId: STEPGAME_VECTOR_SYSTEM.systemId,
      facts: Object.freeze(facts),
      query: Object.freeze({ subject: entityId(symbolicQuestion[0]), object: entityId(symbolicQuestion[1]) }),
      maxDepth: 64,
    }),
    unsupportedRelations: Object.freeze([...unsupportedRelations].sort()),
  });
}

function extentTask(symbolicContext, symbolicQuestion, rowNumber) {
  const facts = [];
  const unsupportedRelations = new Set();
  for (const [edge, rawRelations] of Object.entries(symbolicContext)) {
    const match = edge.match(/^(.{1,256})-->(.{1,256})$/u);
    assertCondition(match, `row ${rowNumber} has an invalid symbolic edge key.`);
    assertCondition(Array.isArray(rawRelations) && rawRelations.length > 0
      && rawRelations.every((value) => typeof value === 'string'),
    `row ${rowNumber} symbolic edge ${edge} requires relation strings.`);
    for (const relation of rawRelations) if (!VECTOR_RELATIONS.has(relation)) unsupportedRelations.add(relation);
    const supported = [...new Set(rawRelations.filter((relation) => VECTOR_RELATIONS.has(relation)))].sort();
    if (supported.length === 0) continue;
    facts.push(Object.freeze({
      id: `fact:${rowNumber}:${facts.length}`,
      subject: entityId(match[1]),
      object: entityId(match[2]),
      relations: Object.freeze(supported),
      source: Object.freeze({ sourceEdge: edge, sourceRelations: Object.freeze([...rawRelations]) }),
    }));
  }
  return Object.freeze({
    task: Object.freeze({
      schema: 'typed-spatial-extent-task-v1',
      systemId: SPARP_EXTENT_SYSTEM.systemId,
      facts: Object.freeze(facts),
      query: Object.freeze({ subject: entityId(symbolicQuestion[0]), object: entityId(symbolicQuestion[1]) }),
      orthogonalPolicy: 'overlap-unmentioned-dimensions',
    }),
    unsupportedRelations: Object.freeze([...unsupportedRelations].sort()),
  });
}

function qualitativeTask(symbolicContext, symbolicQuestion, rowNumber) {
  const facts = [];
  const unsupportedRelations = new Set();
  for (const [edge, rawRelations] of Object.entries(symbolicContext)) {
    const match = edge.match(/^(.{1,256})-->(.{1,256})$/u);
    assertCondition(match, `row ${rowNumber} has an invalid symbolic edge key.`);
    assertCondition(Array.isArray(rawRelations) && rawRelations.length > 0
      && rawRelations.every((value) => typeof value === 'string'),
    `row ${rowNumber} symbolic edge ${edge} requires relation strings.`);
    for (const relation of rawRelations) {
      if (!QUALITATIVE_RELATIONS.has(relation)) {
        unsupportedRelations.add(relation);
        continue;
      }
      facts.push(Object.freeze({
        id: `fact:${rowNumber}:${facts.length}`,
        subject: entityId(match[1]),
        relation,
        object: entityId(match[2]),
        source: Object.freeze({ sourceEdge: edge, sourceRelation: relation }),
      }));
    }
  }
  return Object.freeze({
    task: Object.freeze({
      schema: 'qualitative-relation-task-v1',
      systemId: SPARP_QUALITATIVE_SYSTEM.systemId,
      facts: Object.freeze(facts),
      query: Object.freeze({ subject: entityId(symbolicQuestion[0]), object: entityId(symbolicQuestion[1]) }),
    }),
    unsupportedRelations: Object.freeze([...unsupportedRelations].sort()),
  });
}

export function adaptSpaRpRecord(record, options) {
  const { config, split, rowNumber } = options;
  const validated = validateRecord(record, options);
  const compiled = vectorTask(validated.symbolicContext, record.symbolic_question, rowNumber);
  const extent = config === 'ps4'
    ? extentTask(validated.symbolicContext, record.symbolic_question, rowNumber)
    : undefined;
  const qualitative = config === 'ps1'
    ? qualitativeTask(validated.symbolicContext, record.symbolic_question, rowNumber)
    : undefined;
  const caseId = `sparp:${config}:${split}:${sha256(`${record.context_id}\u0000${record.question_id}`).slice(0, 20)}`;
  const methodState = (config === 'ps1' && qualitative.unsupportedRelations.length === 0)
    || (['ps2', 'ps3'].includes(config) && compiled.unsupportedRelations.length === 0)
    || (config === 'ps4' && extent.unsupportedRelations.length === 0)
    ? 'direct-symbolic-executable'
    : 'no-complete-registered-method';
  const operation = config === 'ps1' ? 'qualitative-spatial-relations'
    : config === 'ps4' ? 'spatial-extent-relations' : 'spatial-vector-relation';
  const route = config === 'ps1' ? 'source-symbolic-context-to-qualitative-closure-task'
    : config === 'ps4' ? 'source-symbolic-context-to-extent-inequality-task'
      : 'source-symbolic-context-to-direct-symbolic-task';
  return Object.freeze({
    visible: Object.freeze({
      caseId,
      config,
      split,
      sourceData: record.source_data,
      properties: Object.freeze([...validated.contract.properties]),
      context: record.context,
      question: record.question,
      hop: record.num_hop,
      answerDomain: Object.freeze([...record.target_choices]),
      methodState,
      unsupportedRelations: qualitative?.unsupportedRelations ?? compiled.unsupportedRelations,
      sourceIssues: validated.sourceIssues,
      taskFrame: Object.freeze({
        schema: 'benchmark-task-frame-v1',
        operation,
        route,
        ...(config === 'ps1'
          ? { qualitativeSystem: SPARP_QUALITATIVE_SYSTEM, qualitativeTask: qualitative.task }
          : config === 'ps4'
          ? { extentSystem: SPARP_EXTENT_SYSTEM, extentTask: extent.task }
          : {
            vectorSystem: STEPGAME_VECTOR_SYSTEM,
            relationTask: Object.freeze({
              ...compiled.task,
              compositionPolicy: config === 'ps3' ? 'invalidate-opposed-steps' : 'exact-integer',
            }),
          }),
      }),
    }),
    oracle: Object.freeze({ caseId, expectedRelations: Object.freeze([...record.targets].sort()) }),
  });
}

export async function inspectSpaRpJsonFile(path, options) {
  const { config, split, includeOracle = false, onCase } = options;
  const counts = {
    rows: 0, directSymbolicExecutable: 0, noCompleteMethod: 0, symbolicFacts: 0,
    byHop: {}, byTargetCount: {}, unsupportedRelations: {}, sourceIssues: {},
  };
  const seenCases = new Set();
  for await (const { row, value } of streamJsonArrayRecords(path)) {
    const adapted = adaptSpaRpRecord(value, { config, split, rowNumber: row });
    assertCondition(!seenCases.has(adapted.visible.caseId), `duplicate case identifier ${adapted.visible.caseId}.`);
    seenCases.add(adapted.visible.caseId);
    counts.rows += 1;
    counts.symbolicFacts += (adapted.visible.taskFrame.relationTask
      ?? adapted.visible.taskFrame.extentTask
      ?? adapted.visible.taskFrame.qualitativeTask).facts.length;
    if (adapted.visible.methodState === 'direct-symbolic-executable') counts.directSymbolicExecutable += 1;
    else counts.noCompleteMethod += 1;
    counts.byHop[adapted.visible.hop] = (counts.byHop[adapted.visible.hop] ?? 0) + 1;
    if (includeOracle) {
      const targetCount = adapted.oracle.expectedRelations.length;
      counts.byTargetCount[targetCount] = (counts.byTargetCount[targetCount] ?? 0) + 1;
    }
    for (const relation of adapted.visible.unsupportedRelations) {
      counts.unsupportedRelations[relation] = (counts.unsupportedRelations[relation] ?? 0) + 1;
    }
    for (const issue of adapted.visible.sourceIssues) {
      const key = `${issue.field}:${issue.status}`;
      counts.sourceIssues[key] = (counts.sourceIssues[key] ?? 0) + 1;
    }
    if (onCase) await onCase(adapted.visible, includeOracle ? adapted.oracle : undefined);
  }
  const { stat } = await import('node:fs/promises');
  const metadata = await stat(path);
  return Object.freeze({
    schema: 'sparp-source-inspection-v1',
    config,
    split,
    source: Object.freeze({ path, bytes: metadata.size, sha256: await hashFile(path) }),
    counts: Object.freeze({
      ...counts,
      byHop: Object.freeze(counts.byHop),
      byTargetCount: Object.freeze(counts.byTargetCount),
      unsupportedRelations: Object.freeze(counts.unsupportedRelations),
      sourceIssues: Object.freeze(counts.sourceIssues),
    }),
    leakagePolicy: Object.freeze({
      visible: 'context, question, source symbolic context, source properties, answer domain, and label-free task',
      oracle: 'targets, target_scores, textual reasoning, and symbolic reasoning remain host-only',
      languageAgentInvocations: 0,
    }),
  });
}

export function spatialVectorValuesToSpaRpTargets(values) {
  const mapping = {
    left: ['left'], right: ['right'], above: ['above'], below: ['below'], overlap: ['overlapping'],
    'upper-left': ['above', 'left'], 'upper-right': ['above', 'right'],
    'lower-left': ['below', 'left'], 'lower-right': ['below', 'right'],
  };
  return Object.freeze([...new Set((values ?? []).flatMap((value) => mapping[value] ?? []))].sort());
}

export function qualitativeValuesToSpaRpTargets(values) {
  const mapping = {
    left: 'left', right: 'right', above: 'above', below: 'below', behind: 'behind', front: 'in front',
    near: 'near', far: 'far', dc: 'outside', ec: 'outside and touching', po: 'partially overlapping',
    tpp: 'inside and touching', ntpp: 'inside', tppi: 'contains and touches', ntppi: 'contains',
  };
  return Object.freeze([...new Set((values ?? []).flatMap((value) => mapping[value] ?? []))].sort());
}

export function scoreSpaRpTargets(prediction, oracle) {
  const predicted = [...new Set(prediction ?? [])].sort();
  const expected = [...oracle.expectedRelations].sort();
  const common = predicted.filter((value) => expected.includes(value)).length;
  const precision = predicted.length === 0 ? 0 : common / predicted.length;
  const recall = expected.length === 0 ? 0 : common / expected.length;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return Object.freeze({
    exact: JSON.stringify(predicted) === JSON.stringify(expected),
    predicted: Object.freeze(predicted),
    expected: Object.freeze(expected),
    precision,
    recall,
    f1,
  });
}
