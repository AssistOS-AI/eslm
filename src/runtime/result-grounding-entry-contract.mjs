import {
  boundedJson, finite, integer, kbIdentity, kbIdentityArray, record, string, stringArray,
} from './result-payload-shapes.mjs';

export function assertGroundingEntry(value, path) {
  const entry = record(value, path);
  kbIdentity({ kbId: entry.kbId, ...(entry.kbVersion === undefined
    ? {} : { version: entry.kbVersion }) }, path, true);
  string(entry.recordId, `${path}.recordId`);
  string(entry.statement, `${path}.statement`, 480);
  record(entry.semantic, `${path}.semantic`);
  string(entry.epistemicStatus, `${path}.epistemicStatus`);
  stringArray(entry.provenance, `${path}.provenance`, 16);
  if (entry.provenance.length === 0) throw new TypeError(`${path}.provenance must not be empty.`);
  kbIdentityArray(entry.contributingKbVersions, `${path}.contributingKbVersions`, 16, true);
  if (entry.contributingKbVersions.length === 0) {
    throw new TypeError(`${path}.contributingKbVersions must not be empty.`);
  }
  const relevance = record(entry.relevance, `${path}.relevance`);
  finite(relevance.score, `${path}.relevance.score`, 0, 1_000_000);
  stringArray(relevance.reasons, `${path}.relevance.reasons`, 8, 96);
  if (relevance.reasons.length === 0) throw new TypeError(`${path}.relevance.reasons must not be empty.`);
  for (const field of ['activeKbOccurrences', 'activePostingSize']) {
    if (relevance[field] !== undefined) {
      integer(relevance[field], `${path}.relevance.${field}`, 1_000_000_000);
    }
  }
  if (relevance.estimator !== undefined) {
    record(relevance.estimator, `${path}.relevance.estimator`);
    boundedJson(relevance.estimator, `${path}.relevance.estimator`, 65_536);
  }
  const derived = entry.semantic.derived === true || entry.epistemicStatus === 'strict-derived';
  if (derived) {
    const witness = record(entry.witness, `${path}.witness`);
    string(witness.rule, `${path}.witness.rule`);
    stringArray(witness.support, `${path}.witness.support`, 16);
    if (witness.support.length === 0) throw new TypeError(`${path}.witness.support must not be empty.`);
    integer(witness.depth, `${path}.witness.depth`, 256);
  } else if (entry.witness !== undefined) {
    record(entry.witness, `${path}.witness`);
    boundedJson(entry.witness, `${path}.witness`, 65_536);
  }
  boundedJson(entry.semantic, `${path}.semantic`, 4_096);
  return entry;
}
