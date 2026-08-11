import { compileNarrativeSentence, compileNarrativeSequence } from '../reasoning/narrative-state.mjs';
import { sha256 } from '../util.mjs';

export const STORY_CLOZE_2018_ID = 'story-cloze-winter-2018';

const VISIBLE_HEADER = Object.freeze([
  'InputStoryid',
  'InputSentence1',
  'InputSentence2',
  'InputSentence3',
  'InputSentence4',
  'RandomFifthSentenceQuiz1',
  'RandomFifthSentenceQuiz2',
]);
const VALIDATION_HEADER = Object.freeze([...VISIBLE_HEADER, 'AnswerRightEnding']);
export const STORY_CLOZE_2018_HEADERS = Object.freeze({
  validation: VALIDATION_HEADER,
  test: VISIBLE_HEADER,
});
const MAX_ROWS = 100_000;

export const STORY_CLOZE_2018_DEVELOPMENT_POLICY = Object.freeze({
  minimumMargin: 1,
  featureWeights: Object.freeze({
    'participant-continuity': -295,
    'unintroduced-participant': 115,
    'resolvable-pronoun': -23,
    'recent-content-bridge': 24,
    'global-content-bridge': 172,
    'predicate-repetition': -221,
    'tense-agreement': -164,
    'polarity-conflict': -32,
    'content-specificity': 96,
    'predicate-specificity': -48,
    'named-participant-count': -179,
    'pronoun-group-count': 243,
    'negative-polarity': -403,
    'non-asserted-modality': 51,
    'past-tense': 109,
    'present-tense': 98,
    'lexical-novelty': -76,
    'provider-support': 1000,
    'provider-causal': 500,
    'provider-contradiction': 0,
    'provider-event': 750,
    'provider-goal': 1000,
    'provider-social': 250,
    'provider-state': 500,
  }),
  provenance: Object.freeze({
    method:
      'five-fold development-visible structural calibration followed by bounded coordinate calibration '
      + 'of provider-declared semantic families',
    sourcePartitionDigest: 'df208d36029d86c020cbc7ec49cf7937f8cac785230fdeab6f222968b61180b1',
    evidence:
      'development aggregate only; ATOMIC, ConceptNet, and world-relations provider evidence; no fresh '
      + 'labels and no label-free test records',
    interpretation:
      'Source-local ranking calibration, not universal narrative semantics or answer knowledge.',
  }),
});

function fail(message) {
  throw new Error(`Invalid Story Cloze 2018 source: ${message}`);
}

function assertCondition(condition, message) {
  if (!condition) fail(message);
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
  assertCondition(rows.length >= 2, 'CSV input must contain a header and at least one data row.');
  return rows;
}

function expectedHeader(split) {
  if (split === 'validation') return VALIDATION_HEADER;
  if (split === 'test') return VISIBLE_HEADER;
  fail('split must be validation or test.');
}

function stableCaseId(split, sourceId) {
  return `story-cloze:${split}:${sha256(`${split}\0${sourceId}`).slice(0, 24)}`;
}

export function deriveStoryCloze2018Partition(bytes, options = {}) {
  assertCondition(Buffer.isBuffer(bytes), 'partition input must be a Buffer.');
  const seed = options.seed ?? 'eslm-story-cloze-winter-2018-fresh-v1';
  const freshCount = options.freshCount ?? 314;
  assertCondition(typeof seed === 'string' && seed.length >= 16 && seed.length <= 256,
    'partition seed must contain 16 to 256 characters.');
  const rows = parseCsvRows(bytes.toString('utf8').replace(/^\uFEFF/u, ''));
  assertCondition(JSON.stringify(rows[0]) === JSON.stringify(VALIDATION_HEADER),
    'partition source header does not match the validation contract.');
  assertCondition(Number.isInteger(freshCount) && freshCount > 0 && freshCount < rows.length - 1,
    'fresh partition size must leave non-empty development and fresh pools.');
  const identifiers = rows.slice(1).map((values, index) => {
    assertCondition(values.length === VALIDATION_HEADER.length,
      `partition row ${index + 2} does not match the validation schema.`);
    const sourceId = values[0];
    assertCondition(/^[0-9a-f]{8}-[0-9a-f-]{27}$/iu.test(sourceId),
      `partition row ${index + 2} has an invalid story identifier.`);
    return stableCaseId('validation', sourceId);
  });
  assertCondition(new Set(identifiers).size === identifiers.length,
    'partition source contains duplicate story identifiers.');
  const ranked = identifiers.toSorted((left, right) => {
    const leftKey = sha256(`${seed}\0${left}`);
    const rightKey = sha256(`${seed}\0${right}`);
    return leftKey.localeCompare(rightKey) || left.localeCompare(right);
  });
  const freshIds = ranked.slice(0, freshCount).toSorted();
  const partitionDigest = sha256([
    'eslm-story-cloze-partition-v1', sha256(bytes), seed, String(identifiers.length), ...freshIds,
  ].join('\n'));
  return Object.freeze({
    format: 'eslm-story-cloze-partition-v1',
    sourceSha256: sha256(bytes),
    seed,
    assignment: 'stable SHA-256 ranking over label-free derived case identifiers',
    sourceCases: identifiers.length,
    developmentCases: identifiers.length - freshIds.length,
    freshCases: freshIds.length,
    freshIds: Object.freeze(freshIds),
    partitionDigest,
    labelIsolation:
      'Membership uses only the source story identifier, split, and seed. The artifact digest binds the '
      + 'result to source bytes but does not select membership. AnswerRightEnding is not read by the '
      + 'partition operation.',
  });
}

function validateSentence(value, rowNumber, field) {
  assertCondition(typeof value === 'string' && value.trim().length >= 1,
    `row ${rowNumber} has an empty ${field}.`);
  assertCondition(value.length <= 4_096, `row ${rowNumber} ${field} exceeds 4,096 characters.`);
  assertCondition(!/[\r\n\0]/u.test(value), `row ${rowNumber} ${field} contains a forbidden control character.`);
  return value.normalize('NFKC').trim();
}

export function adaptStoryCloze2018Csv(bytes, options = {}) {
  assertCondition(Buffer.isBuffer(bytes), 'input must be a Buffer.');
  const split = options.split ?? 'validation';
  const headerContract = expectedHeader(split);
  const text = bytes.toString('utf8').replace(/^\uFEFF/u, '');
  const rows = parseCsvRows(text);
  assertCondition(
    JSON.stringify(rows[0]) === JSON.stringify(headerContract),
    `${split} header does not match the delivered Winter 2018 contract.`,
  );
  const pool = [];
  const oracle = [];
  const oracleAllowlist = options.oracleAllowlist;
  assertCondition(oracleAllowlist === undefined || oracleAllowlist instanceof Set,
    'oracleAllowlist must be a Set when supplied.');
  const sourceIds = new Set();
  for (let index = 1; index < rows.length; index += 1) {
    const rowNumber = index + 1;
    const values = rows[index];
    assertCondition(values.length === headerContract.length,
      `row ${rowNumber} has ${values.length} fields; expected ${headerContract.length}.`);
    const sourceId = values[0];
    assertCondition(/^[0-9a-f]{8}-[0-9a-f-]{27}$/iu.test(sourceId),
      `row ${rowNumber} has an invalid story identifier.`);
    assertCondition(!sourceIds.has(sourceId), `row ${rowNumber} repeats a story identifier.`);
    sourceIds.add(sourceId);
    const sentences = values.slice(1, 5).map((value, offset) =>
      validateSentence(value, rowNumber, `InputSentence${offset + 1}`));
    const endings = values.slice(5, 7).map((value, offset) =>
      validateSentence(value, rowNumber, `RandomFifthSentenceQuiz${offset + 1}`));
    assertCondition(endings[0] !== endings[1], `row ${rowNumber} repeats the same candidate ending.`);
    const id = stableCaseId(split, sourceId);
    const candidateIds = endings.map((ending) =>
      `candidate:${sha256(ending.normalize('NFKC')).slice(0, 24)}`);
    pool.push(Object.freeze({
      format: 'eslm-benchmark-case-v1',
      id,
      family: 'story-cloze',
      split,
      kind: 'binary-continuation-selection',
      context: sentences.join(' '),
      candidates: Object.freeze(endings),
      taskFrame: Object.freeze({
        operation: 'select-narrative-continuation',
        narrative: compileNarrativeSequence(sentences),
        candidates: Object.freeze(endings.map((ending, candidateIndex) => Object.freeze({
          candidateId: candidateIds[candidateIndex],
          event: compileNarrativeSentence(ending, sentences.length),
        }))),
        policy: STORY_CLOZE_2018_DEVELOPMENT_POLICY,
        outputContract: Object.freeze({ kind: 'candidate-id' }),
      }),
    }));
    if (split === 'validation' && (!oracleAllowlist || oracleAllowlist.has(id))) {
      assertCondition(values[7] === '1' || values[7] === '2',
        `row ${rowNumber} has an invalid preferred-ending label.`);
      oracle.push(Object.freeze({
        id,
        preferredEnding: Number(values[7]),
        preferredCandidateId: candidateIds[Number(values[7]) - 1],
      }));
    }
  }
  return Object.freeze({
    format: 'eslm-adapted-benchmark-v1',
    family: 'story-cloze',
    datasetId: STORY_CLOZE_2018_ID,
    split,
    sourceRows: pool.length,
    pool: Object.freeze(pool),
    oracle: Object.freeze(oracle),
    leakagePolicy: Object.freeze({
      pool: split === 'validation' ? 'development-visible-label-free' : 'evaluation-visible-label-free',
      oracle: split === 'validation'
        ? 'host-scorer-only; omit from synthesis packets unless a separately reviewed '
          + 'development-failure packet authorizes aggregate evidence'
        : 'official-evaluator-only; absent locally and forbidden from synthesis',
    }),
  });
}

export function scoreStoryClozeSelections(predictions, oracle) {
  assertCondition(predictions instanceof Map, 'predictions must be a Map keyed by case id.');
  assertCondition(Array.isArray(oracle), 'oracle must be an array.');
  const outcomes = oracle.map((item) => {
    assertCondition(item && typeof item.id === 'string', 'oracle contains an invalid case id.');
    assertCondition(typeof item.preferredCandidateId === 'string',
      `oracle for ${item.id} has no preferred candidate identifier.`);
    const predicted = predictions.get(item.id);
    const valid = typeof predicted === 'string';
    return Object.freeze({
      id: item.id,
      predicted: valid ? predicted : null,
      pass: valid && predicted === item.preferredCandidateId,
    });
  });
  const correct = outcomes.filter((item) => item.pass).length;
  return Object.freeze({
    protocol: 'story-cloze-binary-ending-selection-v1',
    total: outcomes.length,
    correct,
    accuracy: outcomes.length ? correct / outcomes.length : null,
    omissions: outcomes.filter((item) => item.predicted === null).length,
    outcomes: Object.freeze(outcomes),
  });
}
