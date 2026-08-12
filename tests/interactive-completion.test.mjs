import test from 'node:test';
import assert from 'node:assert/strict';
import { interactiveCompletions } from '../src/interface/interactive-completion.mjs';

test('interactive Tab completion expands slash commands and declared command values', () => {
  assert.deepEqual(interactiveCompletions('/he'), [['/help'], '/he']);
  assert.deepEqual(interactiveCompletions('/normalize o'), [
    ['/normalize on', '/normalize off'],
    '/normalize o',
  ]);
  assert.deepEqual(interactiveCompletions('/memory l'), [['/memory lazy'], '/memory l']);
  assert.deepEqual(interactiveCompletions('/work e'), [
    ['/work exhaustive-bounded'],
    '/work e',
  ]);
});

test('interactive Tab completion uses KB catalog metadata and comma-separated selections', () => {
  const ids = ['quick', 'oewn-2025', 'atomic-2020'];
  assert.deepEqual(interactiveCompletions('/load oe', ids), [['/load oewn-2025'], '/load oe']);
  assert.deepEqual(
    interactiveCompletions('/unload quick,a', ids),
    [['/unload quick,all', '/unload quick,atomic-2020'], '/unload quick,a'],
  );
});

test('interactive Tab completion leaves ordinary language untouched', () => {
  assert.deepEqual(interactiveCompletions('Where is Gertrude?', ['quick']), [[], 'Where is Gertrude?']);
});
