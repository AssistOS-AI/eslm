const INTENT_PATTERNS = Object.freeze([
  Object.freeze({ id: 'intent:summarize:verb', family: 'explicit-operation', intent: 'summarize',
    expression: /\b(?:summari[sz]e|condense|recap)\b/iu, weight: 0.98 }),
  Object.freeze({ id: 'intent:summarize:noun', family: 'artifact-operation', intent: 'summarize',
    expression: /\b(?:summary|synopsis|abstract)\b/iu, weight: 0.88 }),
  Object.freeze({ id: 'intent:expand:verb', family: 'explicit-operation', intent: 'expand',
    expression: /\b(?:expand|elaborate|develop)\b/iu, weight: 0.96 }),
  Object.freeze({ id: 'intent:explain:verb', family: 'explicit-operation', intent: 'explain',
    expression: /\b(?:explain|clarify|account for)\b/iu, weight: 0.96 }),
  Object.freeze({ id: 'intent:explain:why', family: 'question-form', intent: 'explain',
    expression: /(?:^|[.!?]\s*)why\b/iu, weight: 0.91 }),
  Object.freeze({ id: 'intent:compare:verb', family: 'explicit-operation', intent: 'compare',
    expression: /\b(?:compare|contrast|differentiate)\b/iu, weight: 0.98 }),
  Object.freeze({ id: 'intent:compare:versus', family: 'relation-marker', intent: 'compare',
    expression: /\b(?:versus|vs\.?|compared with|in contrast to)\b/iu, weight: 0.9 }),
  Object.freeze({ id: 'intent:outline:verb', family: 'explicit-operation', intent: 'outline',
    expression: /\b(?:outline|list)\b/iu, weight: 0.92 }),
  Object.freeze({ id: 'intent:compose:verb', family: 'explicit-operation', intent: 'compose',
    expression: /\b(?:write|draft|create|produce|generate|prepare)\b/iu, weight: 0.78 }),
  Object.freeze({ id: 'intent:retrieve:verb', family: 'explicit-operation', intent: 'retrieve',
    expression: /\b(?:find|show|give|provide|tell me)\b/iu, weight: 0.72 }),
]);

const ARTIFACT_PATTERNS = Object.freeze([
  Object.freeze({ id: 'artifact:summary', family: 'artifact-noun', artifact: 'summary',
    expression: /\b(?:summary|synopsis|abstract)\b/iu, weight: 0.96, impliedIntent: 'summarize' }),
  Object.freeze({ id: 'artifact:essay', family: 'artifact-noun', artifact: 'essay',
    expression: /\bessay\b/iu, weight: 0.98, impliedIntent: 'compose' }),
  Object.freeze({ id: 'artifact:report', family: 'artifact-noun', artifact: 'report',
    expression: /\breport\b/iu, weight: 0.98, impliedIntent: 'compose' }),
  Object.freeze({ id: 'artifact:document', family: 'artifact-noun', artifact: 'document',
    expression: /\bdocument\b/iu, weight: 0.98, impliedIntent: 'compose' }),
  Object.freeze({ id: 'artifact:article', family: 'artifact-noun', artifact: 'article',
    expression: /\barticle\b/iu, weight: 0.96, impliedIntent: 'compose' }),
  Object.freeze({ id: 'artifact:explanation', family: 'artifact-noun', artifact: 'explanation',
    expression: /\bexplanation\b/iu, weight: 0.92, impliedIntent: 'explain' }),
  Object.freeze({ id: 'artifact:outline', family: 'artifact-noun', artifact: 'outline',
    expression: /\boutline\b/iu, weight: 0.94, impliedIntent: 'outline' }),
  Object.freeze({ id: 'artifact:list', family: 'artifact-noun', artifact: 'list',
    expression: /\b(?:list|bullet points?)\b/iu, weight: 0.92, impliedIntent: 'outline' }),
  Object.freeze({ id: 'artifact:paragraph', family: 'artifact-noun', artifact: 'paragraph',
    expression: /\bparagraph\b/iu, weight: 0.86, impliedIntent: 'compose' }),
]);

const LENGTH_PATTERNS = Object.freeze([
  Object.freeze({ id: 'length:brief', family: 'length-modifier', value: 'brief',
    expression: /\b(?:brief|briefly|short|concise|concisely)\b/iu, weight: 0.94 }),
  Object.freeze({ id: 'length:detailed', family: 'length-modifier', value: 'detailed',
    expression: /\b(?:detailed|comprehensive|thorough|in depth|long)\b/iu, weight: 0.94 }),
]);

const FORMAT_PATTERNS = Object.freeze([
  Object.freeze({ id: 'format:bullets', family: 'format-modifier', value: 'bullets',
    expression: /\b(?:bullet points?|bulleted|list)\b/iu, weight: 0.96 }),
  Object.freeze({ id: 'format:outline', family: 'format-modifier', value: 'outline',
    expression: /\boutline\b/iu, weight: 0.96 }),
  Object.freeze({ id: 'format:sections', family: 'format-modifier', value: 'sections',
    expression: /\b(?:sectioned|sections?|headings?)\b/iu, weight: 0.88 }),
  Object.freeze({ id: 'format:table', family: 'format-modifier', value: 'table',
    expression: /\b(?:table|tabular)\b/iu, weight: 0.94 }),
  Object.freeze({ id: 'format:paragraphs', family: 'format-modifier', value: 'paragraphs',
    expression: /\bparagraphs?\b/iu, weight: 0.9 }),
]);

export const HEURISTIC_REQUEST_PATTERN_CATALOG = Object.freeze({
  version: 'eslm-heuristic-request-pattern-catalog-v3',
  intents: INTENT_PATTERNS,
  artifacts: ARTIFACT_PATTERNS,
  lengths: LENGTH_PATTERNS,
  formats: FORMAT_PATTERNS,
});

const NEGATION_CUE = /\b(?:do(?:es)?\s+not|do(?:es)n't|never|without|not|no)\b/giu;

function firstBoundary(text, start, cue) {
  const tail = text.slice(start);
  const candidates = [];
  const terminal = /[.!?;]/u.exec(tail);
  if (terminal) candidates.push(start + terminal.index);
  const contrast = /(?:,\s*)?\b(?:but|rather|instead|however|yet)\b/iu.exec(tail);
  if (contrast) candidates.push(start + contrast.index);
  if (cue === 'without' || cue === 'not' || cue === 'no') {
    const comma = /,/u.exec(tail);
    if (comma) candidates.push(start + comma.index);
  }
  return candidates.length > 0 ? Math.min(...candidates) : text.length;
}

function negationScopes(text) {
  const scopes = [];
  for (const match of text.matchAll(NEGATION_CUE)) {
    const cue = match[0].toLocaleLowerCase('en-US');
    const normalizedCue = cue.startsWith('do') ? 'do-not' : cue;
    const following = text.slice(match.index + match[0].length);
    if (normalizedCue === 'not' && /^\s+(?:only|just)\b/iu.test(following)) continue;
    if (normalizedCue === 'no' && /^\s+(?:more|less|fewer|later|earlier)\b/iu.test(following)) continue;
    scopes.push(Object.freeze({
      cue: normalizedCue,
      span: Object.freeze([
        match.index,
        firstBoundary(text, match.index + match[0].length, normalizedCue),
      ]),
    }));
  }
  return Object.freeze(scopes);
}

function polarityFor(span, scopes) {
  const scope = scopes.find((item) => span[0] >= item.span[0] && span[0] < item.span[1]);
  return Object.freeze({
    polarity: scope ? 'excluded' : 'requested',
    ...(scope ? { polarityEvidence: `negation:${scope.cue}`, negationSpan: scope.span } : {}),
  });
}

function globalExpression(expression) {
  return new RegExp(expression.source, expression.flags.includes('g')
    ? expression.flags : `${expression.flags}g`);
}

function matching(patterns, text, scopes) {
  const matches = [];
  for (const pattern of patterns) {
    for (const match of text.matchAll(globalExpression(pattern.expression))) {
      const start = match.index;
      const end = start + match[0].length;
      matches.push(Object.freeze({
        patternId: pattern.id,
        family: pattern.family,
        weight: pattern.weight,
        span: Object.freeze([start, end]),
        surface: match[0],
        ...polarityFor([start, end], scopes),
        ...(pattern.intent ? { intent: pattern.intent } : {}),
        ...(pattern.artifact ? { artifact: pattern.artifact } : {}),
        ...(pattern.impliedIntent ? { impliedIntent: pattern.impliedIntent } : {}),
        ...(pattern.value ? { value: pattern.value } : {}),
      }));
    }
  }
  return matches.toSorted((left, right) => left.span[0] - right.span[0]
    || left.span[1] - right.span[1] || left.patternId.localeCompare(right.patternId));
}

function strongClauseEnd(text, start) {
  return firstBoundary(text, start, 'do-not');
}

function applyNegativeComplements(text, intents, artifacts) {
  return intents.map((intent) => {
    if (intent.polarity === 'excluded' || intent.family !== 'explicit-operation') return intent;
    const end = strongClauseEnd(text, intent.span[1]);
    const complements = artifacts.filter((artifact) => artifact.impliedIntent === intent.intent
      && artifact.span[0] >= intent.span[1] && artifact.span[0] < end);
    const hasExcludedComplement = complements.some((artifact) => artifact.polarity === 'excluded');
    const hasRequestedComplement = complements.some((artifact) => artifact.polarity === 'requested');
    if (!hasExcludedComplement || hasRequestedComplement) return intent;
    return Object.freeze({
      ...intent,
      polarity: 'excluded',
      polarityEvidence: 'negative-artifact-complement',
    });
  });
}

export function matchHeuristicRequestPatterns(text) {
  const scopes = negationScopes(text);
  const artifacts = matching(ARTIFACT_PATTERNS, text, scopes);
  const intents = applyNegativeComplements(text, matching(INTENT_PATTERNS, text, scopes), artifacts);
  return Object.freeze({
    intents: Object.freeze(intents),
    artifacts: Object.freeze(artifacts),
    lengths: Object.freeze(matching(LENGTH_PATTERNS, text, scopes)),
    formats: Object.freeze(matching(FORMAT_PATTERNS, text, scopes)),
  });
}
