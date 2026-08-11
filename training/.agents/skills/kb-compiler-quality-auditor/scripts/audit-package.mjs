#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const manifestPath = resolve(process.argv[2]);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (manifest.format !== 'eslm-kb-package-v1' || manifest.manifestType !== 'knowledgeBasePackage') throw new Error('Invalid package manifest.');
const root = dirname(manifestPath);
const shards = JSON.parse(await readFile(join(root, manifest.shardDirectoryRef), 'utf8'));
const ids = new Set();
let records = 0;
let bytes = 0;
for (const shard of shards) {
  if (ids.has(shard.shardId)) throw new Error(`Duplicate shard ${shard.shardId}.`);
  ids.add(shard.shardId);
  if (!/^(?:segments|synsets|lemmas|events)\/[a-z0-9-]+\.json$/u.test(shard.dataRef)) throw new Error(`Unsafe dataRef ${shard.dataRef}.`);
  const value = await readFile(join(root, shard.dataRef));
  const digest = createHash('sha256').update(value).digest('hex');
  if (`sha256:${digest}` !== shard.checksum) throw new Error(`Checksum mismatch for ${shard.shardId}.`);
  const parsed = JSON.parse(value);
  const count = Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length;
  if (count !== shard.recordCount) throw new Error(`Record count mismatch for ${shard.shardId}.`);
  records += count;
  bytes += value.length;
}
process.stdout.write(`${JSON.stringify({ valid: true, kbId: manifest.kbId, version: manifest.kbVersion, shards: shards.length, records, bytes }, null, 2)}\n`);
