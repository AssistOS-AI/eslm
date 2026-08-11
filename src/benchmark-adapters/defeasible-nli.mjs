import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { PROJECT_ROOT } from '../paths.mjs';
import { compileNarrativeSentence } from '../reasoning/narrative-state.mjs';
import { deriveFramePairEvidence } from '../reasoning/typed-event-evidence.mjs';
import { classifyTypedUpdate, verifyTypedEvidenceComparison } from '../reasoning/typed-evidence-comparison.mjs';

const REVISION = 'c675ffc1b0eec5fa56287f08490da8ed43c1ecc5';
const EXTRACTED_DIRECTORY = `defeasible-nli-${REVISION}`;
const FAMILIES = Object.freeze({
  atomic: Object.freeze({ directory: 'defeasible-atomic', dataSource: 'ATOMIC', premise: true,
    fields: ['AtomicEventId', 'AtomicEventRelationId', 'AtomicInference', 'AtomicRelationType'] }),
  snli: Object.freeze({ directory: 'defeasible-snli', dataSource: 'SNLI', premise: true,
    fields: ['SNLIPairId'] }),
  social: Object.freeze({ directory: 'defeasible-social', dataSource: 'SOCIAL-CHEM-101', premise: false,
    fields: ['SocialChemSituationUID', 'SocialChemSituation', 'SocialChemROT', 'UpdateTypeOption'] }),
});
const SPLITS = Object.freeze(['train', 'dev', 'test']);
const SHARED_FIELDS = Object.freeze([
  'DataSource', 'AssignmentIdAnon', 'WorkerIdAnon', 'Hypothesis', 'Update', 'UpdateType',
  'UpdateTypeImpossible', 'UpdateTypeImpossibleReason',
]);
const FILES = Object.freeze({
  'atomic/train': Object.freeze({ bytes: 18_784_118, rows: 39_036,
    sha256: 'd47f4852b634d3212c9beb442d9ba7f5348256b972aa662eede0e8b8fc98344e' }),
  'atomic/dev': Object.freeze({ bytes: 2_067_733, rows: 4_310,
    sha256: 'eabae7870c588d070ac7e4177ec9062dcf74da25a21afd063cdd2e8d046b1bfc' }),
  'atomic/test': Object.freeze({ bytes: 2_237_197, rows: 4_654,
    sha256: '8315f9e4864c3e191635e96d00d07786dcd0a15aded9a8cdea742bdb53daeca8' }),
  'snli/train': Object.freeze({ bytes: 37_467_246, rows: 93_860,
    sha256: 'aeb3302c9b828b01120bd0c952079c9be9b3aea13e5b4fd68e27335d83c71760' }),
  'snli/dev': Object.freeze({ bytes: 765_939, rows: 1_888,
    sha256: '34a0be2e4ea4b7533c8e32984c9ead0dcf05962620fceb7b543cfcaa9aee084e' }),
  'snli/test': Object.freeze({ bytes: 791_612, rows: 1_972,
    sha256: '081d0b7a7a563b15a590fffdc4c0741c956e93c93def0cc77def326603f6904a' }),
  'social/train': Object.freeze({ bytes: 44_363_770, rows: 80_330,
    sha256: '698347642b50d620ee451c6fe443f7e01731f2ee404ad7c83c2bf4f6e8b792af' }),
  'social/dev': Object.freeze({ bytes: 5_398_034, rows: 9_810,
    sha256: '2dba853f241d0b88b6d30a20dc7e74ffd594e3e086a41c1f60144b1871b8bd47' }),
  'social/test': Object.freeze({ bytes: 5_431_786, rows: 9_860,
    sha256: '312f305e7ccf8df2cdb72ccf85aa23f8c32896f751f3a44ef91c74c98615bcd7' }),
});

export const DEFEASIBLE_NLI_SOURCE = Object.freeze({
  format: 'eslm-benchmark-source-v1', id: 'defeasible-nli-official-compound-2020',
  source: 'https://github.com/rudinger/defeasible-nli', revision: REVISION,
  archiveUrl: `https://codeload.github.com/rudinger/defeasible-nli/tar.gz/${REVISION}`,
  archivePath: `training/.cache/benchmarks/defeasible-nli/source/${REVISION}.tar.gz`,
  archiveBytes: 9_393_470,
  archiveSha256: '5ce22943ab9e6cd1b687eb241e7da4db31ee30dcd24e66b7595c1e34d571d03b',
  extractedPath: `training/.cache/benchmarks/defeasible-nli/extracted/${EXTRACTED_DIRECTORY}`,
  license: 'MIT',
  licenseSha256: '4f3cbbc5e111fe600a5d515c5dbd5f437545d19b3ae3ba36acb9785cc9d88246',
  readmeSha256: '25b73083766ca40361a947771e278b0e2e7d06b3222530645ea408d156376fd6',
  componentRights: Object.freeze({
    atomic: 'Upstream ATOMIC attribution and source terms remain applicable.',
    snli: 'CC BY-SA 4.0 upstream corpus.',
    social: 'CC BY-SA 4.0 upstream dataset.',
  }),
  files: FILES,
});

function invariant(condition, path, message) {
  if (!condition) throw new Error(`Defeasible NLI ${path}: ${message}`);
}

function text(value, path, { empty = false } = {}) {
  invariant(typeof value === 'string' && (empty || value.length > 0), path,
    empty ? 'expected text.' : 'expected non-empty text.');
  invariant(!value.includes('\0') && !value.includes('\uFFFD'), path, 'contains an invalid text character.');
}

function exactFields(record, fields, path) {
  invariant(record !== null && typeof record === 'object' && !Array.isArray(record), path,
    'expected a JSON object.');
  const actual = Object.keys(record).toSorted();
  const expected = [...fields].toSorted();
  invariant(actual.length === expected.length && actual.every((field, index) => field === expected[index]), path,
    `expected exactly ${expected.join(', ')}; received ${actual.join(', ')}.`);
}

function validateRecord(record, familyId, split, line) {
  const family = FAMILIES[familyId];
  const path = `${family.directory}/${split}.jsonl:${line}`;
  exactFields(record, [...SHARED_FIELDS, ...(family.premise ? ['Premise'] : []), ...family.fields], path);
  invariant(record.DataSource === family.dataSource, `${path}.DataSource`, `expected ${family.dataSource}.`);
  invariant(Number.isInteger(record.AssignmentIdAnon), `${path}.AssignmentIdAnon`, 'expected an integer.');
  invariant(Number.isInteger(record.WorkerIdAnon), `${path}.WorkerIdAnon`, 'expected an integer.');
  if (family.premise) text(record.Premise, `${path}.Premise`);
  text(record.Hypothesis, `${path}.Hypothesis`);
  text(record.Update, `${path}.Update`, { empty: record.UpdateTypeImpossible });
  invariant(['strengthener', 'weakener'].includes(record.UpdateType), `${path}.UpdateType`,
    'expected strengthener or weakener.');
  invariant(typeof record.UpdateTypeImpossible === 'boolean', `${path}.UpdateTypeImpossible`,
    'expected a Boolean.');
  text(record.UpdateTypeImpossibleReason, `${path}.UpdateTypeImpossibleReason`, { empty: true });
  if (!record.UpdateTypeImpossible) {
    invariant(record.Update.length > 0, `${path}.Update`, 'non-impossible rows require an update.');
  }
  if (familyId === 'atomic') {
    for (const field of family.fields) text(record[field], `${path}.${field}`);
  } else if (familyId === 'snli') {
    text(record.SNLIPairId, `${path}.SNLIPairId`);
  } else {
    text(record.SocialChemSituationUID, `${path}.SocialChemSituationUID`);
    text(record.SocialChemSituation, `${path}.SocialChemSituation`);
    text(record.SocialChemROT, `${path}.SocialChemROT`);
    invariant(record.Hypothesis === record.SocialChemROT, `${path}.Hypothesis`,
      'must equal SocialChemROT under the official compound schema.');
    invariant(['', 'stereotyped', 'other'].includes(record.UpdateTypeOption), `${path}.UpdateTypeOption`,
      'expected empty, stereotyped, or other.');
  }
}

function sourceRoot(options = {}) {
  return options.root ?? join(PROJECT_ROOT, DEFEASIBLE_NLI_SOURCE.extractedPath);
}

function sourceFile(root, familyId, split) {
  return join(root, 'data', 'defeasible-nli', FAMILIES[familyId].directory, `${split}.jsonl`);
}

async function streamFile(root, familyId, split, onRecord) {
  const descriptor = FILES[`${familyId}/${split}`];
  const path = sourceFile(root, familyId, split);
  const details = await stat(path);
  invariant(details.size === descriptor.bytes, `${familyId}/${split}`,
    `expected ${descriptor.bytes} bytes, received ${details.size}.`);
  const digest = createHash('sha256');
  const source = createReadStream(path);
  source.on('data', (chunk) => digest.update(chunk));
  const lines = createInterface({ input: source, crlfDelay: Infinity });
  let rows = 0;
  let impossible = 0;
  let impossibleWithUpdate = 0;
  let possibleWithoutUpdate = 0;
  for await (const line of lines) {
    if (!line.trim()) continue;
    rows += 1;
    let record;
    try {
      record = JSON.parse(line);
    } catch (error) {
      throw new Error(`Defeasible NLI ${familyId}/${split}:${rows}: invalid JSON: ${error.message}`);
    }
    validateRecord(record, familyId, split, rows);
    impossible += Number(record.UpdateTypeImpossible);
    impossibleWithUpdate += Number(record.UpdateTypeImpossible && record.Update.length > 0);
    possibleWithoutUpdate += Number(!record.UpdateTypeImpossible && record.Update.length === 0);
    await onRecord?.(record, rows);
  }
  invariant(rows === descriptor.rows, `${familyId}/${split}`,
    `expected ${descriptor.rows} rows, received ${rows}.`);
  const fileSha256 = digest.digest('hex');
  invariant(fileSha256 === descriptor.sha256, `${familyId}/${split}`, 'SHA-256 differs from the frozen source.');
  return Object.freeze({
    family: familyId, split, rows, eligible: rows - impossible, impossible,
    impossibleWithUpdate, possibleWithoutUpdate, bytes: details.size, sha256: fileSha256,
  });
}

export async function hasDefeasibleNliSource(options = {}) {
  try {
    return (await stat(sourceRoot(options))).isDirectory();
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function inventoryDefeasibleNliSource(options = {}) {
  const root = sourceRoot(options);
  const files = [];
  for (const familyId of Object.keys(FAMILIES)) {
    for (const split of SPLITS) files.push(await streamFile(root, familyId, split));
  }
  const aggregate = Object.fromEntries(SPLITS.map((split) => {
    const selected = files.filter((file) => file.split === split);
    return [split, Object.freeze({
      rows: selected.reduce((sum, file) => sum + file.rows, 0),
      eligible: selected.reduce((sum, file) => sum + file.eligible, 0),
      impossible: selected.reduce((sum, file) => sum + file.impossible, 0),
    })];
  }));
  return Object.freeze({
    format: 'eslm-defeasible-nli-source-inventory-v1', source: DEFEASIBLE_NLI_SOURCE,
    files: Object.freeze(files), aggregate: Object.freeze(aggregate),
    sourceSetSha256: createHash('sha256').update(files.map((file) =>
      `${file.family}\0${file.split}\0${file.rows}\0${file.sha256}`).join('\n')).digest('hex'),
    validation: 'all-nine-official-JSONL-files-streamed-through-family-specific-closed-schemas',
    sizePolicy: 'exact frozen file identity; no arbitrary source-byte or row-count rejection',
    lifecycle: 'official train and dev are visible; official test remains evaluator-only and has no exported loader',
  });
}

function taskId(familyId, split, line) {
  return `defeasible-nli:${familyId}:${split}:${line}`;
}

function visibleTask(record, familyId, split, line) {
  return Object.freeze({
    taskId: taskId(familyId, split, line), operation: 'classify-defeasible-update-effect',
    sourceFamily: familyId, sourceSplit: split,
    premise: FAMILIES[familyId].premise ? record.Premise : undefined,
    context: FAMILIES[familyId].premise ? record.Premise : record.SocialChemSituation,
    hypothesis: record.Hypothesis, update: record.Update,
    outputContract: Object.freeze({ kind: 'single-label', values: Object.freeze(['strengthener', 'weakener']) }),
  });
}

export function compileDefeasibleNliEvidenceTask(task) {
  invariant(task?.operation === 'classify-defeasible-update-effect', 'typed evidence',
    'expected a defeasible update task.');
  const context = compileNarrativeSentence(task.context, 0);
  const hypothesis = compileNarrativeSentence(task.hypothesis, 1);
  const update = compileNarrativeSentence(task.update, 2);
  const evidence = [
    ...deriveFramePairEvidence({ alternativeId: 'state:after', source: update, target: hypothesis,
      sourceRef: `${task.taskId}:update-to-hypothesis`, relationScope: 'update-to-hypothesis' }),
    ...deriveFramePairEvidence({ alternativeId: 'state:after', source: update, target: context,
      sourceRef: `${task.taskId}:update-to-context`, relationScope: 'update-to-context' }),
  ];
  return Object.freeze({ alternatives: Object.freeze(['state:before', 'state:after']),
    evidence: Object.freeze(evidence),
    policy: Object.freeze({ minimumMargin: 100,
      familyWeights: Object.freeze({ causal: 1, contradiction: 1, state: 1 }) }) });
}

export function classifyDefeasibleNliTask(task) {
  const evidenceTask = compileDefeasibleNliEvidenceTask(task);
  const result = classifyTypedUpdate(evidenceTask);
  const comparisonResult = result.status === 'UNKNOWN' ? result : Object.freeze({ ...result,
    values: Object.freeze([result.witness.selectedState]) });
  const witnessValid = verifyTypedEvidenceComparison(evidenceTask, comparisonResult);
  return Object.freeze({ ...result, witnessValid, languageAgentInvocations: 0 });
}

export function adaptDefeasibleNliDevelopmentRecord(record, familyId, line = 1) {
  invariant(Object.hasOwn(FAMILIES, familyId), 'family', `unknown source family ${familyId}.`);
  invariant(Number.isInteger(line) && line > 0, 'line', 'expected a positive source line number.');
  validateRecord(record, familyId, 'dev', line);
  if (record.UpdateTypeImpossible) {
    return Object.freeze({
      visible: null,
      oracle: Object.freeze({ excluded: true, reason: record.UpdateTypeImpossibleReason }),
    });
  }
  return Object.freeze({
    visible: visibleTask(record, familyId, 'dev', line),
    oracle: Object.freeze({ excluded: false, label: record.UpdateType }),
  });
}

async function collectVisibleSplit(split, options = {}) {
  invariant(['train', 'dev'].includes(split), 'split', 'only train or dev may be loaded as visible evidence.');
  const root = sourceRoot(options);
  const cases = [];
  const oracle = new Map();
  const excludedImpossible = {};
  for (const familyId of Object.keys(FAMILIES)) {
    excludedImpossible[familyId] = 0;
    await streamFile(root, familyId, split, (record, line) => {
      if (record.UpdateTypeImpossible) {
        excludedImpossible[familyId] += 1;
        return;
      }
      const task = visibleTask(record, familyId, split, line);
      cases.push(task);
      oracle.set(task.taskId, record.UpdateType);
    });
  }
  return Object.freeze({ cases: Object.freeze(cases), oracle, excludedImpossible: Object.freeze(excludedImpossible) });
}

export async function loadDefeasibleNliDevelopmentPool(options = {}) {
  const collected = await collectVisibleSplit('dev', options);
  return Object.freeze({
    format: 'eslm-defeasible-nli-label-free-development-pool-v1',
    officialSourceRows: collected.cases.length
      + Object.values(collected.excludedImpossible).reduce((sum, count) => sum + count, 0),
    experimentalCases: collected.cases.length,
    excludedImpossible: collected.excludedImpossible,
    oracle: 'host-only-not-returned', cases: collected.cases,
    test: 'official-test-evaluator-only-not-loaded',
  });
}

function increment(target, key) {
  target[key] = (target[key] ?? 0) + 1;
}

export async function runDefeasibleNliDevelopmentProbe(engine, options = {}) {
  invariant(engine && typeof engine.executeTask === 'function', 'engine', 'expected an ESLM-compatible task engine.');
  const collected = await collectVisibleSplit('dev', options);
  const statusCounts = {};
  const byFamily = Object.fromEntries(Object.keys(FAMILIES).map((family) => [family, {
    tested: 0, answered: 0, correct: 0,
  }]));
  let answered = 0;
  let correct = 0;
  for (const task of collected.cases) {
    const result = engine.executeTask(task);
    const status = result?.status ?? 'MISSING_STATUS';
    const prediction = result?.values?.length === 1 ? result.values[0] : undefined;
    const expected = collected.oracle.get(task.taskId);
    increment(statusCounts, status);
    byFamily[task.sourceFamily].tested += 1;
    if (prediction !== undefined) {
      answered += 1;
      byFamily[task.sourceFamily].answered += 1;
      const passed = prediction === expected;
      correct += Number(passed);
      byFamily[task.sourceFamily].correct += Number(passed);
    }
  }
  return Object.freeze({
    format: 'eslm-defeasible-nli-development-result-v1',
    evidenceRegime: 'complete-official-development-split-excluding-owner-declared-impossible-rows',
    runtimeProfile: 'direct-symbolic-no-language-agent',
    officialSourceRows: collected.cases.length
      + Object.values(collected.excludedImpossible).reduce((sum, count) => sum + count, 0),
    tested: collected.cases.length, answered, correct,
    accuracyOnAnswered: answered ? correct / answered : null,
    statusCounts: Object.freeze(statusCounts), byFamily: Object.freeze(byFamily),
    excludedImpossible: collected.excludedImpossible,
    languageAgentInvocations: 0, normalizationCandidates: 0,
    test: Object.freeze({ executed: false, visibility: 'evaluator-only-no-loader-exported' }),
  });
}

export async function runDefeasibleNliTypedDevelopmentProbe(options = {}) {
  const collected = await collectVisibleSplit('dev', options);
  const statusCounts = {};
  const byFamily = Object.fromEntries(Object.keys(FAMILIES).map((family) => [family, {
    tested: 0, answered: 0, correct: 0, unknown: 0,
  }]));
  let answered = 0;
  let correct = 0;
  let witnessValid = 0;
  for (const task of collected.cases) {
    const result = classifyDefeasibleNliTask(task);
    const prediction = result.values.length === 1 ? result.values[0] : undefined;
    const expected = collected.oracle.get(task.taskId);
    increment(statusCounts, result.status);
    byFamily[task.sourceFamily].tested += 1;
    if (prediction === undefined) {
      byFamily[task.sourceFamily].unknown += 1;
      continue;
    }
    answered += 1;
    byFamily[task.sourceFamily].answered += 1;
    const passed = prediction === expected;
    correct += Number(passed);
    byFamily[task.sourceFamily].correct += Number(passed);
    witnessValid += Number(result.witnessValid);
  }
  return Object.freeze({ format: 'eslm-defeasible-nli-typed-evidence-development-result-v1',
    evidenceRegime: 'complete-official-development-excluding-owner-declared-impossible-rows',
    tested: collected.cases.length, answered, unknown: collected.cases.length - answered,
    correct, coverage: answered / collected.cases.length,
    accuracyOnAnswered: answered ? correct / answered : null,
    witnessValid, statusCounts: Object.freeze(statusCounts), byFamily: Object.freeze(byFamily),
    excludedImpossible: collected.excludedImpossible,
    languageAgentInvocations: 0,
    test: Object.freeze({ executed: false, visibility: 'evaluator-only-no-loader-exported' }) });
}
