import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CORE_METHOD_DESCRIPTORS } from '../src/reasoning/capability-registry.mjs';
import { PROJECT_ROOT } from '../src/paths.mjs';

test('reasoning methods page names every registered generic core method', async () => {
  const html = await readFile(`${PROJECT_ROOT}/docs/reasoning/reasoning-methods.html`, 'utf8');
  for (const descriptor of Object.values(CORE_METHOD_DESCRIPTORS)) {
    assert.ok(html.includes(descriptor.methodId), `missing ${descriptor.methodId}`);
  }
});
