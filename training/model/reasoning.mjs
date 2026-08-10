export default Object.freeze({
  deduction: Object.freeze({ maxRounds: 8 }),
  induction: Object.freeze({
    enabled: true,
    predicates: Object.freeze(['can', 'color']),
    implicitPredicates: Object.freeze(['color']),
    minSupport: 3,
    minCoverage: 0.7,
    byPredicate: Object.freeze({
      color: Object.freeze({ minSupport: 1, minCoverage: 0.2, selection: 'latest-member' }),
    }),
  }),
  propertyValues: Object.freeze({ color: Object.freeze(['green', 'white', 'gray', 'yellow']) }),
  abduction: Object.freeze({ maxHypotheses: 4 }),
  classes: Object.freeze({
    singular: Object.freeze({ mice: 'mouse', wolves: 'wolf', cats: 'cat', sheep: 'sheep' }),
  }),
});
