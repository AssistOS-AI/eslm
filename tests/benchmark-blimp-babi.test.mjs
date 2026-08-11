import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acquireBenchmarkArchive, BABI_ALL_TASK_FILES, BLIMP_BABI_SOURCES, compileBabiCase,
  parseBabiTask, parseBlimpJsonLines, scoreBabiEpisodicCases,
  scoreBlimpFeatureProbe,
} from '../src/benchmark-adapters/blimp-babi.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';
import { EslmEngine } from '../src/runtime/engine.mjs';
import { verifyEpisodicWorldResult } from '../src/reasoning/episodic-world.mjs';

test('BLiMP adapter validates the official record shape and preserves the preference oracle', () => {
  const input = JSON.stringify({
    sentence_good: 'The cats sleep.',
    sentence_bad: 'The cats sleeps.',
    field: 'syntax',
    linguistics_term: 'subject_verb_agreement',
    UID: 'fixture_agreement',
    simple_LM_method: true,
    one_prefix_method: true,
    two_prefix_method: false,
    lexically_identical: false,
    crucial_item: 'sleep/sleeps',
    dependency_length: 1,
    pairID: '0',
  });
  assert.deepEqual(parseBlimpJsonLines(input, 'fixture'), [{
    id: 'blimp:fixture_agreement:0',
    kind: 'preference',
    good: 'The cats sleep.',
    bad: 'The cats sleeps.',
    metadata: {
      family: 'BLiMP', paradigm: 'fixture_agreement', field: 'syntax',
      linguisticsTerm: 'subject_verb_agreement', pairId: '0', lexicallyIdentical: false,
      crucialItem: 'sleep/sleeps', dependencyLength: 1,
    },
  }]);
});

test('BLiMP adapter rejects unknown fields and malformed boolean metadata', () => {
  const base = {
    sentence_good: 'A cat sleeps.', sentence_bad: 'A cat sleep.', field: 'syntax',
    linguistics_term: 'agreement', UID: 'fixture', simple_LM_method: true,
    one_prefix_method: true, two_prefix_method: false, lexically_identical: false, pairID: '1',
  };
  assert.throws(() => parseBlimpJsonLines(JSON.stringify({ ...base, answer: 'good' })), /unrecognized field/u);
  assert.throws(() => parseBlimpJsonLines(JSON.stringify({ ...base, simple_LM_method: 'yes' })), /must be boolean/u);
});

test('BLiMP feature scorer preserves pair order and reports ties separately', () => {
  const cases = [{
    id: 'fixture:pair:0', kind: 'preference', good: 'A dax glims.', bad: 'These daxen glims.',
    metadata: { paradigm: 'fixture' },
  }];
  const featureProfile = {
    format: 'eslm-english-feature-profile-v1', provenance: { source: 'test' }, morphology: {}, expansions: {},
    lexemes: {
      '.': { category: 'punctuation' }, a: { category: 'determiner', number: 'singular' },
      these: { category: 'determiner', number: 'plural' }, dax: { category: 'noun', number: 'singular' },
      daxen: { category: 'noun', number: 'plural' },
      glims: { category: 'verb', finite: true, agreement: 'singular' },
    },
  };
  const result = scoreBlimpFeatureProbe(cases, featureProfile);
  assert.deepEqual({ total: result.total, correct: result.correct, ties: result.ties, reverse: result.reverse },
    { total: 1, correct: 1, ties: 0, reverse: 0 });
  assert.equal(result.results[0].preferred, 0);
  const reversed = scoreBlimpFeatureProbe([{ ...cases[0], good: cases[0].bad, bad: cases[0].good }], featureProfile);
  assert.equal(reversed.results[0].preferred, 1);
});

test('bAbI adapter isolates stories and resolves only preceding supporting facts', () => {
  const input = [
    '1 Mary moved to the hallway.',
    '2 John went to the kitchen.',
    '3 Where is Mary?\thallway\t1',
    '1 Sandra travelled to the office.',
    '2 Where is Sandra?\toffice\t1',
  ].join('\n');
  const cases = parseBabiTask(input, { datasetId: 'fixture', split: 'train', task: 2 });
  assert.equal(cases.length, 2);
  assert.equal(cases[0].id, 'fixture:task-2:train:story-1:line-3');
  assert.deepEqual(cases[0].support, ['Mary moved to the hallway.']);
  assert.equal(cases[1].context, 'Sandra travelled to the office.');
  assert.deepEqual(cases[1].metadata, {
    family: 'bAbI', version: '1.2', task: 2, split: 'train', story: 2, questionLine: 2,
  });
});

test('bAbI adapter rejects non-contiguous stories and forward support references', () => {
  assert.throws(() => parseBabiTask('1 Mary moved.\n3 Where is Mary?\there\t1', {
    split: 'train', task: 2,
  }), /non-contiguous/u);
  assert.throws(() => parseBabiTask('1 Mary moved.\n2 Where is Mary?\there\t3', {
    split: 'train', task: 2,
  }), /preceding statements/u);
});

test('bAbI episodic projection composes renamed state, transfer, and set operations without a task dispatch', () => {
  const cases = parseBabiTask([
    '1 Aria moved to the studio.',
    '2 Aria picked up the token there.',
    '3 Aria passed the token to Belen.',
    '4 What is Belen carrying?\ttoken\t3',
  ].join('\n'), { datasetId: 'fixture', split: 'train', task: 8 });
  const compiled = compileBabiCase(cases[0]);
  assert.deepEqual(compiled.unsupportedStatements, []);
  assert.equal(compiled.unsupportedQuestion, undefined);
  const score = scoreBabiEpisodicCases(cases);
  assert.deepEqual({ total: score.total, correct: score.correct, proofValid: score.proofValid },
    { total: 1, correct: 1, proofValid: 1 });
});

test('bAbI episodic tasks route through the public engine and retain replayable evidence', async () => {
  const [item] = parseBabiTask([
    '1 Nira moved to the atrium.',
    '2 Nira picked up the prism there.',
    '3 What is Nira carrying?\tprism\t2',
  ].join('\n'), { datasetId: 'nonce', split: 'train', task: 8 });
  const compiled = compileBabiCase(item);
  const result = new EslmEngine(await createCoreModel()).executeTask(compiled.engineTask);
  assert.equal(result.status, 'SOLVED');
  assert.equal(result.plan.methodId, 'method:core:finite-episodic-world');
  assert.equal(verifyEpisodicWorldResult(compiled.task, result), true);
});

test('bAbI source inventory declares all twenty official task-family files', () => {
  assert.equal(Object.keys(BABI_ALL_TASK_FILES).length, 20);
  assert.deepEqual(Object.keys(BABI_ALL_TASK_FILES).map(Number), Array.from({ length: 20 }, (_, index) => index + 1));
});

test('acquisition accepts only immutable registered source descriptors', async () => {
  await assert.rejects(
    acquireBenchmarkArchive({ ...BLIMP_BABI_SOURCES.babi }),
    /registered BLiMP\/bAbI descriptor/u,
  );
  assert.match(BLIMP_BABI_SOURCES.blimp.version, /^git:[0-9a-f]{40}$/u);
  assert.match(BLIMP_BABI_SOURCES.babi.sha256, /^[0-9a-f]{64}$/u);
});
