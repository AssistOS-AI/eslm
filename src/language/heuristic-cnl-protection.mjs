import { tokenizeHeuristicSurface } from './heuristic-cnl-surface.mjs';

const OPERATOR_IDENTITIES = Object.freeze({
  all: 'quantifier:universal', every: 'quantifier:universal', each: 'quantifier:universal',
  some: 'quantifier:existential', any: 'quantifier:free-choice', none: 'quantifier:none',
  no: 'quantifier:none', not: 'polarity:negative', never: 'polarity:never', neither: 'polarity:neither',
  and: 'coordination:conjunction', both: 'coordination:both',
  or: 'coordination:disjunction', either: 'coordination:either',
  if: 'conditional:antecedent', then: 'conditional:consequent', unless: 'conditional:unless',
  may: 'modality:possible', might: 'modality:possible', can: 'modality:possible',
  could: 'modality:possible', must: 'modality:necessary', should: 'modality:advisable',
  would: 'modality:hypothetical',
  before: 'temporal:before', earlier: 'temporal:before', after: 'temporal:after',
  later: 'temporal:after', until: 'temporal:until', when: 'temporal:when', while: 'temporal:overlap',
  because: 'causal:because', therefore: 'causal:therefore',
  left: 'direction:left', right: 'direction:right', above: 'direction:above', below: 'direction:below',
  north: 'direction:north', south: 'direction:south', inside: 'direction:inside',
  outside: 'direction:outside', contains: 'direction:contains',
});

const INTERROGATIVES = Object.freeze({
  who: 'interrogative:who', what: 'interrogative:what', where: 'interrogative:where',
  when: 'interrogative:when', why: 'interrogative:why', how: 'interrogative:how',
  which: 'interrogative:which', whether: 'interrogative:polar',
});

const NON_NAME_SENTENCE_STARTS = new Set([
  ...Object.keys(OPERATOR_IDENTITIES), ...Object.keys(INTERROGATIVES),
  'a', 'an', 'the', 'am', 'are', 'be', 'did', 'do', 'does', 'has', 'have', 'is', 'was', 'were',
  'please', 'tell', 'show', 'well', 'actually', 'fact', 'i', 'you', 'he', 'she', 'it', 'they',
]);

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function occurrenceCount(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function comparisonIdentities(text) {
  const identities = [];
  const patterns = [
    [/\b(?:more|greater|larger|bigger|higher|older)\s+than\b/giu, 'comparison:greater'],
    [/\b(?:less|smaller|lower|younger)\s+than\b/giu, 'comparison:less'],
    [/(?:<=|>=|<|>)/gu, 'comparison:symbolic-order'],
    [/\b(?:equal to|equals|same as)\b/giu, 'comparison:equality'],
    [/\b(?:not equal to|different from)\b/giu, 'comparison:inequality'],
  ];
  for (const [pattern, identity] of patterns) {
    for (let index = 0; index < occurrenceCount(text, pattern); index += 1) identities.push(identity);
  }
  return identities;
}

function quotedMaterial(text) {
  return [...text.matchAll(/["“]([^"”]{1,256})["”]/gu)].map((match) => match[1]);
}

function namedSurfaceTokens(tokens) {
  return tokens.filter((token) => /^\p{Lu}/u.test(token.surface)
    && !NON_NAME_SENTENCE_STARTS.has(token.normalized)).map((token) => token.normalized);
}

export function inspectHeuristicCnlProtection(text) {
  const tokens = tokenizeHeuristicSurface(text);
  const identities = [];
  const interrogatives = [];
  const numbers = [];
  for (const [index, token] of tokens.entries()) {
    if (!token.isWord) continue;
    const operator = OPERATOR_IDENTITIES[token.normalized];
    if (operator) identities.push(operator);
    const previous = tokens[index - 1];
    const relativePronoun = ['who', 'which'].includes(token.normalized) && previous?.surface === ',';
    const temporalWhen = token.normalized === 'when' && !/\?/u.test(text);
    const interrogative = relativePronoun || temporalWhen ? undefined : INTERROGATIVES[token.normalized];
    if (interrogative) interrogatives.push(interrogative);
    if (/^\p{N}/u.test(token.surface)) numbers.push(token.surface);
  }
  const polarPattern = new RegExp(
    '(?:^|[.!?;]\\s*)(?:am|are|can|could|did|do|does|has|have|is|may|might|must|should|was|were|'
      + 'will|would)\\b[^?]*\\?',
    'giu',
  );
  for (const _match of text.matchAll(polarPattern)) interrogatives.push('interrogative:polar');
  identities.push(...comparisonIdentities(text));
  return Object.freeze({
    operatorIdentities: Object.freeze(sorted(identities)),
    interrogativeIdentities: Object.freeze(sorted(interrogatives)),
    questionCount: occurrenceCount(text, /\?/gu),
    numbers: Object.freeze(sorted(numbers)),
    quotedMaterial: Object.freeze(sorted(quotedMaterial(text))),
    namedSurfaces: Object.freeze(sorted(namedSurfaceTokens(tokens))),
  });
}

function differences(left, right, field) {
  if (JSON.stringify(left) === JSON.stringify(right)) return [];
  return [{ field, source: left, candidate: right }];
}

function consumeIdentities(identities, credits) {
  const retained = [...identities];
  const unapplied = [];
  for (const credit of credits) {
    const index = retained.indexOf(credit);
    if (index < 0) unapplied.push(credit);
    else retained.splice(index, 1);
  }
  return Object.freeze({ retained: Object.freeze(sorted(retained)), unapplied: Object.freeze(unapplied) });
}

export function compareHeuristicCnlProtection(sourceText, candidateText, options = {}) {
  const source = inspectHeuristicCnlProtection(sourceText);
  const candidate = inspectHeuristicCnlProtection(candidateText);
  const credits = options.sourceOperatorRealizations ?? [];
  const consumed = consumeIdentities(source.operatorIdentities, credits);
  const interrogativeCredits = options.sourceInterrogativeRealizations ?? [];
  const consumedInterrogatives = consumeIdentities(source.interrogativeIdentities, interrogativeCredits);
  const candidateInterrogativeCredits = options.candidateInterrogativeRealizations ?? [];
  const consumedCandidateInterrogatives = consumeIdentities(
    candidate.interrogativeIdentities,
    candidateInterrogativeCredits,
  );
  const candidateQuestionRealizations = options.candidateQuestionRealizations ?? 0;
  const adjustedCandidateQuestionCount = candidate.questionCount - candidateQuestionRealizations;
  const candidateNamedDuplications = options.candidateNamedDuplications ?? [];
  const consumedCandidateNames = consumeIdentities(candidate.namedSurfaces, candidateNamedDuplications);
  const differencesFound = [
    ...differences(consumed.retained, candidate.operatorIdentities, 'operatorIdentities'),
    ...differences(consumedInterrogatives.retained, consumedCandidateInterrogatives.retained,
      'interrogativeIdentities'),
    ...differences(source.questionCount, adjustedCandidateQuestionCount, 'questionCount'),
    ...differences(source.numbers, candidate.numbers, 'numbers'),
    ...differences(source.quotedMaterial, candidate.quotedMaterial, 'quotedMaterial'),
    ...differences(source.namedSurfaces, consumedCandidateNames.retained, 'namedSurfaces'),
    ...(consumed.unapplied.length > 0 ? [{
      field: 'sourceOperatorRealizations', source: credits, candidate: consumed.unapplied,
    }] : []),
    ...(consumedInterrogatives.unapplied.length > 0 ? [{
      field: 'sourceInterrogativeRealizations', source: interrogativeCredits,
      candidate: consumedInterrogatives.unapplied,
    }] : []),
    ...(consumedCandidateInterrogatives.unapplied.length > 0 ? [{
      field: 'candidateInterrogativeRealizations', source: candidateInterrogativeCredits,
      candidate: consumedCandidateInterrogatives.unapplied,
    }] : []),
    ...(!Number.isSafeInteger(candidateQuestionRealizations) || candidateQuestionRealizations < 0
      || adjustedCandidateQuestionCount < 0 ? [{
        field: 'candidateQuestionRealizations', source: source.questionCount,
        candidate: candidateQuestionRealizations,
      }] : []),
    ...(consumedCandidateNames.unapplied.length > 0 ? [{
      field: 'candidateNamedDuplications', source: candidateNamedDuplications,
      candidate: consumedCandidateNames.unapplied,
    }] : []),
  ];
  return Object.freeze({ preserved: differencesFound.length === 0, source, candidate,
    sourceOperatorRealizations: Object.freeze([...credits]),
    sourceInterrogativeRealizations: Object.freeze([...interrogativeCredits]),
    candidateInterrogativeRealizations: Object.freeze([...candidateInterrogativeCredits]),
    candidateQuestionRealizations,
    candidateNamedDuplications: Object.freeze([...candidateNamedDuplications]),
    differences: Object.freeze(differencesFound) });
}
