import test from 'node:test';
import assert from 'node:assert/strict';
import { approximateControlledEnglish } from '../src/language/heuristic-cnl-approximation.mjs';
import { assertRuntimeTextResultContract } from '../src/runtime/result-contract.mjs';
import { NORMALIZATION_RESULT_PROTOCOL } from '../src/runtime/result-payload-contracts.mjs';
import {
  createGroundingBundle, createGroundingRequest, makeGroundingEntry, makeGroundingSearchReceipt,
} from '../src/reasoning/grounding-retrieval.mjs';
import { textResult } from './fixtures/runtime-result.mjs';

test('result payload arrays reject scalar impostors, invalid KB identities, and null subgoals', () => {
  assert.throws(() => assertRuntimeTextResultContract(textResult({ values: 'narl' })),
    /values must be an array/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({ provenance: 'source:narl' })),
    /provenance must be an array/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({ values: [undefined] })),
    /values contains a non-JSON value/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({ provenance: Array(1) })),
    /provenance contains a sparse array/u);
  const symbolBearingValue = { relation: 'nonce', [Symbol('hidden')]: 'forged' };
  assert.throws(() => assertRuntimeTextResultContract(textResult({ values: [symbolBearingValue] })),
    /values contains a non-JSON object field/u);
  assert.equal(assertRuntimeTextResultContract(textResult({
    provenance: [{ source: ['nonce'], optionalDetail: undefined }],
  })).provenance.length, 1);
  assert.throws(() => assertRuntimeTextResultContract(textResult({ provenance: [{}] })),
    /must expose at least one provenance field/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    provenance: [{ fact: 'fact:nonce', kbId: 'kb:nonce' }],
  })), /provenance\[0\]\.version must identify an exact KB version/u);
  for (const field of ['usedKbVersions', 'selectedKbVersions', 'consultedKbVersions']) {
    assert.throws(() => assertRuntimeTextResultContract(textResult({
      [field]: [{ kbId: '', version: '1' }],
    })), new RegExp(`${field}\\[0\\]\\.kbId`, 'u'));
    assert.throws(() => assertRuntimeTextResultContract(textResult({
      [field]: [{ kbId: 'kb:narl', version: '1' }, { kbId: 'kb:narl', version: '1' }],
    })), /duplicate identity/u);
    assert.throws(() => assertRuntimeTextResultContract(textResult({
      [field]: [{ kbId: 'kb:narl' }],
    })), new RegExp(`${field}\\[0\\]\\.version`, 'u'));
  }
  assert.throws(() => assertRuntimeTextResultContract(textResult({ unresolvedSubgoals: [null] })),
    /unresolvedSubgoals\[0\] must be an object/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({ unresolvedSubgoals: [{}] })),
    /must expose a structured gap field/u);
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
  const firstCandidate = generated.candidates[0];
  const parsedReparse = {
    candidateId: firstCandidate.candidateId,
    rank: firstCandidate.rank,
    text: firstCandidate.text,
    confidence: firstCandidate.confidence,
    rankScore: firstCandidate.rankScore,
    status: 'PARSED',
    acceptedSemanticIr: true,
    semanticSignature: '{"query":"nonce"}',
  };
  const approximation = {
    ...generated, status: 'no-accepted-reparse', reparses: [], selectedCandidate: null,
  };
  assert.equal(assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', approximation,
  })).approximation.protocol, generated.protocol);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', approximation: {
      ...approximation,
      receipt: {
        ...approximation.receipt,
        strategySelection: {
          ...approximation.receipt.strategySelection,
          identities: ['../evil.mjs'],
        },
      },
    },
  })), /unavailable .* identity|contradicts/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', approximation: {
      ...approximation,
      receipt: {
        ...approximation.receipt,
        strategyExecution: {
          ...approximation.receipt.strategyExecution,
          consumedWork: -99,
        },
      },
    },
  })), /consumedWork/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', approximation: {
      ...approximation,
      receipt: {
        ...approximation.receipt,
        strategyExecution: {
          ...approximation.receipt.strategyExecution,
          decisionAuthority: 'candidate-ranking',
        },
      },
    },
  })), /accounting-only/u);
  const strategyExecution = approximation.receipt.strategyExecution;
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED',
    approximation: {
      ...approximation,
      receipt: {
        ...approximation.receipt,
        strategyExecution: { ...strategyExecution, workUnit: 'distance-evaluation' },
      },
    },
  })), /workUnit must be coordinator-invocation-slot/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED',
    approximation: {
      ...approximation,
      receipt: {
        ...approximation.receipt,
        strategyExecution: {
          ...strategyExecution,
          selectedStrategies: strategyExecution.selectedStrategies.slice(0, -1),
          results: strategyExecution.results.slice(0, -1),
        },
      },
    },
  })), /omits or adds a configured coordinated strategy/u);
  const arbitration = strategyExecution.arbitration;
  const firstArbitrationCandidate = arbitration.candidates[0];
  const withArbitration = (forgedArbitration) => textResult({
    status: 'UNPARSED',
    approximation: {
      ...approximation,
      receipt: {
        ...approximation.receipt,
        strategyExecution: { ...strategyExecution, arbitration: forgedArbitration },
      },
    },
  });
  assert.throws(() => assertRuntimeTextResultContract(withArbitration({
    ...arbitration,
    candidates: [
      { ...firstArbitrationCandidate, support: 999_999_999 },
      ...arbitration.candidates.slice(1),
    ],
  })), /arbitration\.candidates\[0\]\.support/u);
  assert.throws(() => assertRuntimeTextResultContract(withArbitration({
    ...arbitration,
    candidates: [
      { ...firstArbitrationCandidate, voters: ['strategy:evil:receipt-forgery@1'] },
      ...arbitration.candidates.slice(1),
    ],
  })), /canonical arbitration recomputed/u);
  assert.throws(() => assertRuntimeTextResultContract(withArbitration({
    ...arbitration,
    selected: arbitration.candidates.at(-1),
  })), /canonical arbitration recomputed/u);
  assert.throws(() => assertRuntimeTextResultContract(withArbitration({
    ...arbitration,
    candidates: [
      { ...firstArbitrationCandidate, output: { forgedCandidate: true } },
      ...arbitration.candidates.slice(1),
    ],
  })), /canonical arbitration recomputed/u);
  assert.throws(() => assertRuntimeTextResultContract(withArbitration({
    ...arbitration, undeclaredWeight: 0.5,
  })), /contains unsupported field undeclaredWeight/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED',
    approximation: {
      ...approximation,
      receipt: {
        ...approximation.receipt,
        strategyExecution: { ...strategyExecution, undeclaredLedger: [] },
      },
    },
  })), /contains unsupported field undeclaredLedger/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', approximation: { ...approximation, protocol: 'unversioned' },
  })), /approximation protocol/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'DEFEASIBLE', languageRoute: 'heuristic-cnl-approximated',
  })), /requires approximation evidence/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'SOLVED', languageRoute: 'heuristic-cnl-approximated', approximation: {
      ...approximation, status: 'accepted-reparse',
      selectedCandidate: firstCandidate, reparses: [parsedReparse],
    },
  })), /supported non-strict interpreted status/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', languageRoute: 'heuristic-cnl-ambiguous', approximation: {
      ...approximation, status: 'ambiguous-reparse', selectedCandidate: null, reparses: [],
    },
  })), /requires AMBIGUOUS status/u);
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
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', approximation: {
      ...approximation,
      receipt: {
        ...approximation.receipt,
        observed: { ...approximation.receipt.observed, candidates: 99 },
      },
    },
  })), /observed work contradicts/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', approximation: {
      ...approximation,
      reparses: [{ ...parsedReparse, candidateId: 'heuristic-cnl:forged' }],
    },
  })), /reparses must follow declared candidate order/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', approximation: {
      ...approximation,
      candidates: [firstCandidate, { ...generated.candidates[1], candidateId: firstCandidate.candidateId }],
      receipt: {
        ...approximation.receipt,
        observed: { ...approximation.receipt.observed, candidates: 2 },
      },
    },
  })), /candidate IDs must be unique/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', approximation: {
      ...approximation, recommendedCandidate: { ...firstCandidate, text: 'forged' },
    },
  })), /recommendedCandidate must match one declared/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'DEFEASIBLE', languageRoute: 'heuristic-cnl-approximated', approximation: {
      ...approximation, status: 'accepted-reparse', reparses: [parsedReparse],
      selectedCandidate: { ...firstCandidate, rankScore: firstCandidate.rankScore - 0.1 },
    },
  })), /selectedCandidate must match one declared/u);
  const resourceLimited = approximateControlledEnglish('x'.repeat(16_385));
  assert.equal(assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', approximation: { ...resourceLimited, status: 'resource-limit', reparses: [] },
  })).approximation.status, 'resource-limit');
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', approximation: {
      ...resourceLimited,
      status: 'resource-limit',
      reparses: [],
      receipt: { ...resourceLimited.receipt, exhaustedResource: 'forged-limit' },
    },
  })), /must name its exhausted resource/u);

  const receiptLimited = approximateControlledEnglish(
    Array.from({ length: 48 }, (_, index) => `N${index} a zoral.`).join(' '),
    { limits: { maximumReceiptBytes: 4_096 } },
  );
  assert.equal(receiptLimited.status, 'RESOURCE_LIMIT');
  assert.equal(receiptLimited.receipt.exhaustedResource, 'maximumReceiptBytes');
  assert.ok(receiptLimited.receipt.observed.receiptBytes > 4_096);
  assert.equal(assertRuntimeTextResultContract(textResult({
    status: 'RESOURCE_LIMIT', approximation: receiptLimited,
  })).approximation.status, 'RESOURCE_LIMIT');
});

test('normalization payloads require a versioned candidate and route-consistent assisted status', () => {
  const candidate = {
    protocol: 'eslm-language-agent-normalization-v2', operation: 'simplification',
    sourceLanguage: 'en', normalizedEnglish: 'Is Nira calm?', alignments: [],
  };
  const normalization = {
    protocol: NORMALIZATION_RESULT_PROTOCOL, attempted: true, triggerStatus: 'UNPARSED',
    status: 'accepted', proposalCount: 1, proposalLimit: 3, externalInvocations: 0, cacheHit: true,
    requestedOperation: 'simplification',
    strategyIdentity: 'strategy:language:external-simplification-proposal@1',
    stage: 'runtime.language.interpret', proposalRole: 'untrusted-language-form-candidate',
    answerAuthority: 'none',
    receipts: [], candidate, validation: { accepted: true }, reparseStatus: 'SOLVED',
  };
  const accepted = textResult({
    status: 'SOLVED', answer: 'yes', values: [true], languageRoute: 'language-agent-normalized',
    normalization,
  });
  assert.equal(assertRuntimeTextResultContract(accepted), accepted);
  const adapterReceipt = {
    format: 'eslm-localizer-normalization-receipt-v2', adapter: 'localizer', bounded: true,
  };
  const adapterNeutral = {
    ...accepted, normalization: {
      ...normalization, receipts: [adapterReceipt], receipt: adapterReceipt,
    },
  };
  assert.equal(assertRuntimeTextResultContract(adapterNeutral), adapterNeutral);
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
      ...normalization, receipts: [{ format: 'normalization-receipt' }],
    },
  }), /versioned Language Agent receipt format/u);
  assert.throws(() => assertRuntimeTextResultContract({
    ...accepted, normalization: {
      ...normalization, cacheHit: false, proposalCount: 2, externalInvocations: 1,
    },
  }), /invocation accounting is inconsistent/u);
  assert.throws(() => assertRuntimeTextResultContract({
    ...accepted, normalization: {
      ...normalization, candidate: {
        ...candidate, alignments: Array(257).fill({ kind: 'number', source: '1', target: '1' }),
      },
    },
  }), /alignments must be an array with at most 256 items/u);
  assert.throws(() => assertRuntimeTextResultContract({
    ...adapterNeutral, normalization: {
      ...adapterNeutral.normalization,
      receipt: { ...adapterReceipt, adapter: 'forged-adapter' },
    },
  }), /receipt must match the last bounded receipt/u);
  assert.throws(() => assertRuntimeTextResultContract({
    ...accepted, normalization: { ...normalization, validation: 'accepted' },
  }), /normalization\.validation must be an object/u);
  assert.throws(() => assertRuntimeTextResultContract({
    ...accepted,
    status: 'UNPARSED',
    normalization: { ...normalization, reparseStatus: 'UNPARSED' },
  }), /requires a supported symbolic reparse status/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNVERIFIED_NORMALIZATION',
    languageRoute: 'language-agent-normalization-rejected',
    normalization: {
      protocol: NORMALIZATION_RESULT_PROTOCOL,
      attempted: true,
      triggerStatus: 'UNPARSED',
      status: 'proposal-limit-exhausted',
      proposalCount: 2,
      proposalLimit: 3,
      externalInvocations: 2,
      cacheHit: false,
      requestedOperation: 'simplification',
      strategyIdentity: 'strategy:language:external-simplification-proposal@1',
      stage: 'runtime.language.interpret', proposalRole: 'untrusted-language-form-candidate',
      answerAuthority: 'none',
      receipts: [],
      diagnostic: 'bounded exhaustion',
    },
  })), /requires all bounded slots/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', languageRoute: 'language-agent-normalization-failed',
  })), /requires attempted normalization evidence/u);
  assert.throws(() => assertRuntimeTextResultContract({
    ...accepted, languageRoute: 'language-agent-normalization-failed',
  }), /requires failed normalization evidence/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    status: 'UNPARSED', normalization: {
      protocol: NORMALIZATION_RESULT_PROTOCOL, attempted: true, triggerStatus: 'UNPARSED',
      status: 'failed', proposalCount: 1, proposalLimit: 3, externalInvocations: 1,
      requestedOperation: 'simplification',
      strategyIdentity: 'strategy:language:external-simplification-proposal@1',
      stage: 'runtime.language.interpret', proposalRole: 'untrusted-language-form-candidate',
      answerAuthority: 'none',
      cacheHit: false, receipts: [], diagnostic: 'bounded failure',
    },
  })), /requires a Language Agent language route/u);
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
      ...grounding,
      focus: { ...grounding.focus, strategySelection: ['../evil.mjs'] },
    },
  })), /unavailable .* identity|contradicts/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    grounding: {
      ...grounding,
      search: { ...grounding.search, relevanceStrategySelection: ['../evil.mjs'] },
    },
  })), /unavailable .* identity|contradicts/u);
  const typedGrounding = {
    ...grounding,
    focus: {
      ...grounding.focus,
      source: 'typed-request-plan',
      terms: ['qorin'],
      candidates: [{
        candidateId: 'focus:typed:1', term: 'qorin', role: 'request-topic',
        kind: 'accepted-semantic-ir', score: 130, included: true, selected: true,
      }],
      obligations: [{ focusId: 'topic:1', term: 'qorin', role: 'request-topic', selected: true }],
    },
  };
  assert.equal(assertRuntimeTextResultContract(textResult({ grounding: typedGrounding })).grounding,
    typedGrounding);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    grounding: {
      ...typedGrounding,
      focus: {
        ...typedGrounding.focus,
        terms: ['qorin', 'forged-topic'],
      },
    },
  })), /terms contradicts its selected/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    grounding: {
      ...typedGrounding,
      focus: {
        ...typedGrounding.focus,
        candidates: typedGrounding.focus.candidates.map((candidate) => ({
          ...candidate, included: false,
        })),
      },
    },
  })), /cannot select an excluded focus candidate/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    grounding: {
      ...grounding, focus: { ...grounding.focus, candidates: Array(257).fill({}) },
    },
  })), /focus\.candidates must be an array with at most 256 items/u);
  const groundingEntry = makeGroundingEntry({
    kbId: 'kb:qorin', kbVersion: '1', recordId: 'record:qorin',
    statement: 'A qorin rests.', semantic: { subject: 'qorin', predicate: 'rests' },
    provenance: ['source:qorin'], relevance: { score: 10, reasons: ['qorin-match'] },
  });
  const groundingWithEntry = createGroundingBundle({
    request,
    triggerStatus: 'UNKNOWN',
    entries: [groundingEntry],
    searchReceipts: [makeGroundingSearchReceipt({
      kbId: 'kb:qorin', kbVersion: '1', status: 'matches-found', coverage: 'exact-qorin',
      complete: true, candidatesConsidered: 1, truncationReasons: [],
    })],
  });
  assert.equal(assertRuntimeTextResultContract(textResult({ grounding: groundingWithEntry })).grounding,
    groundingWithEntry);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    grounding: {
      ...groundingWithEntry,
      entries: [groundingEntry, groundingEntry],
    },
  })), /contains duplicate record identity/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    grounding: {
      ...groundingWithEntry,
      entries: [{
        ...groundingEntry,
        semantic: { ...groundingEntry.semantic, derived: true },
        epistemicStatus: 'strict-derived',
      }],
    },
  })), /grounding\.entries\[0\]\.witness must be an object/u);
  assert.throws(() => assertRuntimeTextResultContract(textResult({
    grounding: {
      ...groundingWithEntry,
      limits: {
        ...groundingWithEntry.limits,
        returnedEntryBytes: groundingWithEntry.limits.returnedEntryBytes + 1,
      },
    },
  })), /observed work contradicts its declared limits/u);
});
