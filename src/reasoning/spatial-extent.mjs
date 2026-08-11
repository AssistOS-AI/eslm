const MAX_DIMENSIONS = 4;
const MAX_FACTS = 10_000;
const MAX_ENTITIES = 10_000;
const MAX_GRAPH_EDGES = 100_000;

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

function variable(entity, dimension, boundary) {
  return `${entity}\u0000${dimension}\u0000${boundary}`;
}

function validateSystem(system) {
  if (system?.schema !== 'typed-spatial-extent-system-v1') throw new Error('A typed spatial extent system is required.');
  requireIdentifier(system.systemId, 'systemId');
  if (!Array.isArray(system.dimensions) || system.dimensions.length === 0
    || system.dimensions.length > MAX_DIMENSIONS) {
    throw new Error(`Spatial extent systems require between 1 and ${MAX_DIMENSIONS} dimensions.`);
  }
  const dimensions = system.dimensions.map((value, index) => requireIdentifier(value, `dimension ${index}`));
  if (new Set(dimensions).size !== dimensions.length) throw new Error('Spatial extent dimensions must be unique.');
  if (!Array.isArray(system.relations) || system.relations.length === 0) {
    throw new Error('Spatial extent systems require relation definitions.');
  }
  const relations = new Map();
  const byDimension = new Map();
  for (const [index, relation] of system.relations.entries()) {
    const id = requireIdentifier(relation?.id, `relation ${index} id`);
    if (relations.has(id)) throw new Error(`Duplicate spatial extent relation ${id}.`);
    const dimension = requireIdentifier(relation?.dimension, `relation ${id} dimension`);
    if (!dimensions.includes(dimension)) throw new Error(`Relation ${id} uses an undeclared dimension.`);
    if (!['positive', 'negative'].includes(relation.polarity)) throw new Error(`Relation ${id} has invalid polarity.`);
    const key = `${dimension}\u0000${relation.polarity}`;
    if (byDimension.has(key)) throw new Error(`Several relations use ${key}.`);
    const accepted = Object.freeze({ id, dimension, polarity: relation.polarity, output: relation.output === true });
    relations.set(id, accepted);
    byDimension.set(key, accepted);
  }
  for (const dimension of dimensions) {
    for (const polarity of ['positive', 'negative']) {
      if (!byDimension.get(`${dimension}\u0000${polarity}`)?.output) {
        throw new Error(`Dimension ${dimension} requires positive and negative output relations.`);
      }
    }
  }
  return Object.freeze({ dimensions: Object.freeze(dimensions), relations, byDimension });
}

function validateTask(task, system, compiled) {
  if (task?.schema !== 'typed-spatial-extent-task-v1') throw new Error('Typed spatial extent task schema is required.');
  if (task.systemId !== system.systemId) throw new Error('The requested spatial extent system is not active.');
  if (task.orthogonalPolicy !== 'overlap-unmentioned-dimensions') {
    throw new Error('Spatial extent tasks require an explicit supported orthogonal policy.');
  }
  if (!Array.isArray(task.facts) || task.facts.length > MAX_FACTS) {
    throw new Error(`Spatial extent tasks permit at most ${MAX_FACTS} facts.`);
  }
  const facts = task.facts.map((fact, index) => {
    const id = requireIdentifier(fact?.id ?? `fact:${index}`, `fact ${index} id`);
    const subject = requireIdentifier(fact?.subject, `fact ${index} subject`);
    const object = requireIdentifier(fact?.object, `fact ${index} object`);
    if (!Array.isArray(fact.relations) || fact.relations.length === 0) {
      throw new Error(`Fact ${id} requires relation identifiers.`);
    }
    const relations = [...new Set(fact.relations.map((value) => requireIdentifier(value, `fact ${id} relation`)))];
    if (relations.some((relation) => !compiled.relations.has(relation))) {
      throw new Error(`Fact ${id} uses an undeclared relation.`);
    }
    const dimensions = relations.map((relation) => compiled.relations.get(relation).dimension);
    if (new Set(dimensions).size !== dimensions.length) throw new Error(`Fact ${id} has conflicting same-dimension relations.`);
    return Object.freeze({ id, subject, object, relations: Object.freeze(relations) });
  });
  const subject = requireIdentifier(task.query?.subject, 'query subject');
  const object = requireIdentifier(task.query?.object, 'query object');
  return Object.freeze({
    facts: Object.freeze(facts), subject, object,
    orthogonalPolicy: task.orthogonalPolicy,
  });
}

function addGraphEdge(graph, greater, lesser, witness) {
  if (!graph.has(greater)) graph.set(greater, []);
  const edges = graph.get(greater);
  if (!edges.some((edge) => edge.lesser === lesser && edge.kind === witness.kind && edge.factId === witness.factId)) {
    edges.push(Object.freeze({ greater, lesser, ...witness }));
  }
}

function buildConstraintGraph(accepted, compiled) {
  const graph = new Map();
  const entities = new Set(accepted.facts.flatMap((fact) => [fact.subject, fact.object]));
  for (const entity of entities) {
    for (const dimension of compiled.dimensions) {
      addGraphEdge(graph, variable(entity, dimension, 'end'), variable(entity, dimension, 'start'), {
        kind: 'well-formed-extent', entity, dimension,
      });
    }
  }
  for (const fact of accepted.facts) {
    const mentioned = new Set();
    for (const relationId of fact.relations) {
      const relation = compiled.relations.get(relationId);
      mentioned.add(relation.dimension);
      if (relation.polarity === 'positive') {
        addGraphEdge(graph,
          variable(fact.subject, relation.dimension, 'start'),
          variable(fact.object, relation.dimension, 'end'),
          { kind: 'declared-separation', factId: fact.id, relation: relationId });
      } else {
        addGraphEdge(graph,
          variable(fact.object, relation.dimension, 'start'),
          variable(fact.subject, relation.dimension, 'end'),
          { kind: 'declared-separation', factId: fact.id, relation: relationId });
      }
    }
    for (const dimension of compiled.dimensions) {
      if (mentioned.has(dimension)) continue;
      addGraphEdge(graph,
        variable(fact.subject, dimension, 'end'),
        variable(fact.object, dimension, 'start'),
        { kind: 'declared-orthogonal-overlap', factId: fact.id, dimension });
      addGraphEdge(graph,
        variable(fact.object, dimension, 'end'),
        variable(fact.subject, dimension, 'start'),
        { kind: 'declared-orthogonal-overlap', factId: fact.id, dimension });
    }
  }
  const edgeCount = [...graph.values()].reduce((total, edges) => total + edges.length, 0);
  return Object.freeze({ graph, entities, edgeCount });
}

function inequalityPath(graph, greater, lesser) {
  if (greater === lesser) return Object.freeze([]);
  const predecessors = new Map();
  const frontier = [greater];
  const visited = new Set(frontier);
  for (let cursor = 0; cursor < frontier.length; cursor += 1) {
    const from = frontier[cursor];
    const edges = [...(graph.get(from) ?? [])].sort((left, right) =>
      left.lesser.localeCompare(right.lesser) || (left.factId ?? '').localeCompare(right.factId ?? ''));
    for (const edge of edges) {
      if (visited.has(edge.lesser)) continue;
      visited.add(edge.lesser);
      predecessors.set(edge.lesser, edge);
      if (edge.lesser === lesser) {
        const path = [];
        let node = lesser;
        while (node !== greater) {
          const step = predecessors.get(node);
          path.push(step);
          node = step.greater;
        }
        return Object.freeze(path.reverse());
      }
      frontier.push(edge.lesser);
    }
  }
  return undefined;
}

function deriveOutputs(accepted, compiled, graph) {
  const outputs = [];
  const conflicts = [];
  for (const dimension of compiled.dimensions) {
    const positive = compiled.byDimension.get(`${dimension}\u0000positive`);
    const negative = compiled.byDimension.get(`${dimension}\u0000negative`);
    const positivePath = inequalityPath(graph,
      variable(accepted.subject, dimension, 'start'), variable(accepted.object, dimension, 'end'));
    const negativePath = inequalityPath(graph,
      variable(accepted.object, dimension, 'start'), variable(accepted.subject, dimension, 'end'));
    if (positivePath && negativePath) {
      conflicts.push(Object.freeze({ dimension, positive: positivePath, negative: negativePath }));
    } else if (positivePath) {
      outputs.push(Object.freeze({ relation: positive.id, dimension, polarity: 'positive', path: positivePath }));
    } else if (negativePath) {
      outputs.push(Object.freeze({ relation: negative.id, dimension, polarity: 'negative', path: negativePath }));
    }
  }
  return Object.freeze({ outputs: Object.freeze(outputs), conflicts: Object.freeze(conflicts) });
}

export function executeSpatialExtentTask(task, system) {
  let compiled;
  let accepted;
  try {
    compiled = validateSystem(system);
    accepted = validateTask(task, system, compiled);
  } catch (error) {
    return emptyResult('UNPARSED', error.message);
  }
  const built = buildConstraintGraph(accepted, compiled);
  if (built.entities.size > MAX_ENTITIES || built.edgeCount > MAX_GRAPH_EDGES) {
    return emptyResult('RESOURCE_LIMIT', 'Spatial extent constraint graph exceeds a declared bound.');
  }
  if (!built.entities.has(accepted.subject) || !built.entities.has(accepted.object)) {
    return emptyResult('UNKNOWN', 'A query endpoint has no accepted extent evidence.');
  }
  const derived = deriveOutputs(accepted, compiled, built.graph);
  if (derived.conflicts.length > 0) {
    return emptyResult('INCONSISTENT_CONTEXT', 'Opposite directional separations are both entailed.', {
      conflicts: derived.conflicts,
    });
  }
  if (derived.outputs.length === 0) {
    return emptyResult('UNDERDETERMINED', 'The extent inequalities entail no declared directional relation.');
  }
  return Object.freeze({
    status: 'SOLVED',
    values: Object.freeze(derived.outputs.map((output) => output.relation).sort()),
    evidence: derived.outputs,
    diagnostic: 'Every returned relation is entailed by a transitive path through declared extent inequalities.',
    reasoning: Object.freeze({
      method: 'spatial-extent-inequality-closure',
      inspectedEntities: built.entities.size,
      constraintEdges: built.edgeCount,
      orthogonalPolicy: accepted.orthogonalPolicy,
    }),
  });
}

export function verifySpatialExtentResult(task, system, result) {
  if (result?.status !== 'SOLVED' || !Array.isArray(result.values) || !Array.isArray(result.evidence)) return false;
  let compiled;
  let accepted;
  try {
    compiled = validateSystem(system);
    accepted = validateTask(task, system, compiled);
  } catch {
    return false;
  }
  const built = buildConstraintGraph(accepted, compiled);
  const derived = deriveOutputs(accepted, compiled, built.graph);
  if (derived.conflicts.length > 0) return false;
  const expected = derived.outputs.map((output) => output.relation).sort();
  if (JSON.stringify(expected) !== JSON.stringify([...result.values].sort())) return false;
  if (result.evidence.length !== derived.outputs.length
    || new Set(result.evidence.map((item) => item?.relation)).size !== result.evidence.length) return false;
  for (const evidence of result.evidence) {
    const expectedEvidence = derived.outputs.find((output) => output.relation === evidence.relation);
    if (!expectedEvidence || JSON.stringify(expectedEvidence.path) !== JSON.stringify(evidence.path)) return false;
    let cursor;
    for (const [index, edge] of evidence.path.entries()) {
      if (index === 0) cursor = edge.greater;
      if (edge.greater !== cursor) return false;
      const graphEdge = (built.graph.get(edge.greater) ?? []).some((candidate) =>
        JSON.stringify(candidate) === JSON.stringify(edge));
      if (!graphEdge) return false;
      cursor = edge.lesser;
    }
  }
  return true;
}
