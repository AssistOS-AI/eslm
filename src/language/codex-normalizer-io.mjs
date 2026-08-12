import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, open, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { stableStringify } from '../util.mjs';
import {
  CODEX_NORMALIZATION_POLICY,
  CODEX_NORMALIZATION_PROTOCOL,
  CODEX_NORMALIZATION_VALIDATOR,
  DEFAULT_CODEX_NORMALIZATION_MODEL,
} from './codex-normalization-contract.mjs';
import { validateCodexNormalization } from './codex-normalization-validation.mjs';

export const MAX_NORMALIZER_PROCESS_STREAM_BYTES = 2 * 1024 * 1024;
export const MAX_NORMALIZER_RESPONSE_FILE_BYTES = 1024 * 1024;
export const MAX_NORMALIZER_CACHE_FILE_BYTES = 4 * 1024 * 1024;
export const NORMALIZER_TERMINATION_GRACE_MS = 250;
export const NORMALIZATION_CACHE_FORMAT = 'eslm-language-agent-normalization-cache-v3';

export function normalizationSha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function codexEnvironment(environment = process.env) {
  const allowed = [
    'PATH', 'HOME', 'CODEX_HOME', 'LANG', 'LC_ALL', 'TERM', 'TMPDIR',
    'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME', 'XDG_RUNTIME_DIR',
  ];
  return Object.fromEntries(allowed
    .filter((name) => environment[name] !== undefined)
    .map((name) => [name, environment[name]]));
}

export function codexNormalizationInvocation(workspace, options = {}) {
  const model = options.model ?? DEFAULT_CODEX_NORMALIZATION_MODEL;
  return Object.freeze({
    command: options.command ?? 'codex',
    model,
    args: Object.freeze([
      '--ask-for-approval', 'never', 'exec', '--ephemeral', '--ignore-user-config', '--ignore-rules',
      '--sandbox', 'read-only', '--disable', 'shell_tool', '--disable', 'browser_use', '--disable',
      'browser_use_external', '--cd', resolve(workspace), '--skip-git-repo-check', '--model', model,
      '--config', 'model_reasoning_effort="low"', '--output-schema', resolve(workspace, 'response-schema.json'),
      '--output-last-message', resolve(workspace, 'response.json'), '--color', 'never', '--json', '-',
    ]),
  });
}

export async function spawnBoundedNormalizer(command, args, { cwd, input, timeoutMs }) {
  const child = spawn(command, args, {
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: codexEnvironment(),
  });
  const output = { stdout: [], stderr: [], stdoutBytes: 0, stderrBytes: 0 };
  let terminationReason;
  let graceTimer;
  let settlementTimer;
  let requestTermination;
  let terminationEscalated = false;
  let outputLimitExceeded = false;
  function capture(streamName, chunk) {
    const bytesName = `${streamName}Bytes`;
    const remaining = MAX_NORMALIZER_PROCESS_STREAM_BYTES - output[bytesName];
    if (remaining > 0) {
      const accepted = chunk.subarray(0, remaining);
      output[streamName].push(accepted);
      output[bytesName] += accepted.length;
    }
    if (chunk.length > remaining) {
      outputLimitExceeded = true;
      child.stdout.pause();
      child.stderr.pause();
      requestTermination('output-limit');
    }
  }
  const completion = new Promise((accept, reject) => {
    let settled = false;
    const timeoutTimer = setTimeout(() => requestTermination('timeout'), timeoutMs);
    const clearTimers = () => [timeoutTimer, graceTimer, settlementTimer].forEach(clearTimeout);
    function finish(exitCode, terminationSignal) {
      if (settled) return;
      settled = true;
      clearTimers();
      accept({ exitCode, terminationSignal });
    }
    requestTermination = (reason) => {
      if (terminationReason) return;
      terminationReason = reason;
      child.kill('SIGTERM');
      graceTimer = setTimeout(() => {
        terminationEscalated = true;
        child.kill('SIGKILL');
        settlementTimer = setTimeout(
          () => finish(null, 'SIGKILL'),
          NORMALIZER_TERMINATION_GRACE_MS,
        );
      }, NORMALIZER_TERMINATION_GRACE_MS);
    };
    child.once('error', (error) => {
      clearTimers();
      reject(error);
    });
    child.once('close', finish);
  });
  child.stdout.on('data', (chunk) => capture('stdout', chunk));
  child.stderr.on('data', (chunk) => capture('stderr', chunk));
  child.stdin.on('error', () => {});
  child.stdin.end(input);
  const completed = await completion;
  child.stdout.destroy();
  child.stderr.destroy();
  return {
    ...completed,
    stdout: Buffer.concat(output.stdout, output.stdoutBytes),
    stderr: Buffer.concat(output.stderr, output.stderrBytes),
    stdoutBytes: output.stdoutBytes,
    stderrBytes: output.stderrBytes,
    stdoutTruncated: outputLimitExceeded && output.stdoutBytes === MAX_NORMALIZER_PROCESS_STREAM_BYTES,
    stderrTruncated: outputLimitExceeded && output.stderrBytes === MAX_NORMALIZER_PROCESS_STREAM_BYTES,
    outputLimitExceeded,
    outputLimitBytes: MAX_NORMALIZER_PROCESS_STREAM_BYTES,
    timedOut: terminationReason === 'timeout',
    terminationReason,
    terminationEscalated,
  };
}

export async function readNormalizerJsonBounded(path, byteLimit) {
  const file = await open(path, 'r');
  try {
    const metadata = await file.stat();
    if (!metadata.isFile()) {
      throw Object.assign(new Error('bounded JSON path is not a regular file'), { code: 'EINVAL' });
    }
    if (metadata.size > byteLimit) {
      const details = { code: 'EFBIG', observedBytes: metadata.size, byteLimit };
      throw Object.assign(new Error(`JSON file exceeds ${byteLimit} bytes`), details);
    }
    const buffer = Buffer.alloc(Math.min(metadata.size + 1, byteLimit + 1));
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      const part = await file.read(buffer, bytesRead, buffer.length - bytesRead, bytesRead);
      if (part.bytesRead === 0) break;
      bytesRead += part.bytesRead;
    }
    if (bytesRead > byteLimit) {
      const details = { code: 'EFBIG', observedBytes: bytesRead, byteLimit };
      throw Object.assign(new Error(`JSON file exceeds ${byteLimit} bytes`), details);
    }
    const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, bytesRead));
    return { value: JSON.parse(text), bytes: bytesRead };
  } finally {
    await file.close();
  }
}

export function normalizationCacheKey(input, options) {
  return normalizationSha256(stableStringify({
    inputSha256: normalizationSha256(input),
    model: options.model,
    reasoningEffort: 'low',
    policy: CODEX_NORMALIZATION_POLICY,
    protocol: CODEX_NORMALIZATION_PROTOCOL,
    validator: CODEX_NORMALIZATION_VALIDATOR,
    requestedOperation: options.requestedOperation,
  }));
}

export async function readNormalizationCache(path, expectedKey, input, route) {
  try {
    const { value } = await readNormalizerJsonBounded(path, MAX_NORMALIZER_CACHE_FILE_BYTES);
    if (value.format !== NORMALIZATION_CACHE_FORMAT || value.cacheKey !== expectedKey) {
      return { status: 'invalid' };
    }
    const validation = validateCodexNormalization(input, value.candidate, {
      expectedOperation: route.operation,
      operationConfidence: route.confidence,
    });
    if (!validation.accepted) {
      return {
        status: 'invalid',
        diagnostic: 'Normalization cache candidate failed host validation and was ignored.',
      };
    }
    return { status: 'hit', value: { ...value, validation, cacheHit: true } };
  } catch (error) {
    if (error.code === 'ENOENT') return { status: 'miss' };
    if (error.code === 'EFBIG') {
      return {
        status: 'oversized',
        diagnostic: `Normalization cache entry exceeds ${MAX_NORMALIZER_CACHE_FILE_BYTES} UTF-8 bytes.`,
      };
    }
    return { status: 'invalid', diagnostic: 'Normalization cache entry is invalid and was ignored.' };
  }
}

export async function writeNormalizationCache(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  if (Buffer.byteLength(serialized, 'utf8') > MAX_NORMALIZER_CACHE_FILE_BYTES) return false;
  await writeFile(temporary, serialized, 'utf8');
  await rename(temporary, path);
  return true;
}
