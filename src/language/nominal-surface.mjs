import { tokenize } from './normalization.mjs';

export const NOMINAL_SURFACE_LIMITS = Object.freeze({
  maximumBytes: 4096,
  maximumTokens: 32,
});

const LICENSED_LEADING_DETERMINERS = new Set(['a', 'an', 'the']);

const PROTECTED_NOMINAL_CUES = new Map([
  ['all', 'quantifier'], ['any', 'quantifier'], ['both', 'quantifier'], ['each', 'quantifier'],
  ['either', 'quantifier'], ['every', 'quantifier'], ['few', 'quantifier'], ['many', 'quantifier'],
  ['most', 'quantifier'], ['neither', 'quantifier-negation'], ['no', 'quantifier-negation'],
  ['none', 'quantifier-negation'], ['several', 'quantifier'], ['some', 'quantifier'],
  ['not', 'negation'], ['never', 'negation'], ['nor', 'coordination-negation'],
  ['and', 'coordination'], ['but', 'coordination'], ['or', 'coordination'],
  ['after', 'temporal'], ['before', 'temporal'], ['then', 'temporal'], ['until', 'temporal'],
  ['when', 'temporal'], ['whenever', 'temporal'], ['while', 'temporal'],
  ['because', 'causal'], ['hence', 'causal'], ['since', 'causal'], ['therefore', 'causal'],
  ['thus', 'causal'], ['if', 'conditional'], ['unless', 'conditional'],
  ['am', 'finite-clause'], ['are', 'finite-clause'], ['be', 'finite-clause'],
  ['been', 'finite-clause'], ['being', 'finite-clause'], ['can', 'finite-clause'],
  ['could', 'finite-clause'], ['did', 'finite-clause'], ['do', 'finite-clause'],
  ['does', 'finite-clause'], ['had', 'finite-clause'], ['has', 'finite-clause'],
  ['have', 'finite-clause'], ['is', 'finite-clause'], ['may', 'finite-clause'],
  ['might', 'finite-clause'], ['must', 'finite-clause'], ['shall', 'finite-clause'],
  ['should', 'finite-clause'], ['was', 'finite-clause'], ['were', 'finite-clause'],
  ['will', 'finite-clause'], ['would', 'finite-clause'],
  ['that', 'finite-clause-boundary'], ['which', 'finite-clause-boundary'],
  ['who', 'finite-clause-boundary'], ['whom', 'finite-clause-boundary'],
  ['whose', 'finite-clause-boundary'],
]);

function rejected(reason, details = {}) {
  return Object.freeze({ accepted: false, reason, ...details });
}

export function analyzeNominalSurface(value, options = {}) {
  if (typeof value !== 'string') return rejected('non-string');
  const limits = { ...NOMINAL_SURFACE_LIMITS, ...(options.limits ?? {}) };
  const source = value.normalize('NFKC').trim();
  const bytes = Buffer.byteLength(source, 'utf8');
  if (bytes < 1) return rejected('empty');
  if (bytes > limits.maximumBytes) return rejected('byte-limit', { observed: bytes, limit: limits.maximumBytes });
  if (/[^\p{L}\p{N}_'’\-\s]/u.test(source)) return rejected('unsupported-character');

  const tokens = tokenize(source);
  if (tokens.length < 1) return rejected('empty');
  if (tokens.length > limits.maximumTokens) {
    return rejected('token-limit', { observed: tokens.length, limit: limits.maximumTokens });
  }

  let leadingDeterminer;
  if (options.allowLeadingDeterminer !== false && LICENSED_LEADING_DETERMINERS.has(tokens[0])) {
    leadingDeterminer = tokens.shift();
  }
  if (tokens.length < 1) return rejected('missing-head');
  for (const token of tokens) {
    const cue = PROTECTED_NOMINAL_CUES.get(token);
    if (cue) return rejected('protected-cue', { cue, token });
  }
  return Object.freeze({
    accepted: true,
    surface: tokens.join(' '),
    tokens: Object.freeze([...tokens]),
    ...(leadingDeterminer ? { leadingDeterminer } : {}),
  });
}

export function boundedNominalSurface(value, options = {}) {
  const analysis = analyzeNominalSurface(value, options);
  return analysis.accepted ? analysis.surface : undefined;
}
