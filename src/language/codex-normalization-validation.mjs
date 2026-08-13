import {
  ENGLISH_FUNCTION_WORDS,
  extractProtectedAnchors,
  normalizationAnchorOverlaps,
  normalizedWords,
  wordOccurrences,
} from './codex-normalization-anchors.mjs';
import {
  CODEX_NORMALIZATION_PROTOCOL,
  CODEX_NORMALIZATION_VALIDATOR,
  MAX_NORMALIZATION_OUTPUT_CHARACTERS,
  NORMALIZATION_ANCHOR_KINDS,
} from './codex-normalization-contract.mjs';
import { assessEnglishLikelihood } from './english-likelihood.mjs';

function normalizedPhrase(text) {
  return normalizedWords(text).join(' ');
}

function lexicalAlignmentIsCompatible(source, target) {
  const sourcePhrase = normalizedPhrase(source);
  const targetPhrase = normalizedPhrase(target);
  return Boolean(sourcePhrase && targetPhrase && sourcePhrase === targetPhrase);
}

function protectedAlignmentIsCompatible(sourceRecord, targetRecord) {
  if (sourceRecord.identity !== targetRecord.identity) return false;
  if (sourceRecord.language === 'neutral' || targetRecord.language === 'neutral') {
    return sourceRecord.language === targetRecord.language;
  }
  return sourceRecord.language === 'en' && targetRecord.language === 'en';
}

function nextSubstringSpan(text, value, usedSpans) {
  let start = text.indexOf(value);
  while (start >= 0) {
    const key = `${start}:${start + value.length}`;
    if (!usedSpans.has(key)) {
      usedSpans.add(key);
      return { start, end: start + value.length };
    }
    start = text.indexOf(value, start + 1);
  }
  return undefined;
}

function openContentOccurrences(text, anchors, functionWords) {
  return wordOccurrences(text).filter((occurrence) => !functionWords.has(occurrence.normalized)
    && !anchors.some((record) => normalizationAnchorOverlaps(record, occurrence)));
}

function subtractLiteralContent(sourceOccurrences, targetOccurrences) {
  const remainingSource = [];
  const availableTarget = new Map();
  for (const occurrence of targetOccurrences) {
    const values = availableTarget.get(occurrence.normalized) ?? [];
    values.push(occurrence);
    availableTarget.set(occurrence.normalized, values);
  }
  const consumedTargets = new Set();
  for (const occurrence of sourceOccurrences) {
    const match = availableTarget.get(occurrence.normalized)?.find((candidate) => !consumedTargets.has(candidate));
    if (match) consumedTargets.add(match);
    else remainingSource.push(occurrence);
  }
  return {
    remainingSource,
    remainingTarget: targetOccurrences.filter((occurrence) => !consumedTargets.has(occurrence)),
  };
}

function validateResponseShape(candidate) {
  const errors = [];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return ['response must be one JSON object'];
  }
  const allowed = new Set(['protocol', 'operation', 'sourceLanguage', 'normalizedEnglish', 'alignments']);
  for (const key of Object.keys(candidate)) {
    if (!allowed.has(key)) errors.push(`unexpected response field: ${key}`);
  }
  if (candidate.protocol !== CODEX_NORMALIZATION_PROTOCOL) errors.push('normalization protocol is invalid');
  if (!['translation', 'simplification'].includes(candidate.operation)) {
    errors.push('operation must be translation or simplification');
  }
  if (!/^[A-Za-z][A-Za-z0-9-]{1,34}$/u.test(candidate.sourceLanguage ?? '')) {
    errors.push('sourceLanguage is invalid');
  }
  if (typeof candidate.normalizedEnglish !== 'string' || candidate.normalizedEnglish.trim().length === 0) {
    errors.push('normalizedEnglish is empty');
  }
  if ((candidate.normalizedEnglish?.length ?? 0) > MAX_NORMALIZATION_OUTPUT_CHARACTERS) {
    errors.push('normalizedEnglish exceeds the character limit');
  }
  if (/\0|```/u.test(candidate.normalizedEnglish ?? '')) {
    errors.push('normalizedEnglish contains a forbidden control or Markdown fence');
  }
  if (!Array.isArray(candidate.alignments) || candidate.alignments.length > 256) {
    errors.push('alignments must be a bounded array');
  }
  const alignments = Array.isArray(candidate.alignments) ? candidate.alignments : [];
  for (const [index, alignment] of alignments.entries()) {
    const keys = alignment && typeof alignment === 'object' ? Object.keys(alignment) : [];
    if (!alignment || typeof alignment !== 'object'
      || keys.some((key) => !['kind', 'source', 'target'].includes(key))) {
      errors.push(`alignment ${index} has an invalid shape`);
      continue;
    }
    if (!NORMALIZATION_ANCHOR_KINDS.includes(alignment.kind)) {
      errors.push(`alignment ${index} has an invalid kind`);
    }
    if (typeof alignment.source !== 'string' || !alignment.source || alignment.source.length > 256) {
      errors.push(`alignment ${index} source is invalid`);
    }
    if (typeof alignment.target !== 'string' || !alignment.target || alignment.target.length > 256) {
      errors.push(`alignment ${index} target is invalid`);
    }
  }
  return errors;
}

function validateAlignments(original, candidate, source, target, errors) {
  const sourceRecords = source.records;
  const targetRecords = target.records;
  const coveredSourceRecords = new Set();
  const coveredTargetRecords = new Set();
  const sourceLexicalSpans = [];
  const targetLexicalSpans = [];
  const usedSourceLexicalSpans = new Set();
  const usedTargetLexicalSpans = new Set();
  for (const [index, alignment] of candidate.alignments.entries()) {
    const sourceIsExact = original.includes(alignment.source);
    const targetIsExact = candidate.normalizedEnglish.includes(alignment.target);
    if (!sourceIsExact) errors.push(`alignment ${index} source is not an exact source substring`);
    if (!targetIsExact) errors.push(`alignment ${index} target is not an exact normalized substring`);
    if (!sourceIsExact || !targetIsExact) continue;
    if (alignment.kind === 'lexical-content') {
      if (!lexicalAlignmentIsCompatible(alignment.source, alignment.target)) {
        errors.push(`alignment ${index} lexical source and target are not host-verified equivalent`);
        continue;
      }
      const sourceSpan = nextSubstringSpan(original, alignment.source, usedSourceLexicalSpans);
      const targetSpan = nextSubstringSpan(
        candidate.normalizedEnglish,
        alignment.target,
        usedTargetLexicalSpans,
      );
      if (!sourceSpan || !targetSpan) {
        errors.push(`alignment ${index} repeats a lexical occurrence that is not present`);
        continue;
      }
      sourceLexicalSpans.push(sourceSpan);
      targetLexicalSpans.push(targetSpan);
      continue;
    }
    const sourceMatches = sourceRecords.filter((record, recordIndex) => record.kind === alignment.kind
      && record.surface === alignment.source
      && !coveredSourceRecords.has(recordIndex));
    const targetMatches = targetRecords.filter((record, recordIndex) => record.kind === alignment.kind
      && record.surface === alignment.target
      && !coveredTargetRecords.has(recordIndex));
    if (sourceMatches.length === 0) {
      errors.push(`alignment ${index} kind does not identify an uncovered protected source anchor`);
      continue;
    }
    if (targetMatches.length === 0) {
      errors.push(`alignment ${index} kind does not identify an uncovered protected target anchor`);
      continue;
    }
    let compatible;
    for (const sourceRecord of sourceMatches) {
      const targetRecord = targetMatches.find((record) =>
        protectedAlignmentIsCompatible(sourceRecord, record));
      if (targetRecord) {
        compatible = { sourceRecord, targetRecord };
        break;
      }
    }
    if (!compatible) {
      errors.push(`alignment ${index} changes ${alignment.kind} identity or direction`);
      continue;
    }
    coveredSourceRecords.add(sourceRecords.indexOf(compatible.sourceRecord));
    coveredTargetRecords.add(targetRecords.indexOf(compatible.targetRecord));
  }
  for (const [index, record] of sourceRecords.entries()) {
    if (!coveredSourceRecords.has(index)) {
      errors.push(
        `protected source anchor lacks a compatible exact alignment: ${record.kind} ${JSON.stringify(record.surface)}`,
      );
    }
  }
  return { sourceLexicalSpans, targetLexicalSpans };
}

function validateProtectedIdentity(source, target, errors) {
  if (source.question !== target.question) errors.push('question force changed');
  const protectedKinds = new Set([...source.records, ...target.records].map((record) => record.kind));
  for (const kind of protectedKinds) {
    const sourceIdentities = source.records
      .filter((record) => record.kind === kind)
      .map((record) => record.identity)
      .sort();
    const targetIdentities = target.records
      .filter((record) => record.kind === kind)
      .map((record) => record.identity)
      .sort();
    if (JSON.stringify(sourceIdentities) !== JSON.stringify(targetIdentities)) {
      errors.push(`${kind} identity or direction changed`);
    }
  }
}

function validateEnglishContent(original, candidate, source, target, targetAssessment, errors) {
  if (!/^en(?:-|$)/iu.test(candidate.sourceLanguage)) {
    errors.push('simplification sourceLanguage must identify English');
  }
  if (targetAssessment.classification !== 'likely-english') {
    errors.push('simplified target did not pass the host-owned English likelihood gate');
  }
  const sourceContent = openContentOccurrences(original, source.records, ENGLISH_FUNCTION_WORDS)
    .map((occurrence) => occurrence.normalized)
    .sort();
  const targetContent = openContentOccurrences(candidate.normalizedEnglish, target.records, ENGLISH_FUNCTION_WORDS)
    .map((occurrence) => occurrence.normalized)
    .sort();
  if (JSON.stringify(sourceContent) !== JSON.stringify(targetContent)) {
    errors.push('English simplification changed the normalized open-class content multiset');
  }
  const sourceFunctions = wordOccurrences(original)
    .filter((occurrence) => ENGLISH_FUNCTION_WORDS.has(occurrence.normalized)
      && !source.records.some((record) => normalizationAnchorOverlaps(record, occurrence)))
    .map((occurrence) => occurrence.normalized)
    .sort();
  const targetFunctions = wordOccurrences(candidate.normalizedEnglish)
    .filter((occurrence) => ENGLISH_FUNCTION_WORDS.has(occurrence.normalized)
      && !target.records.some((record) => normalizationAnchorOverlaps(record, occurrence)))
    .map((occurrence) => occurrence.normalized)
    .sort();
  if (JSON.stringify(sourceFunctions) !== JSON.stringify(targetFunctions)) {
    errors.push('English simplification changed the reviewed function-word multiset');
  }
}

function validateTranslationContent(original, candidate, source, target, assessments, errors) {
  if (/^en(?:-|$)/iu.test(candidate.sourceLanguage)) {
    errors.push('translation sourceLanguage must not identify English');
  }
  if (assessments.source.classification !== 'likely-non-english') {
    errors.push('translation requires a host-owned likely-non-English source assessment');
  }
  if (assessments.target.classification !== 'likely-english') {
    errors.push('translated target did not pass the host-owned English likelihood gate');
  }
  const sourceContent = openContentOccurrences(original, source.records, new Set());
  const targetContent = openContentOccurrences(
    candidate.normalizedEnglish,
    target.records,
    ENGLISH_FUNCTION_WORDS,
  );
  const unmatched = subtractLiteralContent(sourceContent, targetContent);
  if (unmatched.remainingSource.length > 0) {
    errors.push('translation changed open-class source content without an independent lexical validator: '
      + unmatched.remainingSource.map((item) => item.surface).join(', '));
  }
  if (unmatched.remainingTarget.length > 0) {
    errors.push('translation introduced open-class target content without an independent lexical validator: '
      + unmatched.remainingTarget.map((item) => item.surface).join(', '));
  }
}

export function validateCodexNormalization(original, candidate, options = {}) {
  const errors = validateResponseShape(candidate);
  if (errors.length > 0) return Object.freeze({ accepted: false, errors: Object.freeze(errors) });
  if (options.expectedOperation
    && options.operationConfidence === 'high'
    && candidate.operation !== options.expectedOperation) {
    errors.push(`operation must be ${options.expectedOperation} for the detected source-language route`);
  }
  const source = extractProtectedAnchors(original);
  const target = extractProtectedAnchors(candidate.normalizedEnglish);
  validateAlignments(original, candidate, source, target, errors);
  validateProtectedIdentity(source, target, errors);
  const assessments = Object.freeze({
    source: assessEnglishLikelihood(original),
    target: assessEnglishLikelihood(candidate.normalizedEnglish),
  });
  if (candidate.operation === 'simplification') {
    validateEnglishContent(original, candidate, source, target, assessments.target, errors);
  } else {
    validateTranslationContent(original, candidate, source, target, assessments, errors);
  }
  return Object.freeze({
    accepted: errors.length === 0,
    errors: Object.freeze(errors),
    sourceAnchors: source,
    normalizedAnchors: target,
    sourceLanguageAssessment: assessments.source,
    normalizedEnglishAssessment: assessments.target,
    validatorVersion: CODEX_NORMALIZATION_VALIDATOR,
  });
}
