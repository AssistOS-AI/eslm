export const CONCEPTNET_RELATIONS = Object.freeze({
  IsA: Object.freeze({ family: 'taxonomy', direction: 'forward', inference: 'transitive-with-cycle-guard' }),
  InstanceOf: Object.freeze({ family: 'taxonomy', direction: 'forward', inference: 'instance-to-class' }),
  PartOf: Object.freeze({ family: 'mereology', direction: 'forward', inference: 'declared-edge-only' }),
  HasA: Object.freeze({ family: 'mereology', direction: 'forward', inference: 'declared-edge-only' }),
  UsedFor: Object.freeze({ family: 'purpose', direction: 'forward', inference: 'defeasible-edge' }),
  CapableOf: Object.freeze({ family: 'capability', direction: 'forward', inference: 'defeasible-edge' }),
  AtLocation: Object.freeze({ family: 'location', direction: 'forward', inference: 'defeasible-edge' }),
  HasProperty: Object.freeze({ family: 'property', direction: 'forward', inference: 'defeasible-edge' }),
  MadeOf: Object.freeze({ family: 'material', direction: 'forward', inference: 'declared-edge-only' }),
  Causes: Object.freeze({ family: 'causal', direction: 'forward', inference: 'defeasible-edge' }),
  MotivatedByGoal: Object.freeze({ family: 'intentional', direction: 'forward', inference: 'defeasible-edge' }),
  ReceivesAction: Object.freeze({ family: 'affordance', direction: 'forward', inference: 'defeasible-edge' }),
  Antonym: Object.freeze({ family: 'lexical-opposition', direction: 'symmetric', inference: 'declared-edge-only' }),
  Synonym: Object.freeze({ family: 'lexical-equivalence', direction: 'symmetric', inference: 'declared-edge-only' }),
});

export function normalizeConceptTerm(value) {
  return value.normalize('NFKD').replace(/\p{M}+/gu, '').toLocaleLowerCase('en-US')
    .replaceAll('_', ' ').replace(/[’']/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function conceptName(uri) {
  const match = uri.match(/^\/c\/en\/([^/]+)/u);
  if (!match) return undefined;
  try { return normalizeConceptTerm(decodeURIComponent(match[1])); } catch { return undefined; }
}

export function conceptBucket(value) {
  const first = normalizeConceptTerm(value)[0] ?? '0';
  return /^[a-z]$/u.test(first) ? first : '0';
}
