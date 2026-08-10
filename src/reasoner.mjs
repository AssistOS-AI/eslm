function valueOf(fact) {
  return fact.object ?? fact.value;
}

function signature(fact) {
  return `${fact.subject}\u0000${fact.predicate}\u0000${valueOf(fact)}`;
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

export function deriveClosure(model, maxRounds = model.reasoning?.deduction?.maxRounds ?? 8) {
  const facts = model.facts.map((fact) => ({ ...fact, derived: false }));
  const seen = new Set(facts.map(signature));
  const index = indexFacts(facts);
  for (let round = 0; round < maxRounds; round += 1) {
    const additions = [];
    for (const rule of model.rules) {
      let matches = [{ bindings: {}, support: [] }];
      for (const premise of rule.when) {
        const expanded = [];
        for (const match of matches) {
          for (const fact of candidateFacts(premise, match.bindings, index)) {
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
          subject,
          predicate,
          object,
          provenance: [rule.source, ...match.support.flatMap((item) => item.provenance)],
          support: match.support.map((item) => item.id),
          rule: rule.id,
          reasoning: 'deduction',
          depth: 1 + Math.max(0, ...match.support.map((item) => item.depth ?? 0)),
          derived: true,
        };
        if (!seen.has(signature(fact))) {
          seen.add(signature(fact));
          additions.push(fact);
        }
      }
    }
    if (additions.length === 0) break;
    for (const fact of additions) {
      facts.push(fact);
      addIndexedFact(index, fact);
    }
  }
  return facts;
}

export function deriveInductiveFacts(model, facts) {
  const policy = model.reasoning?.induction;
  if (!policy?.enabled) return [];
  const allowed = new Set(policy.predicates ?? []);
  const membersByClass = new Map();
  for (const fact of facts) {
    if (fact.predicate !== 'is_a') continue;
    const className = valueOf(fact);
    membersByClass.set(className, new Set([...(membersByClass.get(className) ?? []), fact.subject]));
  }
  const candidates = new Map();
  for (const [className, members] of membersByClass) {
    for (const fact of facts) {
      if (!members.has(fact.subject) || !allowed.has(fact.predicate)) continue;
      const key = `${className}\u0000${fact.predicate}\u0000${valueOf(fact)}`;
      const current = candidates.get(key) ?? {
        className, predicate: fact.predicate, value: valueOf(fact), members, supports: [],
      };
      current.supports.push(fact);
      candidates.set(key, current);
    }
  }
  const existing = new Set(facts.map(signature));
  const induced = [];
  for (const candidate of candidates.values()) {
    const supportSubjects = new Set(candidate.supports.map((fact) => fact.subject));
    const supportCount = supportSubjects.size;
    const populationCount = candidate.members.size;
    const confidence = supportCount / populationCount;
    if (supportCount < policy.minSupport || confidence < policy.minCoverage) continue;
    for (const subject of candidate.members) {
      const triple = [subject, candidate.predicate, candidate.value];
      const proposed = factFromTriple(triple);
      if (existing.has(signature(proposed))) continue;
      induced.push({
        id: `induced:${candidate.className}:${candidate.predicate}:${candidate.value}:${subject}`,
        ...proposed,
        provenance: [...new Set(candidate.supports.flatMap((fact) => fact.provenance))],
        support: candidate.supports.map((fact) => fact.id),
        reasoning: 'induction',
        derived: true,
        confidence,
        induction: {
          className: candidate.className,
          supportCount,
          populationCount,
          counterexampleCount: 0,
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
  const matches = smallest.filter((fact) => membership.every((set) => set.has(fact)));
  if (query.target === 'boolean') return { values: matches.length > 0 ? [true] : [], evidence: matches };
  return {
    values: [...new Set(matches.map((fact) => query.target === 'subject' ? fact.subject : valueOf(fact)))],
    evidence: matches,
  };
}
