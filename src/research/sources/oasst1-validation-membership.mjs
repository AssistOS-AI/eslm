import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { finished } from 'node:stream/promises';
import { sha256, stableStringify } from '../../util.mjs';

export const OASST1_VALIDATION_MEMBERSHIP_PROTOCOL =
  'eslm-oasst1-validation-tree-membership-v1';

export const OASST1_VALIDATION_SOURCE = Object.freeze({
  dataset: 'OpenAssistant/oasst1',
  revision: 'fdf72ae0827c1cda404aff25b6603abec9e3399b',
  split: 'validation',
  parquetUrl: 'https://huggingface.co/datasets/OpenAssistant/oasst1/resolve/'
    + 'fdf72ae0827c1cda404aff25b6603abec9e3399b/data/'
    + 'validation-00000-of-00001-134b8fd0c89408b6.parquet',
  parquetSha256: 'sha256:24002597bb13a7edd42d92f773762f25e285f72c31a70449393d0ded1dc7b416',
  parquetBytes: 2_080_179,
  messageCount: 4_401,
  treeCount: 518,
  membershipDigest: 'sha256:d63e95578b04b0f7149e0739d98faaac362dc52989c9a285a0fe7610cceaa568',
  receiptSha256: 'sha256:f3336302578736b99a75b9b06d41fef9677680979c367941719d57f485ea91ff',
});

const TREE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const PAGE_SIZE = 100;

function exactKeys(value, keys, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
      || stableStringify(Object.keys(value).toSorted()) !== stableStringify([...keys].toSorted())) {
    throw new TypeError(`${path} must contain exactly: ${keys.join(', ')}.`);
  }
}

function membershipDigest(treeIds) {
  return `sha256:${sha256(stableStringify({
    protocol: OASST1_VALIDATION_MEMBERSHIP_PROTOCOL,
    sourceRevision: `oasst1@${OASST1_VALIDATION_SOURCE.revision}`,
    split: OASST1_VALIDATION_SOURCE.split,
    parquetSha256: OASST1_VALIDATION_SOURCE.parquetSha256,
    parquetBytes: OASST1_VALIDATION_SOURCE.parquetBytes,
    messageCount: OASST1_VALIDATION_SOURCE.messageCount,
    treeIds,
  }))}`;
}

export function assertOasst1ValidationMembership(value) {
  exactKeys(value, [
    'format', 'sourceRevision', 'split', 'parquet', 'rowsApi', 'messageCount', 'treeCount',
    'treeIds', 'membershipDigest',
  ], 'OASST1 validation membership');
  if (value.format !== OASST1_VALIDATION_MEMBERSHIP_PROTOCOL
      || value.sourceRevision !== `oasst1@${OASST1_VALIDATION_SOURCE.revision}`
      || value.split !== OASST1_VALIDATION_SOURCE.split) {
    throw new TypeError('OASST1 validation membership source identity is invalid.');
  }
  exactKeys(value.parquet, ['url', 'sha256', 'bytes', 'mediaType'],
    'OASST1 validation membership parquet');
  if (value.parquet.url !== OASST1_VALIDATION_SOURCE.parquetUrl
      || value.parquet.sha256 !== OASST1_VALIDATION_SOURCE.parquetSha256
      || value.parquet.bytes !== OASST1_VALIDATION_SOURCE.parquetBytes
      || value.parquet.mediaType !== 'application/vnd.apache.parquet') {
    throw new TypeError('OASST1 validation membership parquet identity is invalid.');
  }
  exactKeys(value.rowsApi, ['dataset', 'config', 'split', 'revision', 'pageSize'],
    'OASST1 validation membership rows API');
  if (value.rowsApi.dataset !== OASST1_VALIDATION_SOURCE.dataset
      || value.rowsApi.config !== 'default'
      || value.rowsApi.split !== OASST1_VALIDATION_SOURCE.split
      || value.rowsApi.revision !== OASST1_VALIDATION_SOURCE.revision
      || value.rowsApi.pageSize !== PAGE_SIZE) {
    throw new TypeError('OASST1 validation membership rows API identity is invalid.');
  }
  if (value.messageCount !== OASST1_VALIDATION_SOURCE.messageCount
      || value.treeCount !== OASST1_VALIDATION_SOURCE.treeCount
      || !Array.isArray(value.treeIds) || value.treeIds.length !== value.treeCount
      || value.treeIds.some((treeId) => typeof treeId !== 'string' || !TREE_ID.test(treeId))
      || stableStringify(value.treeIds) !== stableStringify([...new Set(value.treeIds)].toSorted())) {
    throw new TypeError('OASST1 validation membership tree identities are not canonical.');
  }
  if (!DIGEST.test(value.membershipDigest)
      || value.membershipDigest !== OASST1_VALIDATION_SOURCE.membershipDigest
      || value.membershipDigest !== membershipDigest(value.treeIds)) {
    throw new TypeError('OASST1 validation membership digest is invalid.');
  }
  return value;
}

export async function loadOasst1ValidationMembership(path) {
  const bytes = await readFile(resolve(path));
  if (`sha256:${sha256(bytes)}` !== OASST1_VALIDATION_SOURCE.receiptSha256) {
    throw new Error('OASST1 validation membership receipt bytes differ from the frozen identity.');
  }
  const value = JSON.parse(bytes.toString('utf8'));
  assertOasst1ValidationMembership(value);
  return Object.freeze({
    ...value,
    treeIds: Object.freeze([...value.treeIds]),
  });
}

async function fileIdentity(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  const file = await stat(path);
  return { sha256: `sha256:${hash.digest('hex')}`, bytes: file.size };
}

async function downloadPinnedParquet(path, fetchImpl) {
  try {
    const identity = await fileIdentity(path);
    if (identity.sha256 === OASST1_VALIDATION_SOURCE.parquetSha256
        && identity.bytes === OASST1_VALIDATION_SOURCE.parquetBytes) return identity;
    throw new Error('cached validation parquet differs from its pinned identity');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const response = await fetchImpl(OASST1_VALIDATION_SOURCE.parquetUrl);
  if (!response.ok || !response.body) {
    throw new Error(`OASST1 validation parquet download failed with HTTP ${response.status}.`);
  }
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.partial`;
  await rm(temporary, { force: true });
  const output = createWriteStream(temporary, { flags: 'wx' });
  const reader = response.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!output.write(value)) await new Promise((resolveDrain) => output.once('drain', resolveDrain));
    }
    output.end();
    await finished(output);
    const identity = await fileIdentity(temporary);
    if (identity.sha256 !== OASST1_VALIDATION_SOURCE.parquetSha256
        || identity.bytes !== OASST1_VALIDATION_SOURCE.parquetBytes) {
      throw new Error('downloaded validation parquet differs from its pinned identity');
    }
    await rename(temporary, path);
    return identity;
  } catch (error) {
    output.destroy();
    await rm(temporary, { force: true });
    throw error;
  }
}

async function fetchValidationTreeIds(fetchImpl) {
  const messageIds = new Set();
  const treeIds = new Set();
  let offset = 0;
  while (offset < OASST1_VALIDATION_SOURCE.messageCount) {
    const length = Math.min(PAGE_SIZE, OASST1_VALIDATION_SOURCE.messageCount - offset);
    const parameters = new URLSearchParams({
      dataset: OASST1_VALIDATION_SOURCE.dataset,
      config: 'default',
      split: OASST1_VALIDATION_SOURCE.split,
      offset: String(offset),
      length: String(length),
      revision: OASST1_VALIDATION_SOURCE.revision,
    });
    const response = await fetchImpl(`https://datasets-server.huggingface.co/rows?${parameters}`);
    if (!response.ok) {
      throw new Error(`OASST1 validation rows ${offset}-${offset + length - 1} failed with HTTP ${response.status}.`);
    }
    const payload = await response.json();
    if (payload.num_rows_total !== OASST1_VALIDATION_SOURCE.messageCount
        || !Array.isArray(payload.rows) || payload.rows.length !== length) {
      throw new Error('OASST1 validation rows API returned a different frozen row inventory.');
    }
    for (const item of payload.rows) {
      const row = item?.row;
      if (item?.row_idx !== offset || !row || typeof row !== 'object' || Array.isArray(row)
          || typeof row.message_id !== 'string' || !TREE_ID.test(row.message_id)
          || typeof row.message_tree_id !== 'string' || !TREE_ID.test(row.message_tree_id)
          || messageIds.has(row.message_id)) {
        throw new Error(`OASST1 validation row ${offset} has an invalid or duplicate identity.`);
      }
      messageIds.add(row.message_id);
      treeIds.add(row.message_tree_id);
      offset += 1;
    }
  }
  if (messageIds.size !== OASST1_VALIDATION_SOURCE.messageCount
      || treeIds.size !== OASST1_VALIDATION_SOURCE.treeCount) {
    throw new Error('OASST1 validation message/tree membership does not match the reviewed inventory.');
  }
  return [...treeIds].toSorted();
}

export async function acquireOasst1ValidationMembership({
  parquetPath,
  membershipPath,
  fetchImpl = fetch,
}) {
  await downloadPinnedParquet(resolve(parquetPath), fetchImpl);
  const treeIds = await fetchValidationTreeIds(fetchImpl);
  const receipt = {
    format: OASST1_VALIDATION_MEMBERSHIP_PROTOCOL,
    sourceRevision: `oasst1@${OASST1_VALIDATION_SOURCE.revision}`,
    split: OASST1_VALIDATION_SOURCE.split,
    parquet: {
      url: OASST1_VALIDATION_SOURCE.parquetUrl,
      sha256: OASST1_VALIDATION_SOURCE.parquetSha256,
      bytes: OASST1_VALIDATION_SOURCE.parquetBytes,
      mediaType: 'application/vnd.apache.parquet',
    },
    rowsApi: {
      dataset: OASST1_VALIDATION_SOURCE.dataset,
      config: 'default',
      split: OASST1_VALIDATION_SOURCE.split,
      revision: OASST1_VALIDATION_SOURCE.revision,
      pageSize: PAGE_SIZE,
    },
    messageCount: OASST1_VALIDATION_SOURCE.messageCount,
    treeCount: OASST1_VALIDATION_SOURCE.treeCount,
    treeIds,
    membershipDigest: membershipDigest(treeIds),
  };
  assertOasst1ValidationMembership(receipt);
  const target = resolve(membershipPath);
  await mkdir(dirname(target), { recursive: true });
  const temporary = `${target}.partial`;
  await rm(temporary, { force: true });
  await writeFile(temporary, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' });
  await rename(temporary, target);
  return Object.freeze(receipt);
}
