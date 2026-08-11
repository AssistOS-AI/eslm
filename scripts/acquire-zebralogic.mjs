import { createWriteStream } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { finished } from 'node:stream/promises';
import { PROJECT_ROOT } from '../src/paths.mjs';

const DATASET = 'allenai/ZebraLogicBench';
const REVISION = '2f94a445d7079f20146f5443e2606049de8543e0';
const EXPECTED = Object.freeze({ grid_mode: 1_000, mc_mode: 3_259 });
const OUTPUT_DIRECTORY = join(PROJECT_ROOT, 'training/.cache/benchmarks/zebralogic/derived');

function requireCondition(condition, message) {
  if (!condition) throw new Error(`ZebraLogic acquisition: ${message}`);
}

async function assertCurrentRevision() {
  const response = await fetch(`https://huggingface.co/api/datasets/${DATASET}`);
  requireCondition(response.ok, `dataset metadata request failed with HTTP ${response.status}.`);
  const metadata = await response.json();
  requireCondition(metadata.sha === REVISION,
    `expected dataset revision ${REVISION}, received ${metadata.sha ?? 'no revision'}.`);
}

async function acquireConfig(config) {
  const expected = EXPECTED[config];
  const output = join(OUTPUT_DIRECTORY, `${config}-${REVISION}.jsonl`);
  const temporary = `${output}.partial`;
  await mkdir(dirname(output), { recursive: true });
  await rm(temporary, { force: true });
  const stream = createWriteStream(temporary, { encoding: 'utf8', flags: 'wx' });
  let offset = 0;
  try {
    while (offset < expected) {
      const length = Math.min(100, expected - offset);
      const parameters = new URLSearchParams({
        dataset: DATASET,
        config,
        split: 'test',
        offset: String(offset),
        length: String(length),
      });
      const response = await fetch(`https://datasets-server.huggingface.co/rows?${parameters}`);
      requireCondition(response.ok,
        `${config} rows ${offset}-${offset + length - 1} failed with HTTP ${response.status}.`);
      const payload = await response.json();
      requireCondition(payload.rows?.length === length,
        `${config} rows ${offset}-${offset + length - 1} returned ${payload.rows?.length ?? 'no'} rows.`);
      for (const item of payload.rows) {
        requireCondition(Number.isInteger(item.row_idx) && item.row_idx === offset,
          `${config} expected row index ${offset}, received ${item.row_idx}.`);
        requireCondition(item.row && typeof item.row === 'object' && !Array.isArray(item.row),
          `${config} row ${offset} is not an object.`);
        if (!stream.write(`${JSON.stringify(item.row)}\n`)) {
          await new Promise((resolve) => stream.once('drain', resolve));
        }
        offset += 1;
      }
    }
    stream.end();
    await finished(stream);
    await rename(temporary, output);
    return output;
  } catch (error) {
    stream.destroy();
    await rm(temporary, { force: true });
    throw error;
  }
}

await assertCurrentRevision();
for (const config of Object.keys(EXPECTED)) {
  const output = await acquireConfig(config);
  process.stdout.write(`${config}: ${output}\n`);
}
await assertCurrentRevision();
