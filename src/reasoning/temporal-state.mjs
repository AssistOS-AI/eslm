export function answerTemporalPredecessor(query, history) {
  const ordered = (history ?? [])
    .filter((event) => event.subject === query.subject && event.predicate === query.predicate)
    .toSorted((left, right) => left.sequence - right.sequence);
  const events = [];
  for (const event of ordered) {
    if (events.at(-1)?.object !== event.object) events.push(event);
  }
  let boundaryIndex = -1;
  for (let index = 0; index < events.length; index += 1) {
    if (events[index].object === query.before) boundaryIndex = index;
  }
  if (boundaryIndex < 1) return { values: [], evidence: [], witness: undefined };
  const previous = events[boundaryIndex - 1];
  const boundary = events[boundaryIndex];
  return {
    values: [previous.object],
    evidence: [{
      id: `temporal:${previous.id}:${boundary.id}`,
      provenance: [...new Set([...(previous.provenance ?? []), ...(boundary.provenance ?? [])])],
      support: [previous.factId, boundary.factId],
      reasoning: 'temporal-predecessor',
      witness: { previousEvent: previous.id, boundaryEvent: boundary.id },
    }],
    witness: { previousEvent: previous, boundaryEvent: boundary },
  };
}
