export default Object.freeze({
  deduction: Object.freeze({ maxRounds: 8 }),
  induction: Object.freeze({
    enabled: true,
    predicates: Object.freeze(['can']),
    minSupport: 3,
    minCoverage: 0.7,
  }),
  abduction: Object.freeze({ maxHypotheses: 4 }),
  classes: Object.freeze({
    singular: Object.freeze({ mice: 'mouse', wolves: 'wolf', cats: 'cat', sheep: 'sheep' }),
  }),
});
