const MAX_FACTS = 10_000;
const MAX_ENTITIES = 10_000;
const MAX_PATH_DEPTH = 32;
const MAX_PATH_STATES = 100_000;

function emptyResult(status, diagnostic, extra = {}) {
  return Object.freeze({ status, values: Object.freeze([]), evidence: Object.freeze([]), diagnostic, ...extra });
}

function validIdentifier(value) {
  return typeof value === 'string' && /^[\p{L}\p{N}][\p{L}\p{N}_.:-]{0,127}$/u.test(value);
}

function requireIdentifier(value, label) {
  if (!validIdentifier(value)) throw new Error(`${label} must be a bounded identifier.`);
  return value;
}

function validateAlgebra(algebra) {
  if (algebra?.schema !== 'typed-relation-algebra-v1') throw new Error('A typed relation algebra is required.');
  requireIdentifier(algebra.algebraId, 'algebraId');
  if (!Array.isArray(algebra.relations) || algebra.relations.length === 0) {
    throw new Error('Relation algebra requires relation definitions.');
  }
  if (!Array.isArray(algebra.inverses) || !Array.isArray(algebra.compositions)) {
    throw new Error('Relation algebra requires inverse and composition arrays.');
  }
  const relations = new Map();
  const classes = new Set();
  for (const relation of algebra.relations) {
    const id = requireIdentifier(relation?.id, 'relation id');
    const semanticClass = requireIdentifier(relation?.semanticClass, `semantic class for ${id}`);
    if (relations.has(id)) throw new Error(`Duplicate relation id ${id}.`);
    const targetFeatures = relation.targetFeatures ?? {};
    if (!targetFeatures || typeof targetFeatures !== 'object' || Array.isArray(targetFeatures)
      || Object.entries(targetFeatures).some(([facet, value]) => !validIdentifier(facet) || !validIdentifier(value))) {
      throw new Error(`Relation ${id} has invalid target features.`);
    }
    relations.set(id, Object.freeze({
      id, semanticClass, targetFeatures: Object.freeze({ ...targetFeatures }), output: relation.output !== false,
    }));
    classes.add(semanticClass);
  }
  const inverses = new Map();
  for (const inverse of algebra.inverses) {
    const relationClass = requireIdentifier(inverse?.relationClass, 'inverse relationClass');
    const inverseClass = requireIdentifier(inverse?.inverseClass, 'inverse inverseClass');
    if (!classes.has(relationClass) || !classes.has(inverseClass)) {
      throw new Error(`Inverse ${relationClass}/${inverseClass} references an undeclared semantic class.`);
    }
    if (inverses.has(relationClass) && inverses.get(relationClass) !== inverseClass) {
      throw new Error(`Semantic class ${relationClass} has conflicting inverses.`);
    }
    inverses.set(relationClass, inverseClass);
  }
  for (const [relationClass, inverseClass] of inverses) {
    if (inverses.get(inverseClass) !== relationClass) {
      throw new Error(`Inverse mapping ${relationClass}/${inverseClass} is not reciprocal.`);
    }
  }
  const compositions = new Map();
  for (const composition of algebra.compositions) {
    const left = requireIdentifier(composition?.left, 'composition left class');
    const right = requireIdentifier(composition?.right, 'composition right class');
    if (!classes.has(left) || !classes.has(right)) throw new Error(`Composition ${left}/${right} references an undeclared class.`);
    if (!Array.isArray(composition.results) || composition.results.length === 0) {
      throw new Error(`Composition ${left}/${right} requires results.`);
    }
    const values = [...new Set(composition.results.map((value) => requireIdentifier(value, 'composition result')))];
    if (values.some((value) => !classes.has(value))) throw new Error(`Composition ${left}/${right} has an undeclared result.`);
    const key = `${left}\u0000${right}`;
    if (compositions.has(key)) throw new Error(`Duplicate composition ${left}/${right}.`);
    compositions.set(key, Object.freeze(values));
  }
  return { relations, inverses, compositions };
}

function addFeature(features, entity, facet, value, support) {
  let byFacet = features.get(entity);
  if (!byFacet) { byFacet = new Map(); features.set(entity, byFacet); }
  let values = byFacet.get(facet);
  if (!values) { values = new Map(); byFacet.set(facet, values); }
  if (!values.has(value)) values.set(value, []);
  values.get(value).push(support);
}

function featureConflicts(features) {
  const conflicts = [];
  for (const [entity, byFacet] of features) {
    for (const [facet, values] of byFacet) {
      if (values.size > 1) conflicts.push({ entity, facet, values: [...values.keys()].sort() });
    }
  }
  return conflicts;
}

function compatibleRelation(relation, targetFeatures) {
  for (const [facet, required] of Object.entries(relation.targetFeatures)) {
    const observed = targetFeatures?.get(facet);
    if (observed && !observed.has(required)) return false;
  }
  return true;
}

function exactRelation(relation, targetFeatures) {
  return Object.entries(relation.targetFeatures).every(([facet, required]) => targetFeatures?.get(facet)?.has(required));
}

function resolveRelations(semanticClass, targetFeatures, relations) {
  const candidates = [...relations.values()].filter((relation) =>
    relation.output && relation.semanticClass === semanticClass && compatibleRelation(relation, targetFeatures));
  const exact = candidates.filter((relation) => exactRelation(relation, targetFeatures));
  return (exact.length > 0 ? exact : candidates).map((relation) => relation.id).sort();
}

function reduceSequence(sequence, compositions) {
  const table = Array.from({ length: sequence.length }, () => Array(sequence.length));
  for (let index = 0; index < sequence.length; index += 1) {
    table[index][index] = new Map([[sequence[index], Object.freeze({ relationClass: sequence[index], edge: index })]]);
  }
  for (let length = 2; length <= sequence.length; length += 1) {
    for (let start = 0; start + length <= sequence.length; start += 1) {
      const end = start + length - 1;
      const results = new Map();
      for (let split = start; split < end; split += 1) {
        for (const [leftClass, leftProof] of table[start][split]) {
          for (const [rightClass, rightProof] of table[split + 1][end]) {
            for (const resultClass of compositions.get(`${leftClass}\u0000${rightClass}`) ?? []) {
              if (!results.has(resultClass)) {
                results.set(resultClass, Object.freeze({
                  relationClass: resultClass, leftClass, rightClass, left: leftProof, right: rightProof,
                }));
              }
            }
          }
        }
      }
      table[start][end] = results;
    }
  }
  return table[0]?.[sequence.length - 1] ?? new Map();
}

export function executeTypedRelationTask(task, algebra) {
  if (task?.schema !== 'typed-relation-task-v1') return emptyResult('UNPARSED', 'Typed relation task schema is required.');
  let compiled;
  try { compiled = validateAlgebra(algebra); }
  catch (error) { return emptyResult('UNPARSED', error.message); }
  if (task.algebraId !== algebra.algebraId) return emptyResult('NO_APPLICABLE_METHOD', 'The requested relation algebra is not active.');
  if (!Array.isArray(task.facts) || task.facts.length > MAX_FACTS || !Array.isArray(task.features)) {
    return emptyResult('UNPARSED', 'Typed relation facts or features are malformed or oversized.');
  }
  const maxDepth = task.maxDepth ?? MAX_PATH_DEPTH;
  if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > MAX_PATH_DEPTH) {
    return emptyResult('RESOURCE_LIMIT', `Relation path depth must be between 1 and ${MAX_PATH_DEPTH}.`);
  }
  const features = new Map();
  const entities = new Set();
  try {
    for (const [index, feature] of task.features.entries()) {
      const entity = requireIdentifier(feature?.entity, `feature ${index} entity`);
      const facet = requireIdentifier(feature?.facet, `feature ${index} facet`);
      const value = requireIdentifier(feature?.value, `feature ${index} value`);
      entities.add(entity);
      addFeature(features, entity, facet, value, feature.source ?? `feature:${index}`);
    }
  } catch (error) { return emptyResult('UNPARSED', error.message); }
  const edges = new Map();
  const addEdge = (subject, object, semanticClass, witness) => {
    if (!edges.has(subject)) edges.set(subject, []);
    edges.get(subject).push(Object.freeze({ object, semanticClass, witness }));
  };
  try {
    for (const [index, fact] of task.facts.entries()) {
      const id = requireIdentifier(fact?.id ?? `fact:${index}`, `fact ${index} id`);
      const subject = requireIdentifier(fact?.subject, `fact ${index} subject`);
      const object = requireIdentifier(fact?.object, `fact ${index} object`);
      const relationId = requireIdentifier(fact?.relation, `fact ${index} relation`);
      const relation = compiled.relations.get(relationId);
      if (!relation) throw new Error(`Fact ${id} uses undeclared relation ${relationId}.`);
      entities.add(subject); entities.add(object);
      for (const [facet, value] of Object.entries(relation.targetFeatures)) addFeature(features, object, facet, value, id);
      addEdge(subject, object, relation.semanticClass, { factId: id, direction: 'asserted', relation: relationId });
      const inverseClass = compiled.inverses.get(relation.semanticClass);
      if (inverseClass) addEdge(object, subject, inverseClass, { factId: id, direction: 'inverse', relation: relationId });
    }
  } catch (error) { return emptyResult('UNPARSED', error.message); }
  if (entities.size > MAX_ENTITIES) return emptyResult('RESOURCE_LIMIT', 'Typed relation task exceeds the entity limit.');
  const conflicts = featureConflicts(features);
  if (conflicts.length > 0) {
    return emptyResult('INCONSISTENT_CONTEXT', 'An entity has incompatible typed feature values.', {
      conflicts: Object.freeze(conflicts),
    });
  }
  let subject;
  let object;
  try {
    subject = requireIdentifier(task.query?.subject, 'query subject');
    object = requireIdentifier(task.query?.object, 'query object');
  } catch (error) { return emptyResult('UNPARSED', error.message); }
  if (!entities.has(subject) || !entities.has(object)) return emptyResult('UNKNOWN', 'A query endpoint has no accepted relation evidence.');
  let frontier = [{ node: subject, classes: [], reductions: new Map(), path: [], visited: [subject] }];
  let states = 1;
  for (let depth = 1; depth <= maxDepth; depth += 1) {
    const next = [];
    const solutions = [];
    const seen = new Set();
    for (const state of frontier) {
      for (const edge of edges.get(state.node) ?? []) {
        if (state.visited.filter((entity) => entity === edge.object).length >= 2) continue;
        const edgeClasses = [...state.classes, edge.semanticClass];
        const reductions = reduceSequence(edgeClasses, compiled.compositions);
        const classes = [...reductions.keys()].sort();
        const candidate = {
          node: edge.object, classes: edgeClasses, reductions,
          path: [...state.path, { from: state.node, to: edge.object, ...edge.witness, semanticClass: edge.semanticClass }],
          visited: [...state.visited, edge.object],
        };
        if (edge.object === object) {
          if (classes.length > 0) solutions.push(candidate);
        }
        else {
          const semanticKey = classes.length > 0 ? classes.join('\u0001') : edgeClasses.join('\u0001');
          const visitCounts = [...new Set(candidate.visited)].sort().map((entity) =>
            `${entity}:${candidate.visited.filter((value) => value === entity).length}`).join('\u0001');
          const key = `${candidate.node}\u0000${semanticKey}\u0000${visitCounts}`;
          if (!seen.has(key)) { seen.add(key); next.push(candidate); }
        }
        states += 1;
        if (states > MAX_PATH_STATES) return emptyResult('RESOURCE_LIMIT', 'Typed relation search exceeded its path-state budget.');
      }
    }
    if (solutions.length > 0) {
      const targetFeatures = features.get(object);
      const alternatives = solutions.map((solution) => ({
        ...solution,
        values: [...new Set([...solution.reductions.keys()].flatMap((semanticClass) =>
          resolveRelations(semanticClass, targetFeatures, compiled.relations)))].sort(),
      })).filter((solution) => solution.values.length > 0);
      if (alternatives.length === 0) return emptyResult('UNKNOWN', 'No declared output relation matches the derived semantic class.');
      const signatures = new Map();
      for (const alternative of alternatives) {
        const signature = alternative.values.join('\u0000');
        if (!signatures.has(signature)) signatures.set(signature, []);
        signatures.get(signature).push(alternative);
      }
      if (signatures.size > 1) {
        return emptyResult('INCONSISTENT_CONTEXT', 'Independent shortest paths derive incompatible relations.', {
          alternatives: Object.freeze(alternatives.map(({ values, path }) => ({ values, path }))),
        });
      }
      const signature = [...signatures.keys()][0];
      const values = signature.split('\u0000');
      const witnesses = [...signatures.values()][0];
      if (values.length > 1) {
        return emptyResult('AMBIGUOUS', 'The relation class is known but target features do not select one value.', {
          alternatives: Object.freeze(values), witnesses: Object.freeze(witnesses.map((item) => item.path)),
        });
      }
      const witness = witnesses[0];
      return Object.freeze({
        status: 'SOLVED', values: Object.freeze(values), answer: values[0], evidence: Object.freeze(witness.path),
        reasoning: Object.freeze({
          method: 'typed-relation-algebra', algebraId: algebra.algebraId,
          pathLength: witness.path.length, semanticClasses: Object.freeze([...witness.reductions.keys()].sort()),
          compositionProof: witness.reductions.values().next().value, exploredStates: states,
        }),
        witness: Object.freeze({
          path: Object.freeze(witness.path), semanticClasses: Object.freeze([...witness.reductions.keys()].sort()),
          compositionProofs: Object.freeze([...witness.reductions.values()]),
        }),
      });
    }
    frontier = next;
    if (frontier.length === 0) break;
  }
  return emptyResult('UNKNOWN', 'No composable relation path connects the query endpoints.', {
    reasoning: Object.freeze({ method: 'typed-relation-algebra', algebraId: algebra.algebraId, exploredStates: states }),
  });
}

export const TYPED_RELATION_LIMITS = Object.freeze({
  maxFacts: MAX_FACTS, maxEntities: MAX_ENTITIES, maxPathDepth: MAX_PATH_DEPTH, maxPathStates: MAX_PATH_STATES,
});
