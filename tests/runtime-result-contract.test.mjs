import test from 'node:test';
import assert from 'node:assert/strict';
import { createCoreModel } from '../src/runtime/core-model.mjs';
import { EslmEngine } from '../src/runtime/engine.mjs';
import { approximateControlledEnglish } from '../src/language/heuristic-cnl-approximation.mjs';
import { planHeuristicRequest } from '../src/language/heuristic-request-planning.mjs';
import { synthesizeHeuristicRequest } from '../src/runtime/heuristic-request-synthesis.mjs';
import {
  assertRuntimeMemoryPlanContract, assertRuntimeResultContract, assertRuntimeTextResultContract,
  directCoreMemorySnapshot, normalizeRuntimeStatus,
  PUBLIC_RUNTIME_STATUSES,
} from '../src/runtime/result-contract.mjs';
import { NORMALIZATION_RESULT_PROTOCOL } from '../src/runtime/result-payload-contracts.mjs';
import {
  createGroundingBundle, createGroundingRequest, makeGroundingSearchReceipt,
} from '../src/reasoning/grounding-retrieval.mjs';

const term = (name) => ({ term: name, canonical: name, negationDepth: 0 });

function textResult(overrides = {}) {
  return {
    protocol: 'eslm-runtime-result-v1', status: 'UNKNOWN', answer: 'unknown',
    languageRoute: 'direct-symbolic', values: [], provenance: [],
    usedKbVersions: [], selectedKbVersions: [], consultedKbVersions: [],
    unresolvedSubgoals: [], model: { id: 'model:test', memory: directCoreMemorySnapshot() },
    context: { session: { entities: [], facts: [], rules: [], history: [] } },
    episode: { original: 'What is a narl?', segments: ['What is a narl?'], unsupportedStatements: [] },
    ...overrides,
  };
}

test('typed-task execution normalizes internal method statuses at the public protocol boundary', async () => {
  const result = new EslmEngine(await createCoreModel()).executeTask({
    taskId: 'task:renamed:categorical',
    operation: 'transform-categorical-proposition',
    transformation: 'obversion',
    premise: { form: 'A', subject: term('narl'), predicate: term('vex') },
  });
  assert.equal(result.status, 'SOLVED');
  assert.equal(result.answer, 'No narl are non-vex.');
  assert.ok(PUBLIC_RUNTIME_STATUSES.includes(result.status));
  assert.deepEqual(result.model.memory, directCoreMemorySnapshot());
  assert.equal(assertRuntimeResultContract(result), result);
});

test('text results require route-independent session and episode state', () => {
  const base = {
    protocol: 'eslm-runtime-result-v1', status: 'UNKNOWN', answer: 'unknown',
    languageRoute: 'direct-symbolic', usedKbVersions: [], selectedKbVersions: [],
    consultedKbVersions: [], unresolvedSubgoals: [], model: {
      id: 'model:test', memory: directCoreMemorySnapshot(),
    },
    context: { session: { entities: [], facts: [], rules: [], history: [] } },
    episode: { original: 'What is a narl?', segments: ['What is a narl?'], unsupportedStatements: [] },
  };
  assert.equal(assertRuntimeTextResultContract(base), base);
  assert.throws(() => assertRuntimeTextResultContract({ ...base, episode: undefined }),
    /episode must expose/u);
});

test('the runtime result validator rejects internal statuses and missing common accounting fields', () => {
  const base = {
    protocol: 'eslm-runtime-result-v1',
    status: 'SOLVED',
    languageRoute: 'direct-symbolic',
    usedKbVersions: [],
    selectedKbVersions: [],
    consultedKbVersions: [],
    unresolvedSubgoals: [],
    model: { id: 'model:test' },
  };
  assert.throws(() => assertRuntimeResultContract({ ...base, status: 'ANSWERED' }),
    /unsupported public status/u);
  assert.throws(() => assertRuntimeResultContract({ ...base, consultedKbVersions: undefined }),
    /consultedKbVersions must be an array/u);
});

test('memory-plan validation rejects ambiguous or structurally incomplete snapshots', () => {
  assert.equal(assertRuntimeMemoryPlanContract(directCoreMemorySnapshot()).effectivePolicy, 'eager');
  assert.throws(() => assertRuntimeMemoryPlanContract({
    ...directCoreMemorySnapshot(), format: 'untyped-memory',
  }), /format must be eslm-memory-plan-v1/u);
  assert.throws(() => assertRuntimeMemoryPlanContract({
    ...directCoreMemorySnapshot(), requestedPolicy: 'adaptive',
  }), /requestedPolicy must be auto, eager, or lazy/u);
  assert.throws(() => assertRuntimeMemoryPlanContract({
    ...directCoreMemorySnapshot(), softTarget: true,
  }), /must expose targetMiB/u);
  assert.throws(() => assertRuntimeMemoryPlanContract({
    ...directCoreMemorySnapshot(), providers: [{ id: 'kb:a' }],
  }), /providers\[0\]\.mode/u);
  assert.throws(() => assertRuntimeMemoryPlanContract({
    ...directCoreMemorySnapshot(), providers: [
      { id: 'kb:a', mode: 'lazy' }, { id: 'kb:a', mode: 'eager' },
    ],
  }), /provider id kb:a must be unique/u);
});

test('direct core failures and unsupported typed operations retain truthful memory metadata', async () => {
  const engine = new EslmEngine(await createCoreModel());
  const textFailure = engine.ask({ text: 'Is a narl a vex?' });
  assert.equal(textFailure.status, 'UNPARSED');
  assert.deepEqual(textFailure.model.memory, directCoreMemorySnapshot());

  const typedFailure = engine.executeTask({ operation: 'unregistered-nonce-operation' });
  assert.equal(typedFailure.status, 'NO_APPLICABLE_METHOD');
  assert.deepEqual(typedFailure.model.memory, directCoreMemorySnapshot());
});

test('non-strict internal success remains defeasible at the public boundary', () => {
  assert.equal(normalizeRuntimeStatus('INDUCTIVE'), 'DEFEASIBLE');
  assert.equal(normalizeRuntimeStatus('ABDUCTIVE'), 'DEFEASIBLE');
  assert.notEqual(normalizeRuntimeStatus('INDUCTIVE'), 'SOLVED');
});

test('result payload arrays reject scalar impostors, invalid KB identities, and null subgoals', () => {
  assert.throws(() => assertRuntimeTextResultContract(textResult({ values: 'narl' })),
    /values must be an array/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({ provenance: 'source:narl' })),
    /provenance must be an array/u);
  for (const field of ['usedKbVersions', 'selectedKbVersions', 'consultedKbVersions']) {
    assert.throws(() => assertRuntimeTextResultContract(textResult({
      [field]: [{ kbId: '', version: '1' }],
    })), new RegExp(`${field}\\[0\\]\\.kbId`, 'u'));
    assert.throws(() => assertRuntimeTextResultContract(textResult({
      [field]: [{ kbId: 'kb:narl', version: '1' }, { kbId: 'kb:narl', version: '1' }],
    })), /duplicate identity/u);
  }
  assert.throws(() => assertRuntimeTextResultContract(textResult({ unresolvedSubgoals: [null] })),
    /unresolvedSubgoals\[0\] must be an object/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    values: Array(4_097).fill(null),
  })), /at most 4096 items/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    unresolvedSubgoals: Array(257).fill({ operation: 'inspect' }),
  })), /at most 256 items/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    selectedKbVersions: [{ kbId: 'kb\nforged', version: '1' }],
  })), /control characters/u);
});

test('approximation payloads are versioned, bounded, and required by heuristic CNL routes', () => {
  const generated = approximateControlledEnglish('Tavra an qerin. Tavra calm?');
  const approximation = {
    ...generated, status: 'no-accepted-reparse', reparses: [], selectedCandidate: null,
  };
  assert.equal(assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', approximation,
  })).approximation.protocol, generated.protocol);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', approximation: { ...approximation, protocol: 'unversioned' },
  })), /approximation protocol/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'DEFEASIBLE', languageRoute: 'heuristic-cnl-approximated',
  })), /requires approximation evidence/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', approximation: {
      ...approximation, originalText: 'x'.repeat(65_537),
    },
  })), /originalText must be bounded text/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', approximation: {
      ...approximation, candidates: Array(257).fill(generated.candidates[0]),
    },
  })), /approximation\.candidates must be an array with at most 256 items/u);
});

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

  const synthesis = synthesizeHeuristicRequest(requestPlanning);
  const synthesized = textResult({
    status: 'PARTIAL', answer: synthesis.answer, languageRoute: 'heuristic-request-synthesis',
    requestPlanning, synthesis,
  });
  assert.equal(assertRuntimeTextResultContract(synthesized), synthesized);
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

  const ambiguousPlanning = { ...requestPlanning, status: 'AMBIGUOUS' };
  const ambiguous = textResult({
    status: 'AMBIGUOUS', languageRoute: 'heuristic-request-ambiguous',
    requestPlanning: ambiguousPlanning,
  });
  assert.equal(assertRuntimeTextResultContract(ambiguous), ambiguous);
  assert.throws(() => assertRuntimeTextResultContract({
    ...ambiguous, status: 'UNKNOWN',
  }), /matching AMBIGUOUS/u);
});

test('normalization payloads require a versioned candidate and route-consistent assisted status', () => {
  const candidate = {
    protocol: 'eslm-language-agent-normalization-v2', operation: 'simplification',
    sourceLanguage: 'en', normalizedEnglish: 'Is Nira calm?', alignments: [],
  };
  const normalization = {
    protocol: NORMALIZATION_RESULT_PROTOCOL, attempted: true, triggerStatus: 'UNPARSED',
    status: 'accepted', proposalCount: 1, proposalLimit: 3, externalInvocations: 0, cacheHit: true,
    receipts: [], candidate, validation: { accepted: true }, reparseStatus: 'SOLVED',
  };
  const accepted = textResult({
    status: 'SOLVED', answer: 'yes', values: [true], languageRoute: 'language-agent-normalized',
    normalization,
  });
  assert.equal(assertRuntimeTextResultContract(accepted), accepted);
  assert.throws(() => assertRuntimeTextResultContract({
    ...accepted, normalization: { ...normalization, protocol: 'unversioned' },
  }), /normalization protocol/u);
  assert.throws(() => assertRuntimeTextResultContract({
    ...accepted, normalization: {
      ...normalization, candidate: { ...candidate, protocol: 'candidate:unknown' },
    },
  }), /candidate\.protocol/u);
  assert.throws(() => assertRuntimeTextResultContract({
    ...accepted, normalization: {
      ...normalization, candidate: {
        ...candidate, alignments: Array(257).fill({ kind: 'number', source: '1', target: '1' }),
      },
    },
  }), /alignments must be an array with at most 256 items/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', languageRoute: 'language-agent-normalization-failed',
  })), /requires attempted normalization evidence/u);
  assert.throws(() => assertRuntimeTextResultContract({
    ...accepted, languageRoute: 'language-agent-normalization-failed',
  }), /requires failed normalization evidence/u);
});

test('grounding payloads preserve their version, non-answer authority, bounds, and trigger status', () => {
  const request = createGroundingRequest('What is a qorin?', 'UNKNOWN');
  const grounding = createGroundingBundle({
    request,
    triggerStatus: 'UNKNOWN',
    searchReceipts: [makeGroundingSearchReceipt({
      kbId: 'kb:qorin', kbVersion: '1', status: 'no-match', coverage: 'exact-qorin',
      complete: true, candidatesConsidered: 0, truncationReasons: [],
    })],
  });
  const grounded = textResult({ grounding });
  assert.equal(assertRuntimeTextResultContract(grounded), grounded);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    grounding: { ...grounding, format: 'unversioned' },
  })), /grounding must use/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    grounding: { ...grounding, answerSupported: true },
  })), /must remain non-answer evidence/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', grounding,
  })), /triggerStatus does not match/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    grounding: { ...grounding, entries: [null], status: 'RELATED_EVIDENCE_FOUND' },
  })), /grounding\.entries\[0\] must be an object/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    grounding: { ...grounding, focus: { ...grounding.focus, source: 'hidden-oracle' } },
  })), /focus\.source is unsupported/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    grounding: {
      ...grounding, focus: { ...grounding.focus, candidates: Array(257).fill({}) },
    },
  })), /focus\.candidates must be an array with at most 256 items/u);
});
