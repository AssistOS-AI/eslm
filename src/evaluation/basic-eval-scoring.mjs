const SUCCESS = new Set(['SOLVED', 'PARTIAL', 'DEFEASIBLE']);

export function normalizeBasicEvalAnswer(value) {
  return String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase('en-US')
    .replace(/^the symbolic result is\s+[“"]?|[”"]?\.?$/gu, '')
    .replace(/\b(?:lei|ron)\b/gu, 'ron')
    .replace(/\s+/gu, ' ')
    .replace(/[.!?]+$/gu, '')
    .trim();
}

function answerCandidates(testCase) {
  return [testCase.reference.answer, ...(testCase.acceptableAnswers ?? [])]
    .map(normalizeBasicEvalAnswer);
}

function numericEquivalent(left, right) {
  const parse = (value) => {
    const match = normalizeBasicEvalAnswer(value).match(/^(-?\d+(?:\.\d+)?)\s*(.*)$/u);
    if (!match) return undefined;
    return { value: Number(match[1]), unit: match[2].trim() };
  };
  const a = parse(left);
  const b = parse(right);
  return a && b && a.unit === b.unit && Math.abs(a.value - b.value) <= 1e-9;
}

function requiredCoverage(testCase, answer) {
  const required = testCase.reference.requiredConcepts ?? [];
  if (required.length === 0) return 1;
  const surface = normalizeBasicEvalAnswer(answer);
  return required.filter((concept) => surface.includes(normalizeBasicEvalAnswer(concept))).length
    / required.length;
}

function forbiddenPresent(testCase, answer) {
  const surface = normalizeBasicEvalAnswer(answer);
  return (testCase.reference.forbiddenClaims ?? []).some((claim) =>
    surface.includes(normalizeBasicEvalAnswer(claim)));
}

function diagnose(result, exactCorrect) {
  if (result.languageRoute === 'english-language-gate-rejected') {
    return { earliestStage: 'language-boundary', code: 'likely-non-english',
      summary: 'The local English boundary rejected the request before task framing.' };
  }
  if (result.status === 'UNPARSED') return { earliestStage: 'parse', code: 'no-supported-structure',
    summary: 'No admitted parser or bounded request framer represented the requested operation.' };
  if (!result.taskFrame) return { earliestStage: 'task-frame', code: 'missing-task-frame',
    summary: 'The request did not become an executable typed task.' };
  if (result.status === 'MISSING_KNOWLEDGE' || result.status === 'UNKNOWN') {
    return { earliestStage: 'grounding', code: 'answer-evidence-unavailable',
      summary: 'The selected profile supplied no admitted evidence for the requested answer.' };
  }
  if (result.status === 'NO_APPLICABLE_METHOD') return { earliestStage: 'planning',
    code: 'no-applicable-method', summary: 'No eligible bounded method was selected for the task frame.' };
  if (!exactCorrect) return { earliestStage: 'reasoning', code: 'answer-mismatch',
    summary: 'Execution returned an answer that does not satisfy the exact reference contract.' };
  return { earliestStage: 'realization', code: 'semantic-review-required',
    summary: 'The machine result needs semantic review for completeness and instruction fit.' };
}

export function scoreBasicEvalCase(testCase, result) {
  const exactCorrect = answerCandidates(testCase).includes(normalizeBasicEvalAnswer(result.answer))
    || [testCase.reference.answer, ...(testCase.acceptableAnswers ?? [])].some((candidate) =>
      numericEquivalent(candidate, result.answer));
  if (testCase.scoring === 'exact') {
    const pass = SUCCESS.has(result.status) && exactCorrect;
    return {
      score: {
        state: pass ? 'pass' : 'fail', deterministic: true,
        dimensions: { correctness: pass ? 1 : 0, completeness: pass ? 1 : 0,
          grounding: pass ? 1 : 0, instructionFit: pass ? 1 : 0, naturalness: pass ? 1 : 0 },
        explanation: pass ? 'The normalized answer satisfies the exact case contract.'
          : 'The status or normalized answer does not satisfy the exact case contract.',
      },
      diagnosis: pass ? { earliestStage: null, code: null, summary: '' }
        : diagnose(result, exactCorrect),
    };
  }
  const coverage = requiredCoverage(testCase, result.answer);
  const forbidden = forbiddenPresent(testCase, result.answer);
  const machineFailure = !SUCCESS.has(result.status) || forbidden;
  return {
    score: {
      state: machineFailure ? 'fail' : 'review', deterministic: false,
      dimensions: {
        correctness: machineFailure ? 0 : exactCorrect ? 1 : null,
        completeness: coverage,
        grounding: machineFailure ? 0 : null,
        instructionFit: null,
        naturalness: null,
      },
      explanation: machineFailure
        ? 'The symbolic status or a forbidden claim fails the semantic preconditions.'
        : 'The result passed machine preconditions and awaits explicit semantic review.',
    },
    diagnosis: machineFailure ? diagnose(result, false)
      : { earliestStage: null, code: null, summary: 'Awaiting semantic review.' },
  };
}
