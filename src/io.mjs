import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createInterface } from 'node:readline';

export async function readJsonLines(path) {
  const records = [];
  const stream = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  let lineNumber = 0;
  for await (const line of stream) {
    lineNumber += 1;
    if (!line.trim()) continue;
    try {
      records.push(JSON.parse(line));
    } catch (error) {
      throw new Error(`${path}:${lineNumber}: invalid JSON: ${error.message}`);
    }
  }
  return records;
}

export async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function writeJsonLines(path, records) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${records.map((record) => JSON.stringify(record)).join('\n')}\n`, 'utf8');
}

export async function readBatch(path) {
  const text = await readFile(path, 'utf8');
  const lines = text.split(/\r?\n/u).filter((line) => line.trim());
  if (path.endsWith('.jsonl')) return lines.map((line, index) => {
    try { return JSON.parse(line); } catch (error) { throw new Error(`${path}:${index + 1}: ${error.message}`); }
  });
  return lines.map((line, index) => ({ id: String(index + 1), text: line }));
}
