import { stableStringify } from '../util.mjs';
import {
  assertOrdinaryResultVerificationInput,
  assertOrdinaryResultVerificationOutput,
  ordinaryMethodResultBounds,
  ordinaryVerificationWorkLimit,
  ORDINARY_REASONING_PROTOCOLS,
  ORDINARY_REASONING_STAGES,
  requireBoundedArray,
  requireExactFields,
  requirePlainRecord,
} from './ordinary-reasoning-contracts.mjs';

function same(left, right) {
  return stableStringify(left) === stableStringify(right);
}

function valueOf(fact) {
  return fact.object ?? fact.value;
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function tripleOf(fact) {
  return [fact.subject, fact.predicate, valueOf(fact)];
}

function exactTriple(left, right) {
  return left[0] === right[0] && left[1] === right[1] && left[2] === right[2];
}

function queryMatchesFact(query, fact) {
  return fact.predicate === query.predicate
    && (query.subject === undefined || fact.subject === query.subject)
    && (query.object === undefined || valueOf(fact) === query.object);
}

function valuesFromEvidence(query, evidence) {
  if (query.target === 'boolean') return evidence.length > 0 ? [true] : [];
  return [...new Set(evidence.map((fact) => query.target === 'subject' ? fact.subject : valueOf(fact)))]
    .toSorted((left, right) => compareText(stableStringify(left), stableStringify(right)));
}

function unifyPattern(pattern, fact, bindings = {}) {
  const values = tripleOf(fact);
  const next = { ...bindings };
  for (let index = 0; index < 3; index += 1) {
    const term = pattern[index];
    if (term.startsWith('?')) {
      if (next[term] !== undefined && next[term] !== values[index]) return undefined;
      next[term] = values[index];
    } else if (term !== values[index]) return undefined;
  }
  return next;
}

function instantiate(pattern, bindings) {
  return pattern.map((term) => term.startsWith('?') ? bindings[term] : term);
}

function verificationWork(input) {
  return {
    evidenceItemsInspected: 0,
    supportReferencesInspected: 0,
    factsInspected: 0,
    rulesInspected: 0,
    historyEventsInspected: 0,
    consumed: 0,
    limit: ordinaryVerificationWorkLimit(input),
  };
}

class VerificationResourceLimitError extends Error {
  constructor(field, requested, work) {
    super(`Ordinary result verification exhausted its ${work.limit}-operation work ceiling `
      + `before ${requested} additional ${field} operation${requested === 1 ? '' : 's'}.`);
    this.name = 'VerificationResourceLimitError';
    this.field = field;
    this.requested = requested;
  }
}

function consume(work, field, amount) {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new TypeError(`Ordinary verification work ${field} must be a non-negative safe integer.`);
  }
  if (work.consumed + amount > work.limit) {
    throw new VerificationResourceLimitError(field, amount, work);
  }
  work[field] += amount;
  work.consumed += amount;
}

function requireSame(actual, expected, label) {
  if (!same(actual, expected)) {
    throw new TypeError(`Ordinary result verification rejected mismatched ${label} witness or result.`);
  }
}

function factMaps(input, work) {
  consume(work, 'factsInspected', input.activeClosure.facts.length);
  return new Map(input.activeClosure.facts.map((fact) => [fact.id, fact]));
}

function verifyHornDerivation(fact, input, factsById, work) {
  if (fact.reasoning !== 'deduction') return;
  requireBoundedArray(fact.support, 'Horn witness support', input.activeClosure.facts.length);
  consume(work, 'rulesInspected', input.activeModel.rules.length);
  const rule = input.activeModel.rules.find((candidate) => candidate.id === fact.rule);
  if (!rule || rule.when.length !== fact.support.length) {
    throw new TypeError('Ordinary result verification rejected an unknown or incomplete Horn rule witness.');
  }
  let bindings = {};
  const supports = [];
  for (let index = 0; index < fact.support.length; index += 1) {
    consume(work, 'supportReferencesInspected', 1);
    const support = factsById.get(fact.support[index]);
    if (!support) throw new TypeError('Ordinary result verification rejected an unknown Horn support reference.');
    bindings = unifyPattern(rule.when[index], support, bindings);
    if (!bindings) throw new TypeError('Ordinary result verification rejected a Horn support that does not unify.');
    supports.push(support);
  }
  requireSame(tripleOf(fact), instantiate(rule.then, bindings), 'Horn conclusion');
  const depth = 1 + Math.max(0, ...supports.map((support) => support.depth ?? 0));
  if (fact.depth !== depth) {
    throw new TypeError('Ordinary result verification rejected a Horn witness with an invalid depth.');
  }
}

function expectedKbSources(policy, supports) {
  const sources = [policy, ...supports].flatMap((value) => value?.kbSources
    ?? value?.sourceKbVersions
    ?? (value?.kbId ? [{ kbId: value.kbId, version: value.kbVersion }] : []));
  const unique = new Map(sources.filter((item) => item?.kbId).map((item) => [
    `${item.kbId}\u0000${item.version ?? ''}`,
    { kbId: item.kbId, ...(item.version ? { version: item.version } : {}) },
  ]));
  return [...unique.values()].toSorted((left, right) =>
    compareText(left.kbId, right.kbId) || compareText(String(left.version), String(right.version)));
}

function verifyInductiveFact(fact, input, work) {
  const policy = input.activeModel.reasoning?.induction;
  const induction = requirePlainRecord(fact.induction, 'Inductive support report');
  const predicatePolicy = policy?.byPredicate?.[fact.predicate] ?? policy;
  if (!policy?.enabled || !policy.predicates?.includes(fact.predicate) || !predicatePolicy) {
    throw new TypeError('Ordinary result verification rejected an induction outside the declared policy.');
  }
  const activeFacts = input.activeClosure.facts;
  consume(work, 'factsInspected', activeFacts.length);
  const membershipFacts = new Map();
  const members = new Set();
  for (const candidate of activeFacts) {
    if (candidate.predicate === 'is_a' && valueOf(candidate) === induction.className) {
      members.add(candidate.subject);
      membershipFacts.set(candidate.subject, candidate);
    }
  }
  if (!members.has(fact.subject)) {
    throw new TypeError('Ordinary result verification rejected an induced subject outside its declared class.');
  }
  consume(work, 'factsInspected', activeFacts.length);
  const supports = activeFacts.filter((candidate) => members.has(candidate.subject)
    && candidate.predicate === fact.predicate && valueOf(candidate) === valueOf(fact));
  const supportCount = new Set(supports.map((candidate) => candidate.subject)).size;
  const confidence = supportCount / members.size;
  consume(work, 'factsInspected', activeFacts.length);
  const membersWithCounterexample = new Set(activeFacts.filter((candidate) =>
    members.has(candidate.subject) && candidate.predicate === fact.predicate
      && valueOf(candidate) !== valueOf(fact)).map((candidate) => candidate.subject));
  const counterexampleCount = membersWithCounterexample.size;
  if (supportCount < predicatePolicy.minSupport || confidence < predicatePolicy.minCoverage) {
    throw new TypeError('Ordinary result verification rejected induction below its declared support gates.');
  }
  const membershipSupports = [
    membershipFacts.get(fact.subject),
    ...supports.map((support) => membershipFacts.get(support.subject)),
  ].filter(Boolean);
  const allSupports = [...new Map([...membershipSupports, ...supports]
    .map((support) => [support.id, support])).values()];
  consume(work, 'supportReferencesInspected', allSupports.length);
  requireSame(fact.support, allSupports.map((support) => support.id), 'induction support');
  requireSame(fact.provenance, [...new Set(allSupports.flatMap((support) => support.provenance))],
    'induction provenance');
  requireSame(fact.kbSources, expectedKbSources({
    sourceKbVersions: predicatePolicy.sourceKbVersions ?? [],
  }, allSupports), 'induction KB accounting');
  requireSame(induction, {
    className: induction.className,
    supportCount,
    populationCount: members.size,
    counterexampleCount,
    selection: predicatePolicy.selection ?? 'all',
  }, 'induction support report');
  if (fact.confidence !== confidence || fact.derived !== true
    || fact.reasoning !== 'induction'
    || fact.id !== `induced:${induction.className}:${fact.predicate}:${valueOf(fact)}:${fact.subject}`) {
    throw new TypeError('Ordinary result verification rejected malformed inductive evidence.');
  }
}

function verifyRetrievalOrInduction(input, work) {
  const { execution } = input;
  const [query] = input.planning.taskFrame.goals;
  const { result } = execution;
  if (execution.status === 'UNKNOWN') {
    requireSame(result.values, [], 'unknown values');
    requireSame(result.evidence, [], 'unknown evidence');
    if (!input.activeClosure.complete) {
      throw new TypeError('Ordinary result verification rejected UNKNOWN over an incomplete Horn frontier.');
    }
    requireSame(execution.reasoning, { method: 'retrieval', depth: 0 }, 'unknown reasoning');
    return;
  }
  if (!['ANSWERED', 'INDUCTIVE'].includes(execution.status) || result.evidence.length === 0) {
    throw new TypeError('Ordinary result verification rejected an invalid retrieval or induction status.');
  }
  const factsById = factMaps(input, work);
  let firstInduced;
  let derivedDepth = 0;
  for (const evidence of result.evidence) {
    requirePlainRecord(evidence, 'Ordinary answer evidence');
    consume(work, 'evidenceItemsInspected', 1);
    if (!queryMatchesFact(query, evidence)) {
      throw new TypeError('Ordinary result verification rejected evidence that does not satisfy the query.');
    }
    if (evidence.reasoning === 'induction') {
      verifyInductiveFact(evidence, input, work);
      firstInduced ??= evidence;
      continue;
    }
    const accepted = factsById.get(evidence.id);
    if (!accepted || !same(accepted, evidence)) {
      throw new TypeError('Ordinary result verification rejected evidence outside the host-owned closure.');
    }
    verifyHornDerivation(evidence, input, factsById, work);
    if (evidence.reasoning === 'deduction') derivedDepth = Math.max(derivedDepth, evidence.depth ?? 0);
  }
  requireSame(result.values, valuesFromEvidence(query, result.evidence), 'semantic values');
  const expectedStatus = firstInduced ? 'INDUCTIVE' : 'ANSWERED';
  if (execution.status !== expectedStatus) {
    throw new TypeError('Ordinary result verification rejected a status that contradicts its evidence regime.');
  }
  requireSame(execution.reasoning, firstInduced ? {
    method: 'induction', confidence: firstInduced.confidence, ...firstInduced.induction,
  } : {
    method: derivedDepth > 0 ? 'deduction' : 'retrieval', depth: derivedDepth,
  }, 'reasoning summary');
}

function exactFactMatches(triple, fact) {
  return exactTriple(triple, tripleOf(fact));
}

function verifyAbductiveCandidate(candidate, input, work) {
  requirePlainRecord(candidate, 'Abductive candidate witness');
  const [query] = input.planning.taskFrame.goals;
  const goal = [query.subject, query.predicate, query.object];
  consume(work, 'rulesInspected', input.activeModel.rules.length);
  const rule = input.activeModel.rules.find((item) => item.id === candidate.rule);
  if (!rule?.abductive) {
    throw new TypeError('Ordinary result verification rejected an unknown or non-abductive rule.');
  }
  const bindings = unifyPattern(rule.then, {
    subject: goal[0], predicate: goal[1], object: goal[2],
  });
  if (!bindings) throw new TypeError('Ordinary result verification rejected a non-unifying abductive rule.');
  const premises = rule.when.map((premise) => instantiate(premise, bindings));
  const observations = [];
  const supportedByPremise = premises.map(() => []);
  consume(work, 'factsInspected', input.activeClosure.facts.length);
  for (const fact of input.activeClosure.facts) {
    if (exactFactMatches(goal, fact)) observations.push(fact);
    premises.forEach((premise, index) => {
      if (exactFactMatches(premise, fact)) supportedByPremise[index].push(fact);
    });
  }
  const supported = supportedByPremise.flat();
  const missing = premises.filter((_premise, index) => supportedByPremise[index].length === 0);
  consume(work, 'supportReferencesInspected', supported.length + observations.length);
  requireSame(candidate, {
    id: `abduced:${rule.id}`,
    rule: rule.id,
    ruleSource: rule.source,
    hypotheses: missing.length > 0 ? missing : premises,
    support: supported.map((fact) => fact.id),
    observation: observations.map((fact) => fact.id),
    score: (supported.length + 1) / (premises.length + 1),
    reasoning: 'abduction',
  }, 'abductive candidate');
}

function verifyAbduction(input, work) {
  const { execution } = input;
  const { result } = execution;
  requireBoundedArray(result.hypotheses, 'Abductive result hypotheses',
    ordinaryMethodResultBounds(input).maximumEvidence);
  if (execution.status === 'UNKNOWN') {
    requireSame(result.values, [], 'unknown abductive values');
    requireSame(result.evidence, [], 'unknown abductive evidence');
    requireSame(result.hypotheses, [], 'unknown abductive hypotheses');
  } else {
    if (execution.status !== 'ABDUCTIVE' || result.evidence.length === 0) {
      throw new TypeError('Ordinary result verification rejected an invalid abductive status.');
    }
    for (const candidate of result.evidence) {
      consume(work, 'evidenceItemsInspected', 1);
      verifyAbductiveCandidate(candidate, input, work);
    }
    requireSame(result.values, result.evidence.map((candidate) => candidate.id), 'abductive values');
    requireSame(result.hypotheses, result.evidence, 'abductive hypothesis ledger');
  }
  requireSame(execution.reasoning, {
    method: 'abduction', candidateCount: result.evidence.length,
  }, 'abductive reasoning summary');
}

function verifyTemporal(input, work) {
  const { execution } = input;
  const { result } = execution;
  const [query] = input.planning.taskFrame.goals;
  requireSame(execution.reasoning, {
    method: 'temporal-state-predecessor', witness: result.witness,
  }, 'temporal reasoning summary');
  if (execution.status === 'UNKNOWN') {
    requireSame(result.values, [], 'unknown temporal values');
    requireSame(result.evidence, [], 'unknown temporal evidence');
    if (result.witness !== undefined) {
      throw new TypeError('Ordinary result verification rejected an UNKNOWN temporal result with a witness.');
    }
    return;
  }
  if (execution.status !== 'ANSWERED') {
    throw new TypeError('Ordinary result verification rejected an invalid temporal status.');
  }
  const witness = requirePlainRecord(result.witness, 'Temporal predecessor witness');
  requireExactFields(witness, new Set(['previousEvent', 'boundaryEvent']), 'Temporal predecessor witness');
  consume(work, 'historyEventsInspected', input.sessionHistory.length);
  const ordered = input.sessionHistory
    .filter((event) => event.subject === query.subject && event.predicate === query.predicate)
    .toSorted((left, right) => left.sequence - right.sequence);
  const distinct = [];
  for (const event of ordered) if (distinct.at(-1)?.object !== event.object) distinct.push(event);
  let boundaryIndex = -1;
  for (let index = 0; index < distinct.length; index += 1) {
    if (distinct[index].object === query.before) boundaryIndex = index;
  }
  if (boundaryIndex < 1) {
    throw new TypeError('Ordinary result verification rejected a temporal witness without a predecessor.');
  }
  const previous = distinct[boundaryIndex - 1];
  const boundary = distinct[boundaryIndex];
  requireSame(witness, { previousEvent: previous, boundaryEvent: boundary }, 'temporal event pair');
  requireSame(result.values, [previous.object], 'temporal values');
  requireSame(result.evidence, [{
    id: `temporal:${previous.id}:${boundary.id}`,
    provenance: [...new Set([...(previous.provenance ?? []), ...(boundary.provenance ?? [])])],
    support: [previous.factId, boundary.factId],
    reasoning: 'temporal-predecessor',
    witness: { previousEvent: previous.id, boundaryEvent: boundary.id },
  }], 'temporal evidence');
  consume(work, 'evidenceItemsInspected', 1);
  consume(work, 'supportReferencesInspected', 2);
}

function verifyResourceLimit(input) {
  const { execution, activeClosure } = input;
  if (activeClosure.complete || execution.status !== 'RESOURCE_LIMIT') {
    throw new TypeError('Ordinary result verification rejected an invalid resource-limit claim.');
  }
  requireSame(execution.result, { values: [], evidence: [] }, 'resource-limit result');
  requireSame(execution.reasoning, {
    method: 'deduction', complete: false, rounds: activeClosure.rounds,
    joinAttempts: activeClosure.joinAttempts, frontierSize: activeClosure.frontierSize,
  }, 'resource-limit reasoning');
  requireSame(execution.resourceLimit, { diagnostic: activeClosure.diagnostic }, 'resource-limit receipt');
}

function verifyExecutionWitness(input, work) {
  if (input.execution.status === 'RESOURCE_LIMIT') {
    verifyResourceLimit(input);
  } else if (input.execution.requiredCapability === 'abduction') {
    verifyAbduction(input, work);
  } else if (input.execution.requiredCapability === 'temporal-predecessor') {
    verifyTemporal(input, work);
  } else {
    verifyRetrievalOrInduction(input, work);
  }
}

export function verifyOrdinaryMethodResult(value) {
  const input = assertOrdinaryResultVerificationInput(value);
  const work = verificationWork(input);
  try {
    verifyExecutionWitness(input, work);
  } catch (error) {
    if (!(error instanceof VerificationResourceLimitError)) throw error;
    return Object.freeze(assertOrdinaryResultVerificationOutput({
      format: ORDINARY_REASONING_PROTOCOLS.verificationOutput,
      stage: ORDINARY_REASONING_STAGES.verification,
      methodId: input.execution.methodId,
      status: 'RESOURCE_LIMIT',
      result: { values: [], evidence: [] },
      reasoning: { method: 'witness-verification', complete: false, work },
      resourceLimit: {
        operation: 'verify-ordinary-method-result',
        diagnostic: error.message,
        resource: error.field,
        requested: error.requested,
        limit: work.limit,
      },
      accepted: false,
      truthAuthorized: false,
      work,
    }, ordinaryMethodResultBounds(input)));
  }
  const output = {
    format: ORDINARY_REASONING_PROTOCOLS.verificationOutput,
    stage: ORDINARY_REASONING_STAGES.verification,
    methodId: input.execution.methodId,
    status: input.execution.status,
    result: input.execution.result,
    reasoning: input.execution.reasoning,
    resourceLimit: input.execution.resourceLimit,
    accepted: true,
    truthAuthorized: input.execution.status === 'ANSWERED'
      && input.execution.result.values.length > 0,
    work,
  };
  return Object.freeze(assertOrdinaryResultVerificationOutput(output, ordinaryMethodResultBounds(input)));
}
