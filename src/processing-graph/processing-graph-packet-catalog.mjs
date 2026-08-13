import {
  PROCESSING_GRAPH_CATALOG, PROCESSING_GRAPH_CATALOG_PROTOCOL,
} from './processing-graph-catalog.mjs';

export const PROCESSING_GRAPH_PACKET_CONTRACT_CATALOG_PROTOCOL =
  'eslm-processing-graph-packet-contract-catalog';

const P = (name) => `packet:${name}`;
const R = (name) => `resource:${name}`;
const DEFAULTS = Object.freeze({
  runtime: Object.freeze({
    privacy: 'request-private', provenance: 'host-derived', lifetime: 'request', authorityEffect: 'none',
  }),
  compiler: Object.freeze({
    privacy: 'source-controlled', provenance: 'required', lifetime: 'build', authorityEffect: 'none',
  }),
  research: Object.freeze({
    privacy: 'research-restricted', provenance: 'required', lifetime: 'research-run', authorityEffect: 'none',
  }),
  shared: Object.freeze({
    privacy: 'internal', provenance: 'host-derived', lifetime: 'transaction', authorityEffect: 'none',
  }),
});

function packet(name, requiredFields, optionalFields, absenceMeaning, resources, options = {}) {
  return {
    ...DEFAULTS[name.split(':')[0]],
    packetType: P(name),
    requiredFields,
    optionalFields,
    absenceMeaning,
    boundResourceRefs: resources.map(R),
    ...options,
  };
}

const PACKET_SEMANTICS = [
  packet('compiler:build-gap', ['stage', 'reason', 'resourceReceipt', 'provenance'],
    ['diagnostics', 'partialArtifactRefs'], 'All compiler stages completed without a typed gap.',
    ['receipt-bytes', 'records'], {
      validationOwner: 'node:compiler:package-sink', authorityEffect: 'records-gap',
    }),
  packet('compiler:canonical-record-batch', ['records', 'recordCount', 'provenance'],
    ['coverageGaps', 'sourceSpans'], 'No standardized canonical candidates were produced.', ['records']),
  packet('compiler:decoded-source', ['sourceIdentity', 'decodedContentRef', 'decoderReceipt', 'provenance'],
    ['encoding', 'losses', 'repairs'], 'No source bytes were decoded into bounded content.',
    ['source-bytes', 'decoded-bytes']),
  packet('compiler:frozen-source', ['sourceIdentity', 'contentDigest', 'byteLength', 'decoderProfile', 'provenance'],
    ['mediaType'], 'No frozen source identity was admitted at compiler ingress.', ['source-bytes']),
  packet('compiler:identity-resolution', ['candidates', 'resolvedIdentities', 'alternatives', 'provenance'],
    ['conflicts', 'receipt'], 'No candidate identity survived bounded resolution.', ['records', 'comparisons'], {
      authorityEffect: 'records-selection',
    }),
  packet('compiler:immutable-package',
    ['packageIdentity', 'manifestDigest', 'shardDigests', 'recordCount', 'provenance'],
    ['buildReceipt'], 'No validated immutable package was published.', ['output-bytes', 'shards'], {
      lifetime: 'published-artifact', authorityEffect: 'publishes-artifact',
    }),
  packet('compiler:package-candidate', ['manifest', 'shards', 'canonicalDigest', 'provenance'],
    ['buildReceipt', 'indexes'], 'No promoted record set was compiled into a package candidate.',
    ['records', 'shards', 'output-bytes']),
  packet('compiler:package-validation', ['decision', 'checks', 'packageDigest', 'provenance'],
    ['diagnostics'], 'No package-equivalence decision was issued.', ['records', 'shards'], {
      authorityEffect: 'records-gate-decision',
    }),
  packet('compiler:promotion-decision', ['decision', 'candidateDigest', 'reviewReceipt', 'provenance'],
    ['conditions', 'reviewerIdentity'], 'No explicit reviewed promotion decision exists.', ['records'], {
      authorityEffect: 'records-gate-decision',
    }),
  packet('compiler:record-candidate-batch', ['candidates', 'sourceSpans', 'provenance'],
    ['confidence', 'coverageGaps', 'extractionReceipts'], 'No extraction candidate was produced.',
    ['records', 'spans', 'votes']),
  packet('compiler:record-validation', ['decision', 'recordDigests', 'checks', 'provenance'],
    ['coverageGaps', 'diagnostics'], 'No canonical-record validation decision was issued.',
    ['records', 'graph-edges'], { authorityEffect: 'records-gate-decision' }),
  packet('compiler:source-authorization', ['decision', 'sourceIdentity', 'rightsProfile', 'provenance'],
    ['expiresAt', 'limitations'], 'No authorized source use was established.', ['source-bytes'], {
      authorityEffect: 'records-gate-decision',
    }),
  packet('compiler:source-segments', ['segments', 'hierarchy', 'sourceIdentity', 'provenance'],
    ['formulas', 'tables', 'unresolvedLayout'], 'No addressable source segment was produced.',
    ['segments', 'spans']),

  packet('research:authorized-episode-batch',
    ['sourceIdentity', 'episodes', 'visibility', 'rightsReceipt', 'provenance'],
    ['omissions'], 'No episode was both rights-cleared and training-visible.', ['source-rows'], {
      authorityEffect: 'records-gate-decision',
    }),
  packet('research:episode-batch', ['sourceIdentity', 'episodes', 'cursor', 'provenance'],
    ['completion', 'omissions'], 'No bounded research episode batch was streamed.', ['source-bytes', 'source-rows']),
  packet('research:hypothesis-batch', ['hypotheses', 'techniqueReceipts', 'correlationLedger', 'provenance'],
    ['abstentions', 'rejected'], 'No source-neutral structural hypothesis was retained.',
    ['hypotheses', 'votes', 'comparisons'], { authorityEffect: 'records-selection' }),
  packet('research:neutrality-decision', ['decision', 'hypothesisDigests', 'checks', 'provenance'],
    ['diagnostics'], 'No source-neutrality decision was issued.', ['hypotheses', 'comparisons'], {
      authorityEffect: 'records-gate-decision',
    }),
  packet('research:projected-episode-batch',
    ['episodes', 'projectionVersion', 'sourceIdentity', 'provenance'],
    ['coverageGaps', 'omissions'], 'No inert episode passed the closed projection contract.',
    ['source-rows', 'graph-edges']),
  packet('research:promotion-proposal', ['hypotheses', 'decisionSummary', 'catalogDigest', 'provenance'],
    ['handoffEligibility', 'omissions', 'reviewRequirements'], 'No manual-review handoff was emitted.',
    ['receipt-bytes'], {
      lifetime: 'published-artifact', authorityEffect: 'non-authoritative-proposal',
    }),
  packet('research:research-gap', ['stage', 'reason', 'sourceIdentity', 'provenance'],
    ['diagnostics', 'omissions', 'resourceReceipt'], 'The research path completed without a typed gap.',
    ['receipt-bytes', 'source-rows', 'hypotheses'], {
      validationOwner: 'node:research:promotion-proposal-sink', authorityEffect: 'records-gap',
    }),
  packet('research:scale-progress-receipt',
    ['phase', 'availableEpisodes', 'analyzedEpisodes', 'completeness', 'resourceReceipt', 'provenance'],
    ['omissions', 'stoppingReason'], 'No bounded research phase was accounted for.',
    ['receipt-bytes', 'source-rows'], { lifetime: 'audit-receipt' }),
  packet('research:source-status', ['sourceIdentity', 'rights', 'visibility', 'splitPolicy', 'provenance'],
    ['accessState', 'limitations'], 'No source component status was frozen.', ['source-bytes', 'source-rows']),
  packet('research:structural-feature-batch',
    ['features', 'projectionDigest', 'sourceLineages', 'provenance'],
    ['collisionReceipt', 'omissions'], 'No source-neutral structural feature survived projection.',
    ['graph-nodes', 'graph-edges']),
  packet('research:transfer-decision',
    ['decision', 'hypothesisDigests', 'sourceLineages', 'checks', 'provenance'],
    ['diagnostics'], 'No independent cross-source transfer decision was issued.',
    ['hypotheses', 'source-rows'], { authorityEffect: 'records-gate-decision' }),

  packet('runtime:assessed-evidence', ['evidenceItems', 'scores', 'correlationLedger', 'provenance'],
    ['abstentions', 'conflicts'], 'No bounded evidence item received a relevance assessment.',
    ['evidence-items', 'votes', 'comparisons']),
  packet('runtime:bounded-request', ['requestId', 'text', 'byteLength', 'workProfile'],
    ['selectedKbVersions', 'sessionId', 'strategySelection'], 'No request passed the ingress byte bound.',
    ['input-bytes']),
  packet('runtime:admitted-claim-ledger',
    ['decision', 'admittedClaims', 'rejectedClaims', 'evidenceBindings', 'coverage', 'provenance'],
    ['diagnostics'], 'No typed provenance-bound claim was admitted for realization.',
    ['evidence-items', 'receipt-bytes'], {
      provenance: 'required', authorityEffect: 'records-gate-decision',
    }),
  packet('runtime:construction-candidate', ['status', 'answer', 'values', 'provenance', 'support'],
    ['diagnostics', 'grounding', 'reasoning'], 'No result candidate satisfied the requested output contract.',
    ['output-bytes', 'evidence-items'], { provenance: 'conditional' }),
  packet('runtime:construction-work-order',
    ['outputContract', 'eligibleEvidence', 'authorizedClaims', 'selectedStrategies', 'allocations'],
    ['failureState', 'grounding', 'diagnostics'], 'No bounded result-construction work was authorized.',
    ['output-bytes', 'evidence-items', 'resource-reservations']),
  packet('runtime:direct-diagnostic', ['parseStatus', 'semanticIr', 'diagnostics', 'sourceTextDigest'],
    ['episodeDelta', 'taskFrame'], 'The direct parser produced no supported interpretation.', ['tokens'], {
      validationOwner: 'node:runtime:direct-parser-gate',
    }),
  packet('runtime:evidence-admission', ['decision', 'admittedEvidence', 'provenance', 'completeness'],
    ['conflicts', 'rejections'], 'No evidence premise was admitted.', ['evidence-items', 'receipt-bytes'], {
      provenance: 'required', authorityEffect: 'records-gate-decision',
    }),
  packet('runtime:evidence-frontier', ['records', 'searchReceipts', 'scopeDigest', 'provenance'],
    ['conflicts', 'coverageGaps'], 'No bounded evidence record was retrieved.',
    ['lookups', 'postings', 'evidence-items'], { provenance: 'required' }),
  packet('runtime:bounded-operation-frame',
    ['format', 'operation', 'inputs', 'output', 'sourceTextDigest'],
    ['constraints', 'suppliedTextSpans'], 'No supported bounded operation was framed from the request.',
    ['tokens', 'graph-nodes'], { validationOwner: 'node:runtime:request-operation-framer' }),
  packet('runtime:deterministic-value-result',
    ['operation', 'status', 'answer', 'values', 'witness', 'method'],
    ['gap'], 'No verified scalar, quantity, time, sequence, or strict-order operation produced a result.',
    ['comparisons', 'solver-nodes', 'proof-bytes', 'output-bytes'], {
      validationOwner: 'node:runtime:deterministic-value-executor',
    }),
  packet('runtime:knowledge-inspection-result',
    ['operation', 'status', 'answer', 'values', 'witness', 'method'],
    ['provenance', 'usedKbVersions', 'consultedKbVersions', 'gap'],
    'No loaded declarative fact supported the requested entity or class description.',
    ['facts', 'lookups', 'comparisons', 'proof-bytes', 'output-bytes'], {
      provenance: 'conditional', validationOwner: 'node:runtime:grounded-knowledge-inspector',
    }),
  packet('runtime:supplied-text-result',
    ['operation', 'status', 'answer', 'values', 'witness', 'method'],
    ['gap'], 'No bounded classification, extraction, correction, or transformation was completed over the supplied text.',
    ['tokens', 'comparisons', 'proof-bytes', 'output-bytes'], {
      validationOwner: 'node:runtime:supplied-text-operator',
    }),
  packet('runtime:failure-eligibility', ['decision', 'inability', 'budgetReservation'],
    ['reason'], 'No inability was eligible for related-evidence work.', ['resource-reservations'], {
      authorityEffect: 'records-gate-decision',
    }),
  packet('runtime:frontier-completeness', ['decision', 'searchReceipts', 'coverage'],
    ['omissions'], 'No completeness claim was available for the retrieved frontier.',
    ['evidence-items', 'receipt-bytes'], { authorityEffect: 'records-gate-decision' }),
  packet('runtime:grounding-bundle',
    ['answerSupported', 'records', 'searchReceipts', 'completion', 'provenance'],
    ['focusWitness', 'omissions'], 'No related evidence was found or grounding was ineligible.',
    ['evidence-items', 'output-bytes'], { provenance: 'required' }),
  packet('runtime:grounded-sentence-ledger',
    ['sentences', 'claimBindings', 'citations', 'strategyReceipts', 'correlationLedger', 'coverage', 'provenance'],
    ['abstentions', 'diagnostics'], 'No admitted claim was realized as an evidence-aligned sentence.',
    ['evidence-items', 'output-bytes', 'votes'], {
      provenance: 'required', authorityEffect: 'records-selection',
    }),
  packet('runtime:inability', ['status', 'stage', 'reason', 'traceRefs'],
    ['diagnostics', 'resourceReceipt', 'unresolvedSubgoals'], 'No inability interrupted the normal request path.',
    ['receipt-bytes'], {
      validationOwner: 'node:runtime:failure-eligibility-gate', authorityEffect: 'records-gap',
    }),
  packet('runtime:interpretation-decision', ['outcome', 'selectedSemanticIr', 'route', 'confidence', 'receipt'],
    ['alternatives', 'ambiguity', 'rollbackRequired'], 'No interpretation was selected or retained.',
    ['candidates', 'votes'], { authorityEffect: 'records-selection' }),
  packet('runtime:language-assessment', ['likelihood', 'signals', 'inputDigest', 'decision'],
    ['diagnostics'], 'No bounded English-likelihood assessment was completed.', ['input-bytes', 'tokens'], {
      authorityEffect: 'records-gate-decision',
    }),
  packet('runtime:language-proposal-batch', ['candidates', 'sourceInputDigest', 'workReceipt'],
    ['abstentions', 'failures'], 'No eligible language strategy produced a proposal.',
    ['candidates', 'tokens', 'receipt-bytes']),
  packet('runtime:language-rejection', ['status', 'likelihood', 'inputDigest'],
    ['diagnostics'], 'The English-likelihood gate did not reject the request.', ['input-bytes', 'tokens'], {
      authorityEffect: 'records-gap',
    }),
  packet('runtime:language-vote-ledger', ['votes', 'correlationGroups', 'candidateDigests'],
    ['abstentions'], 'No comparable language proposal received a vote.', ['votes', 'candidates']),
  packet('runtime:method-plan', ['methodIdentity', 'taskFrameDigest', 'resourceReservation', 'applicability'],
    ['alternatives', 'gap'], 'No capability-compatible method plan was selected.', ['graph-nodes'], {
      authorityEffect: 'records-selection',
    }),
  packet('runtime:method-result',
    ['methodIdentity', 'status', 'values', 'witness', 'resourceReceipt', 'provenance'],
    ['gaps', 'hypotheses', 'reasoning'], 'No method result or witness was produced.',
    ['facts', 'rule-joins', 'solver-nodes', 'proof-bytes'], { provenance: 'required' }),
  packet('runtime:package-scope', ['selectedPackages', 'versions', 'scopeDigest', 'decision'],
    ['exclusions'], 'No exact package identity was admitted to the request scope.', ['shards'], {
      authorityEffect: 'records-gate-decision',
    }),
  packet('runtime:query-focus', ['terms', 'roles', 'completeness', 'sourceTextDigest'],
    ['metalinguisticTerms', 'phrases', 'receipts'], 'No bounded semantic focus term was selected.',
    ['tokens', 'candidates']),
  packet('runtime:reparse-result', ['candidateDigest', 'parseStatus', 'semanticIr', 'diagnostics'],
    ['taskFrame'], 'No preserved candidate completed parse-only reinspection.', ['reparses', 'tokens'], {
      authorityEffect: 'records-gate-decision',
    }),
  packet('runtime:request-force-decision', ['decision', 'sourceTextDigest', 'signals'],
    ['diagnostics', 'matchedPatterns'], 'No explicit request force was established.', ['tokens'], {
      authorityEffect: 'records-gate-decision',
    }),
  packet('runtime:request-plan', ['operations', 'dependencies', 'outputContract', 'confidence', 'receipt'],
    ['exclusions', 'suppliedMaterial', 'topics'], 'No ordered request obligation plan was selected.',
    ['tokens', 'graph-nodes'], { authorityEffect: 'records-selection' }),
  packet('runtime:request-session-snapshot', ['sessionDigest', 'sessionState', 'requestId'],
    ['episodeState'], 'No incoming session state was available for validation or rollback.', ['session-items'], {
      lifetime: 'session-snapshot', authorityEffect: 'rollback-only',
    }),
  packet('runtime:rhetorical-plan',
    ['outputContract', 'sections', 'claimAssignments', 'selectedStrategy', 'coverage'],
    ['diagnostics'], 'No grounded document shape was selected for the admitted claims.',
    ['graph-nodes', 'output-bytes']),
  packet('runtime:resource-reservation-ledger', ['profile', 'reserved', 'remaining', 'mandatoryMinima'],
    ['exhausted'], 'No finite work allocation was authorized.', ['resource-reservations'], {
      authorityEffect: 'work-allocation',
    }),
  packet('runtime:result-validation-failure', ['status', 'diagnostics', 'candidateDigest'],
    ['traceRef'], 'The result candidate passed the closed public schema.', ['output-bytes'], {
      authorityEffect: 'records-gap',
    }),
  packet('runtime:result-validation', ['decision', 'resultDigest', 'provenanceChecks', 'supportChecks'],
    ['diagnostics'], 'No public-result validation decision was issued.', ['output-bytes'], {
      authorityEffect: 'records-gate-decision',
    }),
  packet('runtime:routing-plan', ['routes', 'packageScopeDigest', 'completenessPolicy', 'resourceReservation'],
    ['cachePolicy', 'providerOrder'], 'No conservative route was scheduled.', ['lookups', 'shards'], {
      authorityEffect: 'work-allocation',
    }),
  packet('runtime:runtime-result',
    ['protocol', 'status', 'answer', 'languageRoute', 'context', 'episode', 'model',
      'selectedKbVersions', 'consultedKbVersions', 'usedKbVersions', 'unresolvedSubgoals'],
    ['approximation', 'capabilityGap', 'grounding', 'input', 'knowledgeDiagnostics',
      'languageAssessment', 'learned', 'learnedRules', 'normalization', 'plan', 'profile', 'provenance',
      'query', 'reasoning', 'requestPlanning', 'synthesis', 'taskFrame', 'values', 'workPolicy'],
    'No validated public runtime result was emitted.', ['output-bytes'], {
      provenance: 'conditional', lifetime: 'published-artifact',
      authorityEffect: 'publishes-artifact',
    }),
  packet('runtime:semantic-preservation-decision', ['candidateDigests', 'decision', 'checks'],
    ['rejections'], 'No language candidate passed semantic-preservation review.', ['candidates', 'tokens'], {
      authorityEffect: 'records-gate-decision',
    }),
  packet('runtime:session-commit-decision', ['decision', 'sessionDigest', 'episodeDigest', 'rollbackApplied'],
    ['changes'], 'No session effect was committed; the incoming session remains authoritative.', ['session-items'], {
      authorityEffect: 'records-gate-decision',
    }),
  packet('runtime:task-frame',
    ['instructions', 'assertions', 'constraints', 'goals', 'context', 'outputContract', 'budgets'],
    ['dependencies'], 'No executable task frame was established.', ['session-items']),
  packet('runtime:verification-decision',
    ['decision', 'methodResultDigest', 'witnessReceipt', 'authorizedClaims'],
    ['diagnostics', 'resourceOutcome'], 'No method witness was accepted for answer construction.',
    ['proof-bytes', 'facts'], { authorityEffect: 'verified-claims-only' }),

  packet('shared:coordinator-receipt',
    ['stage', 'nodeId', 'selectedStrategies', 'outcomes', 'allocations', 'completeness'],
    ['ambiguity', 'diagnostics'], 'No coordinated strategy invocation was accounted for.',
    ['receipt-bytes', 'votes'], { validationOwner: 'owner:shared:strategy-coordination' }),
  packet('shared:correlation-ledger', ['correlationGroups', 'candidateDigests', 'contributions'],
    ['deduplicatedVotes'], 'No comparable candidate support required correlation accounting.',
    ['votes', 'comparisons'], { validationOwner: 'owner:shared:strategy-coordination' }),
];

function endpoints(packetType, direction) {
  const field = direction === 'producer' ? 'outputPacketTypes' : 'inputPacketTypes';
  return PROCESSING_GRAPH_CATALOG.nodes.filter((item) => item[field].includes(packetType))
    .map((item) => item.nodeId).toSorted();
}

function closePacketContract(item) {
  const producers = endpoints(item.packetType, 'producer');
  const consumers = endpoints(item.packetType, 'consumer');
  return Object.freeze({
    packetType: item.packetType,
    producers: Object.freeze(producers),
    consumers: Object.freeze(consumers),
    requiredFields: Object.freeze([...item.requiredFields].toSorted()),
    optionalFields: Object.freeze([...item.optionalFields].toSorted()),
    absenceMeaning: item.absenceMeaning,
    boundResourceRefs: Object.freeze([...item.boundResourceRefs].toSorted()),
    validationOwner: item.validationOwner ?? producers[0],
    privacy: item.privacy,
    provenance: item.provenance,
    lifetime: item.lifetime,
    authorityEffect: item.authorityEffect,
  });
}

export const PROCESSING_GRAPH_PACKET_CONTRACT_CATALOG = Object.freeze({
  format: PROCESSING_GRAPH_PACKET_CONTRACT_CATALOG_PROTOCOL,
  graphCatalogFormat: PROCESSING_GRAPH_CATALOG_PROTOCOL,
  contracts: Object.freeze(PACKET_SEMANTICS.map(closePacketContract)
    .toSorted((left, right) => left.packetType.localeCompare(right.packetType))),
});
