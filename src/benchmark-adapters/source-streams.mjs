import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { StringDecoder } from 'node:string_decoder';

function streamError(sourceName, message) {
  throw new Error(`${sourceName}: ${message}`);
}

export async function streamJsonObjectArray(path, descriptor, onRecord = undefined) {
  const details = await stat(path);
  if (details.size !== descriptor.bytes) {
    streamError(descriptor.name, `expected ${descriptor.bytes} bytes, received ${details.size}.`);
  }
  const digest = createHash('sha256');
  const decoder = new StringDecoder('utf8');
  const stream = createReadStream(path);
  let phase = 'before-array';
  let current = '';
  let objectDepth = 0;
  let inString = false;
  let escaped = false;
  let rows = 0;

  async function consume(text) {
    for (const character of text) {
      if (phase === 'before-array') {
        if (/\s/u.test(character)) continue;
        if (character !== '[') streamError(descriptor.name, 'expected a top-level JSON array.');
        phase = 'between-values';
        continue;
      }
      if (phase === 'between-values') {
        if (/\s/u.test(character) || character === ',') continue;
        if (character === ']') {
          phase = 'after-array';
          continue;
        }
        if (character !== '{') streamError(descriptor.name, 'expected an object array member.');
        phase = 'inside-object';
        current = '{';
        objectDepth = 1;
        inString = false;
        escaped = false;
        continue;
      }
      if (phase === 'after-array') {
        if (!/\s/u.test(character)) streamError(descriptor.name, 'unexpected data after the JSON array.');
        continue;
      }

      current += character;
      if (inString) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') {
        inString = true;
        continue;
      }
      if (character === '{') objectDepth += 1;
      if (character === '}') objectDepth -= 1;
      if (objectDepth < 0) streamError(descriptor.name, 'unbalanced object delimiter.');
      if (objectDepth !== 0) continue;

      rows += 1;
      let record;
      try {
        record = JSON.parse(current);
      } catch (error) {
        streamError(descriptor.name, `record ${rows} is invalid JSON: ${error.message}`);
      }
      await onRecord?.(record, rows);
      current = '';
      phase = 'between-values';
    }
  }

  for await (const chunk of stream) {
    digest.update(chunk);
    await consume(decoder.write(chunk));
  }
  await consume(decoder.end());
  if (phase !== 'after-array') streamError(descriptor.name, 'the JSON array ended before its closing bracket.');
  const sha256 = digest.digest('hex');
  if (sha256 !== descriptor.sha256) streamError(descriptor.name, 'SHA-256 differs from the frozen source.');
  if (rows !== descriptor.rows) {
    streamError(descriptor.name, `expected ${descriptor.rows} records, received ${rows}.`);
  }
  return Object.freeze({ rows, bytes: details.size, sha256 });
}
