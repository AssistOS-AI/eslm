import { createHash } from 'node:crypto';
import { compileCategoricalArgumentChoiceTask } from './categorical-argument-projection.mjs';
import {
  selectCategoricalArgumentCandidate,
  verifyCategoricalArgumentSelection,
} from '../reasoning/categorical-argument-validation.mjs';

export function logicalChoiceInvariant(condition, sourceName, path, message) {
  if (!condition) throw new Error(`${sourceName} ${path}: ${message}`);
}

export function requireLogicalChoiceText(value, sourceName, path) {
  logicalChoiceInvariant(typeof value === 'string' && value.trim().length > 0,
    sourceName, path, 'expected non-empty text.');
  logicalChoiceInvariant(!value.includes('\0') && !value.includes('\uFFFD'),
    sourceName, path, 'contains an invalid text character.');
  return value.normalize('NFKC').trim();
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function candidateId(text, occurrence) {
  return `candidate:${sha256(`${text}\0${occurrence}`).slice(0, 24)}`;
}

export function buildLogicalMultipleChoiceTask({ sourceFamily, sourceSplit, caseKey, passage, question, answers }) {
  const normalizedPassage = requireLogicalChoiceText(passage, sourceFamily, 'passage');
  const normalizedQuestion = requireLogicalChoiceText(question, sourceFamily, 'question');
  logicalChoiceInvariant(Array.isArray(answers) && answers.length === 4,
    sourceFamily, 'answers', 'expected exactly four answer candidates.');
  const occurrences = new Map();
  const candidates = answers.map((answer, index) => {
    const text = requireLogicalChoiceText(answer, sourceFamily, `answers[${index}]`);
    const occurrence = occurrences.get(text) ?? 0;
    occurrences.set(text, occurrence + 1);
    return Object.freeze({ candidateId: candidateId(text, occurrence), text });
  });
  requireLogicalChoiceText(caseKey, sourceFamily, 'caseKey');
  const visibleSignature = sha256([
    sourceFamily,
    sourceSplit,
    caseKey,
    normalizedPassage,
    normalizedQuestion,
    ...candidates.map((candidate) => candidate.text),
  ].join('\0'));
  return Object.freeze({
    taskId: `logical-reading:${visibleSignature.slice(0, 32)}`,
    operation: 'select-logical-reading-comprehension-option',
    sourceFamily,
    sourceSplit,
    passage: normalizedPassage,
    question: normalizedQuestion,
    candidates: Object.freeze(candidates),
    outputContract: Object.freeze({ kind: 'candidate-id' }),
  });
}

export function isolateLogicalMultipleChoiceOracle(task, labelIndex, sourceName, path = 'label') {
  logicalChoiceInvariant(Number.isInteger(labelIndex) && labelIndex >= 0 && labelIndex < task.candidates.length,
    sourceName, path, `expected an integer from 0 through ${task.candidates.length - 1}.`);
  return Object.freeze({ preferredCandidateId: task.candidates[labelIndex].candidateId });
}

function increment(target, key) {
  target[key] = (target[key] ?? 0) + 1;
}

export async function runLogicalMultipleChoiceProbe(engine, collected, metadata) {
  logicalChoiceInvariant(engine && typeof engine.executeTask === 'function', metadata.family, 'engine',
    'expected an ESLM-compatible task engine.');
  const statusCounts = {};
  let answered = 0;
  let correctAmongAnswered = 0;
  let witnessBearing = 0;
  let witnessVerified = 0;
  let categoricalMethodAttempts = 0;
  const projectionFailureCounts = {};
  const projectionDiagnosticCounts = {};
  const recognizedOperationCounts = {};
  for (const task of collected.cases) {
    const projection = compileCategoricalArgumentChoiceTask(task);
    let result;
    if (projection.status === 'COMPILED') {
      categoricalMethodAttempts += 1;
      result = selectCategoricalArgumentCandidate(projection.task);
      if (verifyCategoricalArgumentSelection(projection.task, result)) witnessVerified += 1;
      else result = Object.freeze({ status: 'INVALID_WITNESS', values: [] });
    } else {
      increment(projectionFailureCounts, projection.failureStage ?? 'unspecified');
      if (projection.operation) increment(recognizedOperationCounts, projection.operation);
      const diagnostic = projection.diagnostic?.replace(/^(?:premise|candidate) \d+: /u, '') ?? 'unspecified';
      increment(projectionDiagnosticCounts, diagnostic);
      result = await engine.executeTask(task);
    }
    const status = result?.status ?? 'MISSING_STATUS';
    increment(statusCounts, status);
    const prediction = result?.values?.length === 1 ? result.values[0] : undefined;
    if (prediction === undefined) continue;
    answered += 1;
    correctAmongAnswered += Number(prediction === collected.oracle.get(task.taskId));
    witnessBearing += Number(result.witness !== undefined || result.proof !== undefined
      || result.countermodel !== undefined);
  }
  const benchmarkAccuracy = answered > 0 ? correctAmongAnswered / collected.cases.length : null;
  return Object.freeze({
    format: metadata.resultFormat,
    protocol: metadata.protocol,
    evidenceRegime: metadata.evidenceRegime,
    claimBoundary: metadata.claimBoundary,
    runtimeProfile: 'direct-symbolic-typed-task-no-language-agent',
    available: collected.cases.length,
    tested: collected.cases.length,
    answered,
    correct: answered > 0 ? correctAmongAnswered : null,
    benchmarkAccuracy,
    accuracyOnAnswered: answered > 0 ? correctAmongAnswered / answered : null,
    scoreStatus: answered > 0 ? 'scored-attempts-present' : 'not-scored-no-applicable-method',
    statusCounts: Object.freeze(statusCounts),
    witnessBearing,
    witnessVerified,
    categoricalMethodAttempts,
    projectionFailureCounts: Object.freeze(projectionFailureCounts),
    projectionDiagnosticCounts: Object.freeze(projectionDiagnosticCounts),
    recognizedOperationCounts: Object.freeze(recognizedOperationCounts),
    normalizationCandidates: null,
    normalizationMeasurement: 'not-applicable-to-source-native-typed-task-projection',
    languageAgentInvocations: 0,
    protectedSplit: Object.freeze(metadata.protectedSplit),
  });
}
