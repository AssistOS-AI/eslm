import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptEwokCsv, scoreEwokProbe } from '../src/benchmark-adapters/ewok.mjs';

const HEADER = 'MetaTemplateID,TemplateID,PairID,Domain,ConceptA,ConceptB,Target1,Target2,TargetDiff,Context1,Context2,ContextDiff,ContextType,TemplateName,TemplateIndex,ItemTags';

function fixture() {
  return `# EWoK canary UUID synthetic-test-only\n${HEADER}\nmeta-1,template-1,pair-1,spatial,near,far,Target alpha.,Target beta.,contrast,Context alpha.,Context beta.,contrast,type-a,template-a,0,synthetic\n`;
}

function fixtureWithEmptyPairId() {
  return fixture().replace('pair-1,spatial', ',spatial');
}

test('EWoK adapter isolates target-context preference labels from visible cases', () => {
  const adapted = adaptEwokCsv(fixture(), { sourceName: 'synthetic.csv', version: 'synthetic-v0' });
  assert.equal(adapted.pool.length, 2);
  assert.equal(adapted.oracle.length, 2);
  assert.equal(adapted.pool[0].target, 'Target alpha.');
  assert.deepEqual(adapted.pool[0].contexts, ['Context alpha.', 'Context beta.']);
  assert.equal('preferredContext' in adapted.pool[0], false);
  assert.deepEqual(adapted.oracle.map((item) => item.preferredContext), [1, 2]);
});

test('EWoK adapter rejects a changed source schema', () => {
  assert.throws(
    () => adaptEwokCsv(fixture().replace('ItemTags', 'UnknownField'), { sourceName: 'changed.csv' }),
    /unsupported column contract/u,
  );
});

test('EWoK adapter accepts the intentionally empty PairID field used by raw official files', () => {
  const adapted = adaptEwokCsv(fixtureWithEmptyPairId(), {
    sourceName: 'official-shape.csv', version: 'synthetic-v0',
  });
  assert.equal(adapted.pool.length, 2);
  assert.equal(adapted.retainedRows, 1);
});

test('EWoK scorer applies the oracle after scoring without exposing it to the engine', async () => {
  const adapted = adaptEwokCsv(fixture(), { sourceName: 'synthetic.csv', version: 'synthetic-v0' });
  const engine = { score: (text) => ({ score: text.startsWith('Context alpha') ? 2 : 1 }) };
  const report = await scoreEwokProbe(engine, adapted.pool, adapted.oracle);
  assert.equal(report.total, 2);
  assert.equal(report.correct, 1);
  assert.equal(report.ties, 0);
});
