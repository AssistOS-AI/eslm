import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { hashFile, sha256 } from '../util.mjs';

export const STEPGAME_SOURCE = Object.freeze({
  family: 'StepGame',
  version: 'Hugging-Face-corrected-2024-03-04',
  repository: 'https://github.com/ShiZhengyan/StepGame',
  repositoryCommit: '5e6aff1563a6d7f46ee1f1aeff98b94e68c29005',
  dataset: 'https://huggingface.co/datasets/ZhengyanShi/StepGame',
  datasetRevision: '6d859381dfd518cae3f073b268aaa323bf4dcf04',
  generatorSha256: 'c9ff684b7674a2c8c11af6d584619c24786d704d6eaa031d28d50e3983db0c02',
  license: 'MIT',
  citation: 'Shi, Zhang, and Lipani, StepGame, AAAI 2022, DOI 10.1609/aaai.v36i10.21383.',
});

export const STEPGAME_VECTOR_SYSTEM = Object.freeze({
  schema: 'typed-spatial-vector-system-v1',
  systemId: 'system:stepgame-cardinal-plane-v1',
  dimensions: Object.freeze(['axis:horizontal', 'axis:vertical']),
  relations: Object.freeze([
    { id: 'left', vector: [-1, 0], output: true },
    { id: 'right', vector: [1, 0], output: true },
    { id: 'above', vector: [0, 1], output: true },
    { id: 'below', vector: [0, -1], output: true },
    { id: 'upper-left', vector: [-1, 1], output: true },
    { id: 'upper-right', vector: [1, 1], output: true },
    { id: 'lower-left', vector: [-1, -1], output: true },
    { id: 'lower-right', vector: [1, -1], output: true },
    { id: 'overlap', vector: [0, 0], output: true },
  ]),
});

const FUNCTION_CONTRACTS = Object.freeze({
  object1_left_object2: Object.freeze({ relation: 'left', subjectPlaceholder: 'AA' }),
  object1_right_object2: Object.freeze({ relation: 'right', subjectPlaceholder: 'BB' }),
  object1_over_object2: Object.freeze({ relation: 'above', subjectPlaceholder: 'AA' }),
  object1_below_object2: Object.freeze({ relation: 'below', subjectPlaceholder: 'BB' }),
  object1_lowerleft_object2: Object.freeze({ relation: 'lower-left', subjectPlaceholder: 'AA' }),
  object1_upright_object2: Object.freeze({ relation: 'upper-right', subjectPlaceholder: 'BB' }),
  object1_lowerright_object2: Object.freeze({ relation: 'lower-right', subjectPlaceholder: 'AA' }),
  object1_upleft_object2: Object.freeze({ relation: 'upper-left', subjectPlaceholder: 'BB' }),
});

const ANSWER_DOMAIN = new Set(STEPGAME_VECTOR_SYSTEM.relations.map((relation) => relation.id));

function assertCondition(condition, message) {
  if (!condition) throw new Error(`Invalid StepGame source: ${message}`);
}

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function templatePattern(template, subjectPlaceholder) {
  const objectPlaceholder = subjectPlaceholder === 'AA' ? 'BB' : 'AA';
  let subjectSeen = false;
  let objectSeen = false;
  let cursor = 0;
  let expression = '^';
  for (const match of template.matchAll(/AA|BB/gu)) {
    expression += escapePattern(template.slice(cursor, match.index));
    if (match[0] === subjectPlaceholder) {
      expression += subjectSeen ? '\\k<subject>' : '(?<subject>[A-Z])';
      subjectSeen = true;
    } else if (match[0] === objectPlaceholder) {
      expression += objectSeen ? '\\k<object>' : '(?<object>[A-Z])';
      objectSeen = true;
    }
    cursor = match.index + 2;
  }
  expression += `${escapePattern(template.slice(cursor))}$`;
  if (!subjectSeen || !objectSeen) return undefined;
  return new RegExp(expression, 'u');
}

export function compileStepGameTemplateCatalog(generatorSource) {
  assertCondition(typeof generatorSource === 'string' && !generatorSource.includes('\0'),
    'the generator template source must be NUL-free text.');
  const patterns = [];
  const unsupportedTemplates = [];
  for (const [functionName, contract] of Object.entries(FUNCTION_CONTRACTS)) {
    const start = generatorSource.indexOf(`def ${functionName}(`);
    assertCondition(start >= 0, `generator function ${functionName} is missing.`);
    const next = generatorSource.indexOf('\ndef ', start + 5);
    const body = generatorSource.slice(start, next < 0 ? generatorSource.length : next);
    const arrayMatch = body.match(/template_candidates\s*=\s*\[([\s\S]*?)\n\s*\]/u);
    assertCondition(arrayMatch, `generator function ${functionName} has no bounded template list.`);
    const templates = [...arrayMatch[1].matchAll(/"(?:[^"\\]|\\.)*"/gu)].map((match) => JSON.parse(match[0]));
    assertCondition(templates.length > 0 && templates.length <= 64,
      `generator function ${functionName} has an invalid template count.`);
    for (const template of templates) {
      const pattern = templatePattern(template.normalize('NFKC'), contract.subjectPlaceholder);
      if (!pattern) {
        unsupportedTemplates.push(Object.freeze({ functionName, templateSha256: sha256(template) }));
        continue;
      }
      patterns.push(Object.freeze({
        functionName,
        relation: contract.relation,
        templateSha256: sha256(template),
        pattern,
      }));
    }
  }
  return Object.freeze({
    schema: 'stepgame-template-catalog-v1',
    patterns: Object.freeze(patterns),
    unsupportedTemplates: Object.freeze(unsupportedTemplates),
  });
}

function parseQuestion(question, lineNumber) {
  const match = question.match(/^What is the relation of the agent ([A-Z]) to the agent ([A-Z])\?$/u);
  assertCondition(match, `line ${lineNumber} has an unsupported question form.`);
  return Object.freeze({ subject: `entity:${match[1]}`, object: `entity:${match[2]}` });
}

function parseStory(story, catalog, lineNumber) {
  const facts = [];
  const issues = [];
  for (const [index, rawSentence] of story.entries()) {
    assertCondition(typeof rawSentence === 'string' && rawSentence.length > 0 && !rawSentence.includes('\0'),
      `line ${lineNumber} story sentence ${index} is malformed.`);
    const sentence = rawSentence.normalize('NFKC');
    const matches = catalog.patterns.flatMap((entry) => {
      const match = sentence.match(entry.pattern);
      return match ? [{ entry, subject: match.groups.subject, object: match.groups.object }] : [];
    });
    const signatures = new Map();
    for (const match of matches) {
      const signature = `${match.subject}\u0000${match.entry.relation}\u0000${match.object}`;
      if (!signatures.has(signature)) signatures.set(signature, match);
    }
    if (signatures.size !== 1) {
      issues.push(Object.freeze({
        sentenceIndex: index,
        status: signatures.size === 0 ? 'UNMATCHED_TEMPLATE' : 'AMBIGUOUS_TEMPLATE',
        sentenceSha256: sha256(sentence),
        alternatives: Object.freeze([...signatures.keys()]),
      }));
      continue;
    }
    const match = [...signatures.values()][0];
    facts.push(Object.freeze({
      id: `fact:${lineNumber}:${index}`,
      subject: `entity:${match.subject}`,
      relation: match.entry.relation,
      object: `entity:${match.object}`,
      source: Object.freeze({ sentenceIndex: index, templateSha256: match.entry.templateSha256 }),
    }));
  }
  return Object.freeze({ facts: Object.freeze(facts), issues: Object.freeze(issues) });
}

export function adaptStepGameRecord(record, options) {
  const { split, lineNumber, catalog } = options;
  assertCondition(['train', 'validation', 'test'].includes(split), `line ${lineNumber} has an invalid split.`);
  assertCondition(record && typeof record === 'object' && !Array.isArray(record), `line ${lineNumber} is not an object.`);
  const keys = Object.keys(record).sort();
  assertCondition(JSON.stringify(keys) === JSON.stringify(['k_hop', 'label', 'question', 'story']),
    `line ${lineNumber} has unexpected or missing fields.`);
  assertCondition(Array.isArray(record.story) && record.story.length > 0, `line ${lineNumber} requires a story.`);
  assertCondition(typeof record.question === 'string', `line ${lineNumber} requires a question.`);
  assertCondition(ANSWER_DOMAIN.has(record.label), `line ${lineNumber} has an invalid answer label.`);
  const hop = Number(record.k_hop);
  assertCondition(Number.isInteger(hop) && hop >= 1 && hop <= 10, `line ${lineNumber} has an invalid k_hop.`);
  const query = parseQuestion(record.question, lineNumber);
  const parsed = parseStory(record.story, catalog, lineNumber);
  const caseId = `stepgame:${split}:${lineNumber}`;
  const task = Object.freeze({
    schema: 'typed-spatial-vector-task-v1',
    systemId: STEPGAME_VECTOR_SYSTEM.systemId,
    facts: parsed.facts,
    query,
    maxDepth: Math.min(64, record.story.length + 1),
  });
  return Object.freeze({
    visible: Object.freeze({
      caseId,
      split,
      hop,
      context: Object.freeze([...record.story]),
      question: record.question,
      taskFrame: Object.freeze({
        schema: 'benchmark-task-frame-v1',
        operation: 'spatial-vector-relation',
        route: 'source-template-to-direct-symbolic-task',
        vectorSystem: STEPGAME_VECTOR_SYSTEM,
        relationTask: task,
      }),
      sourceIssues: parsed.issues,
    }),
    oracle: Object.freeze({ caseId, expectedRelation: record.label }),
  });
}

export async function inspectStepGameJsonl(path, options) {
  const { split, catalog, onCase, includeOracle = false } = options;
  assertCondition(catalog?.schema === 'stepgame-template-catalog-v1', 'a compiled template catalog is required.');
  const counts = { rows: 0, facts: 0, sourceIssues: 0, byHop: {}, byLabel: {} };
  const seenCases = new Set();
  const input = createReadStream(path, { encoding: 'utf8' });
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    const lineNumber = counts.rows + 1;
    let record;
    try { record = JSON.parse(line); }
    catch (error) { throw new Error(`Invalid StepGame source: line ${lineNumber} is not JSON: ${error.message}`); }
    const adapted = adaptStepGameRecord(record, { split, lineNumber, catalog });
    assertCondition(!seenCases.has(adapted.visible.caseId), `duplicate case ${adapted.visible.caseId}.`);
    seenCases.add(adapted.visible.caseId);
    counts.rows += 1;
    counts.facts += adapted.visible.taskFrame.relationTask.facts.length;
    counts.sourceIssues += adapted.visible.sourceIssues.length;
    counts.byHop[adapted.visible.hop] = (counts.byHop[adapted.visible.hop] ?? 0) + 1;
    if (includeOracle) {
      counts.byLabel[adapted.oracle.expectedRelation] = (counts.byLabel[adapted.oracle.expectedRelation] ?? 0) + 1;
    }
    if (onCase) await onCase(adapted.visible, includeOracle ? adapted.oracle : undefined);
  }
  const { stat } = await import('node:fs/promises');
  const metadata = await stat(path);
  return Object.freeze({
    schema: 'stepgame-source-inspection-v1',
    split,
    source: Object.freeze({ path, bytes: metadata.size, sha256: await hashFile(path) }),
    counts: Object.freeze({
      ...counts,
      byHop: Object.freeze(counts.byHop),
      byLabel: Object.freeze(counts.byLabel),
    }),
    leakagePolicy: Object.freeze({
      visible: 'story, question, hop, and label-free typed task',
      oracle: 'host-scorer-only; omit from coding-agent packets',
      languageAgentInvocations: 0,
    }),
  });
}

export async function stepGameFileIdentity(path) {
  const { stat } = await import('node:fs/promises');
  const metadata = await stat(path);
  return Object.freeze({ bytes: metadata.size, sha256: await hashFile(path) });
}

export function scoreStepGameRelation(prediction, oracle) {
  const value = typeof prediction === 'string' ? prediction.trim().toLocaleLowerCase('en-US') : undefined;
  return Object.freeze({ pass: value === oracle.expectedRelation, predicted: value, expected: oracle.expectedRelation });
}
