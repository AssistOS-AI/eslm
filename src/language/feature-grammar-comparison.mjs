import { analyzeEnglishAcceptability } from './feature-grammar.mjs';
import { hasFeature } from './feature-profile.mjs';

function violationCount(analysis, family) {
  return analysis.violations.filter((item) => item.family === family)
    .reduce((sum, item) => sum + (item.severity ?? 1), 0);
}

function differingUnits(left, right) {
  const leftUnits = left.units;
  const rightUnits = right.units;
  let prefix = 0;
  while (prefix < leftUnits.length && prefix < rightUnits.length
    && leftUnits[prefix].surface === rightUnits[prefix].surface) prefix += 1;
  let suffix = 0;
  while (suffix < leftUnits.length - prefix && suffix < rightUnits.length - prefix
    && leftUnits[leftUnits.length - 1 - suffix].surface === rightUnits[rightUnits.length - 1 - suffix].surface) {
    suffix += 1;
  }
  return {
    left: leftUnits.slice(prefix, leftUnits.length - suffix),
    right: rightUnits.slice(prefix, rightUnits.length - suffix),
  };
}

function unitsHave(units, key, value) {
  return units.some((unit) => hasFeature(unit, key, value));
}

function contrastFamily(left, right) {
  const changed = differingUnits(left, right);
  const allLeft = left.units;
  const allRight = right.units;
  if (unitsHave(allLeft, 'polarityItem', 'negative') && unitsHave(allRight, 'polarityItem', 'negative')) {
    return 'polarity';
  }
  if (unitsHave(allLeft, 'category', 'reflexive') || unitsHave(allRight, 'category', 'reflexive')) {
    return 'binding';
  }
  if (unitsHave(changed.left, 'superlativeQuantifier', true)
    || unitsHave(changed.right, 'superlativeQuantifier', true)
    || unitsHave(changed.left, 'downwardEntailing', true)
    || unitsHave(changed.right, 'downwardEntailing', true)
    || unitsHave(allLeft, 'expletive', true) && unitsHave(allRight, 'expletive', true)
      && (unitsHave(changed.left, 'quantifierStrength') || unitsHave(changed.right, 'quantifierStrength'))) {
    return 'quantifier';
  }
  if (unitsHave(changed.left, 'form', 'past') || unitsHave(changed.right, 'form', 'past')
    || unitsHave(changed.left, 'form', 'past-participle') || unitsHave(changed.right, 'form', 'past-participle')) {
    return 'morphology';
  }
  if (unitsHave(changed.left, 'gapLicense') || unitsHave(changed.right, 'gapLicense')
    || unitsHave(allLeft, 'category', 'wh') || unitsHave(allRight, 'category', 'wh')) return 'dependency';
  if (unitsHave(changed.left, 'subjectAnimacy') || unitsHave(changed.right, 'subjectAnimacy')
    || (unitsHave(changed.left, 'animacy') || unitsHave(changed.right, 'animacy'))
      && (unitsHave(allLeft, 'subjectAnimacy') || unitsHave(allRight, 'subjectAnimacy')
        || unitsHave(allLeft, 'agentMarker', true) || unitsHave(allRight, 'agentMarker', true))) {
    return 'selection';
  }
  if (unitsHave(changed.left, 'expletiveSubject') || unitsHave(changed.right, 'expletiveSubject')) {
    return 'selection';
  }
  if (unitsHave(changed.left, 'infinitiveDependency') || unitsHave(changed.right, 'infinitiveDependency')) {
    return 'dependency';
  }
  if (unitsHave(changed.left, 'requiresObject') || unitsHave(changed.right, 'requiresObject')
    || unitsHave(changed.left, 'allowsObject') || unitsHave(changed.right, 'allowsObject')
    || unitsHave(changed.left, 'passive') || unitsHave(changed.right, 'passive')) {
    return 'valency';
  }
  if (unitsHave(changed.left, 'number') || unitsHave(changed.right, 'number')
    || unitsHave(changed.left, 'agreement') || unitsHave(changed.right, 'agreement')) {
    return 'agreement';
  }
  if (unitsHave(changed.left, 'category', 'adjective') || unitsHave(changed.right, 'category', 'adjective')) {
    return 'ellipsis';
  }
  return undefined;
}

export function compareEnglishAcceptability(left, right, profile, options = {}) {
  const leftAnalysis = analyzeEnglishAcceptability(left, profile, options);
  const rightAnalysis = analyzeEnglishAcceptability(right, profile, options);
  const family = contrastFamily(leftAnalysis, rightAnalysis);
  const leftContrast = family ? violationCount(leftAnalysis, family) : 0;
  const rightContrast = family ? violationCount(rightAnalysis, family) : 0;
  const contrastPreferred = leftContrast === rightContrast ? null : leftContrast < rightContrast ? 0 : 1;
  return Object.freeze({
    protocol: 'eslm-feature-acceptability-comparison-v1',
    preferred: contrastPreferred ?? (leftAnalysis.score === rightAnalysis.score
      ? null : leftAnalysis.score > rightAnalysis.score ? 0 : 1),
    contrast: Object.freeze({ family: family ?? null, counts: Object.freeze([leftContrast, rightContrast]) }),
    analyses: Object.freeze([leftAnalysis, rightAnalysis]),
  });
}

