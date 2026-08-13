import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { sha256, stableStringify } from '../../util.mjs';
import {
  researchProjectionContentMembershipDigest,
  researchProjectionMembershipDigest,
} from '../research-projection-membership.mjs';

export function sourceRecordDigest(line) {
  return `sha256:${sha256(line)}`;
}

export async function compressedFileSha256(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

export function projectionMembershipDigest(projectionId, memberDigests, rawRows) {
  return researchProjectionMembershipDigest(projectionId, memberDigests, rawRows);
}

export function projectionContentMembershipDigest(projectionId, members, rawRows) {
  return researchProjectionContentMembershipDigest(projectionId, members, rawRows);
}

export function estimatedTokens(...values) {
  const characters = values.reduce((sum, value) => sum + String(value).length, 0);
  return Math.max(1, Math.ceil(characters / 4));
}

export function boundedLine(line, maximumBytes, path) {
  const bytes = Buffer.byteLength(line);
  if (bytes < 2 || bytes > maximumBytes) {
    throw new TypeError(`${path} must contain between 2 and ${maximumBytes} bytes.`);
  }
  return bytes;
}

export function exactSourceKeys(value, keys, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
      || stableStringify(Object.keys(value).toSorted()) !== stableStringify([...keys].toSorted())) {
    throw new TypeError(`${path} must contain exactly: ${keys.join(', ')}.`);
  }
}

export function sourceText(value, path, maximumBytes = 65_536) {
  if (typeof value !== 'string' || value.length === 0 || Buffer.byteLength(value) > maximumBytes) {
    throw new TypeError(`${path} must be bounded non-empty text.`);
  }
}

export function rating(value, path) {
  if (!Number.isInteger(value) || value < 0 || value > 4) {
    throw new TypeError(`${path} must be an integer from 0 through 4.`);
  }
}

export function ratingFeedback(value) {
  return value >= 3
    ? { polarity: 'positive', strength: value / 4 }
    : { polarity: 'negative', strength: (4 - value) / 4 };
}

export function sourceEntry({ sourceId, revision, owner, officialUrl, citation, independenceGroup, sha256: hash,
  bytes, mediaType }) {
  return {
    format: 'eslm-research-source-registry-entry-v1',
    sourceId, revision, owner, officialUrl, citation, independenceGroup,
    identity: { sha256: `sha256:${hash}`, bytes, mediaType },
    registryState: 'pilot-approved',
  };
}

export function componentEntry({ sourceId, componentId, revision, kind, sha256: hash, rawRows, licenseId,
  redistribution, projectionId, projectionDigest, contentMembershipDigest, projectedRows,
  allowedFields, excludedFields, shardCount = 1, shardFormat = 'synthetic-memory', splits = null }) {
  return {
    format: 'eslm-research-component-registry-entry-v1',
    sourceId, componentId, revision, kind,
    identity: { sha256: `sha256:${hash}`, rows: rawRows },
    rights: {
      state: 'approved', licenseId, allowedUses: ['processing-graph-discovery'], redistribution,
    },
    visibility: splits ?? [{
      split: 'training', visibility: 'training-visible',
      rowsDeclared: rawRows, rowsAdmitted: projectedRows,
    }],
    projection: {
      projectionId, membershipDigest: projectionDigest, contentMembershipDigest, rows: projectedRows,
      shardCount, shardFormat,
      allowedFields: [...allowedFields].toSorted(), excludedFields: [...excludedFields].toSorted(),
      privacyReview: 'passed', safetyReview: 'passed',
    },
  };
}
