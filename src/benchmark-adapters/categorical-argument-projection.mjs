function cleanSurface(value) {
  return value.normalize('NFKC').replace(/<[^>]*>/gu, ' ').replace(/[“”]/gu, '"')
    .replace(/[‘’]/gu, "'").replace(/\s+/gu, ' ').trim();
}

function canonicalTerm(value) {
  return cleanSurface(value).toLocaleLowerCase('en-US')
    .replace(/^(?:a|an|the)\s+/u, '')
    .replace(/[.,;:!?"']+$/gu, '')
    .replace(/\s+/gu, '-');
}

function safeAtomicSurface(value) {
  if (value.length === 0 || value.length > 160) return false;
  if (/\b(?:and|or|unless|if|except|neither|either)\b/iu.test(value)) return false;
  return !/[()[\]{}:;]/u.test(value);
}

export function parseCategoricalEnglishProposition(source) {
  const text = cleanSurface(source).replace(/^[,.;:\s]+|[,.;:\s]+$/gu, '');
  const quantified = /^(all|every|each|no|some)\s+(.+)$/iu.exec(text);
  if (!quantified) return Object.freeze({ status: 'UNPARSED', diagnostic: 'missing categorical quantifier' });
  const quantifierWord = quantified[1].toLocaleLowerCase('en-US');
  const body = quantified[2];
  let match = /^(.+?)\s+(?:is|are|was|were)\s+(not\s+)?(.+)$/iu.exec(body);
  let negative = Boolean(match?.[2]);
  if (!match) {
    match = /^(.+?)\s+(?:do\s+not|does\s+not|don't|doesn't|did\s+not|didn't)\s+(.+)$/iu.exec(body);
    negative = Boolean(match);
  }
  if (!match) return Object.freeze({ status: 'UNPARSED', diagnostic: 'unsupported categorical predication' });
  const subjectSurface = match[1].trim();
  const predicateSurface = (match[3] ?? match[2]).trim();
  if (!safeAtomicSurface(subjectSurface) || !safeAtomicSurface(predicateSurface)) {
    return Object.freeze({ status: 'UNPARSED', diagnostic: 'compound or unbounded categorical term' });
  }
  if (quantifierWord === 'no' && negative) {
    return Object.freeze({ status: 'UNPARSED', diagnostic: 'double-negative categorical surface' });
  }
  const subject = canonicalTerm(subjectSurface);
  const predicate = canonicalTerm(predicateSurface.replace(/^not\s+/iu, ''));
  if (!subject || !predicate || subject === predicate) {
    return Object.freeze({ status: 'UNPARSED', diagnostic: 'degenerate categorical term pair' });
  }
  let quantifier;
  if (quantifierWord === 'no') quantifier = 'none';
  else if (quantifierWord === 'some') quantifier = negative ? 'some-not' : 'some';
  else {
    if (negative) return Object.freeze({ status: 'UNPARSED', diagnostic: 'negative universal is not normalized' });
    quantifier = 'all';
  }
  return Object.freeze({ status: 'PARSED', proposition: Object.freeze({ quantifier, subject, predicate }),
    surface: text });
}

function questionOperation(question) {
  const text = cleanSurface(question);
  const asksForSufficientPremise = /if assumed[^?]*(?:conclusion|properly drawn)/iu.test(text)
    || /conclusion[^?]*follows logically if/iu.test(text)
    || /can guarantee\s+(?:the\s+)?(?:above\s+)?argument/iu.test(text);
  if (asksForSufficientPremise) return 'select-sufficient-premise';
  if (/(?:must (?:also )?be true|can be properly inferred from|can be inferred from|which[^?]*follows logically from)/iu
    .test(text)) return 'select-entailed-candidate';
  return undefined;
}

function splitClauses(source) {
  return cleanSurface(source).split(/[.;]+/u).map((clause) => clause.trim()).filter(Boolean);
}

function parseClauseSequence(source) {
  const clauses = splitClauses(source);
  if (clauses.length === 0) return Object.freeze({ status: 'UNPARSED', diagnostic: 'empty premise sequence' });
  const propositions = [];
  for (const [index, clause] of clauses.entries()) {
    const parsed = parseCategoricalEnglishProposition(clause);
    if (parsed.status !== 'PARSED') {
      return Object.freeze({ status: 'UNPARSED', diagnostic: `premise ${index + 1}: ${parsed.diagnostic}` });
    }
    propositions.push(parsed.proposition);
  }
  return Object.freeze({ status: 'PARSED', propositions: Object.freeze(propositions) });
}

function splitExplicitArgument(passage) {
  const source = cleanSurface(passage);
  const markers = [...source.matchAll(/\b(?:therefore|thus|hence|consequently)\b|,\s*so\b/giu)];
  if (markers.length !== 1) {
    return Object.freeze({ status: 'UNPARSED', diagnostic: 'requires exactly one explicit conclusion marker' });
  }
  const marker = markers[0];
  const premises = source.slice(0, marker.index).replace(/[,;:\s]+$/u, '');
  const conclusion = source.slice(marker.index + marker[0].length).replace(/^[,;:\s]+/u, '');
  if (!premises || !conclusion) {
    return Object.freeze({ status: 'UNPARSED', diagnostic: 'empty side of explicit conclusion marker' });
  }
  return Object.freeze({ status: 'PARSED', premises, conclusion });
}

export function compileCategoricalArgumentChoiceTask(choiceTask) {
  if (!choiceTask || typeof choiceTask !== 'object' || !Array.isArray(choiceTask.candidates)) {
    return Object.freeze({ status: 'NO_APPLICABLE_METHOD', failureStage: 'task-shape',
      diagnostic: 'expected a passage, question, and candidate array' });
  }
  const operation = questionOperation(choiceTask.question);
  if (!operation) return Object.freeze({ status: 'NO_APPLICABLE_METHOD', failureStage: 'question-operation',
    diagnostic: 'question does not declare a supported proof obligation' });

  let premises;
  let conclusion;
  if (operation === 'select-sufficient-premise') {
    const argument = splitExplicitArgument(choiceTask.passage);
    if (argument.status !== 'PARSED') return Object.freeze({ status: 'NO_APPLICABLE_METHOD',
      failureStage: 'argument-boundary', operation, diagnostic: argument.diagnostic });
    const parsedPremises = parseClauseSequence(argument.premises);
    if (parsedPremises.status !== 'PARSED') return Object.freeze({ status: 'NO_APPLICABLE_METHOD',
      failureStage: 'premise-semantics', operation, diagnostic: parsedPremises.diagnostic });
    const parsedConclusion = parseCategoricalEnglishProposition(argument.conclusion);
    if (parsedConclusion.status !== 'PARSED') return Object.freeze({ status: 'NO_APPLICABLE_METHOD',
      failureStage: 'conclusion-semantics', operation, diagnostic: parsedConclusion.diagnostic });
    premises = parsedPremises.propositions;
    conclusion = parsedConclusion.proposition;
  } else {
    const parsedPremises = parseClauseSequence(choiceTask.passage);
    if (parsedPremises.status !== 'PARSED') return Object.freeze({ status: 'NO_APPLICABLE_METHOD',
      failureStage: 'premise-semantics', operation, diagnostic: parsedPremises.diagnostic });
    premises = parsedPremises.propositions;
  }

  const candidates = [];
  for (const [index, candidate] of choiceTask.candidates.entries()) {
    const parsed = parseCategoricalEnglishProposition(candidate.text);
    if (parsed.status !== 'PARSED') return Object.freeze({ status: 'NO_APPLICABLE_METHOD',
      failureStage: 'candidate-semantics', operation,
      diagnostic: `candidate ${index + 1}: ${parsed.diagnostic}` });
    candidates.push(Object.freeze({ candidateId: candidate.candidateId, proposition: parsed.proposition }));
  }
  return Object.freeze({
    status: 'COMPILED',
    operation,
    task: Object.freeze({
      schema: 'categorical-argument-selection-v1',
      operation,
      premises,
      ...(conclusion ? { conclusion } : {}),
      candidates: Object.freeze(candidates),
      limits: Object.freeze({ maximumTerms: 32, maximumPropositions: 128,
        maximumCandidates: 16, maximumClosureSteps: 16_384 }),
    }),
    witness: Object.freeze({ kind: 'categorical-argument-projection-v1', operation,
      premiseCount: premises.length, candidateCount: candidates.length }),
  });
}
