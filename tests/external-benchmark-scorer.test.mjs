import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importComparison, scoreExternalPredictions } from '../src/benchmarks.mjs';
import { hashFile, sha256 } from '../src/util.mjs';

const promptText = 'Answer each exported benchmark case without access to its oracle.';

function protocolMetadata(overrides = {}) {
  return {
    format: 'eslm-external-protocol-metadata-v1',
    model: { id: 'fixture-model', revision: 'revision-7', quantization: 'not-disclosed' },
    prompt: { text: promptText, sha256: sha256(promptText) },
    contextWindowTokens: 32_768,
    decoding: { temperature: 0, topP: 1 },
    tools: [],
    retrieval: { enabled: false, description: 'No tools or retrieval were available.' },
    hardware: 'Hosted API; provider hardware was not disclosed.',
    cost: { amount: null, currency: 'USD', basis: 'Not measured for this fixture.' },
    evidenceRegime: 'closed-evidence',
    ...overrides,
  };
}

async function fixtureFiles(predictions) {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-external-scorer-'));
  const suitePath = join(directory, 'suite.jsonl');
  const predictionsPath = join(directory, 'predictions.jsonl');
  const outputPath = join(directory, 'report.json');
  const suite = [
    { id: 'qa-1', kind: 'qa', text: 'Name the token.', answer: 'dax' },
    { id: 'pref-1', kind: 'preference', good: 'A dax glims.', bad: 'A dax glim.' },
    { id: 'qa-missing', kind: 'qa', text: 'Name the other token.', answer: 'wug' },
  ];
  await writeFile(suitePath, `${suite.map((item) => JSON.stringify(item)).join('\n')}\n`, 'utf8');
  await writeFile(predictionsPath, `${predictions.map((item) => JSON.stringify(item)).join('\n')}\n`, 'utf8');
  return { suitePath, predictionsPath, outputPath };
}

function expectedPreferenceChoice(id) {
  return Number.parseInt(sha256(id).slice(0, 2), 16) % 2 === 1 ? 1 : 0;
}

test('external scorer binds protocol and prediction digests while counting missing IDs as failures', async () => {
  const predictions = [
    { id: 'qa-1', answer: 'Dax' },
    { id: 'pref-1', choice: expectedPreferenceChoice('pref-1') },
  ];
  const files = await fixtureFiles(predictions);
  const metadata = protocolMetadata();
  const report = await scoreExternalPredictions(
    files.suitePath, files.predictionsPath, metadata, files.outputPath,
  );

  assert.equal(report.format, 'eslm-external-comparison-report-v2');
  assert.deepEqual(report.protocolMetadata, metadata);
  assert.deepEqual(report.predictions, {
    sha256: await hashFile(files.predictionsPath),
    submitted: 2,
    matched: 2,
    missing: 1,
    duplicates: 0,
    extra: 0,
  });
  assert.deepEqual({ total: report.total, correct: report.correct, accuracy: report.accuracy }, {
    total: 3, correct: 2, accuracy: 2 / 3,
  });
  assert.deepEqual(report.results[2], {
    id: 'qa-missing', pass: false, diagnostic: 'missing-prediction',
  });
  assert.deepEqual(JSON.parse(await readFile(files.outputPath, 'utf8')), report);
});

test('external scorer rejects duplicate and extra prediction IDs', async () => {
  const duplicate = await fixtureFiles([
    { id: 'qa-1', answer: 'dax' },
    { id: 'qa-1', answer: 'dax' },
  ]);
  await assert.rejects(
    scoreExternalPredictions(
      duplicate.suitePath, duplicate.predictionsPath, protocolMetadata(), duplicate.outputPath,
    ),
    /duplicate case ID: qa-1/u,
  );

  const extra = await fixtureFiles([{ id: 'not-in-suite', answer: 'dax' }]);
  await assert.rejects(
    scoreExternalPredictions(extra.suitePath, extra.predictionsPath, protocolMetadata(), extra.outputPath),
    /IDs absent from the benchmark suite: not-in-suite/u,
  );
});

test('external scorer requires preference choices to be numeric integers in the exported domain', async () => {
  for (const invalidChoice of ['0', false, -1, 2, 0.5]) {
    const files = await fixtureFiles([{ id: 'pref-1', choice: invalidChoice }]);
    await assert.rejects(
      scoreExternalPredictions(files.suitePath, files.predictionsPath, protocolMetadata(), files.outputPath),
      /choice must be the numeric integer 0 or 1/u,
    );
  }
});

test('external scorer enforces the case-specific prediction shape without coercion', async () => {
  const numericAnswer = await fixtureFiles([{ id: 'qa-1', answer: 7 }]);
  await assert.rejects(
    scoreExternalPredictions(
      numericAnswer.suitePath, numericAnswer.predictionsPath, protocolMetadata(), numericAnswer.outputPath,
    ),
    /answer must be a string/u,
  );
  const extraField = await fixtureFiles([{
    id: 'pref-1', choice: expectedPreferenceChoice('pref-1'), confidence: 1,
  }]);
  await assert.rejects(
    scoreExternalPredictions(
      extraField.suitePath, extraField.predictionsPath, protocolMetadata(), extraField.outputPath,
    ),
    /contains unsupported fields: confidence/u,
  );
});

test('external scorer rejects incomplete or internally inconsistent protocol metadata', async () => {
  const files = await fixtureFiles([]);
  await assert.rejects(
    scoreExternalPredictions(files.suitePath, files.predictionsPath, 'fixture-model', files.outputPath),
    /External protocol metadata must be an object/u,
  );
  await assert.rejects(
    scoreExternalPredictions(
      files.suitePath, files.predictionsPath, protocolMetadata({ hardware: undefined }), files.outputPath,
    ),
    /protocol metadata\.hardware must be a non-empty string/ui,
  );
  await assert.rejects(
    scoreExternalPredictions(files.suitePath, files.predictionsPath, protocolMetadata({
      prompt: { text: promptText, sha256: '0'.repeat(64) },
    }), files.outputPath),
    /prompt\.sha256 does not match prompt\.text/u,
  );
  await assert.rejects(
    scoreExternalPredictions(files.suitePath, files.predictionsPath, protocolMetadata({
      untrackedSetting: true,
    }), files.outputPath),
    /contains unsupported fields: untrackedSetting/u,
  );
});

function importedResultManifest(overrides = {}) {
  return {
    format: 'eslm-external-result-manifest-v1',
    model: { id: 'published-system', revision: 'paper-checkpoint-1' },
    protocol: {
      id: 'published-evaluation-v1', inputRoute: 'raw-language',
      scorer: 'strict source-owner exact match', tools: [],
    },
    dataset: { id: 'fixture-suite', revision: 'release-1', split: 'test', sha256: null },
    metrics: [{
      id: 'accuracy', value: 0.75, unit: 'ratio', direction: 'higher-is-better',
      numerator: 3, denominator: 4,
    }],
    source: { citation: 'Fixture publication', url: 'https://example.test/publication' },
    evidenceRegime: 'published aggregate copied from a primary source',
    limitations: ['The exact dataset bytes were not published.'],
    ...overrides,
  };
}

test('aggregate result import is schema-bound, content-addressed, and never auto-promoted to comparable', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-external-import-'));
  const inputPath = join(directory, 'result.json');
  const outputPath = join(directory, 'receipt.json');
  const manifest = importedResultManifest();
  const sourceText = `${JSON.stringify(manifest, null, 2)}\n`;
  await writeFile(inputPath, sourceText, 'utf8');

  const receipt = await importComparison(inputPath, outputPath);
  assert.equal(receipt.format, 'eslm-external-result-import-receipt-v2');
  assert.equal(receipt.input.sha256, sha256(sourceText));
  assert.equal(receipt.comparability, 'reference-only-unverified-aggregate');
  assert.deepEqual(receipt.manifest, manifest);
  assert.deepEqual(JSON.parse(await readFile(outputPath, 'utf8')), receipt);
});

test('aggregate result import rejects shallow manifests and inconsistent metric arithmetic', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-external-import-invalid-'));
  const inputPath = join(directory, 'result.json');
  const outputPath = join(directory, 'receipt.json');
  await writeFile(inputPath, JSON.stringify({
    model: 'fixture', protocol: 'eslm-native-v1', datasetSha256: 'x', metrics: {},
    evidenceRegime: 'unspecified',
  }), 'utf8');
  await assert.rejects(importComparison(inputPath, outputPath), /unsupported fields|\.format must be/u);

  const inconsistent = importedResultManifest({
    metrics: [{
      id: 'accuracy', value: 0.9, unit: 'ratio', direction: 'higher-is-better',
      numerator: 3, denominator: 4,
    }],
  });
  await writeFile(inputPath, JSON.stringify(inconsistent), 'utf8');
  await assert.rejects(importComparison(inputPath, outputPath), /does not match its numerator and denominator/u);
});
