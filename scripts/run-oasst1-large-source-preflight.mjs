#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  LARGE_SOURCE_PREFLIGHT_SCRIPT_PATH,
  LARGE_SOURCE_PREFLIGHT_WORKER_HEAP_LIMIT_BYTES,
  assembleLargeSourcePreflightReceipt,
  publishLargeSourcePreflight,
  runLargeSourceRemovalDrill,
  runOasst1LargeSourcePreflightReplay,
} from '../src/research/large-source-preflight.mjs';
import { createOasst1LargeSourceInputCheckpoint } from
  '../src/research/large-source-input-checkpoint.mjs';
import {
  DEFAULT_OASST1_DISCOVERY_PLAN,
  DEFAULT_OASST1_PATH,
  DEFAULT_OASST1_PROJECTION_ROOT,
  DEFAULT_OASST1_SOURCE_MANIFEST,
  DEFAULT_OASST1_VALIDATION_MEMBERSHIP,
} from '../src/research/processing-graph-scale-runner.mjs';
import { sha256 } from '../src/util.mjs';

const MAXIMUM_PEAK_RSS_BYTES = 536_870_912;
const CHECKPOINT_EVERY_SHARDS = 4;

function parseArguments(arguments_) {
  if (arguments_.length === 2 && arguments_[0] === '--output' && arguments_[1].length > 0) {
    return { mode: 'parent', output: arguments_[1] };
  }
  if (arguments_.length === 4 && arguments_[0] === '--worker'
      && ['full-a', 'full-b'].includes(arguments_[1])
      && arguments_[2] === '--worker-output' && arguments_[3].length > 0) {
    return { mode: 'worker', replayMode: arguments_[1], workerOutput: arguments_[3] };
  }
  if (arguments_.length === 2 && arguments_[0] === '--checkpoint-create'
      && arguments_[1].length > 0) {
    return { mode: 'checkpoint-create', checkpointOutput: arguments_[1] };
  }
  if (arguments_.length === 6 && arguments_[0] === '--checkpoint-restore'
      && arguments_[1].length > 0 && arguments_[2] === '--checkpoint-digest'
      && /^sha256:[0-9a-f]{64}$/u.test(arguments_[3])
      && arguments_[4] === '--worker-output' && arguments_[5].length > 0) {
    return {
      mode: 'checkpoint-restore', checkpointPath: arguments_[1],
      checkpointDigest: arguments_[3], workerOutput: arguments_[5],
    };
  }
  throw new Error(`Usage: ${LARGE_SOURCE_PREFLIGHT_SCRIPT_PATH} --output PATH`);
}

async function procPeakRssBytes(pid) {
  try {
    const status = await readFile(`/proc/${pid}/status`, 'utf8');
    const match = /^(?:VmHWM|VmRSS):\s+(\d+)\s+kB$/gmu.exec(status);
    return match ? Number(match[1]) * 1_024 : 0;
  } catch (error) {
    if (error?.code === 'ENOENT') return 0;
    throw error;
  }
}

function runChild(role, arguments_) {
  return new Promise((resolveChild, rejectChild) => {
    const workerHeapMiB = LARGE_SOURCE_PREFLIGHT_WORKER_HEAP_LIMIT_BYTES / (1_024 * 1_024);
    const child = spawn(process.execPath, [
      `--max-old-space-size=${workerHeapMiB}`,
      LARGE_SOURCE_PREFLIGHT_SCRIPT_PATH,
      ...arguments_,
    ], {
      cwd: process.cwd(), stdio: ['ignore', 'ignore', 'inherit'],
    });
    let peakRssBytes = 0;
    let sampleError = null;
    const sample = async () => {
      try {
        peakRssBytes = Math.max(peakRssBytes, await procPeakRssBytes(child.pid));
      } catch (error) {
        sampleError ??= error;
      }
    };
    void sample();
    const interval = setInterval(() => void sample(), 5);
    child.on('error', rejectChild);
    child.on('close', async (code, signal) => {
      clearInterval(interval);
      await sample();
      if (sampleError) {
        rejectChild(sampleError);
        return;
      }
      if (signal !== null || !Number.isInteger(code)) {
        rejectChild(new Error(`Preflight ${role} terminated by ${signal ?? 'unknown'}.`));
        return;
      }
      if (code !== 0) {
        rejectChild(new Error(`Preflight ${role} exited with code ${code}.`));
        return;
      }
      if (peakRssBytes < 1) {
        rejectChild(new Error(`Preflight ${role} has no parent-observed peak RSS measurement.`));
        return;
      }
      resolveChild({ role, exitCode: code, peakRssBytes });
    });
  });
}

const parsed = parseArguments(process.argv.slice(2));
if (parsed.mode === 'worker') {
  const replay = await runOasst1LargeSourcePreflightReplay({
    sourcePath: DEFAULT_OASST1_PATH,
    projectionRoot: DEFAULT_OASST1_PROJECTION_ROOT,
    validationMembershipPath: DEFAULT_OASST1_VALIDATION_MEMBERSHIP,
    sourceManifestPath: DEFAULT_OASST1_SOURCE_MANIFEST,
    discoveryPlanPath: DEFAULT_OASST1_DISCOVERY_PLAN,
    checkpointEveryShards: CHECKPOINT_EVERY_SHARDS,
    replayMode: parsed.replayMode,
  });
  await writeFile(resolve(parsed.workerOutput), `${JSON.stringify(replay)}\n`, 'utf8');
} else if (parsed.mode === 'checkpoint-create') {
  await createOasst1LargeSourceInputCheckpoint({
    sourcePath: DEFAULT_OASST1_PATH,
    projectionRoot: DEFAULT_OASST1_PROJECTION_ROOT,
    validationMembershipPath: DEFAULT_OASST1_VALIDATION_MEMBERSHIP,
    sourceManifestPath: DEFAULT_OASST1_SOURCE_MANIFEST,
    discoveryPlanPath: DEFAULT_OASST1_DISCOVERY_PLAN,
    checkpointShard: CHECKPOINT_EVERY_SHARDS,
    outputPath: parsed.checkpointOutput,
  });
} else if (parsed.mode === 'checkpoint-restore') {
  const replay = await runOasst1LargeSourcePreflightReplay({
    sourcePath: DEFAULT_OASST1_PATH,
    projectionRoot: DEFAULT_OASST1_PROJECTION_ROOT,
    validationMembershipPath: DEFAULT_OASST1_VALIDATION_MEMBERSHIP,
    sourceManifestPath: DEFAULT_OASST1_SOURCE_MANIFEST,
    discoveryPlanPath: DEFAULT_OASST1_DISCOVERY_PLAN,
    checkpointEveryShards: CHECKPOINT_EVERY_SHARDS,
    replayMode: 'input-stream-restored',
    checkpointPath: parsed.checkpointPath,
    expectedCheckpointFileDigest: parsed.checkpointDigest,
  });
  await writeFile(resolve(parsed.workerOutput), `${JSON.stringify(replay)}\n`, 'utf8');
} else {
  const started = process.hrtime.bigint();
  const temporary = await mkdtemp(join(tmpdir(), 'eslm-oasst1-preflight-'));
  try {
    const modes = ['full-a', 'full-b'];
    const paths = modes.map((mode) => join(temporary, `${mode}.json`));
    const processMeasurements = [];
    for (const [index, mode] of modes.entries()) processMeasurements.push(await runChild(mode, [
      '--worker', mode, '--worker-output', paths[index],
    ]));
    const checkpointPath = join(temporary, 'input-checkpoint.json');
    processMeasurements.push(await runChild('checkpoint-create', [
      '--checkpoint-create', checkpointPath,
    ]));
    const checkpointBytes = await readFile(checkpointPath);
    const checkpointFileDigest = `sha256:${sha256(checkpointBytes)}`;
    const restoredPath = join(temporary, 'input-stream-restored.json');
    processMeasurements.push(await runChild('checkpoint-restore', [
      '--checkpoint-restore', checkpointPath, '--checkpoint-digest', checkpointFileDigest,
      '--worker-output', restoredPath,
    ]));
    paths.push(restoredPath);
    const replays = await Promise.all(paths.map((path) =>
      readFile(path, 'utf8').then(JSON.parse)));
    const checkpoint = JSON.parse(checkpointBytes.toString('utf8'));
    const manifest = JSON.parse(await readFile(DEFAULT_OASST1_SOURCE_MANIFEST, 'utf8'));
    const removal = await runLargeSourceRemovalDrill(manifest.removalObligations);
    const command = {
      executable: process.execPath,
      arguments: [LARGE_SOURCE_PREFLIGHT_SCRIPT_PATH, '--output', parsed.output],
      workingDirectory: 'repository-root',
      scriptDigest: `sha256:${sha256(await readFile(resolve(LARGE_SOURCE_PREFLIGHT_SCRIPT_PATH)))}`,
    };
    const receipt = assembleLargeSourcePreflightReceipt({
      command,
      replays,
      inputCheckpoint: {
        format: checkpoint.format,
        checkpointFileDigest,
        checkpointReceiptDigest: checkpoint.receiptDigest,
        analysisImplementationDigest: checkpoint.implementationDigest,
        preflightImplementationDigest: checkpoint.preflightImplementationDigest,
        ...checkpoint.boundary,
      },
      maximumPeakRssBytes: MAXIMUM_PEAK_RSS_BYTES,
      elapsedMilliseconds: Number((process.hrtime.bigint() - started) / 1_000_000n),
      processMeasurements,
      removal,
    });
    const path = await publishLargeSourcePreflight(receipt, parsed.output);
    process.stdout.write(`${JSON.stringify({
      format: receipt.format,
      sourceRevision: receipt.source.sourceRevision,
      episodes: receipt.projection.episodes,
      shards: receipt.projection.shards.length,
      replayDigest: receipt.analysisReplay.firstReceiptDigest,
      peakRssBytes: receipt.streaming.peakRssBytes,
      processMeasurements: receipt.streaming.processes,
      receiptDigest: receipt.receiptDigest,
      path,
    }, null, 2)}\n`);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
