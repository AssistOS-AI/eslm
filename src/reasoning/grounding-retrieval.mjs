import {
  groundingTerms, groundingTokens, isGroundingStructuralTerm, normalizedGroundingSurface,
  selectGroundingTerms,
} from './grounding-query-focus.mjs';
import { estimateGroundingRelevance } from './grounding-relevance-estimator.mjs';

const DEFAULT_MAX_ENTRIES = 8;
const MAX_INPUT_CHARACTERS = 4096;
const MAX_STATEMENT_CHARACTERS = 480;
const MAX_IDENTIFIER_CHARACTERS = 256;
const MAX_PROVENANCE_ITEMS = 16;
const MAX_REASON_ITEMS = 8;
const MAX_CANDIDATE_ENTRIES = 512;
const MAX_SEMANTIC_BYTES = 4096;
const MAX_SEARCH_RECEIPTS = 64;
const DEFAULT_MAX_OUTPUT_BYTES = 65_536;
const SEARCH_RECEIPT_STATUSES = new Set([
  'invalid-grounding-result',
  'matches-found',
  'no-match',
  'provider-error',
  'runtime-boundary-truncated',
  'unsupported-grounding-interface',
]);

const GROUNDING_TRIGGER_STATUSES = new Set([
  'AMBIGUOUS',
  'INCONSISTENT_CONTEXT',
  'MISSING_KNOWLEDGE',
  'NO_APPLICABLE_METHOD',
  'PARTIAL',
  'UNDERDETERMINED',
  'UNKNOWN',
  'UNPARSED',
  'UNVERIFIED_NORMALIZATION',
  'UNSUPPORTED_OUTPUT',
]);

function boundedText(value, maximum = MAX_STATEMENT_CHARACTERS) {
  const text = String(value ?? '').normalize('NFKC').replace(/\s+/gu, ' ').trim();
  return text.length <= maximum ? text : `${text.slice(0, maximum - 1)}…`;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function boundedIdentifier(value, label) {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_IDENTIFIER_CHARACTERS
    || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new Error(`${label} must be a non-empty bounded identifier.`);
  }
  return value;
}

function boundedStringArray(values, { maximumItems, maximumCharacters, label }) {
  if (!Array.isArray(values)) throw new Error(`${label} must be an array.`);
  if (values.length > maximumItems) throw new Error(`${label} exceeds its item limit.`);
  return unique(values.map((value) => {
    if (typeof value !== 'string' || value.length === 0 || value.length > maximumCharacters
      || /[\u0000-\u001f\u007f]/u.test(value)) {
      throw new Error(`${label} contains an invalid string.`);
    }
    return value;
  }));
}

function boundedKbVersions(values, label) {
  if (!Array.isArray(values) || values.length > 16) throw new Error(`${label} must contain at most 16 items.`);
  const byIdentity = new Map();
  for (const value of values) {
    const kbId = boundedIdentifier(value?.kbId, `${label} kbId`);
    const version = value.version === undefined
      ? undefined : boundedIdentifier(String(value.version), `${label} version`);
    byIdentity.set(`${kbId}\u0000${version ?? ''}`, Object.freeze({
      kbId,
      ...(version ? { version } : {}),
    }));
  }
  return [...byIdentity.values()].toSorted((left, right) =>
    left.kbId.localeCompare(right.kbId) || String(left.version).localeCompare(String(right.version)));
}

function boundedJson(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_SEMANTIC_BYTES) {
    throw new Error(`${label} exceeds its byte limit.`);
  }
  const parsed = JSON.parse(serialized);
  const visit = (item, depth = 0) => {
    if (depth > 5) throw new Error(`${label} exceeds its depth limit.`);
    if (Array.isArray(item)) {
      if (item.length > 32) throw new Error(`${label} contains an oversized array.`);
      item.forEach((entry) => visit(entry, depth + 1));
      return;
    }
    if (item && typeof item === 'object') {
      const entries = Object.entries(item);
      if (entries.length > 32) throw new Error(`${label} contains too many fields.`);
      for (const [key, entry] of entries) {
        boundedIdentifier(key, `${label} field`);
        visit(entry, depth + 1);
      }
      return;
    }
    if (typeof item === 'string' && item.length > MAX_STATEMENT_CHARACTERS) {
      throw new Error(`${label} contains an oversized string.`);
    }
    if (typeof item === 'number' && !Number.isFinite(item)) {
      throw new Error(`${label} contains a non-finite number.`);
    }
  };
  visit(parsed);
  return parsed;
}

export function shouldRetrieveGrounding(status) {
  return GROUNDING_TRIGGER_STATUSES.has(status);
}

export function createGroundingRequest(text, triggerStatus, query, options = {}) {
  const maximumEntries = options.maximumEntries ?? DEFAULT_MAX_ENTRIES;
  const maximumTerms = options.maximumTerms ?? 12;
  const maximumLookups = options.maximumLookups ?? 24;
  const maximumValuesPerLookup = options.maximumValuesPerLookup ?? 4;
  const maximumSources = options.maximumSources ?? 16;
  const maximumCandidateEntries = options.maximumCandidateEntries ?? 256;
  const maximumOutputBytes = options.maximumOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
  if (!Number.isInteger(maximumEntries) || maximumEntries < 1 || maximumEntries > 32) {
    throw new Error('Grounding request maximumEntries must be an integer from 1 to 32.');
  }
  if (!Number.isInteger(maximumTerms) || maximumTerms < 1 || maximumTerms > 32) {
    throw new Error('Grounding request maximumTerms must be an integer from 1 to 32.');
  }
  if (!Number.isInteger(maximumLookups) || maximumLookups < 1 || maximumLookups > 512) {
    throw new Error('Grounding request maximumLookups must be an integer from 1 to 512.');
  }
  if (!Number.isInteger(maximumValuesPerLookup) || maximumValuesPerLookup < 1
    || maximumValuesPerLookup > 32) {
    throw new Error('Grounding request maximumValuesPerLookup must be an integer from 1 to 32.');
  }
  if (!Number.isInteger(maximumSources) || maximumSources < 1 || maximumSources > 64) {
    throw new Error('Grounding request maximumSources must be an integer from 1 to 64.');
  }
  if (!Number.isInteger(maximumCandidateEntries) || maximumCandidateEntries < maximumEntries
    || maximumCandidateEntries > MAX_CANDIDATE_ENTRIES) {
    throw new Error('Grounding request maximumCandidateEntries must contain the output and be at most 512.');
  }
  if (!Number.isInteger(maximumOutputBytes) || maximumOutputBytes < 4_096
    || maximumOutputBytes > 1_048_576) {
    throw new Error('Grounding request maximumOutputBytes must be an integer from 4096 to 1048576.');
  }
  if (!shouldRetrieveGrounding(triggerStatus)) {
    throw new Error(`Grounding is not permitted after status ${triggerStatus}.`);
  }
  const rawText = String(text ?? '');
  const boundedInput = rawText.slice(0, MAX_INPUT_CHARACTERS);
  const explicitFocus = Array.isArray(options.focus) ? options.focus.slice(0, 32).map((focus, index) => {
    if (!focus || typeof focus !== 'object' || Array.isArray(focus)) {
      throw new Error('Grounding typed focus entries must be objects.');
    }
    return Object.freeze({
      focusId: boundedIdentifier(focus.focusId ?? `focus:${index + 1}`, 'Grounding focus ID'),
      term: boundedIdentifier(normalizedGroundingSurface(focus.term), 'Grounding focus term'),
      role: boundedIdentifier(focus.role ?? 'topic', 'Grounding focus role'),
    });
  }) : [];
  const semanticFocus = query && typeof query === 'object' ? [
    { term: query.subject, role: 'entity' },
    { term: query.predicate, role: 'predicate' },
    { term: query.object, role: 'object' },
    { term: query.target, role: 'target' },
    { term: query.factoidFrame?.relationSurface, role: 'predicate' },
    { term: query.factoidFrame?.subjectSurface, role: 'entity' },
  ].filter((focus) => focus.term !== undefined && focus.term !== null) : [];
  semanticFocus.unshift(...explicitFocus);
  const focusSurface = explicitFocus.length > 0
    ? explicitFocus.map((focus) => focus.term).join('. ') : boundedInput;
  const focusSelection = selectGroundingTerms(focusSurface, {
    maximumTerms,
    maximumCandidates: Math.min(256, Math.max(maximumTerms, maximumTerms * 8)),
    semanticFocus,
  });
  const terms = [...focusSelection.terms];
  const boundedQueryValue = (value, semanticFocus = false) => {
    if (value === undefined || value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    if (semanticFocus && isGroundingStructuralTerm(value)
      && !terms.includes(normalizedGroundingSurface(value))) return undefined;
    return boundedText(value, 256);
  };
  return Object.freeze({
    format: 'eslm-grounding-request-v1',
    text: boundedText(boundedInput, MAX_INPUT_CHARACTERS),
    triggerStatus: boundedIdentifier(triggerStatus, 'Grounding trigger status'),
    terms: Object.freeze(terms),
    termSelection: Object.freeze({
      candidates: focusSelection.candidates,
      observedCandidates: focusSelection.observedCandidates,
      retainedCandidates: focusSelection.retainedCandidates,
      omittedCandidates: focusSelection.omittedCandidates,
      selected: terms.length,
      complete: rawText.length <= MAX_INPUT_CHARACTERS && focusSelection.complete,
      strategy: focusSelection.strategy,
      focusSource: explicitFocus.length > 0 ? 'typed-request-plan' : 'visible-request',
      obligations: Object.freeze(explicitFocus.map((focus) => Object.freeze({
        ...focus, selected: terms.includes(focus.term),
      }))),
    }),
    query: query && typeof query === 'object' ? Object.freeze({
      intent: boundedQueryValue(query.intent),
      subject: boundedQueryValue(query.subject, true),
      predicate: boundedQueryValue(query.predicate, true),
      object: boundedQueryValue(query.object, true),
      target: boundedQueryValue(query.target, true),
      factoidFrame: query.factoidFrame ? Object.freeze({
        wh: boundedQueryValue(query.factoidFrame.wh),
        construction: boundedQueryValue(query.factoidFrame.construction),
        relationSurface: boundedQueryValue(query.factoidFrame.relationSurface, true),
        subjectSurface: boundedQueryValue(query.factoidFrame.subjectSurface, true),
        direction: boundedQueryValue(query.factoidFrame.direction),
      }) : undefined,
    }) : undefined,
    limits: Object.freeze({
      maximumEntries,
      maximumTerms,
      maximumLookups,
      maximumValuesPerLookup,
      maximumSources,
      maximumCandidateEntries,
      maximumOutputBytes,
    }),
  });
}

export function limitGroundingRequestLookups(request, maximumLookups) {
  if (!request?.limits || !Number.isInteger(maximumLookups) || maximumLookups < 1
    || maximumLookups > request.limits.maximumLookups) {
    throw new Error('A grounding lookup sub-budget must be a positive part of the request budget.');
  }
  return Object.freeze({
    ...request,
    limits: Object.freeze({ ...request.limits, maximumLookups }),
  });
}

export function selectGroundingRequestSources(request, sourceSelection) {
  const sources = boundedKbVersions(sourceSelection, 'Grounding request source selection');
  if (sources.length === 0 || sources.length > request.limits.maximumSources) {
    throw new Error('A grounding source selection must fit within the request source budget.');
  }
  return Object.freeze({
    ...request,
    sourceSelection: Object.freeze(sources),
  });
}

export function makeGroundingEntry(value) {
  if (!value || typeof value !== 'object') throw new Error('A grounding entry must be an object.');
  const kbId = boundedIdentifier(value.kbId, 'Grounding kbId');
  const kbVersion = value.kbVersion === undefined
    ? undefined : boundedIdentifier(String(value.kbVersion), 'Grounding kbVersion');
  const recordId = boundedIdentifier(value.recordId, 'Grounding recordId');
  if (!Number.isFinite(value.relevance?.score) || value.relevance.score < 0
    || value.relevance.score > 1_000_000) {
    throw new Error(`Grounding entry ${value.recordId} requires a finite relevance score.`);
  }
  const reasons = boundedStringArray(value.relevance.reasons ?? [], {
    maximumItems: MAX_REASON_ITEMS,
    maximumCharacters: 96,
    label: `Grounding entry ${recordId} relevance reasons`,
  });
  if (reasons.length === 0) throw new Error(`Grounding entry ${value.recordId} requires a relevance reason.`);
  const statement = boundedText(value.statement);
  if (!statement) throw new Error(`Grounding entry ${recordId} requires a statement.`);
  const provenance = boundedStringArray(value.provenance ?? [], {
    maximumItems: MAX_PROVENANCE_ITEMS,
    maximumCharacters: MAX_IDENTIFIER_CHARACTERS,
    label: `Grounding entry ${recordId} provenance`,
  });
  if (provenance.length === 0) throw new Error(`Grounding entry ${recordId} requires provenance.`);
  const contributingKbVersions = boundedKbVersions(value.contributingKbVersions ?? [{
    kbId,
    ...(kbVersion ? { version: kbVersion } : {}),
  }], `Grounding entry ${recordId} contributing KB versions`);
  const semantic = boundedJson(value.semantic ?? {}, `Grounding entry ${recordId} semantic value`);
  const epistemicStatus = boundedIdentifier(
    value.epistemicStatus ?? 'source-assertion', `Grounding entry ${recordId} epistemicStatus`,
  );
  const derived = semantic.derived === true || epistemicStatus === 'strict-derived';
  let witness;
  if (derived) {
    const rawWitness = value.witness;
    if (!rawWitness || typeof rawWitness !== 'object' || Array.isArray(rawWitness)) {
      throw new Error(`Derived grounding entry ${recordId} requires a derivation witness.`);
    }
    const rule = boundedIdentifier(rawWitness.rule, `Grounding entry ${recordId} witness rule`);
    const support = boundedStringArray(rawWitness.support, {
      maximumItems: MAX_PROVENANCE_ITEMS,
      maximumCharacters: MAX_IDENTIFIER_CHARACTERS,
      label: `Grounding entry ${recordId} witness support`,
    });
    if (support.length === 0) {
      throw new Error(`Derived grounding entry ${recordId} requires non-empty witness support.`);
    }
    if (!Number.isSafeInteger(rawWitness.depth) || rawWitness.depth < 0 || rawWitness.depth > 256) {
      throw new Error(`Derived grounding entry ${recordId} requires a bounded witness depth.`);
    }
    witness = Object.freeze({ rule, support: Object.freeze(support), depth: rawWitness.depth });
  } else if (value.witness) {
    witness = Object.freeze(boundedJson(value.witness, `Grounding entry ${recordId} witness`));
  }
  return Object.freeze({
    kbId,
    kbVersion,
    recordId,
    statement,
    semantic: Object.freeze(semantic),
    epistemicStatus,
    provenance: Object.freeze(provenance),
    contributingKbVersions: Object.freeze(contributingKbVersions),
    ...(witness ? { witness } : {}),
    relevance: Object.freeze({
      score: value.relevance.score,
      reasons: Object.freeze(reasons),
      ...(Number.isSafeInteger(value.relevance.activeKbOccurrences)
        && value.relevance.activeKbOccurrences >= 0
        ? { activeKbOccurrences: value.relevance.activeKbOccurrences } : {}),
      ...(Number.isSafeInteger(value.relevance.activePostingSize)
        && value.relevance.activePostingSize >= 0
        ? { activePostingSize: value.relevance.activePostingSize } : {}),
      ...(value.relevance.estimator ? {
        estimator: Object.freeze(boundedJson(value.relevance.estimator,
          `Grounding entry ${recordId} relevance estimator`)),
      } : {}),
    }),
  });
}

function entryKey(entry) {
  return JSON.stringify([
    entry.kbId,
    entry.kbVersion,
    entry.recordId,
    entry.semantic,
  ]);
}

function orderedEntries(entries) {
  const deduplicated = new Map();
  for (const raw of entries) {
    const entry = makeGroundingEntry(raw);
    const key = entryKey(entry);
    const existing = deduplicated.get(key);
    if (!existing || entry.relevance.score > existing.relevance.score) deduplicated.set(key, entry);
  }
  return [...deduplicated.values()].toSorted((left, right) =>
    right.relevance.score - left.relevance.score
      || left.kbId.localeCompare(right.kbId)
      || left.recordId.localeCompare(right.recordId));
}

function relevanceRankedEntries(entries, request) {
  return orderedEntries(estimateGroundingRelevance(entries, request));
}

function diverseSelection(entries, maximum) {
  const byKb = new Map();
  for (const entry of entries) byKb.set(entry.kbId, [...(byKb.get(entry.kbId) ?? []), entry]);
  const kbOrder = [...byKb.keys()].toSorted((left, right) => {
    const leftEntry = byKb.get(left)[0];
    const rightEntry = byKb.get(right)[0];
    return rightEntry.relevance.score - leftEntry.relevance.score || left.localeCompare(right);
  });
  const queues = new Map(kbOrder.map((kbId) => {
    const topicFirst = [];
    const remainder = [];
    const seenTopics = new Set();
    for (const entry of byKb.get(kbId)) {
      const topic = JSON.stringify(entry.semantic.lemma ?? entry.semantic.subject
        ?? entry.semantic.event ?? entry.semantic.name ?? entry.recordId);
      if (seenTopics.has(topic)) remainder.push(entry);
      else { seenTopics.add(topic); topicFirst.push(entry); }
    }
    return [kbId, [...topicFirst, ...remainder]];
  }));
  const selected = [];
  for (let round = 0; selected.length < maximum; round += 1) {
    let added = false;
    for (const kbId of kbOrder) {
      const entry = queues.get(kbId)[round];
      if (!entry) continue;
      selected.push(entry);
      added = true;
      if (selected.length === maximum) break;
    }
    if (!added) break;
  }
  return selected;
}

function byteBoundedSelection(entries, maximumEntries, maximumBytes) {
  const selected = [];
  let returnedEntryBytes = 0;
  for (const entry of diverseSelection(entries, entries.length)) {
    if (selected.length >= maximumEntries) break;
    const entryBytes = Buffer.byteLength(JSON.stringify(entry), 'utf8');
    if (returnedEntryBytes + entryBytes > maximumBytes) continue;
    selected.push(entry);
    returnedEntryBytes += entryBytes;
  }
  return { selected, returnedEntryBytes };
}

export function createGroundingBundle({
  text,
  request,
  triggerStatus,
  entries = [],
  searchReceipts = [],
  maximumEntries = DEFAULT_MAX_ENTRIES,
}) {
  if (!Number.isInteger(maximumEntries) || maximumEntries < 1 || maximumEntries > 32) {
    throw new Error('Grounding maximumEntries must be an integer from 1 to 32.');
  }
  if (!Array.isArray(entries) || entries.length > MAX_CANDIDATE_ENTRIES) {
    throw new Error(`Grounding entries must be an array with at most ${MAX_CANDIDATE_ENTRIES} candidates.`);
  }
  if (!Array.isArray(searchReceipts)) throw new Error('Grounding search receipts must be an array.');
  if (searchReceipts.length > MAX_SEARCH_RECEIPTS) {
    throw new Error(`Grounding search receipts exceed the ${MAX_SEARCH_RECEIPTS}-receipt limit.`);
  }
  const boundedTriggerStatus = boundedIdentifier(triggerStatus, 'Grounding bundle trigger status');
  if (request?.triggerStatus && request.triggerStatus !== boundedTriggerStatus) {
    throw new Error('Grounding bundle trigger status differs from its request.');
  }
  const ranked = relevanceRankedEntries(entries, request);
  const maximumOutputBytes = request?.limits?.maximumOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
  const { selected, returnedEntryBytes } = byteBoundedSelection(
    ranked, maximumEntries, maximumOutputBytes,
  );
  const receipts = searchReceipts.map(makeGroundingSearchReceipt);
  const termSelectionComplete = request?.termSelection?.complete !== false;
  const complete = receipts.length > 0 && receipts.every((receipt) => receipt.complete)
    && termSelectionComplete;
  return Object.freeze({
    format: 'eslm-grounding-bundle-v1',
    status: selected.length > 0 ? 'RELATED_EVIDENCE_FOUND'
      : complete ? 'NO_RELATED_EVIDENCE' : 'SEARCH_INCOMPLETE',
    triggerStatus: boundedTriggerStatus,
    queryText: boundedText(request?.text ?? text, MAX_INPUT_CHARACTERS),
    answerSupported: false,
    interpretation: 'Entries are related by explicit semantic identity or bounded lexical overlap. '
      + 'They are not a proof of the requested answer.',
    focus: Object.freeze({
      strategy: request?.termSelection?.strategy ?? 'semantic-role-phrase-morphology-v3',
      source: request?.termSelection?.focusSource ?? 'visible-request',
      terms: Object.freeze([...(request?.terms ?? [])]),
      candidates: Object.freeze([...(request?.termSelection?.candidates ?? [])]),
      obligations: Object.freeze([...(request?.termSelection?.obligations ?? [])]),
    }),
    search: Object.freeze({
      complete,
      termSelectionComplete,
      receipts: Object.freeze(receipts.toSorted((left, right) =>
        left.kbId.localeCompare(right.kbId) || String(left.kbVersion).localeCompare(String(right.kbVersion)))),
    }),
    entries: Object.freeze(selected),
    limits: Object.freeze({
      maximumEntries,
      maximumTerms: request?.limits?.maximumTerms,
      maximumLookups: request?.limits?.maximumLookups,
      maximumValuesPerLookup: request?.limits?.maximumValuesPerLookup,
      maximumSources: request?.limits?.maximumSources,
      maximumCandidateEntries: request?.limits?.maximumCandidateEntries,
      maximumOutputBytes,
      returnedEntryBytes,
      candidatesConsidered: ranked.length,
      outputTruncated: ranked.length > selected.length,
    }),
  });
}

export function makeGroundingSearchReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    throw new Error('Grounding search receipt must be an object.');
  }
  const kbId = boundedIdentifier(receipt.kbId, 'Grounding search receipt kbId');
  const kbVersion = receipt.kbVersion === undefined
    ? undefined : boundedIdentifier(String(receipt.kbVersion), 'Grounding search receipt kbVersion');
  const status = boundedIdentifier(receipt.status, 'Grounding search receipt status');
  if (!SEARCH_RECEIPT_STATUSES.has(status)) {
    throw new Error(`Grounding search receipt ${kbId} has unsupported status ${status}.`);
  }
  const coverage = boundedIdentifier(receipt.coverage, 'Grounding search receipt coverage');
  if (!Number.isSafeInteger(receipt.candidatesConsidered)
      || receipt.candidatesConsidered < 0 || receipt.candidatesConsidered > 1_000_000_000) {
    throw new Error(`Grounding search receipt ${kbId} requires a bounded candidate count.`);
  }
  const truncationReasons = boundedStringArray(receipt.truncationReasons ?? [], {
    maximumItems: 8,
    maximumCharacters: 120,
    label: `Grounding search receipt ${kbId} truncation reasons`,
  });
  const complete = receipt.complete === true;
  if (complete && status !== 'matches-found' && status !== 'no-match') {
    throw new Error(`Grounding search receipt ${kbId} cannot mark ${status} complete.`);
  }
  if (complete && truncationReasons.length > 0) {
    throw new Error(`Grounding search receipt ${kbId} cannot be complete after truncation.`);
  }
  if (!complete && status === 'no-match' && truncationReasons.length === 0) {
    throw new Error(`Grounding search receipt ${kbId} requires an incomplete-search reason.`);
  }
  return Object.freeze({
    kbId,
    kbVersion,
    status,
    coverage,
    complete,
    candidatesConsidered: receipt.candidatesConsidered,
    truncationReasons: Object.freeze(truncationReasons),
    ...(receipt.diagnostic ? { diagnostic: boundedText(receipt.diagnostic, 240) } : {}),
  });
}

export {
  DEFAULT_MAX_ENTRIES as DEFAULT_GROUNDING_MAX_ENTRIES,
  groundingTerms,
  groundingTokens,
  normalizedGroundingSurface,
  orderedEntries as orderGroundingEntries,
};
