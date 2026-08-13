import test from 'node:test';
import assert from 'node:assert/strict';
import { planHeuristicRequest } from '../src/language/heuristic-request-planning.mjs';
import { synthesizeHeuristicRequest } from '../src/runtime/heuristic-request-synthesis.mjs';
import { assertRuntimeTextResultContract } from '../src/runtime/result-contract.mjs';
import {
  createGroundingBundle, createGroundingRequest, makeGroundingEntry, makeGroundingSearchReceipt,
} from '../src/reasoning/grounding-retrieval.mjs';
import { textResult } from './fixtures/runtime-result.mjs';

test('request-planning and synthesis payloads enforce their versions and route-status ownership', () => {
  const requestPlanning = planHeuristicRequest(
    'Summarize this text: A qorin is calm. Every qorin rests.',
  );
  assert.equal(assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', requestPlanning,
  })).requestPlanning.status, 'PLANNED');
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', requestPlanning: {
      ...requestPlanning, receipt: { ...requestPlanning.receipt, patternCatalog: 'catalog:unknown' },
    },
  })), /pattern catalog/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', requestPlanning: {
      ...requestPlanning, candidates: Array(65).fill(requestPlanning.candidates[0]),
    },
  })), /requestPlanning\.candidates must be an array with at most 64 items/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', requestPlanning: {
      ...requestPlanning, selectedPlan: {
        ...requestPlanning.selectedPlan,
        operationPlans: Array(9).fill(requestPlanning.selectedPlan.operationPlans[0]),
      },
    },
  })), /operationPlans must be an array with at most 8 items/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', requestPlanning: {
      ...requestPlanning, selectedPlan: {
        ...requestPlanning.selectedPlan,
        operationPlans: [{
          ...requestPlanning.selectedPlan.operationPlans[0], operationId: 'operation:7',
        }],
      },
    },
  })), /contiguous operation identity and order/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', requestPlanning: {
      ...requestPlanning, selectedPlan: {
        ...requestPlanning.selectedPlan,
        instructionSegments: requestPlanning.selectedPlan.instructionSegments.map((segment) => ({
          ...segment, operations: [],
        })),
      },
    },
  })), /intent is absent from its instruction segment/u);
  const topicPlanning = planHeuristicRequest('Write a report about qorins.');
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', requestPlanning: {
      ...topicPlanning, selectedPlan: {
        ...topicPlanning.selectedPlan,
        operationPlans: topicPlanning.selectedPlan.operationPlans.map((operation) => ({
          ...operation, topicIds: [],
        })),
      },
    },
  })), /topicIds contradict its instruction segment/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', requestPlanning: {
      ...requestPlanning, selectedPlan: {
        ...requestPlanning.selectedPlan,
        outputContract: { ...requestPlanning.selectedPlan.outputContract, artifact: 'forged-report' },
      },
    },
  })), /outputContract contradicts the selected request plan/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', requestPlanning: {
      ...requestPlanning, receipt: {
        ...requestPlanning.receipt,
        requestForce: { ...requestPlanning.receipt.requestForce, acceptedSegments: 9 },
      },
    },
  })), /inconsistent segment counters/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', requestPlanning: {
      ...requestPlanning, receipt: {
        ...requestPlanning.receipt,
        topicSelection: {
          ...requestPlanning.receipt.topicSelection, returnedTopics: 9,
        },
      },
    },
  })), /inconsistent topic-selection counters/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', requestPlanning: {
      ...requestPlanning, receipt: {
        ...requestPlanning.receipt,
        operationSelection: {
          ...requestPlanning.receipt.operationSelection, omitted: 1,
        },
      },
    },
  })), /inconsistent operation-selection counters/u);
  const forwardCompatiblePlanning = {
    ...requestPlanning,
    reviewMetadata: { bounded: true },
    selectedPlan: { ...requestPlanning.selectedPlan, reviewMetadata: { bounded: true } },
    receipt: { ...requestPlanning.receipt, reviewMetadata: { bounded: true } },
  };
  assert.equal(assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', requestPlanning: forwardCompatiblePlanning,
  })).requestPlanning, forwardCompatiblePlanning);

  const synthesis = synthesizeHeuristicRequest(requestPlanning);
  const synthesized = textResult({
    status: 'PARTIAL', answer: synthesis.answer, languageRoute: 'heuristic-request-synthesis',
    requestPlanning, synthesis,
  });
  assert.equal(assertRuntimeTextResultContract(synthesized), synthesized);
  assert.throws(() => assertRuntimeTextResultContract({
    ...synthesized, synthesis: { ...synthesis, operationArtifacts: [] },
  }), /correspond one-to-one/u);
  assert.throws(() => assertRuntimeTextResultContract({
    ...synthesized, synthesis: {
      ...synthesis,
      operationArtifacts: synthesis.operationArtifacts.map((artifact) => ({
        ...artifact, operationId: 'operation:8',
      })),
    },
  }), /contradicts its ordered selected operation/u);
  assert.throws(() => assertRuntimeTextResultContract({
    ...synthesized, synthesis: {
      ...synthesis,
      operationArtifacts: synthesis.operationArtifacts.map((artifact) => ({
        ...artifact, gaps: [],
      })),
    },
  }), /incomplete structural coverage gap/u);
  assert.throws(() => assertRuntimeTextResultContract({
    ...synthesized, synthesis: {
      ...synthesis,
      operationArtifacts: synthesis.operationArtifacts.map((artifact) => ({
        ...artifact, evidence: {
          ...artifact.evidence, candidatesConsidered: 513,
        },
      })),
    },
  }), /safe integer from 0 through 512/u);
  assert.throws(() => assertRuntimeTextResultContract({
    ...synthesized, synthesis: {
      ...synthesis,
      operationArtifacts: synthesis.operationArtifacts.map((artifact) => ({
        ...artifact,
        sourceSummary: artifact.sourceSummary && {
          ...artifact.sourceSummary, selected: Array(9).fill(artifact.sourceSummary.selected[0]),
        },
      })),
    },
  }), /sourceSummary\.selected must be an array with at most 8 items/u);

  const evidencePlanning = planHeuristicRequest('Write a report about qorins.');
  const evidenceRequest = createGroundingRequest(
    'Write a report about qorins.',
    'UNPARSED',
    undefined,
    {
      focus: evidencePlanning.selectedPlan.topics.map((topic) => ({
        focusId: topic.topicId, term: topic.surface, role: 'request-topic',
      })),
    },
  );
  const evidenceGrounding = createGroundingBundle({
    request: evidenceRequest,
    triggerStatus: 'UNPARSED',
    entries: [makeGroundingEntry({
      kbId: 'kb:qorin', kbVersion: '1', recordId: 'record:qorin',
      statement: 'Qorins rest at dusk.',
      semantic: { subject: 'qorin', predicate: 'rests', object: 'dusk' },
      provenance: ['source:qorin'], relevance: { score: 10, reasons: ['qorin-match'] },
    })],
    searchReceipts: [makeGroundingSearchReceipt({
      kbId: 'kb:qorin', kbVersion: '1', status: 'matches-found', coverage: 'qorin-index',
      complete: true, candidatesConsidered: 1, truncationReasons: [],
    })],
  });
  const evidenceSynthesis = synthesizeHeuristicRequest(evidencePlanning, evidenceGrounding);
  const evidenceProvenance = evidenceSynthesis.evidence.selected.map(({ entry }) => ({
    fact: entry.recordId, kbId: entry.kbId, kbVersion: entry.kbVersion,
    source: entry.provenance, method: 'grounded-symbolic-realization', sourceClaim: true,
  }));
  const evidenceResult = textResult({
    status: 'PARTIAL', answer: evidenceSynthesis.answer,
    languageRoute: 'heuristic-request-synthesis', requestPlanning: evidencePlanning,
    synthesis: evidenceSynthesis, provenance: evidenceProvenance,
    grounding: evidenceGrounding, usedKbVersions: evidenceSynthesis.contributingKbVersions,
  });
  assert.equal(assertRuntimeTextResultContract(evidenceResult), evidenceResult);
  assert.throws(() => assertRuntimeTextResultContract({
    ...evidenceResult,
    answer: 'Qorins can cross stars.',
    synthesis: {
      ...evidenceSynthesis,
      answer: 'Qorins can cross stars.',
      realization: {
        ...evidenceSynthesis.realization,
        answer: 'Qorins can cross stars.',
        claims: evidenceSynthesis.realization.claims.map((claim) => claim.status === 'realized'
          ? { ...claim, sentence: 'Qorins can cross stars.' } : claim),
        paragraphs: evidenceSynthesis.realization.paragraphs.map((paragraph) => ({
          ...paragraph, surface: 'Qorins can cross stars.',
        })),
      },
    },
  }), /reproduce exactly from the selected evidence/u);
  assert.throws(() => assertRuntimeTextResultContract({
    ...evidenceResult,
    provenance: evidenceProvenance.map((item) => ({ ...item, fact: 'record:forged' })),
  }), /identify its ordered source claims/u);
  assert.throws(() => assertRuntimeTextResultContract({
    ...evidenceResult,
    synthesis: {
      ...evidenceSynthesis,
      evidence: {
        ...evidenceSynthesis.evidence,
        unrelatedEntriesOmitted: evidenceSynthesis.evidence.unrelatedEntriesOmitted + 1,
      },
    },
  }), /does not account for the grounding entry population/u);
  const multiPlanning = planHeuristicRequest('Summarize qorins; then outline qorins.');
  const multiSynthesis = synthesizeHeuristicRequest(multiPlanning, evidenceGrounding);
  const multiProvenance = multiSynthesis.evidence.selected.map(({ entry }) => ({
    fact: entry.recordId, kbId: entry.kbId, kbVersion: entry.kbVersion,
    source: entry.provenance, method: 'grounded-symbolic-realization', sourceClaim: true,
  }));
  const multiResult = textResult({
    status: 'PARTIAL', answer: multiSynthesis.answer,
    languageRoute: 'heuristic-request-synthesis', requestPlanning: multiPlanning,
    synthesis: multiSynthesis, grounding: evidenceGrounding, provenance: multiProvenance,
    usedKbVersions: multiSynthesis.contributingKbVersions,
  });
  assert.equal(assertRuntimeTextResultContract(multiResult), multiResult);
  assert.throws(() => assertRuntimeTextResultContract({
    ...multiResult,
    synthesis: {
      ...multiSynthesis,
      operationArtifacts: [...multiSynthesis.operationArtifacts].reverse(),
    },
  }), /contradicts its ordered selected operation/u);
  assert.throws(() => assertRuntimeTextResultContract({
    ...synthesized, synthesis: { ...synthesis, protocol: 'unversioned' },
  }), /synthesis must use/u);
  assert.throws(() => assertRuntimeTextResultContract({
    ...synthesized, status: 'SOLVED', synthesis: { ...synthesis, status: 'SOLVED' },
  }), /synthesis must use/u);
  assert.throws(() => assertRuntimeTextResultContract({
    ...synthesized, synthesis: { ...synthesis, gaps: Array(65).fill('bounded gap') },
  }), /synthesis\.gaps must be an array with at most 64 items/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'PARTIAL', answer: synthesis.answer, requestPlanning, synthesis,
  })), /valid only on heuristic-request-synthesis/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNKNOWN', languageRoute: 'heuristic-request-planned', requestPlanning,
  })), /requires MISSING_KNOWLEDGE/u);

  const ambiguousPlanning = planHeuristicRequest('Please write a summary outline about narufs.');
  const ambiguous = textResult({
    status: 'AMBIGUOUS', languageRoute: 'heuristic-request-ambiguous',
    requestPlanning: ambiguousPlanning,
  });
  assert.equal(assertRuntimeTextResultContract(ambiguous), ambiguous);
  assert.throws(() => assertRuntimeTextResultContract({
    ...ambiguous, status: 'UNKNOWN',
  }), /matching AMBIGUOUS/u);
});
