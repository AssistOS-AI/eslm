import { sha256 } from '../util.mjs';

const EXPECTED_DEVELOPMENT_DIGEST = 'ccbb95847a8a4b8499963420fad3a6feb8cc58752ff098b56dc9559bedeae439';

const ARGUMENT_CONSTRUCTIONS = Object.freeze({
  causative: ['object-allowed', 'object-forbidden'],
  transitive: ['object-required', 'object-forbidden'],
  intransitive: ['object-optional', 'object-required'],
  inchoative: ['object-optional', 'object-required'],
  drop_argument: ['object-optional', 'object-required'],
  passive_1: ['passive-allowed', 'passive-forbidden'],
  passive_2: ['passive-allowed', 'passive-forbidden'],
});

const EXPLETIVE_CONSTRUCTIONS = Object.freeze({
  existential_there_object_raising: ['allowed', 'forbidden'],
  existential_there_subject_raising: ['allowed', 'forbidden'],
  expletive_it_object_raising: ['allowed', 'forbidden'],
});

const INFINITIVE_CONSTRUCTIONS = Object.freeze({
  tough_vs_raising_1: ['object-gap', 'complete'],
  tough_vs_raising_2: ['complete', 'object-gap'],
});

const NUMBER_DETERMINERS = Object.freeze({
  a: 'singular', an: 'singular', every: 'singular', each: 'singular', this: 'singular', that: 'singular',
  these: 'plural', those: 'plural', many: 'plural', few: 'plural', several: 'plural', both: 'plural',
  most: 'plural', all: 'plural',
});

const AUXILIARY_FEATURES = Object.freeze({
  is: { agreement: 'singular', copula: true, passiveAuxiliary: true, selectsParticiple: true },
  are: { agreement: 'plural', copula: true, passiveAuxiliary: true, selectsParticiple: true },
  was: { agreement: 'singular', copula: true, passiveAuxiliary: true, selectsParticiple: true },
  were: { agreement: 'plural', copula: true, passiveAuxiliary: true, selectsParticiple: true },
  has: { agreement: 'singular', selectsParticiple: true },
  have: { agreement: 'plural', selectsParticiple: true },
  had: { agreement: 'any', selectsParticiple: true },
  does: { agreement: 'singular' },
  do: { agreement: 'plural' },
  did: { agreement: 'any' },
  can: { agreement: 'any', questionPolarityLicensor: true },
  could: { agreement: 'any', questionPolarityLicensor: true },
  will: { agreement: 'any', questionPolarityLicensor: true },
  would: { agreement: 'any', questionPolarityLicensor: true },
  should: { agreement: 'any', questionPolarityLicensor: true },
  might: { agreement: 'any' }, may: { agreement: 'any' },
  must: { agreement: 'any' },
});

const CLOSED_LEXEMES = Object.freeze({
  '.': { category: 'punctuation', sentenceForce: 'statement' },
  '?': { category: 'punctuation', sentenceForce: 'question' },
  '!': { category: 'punctuation', sentenceForce: 'exclamation' },
  ',': { category: 'punctuation', clauseBoundary: true },
  ';': { category: 'punctuation', clauseBoundary: true },
  ':': { category: 'punctuation', clauseBoundary: true },
  the: { category: 'determiner', number: 'any' },
  a: { category: 'determiner', number: 'singular', quantifierStrength: 'weak' },
  an: { category: 'determiner', number: 'singular', quantifierStrength: 'weak' },
  this: { category: 'determiner', number: 'singular' },
  that: [
    { category: 'determiner', number: 'singular' },
    { category: 'complementizer', startsClause: true, gapLicense: 'forbids-gap',
      markerAmbiguousWithDeterminer: true, relativeMarker: true },
  ],
  these: { category: 'determiner', number: 'plural' },
  those: { category: 'determiner', number: 'plural' },
  every: { category: 'determiner', number: 'singular', quantifierStrength: 'strong' },
  each: { category: 'determiner', number: 'singular', quantifierStrength: 'strong' },
  all: { category: 'determiner', number: 'plural', quantifierStrength: 'strong' },
  most: { category: 'determiner', number: 'plural', quantifierStrength: 'strong' },
  many: { category: 'determiner', number: 'plural', quantifierStrength: 'weak' },
  few: { category: 'determiner', number: 'plural', quantifierStrength: 'weak' },
  some: { category: 'determiner', number: 'any', quantifierStrength: 'weak' },
  no: { category: 'determiner', number: 'any', quantifierStrength: 'weak', downwardEntailing: true,
    polarityLicensor: true },
  'a lot of': { category: 'determiner', number: 'plural', quantifierStrength: 'weak' },
  'more than': { category: 'degree-quantifier' },
  'fewer than': { category: 'degree-quantifier' },
  'at least': { category: 'degree-quantifier', superlativeQuantifier: true },
  'at most': { category: 'degree-quantifier', superlativeQuantifier: true },
  one: { category: 'numeral', number: 'singular' }, two: { category: 'numeral', number: 'plural' },
  three: { category: 'numeral', number: 'plural' }, four: { category: 'numeral', number: 'plural' },
  five: { category: 'numeral', number: 'plural' }, six: { category: 'numeral', number: 'plural' },
  seven: { category: 'numeral', number: 'plural' }, eight: { category: 'numeral', number: 'plural' },
  nine: { category: 'numeral', number: 'plural' }, ten: { category: 'numeral', number: 'plural' },
  who: { category: 'wh', startsClause: true, gapLicense: 'requires-gap', relativeMarker: true,
    forbidsNominalHead: true },
  what: { category: 'wh', startsClause: true, gapLicense: 'requires-gap' },
  which: { category: 'wh', startsClause: true, gapLicense: 'requires-gap' },
  whose: { category: 'wh', startsClause: true, gapLicense: 'requires-gap', requiresNominalHead: true },
  and: { category: 'conjunction', clauseBoundary: true },
  without: { category: 'preposition', adjunctBoundary: true, startsClause: true },
  before: { category: 'preposition', adjunctBoundary: true, startsClause: true },
  after: { category: 'preposition', adjunctBoundary: true, startsClause: true },
  by: { category: 'preposition', agentMarker: true },
  of: { category: 'preposition' }, about: { category: 'preposition' }, with: { category: 'preposition' },
  from: { category: 'preposition' }, at: { category: 'preposition' }, in: { category: 'preposition' },
  for: { category: 'preposition' }, through: { category: 'preposition' }, around: { category: 'preposition' },
  like: { category: 'preposition' },
  to: [{ category: 'preposition' }, { category: 'infinitive-marker', infinitiveMarker: true }],
  there: [{ category: 'pronoun', expletive: true }, { category: 'adverb' }],
  it: [{ category: 'pronoun', number: 'singular', gender: 'neuter' },
    { category: 'pronoun', expletive: true }],
  he: { category: 'pronoun', number: 'singular', gender: 'masculine', animacy: 'animate' },
  him: { category: 'pronoun', number: 'singular', gender: 'masculine', animacy: 'animate' },
  she: { category: 'pronoun', number: 'singular', gender: 'feminine', animacy: 'animate' },
  her: { category: 'pronoun', number: 'singular', gender: 'feminine', animacy: 'animate' },
  they: { category: 'pronoun', number: 'plural', animacy: 'animate' },
  them: { category: 'pronoun', number: 'plural', animacy: 'animate' },
  himself: { category: 'reflexive', number: 'singular', gender: 'masculine', animacy: 'animate',
    requiresNonfiniteFollower: true },
  herself: { category: 'reflexive', number: 'singular', gender: 'feminine', animacy: 'animate',
    requiresNonfiniteFollower: true },
  itself: { category: 'reflexive', number: 'singular', gender: 'neuter', animacy: 'inanimate',
    requiresNonfiniteFollower: true },
  themselves: { category: 'reflexive', number: 'plural', requiresNonfiniteFollower: true },
  ever: { category: 'adverb', polarityItem: 'negative' },
  not: { category: 'negator', polarityLicensor: true },
  only: { category: 'focus', polarityLicensor: true },
  even: { category: 'focus' },
  "'s": { category: 'possessive-marker', possessiveMarker: true },
  "'": { category: 'possessive-marker', possessiveMarker: true },
});

const EXPANSIONS = Object.freeze({
  "isn't": ['is', 'not'], "aren't": ['are', 'not'], "wasn't": ['was', 'not'], "weren't": ['were', 'not'],
  "hasn't": ['has', 'not'], "haven't": ['have', 'not'], "hadn't": ['had', 'not'],
  "doesn't": ['does', 'not'], "don't": ['do', 'not'], "didn't": ['did', 'not'],
  "can't": ['can', 'not'], "couldn't": ['could', 'not'], "won't": ['will', 'not'],
  "wouldn't": ['would', 'not'], "shouldn't": ['should', 'not'], "mightn't": ['might', 'not'],
  "it's": ['it', 'is'],
});

function requireCondition(condition, message) {
  if (!condition) throw new Error(`Invalid development-visible grammar evidence: ${message}`);
}

function tokenize(text) {
  return text.normalize('NFKC').toLocaleLowerCase('en-US')
    .replaceAll('’', "'")
    .match(/[\p{L}\p{N}_-]+(?:'[\p{L}]*)?|[?.!,;:]/gu) ?? [];
}

function content(tokens) {
  return tokens.filter((token) => !/^[?.!,;:]$/u.test(token));
}

function oppositeNumber(number) {
  return number === 'singular' ? 'plural' : number === 'plural' ? 'singular' : undefined;
}

function differenceSpans(goodText, badText) {
  const good = content(tokenize(goodText));
  const bad = content(tokenize(badText));
  let prefix = 0;
  while (prefix < good.length && prefix < bad.length && good[prefix] === bad[prefix]) prefix += 1;
  let suffix = 0;
  while (suffix < good.length - prefix && suffix < bad.length - prefix
    && good[good.length - 1 - suffix] === bad[bad.length - 1 - suffix]) suffix += 1;
  return {
    good: good.slice(prefix, good.length - suffix),
    bad: bad.slice(prefix, bad.length - suffix),
    commonSuffix: good.slice(good.length - suffix),
  };
}

function canonicalDigest(cases) {
  return sha256(`${cases.map((item) => item.id).sort().join('\n')}\n`);
}

function lastLexical(tokens) {
  return [...tokens].reverse().find((token) => /^[\p{L}\p{N}_-]+(?:'[\p{L}]+)?$/u.test(token));
}

function firstSubjectHead(tokens) {
  const expanded = content(tokens).flatMap((token) => EXPANSIONS[token] ?? [token]);
  if (NUMBER_DETERMINERS[expanded[0]] || ['the', 'some', 'most', 'all', 'no'].includes(expanded[0])) {
    return expanded.find((token, index) => index > 0 && !CLOSED_LEXEMES[token] && !AUXILIARY_FEATURES[token]);
  }
  return expanded.find((token) => !CLOSED_LEXEMES[token] && !AUXILIARY_FEATURES[token]);
}

function nearestCapitalizedBefore(text, surface) {
  const source = text.slice(0, text.toLocaleLowerCase('en-US').lastIndexOf(surface));
  return (source.match(/\b\p{Lu}[\p{L}-]*\b/gu) ?? [])
    .map((item) => item.toLocaleLowerCase('en-US'))
    .filter((item) => item.length > 1 && !CLOSED_LEXEMES[item])
    .at(-1);
}

class ProfileBuilder {
  constructor() {
    this.lexemes = new Map(Object.entries(CLOSED_LEXEMES));
    this.verbEvidence = new Map();
    this.nounEvidence = new Map();
    this.finiteEvidence = new Map();
  }

  add(surface, analysis) {
    if (!surface) return;
    const normalized = surface.toLocaleLowerCase('en-US').trim();
    const cleaned = Object.fromEntries(Object.entries(analysis).filter(([, value]) => value !== undefined));
    const existing = this.lexemes.get(normalized);
    if (!existing) {
      this.lexemes.set(normalized, cleaned);
      return;
    }
    const analyses = Array.isArray(existing) ? existing : [existing];
    const serialized = JSON.stringify(cleaned);
    if (!analyses.some((item) => JSON.stringify(item) === serialized)) this.lexemes.set(normalized, [...analyses, cleaned]);
  }

  observeVerb(surface, observation) {
    if (!surface || surface.split(' ').length > 4) return;
    if (!this.verbEvidence.has(surface)) this.verbEvidence.set(surface, new Map());
    const evidence = this.verbEvidence.get(surface);
    evidence.set(observation, (evidence.get(observation) ?? 0) + 1);
  }

  observeNoun(surface, key, value) {
    if (!surface || !value) return;
    if (!this.nounEvidence.has(surface)) this.nounEvidence.set(surface, new Map());
    const features = this.nounEvidence.get(surface);
    if (!features.has(key)) features.set(key, new Map());
    const values = features.get(key);
    values.set(value, (values.get(value) ?? 0) + 1);
  }

  observeFinite(surface, agreement) {
    if (!surface || !agreement || AUXILIARY_FEATURES[surface]) return;
    if (!this.finiteEvidence.has(surface)) this.finiteEvidence.set(surface, new Map());
    const counts = this.finiteEvidence.get(surface);
    counts.set(agreement, (counts.get(agreement) ?? 0) + 1);
  }

  finishFiniteEvidence() {
    for (const [surface, counts] of this.finiteEvidence) {
      const ranked = [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
      if (ranked.length === 1 || ranked[0][1] > ranked[1][1]) {
        this.add(surface, { category: 'verb', finite: true, agreement: ranked[0][0] });
      }
    }
  }

  finishNounEvidence() {
    for (const [surface, features] of this.nounEvidence) {
      const analysis = { category: 'noun' };
      for (const [key, counts] of features) {
        const ranked = [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
        if (ranked.length === 1 || ranked[0][1] > ranked[1][1]) analysis[key] = ranked[0][0];
      }
      this.add(surface, analysis);
    }
  }

  finishVerbEvidence() {
    for (const [surface, evidence] of this.verbEvidence) {
      const features = { category: 'verb' };
      const optional = evidence.get('object-optional') ?? 0;
      const required = (evidence.get('object-required') ?? 0) + (evidence.get('object-allowed') ?? 0);
      const forbidden = evidence.get('object-forbidden') ?? 0;
      if (required > 0 && optional === 0) features.requiresObject = true;
      if (forbidden > 0 && required === 0) features.allowsObject = false;
      if ((evidence.get('passive-forbidden') ?? 0) > 0 && (evidence.get('passive-allowed') ?? 0) === 0) {
        features.passive = false;
      }
      if (Object.keys(features).length > 1) this.add(surface, features);
    }
  }

  output(provenance) {
    this.finishVerbEvidence();
    this.finishNounEvidence();
    this.finishFiniteEvidence();
    return Object.freeze({
      format: 'eslm-english-feature-profile-v1',
      provenance,
      morphology: {
        regularPluralSuffix: 's', finiteSingularSuffix: 's', gerundSuffix: 'ing', regularPastSuffix: 'ed',
        singularPossessiveSuffix: "'s", pluralPossessiveSuffix: "'",
      },
      expansions: EXPANSIONS,
      lexemes: Object.fromEntries([...this.lexemes.entries()].sort(([left], [right]) => left.localeCompare(right))),
    });
  }
}

function learnArgumentFrames(builder, cases) {
  for (const item of cases) {
    const observations = ARGUMENT_CONSTRUCTIONS[item.metadata.paradigm];
    if (!observations) continue;
    const spans = differenceSpans(item.good, item.bad);
    builder.observeVerb(spans.good.join(' '), observations[0]);
    builder.observeVerb(spans.bad.join(' '), observations[1]);
  }
}

function learnControlFeatures(builder, cases) {
  for (const item of cases) {
    const expletive = EXPLETIVE_CONSTRUCTIONS[item.metadata.paradigm];
    const infinitive = INFINITIVE_CONSTRUCTIONS[item.metadata.paradigm];
    if (!expletive && !infinitive) continue;
    const spans = differenceSpans(item.good, item.bad);
    if (expletive) {
      builder.add(spans.good.join(' '), { category: 'verb', expletiveSubject: expletive[0] });
      builder.add(spans.bad.join(' '), { category: 'verb', expletiveSubject: expletive[1] });
      builder.add(spans.good.join(' '), { category: 'adjective', expletiveSubject: expletive[0] });
      builder.add(spans.bad.join(' '), { category: 'adjective', expletiveSubject: expletive[1] });
    } else {
      builder.add(spans.good.join(' '), { category: 'adjective', infinitiveDependency: infinitive[0] });
      builder.add(spans.bad.join(' '), { category: 'adjective', infinitiveDependency: infinitive[1] });
    }
  }
}

function learnNounFeatures(builder, cases) {
  for (const item of cases) {
    const paradigm = item.metadata.paradigm;
    if (paradigm.startsWith('determiner_noun_agreement')) {
      const good = content(tokenize(item.good));
      const bad = content(tokenize(item.bad));
      const goodDeterminer = good.findLast((token) => NUMBER_DETERMINERS[token]);
      const number = NUMBER_DETERMINERS[goodDeterminer];
      const spans = differenceSpans(item.good, item.bad);
      const goodHead = paradigm.endsWith('_1') || paradigm.includes('adjective_1')
        ? lastLexical(spans.good) : lastLexical(good);
      const badHead = paradigm.endsWith('_1') || paradigm.includes('adjective_1')
        ? lastLexical(spans.bad) : lastLexical(bad);
      builder.observeNoun(goodHead, 'number', number);
      if (goodHead !== badHead) builder.observeNoun(badHead, 'number', oppositeNumber(number));
    }
    if (paradigm.startsWith('anaphor_') || paradigm.startsWith('principle_A_')) {
      const reflexive = content(tokenize(item.good)).find((token) => CLOSED_LEXEMES[token]?.category === 'reflexive');
      const reflexiveFeature = CLOSED_LEXEMES[reflexive];
      const controller = nearestCapitalizedBefore(item.good, reflexive) ?? firstSubjectHead(tokenize(item.good));
      if (controller && reflexiveFeature) {
        builder.observeNoun(controller, 'number', reflexiveFeature.number);
        builder.observeNoun(controller, 'gender', reflexiveFeature.gender);
        builder.observeNoun(controller, 'animacy', reflexiveFeature.animacy);
      }
    }
  }
}

function learnAnimacy(builder, cases) {
  for (const item of cases) {
    if (!['animate_subject_trans', 'animate_subject_passive'].includes(item.metadata.paradigm)) continue;
    const spans = differenceSpans(item.good, item.bad);
    builder.observeNoun(lastLexical(spans.good), 'animacy', 'animate');
    builder.observeNoun(lastLexical(spans.bad), 'animacy', 'inanimate');
    if (item.metadata.paradigm === 'animate_subject_trans' && spans.commonSuffix.length > 0) {
      const predicate = spans.commonSuffix.flatMap((surface) => EXPANSIONS[surface] ?? [surface])
        .find((surface) => !AUXILIARY_FEATURES[surface] && !CLOSED_LEXEMES[surface]);
      builder.add(predicate, { category: 'verb', subjectAnimacy: 'animate' });
    }
  }
}

function learnIrregularForms(builder, cases) {
  for (const item of cases) {
    const paradigm = item.metadata.paradigm;
    if (!paradigm.startsWith('irregular_past_participle_')) continue;
    const spans = differenceSpans(item.good, item.bad);
    if (paradigm.endsWith('_adjectives')) {
      builder.add(spans.good.join(' '), { category: 'verb', form: 'past-participle' });
      builder.add(spans.bad.join(' '), { category: 'verb', form: 'past' });
    } else {
      builder.add(spans.good.join(' '), { category: 'verb', form: 'past', finite: true, agreement: 'any' });
      builder.add(spans.bad.join(' '), { category: 'verb', form: 'past-participle' });
    }
  }
}

function learnReflexiveComplementForms(builder, cases) {
  for (const item of cases) {
    if (item.metadata.paradigm !== 'principle_A_case_2') continue;
    const spans = differenceSpans(item.good, item.bad);
    builder.add(spans.good.join(' '), { category: 'verb', form: 'gerund', nonfinite: true });
    builder.add(spans.bad.join(' '), { category: 'verb', finite: true });
  }
}

function learnAgreement(builder, cases) {
  for (const [surface, features] of Object.entries(AUXILIARY_FEATURES)) {
    builder.add(surface, {
      category: 'auxiliary', finite: true, supportsInversion: true, questionPolarityLicensor: true, ...features,
    });
  }
  for (const item of cases) {
    if (!item.metadata.paradigm.includes('subject_verb_agreement')) continue;
    const spans = differenceSpans(item.good, item.bad);
    const good = content(tokenize(item.good));
    const firstDeterminer = good.find((token) => NUMBER_DETERMINERS[token]);
    let subjectNumber = NUMBER_DETERMINERS[firstDeterminer]
      ?? (firstSubjectHead(tokenize(item.good))?.endsWith('s') ? 'plural' : 'singular');
    if (spans.good.length > 0 && spans.bad.length > 0) {
      const goodSurface = spans.good.join(' ');
      const badSurface = spans.bad.join(' ');
      if (item.metadata.paradigm.endsWith('_2') && spans.commonSuffix.length > 0 && goodSurface !== badSurface) {
        const sharedFinite = spans.commonSuffix[0];
        subjectNumber = AUXILIARY_FEATURES[sharedFinite]?.agreement
          ?? (sharedFinite.endsWith('s') ? 'singular' : 'plural');
        builder.observeNoun(goodSurface, 'number', subjectNumber);
        builder.observeNoun(badSurface, 'number', oppositeNumber(subjectNumber));
        builder.observeFinite(sharedFinite, subjectNumber);
      } else {
        subjectNumber = AUXILIARY_FEATURES[goodSurface]?.agreement
          ?? (goodSurface.endsWith('s') ? 'singular' : subjectNumber);
        builder.observeFinite(goodSurface, subjectNumber);
        builder.observeFinite(badSurface, oppositeNumber(subjectNumber));
      }
    }
  }
}

function learnEllipsisAndAdjectives(builder, cases) {
  for (const item of cases) {
    const paradigm = item.metadata.paradigm;
    if (paradigm.startsWith('ellipsis_n_bar_')) {
      const badLast = lastLexical(content(tokenize(item.bad)));
      const goodLast = lastLexical(content(tokenize(item.good)));
      if (badLast !== goodLast) builder.add(badLast, { category: 'adjective' });
    }
    if (paradigm.includes('determiner_noun_agreement_with_adj')) {
      const tokens = content(tokenize(item.good));
      const determiner = tokens.findLastIndex((token) => NUMBER_DETERMINERS[token]);
      for (const token of tokens.slice(determiner + 1, -1)) {
        if (!CLOSED_LEXEMES[token]) builder.add(token, { category: 'adjective' });
      }
    }
  }
}

function learnPossessiveHeads(builder, cases) {
  for (const item of cases) {
    for (const text of [item.good, item.bad]) {
      const tokens = content(tokenize(text));
      for (let index = 0; index + 1 < tokens.length; index += 1) {
        if (tokens[index].endsWith("'s") || tokens[index].endsWith("'")) {
          builder.observeNoun(tokens[index + 1], 'number', tokens[index + 1].endsWith('s') ? 'plural' : 'singular');
        }
      }
    }
  }
}

export function deriveBlimpDevelopmentFeatureProfile(cases, options = {}) {
  requireCondition(Array.isArray(cases) && cases.length > 0, 'cases must be a non-empty array.');
  const digest = canonicalDigest(cases);
  const expectedDigest = options.expectedDevelopmentIdSha256 ?? EXPECTED_DEVELOPMENT_DIGEST;
  requireCondition(digest === expectedDigest,
    `membership digest ${digest} does not match the frozen development pool ${expectedDigest}.`);
  const builder = new ProfileBuilder();
  learnArgumentFrames(builder, cases);
  learnControlFeatures(builder, cases);
  learnNounFeatures(builder, cases);
  learnAnimacy(builder, cases);
  learnIrregularForms(builder, cases);
  learnReflexiveComplementForms(builder, cases);
  learnAgreement(builder, cases);
  learnEllipsisAndAdjectives(builder, cases);
  learnPossessiveHeads(builder, cases);
  return builder.output(Object.freeze({
    source: 'development-visible grammatical feature induction',
    sourceArchiveSha256: 'cbada5cc59b41798f0f0a6b2525166c7a1d82c4a40ed726c78810b898e1979f6',
    developmentIdSha256: digest,
    cases: cases.length,
    constraint: 'The profile contains lexical and grammatical features only; no sentence, case ID, expected label, or paradigm key.',
  }));
}
