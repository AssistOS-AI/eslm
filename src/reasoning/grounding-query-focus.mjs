const FUNCTION_WORDS = new Set([
  'a', 'about', 'an', 'and', 'anything', 'are', 'as', 'at', 'be', 'been', 'being', 'but', 'by', 'can', 'could',
  'did', 'do', 'does', 'everything', 'for', 'from', 'had', 'has', 'have', 'how', 'i', 'if', 'in', 'into',
  'is', 'it', 'its', 'may', 'me', 'might', 'of', 'on', 'or', 'please', 'should', 'than',
  'that', 'the', 'their', 'there', 'these', 'they', 'this', 'those', 'to', 'was', 'were',
  'us', 'what', 'when', 'where', 'which', 'who', 'why', 'will', 'with', 'would', 'you', 'your',
]);

const REQUEST_DIRECTIVES = new Set([
  'answer', 'create', 'define', 'describe', 'discuss', 'draft', 'explain', 'find', 'generate', 'give', 'list',
  'outline', 'produce', 'provide', 'report', 'review', 'show', 'summarise', 'summarize', 'tell', 'write',
]);
const REQUEST_PREFIX_WORDS = new Set([
  'can', 'could', 'do', 'may', 'please', 'should', 'will', 'would', 'you',
]);
const REQUEST_HEAD_WORDS = new Set([
  ...REQUEST_DIRECTIVES,
  'analysis', 'answer', 'details', 'everything', 'explanation', 'facts', 'information', 'know', 'known',
  'material', 'overview', 'report', 'response', 'summary',
]);
const REQUEST_ARTIFACT_WORDS = new Set([
  'analysis', 'answer', 'article', 'details', 'essay', 'explanation', 'facts', 'information', 'note', 'overview',
  'paragraph', 'report', 'response', 'summary', 'text',
]);
const REQUEST_STYLE_WORDS = new Set([
  'brief', 'briefly', 'clear', 'clearly', 'comprehensive', 'concise', 'concisely', 'detailed', 'plain', 'short',
  'simple',
]);
const REQUEST_TOPIC_MARKERS = new Set(['about', 'concerning', 'regarding']);
const REQUEST_ARTIFACT_MARKERS = new Set(['of', 'on']);

function normalizedSurface(value) {
  return String(value ?? '').normalize('NFKD').replace(/\p{M}+/gu, '')
    .toLocaleLowerCase('en-US').replaceAll('_', ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/gu, ' ').trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function singularVariants(token) {
  const irregular = {
    children: 'child', feet: 'foot', geese: 'goose', men: 'man', mice: 'mouse',
    news: undefined, people: 'person', series: undefined, species: undefined,
    teeth: 'tooth', women: 'woman', wolves: 'wolf',
  };
  const values = [token, irregular[token]];
  if (token.endsWith('ics') || token.endsWith('is') || token.endsWith('us')) return unique(values);
  if (token.endsWith('ies') && token.length > 4) values.push(`${token.slice(0, -3)}y`);
  if (token.endsWith('es') && token.length > 4) values.push(token.slice(0, -2));
  if (token.endsWith('s') && !token.endsWith('ss') && token.length > 3) values.push(token.slice(0, -1));
  return unique(values);
}

function normalizedTokens(value) {
  const surface = normalizedSurface(value);
  return surface ? surface.split(' ') : [];
}

function requestDirectiveIndex(tokens) {
  const maximumPrefix = Math.min(tokens.length - 1, 4);
  for (let index = 0; index <= maximumPrefix; index += 1) {
    if (!REQUEST_DIRECTIVES.has(tokens[index])) continue;
    if (tokens.slice(0, index).every((token) => REQUEST_PREFIX_WORDS.has(token))) return index;
  }
  return -1;
}

function markerFocus(tokens, allowUnqualifiedTopicMarker) {
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const marker = tokens[index];
    const head = tokens.slice(0, index).filter((token) => !FUNCTION_WORDS.has(token));
    const isTopicMarker = REQUEST_TOPIC_MARKERS.has(marker)
      && (allowUnqualifiedTopicMarker || head.every((token) => REQUEST_HEAD_WORDS.has(token)));
    const isArtifactMarker = REQUEST_ARTIFACT_MARKERS.has(marker)
      && head.some((token) => REQUEST_ARTIFACT_WORDS.has(token))
      && head.every((token) => REQUEST_HEAD_WORDS.has(token) || REQUEST_STYLE_WORDS.has(token));
    if (isTopicMarker || isArtifactMarker) return tokens.slice(index + 1);
  }
  return undefined;
}

function focusedSurfaceTokens(value) {
  const tokens = normalizedTokens(value);
  const directiveIndex = requestDirectiveIndex(tokens);
  if (directiveIndex >= 0) {
    const tail = tokens.slice(directiveIndex + 1);
    const marked = markerFocus(tail, true);
    if (marked?.some((token) => !FUNCTION_WORDS.has(token))) return marked;
    let first = 0;
    while (first < tail.length
      && (FUNCTION_WORDS.has(tail[first]) || REQUEST_STYLE_WORDS.has(tail[first]))) first += 1;
    return tail.slice(first);
  }
  const marked = markerFocus(tokens, false);
  return marked?.some((token) => !FUNCTION_WORDS.has(token)) ? marked : tokens;
}

function trimmedPhraseTokens(tokens) {
  let first = 0;
  let last = tokens.length;
  while (first < last && FUNCTION_WORDS.has(tokens[first])) first += 1;
  while (last > first && FUNCTION_WORDS.has(tokens[last - 1])) last -= 1;
  return tokens.slice(first, last);
}

function addPhraseWithSingularTail(terms, tokens) {
  if (tokens.length < 2 || FUNCTION_WORDS.has(tokens[0]) || FUNCTION_WORDS.has(tokens.at(-1))) return;
  if (tokens.filter((token) => !FUNCTION_WORDS.has(token)).length < 2) return;
  terms.add(tokens.join(' '));
  for (const variant of singularVariants(tokens.at(-1))) {
    if (variant !== tokens.at(-1)) terms.add([...tokens.slice(0, -1), variant].join(' '));
  }
}

export function groundingTokens(value) {
  return focusedSurfaceTokens(value)
    .filter((token) => token.length > 1 && !FUNCTION_WORDS.has(token));
}

export function groundingTerms(value, options = {}) {
  const maximumTerms = options.maximumTerms ?? 12;
  const maximumWords = options.maximumWords ?? 3;
  if (!Number.isInteger(maximumTerms) || maximumTerms < 1 || maximumTerms > 10_000) {
    throw new Error('Grounding maximumTerms must be an integer from 1 to 10000.');
  }
  if (!Number.isInteger(maximumWords) || maximumWords < 1 || maximumWords > 5) {
    throw new Error('Grounding maximumWords must be an integer from 1 to 5.');
  }
  const phraseTokens = trimmedPhraseTokens(focusedSurfaceTokens(value));
  const contentTokens = phraseTokens.filter((token) => token.length > 1 && !FUNCTION_WORDS.has(token));
  const terms = new Set();
  if (phraseTokens.length <= maximumWords) addPhraseWithSingularTail(terms, phraseTokens);
  for (const token of contentTokens) {
    for (const variant of singularVariants(token)) terms.add(variant);
  }
  for (let size = Math.min(maximumWords, phraseTokens.length); size >= 2; size -= 1) {
    for (let index = 0; index <= phraseTokens.length - size; index += 1) {
      addPhraseWithSingularTail(terms, phraseTokens.slice(index, index + size));
    }
  }
  return [...terms].slice(0, maximumTerms);
}

export { normalizedSurface as normalizedGroundingSurface };
