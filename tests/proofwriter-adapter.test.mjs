import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadProofWriterDevelopmentPool,
  parseProofWriterLiteral,
  parseProofWriterRule,
  runProofWriterDevelopmentBaseline,
} from '../src/benchmark-adapters/proofwriter.mjs';

function sourceRecord(depth) {
  return {
    id: `Nonce-OWA-D${depth}-1`,
    maxD: depth,
    NFact: 1,
    NRule: 1,
    theory: 'The quartz is bright. If something is bright then it is calm.',
    triples: {
      triple1: { text: 'The quartz is bright.', representation: '("quartz" "is" "bright" "+")' },
    },
    rules: {
      rule1: {
        text: 'If something is bright then it is calm.',
        representation: '((("something" "is" "bright" "+")) -> ("something" "is" "calm" "+"))',
      },
    },
    questions: {
      Q1: {
        question: 'The quartz is calm.', answer: true, QDep: 1, QLen: 2, strategy: 'proof',
        proofs: '[((triple1) -> rule1)]', representation: '("quartz" "is" "calm" "+")',
      },
      Q2: {
        question: 'The quartz is not calm.', answer: false, QDep: 1, QLen: 2, strategy: 'inv-proof',
        proofs: '[((triple1) -> rule1)]', representation: '("quartz" "is" "calm" "-")',
      },
      Q3: {
        question: 'The quartz is rough.', answer: 'Unknown', QDep: 0, QLen: '', strategy: 'random',
        proofs: '[(FAIL)]', representation: '("quartz" "is" "rough" "+")',
      },
    },
    allProofs: '@0: bright. @1: calm.',
    proofDetails: [],
  };
}

async function developmentTree() {
  const root = await mkdtemp(join(tmpdir(), 'eslm-proofwriter-'));
  for (const depth of [0, 1, 2, 3, 5]) {
    const directory = join(root, 'OWA', `depth-${depth}`);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'meta-dev.jsonl'), `${JSON.stringify(sourceRecord(depth))}\n`, 'utf8');
  }
  return root;
}

test('ProofWriter representations compile literals and multi-premise rules without evaluating source text', () => {
  assert.deepEqual(parseProofWriterLiteral('("opal" "visits" "harbor" "-")'), {
    subject: 'opal', relation: 'visits', object: 'harbor', polarity: '-',
  });
  assert.deepEqual(
    parseProofWriterRule(
      '((("someone" "is" "bright" "+") ("someone" "is" "quiet" "+"))'
      + ' -> ("someone" "is" "calm" "+"))',
    ),
    {
      when: [
        { subject: 'someone', relation: 'is', object: 'bright', polarity: '+' },
        { subject: 'someone', relation: 'is', object: 'quiet', polarity: '+' },
      ],
      then: { subject: 'someone', relation: 'is', object: 'calm', polarity: '+' },
    },
  );
  assert.throws(() => parseProofWriterLiteral('("opal" "is" "bright")'), /four quoted terms/u);
});

test('ProofWriter development pool returns label-free cases while the host-only scorer retains the oracle', async () => {
  const root = await developmentTree();
  const pool = await loadProofWriterDevelopmentPool(root, { perStratum: 1 });
  assert.equal(pool.available, 15);
  assert.equal(pool.cases.length, 15);
  assert.equal(pool.oracle, 'host-only-not-returned');
  assert.equal(pool.cases.some((item) => Object.hasOwn(item, 'answer')), false);
  assert.equal(JSON.stringify(pool.cases).includes('"oracle"'), false);

  const baseline = await runProofWriterDevelopmentBaseline(undefined, root, { perStratum: 1 });
  assert.equal(baseline.tested, 15);
  assert.equal(baseline.available, 15);
  assert.equal(baseline.correct, 15);
  assert.equal(baseline.proofValid, 15);
  assert.equal(baseline.runtimeProfile, 'direct-symbolic-no-coding-agent');
});

test('ProofWriter stable stratification is independent of source row ordering', async () => {
  const root = await developmentTree();
  const first = await loadProofWriterDevelopmentPool(root, { perStratum: 1 });
  const second = await loadProofWriterDevelopmentPool(root, { perStratum: 1 });
  assert.deepEqual(first.cases.map((item) => item.id), second.cases.map((item) => item.id));
  assert.deepEqual(first.availableByStratum, second.availableByStratum);
});
