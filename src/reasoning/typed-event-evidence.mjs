import { createHash } from 'node:crypto';

const MAX_FRAMES = 64;

function requireCondition(condition, message) {
  if (!condition) throw new Error(`Typed event evidence: ${message}`);
}
function frameValid(frame) {
  return frame?.schema === 'narrative-event-frame-v1'
    && Array.isArray(frame.content) && Array.isArray(frame.predicates)
    && Array.isArray(frame.participants?.named) && Array.isArray(frame.participants?.pronounGroups)
    && (frame.polarity === 'positive' || frame.polarity === 'negative');
}
function overlap(left, right) {
  const rightSet = new Set(right);
  return [...new Set(left)].filter((value) => rightSet.has(value)).toSorted();
}
function evidenceId(parts) {
  return `evidence:${createHash('sha256').update(parts.join('\0')).digest('hex').slice(0, 32)}`;
}
function record(alternativeId, semanticFamily, direction, strength, provenance) {
  return Object.freeze({ evidenceId: evidenceId([
    alternativeId, semanticFamily, direction, String(strength), provenance.origin,
    provenance.relation, provenance.sourceRef,
  ]), alternativeId, semanticFamily, direction, strength, provenance: Object.freeze(provenance) });
}

export function deriveFramePairEvidence({
  alternativeId, source, target, sourceRef, relationScope = 'state-alignment',
  includeParticipantContinuity = false,
}) {
  requireCondition(typeof alternativeId === 'string', 'alternativeId must be text.');
  requireCondition(frameValid(source) && frameValid(target), 'source and target must be event frames.');
  requireCondition(typeof sourceRef === 'string' && sourceRef.length > 0, 'sourceRef must be non-empty text.');
  const content = overlap(source.content, target.content);
  const predicates = overlap(source.predicates, target.predicates);
  const names = overlap(source.participants.named, target.participants.named);
  const polarityConflict = source.polarity !== target.polarity && (content.length > 0 || predicates.length > 0);
  const evidence = [];
  if (content.length > 0) evidence.push(record(alternativeId,
    polarityConflict ? 'contradiction' : 'state', polarityConflict ? 'attack' : 'support',
    Math.min(1_000, content.length * 100), {
      sourceRef, relation: `${relationScope}:content:${content.join('+')}`,
      origin: 'deterministic-event-frame-overlap',
    }));
  if (predicates.length > 0) evidence.push(record(alternativeId,
    polarityConflict ? 'contradiction' : 'causal', polarityConflict ? 'attack' : 'support',
    Math.min(1_000, predicates.length * 160), {
      sourceRef, relation: `${relationScope}:predicate:${predicates.join('+')}`,
      origin: 'deterministic-event-frame-overlap',
    }));
  if (includeParticipantContinuity && names.length > 0) evidence.push(record(alternativeId,
    'participant', 'support', Math.min(500, names.length * 50), {
      sourceRef, relation: `${relationScope}:participant:${names.join('+')}`,
      origin: 'deterministic-participant-coreference',
    }));
  if (includeParticipantContinuity && target.participants.pronounGroups.length > 0
    && (source.participants.named.length > 0 || source.participants.pronounGroups.length > 0)) {
    evidence.push(record(alternativeId, 'participant', 'support', 25, {
      sourceRef, relation: `${relationScope}:pronoun-continuity`,
      origin: 'deterministic-participant-coreference',
    }));
  }
  return Object.freeze(evidence);
}

export function declaredSemanticEvidence({
  alternativeId, semanticFamily, direction, strength, sourceRef, relation, origin,
}) {
  requireCondition(typeof alternativeId === 'string', 'alternativeId must be text.');
  requireCondition(['causal', 'contradiction', 'default', 'goal', 'participant', 'state', 'temporal']
    .includes(semanticFamily), 'semanticFamily is not allowlisted.');
  requireCondition(direction === 'support' || direction === 'attack', 'direction must be support or attack.');
  requireCondition(Number.isInteger(strength) && strength >= 1 && strength <= 10_000,
    'strength must be from 1 through 10,000.');
  for (const [field, value] of Object.entries({ sourceRef, relation, origin })) {
    requireCondition(typeof value === 'string' && value.length > 0, `${field} must be non-empty text.`);
  }
  return record(alternativeId, semanticFamily, direction, strength, { sourceRef, relation, origin });
}

export function deriveBridgeEvidence({ before, after, candidates, taskRef }) {
  requireCondition(frameValid(before) && frameValid(after), 'before and after must be event frames.');
  requireCondition(Array.isArray(candidates) && candidates.length >= 2 && candidates.length <= MAX_FRAMES,
    `candidates must contain 2 through ${MAX_FRAMES} event alternatives.`);
  requireCondition(typeof taskRef === 'string' && taskRef.length > 0, 'taskRef must be non-empty text.');
  const evidence = [];
  for (const candidate of candidates) {
    requireCondition(typeof candidate.alternativeId === 'string' && frameValid(candidate.event),
      'every candidate requires an alternativeId and event frame.');
    evidence.push(...deriveFramePairEvidence({ alternativeId: candidate.alternativeId,
      source: before, target: candidate.event, sourceRef: `${taskRef}:before-to-bridge`,
      relationScope: 'before-to-bridge', includeParticipantContinuity: true }));
    evidence.push(...deriveFramePairEvidence({ alternativeId: candidate.alternativeId,
      source: candidate.event, target: after, sourceRef: `${taskRef}:bridge-to-after`,
      relationScope: 'bridge-to-after', includeParticipantContinuity: true }));
    evidence.push(declaredSemanticEvidence({ alternativeId: candidate.alternativeId,
      semanticFamily: 'temporal', direction: 'support', strength: 1,
      sourceRef: `${taskRef}:declared-bridge-slot`, relation: 'before<bridge<after',
      origin: 'validated-task-frame-order' }));
  }
  return Object.freeze(evidence);
}
