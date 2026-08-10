const entities = [
  ['mira', ['Mira'], 'person'], ['lumen', ['Lumen', 'the lantern'], 'object'],
  ['observatory', ['the observatory', 'observatory'], 'place'], ['garden', ['the garden', 'garden'], 'place'],
  ['avi', ['Avi'], 'animal'], ['bela', ['Bela'], 'animal'], ['cirrus', ['Cirrus'], 'animal'],
  ['dana', ['Dana'], 'animal'], ['lawn', ['the lawn', 'lawn'], 'place'],
  ['weather', ['the weather', 'weather'], 'system'], ['sprinkler', ['the sprinkler', 'sprinkler'], 'device'],
].map(([id, names, kind]) => ({ id, names, kind }));

const facts = [
  ['mira', 'located_in', 'observatory'], ['mira', 'owns', 'lumen'], ['lumen', 'color', 'blue'],
  ['avi', 'is_a', 'sparrow'], ['bela', 'is_a', 'sparrow'], ['cirrus', 'is_a', 'sparrow'],
  ['dana', 'is_a', 'sparrow'], ['avi', 'can', 'fly'], ['bela', 'can', 'fly'], ['cirrus', 'can', 'fly'],
  ['lawn', 'has_property', 'wet'],
].map(([subject, predicate, value], index) => ({
  id: `fixture:f${index}`, subject, predicate,
  ...(entities.some((entity) => entity.id === value) ? { object: value } : { value }),
  provenance: [`fixture:${index + 1}`],
}));

const rules = [
  { id: 'owned-object-location', when: [['?person', 'owns', '?object'], ['?person', 'located_in', '?place']], then: ['?object', 'located_in', '?place'], source: 'fixture:rule:1' },
  { id: 'man-is-human', when: [['?person', 'is_a', 'man']], then: ['?person', 'is_a', 'human'], source: 'fixture:rule:2' },
  { id: 'human-is-mortal', when: [['?person', 'is_a', 'human']], then: ['?person', 'is_a', 'mortal'], source: 'fixture:rule:3' },
  { id: 'mortal-eventually-dies', when: [['?person', 'is_a', 'mortal']], then: ['?person', 'will_die', 'eventually'], source: 'fixture:rule:4' },
  { id: 'rain-wets-lawn', when: [['weather', 'condition', 'rain']], then: ['lawn', 'has_property', 'wet'], source: 'fixture:rule:5', abductive: true },
  { id: 'sprinkler-wets-lawn', when: [['sprinkler', 'state', 'on']], then: ['lawn', 'has_property', 'wet'], source: 'fixture:rule:6', abductive: true },
];

export default {
  manifest: { format: 'eslm-code-model-v1', modelId: 'reasoning-test-fixture' },
  entities,
  facts,
  rules,
  lexicon: { variants: {} },
  indexes: {},
  reasoning: {
    deduction: { maxRounds: 8 },
    induction: { enabled: true, predicates: ['can'], minSupport: 3, minCoverage: 0.7 },
    abduction: { maxHypotheses: 4 },
    classes: { singular: { mice: 'mouse', wolves: 'wolf', cats: 'cat', sheep: 'sheep' } },
  },
};
