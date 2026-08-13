import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { inspectKnowledgePackage } from '../src/kb/inspection.mjs';

test('KB inspection enumerates bounded records and searches case-insensitive wildcards', async () => {
  const manifestPath = resolve('training/KBs/quick/package/manifest.json');
  const records = await inspectKnowledgePackage({ kbId: 'quick', manifestPath, limit: 2 });
  assert.equal(records.format, 'eslm-kb-inspection');
  assert.equal(records.matches.length, 2);
  assert.equal(records.complete, false);
  assert.deepEqual(records.stopReasons, ['result-limit']);

  const search = await inspectKnowledgePackage({
    kbId: 'quick', manifestPath, pattern: '*PENGUIN*', limit: 20,
  });
  assert.equal(search.complete, true);
  assert.ok(search.matches.length >= 3);
  assert.ok(search.matches.some((item) => JSON.stringify(item).includes('quick/Penguin')));
});

test('KB inspection rejects invalid bounds and package identity mismatches', async () => {
  const manifestPath = resolve('training/KBs/quick/package/manifest.json');
  await assert.rejects(
    inspectKnowledgePackage({ kbId: 'quick', manifestPath, limit: 0 }),
    /Inspection limit must be an integer/u,
  );
  await assert.rejects(
    inspectKnowledgePackage({ kbId: 'other', manifestPath }),
    /belongs to quick, not other/u,
  );
});
