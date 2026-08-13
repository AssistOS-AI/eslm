import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  assertBenchmarkBehaviorIdentity,
  assertMatchingBenchmarkBehaviorIdentity,
  benchmarkBehaviorIdentity,
} from '../src/evaluation/benchmark-execution-identity.mjs';

test('benchmark behavior identity binds the executable source tree and declares its scope', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'eslm-behavior-identity-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'src', 'nested'), { recursive: true });
  await writeFile(join(root, 'package.json'), '{"type":"module"}\n');
  await writeFile(join(root, 'src', 'a.mjs'), 'export const value = 1;\n');
  await writeFile(join(root, 'src', 'nested', 'ignored.txt'), 'not executable\n');

  const first = await benchmarkBehaviorIdentity({ root });
  const repeated = await benchmarkBehaviorIdentity({ root });
  assert.deepEqual(first, repeated);
  assert.deepEqual(first.scope, {
    roots: ['src'], explicitFiles: ['package.json'], includedExtension: '.mjs',
  });
  assert.equal(first.files, 2);
  assert.match(first.digest, /^[a-f0-9]{64}$/u);
  assert.equal(assertBenchmarkBehaviorIdentity(first), first);
  assert.equal(assertMatchingBenchmarkBehaviorIdentity(first, repeated), first);

  await writeFile(join(root, 'src', 'a.mjs'), 'export const value = 2;\n');
  const changed = await benchmarkBehaviorIdentity({ root });
  assert.notEqual(changed.digest, first.digest);
  assert.throws(
    () => assertMatchingBenchmarkBehaviorIdentity(first, changed, 'Fixture report'),
    /different source or runtime checkpoint/u,
  );

  const extraField = structuredClone(first);
  extraField.unreviewed = true;
  assert.throws(() => assertBenchmarkBehaviorIdentity(extraField), /must contain exactly/u);
  const weakDigest = structuredClone(first);
  weakDigest.digest = `sha256:${first.digest}`;
  assert.throws(() => assertBenchmarkBehaviorIdentity(weakDigest), /raw lowercase SHA-256/u);
});
