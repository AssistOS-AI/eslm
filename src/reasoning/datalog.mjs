import { stableStringify } from '../util.mjs';

function valueOf(fact) {
  return fact.object ?? fact.value;
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function kbSourcesOf(...values) {
  const sources = values.flatMap((value) => value?.kbSources
    ?? value?.sourceKbVersions
    ?? (value?.kbId ? [{ kbId: value.kbId, version: value.kbVersion }] : []));
  const unique = new Map(sources.filter((item) => item?.kbId).map((item) => [
    `${item.kbId}\u0000${item.version ?? ''}`,
    { kbId: item.kbId, ...(item.version ? { version: item.version } : {}) },
  ]));
  return [...unique.values()].toSorted((left, right) =>
    compareText(left.kbId, right.kbId) || compareText(String(left.version), String(right.version)));
}

function signature(fact) {
  return `${fact.subject}\u0000${fact.predicate}\u0000${valueOf(fact)}`;
}

function factOutputKey(fact) {
  return stableStringify({
    subject: fact.subject,
    predicate: fact.predicate,
    term: Object.hasOwn(fact, 'object')
      ? { kind: 'object', value: fact.object }
      : { kind: 'value', value: fact.value },
    contextRef: fact.contextRef ?? null,
    epistemicStatus: fact.epistemicStatus ?? null,
    confidence: fact.confidence ?? null,
    validity: fact.validity ?? null,
    reasoning: fact.reasoning ?? null,
    rule: fact.rule ?? null,
    id: fact.id,
  });
}

function unify(pattern, fact, bindings) {
  const next = { ...bindings };
  const values = [fact.subject, fact.predicate, valueOf(fact)];
  for (let index = 0; index < 3; index += 1) {
    const term = pattern[index];
    if (term.startsWith('?')) {
      if (next[term] && next[term] !== values[index]) return undefined;
      next[term] = values[index];
    } else if (term !== values[index]) return undefined;
  }
  return next;
}

function instantiate(pattern, bindings) {
  return pattern.map((term) => term.startsWith('?') ? bindings[term] : term);
}

function factFromTriple(triple) {
  const [subject, predicate, object] = triple;
  return { subject, predicate, object };
}

function exactMatch(triple, fact) {
  return triple[0] === fact.subject && triple[1] === fact.predicate && triple[2] === valueOf(fact);
}

function boundTerm(term, bindings) {
  return term.startsWith('?') ? bindings[term] : term;
}

function candidateFacts(pattern, bindings, index) {
  const subject = boundTerm(pattern[0], bindings);
  const predicate = boundTerm(pattern[1], bindings);
  const object = boundTerm(pattern[2], bindings);
  const postings = [];
  if (subject !== undefined) postings.push(index.bySubject.get(subject) ?? []);
  if (predicate !== undefined) postings.push(index.byPredicate.get(predicate) ?? []);
  if (object !== undefined) postings.push(index.byObject.get(object) ?? []);
  if (postings.length === 0) return index.facts;
  const smallest = postings.reduce((best, posting) => posting.length < best.length ? posting : best);
  if (postings.length === 1) return smallest;
  const membership = postings.filter((posting) => posting !== smallest).map((posting) => new Set(posting));
  return smallest.filter((fact) => membership.every((set) => set.has(fact)));
}

function addIndexedFact(index, fact) {
  const add = (map, key) => {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(fact);
  };
  index.facts.push(fact);
  add(index.bySubject, fact.subject);
  add(index.byPredicate, fact.predicate);
  add(index.byObject, valueOf(fact));
}

function nonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative safe integer.`);
  }
  return value;
}

export function deriveClosure(model, options = {}) {
  const configured = typeof options === 'number' ? { maxRounds: options } : options;
  const maxRounds = nonNegativeInteger(
    configured.maxRounds ?? model.reasoning?.deduction?.maxRounds ?? 8, 'Horn maximum rounds',
  );
  const maximumFacts = nonNegativeInteger(configured.maximumFacts
    ?? model.reasoning?.deduction?.maximumFacts ?? 100_000, 'Horn maximum facts');
  const maximumJoinAttempts = nonNegativeInteger(configured.maximumJoinAttempts
    ?? model.reasoning?.deduction?.maximumJoinAttempts ?? 250_000,
  'Horn maximum join attempts');
  const facts = model.facts.map((fact) => ({ ...fact, derived: false }));
  const seen = new Set(facts.map(signature));
  const index = indexFacts(facts);
  let joinAttempts = 0;
  let rounds = 0;
  const result = (complete, diagnostic, frontierSize = 0) => ({
    facts, complete, rounds, joinAttempts, frontierSize,
    ...(complete ? {} : { resourceLimit: true, diagnostic }),
  });
  if (facts.length > maximumFacts) {
    return result(false,
      `Horn deduction initial fact inventory ${facts.length} exceeds its ${maximumFacts}-fact budget.`,
      facts.length - maximumFacts);
  }
  const deriveRound = () => {
    const additions = [];
    for (const rule of model.rules) {
      let matches = [{ bindings: {}, support: [] }];
      for (const premise of rule.when) {
        const expanded = [];
        for (const match of matches) {
          for (const fact of candidateFacts(premise, match.bindings, index)) {
            joinAttempts += 1;
            if (joinAttempts > maximumJoinAttempts) {
              return { additions, resourceLimit: 'Horn deduction exhausted its join-attempt budget.' };
            }
            const bindings = unify(premise, fact, match.bindings);
            if (bindings) expanded.push({ bindings, support: [...match.support, fact] });
          }
        }
        matches = expanded;
      }
      for (const match of matches) {
        const [subject, predicate, object] = instantiate(rule.then, match.bindings);
        const fact = {
          id: `derived:${rule.id}:${facts.length + additions.length}`,
          kbId: rule.kbId,
          kbVersion: rule.kbVersion,
          kbSources: kbSourcesOf(rule, ...match.support),
          subject,
          predicate,
          object,
          provenance: [...new Set([
            ...(rule.sources ?? [rule.source]),
            ...match.support.flatMap((item) => item.provenance ?? []),
          ].filter(Boolean))].toSorted(compareText),
          support: match.support.map((item) => item.id),
          rule: rule.id,
          reasoning: 'deduction',
          depth: 1 + Math.max(0, ...match.support.map((item) => item.depth ?? 0)),
          derived: true,
        };
        if (!seen.has(signature(fact))) {
          seen.add(signature(fact));
          additions.push(fact);
          if (facts.length + additions.length > maximumFacts) {
            return { additions, resourceLimit: 'Horn deduction exhausted its fact budget.' };
          }
        }
      }
    }
    return { additions };
  };
  for (let round = 0; round < maxRounds; round += 1) {
    const derived = deriveRound();
    if (derived.resourceLimit) return result(false, derived.resourceLimit, derived.additions.length);
    const { additions } = derived;
    if (additions.length === 0) return result(true, undefined, 0);
    for (const fact of additions) {
      facts.push(fact);
      addIndexedFact(index, fact);
    }
    rounds += 1;
  }
  const completenessProbe = deriveRound();
  if (completenessProbe.resourceLimit) {
    return result(false, completenessProbe.resourceLimit, completenessProbe.additions.length);
  }
  if (completenessProbe.additions.length === 0) return result(true, undefined, 0);
  return result(false, `Horn deduction reached its ${maxRounds}-round limit before the fixed point.`,
    completenessProbe.additions.length);
}

export function deriveInductiveFacts(model, facts) {
  const policy = model.reasoning?.induction;
  if (!policy?.enabled) return [];
  const allowed = new Set(policy.predicates ?? []);
  const membersByClass = new Map();
  const membershipByClass = new Map();
  for (const fact of facts) {
    if (fact.predicate !== 'is_a') continue;
    const className = valueOf(fact);
    membersByClass.set(className, new Set([...(membersByClass.get(className) ?? []), fact.subject]));
    if (!membershipByClass.has(className)) membershipByClass.set(className, new Map());
    membershipByClass.get(className).set(fact.subject, fact);
  }
  const candidates = new Map();
  for (const [className, members] of membersByClass) {
    for (const fact of facts) {
      if (!members.has(fact.subject) || !allowed.has(fact.predicate)) continue;
      const key = `${className}\u0000${fact.predicate}\u0000${valueOf(fact)}`;
      const current = candidates.get(key) ?? {
        className, predicate: fact.predicate, value: valueOf(fact), members,
        membershipFacts: membershipByClass.get(className), supports: [],
      };
      current.supports.push(fact);
      candidates.set(key, current);
    }
  }
  const factOrder = new Map(facts.map((fact, index) => [fact.id, index]));
  const accepted = [];
  for (const candidate of candidates.values()) {
    const predicatePolicy = policy.byPredicate?.[candidate.predicate] ?? policy;
    const supportCount = new Set(candidate.supports.map((fact) => fact.subject)).size;
    const confidence = supportCount / candidate.members.size;
    if (supportCount < predicatePolicy.minSupport || confidence < predicatePolicy.minCoverage) continue;
    accepted.push({
      ...candidate,
      supportCount,
      confidence,
      selection: predicatePolicy.selection ?? 'all',
      sourceKbVersions: predicatePolicy.sourceKbVersions ?? [],
    });
  }
  const selected = [];
  const groups = new Map();
  for (const candidate of accepted) {
    const key = `${candidate.className}\u0000${candidate.predicate}`;
    groups.set(key, [...(groups.get(key) ?? []), candidate]);
  }
  for (const group of groups.values()) {
    if (group.some((candidate) => ['latest-support', 'latest-member'].includes(candidate.selection))) {
      selected.push(group.toSorted((left, right) => {
        const order = (candidate) => Math.max(...candidate.supports.map((fact) => {
          const selectedFact = candidate.selection === 'latest-member'
            ? candidate.membershipFacts.get(fact.subject) : fact;
          return factOrder.get(selectedFact?.id) ?? -1;
        }));
        const leftOrder = order(left);
        const rightOrder = order(right);
        return rightOrder - leftOrder;
      })[0]);
    } else selected.push(...group);
  }
  const existing = new Set(facts.map(signature));
  const induced = [];
  for (const candidate of selected) {
    const supportCount = candidate.supportCount;
    const populationCount = candidate.members.size;
    const confidence = candidate.confidence;
    for (const subject of candidate.members) {
      const triple = [subject, candidate.predicate, candidate.value];
      const proposed = factFromTriple(triple);
      if (existing.has(signature(proposed))) continue;
      const membershipSupports = [
        candidate.membershipFacts.get(subject),
        ...candidate.supports.map((fact) => candidate.membershipFacts.get(fact.subject)),
      ].filter(Boolean);
      const allSupports = [...new Map([...membershipSupports, ...candidate.supports].map((fact) => [fact.id, fact])).values()];
      induced.push({
        id: `induced:${candidate.className}:${candidate.predicate}:${candidate.value}:${subject}`,
        ...proposed,
        kbSources: kbSourcesOf(candidate, ...allSupports),
        provenance: [...new Set(allSupports.flatMap((fact) => fact.provenance))],
        support: allSupports.map((fact) => fact.id),
        reasoning: 'induction',
        derived: true,
        confidence,
        induction: {
          className: candidate.className,
          supportCount,
          populationCount,
          counterexampleCount: [...candidate.members].filter((subject) => facts.some((fact) =>
            fact.subject === subject && fact.predicate === candidate.predicate && valueOf(fact) !== candidate.value)).length,
          selection: candidate.selection,
        },
      });
    }
  }
  return induced;
}

export function abduceExplanations(query, facts, rules, limit = 4) {
  const goal = [query.subject, query.predicate, query.object];
  const observations = facts.filter((fact) => exactMatch(goal, fact));
  if (observations.length === 0) return [];
  const candidates = [];
  for (const rule of rules.filter((item) => item.abductive === true)) {
    const bindings = unify(rule.then, factFromTriple(goal), {});
    if (!bindings) continue;
    const premises = rule.when.map((premise) => instantiate(premise, bindings));
    const supported = premises.flatMap((premise) => facts.filter((fact) => exactMatch(premise, fact)));
    const missing = premises.filter((premise) => !facts.some((fact) => exactMatch(premise, fact)));
    const score = (supported.length + 1) / (premises.length + 1);
    candidates.push({
      id: `abduced:${rule.id}`,
      rule: rule.id,
      ruleSource: rule.source,
      hypotheses: missing.length > 0 ? missing : premises,
      support: supported.map((fact) => fact.id),
      observation: observations.map((fact) => fact.id),
      score,
      reasoning: 'abduction',
    });
  }
  return candidates.toSorted((left, right) => right.score - left.score || left.id.localeCompare(right.id)).slice(0, limit);
}

export function indexFacts(facts) {
  const index = { facts: [], bySubject: new Map(), byPredicate: new Map(), byObject: new Map() };
  for (const fact of facts) {
    addIndexedFact(index, fact);
  }
  return index;
}

export function answerQuery(query, index) {
  const postings = [index.byPredicate.get(query.predicate) ?? []];
  if (query.subject) postings.push(index.bySubject.get(query.subject) ?? []);
  if (query.object) postings.push(index.byObject.get(query.object) ?? []);
  const smallest = postings.toSorted((left, right) => left.length - right.length)[0];
  const membership = postings.filter((posting) => posting !== smallest).map((posting) => new Set(posting));
  const matches = smallest.filter((fact) => membership.every((set) => set.has(fact)))
    .toSorted((left, right) => compareText(factOutputKey(left), factOutputKey(right)));
  if (query.target === 'boolean') return { values: matches.length > 0 ? [true] : [], evidence: matches };
  return {
    values: [...new Set(matches.map((fact) => query.target === 'subject' ? fact.subject : valueOf(fact)))]
      .toSorted((left, right) => compareText(stableStringify(left), stableStringify(right))),
    evidence: matches,
  };
}
