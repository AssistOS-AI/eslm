import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adaptClutrrCsv,
  CLUTRR_SOURCE,
  scoreClutrrRelation,
} from '../src/benchmark-adapters/clutrr.mjs';
import { executeTypedRelationTask } from '../src/reasoning/relation-algebra.mjs';
import { loadKnowledgeBase } from '../src/kbs.mjs';

const HEADER = ',id,story,query,text_query,target,text_target,clean_story,proof_state,f_comb,task_name,'
  + 'story_edges,edge_types,query_edge,genders,syn_story,node_mapping,task_split';

test('CLUTRR adapter separates label-free visible cases from the host oracle', () => {
  const row = [
    '0',
    'fixture-1',
    '"[Scott] and [Lewis] are brothers. [Jason] is father of their father"',
    '"(\'Jason\', \'Lewis\')"',
    '',
    'grandson',
    '',
    '"[Jason] is related to [Lewis]."',
    '"private proof"',
    'grandson-brother',
    'task_1.2',
    '"[(0, 1), (1, 2)]"',
    '"[\'grandson\', \'brother\']"',
    '"(0, 2)"',
    '"Jason:male,Scott:male,Lewis:male"',
    '',
    '"{0: 0, 23: 1, 25: 2}"',
    'test',
  ].join(',');
  const adapted = adaptClutrrCsv(`${HEADER}\n${row}\n`, { datasetId: 'fixture-v1', split: 'test' });
  assert.equal(adapted.pool.length, 1);
  assert.equal(adapted.pool[0].context.includes('private proof'), false);
  assert.equal(Object.hasOwn(adapted.pool[0], 'target'), false);
  assert.equal(Object.hasOwn(adapted.pool[0], 'oracle'), false);
  assert.deepEqual(adapted.pool[0].taskFrame.relationTask.facts.map((fact) => fact.relation),
    ['grandson', 'brother']);
  assert.deepEqual(adapted.pool[0].query, {
    left: 'Jason', right: 'Lewis', direction: 'right-relative-to-left',
  });
  assert.equal(adapted.oracle[0].expectedRelation, 'grandson');
  assert.equal(adapted.leakagePolicy.oracle, 'host-scorer-only; omit from coding-agent packets');
  assert.equal(CLUTRR_SOURCE.license, 'CC-BY-NC-4.0');
  assert.equal(scoreClutrrRelation('Grandson', adapted.oracle[0]).pass, true);
});

test('CLUTRR adapter rejects malformed rows and split mismatches', () => {
  const malformed = `${HEADER}\n0,fixture-1,story,"(\'A\', \'B\')",,son,,,,,task_1.2,,,,,,,train\n`;
  assert.throws(() => adaptClutrrCsv(malformed, { split: 'test' }), /fields|split/u);
});

test('CLUTRR structured evidence executes through the generic typed relation method', async () => {
  const row = [
    '0', 'fixture-2', '"[Ari] has a son [Bex]. [Bex] has a son [Cato]."', '"(\'Ari\', \'Cato\')"', '',
    'grandson', '', '', '', 'son-son', 'task_1.2', '"[(0, 1), (1, 2)]"', '"[\'son\', \'son\']"',
    '"(0, 2)"', '"Ari:female,Bex:male,Cato:male"', '', '"{8: 0, 13: 1, 21: 2}"', 'test',
  ].join(',');
  const adapted = adaptClutrrCsv(`${HEADER}\n${row}\n`, { datasetId: 'fixture-v2', split: 'test' });
  const model = await loadKnowledgeBase('clutrr-kinship-algebra');
  const task = adapted.pool[0].taskFrame.relationTask;
  const result = executeTypedRelationTask(task, model.reasoning.relationAlgebras[task.algebraId]);
  assert.equal(result.status, 'SOLVED');
  assert.deepEqual(result.values, ['grandson']);
  assert.deepEqual(result.evidence.map((item) => item.factId), task.facts.map((item) => item.id));
});
