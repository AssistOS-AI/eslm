import {
  compileFeatureSentence, featureValues, hasFeature,
} from './feature-profile.mjs';

const DEFAULT_WEIGHTS = Object.freeze({
  agreement: 8,
  binding: 9,
  morphology: 8,
  polarity: 8,
  quantifier: 8,
  valency: 8,
  selection: 8,
  dependency: 9,
  ellipsis: 8,
});

function category(unit, value) {
  return hasFeature(unit, 'category', value);
}

function boundary(unit) {
  return category(unit, 'punctuation') || hasFeature(unit, 'clauseBoundary', true)
    || category(unit, 'conjunction');
}

function firstValue(unit, key) {
  return featureValues(unit, key)[0];
}

function unambiguousValue(unit, key) {
  const values = featureValues(unit, key);
  return values.length === 1 ? values[0] : undefined;
}

function compatible(left, right) {
  return left === undefined || right === undefined || left === 'any' || right === 'any' || left === right;
}

function addViolation(state, code, family, details = {}) {
  state.violations.push(Object.freeze({ code, family, ...details }));
}

function nextIndex(units, start, predicate, stop = boundary) {
  for (let index = start; index < units.length; index += 1) {
    if (stop(units[index], index)) return -1;
    if (predicate(units[index], index)) return index;
  }
  return -1;
}

function previousIndex(units, start, predicate, stop = boundary) {
  for (let index = start; index >= 0; index -= 1) {
    if (stop(units[index], index)) return -1;
    if (predicate(units[index], index)) return index;
  }
  return -1;
}

function clauseStart(units, index) {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (hasFeature(units[cursor], 'startsClause', true) || category(units[cursor], 'punctuation')
      || category(units[cursor], 'conjunction')) return cursor + 1;
  }
  return 0;
}

function nounHead(units, start, end) {
  let candidate = -1;
  let afterPossessive = false;
  for (let index = start; index < end; index += 1) {
    const unit = units[index];
    if (hasFeature(unit, 'relativeMarker', true) || category(unit, 'preposition')) break;
    if (hasFeature(unit, 'possessiveMarker', true)) {
      candidate = -1;
      afterPossessive = true;
      continue;
    }
    if ((category(unit, 'noun') && !category(unit, 'verb') && !category(unit, 'auxiliary'))
      || category(unit, 'pronoun') || category(unit, 'reflexive')) {
      candidate = index;
      afterPossessive = false;
    }
  }
  return candidate;
}

function finiteIndices(units) {
  return units.flatMap((unit, index) => hasFeature(unit, 'finite', true) ? [index] : []);
}

function subjectForFinite(units, finiteIndex) {
  const start = clauseStart(units, finiteIndex);
  const preceding = units.slice(start, finiteIndex);
  const inversionPosition = preceding.length === 0
    || preceding.every((unit) => category(unit, 'wh') || category(unit, 'punctuation'));
  if (hasFeature(units[finiteIndex], 'supportsInversion', true) && inversionPosition) {
    const noun = nextIndex(units, finiteIndex + 1,
      (unit) => category(unit, 'noun') || category(unit, 'pronoun'));
    return noun;
  }
  let relative = -1;
  for (let index = 0; index < finiteIndex; index += 1) {
    if (clauseMarkerAt(units, index) && hasFeature(units[index], 'relativeMarker', true)
      && markerGapLicense(units, index) === 'requires-gap') relative = index;
  }
  if (relative >= 0) {
    const relativePredicate = nextIndex(units, relative + 1,
      (unit) => category(unit, 'verb') || hasFeature(unit, 'finite', true));
    if (relativePredicate >= 0 && relativePredicate < finiteIndex) return nounHead(units, 0, relative);
  }
  return nounHead(units, start, finiteIndex);
}

function grammaticalNumberAt(units, index) {
  const direct = unambiguousValue(units[index], 'number');
  if (direct) return direct;
  const determiner = previousIndex(units, index - 1, (unit) => category(unit, 'determiner'),
    (unit) => boundary(unit) || category(unit, 'verb') || category(unit, 'auxiliary'));
  return determiner >= 0 ? unambiguousValue(units[determiner], 'number') : undefined;
}

function checkDeterminerAgreement(state) {
  const { units } = state;
  for (let index = 0; index < units.length; index += 1) {
    if (!category(units[index], 'determiner')) continue;
    const determinerNumber = unambiguousValue(units[index], 'number');
    if (!determinerNumber || determinerNumber === 'any') continue;
    let end = units.length;
    for (let cursor = index + 1; cursor < units.length; cursor += 1) {
      if (boundary(units[cursor]) || category(units[cursor], 'verb') || category(units[cursor], 'auxiliary')
        || hasFeature(units[cursor], 'relativeMarker', true)) {
        end = cursor;
        break;
      }
    }
    const noun = nounHead(units, index + 1, end);
    if (noun < 0) continue;
    const nounNumber = grammaticalNumberAt(units, noun);
    if (!compatible(determinerNumber, nounNumber)) {
      addViolation(state, 'determiner-head-number', 'agreement', { controller: index, target: noun });
    }
  }
}

function checkFiniteAgreement(state) {
  const { units } = state;
  for (const finite of finiteIndices(units)) {
    const required = unambiguousValue(units[finite], 'agreement');
    if (!required || required === 'any') continue;
    const subject = subjectForFinite(units, finite);
    if (subject < 0) continue;
    const number = grammaticalNumberAt(units, subject);
    if (!compatible(required, number)) {
      addViolation(state, 'subject-finite-number', 'agreement', { controller: subject, target: finite });
    }
  }
}

function localSubjectForReflexive(units, reflexive) {
  const priorFinite = previousIndex(units, reflexive - 1, (unit) => hasFeature(unit, 'finite', true),
    (unit) => category(unit, 'punctuation') || category(unit, 'conjunction'));
  if (priorFinite < 0) return nounHead(units, clauseStart(units, reflexive), reflexive);
  let relative = -1;
  for (let index = 0; index < priorFinite; index += 1) {
    if (clauseMarkerAt(units, index) && hasFeature(units[index], 'relativeMarker', true)
      && markerGapLicense(units, index) === 'requires-gap') relative = index;
  }
  if (relative >= 0) {
    const relativePredicate = nextIndex(units, relative + 1,
      (unit) => category(unit, 'verb') || hasFeature(unit, 'finite', true));
    if (relativePredicate >= 0 && relativePredicate < priorFinite) return nounHead(units, 0, relative);
  }
  const previousPredicate = previousIndex(units, priorFinite - 1, (unit) => category(unit, 'verb'),
    (unit) => category(unit, 'punctuation') || category(unit, 'conjunction'));
  const localStart = previousPredicate >= 0 ? previousPredicate + 1 : clauseStart(units, priorFinite);
  const local = nounHead(units, localStart, priorFinite);
  return local >= 0 ? local : subjectForFinite(units, priorFinite);
}

function checkBinding(state) {
  const { units } = state;
  for (let index = 0; index < units.length; index += 1) {
    if (!category(units[index], 'reflexive')) continue;
    const nextFinite = nextIndex(units, index + 1, (unit) => hasFeature(unit, 'finite', true),
      (unit) => category(unit, 'punctuation') || category(unit, 'conjunction'));
    const priorFinite = previousIndex(units, index - 1, (unit) => hasFeature(unit, 'finite', true),
      (unit) => category(unit, 'punctuation') || category(unit, 'conjunction'));
    if (nextFinite >= 0 && priorFinite < clauseStart(units, index)) {
      addViolation(state, 'reflexive-finite-subject', 'binding', { target: index });
      continue;
    }
    const subject = localSubjectForReflexive(units, index);
    if (subject >= 0) {
      for (const key of ['number', 'gender', 'animacy']) {
        const controller = key === 'number'
          ? grammaticalNumberAt(units, subject) : unambiguousValue(units[subject], key);
        const dependent = unambiguousValue(units[index], key);
        if (!compatible(controller, dependent)) {
          addViolation(state, `reflexive-${key}`, 'binding', { controller: subject, target: index });
        }
      }
    }
    const followingVerb = nextIndex(units, index + 1, (unit) => category(unit, 'verb'));
    if (followingVerb === index + 1 && hasFeature(units[index], 'requiresNonfiniteFollower', true)
      && !hasFeature(units[followingVerb], 'nonfinite', true)) {
      addViolation(state, 'reflexive-complement-form', 'binding', { target: followingVerb });
    }
    const laterMarker = nextIndex(units, index + 1, (unit, markerIndex) => clauseMarkerAt(units, markerIndex));
    if (laterMarker >= 0) {
      const finite = nextIndex(units, laterMarker + 1, (unit) => hasFeature(unit, 'finite', true));
      const overtSubject = finite < 0 ? -1 : nounHead(units, laterMarker + 1, finite);
      if (finite >= 0 && overtSubject < 0) {
        addViolation(state, 'reflexive-reconstruction-without-local-antecedent', 'binding', {
          controller: index, target: finite,
        });
      }
    }
  }
}

function checkIrregularForms(state) {
  const { units } = state;
  for (let index = 0; index < units.length; index += 1) {
    const unit = units[index];
    const nextNoun = index + 1 < units.length && category(units[index + 1], 'noun');
    const adjectivalContext = category(units[index - 1], 'determiner') || category(units[index - 1], 'adjective');
    if (nextNoun && adjectivalContext && hasFeature(unit, 'form', 'past')) {
      addViolation(state, 'finite-past-in-adjectival-position', 'morphology', { target: index });
    }
    if (unambiguousValue(unit, 'form') !== 'past-participle' || (nextNoun && adjectivalContext)) continue;
    const auxiliary = previousIndex(units, index - 1,
      (candidate) => category(candidate, 'auxiliary') && hasFeature(candidate, 'selectsParticiple', true),
    );
    if (auxiliary < 0) addViolation(state, 'bare-past-participle', 'morphology', { target: index });
  }
}

function checkPolarity(state) {
  const { units } = state;
  for (let index = 0; index < units.length; index += 1) {
    if (!hasFeature(units[index], 'polarityItem', 'negative')) continue;
    let licensed = false;
    const matrixFinite = previousIndex(units, index - 1, (unit) => hasFeature(unit, 'finite', true),
      (unit) => category(unit, 'punctuation') || category(unit, 'conjunction'));
    for (let cursor = 0; cursor < index; cursor += 1) {
      if (!hasFeature(units[cursor], 'polarityLicensor', true)) continue;
      const relativeBefore = units.slice(0, cursor).some((unit, offset) => relativeMarkerUse(units, offset));
      if (!(relativeBefore && matrixFinite >= 0 && cursor < matrixFinite)) licensed = true;
    }
    const questionMark = units.some((unit) => hasFeature(unit, 'sentenceForce', 'question'));
    const firstContent = units.find((unit) => !category(unit, 'punctuation'));
    if (questionMark && hasFeature(firstContent, 'supportsInversion', true)
      && hasFeature(firstContent, 'questionPolarityLicensor', true)) licensed = true;
    if (!licensed) addViolation(state, 'unlicensed-negative-polarity-item', 'polarity', { target: index });
  }
}

function checkQuantifiers(state) {
  const { units } = state;
  const firstContent = units.findIndex((unit) => !category(unit, 'punctuation'));
  if (firstContent >= 0 && hasFeature(units[firstContent], 'expletive', true)) {
    const copula = nextIndex(units, firstContent + 1, (unit) => hasFeature(unit, 'copula', true));
    const determiner = copula < 0 ? -1 : nextIndex(units, copula + 1, (unit) => category(unit, 'determiner'));
    if (determiner >= 0 && hasFeature(units[determiner], 'quantifierStrength', 'strong')) {
      addViolation(state, 'strong-quantifier-in-existential-pivot', 'quantifier', { target: determiner });
    }
  }
  const subjectDeterminer = units.findIndex((unit) => category(unit, 'determiner'));
  if (subjectDeterminer >= 0 && hasFeature(units[subjectDeterminer], 'downwardEntailing', true)) {
    for (let index = subjectDeterminer + 1; index < units.length; index += 1) {
      if (hasFeature(units[index], 'superlativeQuantifier', true)) {
        addViolation(state, 'superlative-quantifier-under-downward-subject', 'quantifier', { target: index });
      }
    }
  }
}

function objectAfter(units, verbIndex) {
  for (let index = verbIndex + 1; index < units.length; index += 1) {
    const unit = units[index];
    if (boundary(unit) || hasFeature(unit, 'startsClause', true)) return false;
    if (category(unit, 'noun') || category(unit, 'pronoun') || category(unit, 'reflexive')
      || category(unit, 'determiner')) return true;
    if (category(unit, 'verb') && !hasFeature(unit, 'particle', true)) return false;
  }
  return false;
}

function missingRequiredObject(units, verbIndex) {
  return hasFeature(units[verbIndex], 'requiresObject', true) && !objectAfter(units, verbIndex);
}

function clauseMarkerAt(units, index) {
  if (!hasFeature(units[index], 'startsClause', true)) return false;
  if (category(units[index], 'wh') && index > 0 && category(units[index + 1], 'noun')) {
    const laterFinite = nextIndex(units, index + 2, (unit) => hasFeature(unit, 'finite', true));
    if (laterFinite < 0) return false;
  }
  if (!hasFeature(units[index], 'markerAmbiguousWithDeterminer', true)) return true;
  if (index === 0) return false;
  const next = units[index + 1];
  const afterNext = units[index + 2];
  if (!next) return false;
  if (category(next, 'determiner') || category(next, 'pronoun') || next.capitalized
    || category(next, 'auxiliary') || category(next, 'verb')) return true;
  return category(next, 'noun') && (hasFeature(afterNext, 'finite', true) || category(afterNext, 'verb'));
}

function markerGapLicense(units, index) {
  const declared = firstValue(units[index], 'gapLicense');
  if (!hasFeature(units[index], 'markerAmbiguousWithDeterminer', true)) return declared;
  const previous = previousIndex(units, index - 1, (unit) => !category(unit, 'punctuation'), () => false);
  return previous >= 0 && (category(units[previous], 'noun') || category(units[previous], 'pronoun'))
    ? 'requires-gap' : 'forbids-gap';
}

function relativeMarkerUse(units, index) {
  if (!hasFeature(units[index], 'relativeMarker', true)) return false;
  const previous = previousIndex(units, index - 1, (unit) => !category(unit, 'punctuation'), () => false);
  return previous >= 0 && (category(units[previous], 'noun') || category(units[previous], 'pronoun'));
}

function precedingGapLicensor(units, verbIndex) {
  for (let index = verbIndex - 1; index >= 0; index -= 1) {
    if (hasFeature(units[index], 'adjunctBoundary', true) || category(units[index], 'conjunction')) return false;
    if (!clauseMarkerAt(units, index)) continue;
    return markerGapLicense(units, index) === 'requires-gap';
  }
  return false;
}

function checkValencyAndSelection(state) {
  const { units } = state;
  for (let index = 0; index < units.length; index += 1) {
    const unit = units[index];
    if (!category(unit, 'verb') || category(unit, 'auxiliary')) continue;
    const object = objectAfter(units, index);
    const passiveAuxiliary = previousIndex(units, index - 1,
      (candidate) => hasFeature(candidate, 'passiveAuxiliary', true));
    if (hasFeature(unit, 'requiresObject', true) && !object && !precedingGapLicensor(units, index)
      && passiveAuxiliary < 0) {
      addViolation(state, 'missing-required-object', 'valency', { target: index });
    }
    if (hasFeature(unit, 'allowsObject', false) && object) {
      addViolation(state, 'forbidden-object', 'valency', { target: index });
    }
    const finite = previousIndex(units, index - 1, (candidate) => hasFeature(candidate, 'finite', true));
    const subject = finite >= 0 ? subjectForFinite(units, finite) : nounHead(units, clauseStart(units, index), index);
    if (subject >= 0 && hasFeature(unit, 'subjectAnimacy', 'animate')
      && unambiguousValue(units[subject], 'animacy') === 'inanimate') {
      addViolation(state, 'subject-selection-animacy', 'selection', { controller: subject, target: index });
    }
    if (hasFeature(unit, 'passive', false)) {
      const passiveMarker = previousIndex(units, index - 1,
        (candidate) => hasFeature(candidate, 'passiveAuxiliary', true));
      if (passiveMarker >= 0) addViolation(state, 'nonpassivizable-predicate', 'valency', { target: index });
    }
  }
  for (let index = 0; index < units.length; index += 1) {
    if (!hasFeature(units[index], 'agentMarker', true)) continue;
    const agent = nextIndex(units, index + 1, (unit) => category(unit, 'noun') || category(unit, 'pronoun'));
    if (agent >= 0 && unambiguousValue(units[agent], 'animacy') === 'inanimate') {
      addViolation(state, 'agent-selection-animacy', 'selection', { controller: agent, target: index });
    }
  }
}

function checkExpletivesAndInfinitives(state) {
  const { units } = state;
  for (let index = 0; index < units.length; index += 1) {
    if (!hasFeature(units[index], 'expletive', true)) continue;
    let predicate = previousIndex(units, index - 1,
      (unit) => (category(unit, 'verb') && !category(unit, 'auxiliary')) || category(unit, 'adjective'));
    if (predicate < 0) predicate = nextIndex(units, index + 1,
      (unit) => (category(unit, 'verb') && !category(unit, 'auxiliary')) || category(unit, 'adjective'));
    if (predicate >= 0 && hasFeature(units[predicate], 'expletiveSubject', 'forbidden')) {
      addViolation(state, 'expletive-with-control-predicate', 'selection', { controller: predicate, target: index });
    }
  }
  for (let index = 0; index < units.length; index += 1) {
    const dependency = firstValue(units[index], 'infinitiveDependency');
    if (!dependency) continue;
    const infinitive = nextIndex(units, index + 1, (unit) => hasFeature(unit, 'infinitiveMarker', true));
    const verb = infinitive < 0 ? -1 : nextIndex(units, infinitive + 1, (unit) => category(unit, 'verb'));
    if (verb < 0) continue;
    const missing = missingRequiredObject(units, verb);
    if ((dependency === 'object-gap') !== missing) {
      addViolation(state, 'infinitive-dependency-mismatch', 'dependency', { controller: index, target: verb });
    }
  }
}

function markerGapStatus(units, markerIndex) {
  let limit = units.length;
  for (let index = markerIndex + 1; index < units.length; index += 1) {
    if (category(units[index], 'punctuation') || hasFeature(units[index], 'adjunctBoundary', true)) {
      limit = index;
      break;
    }
  }
  const verbs = [];
  for (let index = markerIndex + 1; index < limit; index += 1) {
    if (category(units[index], 'verb') && !category(units[index], 'auxiliary')) verbs.push(index);
  }
  const objectGap = verbs.some((index) => missingRequiredObject(units.slice(0, limit), index));
  const firstFinite = nextIndex(units, markerIndex + 1, (unit) => hasFeature(unit, 'finite', true));
  const invertedQuestion = markerIndex === 0 && firstFinite === markerIndex + 1
    && hasFeature(units[firstFinite], 'supportsInversion', true)
    && hasFeature(units[markerIndex], 'gapLicense', 'requires-gap');
  const subjectGap = !invertedQuestion && (firstFinite === markerIndex + 1
    || (firstFinite >= 0 && nounHead(units, markerIndex + 1, firstFinite) < 0));
  return objectGap || subjectGap;
}

function checkDependencies(state) {
  const { units } = state;
  for (let index = 0; index < units.length; index += 1) {
    if (!clauseMarkerAt(units, index)) continue;
    const markerType = markerGapLicense(units, index);
    if (!markerType) continue;
    const adjacentNominalHead = category(units[index], 'wh') && category(units[index + 1], 'noun');
    const gap = markerGapStatus(units, index);
    if (markerType === 'requires-gap' && !gap && !adjacentNominalHead) {
      addViolation(state, 'filler-without-accessible-gap', 'dependency', { controller: index });
    }
    if (markerType === 'forbids-gap' && gap) {
      addViolation(state, 'unlicensed-clausal-gap', 'dependency', { controller: index });
    }
    if (hasFeature(units[index], 'requiresNominalHead', true)) {
      const head = nextIndex(units, index + 1, (unit) => category(unit, 'noun'),
        (unit) => category(unit, 'auxiliary') || category(unit, 'verb') || boundary(unit));
      if (head < 0) addViolation(state, 'stranded-nominal-wh-determiner', 'dependency', { controller: index });
    }
    if (hasFeature(units[index], 'forbidsNominalHead', true) && category(units[index + 1], 'noun')) {
      addViolation(state, 'non-determiner-wh-with-nominal-head', 'dependency', {
        controller: index, target: index + 1, severity: 2,
      });
    }
  }
  const fillers = units.flatMap((unit, index) => hasFeature(unit, 'gapLicense', 'requires-gap')
    && !relativeMarkerUse(units, index) ? [index] : []);
  if (fillers.length > 1) addViolation(state, 'nested-interrogative-island', 'dependency', { controller: fillers[0] });
  const outerFiller = fillers.find((index) => index === 0);
  if (outerFiller !== undefined) {
    const firstVerb = nextIndex(units, outerFiller + 1,
      (unit) => category(unit, 'verb') && !category(unit, 'auxiliary'));
    const conjunction = units.findIndex((unit) => category(unit, 'conjunction'));
    const piedPipedNominal = category(units[outerFiller + 1], 'noun');
    if (firstVerb >= 0 && conjunction > firstVerb && !piedPipedNominal) {
      addViolation(state, 'asymmetric-coordinate-extraction', 'dependency', { controller: outerFiller });
    }
    const relative = units.findIndex((unit, index) => index > outerFiller && relativeMarkerUse(units, index));
    if (relative >= 0) {
      const antecedent = previousIndex(units, relative - 1,
        (unit) => category(unit, 'noun') || category(unit, 'pronoun'));
      const earlierPredicate = antecedent < 0 ? -1 : previousIndex(units, antecedent - 1,
        (unit) => category(unit, 'verb') && !category(unit, 'auxiliary'));
      if (earlierPredicate >= 0) {
        addViolation(state, 'relative-island-extraction', 'dependency', { controller: outerFiller, target: relative });
      }
    }
    const possessive = units.findIndex((unit) => hasFeature(unit, 'possessiveMarker', true));
    const gerund = possessive < 0 ? -1 : nextIndex(units, possessive + 1,
      (unit) => hasFeature(unit, 'form', 'gerund'));
    if (gerund >= 0) {
      const lexicalVerbs = units.flatMap((unit, index) => category(unit, 'verb') && !category(unit, 'auxiliary')
        ? [index] : []);
      const matrixPredicate = lexicalVerbs.at(-1) ?? -1;
      if (matrixPredicate >= 0 && objectAfter(units, matrixPredicate)) {
        addViolation(state, 'subject-island-extraction', 'dependency', {
          controller: outerFiller, target: matrixPredicate,
        });
      }
    }
  }
  for (let index = 1; index < units.length; index += 1) {
    if (!category(units[index], 'wh') || relativeMarkerUse(units, index)) continue;
    const overtNominal = nextIndex(units, index + 1,
      (unit) => category(unit, 'noun') || category(unit, 'determiner') || category(unit, 'pronoun'));
    const laterPredicate = overtNominal < 0 ? -1 : nextIndex(units, overtNominal + 1,
      (unit, markerIndex) => category(unit, 'verb') || category(unit, 'auxiliary')
        || clauseMarkerAt(units, markerIndex));
    if (overtNominal === index + 1 && laterPredicate >= 0 && !markerGapStatus(units, index)) {
      addViolation(state, 'interrogative-before-overt-antecedent', 'dependency', {
        controller: index, target: overtNominal,
      });
    }
  }
}

function checkEllipsis(state) {
  const { units } = state;
  for (let index = 0; index < units.length; index += 1) {
    if (!category(units[index], 'adjective')) continue;
    const next = units[index + 1];
    if (next && !boundary(next)) continue;
    const previous = units[index - 1];
    if (category(previous, 'determiner') || category(previous, 'numeral')) {
      addViolation(state, 'stranded-adjective-after-nominal-ellipsis', 'ellipsis', { target: index });
    }
  }
}

export function analyzeEnglishAcceptability(text, profile, options = {}) {
  const compiled = compileFeatureSentence(text, profile);
  const state = { ...compiled, violations: [] };
  checkDeterminerAgreement(state);
  checkFiniteAgreement(state);
  checkBinding(state);
  checkIrregularForms(state);
  checkPolarity(state);
  checkQuantifiers(state);
  checkValencyAndSelection(state);
  checkExpletivesAndInfinitives(state);
  checkDependencies(state);
  checkEllipsis(state);
  const weights = { ...DEFAULT_WEIGHTS, ...(options.weights ?? {}) };
  const penalty = state.violations.reduce((sum, item) => sum + (weights[item.family] ?? 1), 0);
  return Object.freeze({
    protocol: 'eslm-feature-acceptability-v1',
    score: -penalty,
    violations: Object.freeze(state.violations),
    units: compiled.units,
  });
}

export { compareEnglishAcceptability } from './feature-grammar-comparison.mjs';
