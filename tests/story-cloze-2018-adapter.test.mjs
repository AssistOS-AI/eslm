import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  adaptStoryCloze2018Csv,
  deriveStoryCloze2018Partition,
  scoreStoryClozeSelections,
} from '../src/evaluation/story-cloze-2018-adapter.mjs';
import { storyCloze2018CacheStatus } from '../src/evaluation/story-cloze-2018-cache.mjs';

const VISIBLE_HEADER = [
  'InputStoryid', 'InputSentence1', 'InputSentence2', 'InputSentence3', 'InputSentence4',
  'RandomFifthSentenceQuiz1', 'RandomFifthSentenceQuiz2',
];
const SOURCE_ID = '12345678-1234-1234-1234-123456789abc';

function fixture(split, label = '2') {
  const header = split === 'validation' ? [...VISIBLE_HEADER, 'AnswerRightEnding'] : VISIBLE_HEADER;
  const row = [
    SOURCE_ID,
    'Nora found a sealed map.',
    'She asked Ivo to inspect it.',
    'They followed the marked trail.',
    'The trail ended at an old gate.',
    'They opened the gate together.',
    'They forgot that maps exist.',
    ...(split === 'validation' ? [label] : []),
  ];
  return Buffer.from(`${header.join(',')}\n${row.join(',')}\n`);
}

test('Story Cloze validation adaptation isolates labels from visible cases', () => {
  const adapted = adaptStoryCloze2018Csv(fixture('validation'), { split: 'validation' });
  assert.equal(adapted.pool.length, 1);
  assert.equal(adapted.oracle.length, 1);
  assert.equal(adapted.pool[0].kind, 'binary-continuation-selection');
  assert.equal(adapted.pool[0].taskFrame.operation, 'select-narrative-continuation');
  assert.equal('preferredEnding' in adapted.pool[0], false);
  assert.equal(JSON.stringify(adapted.pool[0]).includes('AnswerRightEnding'), false);
  assert.equal(adapted.oracle[0].preferredEnding, 2);
  assert.equal(adapted.oracle[0].preferredCandidateId, adapted.pool[0].taskFrame.candidates[1].candidateId);
  assert.match(adapted.leakagePolicy.oracle, /host-scorer-only/u);
});

test('Story Cloze fresh membership is frozen without consulting labels', () => {
  const source = fixture('validation', '1').toString('utf8');
  const secondRow = source.split('\n')[1]
    .replace(SOURCE_ID, '87654321-4321-4321-4321-cba987654321');
  const withFirstLabel = Buffer.from(`${source.trimEnd()}\n${secondRow}\n`);
  const withSecondLabel = Buffer.from(withFirstLabel.toString('utf8').replace(/,1\n/gu, ',2\n'));
  const firstPartition = deriveStoryCloze2018Partition(withFirstLabel, {
    seed: 'synthetic-story-partition-v1', freshCount: 1,
  });
  const secondPartition = deriveStoryCloze2018Partition(withSecondLabel, {
    seed: 'synthetic-story-partition-v1', freshCount: 1,
  });
  assert.deepEqual(firstPartition.freshIds, secondPartition.freshIds);
  assert.notEqual(firstPartition.partitionDigest, secondPartition.partitionDigest);
  assert.equal(firstPartition.developmentCases, 1);
  assert.match(firstPartition.labelIsolation, /AnswerRightEnding is not read/u);
});

test('Story Cloze test adaptation represents the external oracle as absent', () => {
  const adapted = adaptStoryCloze2018Csv(fixture('test'), { split: 'test' });
  assert.equal(adapted.pool.length, 1);
  assert.deepEqual(adapted.oracle, []);
  assert.equal(adapted.pool[0].split, 'test');
  assert.match(adapted.leakagePolicy.oracle, /official-evaluator-only; absent locally/u);
  assert.equal(JSON.stringify(adapted.pool).includes('preferredEnding'), false);
});

test('Story Cloze adaptation rejects schema drift, invalid labels, and duplicate ids', () => {
  assert.throws(
    () => adaptStoryCloze2018Csv(
      Buffer.from(fixture('validation').toString('utf8').replace('AnswerRightEnding', 'Answer')),
      { split: 'validation' },
    ),
    /header/u,
  );
  assert.throws(
    () => adaptStoryCloze2018Csv(fixture('validation', '3'), { split: 'validation' }),
    /preferred-ending label/u,
  );
  const duplicateRow = `${fixture('test').toString('utf8').split('\n')[1]}\n`;
  const duplicate = Buffer.concat([fixture('test'), Buffer.from(duplicateRow)]);
  assert.throws(() => adaptStoryCloze2018Csv(duplicate, { split: 'test' }), /repeats a story identifier/u);
});

test('Story Cloze scorer joins host-only labels only after predictions exist', () => {
  const adapted = adaptStoryCloze2018Csv(fixture('validation'), { split: 'validation' });
  const id = adapted.pool[0].id;
  const selected = adapted.pool[0].taskFrame.candidates[1].candidateId;
  const scored = scoreStoryClozeSelections(new Map([[id, selected]]), adapted.oracle);
  assert.equal(scored.total, 1);
  assert.equal(scored.correct, 1);
  assert.equal(scored.accuracy, 1);
  assert.equal(scored.omissions, 0);
  const omitted = scoreStoryClozeSelections(new Map(), adapted.oracle);
  assert.equal(omitted.correct, 0);
  assert.equal(omitted.omissions, 1);
});

test('Story Cloze cache status reports absent protected artifacts without inventing a score', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'eslm-story-cloze-status-'));
  const status = await storyCloze2018CacheStatus({ cacheRoot: join(temporary, 'absent') });
  assert.equal(status.cached, false);
  assert.equal(status.benchmarkId, 'story-cloze-winter-2018');
  assert.match(status.reason, /operator-authorized delivered/u);
  assert.equal('accuracy' in status, false);
});
