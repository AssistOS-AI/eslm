function entityName(id, model) {
  const entity = model.entities.find((candidate) => candidate.id === id);
  return entity?.names[0] ?? id;
}

function list(items) {
  if (items.length < 2) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

function tripleText([subject, predicate, value], model) {
  const name = entityName(subject, model);
  if (predicate === 'condition') return `${name} has condition ${value}`;
  if (predicate === 'state' || predicate === 'has_property') return `${name} is ${value}`;
  if (predicate === 'can') return `${name} can ${value}`;
  if (predicate === 'is_a') return `${name} is a ${value}`;
  return `${name} ${predicate.replaceAll('_', ' ')} ${entityName(value, model)}`;
}

export function realize(query, answer, model) {
  if (query.intent === 'abductive-explanation') {
    if (answer.hypotheses.length === 0) return 'I have no grounded causal rule for that observation.';
    const candidates = answer.hypotheses.map((candidate) => {
      const claims = candidate.hypotheses.map((triple) => tripleText(triple, model)).join(' and ');
      return `${claims} (via ${candidate.rule}, score ${candidate.score.toFixed(2)})`;
    });
    return `Possible explanations are ${list(candidates)}. These are hypotheses, not proven causes.`;
  }
  if (query.intent === 'likelihood') {
    const inferred = answer.evidence.find((fact) => fact.reasoning === 'induction');
    if (!inferred) return 'I found no induction that meets the configured support threshold.';
    const details = inferred.induction;
    return `Probably. ${details.supportCount} of ${details.populationCount} known entities classified as ${details.className} support this pattern (confidence ${inferred.confidence.toFixed(2)}).`;
  }
  const names = answer.values.map((value) => typeof value === 'boolean' ? value : entityName(value, model));
  const subject = query.subject ? entityName(query.subject, model) : undefined;
  const object = query.object ? entityName(query.object, model) : undefined;
  if (query.intent === 'yes-no' || query.intent === 'explanation') {
    if (!answer.values[0]) return 'I have no evidence that this is true.';
    if (query.intent === 'explanation') {
      const derived = answer.evidence.find((fact) => fact.derived);
      if (derived) return `Yes. It follows by rule ${derived.rule}, supported by ${derived.support.join(', ')}.`;
    }
    return 'Yes.';
  }
  if (answer.values.length === 0) return 'The model does not contain enough evidence to answer.';
  const joined = list(names);
  if (query.intent === 'location') return `${subject} is in ${joined}.`;
  if (query.intent === 'owner') return `${joined} owns ${object}.`;
  if (query.intent === 'color') return `${subject} is ${joined}.`;
  if (query.intent === 'possessions') return `${subject} owns ${joined}.`;
  if (query.intent === 'contents') return `${joined} is there.`;
  if (query.intent === 'fear-object') return `${subject} is afraid of ${joined}.`;
  if (query.intent === 'relation' && query.predicate === 'north_of') {
    return `${joined} is north of ${object}.`;
  }
  return `The answer is ${joined}.`;
}
