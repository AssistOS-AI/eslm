const TOKEN_PATTERN = /\p{L}[\p{L}\p{M}\p{N}_'’-]*|\p{N}+(?:[.,]\p{N}+)*|[^\s]/gu;
const WORD_PATTERN = /^[\p{L}\p{N}]/u;
const TERMINAL_PATTERN = /^[.!?;]$/u;

function normalized(value) {
  return value.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[’']/gu, '');
}

export function tokenizeHeuristicSurface(text) {
  return [...text.matchAll(TOKEN_PATTERN)].map((match, index) => Object.freeze({
    index,
    surface: match[0],
    normalized: normalized(match[0]),
    start: match.index,
    end: match.index + match[0].length,
    isWord: WORD_PATTERN.test(match[0]),
  }));
}

export function segmentHeuristicSurface(text, tokens) {
  const sentences = [];
  let current = [];
  let start = tokens[0]?.start ?? 0;
  function close(terminal = '') {
    if (current.length === 0) return;
    const end = current.at(-1).end;
    const words = current.filter((token) => token.isWord);
    sentences.push(Object.freeze({
      index: sentences.length,
      start,
      end,
      terminal,
      text: text.slice(start, end),
      tokens: Object.freeze([...current]),
      words: Object.freeze(words),
    }));
    current = [];
  }
  for (const token of tokens) {
    if (current.length === 0) start = token.start;
    current.push(token);
    if (TERMINAL_PATTERN.test(token.surface)) close(token.surface);
  }
  close('');
  return Object.freeze(sentences);
}

export function analyzeHeuristicSurface(text) {
  const tokens = tokenizeHeuristicSurface(text);
  const sentences = segmentHeuristicSurface(text, tokens);
  return Object.freeze({
    text,
    tokens: Object.freeze(tokens),
    wordTokens: Object.freeze(tokens.filter((token) => token.isWord)),
    sentences,
  });
}

export function preserveCase(source, replacement) {
  if (/^\p{Lu}/u.test(source)) {
    return `${replacement[0]?.toLocaleUpperCase('en-US') ?? ''}${replacement.slice(1)}`;
  }
  return replacement;
}

export function makeEdit(token, replacement, code, details = {}) {
  return Object.freeze({
    start: token.start,
    end: token.end,
    original: token.surface,
    replacement: preserveCase(token.surface, replacement),
    code,
    ...details,
  });
}

export function makeInsertion(offset, replacement, code, details = {}) {
  return Object.freeze({ start: offset, end: offset, original: '', replacement, code, ...details });
}

export function applyHeuristicEdits(text, edits) {
  const ordered = [...edits].sort((left, right) => left.start - right.start || left.end - right.end
    || left.replacement.localeCompare(right.replacement));
  let previousEnd = -1;
  for (const edit of ordered) {
    if (!Number.isSafeInteger(edit.start) || !Number.isSafeInteger(edit.end)
      || edit.start < 0 || edit.end < edit.start || edit.end > text.length) {
      throw new RangeError('Heuristic edit has an invalid source range.');
    }
    if (edit.start < previousEnd) throw new RangeError('Heuristic edits must not overlap.');
    if (text.slice(edit.start, edit.end) !== edit.original) {
      throw new Error('Heuristic edit does not match the original source span.');
    }
    previousEnd = Math.max(previousEnd, edit.end);
  }
  let output = text;
  for (const edit of ordered.toReversed()) {
    output = `${output.slice(0, edit.start)}${edit.replacement}${output.slice(edit.end)}`;
  }
  return output.trim();
}

export function editKey(edit) {
  return `${edit.start}\0${edit.end}\0${edit.replacement}`;
}

export function rangesConflict(left, right) {
  if (left.start === left.end && right.start === right.end) return left.start === right.start;
  if (left.start === left.end) return left.start > right.start && left.start < right.end;
  if (right.start === right.end) return right.start > left.start && right.start < left.end;
  return left.start < right.end && right.start < left.end;
}
