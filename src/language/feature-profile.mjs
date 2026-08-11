function requireCondition(condition, message) {
  if (!condition) throw new Error(`Invalid grammatical feature profile: ${message}`);
}

const VALIDATED_PROFILES = new WeakSet();
const PHRASE_CACHE = new WeakMap();

function normalizeSurface(value) {
  return value.normalize('NFKC').toLocaleLowerCase('en-US').trim();
}

function validateAnalysis(analysis, location) {
  requireCondition(analysis && !Array.isArray(analysis) && typeof analysis === 'object',
    `${location} must be an object.`);
  requireCondition(typeof analysis.category === 'string' && analysis.category.length > 0,
    `${location}.category must be non-empty text.`);
  for (const [key, value] of Object.entries(analysis)) {
    requireCondition(typeof key === 'string' && key.length > 0, `${location} has an empty feature name.`);
    requireCondition(['string', 'number', 'boolean'].includes(typeof value) || Array.isArray(value),
      `${location}.${key} has an unsupported value type.`);
    if (Array.isArray(value)) {
      requireCondition(value.length > 0 && value.every((item) => typeof item === 'string'),
        `${location}.${key} must be a non-empty string array.`);
    }
  }
}

export function validateFeatureProfile(profile) {
  if (profile && typeof profile === 'object' && VALIDATED_PROFILES.has(profile)) return profile;
  requireCondition(profile?.format === 'eslm-english-feature-profile-v1', 'unsupported format.');
  requireCondition(profile.provenance && typeof profile.provenance === 'object', 'provenance is required.');
  requireCondition(profile.lexemes && !Array.isArray(profile.lexemes) && typeof profile.lexemes === 'object',
    'lexemes must be an object keyed by surface form.');
  for (const [surface, raw] of Object.entries(profile.lexemes)) {
    requireCondition(surface === normalizeSurface(surface) && surface.length > 0,
      `lexeme key ${JSON.stringify(surface)} is not normalized.`);
    const analyses = Array.isArray(raw) ? raw : [raw];
    requireCondition(analyses.length > 0, `lexeme ${surface} has no analyses.`);
    analyses.forEach((analysis, index) => validateAnalysis(analysis, `lexemes.${surface}[${index}]`));
  }
  for (const [surface, expansion] of Object.entries(profile.expansions ?? {})) {
    requireCondition(surface === normalizeSurface(surface) && surface.length > 0,
      `expansion key ${JSON.stringify(surface)} is not normalized.`);
    requireCondition(Array.isArray(expansion) && expansion.length > 0
      && expansion.every((item) => typeof item === 'string' && item === normalizeSurface(item)),
    `expansion ${surface} must contain normalized text.`);
  }
  const morphology = profile.morphology ?? {};
  for (const field of [
    'regularPluralSuffix', 'finiteSingularSuffix', 'gerundSuffix', 'regularPastSuffix',
    'singularPossessiveSuffix', 'pluralPossessiveSuffix',
  ]) {
    requireCondition(morphology[field] === undefined || typeof morphology[field] === 'string',
      `morphology.${field} must be text when present.`);
  }
  VALIDATED_PROFILES.add(profile);
  return profile;
}

function rawTokens(text) {
  return text.normalize('NFKC').match(/[\p{L}\p{N}_-]+(?:['’][\p{L}]*)?|[?.!,;:]/gu) ?? [];
}

function normalizedTokens(text, profile) {
  const output = [];
  for (const raw of rawTokens(text)) {
    if (/^[?.!,;:]$/u.test(raw)) {
      output.push({ surface: raw, original: raw, capitalized: false });
      continue;
    }
    const surface = normalizeSurface(raw.replaceAll('’', "'"));
    const expansion = profile.expansions?.[surface];
    if (expansion) {
      for (const item of expansion) output.push({
        surface: item, original: raw, capitalized: /^\p{Lu}/u.test(raw), expandedFrom: surface,
      });
    } else if (profile.morphology?.singularPossessiveSuffix
      && surface.endsWith(profile.morphology.singularPossessiveSuffix)
      && surface.length > profile.morphology.singularPossessiveSuffix.length) {
      output.push({
        surface: surface.slice(0, -profile.morphology.singularPossessiveSuffix.length),
        original: raw,
        capitalized: /^\p{Lu}/u.test(raw),
      });
      output.push({
        surface: profile.morphology.singularPossessiveSuffix,
        original: raw,
        capitalized: false,
      });
    } else if (profile.morphology?.pluralPossessiveSuffix
      && surface.endsWith(profile.morphology.pluralPossessiveSuffix)
      && surface.length > profile.morphology.pluralPossessiveSuffix.length) {
      output.push({
        surface: surface.slice(0, -profile.morphology.pluralPossessiveSuffix.length),
        original: raw,
        capitalized: /^\p{Lu}/u.test(raw),
      });
      output.push({
        surface: profile.morphology.pluralPossessiveSuffix,
        original: raw,
        capitalized: false,
      });
    } else {
      output.push({ surface, original: raw, capitalized: /^\p{Lu}/u.test(raw) });
    }
  }
  return output;
}

function fallbackAnalyses(token, profile) {
  if (token.capitalized) return [{ category: 'noun', number: 'singular', proper: true }];
  const morphology = profile.morphology ?? {};
  const analyses = [];
  if (morphology.gerundSuffix && token.surface.endsWith(morphology.gerundSuffix)) {
    analyses.push({ category: 'verb', form: 'gerund' });
  }
  if (morphology.regularPastSuffix && token.surface.endsWith(morphology.regularPastSuffix)) {
    analyses.push({ category: 'verb', form: 'past' });
    analyses.push({ category: 'verb', form: 'past-participle' });
  }
  if (morphology.regularPluralSuffix && token.surface.endsWith(morphology.regularPluralSuffix)) {
    analyses.push({ category: 'noun', number: 'plural' });
  }
  return analyses.length > 0 ? analyses : [{ category: 'unknown' }];
}

function phraseCandidates(profile) {
  const cached = PHRASE_CACHE.get(profile);
  if (cached) return cached;
  const candidates = Object.keys(profile.lexemes).filter((surface) => surface.includes(' '))
    .map((surface) => ({ surface, parts: surface.split(' ') }))
    .sort((left, right) => right.parts.length - left.parts.length || left.surface.localeCompare(right.surface));
  PHRASE_CACHE.set(profile, candidates);
  return candidates;
}

export function compileFeatureSentence(text, unvalidatedProfile) {
  const profile = validateFeatureProfile(unvalidatedProfile);
  const tokens = normalizedTokens(text, profile);
  const candidates = phraseCandidates(profile);
  const units = [];
  for (let index = 0; index < tokens.length;) {
    const phrase = candidates.find((candidate) => candidate.parts.every((part, offset) =>
      tokens[index + offset]?.surface === part));
    if (phrase) {
      const raw = profile.lexemes[phrase.surface];
      units.push({
        surface: phrase.surface,
        original: tokens.slice(index, index + phrase.parts.length).map((token) => token.original).join(' '),
        analyses: Object.freeze(Array.isArray(raw) ? raw : [raw]),
        tokenStart: index,
        tokenEnd: index + phrase.parts.length,
      });
      index += phrase.parts.length;
      continue;
    }
    const token = tokens[index];
    const raw = profile.lexemes[token.surface];
    units.push({
      ...token,
      analyses: Object.freeze(raw ? (Array.isArray(raw) ? raw : [raw]) : fallbackAnalyses(token, profile)),
      tokenStart: index,
      tokenEnd: index + 1,
    });
    index += 1;
  }
  return Object.freeze({
    original: text,
    units: Object.freeze(units.map((unit) => Object.freeze(unit))),
    profile,
  });
}

export function analysesWith(unit, key, value) {
  return unit?.analyses?.filter((analysis) => analysis[key] !== undefined
    && (value === undefined || analysis[key] === value || (Array.isArray(analysis[key]) && analysis[key].includes(value)))) ?? [];
}

export function hasFeature(unit, key, value) {
  return analysesWith(unit, key, value).length > 0;
}

export function featureValues(unit, key) {
  return [...new Set((unit?.analyses ?? []).flatMap((analysis) => {
    if (analysis[key] === undefined) return [];
    return Array.isArray(analysis[key]) ? analysis[key] : [analysis[key]];
  }))];
}
