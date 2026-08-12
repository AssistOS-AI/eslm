const REQUEST_WORDS = new Set([
  'a', 'about', 'abstract', 'account', 'also', 'an', 'and', 'article', 'as', 'brief', 'briefly',
  'bullet', 'bullets', 'but', 'clarify', 'clear', 'compare', 'compared', 'comprehensive', 'concise',
  'condense', 'content', 'contrast', 'create', 'creating', 'detailed', 'develop', 'differentiate',
  'document', 'do', "don't", 'draft', 'drafting', 'elaborate', 'essay', 'evidence', 'expand',
  'explain', 'explanation', 'find', 'following', 'for', 'generate', 'generating', 'give', 'heading',
  'headings', 'however', 'in', 'instead', 'list', 'long', 'me', 'no', 'not', 'of', 'on', 'only',
  'or', 'outline', 'paragraph', 'paragraphs', 'passage', 'please', 'point', 'points', 'prepare',
  'preparing', 'produce', 'producing', 'provide', 'rather', 'recap', 'report', 'review', 'section',
  'sections', 'short', 'show', 'summarise', 'summarize', 'summary', 'synopsis', 'table', 'tabular',
  'tell', 'text', 'that', 'the', 'this', 'thorough', 'to', 'versus', 'vs', 'without', 'write',
  'writing', 'yet', 'you',
]);

export function normalizedRequestText(value) {
  return String(value ?? '').normalize('NFKC').replace(/\s+/gu, ' ').trim();
}

function normalizedTopic(value) {
  return normalizedRequestText(value).replace(/^[\s'"“”‘’]+|[\s'"“”‘’?.!,:;]+$/gu, '')
    .replace(/(?:,\s*)?\bplease\b$/iu, '')
    .replace(/\s+(?:in|as)\s+(?:a\s+)?(?:table|bullet points?|bullets|an? outline|paragraphs?|sections?)$/iu, '')
    .replace(/\s+/gu, ' ').trim();
}

function boundedMaterial(text, start, end, extraction, limit, containerSpan = [start, end]) {
  const original = text.slice(start, end).trim();
  const retained = original.slice(0, limit);
  return Object.freeze({
    text: retained,
    sourceSpan: Object.freeze([start, end]),
    containerSpan: Object.freeze(containerSpan),
    extraction,
    originalCharacters: original.length,
    retainedCharacters: retained.length,
    complete: original.length <= limit,
  });
}

export function extractRequestSourceMaterial(text, limit) {
  const quotedCandidates = [
    /"([^"\r\n]{20,})"/u,
    /“([^“”\r\n]{20,})”/u,
  ].map((expression) => expression.exec(text)).filter(Boolean)
    .toSorted((left, right) => left.index - right.index || right[0].length - left[0].length);
  const quoted = quotedCandidates[0];
  if (quoted) {
    const contentStart = quoted.index + quoted[0].indexOf(quoted[1]);
    return boundedMaterial(text, contentStart, contentStart + quoted[1].length,
      'quoted-source-material', limit, [quoted.index, quoted.index + quoted[0].length]);
  }
  const markers = [
    /\b(?:following|this) (?:text|passage|content)\s*:\s*/iu,
    /\b(?:summari[sz]e|expand|elaborate|review)\s*:\s*/iu,
  ];
  for (const marker of markers) {
    const match = marker.exec(text);
    if (match && text.slice(match.index + match[0].length).trim()) {
      return boundedMaterial(text, match.index + match[0].length, text.length,
        'explicit-content-marker', limit);
    }
  }
  return null;
}

export function requestInstructionText(text, material) {
  if (!material) return text;
  const [start, end] = material.containerSpan ?? material.sourceSpan;
  return `${text.slice(0, start)} ${text.slice(end)}`;
}

export function segmentRequestInstructions(text, material, maximum) {
  const instruction = requestInstructionText(text, material);
  const raw = instruction.split(
    /(?:\n+|;|,\s*(?:but|rather|instead|however|yet)\s+|\b(?:and then|then also|also then)\b)/iu,
  ).map((item) => normalizedRequestText(item)).filter(Boolean);
  return Object.freeze({
    items: Object.freeze(raw.slice(0, maximum).map((surface, index) => Object.freeze({
      segmentId: `instruction:${index + 1}`,
      surface,
    }))),
    observed: raw.length,
    complete: raw.length <= maximum,
  });
}

function topicTail(text) {
  const compare = /\b(?:compare|contrast|differentiate)\s+(.+?)\s+(?:with|and|versus|vs\.?)\s+(.+?)(?:[?.!]|$)/iu
    .exec(text);
  if (compare) return Object.freeze({ mode: 'comparison', values: [compare[1], compare[2]], confidence: 0.96 });
  const marked = /\b(?:about|regarding|concerning|on the topic of)\s+(.+?)(?:[?.!]|$)/iu.exec(text);
  if (marked) return Object.freeze({ mode: 'topic-marker', values: [marked[1]], confidence: 0.94 });
  const artifactOf = new RegExp(
    '\\b(?:summary|synopsis|overview|explanation|outline|report|essay|article|document)'
      + '\\s+(?:of|on)\\s+(.+?)(?:[?.!]|$)',
    'iu',
  ).exec(text);
  if (artifactOf) return Object.freeze({ mode: 'artifact-marker', values: [artifactOf[1]], confidence: 0.9 });
  const why = /\bwhy\s+(.+?)(?:[?.!]|$)/iu.exec(text);
  if (why) return Object.freeze({ mode: 'why-clause', values: [why[1]], confidence: 0.82 });
  return null;
}

function fallbackTopic(text) {
  const tokens = normalizedRequestText(text).replace(/[^\p{L}\p{N}_'-]+/gu, ' ').split(' ')
    .filter((token) => token && !REQUEST_WORDS.has(token.toLocaleLowerCase('en-US')));
  return tokens.length > 0 ? tokens.join(' ') : null;
}

export function selectRequestTopics(instruction, limits, segments = []) {
  const surfaces = segments.length > 0 ? segments : [{ segmentId: null, surface: instruction }];
  const raw = surfaces.flatMap((segment) => {
    const extraction = topicTail(segment.surface);
    if (extraction) return extraction.values.map((value) => ({
      value,
      confidence: extraction.confidence,
      mode: extraction.mode,
      segmentId: segment.segmentId,
    }));
    return [{
      value: fallbackTopic(segment.surface),
      confidence: 0.56,
      mode: 'content-token-fallback',
      segmentId: segment.segmentId,
    }];
  });
  const unique = new Map();
  let observedCandidates = 0;
  for (const item of raw) {
    const originalSurface = normalizedTopic(item.value);
    if (!originalSurface) continue;
    observedCandidates += 1;
    const originalKey = originalSurface.toLocaleLowerCase('en-US');
    const existing = unique.get(originalKey);
    if (existing) {
      if (item.segmentId) existing.segmentIds.add(item.segmentId);
      continue;
    }
    unique.set(originalKey, {
      ...item,
      originalSurface,
      segmentIds: new Set(item.segmentId ? [item.segmentId] : []),
    });
  }
  const seenRetained = new Set();
  const topics = [];
  let characterTruncations = 0;
  let omittedByCount = 0;
  let normalizationCollisions = 0;
  for (const item of unique.values()) {
    const surface = item.originalSurface.slice(0, limits.maximumTopicCharacters).trim();
    const key = surface.toLocaleLowerCase('en-US');
    const complete = item.originalSurface.length <= limits.maximumTopicCharacters;
    if (!complete) characterTruncations += 1;
    if (seenRetained.has(key)) {
      normalizationCollisions += 1;
      continue;
    }
    if (topics.length >= limits.maximumTopics) {
      omittedByCount += 1;
      continue;
    }
    seenRetained.add(key);
    topics.push(Object.freeze({
      topicId: `topic:${topics.length + 1}`,
      surface,
      normalized: key,
      confidence: item.confidence,
      evidence: item.mode,
      instructionSegmentIds: Object.freeze([...item.segmentIds]),
      originalCharacters: item.originalSurface.length,
      retainedCharacters: surface.length,
      complete,
    }));
  }
  return Object.freeze({
    items: Object.freeze(topics),
    observedCandidates,
    uniqueCandidates: unique.size,
    returnedTopics: topics.length,
    characterTruncations,
    omittedByCount,
    normalizationCollisions,
    complete: characterTruncations === 0 && omittedByCount === 0 && normalizationCollisions === 0,
  });
}
