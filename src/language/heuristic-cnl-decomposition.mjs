import { verbLemmaCandidates } from './heuristic-cnl-morphology.mjs';

const WEIGHTS = Object.freeze({
  'independent-clause-coordination': 0.82,
  'local-parallel-ellipsis': 0.8,
  'request-envelope-stripping': 0.75,
  'embedded-polar-question': 0.78,
  'nominalized-request-simplification': 0.73,
  'relative-clause-extraction': 0.79,
  'apposition-expansion': 0.84,
  'subordinate-clause-reordering': 0.7,
  'temporal-clause-normalization': 0.72,
  'causal-clause-normalization': 0.72,
  'conditional-punctuation-normalization': 0.9,
  'explicit-passive-to-active': 0.83,
  'nonsemantic-parenthetical-removal': 0.72,
  'discourse-filler-removal': 0.62,
  'question-last-reordering': 0.76,
  'wh-nominalization-reduction': 0.88,
  'unique-local-reference-substitution': 0.68,
});

export const COMPLEX_DECOMPOSITION_FAMILIES = Object.freeze([
  'independent-clause-coordination',
  'local-parallel-ellipsis',
  'request-envelope-stripping',
  'embedded-polar-question',
  'nominalized-request-simplification',
  'relative-clause-extraction',
  'apposition-expansion',
  'temporal-clause-normalization',
  'causal-clause-normalization',
  'conditional-punctuation-normalization',
  'explicit-passive-to-active',
  'nonsemantic-parenthetical-removal',
  'discourse-filler-removal',
  'wh-nominalization-reduction',
  'unique-local-reference-substitution',
  'question-last-reordering',
]);

function capitalize(text) {
  return `${text[0]?.toLocaleUpperCase('en-US') ?? ''}${text.slice(1)}`;
}

function decapitalizeArticle(text) {
  return text.replace(/^(The|A|An)\b/u, (article) => article.toLocaleLowerCase('en-US'));
}

function wholeEdit(source, replacement, code, confidence, options = {}) {
  return Object.freeze({
    start: 0,
    end: source.length,
    original: source,
    replacement,
    code,
    confidence,
    penalty: options.penalty ?? 0,
    sourceOperatorRealizations: Object.freeze(options.sourceOperatorRealizations ?? []),
    sourceInterrogativeRealizations: Object.freeze(options.sourceInterrogativeRealizations ?? []),
    candidateQuestionRealizations: options.candidateQuestionRealizations ?? 0,
    candidateNamedDuplications: Object.freeze(options.candidateNamedDuplications ?? []),
  });
}

function record(code, explanation, fields = {}) {
  return Object.freeze({ code, explanation, ...fields });
}

function proposal(family, source, replacement, confidence, penalty, evidence, uncertainties = [], editOptions = {}) {
  if (!replacement || replacement === source) return undefined;
  return Object.freeze({
    family,
    familyWeight: WEIGHTS[family],
    confidence,
    penalty,
    edits: Object.freeze([wholeEdit(source, replacement, family, confidence, { penalty, ...editOptions })]),
    evidence: Object.freeze(evidence),
    uncertainties: Object.freeze(uncertainties),
  });
}

function hasUnsafeCoordinationScope(text) {
  return /\b(?:not|never|neither|no|or|unless|only if)\b/iu.test(text);
}

function independentCoordination(source) {
  if (hasUnsafeCoordinationScope(source)) return undefined;
  const pattern = new RegExp(
    '^(.+?\\b(?:am|are|can|has|have|is|was|were)\\b[^,.!?]+?)\\s+and\\s+'
      + "((?:\\p{Lu}[\\p{L}\\p{M}'’-]*|the\\s+\\p{L}+)\\s+"
      + '(?:am|are|can|has|have|is|was|were)\\b[^.!?]+)\\.$',
    'iu',
  );
  const match = source.match(pattern);
  if (!match) return undefined;
  return proposal('independent-clause-coordination', source, `${match[1]}. ${capitalize(match[2])}.`,
    0.88, 0.08, [
      record('explicit-independent-conjuncts',
        'Both sides contain an explicit subject and finite auxiliary, so sentence sequence realizes conjunction.'),
      record('argument-retention', 'Every visible conjunct token is retained in its original clause.'),
    ], ['Sentence sequencing is treated as conjunction only for this explicit assertion pattern.'], {
      sourceOperatorRealizations: ['coordination:conjunction'],
    });
}

function parallelEllipsis(source) {
  if (hasUnsafeCoordinationScope(source)) return undefined;
  const match = source.match(
    /^(\p{Lu}[\p{L}\p{M}'’-]*)\s+(am|are|can|has|have|is|was|were)\s+([^,.!?]+?)\s+and\s+([^,.!?]+)\.$/u,
  );
  if (match && !/\b(?:am|are|can|has|have|is|was|were)\b/iu.test(match[4])) {
    const [, subject, auxiliary, left, right] = match;
    return proposal('local-parallel-ellipsis', source,
      `${subject} ${auxiliary} ${left}. ${subject} ${auxiliary} ${right}.`,
      0.78, 0.16, [
        record('shared-local-head',
          'The subject and auxiliary are copied only across adjacent coordinated complements.'),
        record('parallel-argument-check',
          'No second finite auxiliary or scope-sensitive operator occurs in the ellipsis.'),
      ], ['The complements are assumed to coordinate at the same local syntactic level.'], {
        sourceOperatorRealizations: ['coordination:conjunction'],
        candidateNamedDuplications: [subject.toLocaleLowerCase('en-US')],
      });
  }
  const predicatePattern = new RegExp(
    "^(\\p{Lu}[\\p{L}\\p{M}'’-]*)\\s+([\\p{Ll}\\p{M}_'’-]+(?:s|ed))\\s+"
      + "([^\\s,.!?]+)\\s+and\\s+(\\p{Lu}[\\p{L}\\p{M}'’-]*)\\s+([^\\s,.!?]+)\\.$",
    'u',
  );
  const predicateMatch = source.match(predicatePattern);
  if (!predicateMatch) return undefined;
  const [, firstSubject, predicate, firstObject, secondSubject, secondObject] = predicateMatch;
  return proposal('local-parallel-ellipsis', source,
    `${firstSubject} ${predicate} ${firstObject}. ${secondSubject} ${predicate} ${secondObject}.`,
    0.64, 0.28, [
      record('parallel-three-term-conjuncts',
        'Both conjuncts expose one subject and one object around one local predicate.'),
      record('predicate-copy-locality',
        'The predicate is copied only into the immediately adjacent elliptical conjunct.'),
    ], ['The second conjunct may have another omitted predicate; this candidate remains low-confidence.'], {
      sourceOperatorRealizations: ['coordination:conjunction'],
    });
}

function polarizeClause(clause) {
  const clean = clause.trim().replace(/[.!?]+$/u, '');
  let match;
  if ((match = clean.match(/^(.+?)\s+(is|are|was|were|can|could|will|would|has|have)\s+(.+)$/iu))) {
    return `${capitalize(match[2])} ${match[1]} ${match[3]}?`;
  }
  if ((match = clean.match(/^(\p{Lu}[\p{L}\p{M}'’-]*)\s+([\p{L}\p{M}_'’-]+)\s+(.+)$/u))) {
    const lemmas = verbLemmaCandidates(match[2].toLocaleLowerCase('en-US'));
    const lemma = lemmas.find((candidate) => candidate !== match[2].toLocaleLowerCase('en-US'));
    if (!lemma) return undefined;
    return `Does ${match[1]} ${lemma} ${match[3]}?`;
  }
  return undefined;
}

function requestEnvelope(source) {
  const requestPattern = new RegExp(
    '^(?:(?:Please\\s+)?(?:tell|show)\\s+me|(?:Could|Would)\\s+you\\s+'
      + '(?:tell|show)\\s+me)\\s+whether\\s+(.+)[?.]$',
    'iu',
  );
  const match = source.match(requestPattern);
  if (!match) return undefined;
  const replacement = polarizeClause(match[1]);
  return proposal('request-envelope-stripping', source, replacement, 0.76, 0.18, [
    record('request-content-boundary', 'A reviewed request envelope contains one explicit whether-clause.'),
    record('polar-force-retention', 'The embedded proposition is realized as one polar question.'),
  ], ['The communicative request wording is removed while its questioned proposition is retained.'], {
    sourceOperatorRealizations: /^(?:Could|Would)\b/iu.test(source)
      ? [/^Could\b/iu.test(source) ? 'modality:possible' : 'modality:hypothetical'] : [],
    sourceInterrogativeRealizations: /^(?:Could|Would)\b/iu.test(source) ? ['interrogative:polar'] : [],
  });
}

function embeddedPolarQuestion(source) {
  const match = source.match(/^(?:Do\s+you\s+know|The\s+question\s+is)\s+whether\s+(.+)[?.]$/iu);
  if (!match) return undefined;
  const replacement = polarizeClause(match[1]);
  return proposal('embedded-polar-question', source, replacement, 0.7, 0.24, [
    record('single-embedded-polar-clause', 'One whether-clause is extracted without answer or KB access.'),
    record('argument-retention', 'The embedded subject, predicate, and complements remain visible.'),
  ], ['The outer knowledge or metalinguistic attitude is not retained in the simplified question.'], {
    sourceInterrogativeRealizations: /^Do\s+you\s+know/iu.test(source) ? ['interrogative:polar'] : [],
    candidateQuestionRealizations: /\.$/u.test(source) ? 1 : 0,
  });
}

function nominalizedRequest(source) {
  const match = source.match(/^The\s+question\s+is\s+whether\s+(.+)[?.]$/iu);
  if (!match) return undefined;
  const replacement = polarizeClause(match[1]);
  return proposal('nominalized-request-simplification', source, replacement, 0.68, 0.26, [
    record('question-nominalization', 'The explicit question nominal introduces one retained whether-clause.'),
    record('polar-force-retention', 'The nominalized question is realized as one polar question.'),
  ], ['Metalinguistic framing is removed; only the questioned proposition is retained.'], {
    candidateQuestionRealizations: /\.$/u.test(source) ? 1 : 0,
  });
}

function relativeClause(source) {
  const match = source.match(
    /^(\p{Lu}[\p{L}\p{M}'’-]*),\s+who\s+(is|was|can|has)\s+([^,]+),\s+([^.!?]+)\.$/u,
  );
  if (!match) return undefined;
  const [, subject, auxiliary, relative, main] = match;
  return proposal('relative-clause-extraction', source,
    `${subject} ${auxiliary} ${relative}. ${subject} ${main}.`,
    0.83, 0.12, [
      record('unambiguous-relative-antecedent', 'The relative pronoun is locally bounded by one named antecedent.'),
      record('relative-content-retention',
        'Relative and main predicates become separate statements about that antecedent.'),
    ], ['The transformation is limited to one non-nested subject relative clause.'], {
      candidateNamedDuplications: [subject.toLocaleLowerCase('en-US')],
    });
}

function apposition(source) {
  const match = source.match(
    /^(\p{Lu}[\p{L}\p{M}'’-]*),\s+(a|an)\s+([\p{L}\p{M}_'’-]+),\s+([^.!?]+)\.$/u,
  );
  if (!match) return undefined;
  const [, subject, article, className, main] = match;
  return proposal('apposition-expansion', source,
    `${subject} is ${article} ${className}. ${subject} ${main}.`,
    0.9, 0.06, [
      record('nominal-apposition', 'A single indefinite nominal apposition is expanded as a class assertion.'),
      record('apposition-argument-retention', 'The named referent is copied into both explicit statements.'),
    ], ['The apposition is interpreted as predicative classification.'], {
      candidateNamedDuplications: [subject.toLocaleLowerCase('en-US')],
    });
}

function temporalClause(source) {
  const match = source.match(/^(When|After|Before|While)\s+([^,]+),\s+([^,.!?]+)\.$/iu);
  if (!match) return undefined;
  const [, marker, subordinate, main] = match;
  return proposal('temporal-clause-normalization', source,
    `${capitalize(main)} ${marker.toLocaleLowerCase('en-US')} ${subordinate}.`,
    0.76, 0.18, [
      record('single-explicit-subordinator',
        'One fronted subordinate clause is moved after its unchanged main clause.'),
      record('direction-token-retention', 'The temporal marker and both event clauses are retained verbatim.'),
    ], ['Clause attachment is assumed local because no nested comma or competing main clause is present.']);
}

function causalClause(source) {
  const match = source.match(/^Because\s+([^,]+),\s+([^,.!?]+)\.$/iu);
  if (!match) return undefined;
  const [, cause, consequence] = match;
  return proposal('causal-clause-normalization', source,
    `${capitalize(consequence)} because ${cause}.`,
    0.76, 0.18, [
      record('explicit-causal-subordinator', 'The consequence is reordered before its unchanged because-clause.'),
      record('causal-link-retention', 'The because marker is retained rather than replaced by a sentence boundary.'),
    ], ['Causal attachment is assumed local because no nested comma or competing clause is present.']);
}

function conditionalPunctuation(source) {
  const match = source.match(/^If\s+([^,]+),\s+then\s+([^,.!?]+)\.$/iu);
  if (!match) return undefined;
  return proposal('conditional-punctuation-normalization', source,
    `If ${match[1]} then ${match[2]}.`,
    0.98, 0.01, [record('explicit-if-then-pair',
      'Antecedent, consequent marker, argument order, and clause text remain unchanged.')]);
}

function passiveToActive(source) {
  if (/\bnot\b/iu.test(source)) return undefined;
  const match = source.match(/^(.+?)\s+(?:was|were)\s+([\p{L}\p{M}_'’-]+ed)\s+by\s+([^.!?]+)\.$/iu);
  if (!match) return undefined;
  const [, patient, predicate, agent] = match;
  return proposal('explicit-passive-to-active', source,
    `${capitalize(agent)} ${predicate.toLocaleLowerCase('en-US')} ${decapitalizeArticle(patient)}.`,
    0.86, 0.1, [
      record('explicit-by-agent',
        'The by-phrase supplies an explicit agent and the passive subject supplies the patient.'),
      record('regular-past-participle', 'Only an overt -ed predicate is reordered; no irregular verb is guessed.'),
    ], ['The -ed surface is assumed to be both the participle and simple-past active form.']);
}

function parenthetical(source) {
  const matcher = /\s*\((?:please|as noted|for reference|in short)\)\s*/giu;
  if (!matcher.test(source)) return undefined;
  matcher.lastIndex = 0;
  const replacement = source.replace(matcher, ' ').replace(/\s+([,.!?])/gu, '$1').replace(/\s{2,}/gu, ' ').trim();
  return proposal('nonsemantic-parenthetical-removal', source, replacement, 0.84, 0.1, [
    record('allowlisted-discourse-parenthetical',
      'Only a closed list of non-propositional parenthetical markers is removed.'),
  ], ['Unrecognized parenthetical content is retained and receives no proposal.']);
}

function discourseFiller(source) {
  const match = source.match(/^(?:(?:Well|Actually|In\s+fact),\s+)+(.+)$/iu);
  if (!match) return undefined;
  return proposal('discourse-filler-removal', source, capitalize(match[1]), 0.68, 0.22, [
    record('allowlisted-leading-filler',
      'One leading discourse-organizing phrase is removed; clause content is retained.'),
  ], ['Discourse emphasis is not represented in the resulting CNL candidate.']);
}

function whNominalization(source) {
  const match = source.match(/^What\s+is\s+the\s+([\p{L}\p{M}_'’-]+)\s+of\s+(.+)\?$/iu);
  if (!match) return undefined;
  const [, relation, argument] = match;
  return proposal('wh-nominalization-reduction', source,
    `What ${relation.toLocaleLowerCase('en-US')} is ${argument}?`,
    0.93, 0.04, [
      record('nominal-relation-frame', 'The of-complement becomes the unchanged subject of a property question.'),
      record('wh-argument-retention', 'The WH force, relation surface, and complete argument span are retained.'),
    ], ['The target parser must declare the same relation surface as a property frame.']);
}

function localReference(source) {
  const match = source.match(
    /^(The\s+([\p{L}\p{M}_'’-]+)\s+[^.!?]+\.)\s+It\s+([^.!?]+\.)$/u,
  );
  if (!match) return undefined;
  const [, firstSentence, head, continuation] = match;
  if (/\b(?:a|an|another|other)\s+\p{L}+\b/iu.test(firstSentence)) return undefined;
  return proposal('unique-local-reference-substitution', source,
    `${firstSentence} The ${head} ${continuation}`,
    0.69, 0.25, [
      record('adjacent-singular-definite-antecedent',
        'The immediately preceding sentence exposes one singular definite subject and no competing indefinite noun.'),
      record('neutral-singular-pronoun',
        'Only neutral singular It is replaced; gendered and plural pronouns are declined.'),
    ], ['Surface form cannot prove semantic coreference; the replacement remains a competing candidate.']);
}

function questionLast(analysis) {
  if (analysis.sentences.length < 2) return undefined;
  const questions = analysis.sentences.filter((sentence) => sentence.terminal === '?');
  if (questions.length !== 1 || questions[0] === analysis.sentences.at(-1)) return undefined;
  if (analysis.sentences.some((sentence) => !['.', '?'].includes(sentence.terminal))) return undefined;
  if (analysis.sentences.some((sentence) =>
    /\b(?:after|before|because|if|then|until|when|while)\b/iu.test(sentence.text))) return undefined;
  const statements = analysis.sentences.filter((sentence) => sentence !== questions[0])
    .map((sentence) => sentence.text);
  return proposal('question-last-reordering', analysis.text, [...statements, questions[0].text].join(' '),
    0.91, 0.04, [
      record('single-question-episode-order',
        'Complete statements are placed before the single unchanged final question.'),
      record('sentence-identity-retention', 'Every sentence is retained byte-for-byte; only sentence order changes.'),
    ], ['Reordering assumes the statements provide context rather than chronological narration.']);
}

export function generateComplexDecompositionProposals(analysis, selectedFamilies) {
  const source = analysis.text;
  const techniques = [
    ['independent-clause-coordination', () => independentCoordination(source),
      'No two safe independent finite conjuncts were found, or scope-sensitive coordination blocked splitting.'],
    ['local-parallel-ellipsis', () => parallelEllipsis(source),
      'No unique adjacent parallel frame licensed local subject, auxiliary, or predicate reconstruction.'],
    ['request-envelope-stripping', () => requestEnvelope(source),
      'No allowlisted single-clause request envelope with explicit whether was found.'],
    ['embedded-polar-question', () => embeddedPolarQuestion(source),
      'No single bounded embedded whether-question matched the reviewed matrix forms.'],
    ['nominalized-request-simplification', () => nominalizedRequest(source),
      'No single explicit question nominal introduced one bounded whether-clause.'],
    ['relative-clause-extraction', () => relativeClause(source),
      'No comma-bounded non-restrictive subject relative with one unique named antecedent was found.'],
    ['apposition-expansion', () => apposition(source),
      'No comma-bounded indefinite nominal apposition with unique attachment was found.'],
    ['temporal-clause-normalization', () => temporalClause(source),
      'No single fronted when/while/before/after clause survived the local attachment guard.'],
    ['causal-clause-normalization', () => causalClause(source),
      'No single fronted because-clause survived the local attachment guard.'],
    ['conditional-punctuation-normalization', () => conditionalPunctuation(source),
      'No explicit one-level If/then pair with visible clause boundary was found.'],
    ['explicit-passive-to-active', () => passiveToActive(source),
      'No non-negated regular -ed passive exposed both patient and by-agent.'],
    ['nonsemantic-parenthetical-removal', () => parenthetical(source),
      'No allowlisted discourse-only parenthetical was found; content-bearing parentheses remain untouched.'],
    ['discourse-filler-removal', () => discourseFiller(source),
      'No allowlisted leading discourse filler was found.'],
    ['wh-nominalization-reduction', () => whNominalization(source),
      'No single What-is-the-RELATION-of-ARGUMENT frame preserved a complete WH relation alignment.'],
    ['unique-local-reference-substitution', () => localReference(source),
      'No adjacent neutral singular pronoun had one structurally unique definite antecedent.'],
    ['question-last-reordering', () => questionLast(analysis),
      'The episode did not contain exactly one non-final question plus only complete independent statements.'],
  ];
  const proposals = [];
  const familyReceipts = [];
  for (const [family, runner, declineReason] of techniques) {
    if (selectedFamilies && !selectedFamilies.has(family)) {
      familyReceipts.push(Object.freeze({
        family, proposalsGenerated: 0, declined: true, selected: false,
        declineReason: 'The exact strategy allowlist did not select this family.',
      }));
      continue;
    }
    const candidate = runner();
    if (candidate) proposals.push(candidate);
    familyReceipts.push(Object.freeze({
      family,
      selected: true,
      proposalsGenerated: candidate ? 1 : 0,
      declined: !candidate,
      ...(candidate ? {} : { declineReason }),
    }));
  }
  return Object.freeze({ proposals: Object.freeze(proposals), familyReceipts: Object.freeze(familyReceipts) });
}
