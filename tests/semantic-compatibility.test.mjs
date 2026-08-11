import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { scoreSemanticCompatibility } from '../src/reasoning/semantic-compatibility.mjs';

const ontology = JSON.parse(await readFile(new URL('../training/KBs/world-relations-1.0/canonical/ontology.json', import.meta.url)));

test('semantic compatibility preserves argument order under entity renaming', () => {
  const target = 'Luma is to the right of Pavo.';
  const compatible = scoreSemanticCompatibility('Pavo is to the left of Luma.', target, ontology);
  const incompatible = scoreSemanticCompatibility('Pavo is to the right of Luma.', target, ontology);
  assert.ok(compatible.score > incompatible.score);
  assert.match(compatible.evidence[0].proof.at(-1), /^inverse:/u);
});

test('semantic compatibility applies general property implications to nonce entities', () => {
  const growing = scoreSemanticCompatibility('The norp is inflating.', 'The norp is growing.', ontology);
  const shrinking = scoreSemanticCompatibility('The norp is deflating.', 'The norp is growing.', ontology);
  assert.ok(growing.score > shrinking.score);
  assert.match(growing.evidence[0].proof.at(-1), /^implication:/u);
});

test('semantic compatibility distinguishes directional quantity comparisons', () => {
  const target = 'There are more glims than drocks.';
  const more = scoreSemanticCompatibility('There are many glims relative to drocks.', target, ontology);
  const fewer = scoreSemanticCompatibility('There are few glims relative to drocks.', target, ontology);
  assert.ok(more.score > fewer.score);
});

test('semantic compatibility derives relative position from a level transition', () => {
  const context = 'The zorp and the flane are on the same surface. Then the zorp is moved higher.';
  const above = scoreSemanticCompatibility(context, 'The zorp is above the flane.', ontology);
  const below = scoreSemanticCompatibility(context, 'The zorp is below the flane.', ontology);
  assert.ok(above.score > below.score);
});

test('semantic compatibility distinguishes containment motion from support independence', () => {
  const coupled = 'If Mira moves the dolmen, the cube will move too.';
  const independent = 'If Mira moves the dolmen, the cube will remain in its place.';
  assert.ok(
    scoreSemanticCompatibility(coupled, 'The cube is inside the dolmen.', ontology).score
      > scoreSemanticCompatibility(independent, 'The cube is inside the dolmen.', ontology).score,
  );
  assert.ok(
    scoreSemanticCompatibility(independent, 'The dolmen is supported by the cube.', ontology).score
      > scoreSemanticCompatibility(coupled, 'The dolmen is supported by the cube.', ontology).score,
  );
});

test('semantic compatibility updates a relation when an observer passes a landmark', () => {
  const context = 'The beacon is south of Nira. Nira reaches the beacon and exits on the other side.';
  const north = scoreSemanticCompatibility(context, 'The beacon is north of Nira.', ontology);
  const south = scoreSemanticCompatibility(context, 'The beacon is south of Nira.', ontology);
  assert.ok(north.score > south.score);
});

test('semantic compatibility aligns comparative alternatives rather than sentence position', () => {
  const context = 'Nira is less intent on visiting Pavo than visiting Luma.';
  const preferred = scoreSemanticCompatibility(context, 'Nira chooses Luma over Pavo.', ontology);
  const rejected = scoreSemanticCompatibility(context, 'Nira chooses Pavo over Luma.', ontology);
  assert.ok(preferred.score > rejected.score);
});

test('semantic compatibility preserves rental roles under renaming and paraphrase', () => {
  const context = 'Luma rents a studio to Pavo.';
  const tenant = scoreSemanticCompatibility(context, "Pavo is Luma's tenant.", ontology);
  const landlord = scoreSemanticCompatibility(context, "Pavo is Luma's landlord.", ontology);
  assert.ok(tenant.score > landlord.score);
});

test('semantic compatibility applies declared numeric constraints without entity constants', () => {
  const close = scoreSemanticCompatibility('Luma is 7 years older than Pavo.', "Pavo is Luma's sibling.", ontology);
  const distant = scoreSemanticCompatibility('Luma is 47 years older than Pavo.', "Pavo is Luma's sibling.", ontology);
  assert.ok(close.score > distant.score);
});
