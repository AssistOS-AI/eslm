import { sha256, stableStringify } from '../util.mjs';

export const GENERATED_HEURISTIC_BENCHMARK_PROTOCOL =
  'eslm-generated-heuristic-benchmark-suite-v1';
export const GENERATED_HEURISTIC_BENCHMARK_SEED =
  'eslm-generated-heuristic-development-v1';
export const DEFAULT_GENERATED_HEURISTIC_BENCHMARK_SIZE = 1_200;

const MAXIMUM_CASES = 20_000;

const DOMAINS = Object.freeze([
  Object.freeze({ id: 'ecology', className: 'grazer', predicate: 'tracks', object: 'river' }),
  Object.freeze({ id: 'medicine', className: 'healer', predicate: 'checks', object: 'pulse' }),
  Object.freeze({ id: 'astronomy', className: 'probe', predicate: 'maps', object: 'crater' }),
  Object.freeze({ id: 'logistics', className: 'carrier', predicate: 'moves', object: 'parcel' }),
  Object.freeze({ id: 'computing', className: 'service', predicate: 'stores', object: 'record' }),
  Object.freeze({ id: 'engineering', className: 'sensor', predicate: 'measures', object: 'signal' }),
  Object.freeze({ id: 'agriculture', className: 'grower', predicate: 'waters', object: 'crop' }),
  Object.freeze({ id: 'education', className: 'learner', predicate: 'reviews', object: 'lesson' }),
  Object.freeze({ id: 'law', className: 'reviewer', predicate: 'checks', object: 'claim' }),
  Object.freeze({ id: 'finance', className: 'auditor', predicate: 'tracks', object: 'ledger' }),
  Object.freeze({ id: 'geology', className: 'surveyor', predicate: 'maps', object: 'ridge' }),
  Object.freeze({ id: 'manufacturing', className: 'assembler', predicate: 'fixes', object: 'module' }),
  Object.freeze({ id: 'communication', className: 'messenger', predicate: 'passes', object: 'message' }),
  Object.freeze({ id: 'observation', className: 'observer', predicate: 'watches', object: 'gauge' }),
  Object.freeze({ id: 'acoustics', className: 'beacon', predicate: 'buzzes', object: 'alarm' }),
  Object.freeze({ id: 'transport', className: 'porter', predicate: 'carries', object: 'cargo' }),
  Object.freeze({ id: 'athletics', className: 'runner', predicate: 'runs', object: 'course' }),
  Object.freeze({ id: 'rigging', className: 'rigger', predicate: 'ties', basePredicate: 'tie', object: 'knot' }),
]);

const MORPHOLOGY_FORMS = Object.freeze({
  silentE: Object.freeze({ lemma: 'move', finite: 'moves', progressive: 'moving' }),
  doubledConsonant: Object.freeze({ lemma: 'run', finite: 'runs', progressive: 'running' }),
  sibilant: Object.freeze({ lemma: 'watch', finite: 'watches', progressive: 'watching' }),
  consonantY: Object.freeze({ lemma: 'carry', finite: 'carries', progressive: 'carrying' }),
  ieEnding: Object.freeze({ lemma: 'tie', finite: 'ties', progressive: 'tying' }),
  terminalZ: Object.freeze({ lemma: 'buzz', finite: 'buzzes', progressive: 'buzzing' }),
});

function hash(value) {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.codePointAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function alphabeticSerial(value, width = 4) {
  let remaining = value;
  let output = '';
  for (let index = 0; index < width; index += 1) {
    output = String.fromCharCode(97 + remaining % 26) + output;
    remaining = Math.floor(remaining / 26);
  }
  return output;
}

function baseVerb(thirdPerson) {
  if (thirdPerson.endsWith('ies')) return `${thirdPerson.slice(0, -3)}y`;
  if (/(?:ches|shes|sses|xes|zes|oes)$/u.test(thirdPerson)) return thirdPerson.slice(0, -2);
  return thirdPerson.endsWith('s') ? thirdPerson.slice(0, -1) : thirdPerson;
}

function progressive(base) {
  if (base.endsWith('ie')) return `${base.slice(0, -2)}ying`;
  if (base.endsWith('e') && !base.endsWith('ee')) return `${base.slice(0, -1)}ing`;
  if (base.length <= 4 && /[^aeiou][aeiou][b-df-hj-np-tvz]$/u.test(base)) {
    return `${base}${base.at(-1)}ing`;
  }
  return `${base}ing`;
}

function articleFor(surface) {
  return /^[aeiou]/iu.test(surface) ? 'an' : 'a';
}

function wrongArticleFor(surface) {
  return articleFor(surface) === 'an' ? 'a' : 'an';
}

function nominal(surface, article = articleFor(surface)) {
  return `${article} ${surface}`;
}

function typoDeletion(base) {
  if (base.length === 3) return `${base[0]}${base[2]}`;
  if (base.length < 3) return `${base}x`;
  const index = Math.max(1, Math.floor(base.length / 2));
  return `${base.slice(0, index)}${base.slice(index + 1)}`;
}

function typoInsertion(base) {
  return `${base}${base.at(-1)}`;
}

function typoSubstitution(base) {
  const index = Math.floor(base.length / 2);
  const replacement = base[index] === 'q' ? 'v' : 'q';
  return `${base.slice(0, index)}${replacement}${base.slice(index + 1)}`;
}

function typoTransposition(base) {
  if (base.length < 2) return `${base}x`;
  const right = Math.min(base.length - 1, Math.max(1, Math.floor(base.length / 2)));
  return `${base.slice(0, right - 1)}${base[right]}${base[right - 1]}${base.slice(right + 1)}`;
}

function canonicalEpisode(values) {
  return `${values.name} is ${nominal(values.className)}. Every ${values.className} ${values.predicate} `
    + `${values.object}. Does ${values.name} ${values.basePredicate} ${values.object}?`;
}

function entailmentOracle(values, expectedCandidateText, requiredFamilies, direct = false, options = {}) {
  return Object.freeze({
    kind: 'boolean-entailment',
    oracleLevel: options.oracleLevel ?? 'answer-execution',
    acceptableStatuses: Object.freeze(direct ? ['SOLVED'] : options.acceptableStatuses ?? ['DEFEASIBLE']),
    expectedAnswer: 'Yes.',
    expectedRoute: direct ? 'direct-symbolic' : 'heuristic-cnl-approximated',
    alternateRoutes: Object.freeze(options.alternateRoutes ?? []),
    expectedQuery: Object.freeze({
      intent: 'yes-no', subject: values.name.toLocaleLowerCase('en-US'),
      predicate: values.basePredicate, object: values.object,
    }),
    expectedCandidateText: direct ? null : expectedCandidateText,
    requiredFamilies: Object.freeze(requiredFamilies),
    candidateOptionalOnDirectSuccess: options.candidateOptionalOnDirectSuccess ?? false,
    familyOptionalOnDirectSuccess: options.familyOptionalOnDirectSuccess ?? false,
  });
}

function interpretedQuestionOracle(values, candidate, families) {
  return Object.freeze({
    kind: 'interpreted-question', oracleLevel: 'semantic-ir',
    acceptableStatuses: Object.freeze(['UNKNOWN']),
    expectedRoute: 'heuristic-cnl-approximated', expectedAnswer: null,
    expectedQuery: null,
    expectedCandidateText: candidate, requiredFamilies: Object.freeze(families),
  });
}

function requestOracle(operation, artifact, format = 'paragraphs') {
  return Object.freeze({
    kind: 'request-construction', oracleLevel: 'request-execution',
    acceptableStatuses: Object.freeze(['PARTIAL']),
    expectedRoute: 'heuristic-request-synthesis', operation, artifact, format,
    expectedAnswer: null, expectedQuery: null, expectedCandidateText: null,
    requiredFamilies: Object.freeze([]),
  });
}

function safetyOracle(operator) {
  return Object.freeze({
    kind: 'safe-abstention', oracleLevel: 'safety-abstention',
    forbiddenStatuses: Object.freeze(['SOLVED', 'DEFEASIBLE']),
    forbiddenAnswer: 'Yes.', protectedOperator: operator, requiredFamilies: Object.freeze([]),
    expectedAnswer: null, expectedQuery: null, expectedCandidateText: null,
  });
}

function template(id, technique, targetFamily, complexity, build) {
  return Object.freeze({ id, technique, targetFamily, complexity, build });
}

function spellingCase(values, transform) {
  const input = `${values.name} is ${nominal(values.className)}. `
    + `Every ${values.className} ${transform(values.basePredicate)} ${values.object}. `
    + `Does ${values.name} ${values.basePredicate} ${values.object}?`;
  return {
    input,
    oracle: entailmentOracle(values, canonicalEpisode(values), [
      'contextual-predicate-spelling', 'predicate-agreement',
    ]),
    tags: ['repair', 'spelling'],
  };
}

function combinedCase(values, transform) {
  const input = `${values.name} is ${nominal(values.className, wrongArticleFor(values.className))}. `
    + `All ${values.className} ${transform(values.basePredicate)} ${values.object}. `
    + `Is ${values.name} ${progressive(values.basePredicate)} ${values.object}?`;
  return {
    input,
    oracle: entailmentOracle(values, canonicalEpisode(values), [
      'determiner-agreement', 'quantifier-canonicalization', 'contextual-predicate-spelling',
      'predicate-agreement', 'progressive-question-reduction',
    ]),
    tags: ['repair', 'multi-family', 'spelling'],
  };
}

function morphologyCase(values, form) {
  const related = Object.freeze({ ...values, predicate: form.finite, basePredicate: form.lemma });
  const input = `${values.name} is ${nominal(values.className)}. `
    + `Every ${values.className} ${form.finite} ${values.object}. `
    + `Is ${values.name} ${form.progressive} ${values.object}?`;
  return {
    input,
    oracle: entailmentOracle(related, canonicalEpisode(related), ['progressive-question-reduction']),
    tags: ['repair', 'morphology'],
  };
}

const TEMPLATES = Object.freeze([
  template('direct-horn-control', 'direct-controlled-language', 'direct-controlled-parser', 1, (v) => ({
    input: canonicalEpisode(v), oracle: entailmentOracle(v, null, [], true), tags: ['direct', 'horn'],
  })),
  template('article-agreement', 'incorrect-indefinite-article', 'determiner-agreement', 2, (v) => {
    const input = `${v.name} is ${nominal(v.className, wrongArticleFor(v.className))}. `
      + `Every ${v.className} ${v.predicate} ${v.object}. `
      + `Does ${v.name} ${v.basePredicate} ${v.object}?`;
    return { input, oracle: entailmentOracle(v, canonicalEpisode(v), ['determiner-agreement'], false, {
      acceptableStatuses: ['SOLVED', 'DEFEASIBLE'], alternateRoutes: ['direct-symbolic'],
      candidateOptionalOnDirectSuccess: true, familyOptionalOnDirectSuccess: true,
    }), tags: ['repair'] };
  }),
  template('universal-alias', 'universal-quantifier-alias', 'quantifier-canonicalization', 2, (v) => {
    const input = `${v.name} is ${nominal(v.className)}. All ${v.className} ${v.predicate} ${v.object}. `
      + `Does ${v.name} ${v.basePredicate} ${v.object}?`;
    return { input, oracle: entailmentOracle(v, canonicalEpisode(v), ['quantifier-canonicalization'], false, {
      acceptableStatuses: ['SOLVED', 'DEFEASIBLE'], alternateRoutes: ['direct-symbolic'],
      candidateOptionalOnDirectSuccess: true, familyOptionalOnDirectSuccess: true,
    }), tags: ['repair'] };
  }),
  template('predicate-agreement', 'uninflected-universal-predicate', 'predicate-agreement', 2, (v) => {
    const input = `${v.name} is ${nominal(v.className)}. Every ${v.className} ${v.basePredicate} ${v.object}. `
      + `Does ${v.name} ${v.basePredicate} ${v.object}?`;
    return { input, oracle: entailmentOracle(v, canonicalEpisode(v), ['predicate-agreement'], false, {
      acceptableStatuses: ['SOLVED', 'DEFEASIBLE'], alternateRoutes: ['direct-symbolic'],
      candidateOptionalOnDirectSuccess: true, familyOptionalOnDirectSuccess: true,
    }), tags: ['repair'] };
  }),
  template('progressive-question', 'progressive-to-simple-question', 'progressive-question-reduction', 2, (v) => {
    const input = `${v.name} is ${nominal(v.className)}. Every ${v.className} ${v.predicate} ${v.object}. `
      + `Is ${v.name} ${progressive(v.basePredicate)} ${v.object}?`;
    return { input, oracle: entailmentOracle(v, canonicalEpisode(v), ['progressive-question-reduction']), tags: ['repair'] };
  }),
  template('progressive-silent-e', 'progressive-silent-e-lemma', 'progressive-question-reduction', 3,
    (v) => morphologyCase(v, MORPHOLOGY_FORMS.silentE)),
  template('progressive-doubled-consonant', 'progressive-doubled-consonant-lemma',
    'progressive-question-reduction', 3,
    (v) => morphologyCase(v, MORPHOLOGY_FORMS.doubledConsonant)),
  template('progressive-sibilant', 'progressive-sibilant-lemma', 'progressive-question-reduction', 3,
    (v) => morphologyCase(v, MORPHOLOGY_FORMS.sibilant)),
  template('progressive-consonant-y', 'progressive-consonant-y-lemma', 'progressive-question-reduction', 3,
    (v) => morphologyCase(v, MORPHOLOGY_FORMS.consonantY)),
  template('progressive-ie-ending', 'progressive-ie-ending-lemma', 'progressive-question-reduction', 3,
    (v) => morphologyCase(v, MORPHOLOGY_FORMS.ieEnding)),
  template('progressive-terminal-z', 'progressive-terminal-z-lemma', 'progressive-question-reduction', 3,
    (v) => morphologyCase(v, MORPHOLOGY_FORMS.terminalZ)),
  template('predicate-spelling', 'contextual-predicate-edit', 'contextual-predicate-spelling', 3, (v) => {
    return spellingCase(v, typoDeletion);
  }),
  template('predicate-spelling-insertion', 'contextual-predicate-insertion', 'contextual-predicate-spelling', 3,
    (v) => spellingCase(v, typoInsertion)),
  template('predicate-spelling-substitution', 'contextual-predicate-substitution', 'contextual-predicate-spelling', 3,
    (v) => spellingCase(v, typoSubstitution)),
  template('predicate-spelling-transposition', 'contextual-predicate-transposition', 'contextual-predicate-spelling', 3,
    (v) => spellingCase(v, typoTransposition)),
  template('combined-near-cnl', 'composed-local-repairs', 'multi-family-consensus', 4, (v) => {
    return combinedCase(v, typoDeletion);
  }),
  template('combined-insertion', 'composed-repairs-with-insertion', 'multi-family-consensus', 5,
    (v) => combinedCase(v, typoInsertion)),
  template('combined-substitution', 'composed-repairs-with-substitution', 'multi-family-consensus', 5,
    (v) => combinedCase(v, typoSubstitution)),
  template('combined-transposition', 'composed-repairs-with-transposition', 'multi-family-consensus', 5,
    (v) => combinedCase(v, typoTransposition)),
  template('copula-auxiliary', 'missing-copula-and-auxiliary', 'copula-and-auxiliary-insertion', 3, (v) => {
    const candidate = `${v.name} is ${nominal(v.className)}. Is ${v.name} calm?`;
    return { input: `${v.name} ${nominal(v.className, wrongArticleFor(v.className))}. ${v.name} calm?`,
      oracle: Object.freeze({ ...entailmentOracle(v, candidate,
        ['copula-and-auxiliary-insertion', 'determiner-agreement']),
      acceptableStatuses: Object.freeze(['UNKNOWN']), expectedAnswer: null,
      expectedQuery: Object.freeze({ intent: 'yes-no', subject: v.name.toLocaleLowerCase('en-US'), predicate: 'is_a', object: 'calm' }) }),
      tags: ['repair', 'ellipsis'] };
  }),
  template('semicolon-segmentation', 'semicolon-clause-boundary', 'sentence-segmentation', 2, (v) => {
    const candidate = `${v.name} is ${nominal(v.className)}. Is ${v.name} ${nominal(v.className)}?`;
    return { input: `${v.name} is ${nominal(v.className)}; Is ${v.name} ${nominal(v.className)}?`,
      oracle: Object.freeze({ ...entailmentOracle(v, candidate, ['sentence-segmentation']),
        expectedQuery: Object.freeze({ intent: 'yes-no', subject: v.name.toLocaleLowerCase('en-US'), predicate: 'is_a', object: v.className }) }),
      tags: ['repair', 'segmentation'] };
  }),
  template('request-envelope', 'polite-polar-envelope', 'request-envelope-stripping', 2, (v) => {
    const candidate = `Does ${v.name} ${v.basePredicate} ${v.object}?`;
    return { input: `Could you tell me whether ${v.name} ${v.predicate} ${v.object}?`,
      oracle: interpretedQuestionOracle(v, candidate, ['request-envelope-stripping']), tags: ['question-only'] };
  }),
  template('embedded-question', 'embedded-polar-question', 'embedded-polar-question', 3, (v) => {
    const candidate = `Does ${v.name} ${v.basePredicate} ${v.object}?`;
    return { input: `The question is whether ${v.name} ${v.predicate} ${v.object}.`,
      oracle: interpretedQuestionOracle(v, candidate, ['embedded-polar-question', 'nominalized-request-simplification']), tags: ['question-only', 'embedded'] };
  }),
  template('filler-removal', 'discourse-filler-prefix', 'discourse-filler-removal', 2, (v) => {
    const candidate = `${v.name} is ${nominal(v.className)}. Is ${v.name} ${nominal(v.className)}?`;
    const oracle = Object.freeze({ ...entailmentOracle(v, candidate, ['discourse-filler-removal']),
      expectedQuery: Object.freeze({ intent: 'yes-no', subject: v.name.toLocaleLowerCase('en-US'), predicate: 'is_a', object: v.className }) });
    return { input: `Well, actually, ${v.name} is ${nominal(v.className)}. Is ${v.name} ${nominal(v.className)}?`, oracle, tags: ['repair', 'discourse'] };
  }),
  template('parenthetical-removal', 'nonsemantic-parenthetical', 'nonsemantic-parenthetical-removal', 3, (v) => {
    const candidate = `${v.name} is ${nominal(v.className)}. Is ${v.name} ${nominal(v.className)}?`;
    const oracle = Object.freeze({ ...entailmentOracle(v, candidate, ['nonsemantic-parenthetical-removal']),
      expectedQuery: Object.freeze({ intent: 'yes-no', subject: v.name.toLocaleLowerCase('en-US'), predicate: 'is_a', object: v.className }) });
    return { input: `${v.name} (for reference) is ${nominal(v.className)}. Is ${v.name} ${nominal(v.className)}?`, oracle, tags: ['repair', 'parenthetical'] };
  }),
  template('question-last', 'question-before-premises', 'question-last-reordering', 3, (v) => ({
    input: `Does ${v.name} ${v.basePredicate} ${v.object}? ${v.name} is ${nominal(v.className)}. Every ${v.className} ${v.predicate} ${v.object}.`,
    oracle: entailmentOracle(v, canonicalEpisode(v), ['question-last-reordering']), tags: ['repair', 'ordering'],
  })),
  template('independent-coordination', 'coordinated-independent-clauses', 'independent-clause-coordination', 4, (v) => {
    const candidate = `${v.name} is ${nominal(v.className)}. ${v.otherName} is ${nominal(v.otherClass)}.`;
    const oracle = Object.freeze({ ...entailmentOracle(v, candidate, ['independent-clause-coordination']),
      expectedQuery: Object.freeze({ intent: 'yes-no', subject: v.name.toLocaleLowerCase('en-US'), predicate: 'is_a', object: v.className }) });
    return { input: `${v.name} is ${nominal(v.className)} and ${v.otherName} is ${nominal(v.otherClass)}.`,
      oracle: Object.freeze({ ...oracle, acceptableStatuses: Object.freeze(['PARTIAL']),
        oracleLevel: 'query-local-decomposition', expectedAnswer: null, expectedQuery: null }),
      tags: ['decomposition', 'coordination'] };
  }),
  template('parallel-ellipsis', 'shared-subject-coordination', 'local-parallel-ellipsis', 4, (v) => {
    const candidate = `${v.name} is ${nominal(v.className)}. ${v.name} is ${nominal(v.otherClass)}.`;
    const oracle = Object.freeze({ ...entailmentOracle(v, candidate, ['local-parallel-ellipsis']),
      expectedQuery: Object.freeze({ intent: 'yes-no', subject: v.name.toLocaleLowerCase('en-US'), predicate: 'is_a', object: 'calm' }) });
    return { input: `${v.name} is ${nominal(v.className)} and ${nominal(v.otherClass)}.`,
      oracle: Object.freeze({ ...oracle, acceptableStatuses: Object.freeze(['PARTIAL']),
        oracleLevel: 'query-local-decomposition', expectedAnswer: null, expectedQuery: null }),
      tags: ['decomposition', 'ellipsis'] };
  }),
  template('relative-extraction', 'nonrestrictive-relative-clause', 'relative-clause-extraction', 5, (v) => {
    const candidate = `${v.name} is ${nominal(v.className)}. ${v.name} is ${nominal(v.otherClass)}.`;
    const oracle = Object.freeze({ ...entailmentOracle(v, candidate, ['relative-clause-extraction']),
      expectedQuery: Object.freeze({ intent: 'yes-no', subject: v.name.toLocaleLowerCase('en-US'), predicate: 'is_a', object: v.className }) });
    return { input: `${v.name}, who is ${nominal(v.className)}, is ${nominal(v.otherClass)}.`,
      oracle: Object.freeze({ ...oracle, acceptableStatuses: Object.freeze(['PARTIAL']),
        oracleLevel: 'query-local-decomposition', expectedAnswer: null, expectedQuery: null }),
      tags: ['decomposition', 'relative'] };
  }),
  template('apposition', 'nominal-apposition', 'apposition-expansion', 5, (v) => {
    const candidate = `${v.name} is ${nominal(v.className)}. ${v.name} is ${nominal(v.otherClass)}.`;
    const oracle = Object.freeze({ ...entailmentOracle(v, candidate, ['apposition-expansion']),
      expectedQuery: Object.freeze({ intent: 'yes-no', subject: v.name.toLocaleLowerCase('en-US'), predicate: 'is_a', object: v.className }) });
    return { input: `${v.name}, ${nominal(v.className)}, is ${nominal(v.otherClass)}.`,
      oracle: Object.freeze({ ...oracle, acceptableStatuses: Object.freeze(['PARTIAL']),
        oracleLevel: 'query-local-decomposition', expectedAnswer: null, expectedQuery: null }),
      tags: ['decomposition', 'apposition'] };
  }),
  template('passive-active', 'explicit-passive-agent', 'explicit-passive-to-active', 5, (v) => ({
    input: `The ${v.object} was grabbed by ${v.name}.`,
    oracle: Object.freeze({ kind: 'statement-interpretation', oracleLevel: 'query-local-decomposition',
      acceptableStatuses: Object.freeze(['PARTIAL']),
      expectedAnswer: null, expectedRoute: 'heuristic-cnl-approximated',
      expectedCandidateText: `${v.name} grabbed the ${v.object}.`,
      expectedQuery: null, requiredFamilies: Object.freeze(['explicit-passive-to-active']) }),
    tags: ['decomposition', 'passive'],
  })),
  template('conditional-normalization', 'explicit-if-then', 'conditional-punctuation-normalization', 5, (v) => ({
    input: `If ${v.name} is ${nominal(v.className)}, then ${v.otherName} is calm.`,
    oracle: Object.freeze({ ...safetyOracle('if-then'), kind: 'interpretable-complex-clause',
      oracleLevel: 'proposal-only',
      expectedCandidateText: `If ${v.name} is ${nominal(v.className)} then ${v.otherName} is calm.`,
      requiredFamilies: Object.freeze(['conditional-punctuation-normalization']) }), tags: ['decomposition', 'conditional'],
  })),
  template('temporal-normalization', 'fronted-before-clause', 'temporal-clause-normalization', 5, (v) => ({
    input: `Before ${v.name} enters ${v.object}, ${v.otherName} leaves hall.`,
    oracle: Object.freeze({ ...safetyOracle('before'), kind: 'interpretable-complex-clause',
      oracleLevel: 'proposal-only',
      expectedCandidateText: `${v.otherName} leaves hall before ${v.name} enters ${v.object}.`,
      requiredFamilies: Object.freeze(['temporal-clause-normalization']) }), tags: ['decomposition', 'temporal'],
  })),
  template('causal-normalization', 'fronted-because-clause', 'causal-clause-normalization', 5, (v) => ({
    input: `Because ${v.name} is ${nominal(v.className)}, ${v.otherName} waits.`,
    oracle: Object.freeze({ ...safetyOracle('because'), kind: 'interpretable-complex-clause',
      oracleLevel: 'proposal-only',
      expectedCandidateText: `${v.otherName} waits because ${v.name} is ${nominal(v.className)}.`,
      requiredFamilies: Object.freeze(['causal-clause-normalization']) }), tags: ['decomposition', 'causal'],
  })),
  template('unique-reference', 'unique-local-pronoun', 'unique-local-reference-substitution', 5, (v) => ({
    input: `The ${v.className} entered ${v.object}. It rested.`,
    oracle: Object.freeze({ ...safetyOracle('reference'), kind: 'interpretable-complex-clause',
      oracleLevel: 'proposal-only',
      expectedCandidateText: `The ${v.className} entered ${v.object}. The ${v.className} rested.`,
      requiredFamilies: Object.freeze(['unique-local-reference-substitution']) }), tags: ['decomposition', 'reference'],
  })),
  template('summary-paragraphs', 'extractive-summary-request', 'request-planning', 3, (v) => ({
    input: `Summarize this text: ${v.name} is ${nominal(v.className)}. Every ${v.className} ${v.predicate} ${v.object}.`,
    oracle: requestOracle('summarize', 'summary'), tags: ['request', 'source-material'],
  })),
  template('summary-table', 'quoted-summary-table-request', 'result-construction', 4, (v) => ({
    input: `Summarize "${v.name} is ${nominal(v.className)}. ${v.name} ${v.predicate} ${v.object}." as a table.`,
    oracle: requestOracle('summarize', 'summary', 'table'), tags: ['request', 'source-material', 'table'],
  })),
  template('report-request', 'grounded-report-request', 'request-planning', 3, (v) => ({
    input: `Write a short report about ${v.className}.`,
    oracle: Object.freeze({ ...requestOracle('compose', 'report', 'sections'),
      acceptableStatuses: Object.freeze(['PARTIAL', 'MISSING_KNOWLEDGE']),
      alternateRoutes: Object.freeze(['heuristic-request-planned']) }),
    tags: ['request', 'retrieval'],
  })),
  template('multi-request', 'ordered-multi-operation-request', 'request-decomposition', 6, (v) => ({
    input: `Summarize "${v.name} is ${nominal(v.className)}."; then compare ${v.className} with ${v.otherClass} in a table; finally outline the evidence.`,
    oracle: Object.freeze({ ...requestOracle('summarize', 'summary'), operationSequence: Object.freeze(['summarize', 'compare', 'outline']) }),
    tags: ['request', 'multi-operation', 'aggregation'],
  })),
  template('unsafe-coordination-object', 'operator-in-nominal-object', 'nominal-safety', 6, (v) => ({
    input: `Every ${v.className} ${v.predicate} ${v.object} and checks signal. ${v.name} is ${nominal(v.className)}. `
      + `Does ${v.name} ${v.basePredicate} ${v.object} and checks signal?`,
    oracle: safetyOracle('and'), tags: ['safety', 'coordination', 'negative-control'],
  })),
  template('unsafe-negated-entity', 'negation-in-entity-surface', 'nominal-safety', 5, (v) => ({
    input: `Can not ${v.name} swim?`, oracle: safetyOracle('not'), tags: ['safety', 'negation', 'negative-control'],
  })),
  template('unsafe-quantified-class', 'quantifier-in-class-surface', 'nominal-safety', 5, (v) => ({
    input: `${v.name} is every ${v.className}. Is ${v.name} every ${v.className}?`,
    oracle: safetyOracle('every'), tags: ['safety', 'quantifier', 'negative-control'],
  })),
  template('negated-request', 'negated-artifact-request', 'request-scope-safety', 5, (v) => ({
    input: `Do not write a report about ${v.className}.`, oracle: safetyOracle('not'),
    tags: ['safety', 'request', 'negative-control'],
  })),
]);

function valuesFor(index, seed) {
  const mixed = hash(`${seed}:${index}`);
  const serial = `${alphabeticSerial(index, 3)}${alphabeticSerial(mixed % 456_976, 4)}`;
  const domain = DOMAINS[(mixed + index) % DOMAINS.length];
  const basePredicate = domain.basePredicate ?? baseVerb(domain.predicate);
  return Object.freeze({
    ...domain,
    name: `Tav${serial}`,
    otherName: `Ner${serial}`,
    className: `${domain.className}${serial}`,
    otherClass: `velin${serial}`,
    object: `${domain.object}${serial}`,
    predicate: domain.predicate,
    basePredicate,
  });
}

function generatedCase(index, seed) {
  const offset = hash(seed) % TEMPLATES.length;
  const selected = TEMPLATES[(index + offset) % TEMPLATES.length];
  const values = valuesFor(index, seed);
  const built = selected.build(values);
  return Object.freeze({
    id: `generated-heuristic-${String(index + 1).padStart(5, '0')}`,
    input: built.input,
    domain: values.id,
    technique: selected.technique,
    targetFamily: selected.targetFamily,
    complexity: selected.complexity,
    structuralTags: Object.freeze([...built.tags]),
    oracle: built.oracle,
  });
}

export function generatedHeuristicBenchmarkDefinition() {
  const core = Object.freeze({
    format: GENERATED_HEURISTIC_BENCHMARK_PROTOCOL,
    domains: Object.freeze(DOMAINS.map((item) => item.id)),
    techniques: Object.freeze(TEMPLATES.map((item) => Object.freeze({
      id: item.id, technique: item.technique, targetFamily: item.targetFamily,
      complexity: item.complexity,
    }))),
  });
  return Object.freeze({ ...core, digest: `sha256:${sha256(stableStringify(core))}` });
}

export function generateHeuristicBenchmarkCases(options = {}) {
  const size = options.size ?? DEFAULT_GENERATED_HEURISTIC_BENCHMARK_SIZE;
  const seed = options.seed ?? GENERATED_HEURISTIC_BENCHMARK_SEED;
  if (!Number.isSafeInteger(size) || size < 1 || size > MAXIMUM_CASES) {
    throw new RangeError(`Generated heuristic benchmark size must be an integer from 1 to ${MAXIMUM_CASES}.`);
  }
  if (typeof seed !== 'string' || seed.length < 1 || seed.length > 128) {
    throw new TypeError('Generated heuristic benchmark seed must be 1 to 128 characters.');
  }
  return Object.freeze(Array.from({ length: size }, (_, index) => generatedCase(index, seed)));
}

export function generatedHeuristicSuiteDigest(cases, seed) {
  return `sha256:${sha256(stableStringify({
    format: GENERATED_HEURISTIC_BENCHMARK_PROTOCOL, seed, cases,
  }))}`;
}
