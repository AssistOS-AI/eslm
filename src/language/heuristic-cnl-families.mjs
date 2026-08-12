import {
  closestUniqueWord,
  grammaticalSpellingCorrection,
  isGrammaticalWord,
  looksLikeThirdPersonVerb,
  primaryProgressiveLemma,
  thirdPersonSingular,
  verbLemmaCandidates,
} from './heuristic-cnl-morphology.mjs';
import {
  COMPLEX_DECOMPOSITION_FAMILIES, generateComplexDecompositionProposals,
} from './heuristic-cnl-decomposition.mjs';
import { makeEdit, makeInsertion } from './heuristic-cnl-surface.mjs';

export const HEURISTIC_FAMILY_WEIGHTS = Object.freeze({
  'grammatical-spelling': 0.92,
  'determiner-agreement': 0.72,
  'quantifier-canonicalization': 0.68,
  'progressive-question-reduction': 0.88,
  'contextual-predicate-spelling': 0.78,
  'predicate-agreement': 0.96,
  'copula-and-auxiliary-insertion': 0.66,
  'sentence-segmentation': 0.58,
});

const CLAUSE_STARTERS = new Set([
  'all', 'every', 'each', 'some', 'no', 'is', 'are', 'was', 'were', 'do', 'does', 'did',
  'can', 'could', 'will', 'would', 'what', 'when', 'where', 'whether', 'which', 'who', 'why', 'how',
]);
const COPULAS = new Set(['am', 'are', 'be', 'is', 'was', 'were']);
const UNIVERSALS = new Set(['all', 'every', 'each']);
const ARTICLES = new Set(['a', 'an']);

function evidence(code, explanation, fields = {}) {
  return Object.freeze({ code, explanation, ...fields });
}

function proposal(family, confidence, edits, evidenceRecords, uncertainties = []) {
  if (edits.length === 0) return undefined;
  const penalty = Number(Math.max(0, 1 - confidence).toFixed(6));
  return Object.freeze({
    family,
    familyWeight: HEURISTIC_FAMILY_WEIGHTS[family],
    confidence,
    penalty,
    edits: Object.freeze(edits),
    evidence: Object.freeze(evidenceRecords),
    uncertainties: Object.freeze(uncertainties),
  });
}

function sentenceWords(sentence) {
  return sentence.words;
}

function grammaticalSlot(words, index, target) {
  if (index === 0) return CLAUSE_STARTERS.has(target);
  if (ARTICLES.has(target)) return COPULAS.has(words[index - 1]?.normalized);
  if (COPULAS.has(target)) {
    return ARTICLES.has(words[index + 1]?.normalized)
      || UNIVERSALS.has(words[0]?.normalized) && index === 2;
  }
  return false;
}

function mayBeGrammaticalSlot(words, index) {
  if (index === 0) return true;
  if (COPULAS.has(words[index - 1]?.normalized)) return true;
  if (ARTICLES.has(words[index + 1]?.normalized)) return true;
  return UNIVERSALS.has(words[0]?.normalized) && index === 2;
}

function grammaticalSpellingFamily(analysis, budget) {
  const edits = [];
  const records = [];
  for (const sentence of analysis.sentences) {
    const words = sentenceWords(sentence);
    for (const [index, token] of words.entries()) {
      if (!mayBeGrammaticalSlot(words, index)) continue;
      const correction = grammaticalSpellingCorrection(token.normalized, budget);
      if (!correction || !grammaticalSlot(words, index, correction.word)) continue;
      edits.push(makeEdit(token, correction.word, 'grammatical-spelling', {
        confidence: 0.93, distance: correction.distance,
      }));
      records.push(evidence('unique-closed-class-edit',
        'A grammatical slot has one closed-class word at Damerau distance one.', {
          source: token.surface, replacement: correction.word, distance: correction.distance,
        }));
    }
  }
  return proposal('grammatical-spelling', 0.93, edits, records);
}

function beginsWithVowelSound(surface) {
  const word = surface.toLocaleLowerCase('en-US');
  if (/^(?:honest|honor|hour|heir)/u.test(word)) return true;
  if (/^(?:one|once|uni(?:t|v)|use|user|euro)/u.test(word)) return false;
  return /^[aeiou]/u.test(word);
}

function determinerAgreementFamily(analysis) {
  const edits = [];
  const records = [];
  for (const sentence of analysis.sentences) {
    const words = sentenceWords(sentence);
    for (let index = 0; index < words.length - 1; index += 1) {
      const article = words[index];
      if (!ARTICLES.has(article.normalized)) continue;
      const expected = beginsWithVowelSound(words[index + 1].normalized) ? 'an' : 'a';
      if (article.normalized === expected) continue;
      edits.push(makeEdit(article, expected, 'determiner-agreement', { confidence: 0.98 }));
      records.push(evidence('indefinite-article-phonology',
        'The indefinite article is aligned to the following word-initial sound heuristic.', {
          source: article.surface, replacement: expected,
        }));
    }
  }
  return proposal('determiner-agreement', 0.96, edits, records,
    edits.length > 0 ? ['The vowel-sound test is orthographic with a bounded exception list.'] : []);
}

function quantifierCanonicalizationFamily(analysis) {
  const edits = [];
  for (const sentence of analysis.sentences) {
    const words = sentenceWords(sentence);
    if (words.length >= 3 && ['all', 'each'].includes(words[0].normalized)) {
      edits.push(makeEdit(words[0], 'every', 'universal-quantifier-alias', { confidence: 0.99 }));
    }
  }
  return proposal('quantifier-canonicalization', 0.99, edits,
    edits.map(() => evidence('typed-quantifier-alias',
      'The source and replacement share the protected universal-quantifier identity.')));
}

function progressiveQuestionRecords(analysis) {
  const records = [];
  for (const sentence of analysis.sentences) {
    const words = sentenceWords(sentence);
    if (sentence.terminal !== '?' || words.length < 3) continue;
    const auxiliary = words[0].normalized;
    if (!['is', 'are', 'was', 'were'].includes(auxiliary) || !words[2].normalized.endsWith('ing')) continue;
    records.push(Object.freeze({
      sentence,
      auxiliary: words[0],
      subject: words[1],
      progressive: words[2],
      lemma: primaryProgressiveLemma(words[2].normalized),
      objectWords: Object.freeze(words.slice(3)),
    }));
  }
  return Object.freeze(records);
}

function progressiveQuestionFamily(analysis) {
  const proposals = [];
  for (const record of progressiveQuestionRecords(analysis)) {
    const replacementAuxiliary = ['was', 'were'].includes(record.auxiliary.normalized)
      ? 'did'
      : record.auxiliary.normalized === 'are' ? 'do' : 'does';
    const edits = [
      makeEdit(record.auxiliary, replacementAuxiliary, 'progressive-to-do-support', { confidence: 0.78 }),
      makeEdit(record.progressive, record.lemma, 'progressive-to-base-verb', { confidence: 0.76 }),
    ];
    proposals.push(proposal('progressive-question-reduction', 0.76, edits, [
      evidence('polar-question-do-support',
        'A progressive polar question is reduced to a bounded do-support CNL question.', {
          progressive: record.progressive.surface, lemma: record.lemma,
        }),
    ], ['Progressive aspect is approximated as a simple-tense relation for CNL reparsing.']));
  }
  return proposals;
}

function universalRelationRecords(analysis) {
  return analysis.sentences.flatMap((sentence) => {
    const words = sentenceWords(sentence);
    if (words.length < 4 || !UNIVERSALS.has(words[0].normalized)) return [];
    return [Object.freeze({
      sentence, quantifier: words[0], classToken: words[1], predicate: words[2],
      objectWords: Object.freeze(words.slice(3)),
    })];
  });
}

function entityMemberships(analysis) {
  const memberships = [];
  for (const sentence of analysis.sentences) {
    const words = sentenceWords(sentence);
    if (words.length === 4 && words[1].normalized === 'is' && ARTICLES.has(words[2].normalized)) {
      memberships.push(Object.freeze({ entity: words[0].normalized, className: words[3].normalized }));
    }
  }
  return memberships;
}

function normalizedObject(words) {
  return words.map((word) => word.normalized).filter((word, index) => index > 0 || !ARTICLES.has(word)).join(' ');
}

function queryVerbRecords(analysis) {
  const records = progressiveQuestionRecords(analysis).map((record) => Object.freeze({
    entity: record.subject.normalized,
    lemma: record.lemma,
    object: normalizedObject(record.objectWords),
    evidenceKind: 'progressive-question',
  }));
  for (const sentence of analysis.sentences) {
    const words = sentenceWords(sentence);
    if (sentence.terminal !== '?' || words.length < 4 || !['do', 'does', 'did'].includes(words[0].normalized)) continue;
    records.push(Object.freeze({
      entity: words[1].normalized,
      lemma: verbLemmaCandidates(words[2].normalized)[0],
      object: normalizedObject(words.slice(3)),
      evidenceKind: 'do-support-question',
    }));
  }
  return records;
}

function relatedPredicateTargets(analysis, budget) {
  const memberships = entityMemberships(analysis);
  const queries = queryVerbRecords(analysis);
  const targets = [];
  for (const relation of universalRelationRecords(analysis)) {
    if (looksLikeThirdPersonVerb(relation.predicate.normalized)) continue;
    const admissible = [];
    for (const membership of memberships) {
      if (membership.className !== relation.classToken.normalized) continue;
      for (const query of queries) {
        if (query.entity !== membership.entity || query.object !== normalizedObject(relation.objectWords)) continue;
        const limit = Math.max(relation.predicate.normalized.length, query.lemma.length) >= 7 ? 2 : 1;
        const match = closestUniqueWord(relation.predicate.normalized, [query.lemma], limit, budget);
        if (match) admissible.push({ query, distance: match.distance });
      }
    }
    const unique = new Map(admissible.map((item) => [item.query.lemma, item]));
    if (unique.size !== 1) continue;
    const selected = [...unique.values()][0];
    targets.push(Object.freeze({ relation, query: selected.query, distance: selected.distance }));
  }
  return targets;
}

function contextualPredicateSpellingFamily(analysis, budget) {
  const edits = [];
  const records = [];
  const uncertainties = [];
  for (const target of relatedPredicateTargets(analysis, budget)) {
    if (target.relation.predicate.normalized === target.query.lemma) continue;
    edits.push(makeEdit(target.relation.predicate, target.query.lemma, 'contextual-predicate-spelling', {
      confidence: target.distance === 0 ? 0.91 : 0.72,
    }));
    records.push(evidence('class-member-query-analogy',
      'A class rule and a member question have matching roles and an edit-near predicate lemma.', {
        distance: target.distance, evidenceKind: target.query.evidenceKind,
      }));
    uncertainties.push(
      'Predicate spelling is inferred from a structurally aligned occurrence; equivalence is not proven.',
    );
  }
  return proposal('contextual-predicate-spelling', edits.some((edit) => edit.confidence < 0.8) ? 0.72 : 0.9,
    edits, records, uncertainties);
}

function predicateAgreementFamily(analysis, budget) {
  const edits = [];
  const records = [];
  const uncertainties = [];
  for (const target of relatedPredicateTargets(analysis, budget)) {
    const replacement = thirdPersonSingular(target.query.lemma);
    if (target.relation.predicate.normalized === replacement) continue;
    const confidence = target.distance === 0 ? 0.94 : 0.82;
    edits.push(makeEdit(target.relation.predicate, replacement, 'universal-singular-predicate-agreement', {
      confidence,
    }));
    records.push(evidence('universal-class-predicate-agreement',
      'The canonical Every-class CNL form uses a singular subject and third-person predicate.', {
        sourceLemma: target.query.lemma, distance: target.distance,
      }));
    if (target.distance > 0) {
      uncertainties.push('The predicate lemma includes a bounded spelling approximation from another sentence.');
    }
  }
  return proposal('predicate-agreement', edits.some((edit) => edit.confidence < 0.9) ? 0.82 : 0.94,
    edits, records, uncertainties);
}

function copulaAndAuxiliaryInsertionFamily(analysis) {
  const proposals = [];
  for (const sentence of analysis.sentences) {
    const words = sentenceWords(sentence);
    if (words.length === 3 && /^\p{Lu}/u.test(words[0].surface) && ARTICLES.has(words[1].normalized)) {
      proposals.push(proposal('copula-and-auxiliary-insertion', 0.84,
        [makeInsertion(words[0].end, ' is', 'missing-copula', { confidence: 0.84 })],
        [evidence('nominal-predicate-frame', 'A named subject followed by an indefinite nominal lacks a copula.')],
        ['The insertion assumes a class assertion rather than an elliptical fragment.']));
    }
    if (sentence.terminal === '?' && words.length === 2 && /^\p{Lu}/u.test(words[0].surface)
      && !isGrammaticalWord(words[1].normalized)) {
      proposals.push(proposal('copula-and-auxiliary-insertion', 0.64,
        [makeInsertion(sentence.start, 'Is ', 'missing-polar-copula', {
          confidence: 0.64,
          candidateInterrogativeRealizations: ['interrogative:polar'],
        })],
        [evidence('two-term-polar-frame', 'A two-term question can be tested as a copular CNL question.')],
        ['The second term may be a verb rather than a property or class.']));
    }
    if (sentence.terminal === '?' && words.length >= 3 && /^\p{Lu}/u.test(words[0].surface)
      && !CLAUSE_STARTERS.has(words[0].normalized) && !isGrammaticalWord(words[1].normalized)) {
      proposals.push(proposal('copula-and-auxiliary-insertion', 0.54,
        [makeInsertion(sentence.start, 'Does ', 'missing-do-support', {
          confidence: 0.54,
          candidateInterrogativeRealizations: ['interrogative:polar'],
        })],
        [evidence('three-term-polar-frame', 'A subject-predicate-object question can be tested with do-support.')],
        ['Part-of-speech evidence is structural only; the middle token may not be a verb.']));
    }
  }
  return proposals;
}

function sentenceSegmentationFamily(analysis) {
  const edits = [];
  const records = [];
  for (const token of analysis.tokens) {
    if (token.surface !== ';') continue;
    edits.push(makeEdit(token, '.', 'semicolon-clause-boundary', { confidence: 0.9 }));
    records.push(evidence('explicit-clause-boundary',
      'A semicolon is mapped to a controlled-language sentence boundary without removing content.'));
  }
  for (const sentence of analysis.sentences) {
    const words = sentenceWords(sentence);
    for (let index = 3; index < words.length; index += 1) {
      const token = words[index];
      if (!/^\p{Lu}/u.test(token.surface) || !CLAUSE_STARTERS.has(token.normalized)) continue;
      const gap = analysis.text.slice(words[index - 1].end, token.start);
      if (/\n/u.test(gap) || gap === ' ') {
        edits.push(Object.freeze({
          start: words[index - 1].end,
          end: token.start,
          original: gap,
          replacement: '. ',
          code: 'run-on-clause-boundary',
          confidence: 0.68,
        }));
        records.push(evidence('capitalized-clause-starter',
          'A later capitalized clause starter marks a possible missing sentence boundary.'));
      }
    }
  }
  return proposal('sentence-segmentation', edits.some((edit) => edit.confidence < 0.8) ? 0.68 : 0.9,
    edits, records, edits.some((edit) => edit.code === 'run-on-clause-boundary')
      ? ['Capitalization can reflect emphasis or a name rather than a new clause.'] : []);
}

const FAMILY_RUNNERS = Object.freeze([
  ['grammatical-spelling', (analysis, budget) => [grammaticalSpellingFamily(analysis, budget)]],
  ['determiner-agreement', (analysis) => [determinerAgreementFamily(analysis)]],
  ['quantifier-canonicalization', (analysis) => [quantifierCanonicalizationFamily(analysis)]],
  ['progressive-question-reduction', (analysis) => progressiveQuestionFamily(analysis)],
  ['contextual-predicate-spelling', (analysis, budget) => [contextualPredicateSpellingFamily(analysis, budget)]],
  ['predicate-agreement', (analysis, budget) => [predicateAgreementFamily(analysis, budget)]],
  ['copula-and-auxiliary-insertion', (analysis) => copulaAndAuxiliaryInsertionFamily(analysis)],
  ['sentence-segmentation', (analysis) => [sentenceSegmentationFamily(analysis)]],
]);

export const HEURISTIC_CNL_FAMILY_NAMES = Object.freeze([
  ...FAMILY_RUNNERS.map(([name]) => name), ...COMPLEX_DECOMPOSITION_FAMILIES,
]);

export function runHeuristicCnlFamily(family, analysis, budget) {
  const direct = FAMILY_RUNNERS.find(([name]) => name === family);
  if (direct) return direct[1](analysis, budget).filter(Boolean);
  return generateComplexDecompositionProposals(analysis, new Set([family])).proposals;
}
