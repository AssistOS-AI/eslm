import { sessionContextSnapshot } from '../language/session.mjs';
import { assertRuntimeTextResultContract } from './result-contract.mjs';

export function queryLocalInterpretationBase(direct, context) {
  return assertRuntimeTextResultContract({
    ...direct,
    learned: Object.freeze([]),
    learnedRules: Object.freeze([]),
    context: sessionContextSnapshot(context),
    episode: Object.freeze({
      ...direct.episode,
      transaction: 'heuristic-interpretation-query-local',
    }),
  });
}

export function ambiguityResult(direct, approximation, reparses, accepted) {
  return assertRuntimeTextResultContract({
    ...direct,
    status: 'AMBIGUOUS',
    answer: 'Several similarly supported local interpretations produced different symbolic meanings.',
    languageRoute: 'heuristic-cnl-ambiguous',
    values: [],
    provenance: [],
    usedKbVersions: [],
    reasoning: {
      method: 'heuristic-language-approximation',
      selection: 'declined-semantic-tie',
      candidateCount: accepted.length,
    },
    unresolvedSubgoals: [{
      operation: 'confirm-language-interpretation',
      candidates: accepted.map((item) => item.candidate.text),
    }],
    approximation: {
      ...approximation,
      status: 'ambiguous-reparse',
      reparses,
      selectedCandidate: null,
    },
  });
}

function acceptedApproximationResult(direct, approximation, reparses, selected) {
  const interpreted = selected.result;
  const queryLocalLearningOnly = !interpreted.query
    && ((interpreted.learned?.length ?? 0) > 0 || (interpreted.learnedRules?.length ?? 0) > 0);
  const publicStatus = queryLocalLearningOnly ? 'PARTIAL'
    : interpreted.status === 'SOLVED' ? 'DEFEASIBLE' : interpreted.status;
  return assertRuntimeTextResultContract({
    ...interpreted,
    status: publicStatus,
    ...(queryLocalLearningOnly ? {
      answer: 'I found a plausible controlled-language interpretation, but kept it query-local and did not '
        + 'save it. Restate or confirm the controlled form to add it to the session.',
      values: [],
      provenance: [],
      unresolvedSubgoals: [{
        operation: 'confirm-language-interpretation-before-session-commit',
        interpretedText: selected.candidate.text,
      }],
    } : {}),
    languageRoute: 'heuristic-cnl-approximated',
    originalInput: direct.input ?? { original: direct.episode.original },
    learned: [],
    learnedRules: [],
    context: direct.context,
    episode: {
      ...direct.episode,
      interpretedText: selected.candidate.text,
      interpretedSegments: interpreted.episode?.segments ?? [],
      transaction: 'heuristic-query-local',
    },
    reasoning: {
      ...interpreted.reasoning,
      languageInterpretation: 'heuristic-non-authoritative',
      interpretationConfidence: selected.candidate.confidence,
      ...(queryLocalLearningOnly ? { sessionEffect: 'not-committed-without-confirmation' } : {}),
    },
    approximation: {
      ...approximation,
      status: 'accepted-reparse',
      selectedCandidate: selected.candidate,
      reparses,
      ephemeralPremises: Object.freeze({
        facts: Object.freeze(interpreted.learned ?? []),
        rules: Object.freeze(interpreted.learnedRules ?? []),
        committed: false,
      }),
    },
  });
}

export async function executeQueryLocalInterpretation({
  runtime, selected, context, direct, approximation, reparses,
}) {
  if (!runtime || typeof runtime.ask !== 'function') {
    throw new TypeError('Query-local interpretation execution requires a runtime ask function.');
  }
  if (!selected?.candidate || typeof selected.candidate.text !== 'string') {
    throw new TypeError('Query-local interpretation execution requires one selected candidate.');
  }
  const executed = await runtime.ask(selected.candidate.text, sessionContextSnapshot(context), {
    grounding: false,
  });
  return acceptedApproximationResult(direct, approximation, reparses, {
    ...selected,
    result: executed,
  });
}

export function noAcceptedReparseResult(direct, approximation, reparses) {
  return assertRuntimeTextResultContract({
    ...direct,
    approximation: {
      ...approximation,
      status: approximation.status === 'RESOURCE_LIMIT'
        ? 'resource-limit' : 'no-accepted-reparse',
      reparses,
      selectedCandidate: null,
    },
  });
}
