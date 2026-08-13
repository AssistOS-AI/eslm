import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { frameBoundedOperation } from '../src/language/bounded-operation-framing.mjs';
import { PROCESSING_GRAPH_CATALOG } from '../src/processing-graph/index.mjs';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const GENERIC_PRODUCT_FILES = Object.freeze([
  'src/language/bounded-operation-framing.mjs',
  'src/language/supplied-text-operation-framing.mjs',
  'src/reasoning/deterministic-value-operations.mjs',
  'src/reasoning/supplied-text-operations.mjs',
  'src/reasoning/grounded-knowledge-inspection.mjs',
  'src/runtime/bounded-operation-processing.mjs',
  'src/processing-graph/runtime-processing-graph.mjs',
  'src/processing-graph/processing-graph-catalog.mjs',
  'src/processing-graph/processing-graph-packet-catalog.mjs',
]);

test('bounded-operation product identities do not inherit evaluation vocabulary', async () => {
  for (const path of GENERIC_PRODUCT_FILES) {
    const source = await readFile(resolve(ROOT, path), 'utf8');
    assert.doesNotMatch(source, /everyday/iu, path);
  }
  for (const obsoletePath of [
    'src/language/everyday-task-framing.mjs',
    'src/reasoning/everyday-deterministic-operations.mjs',
    'src/reasoning/everyday-knowledge-inspection.mjs',
    'src/runtime/everyday-task-processing.mjs',
  ]) await assert.rejects(access(resolve(ROOT, obsoletePath)), { code: 'ENOENT' });
});

test('bounded operation frames expose a source-bound generic packet shape', () => {
  const frame = frameBoundedOperation('What is 17 plus 9?');
  assert.equal(frame.format, 'eslm-bounded-operation-frame');
  assert.equal(frame.operation, 'scalar-arithmetic');
  assert.deepEqual(frame.inputs, { left: 17, operator: 'plus', right: 9 });
  assert.match(frame.sourceTextDigest, /^[a-f0-9]{64}$/u);
  assert.equal(frameBoundedOperation('What is 18 plus 9?').sourceTextDigest === frame.sourceTextDigest, false);
});

test('bounded operation nodes remain in their generic responsibility circuits', () => {
  const circuitByNode = Object.fromEntries(PROCESSING_GRAPH_CATALOG.nodes.map((node) =>
    [node.nodeId, node.circuitId]));
  assert.deepEqual({
    framer: circuitByNode['node:runtime:request-operation-framer'],
    deterministic: circuitByNode['node:runtime:deterministic-value-executor'],
    suppliedText: circuitByNode['node:runtime:supplied-text-operator'],
    knowledge: circuitByNode['node:runtime:grounded-knowledge-inspector'],
    assembly: circuitByNode['node:runtime:typed-operation-result-assembler'],
  }, {
    framer: 'circuit:runtime:request-session',
    deterministic: 'circuit:runtime:method-selection',
    suppliedText: 'circuit:runtime:method-selection',
    knowledge: 'circuit:runtime:knowledge-routing',
    assembly: 'circuit:runtime:grounded-response-construction',
  });
  assert.equal(PROCESSING_GRAPH_CATALOG.circuits.some((circuit) =>
    /everyday/iu.test(circuit.circuitId)), false);
});
