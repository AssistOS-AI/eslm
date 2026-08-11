import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  parseControlledQuantifiedEnglish, semanticWords,
} from '../src/language/quantified-english.mjs';
import { PROJECT_ROOT } from '../src/paths.mjs';

function formulaShape(formula) {
  if (formula.type === 'predicate') return ['predicate', formula.terms.length];
  if (formula.type === 'not') return ['not', formulaShape(formula.operand)];
  if (formula.type === 'binary') return [formula.operator, formulaShape(formula.left), formulaShape(formula.right)];
  return [formula.quantifier, formulaShape(formula.body)];
}

function canonicalFormula(formula, environment = new Map(), depth = 0) {
  if (formula.type === 'predicate') {
    return ['predicate', formula.predicate, ...formula.terms.map((term) => environment.get(term) ?? term)];
  }
  if (formula.type === 'not') return ['not', canonicalFormula(formula.operand, environment, depth)];
  if (formula.type === 'binary') {
    return [formula.operator, canonicalFormula(formula.left, environment, depth),
      canonicalFormula(formula.right, environment, depth)];
  }
  const nested = new Map(environment).set(formula.variable, `?v${depth}`);
  return [formula.quantifier, canonicalFormula(formula.body, nested, depth + 1)];
}

function nonceOptions(rename = false) {
  const entry = (surface, arity, value) => [`${surface}\0${arity}`, value];
  const predicateMap = rename
    ? new Map([entry('quarn', 1, 'kind-2'), entry('vivid', 1, 'property-2'),
      entry('silent', 1, 'quiet-2'), entry('zorple', 2, 'relation-2'), entry('trace', 2, 'action-2')])
    : new Map([entry('glimmer', 1, 'kind-1'), entry('luminou', 1, 'property-1'),
      entry('quiet', 1, 'quiet-1'), entry('catalog', 2, 'relation-1'), entry('inspect', 2, 'action-1')]);
  const constantMap = rename
    ? new Map([['tavra', 'entity-3'], ['vesko', 'entity-4'], ['vault', 'object-2']])
    : new Map([['nira', 'entity-1'], ['odo', 'entity-2'], ['archive', 'object-1']]);
  return {
    resolvePredicate(surface, arity) {
      return predicateMap.get(`${semanticWords(surface).join(' ')}\0${arity}`) ?? { status: 'UNSUPPORTED' };
    },
    resolveConstant(surface) {
      return constantMap.get(semanticWords(surface).join(' ')) ?? { status: 'UNSUPPORTED' };
    },
  };
}

test('quantified English composition survives complete entity and predicate renaming', () => {
  const first = parseControlledQuantifiedEnglish('All glimmers are both stable and visible.');
  const renamed = parseControlledQuantifiedEnglish('Every zorpal is both fluric and navent.');
  assert.equal(first.status, 'PARSED');
  assert.equal(renamed.status, 'PARSED');
  assert.deepEqual(formulaShape(first.formula), formulaShape(renamed.formula));
  assert.deepEqual(formulaShape(first.formula), [
    'forall', ['implies', ['predicate', 1], ['and', ['predicate', 1], ['predicate', 1]]],
  ]);
});

test('negation and quantifier changes remain meaning-changing controls', () => {
  const universal = parseControlledQuantifiedEnglish('All velons are calm.');
  const exclusion = parseControlledQuantifiedEnglish('No velons are calm.');
  const existential = parseControlledQuantifiedEnglish('Some velons are calm.');
  assert.notDeepEqual(formulaShape(universal.formula), formulaShape(exclusion.formula));
  assert.notDeepEqual(formulaShape(universal.formula), formulaShape(existential.formula));
  assert.equal(formulaShape(exclusion.formula)[1][2][0], 'not');
});

test('generalized conditionals preserve implication without lexical constants', () => {
  const result = parseControlledQuantifiedEnglish(
    'If people calibrate a sensor, then they record a pulse.',
  );
  assert.equal(result.status, 'PARSED');
  assert.deepEqual(formulaShape(result.formula), [
    'forall', ['implies', ['predicate', 1], ['predicate', 1]],
  ]);
});

test('a source adapter can provide typed binary vocabulary while ambiguity remains explicit', () => {
  const options = {
    resolvePredicate(surface, arity) {
      if (arity === 2 && semanticWords(surface).includes('observe')) return 'observes';
      if (arity === 1 && semanticWords(surface).includes('calm')) return { status: 'AMBIGUOUS' };
      return { status: 'UNSUPPORTED' };
    },
    resolveConstant(surface) {
      const value = semanticWords(surface).join('-');
      return ['nira', 'quartz-node'].includes(value) ? value : { status: 'UNSUPPORTED' };
    },
  };
  const relation = parseControlledQuantifiedEnglish('Nira observes quartz node.', options);
  assert.equal(relation.status, 'PARSED');
  assert.equal(relation.formula.predicate, 'observes');
  assert.deepEqual(relation.formula.terms, ['nira', 'quartz-node']);
  const ambiguous = parseControlledQuantifiedEnglish('Nira is calm.', options);
  assert.equal(ambiguous.status, 'AMBIGUOUS');
});

test('relative-clause attachment composes a shared subject and changes under a scope contrast', () => {
  const options = nonceOptions();
  const attached = parseControlledQuantifiedEnglish(
    'Every glimmer who is luminous catalogs the archive.', options,
  );
  const contrasted = parseControlledQuantifiedEnglish(
    'Every glimmer who catalogs the archive is luminous.', options,
  );
  assert.equal(attached.status, 'PARSED');
  assert.equal(contrasted.status, 'PARSED');
  assert.notDeepEqual(canonicalFormula(attached.formula), canonicalFormula(contrasted.formula));
  assert.deepEqual(formulaShape(attached.formula), [
    'forall', ['implies', ['and', ['predicate', 1], ['predicate', 1]], ['predicate', 2]],
  ]);
});

test('named-subject and sentence coordination preserve their distinct scopes', () => {
  const options = nonceOptions();
  const sharedPredicate = parseControlledQuantifiedEnglish('Nira and Odo are luminous.', options);
  const separateClauses = parseControlledQuantifiedEnglish('Nira is luminous and Odo is quiet.', options);
  assert.equal(sharedPredicate.status, 'PARSED');
  assert.equal(separateClauses.status, 'PARSED');
  assert.deepEqual(formulaShape(sharedPredicate.formula), ['and', ['predicate', 1], ['predicate', 1]]);
  assert.deepEqual(formulaShape(separateClauses.formula), ['and', ['predicate', 1], ['predicate', 1]]);
  assert.notDeepEqual(canonicalFormula(sharedPredicate.formula), canonicalFormula(separateClauses.formula));
});

test('a conditional indefinite object binds binary arguments and a later pronoun without lexical constants', () => {
  const first = parseControlledQuantifiedEnglish(
    'If and only if Nira catalogs a glimmer, she inspects it.', nonceOptions(),
  );
  const renamed = parseControlledQuantifiedEnglish(
    'If and only if Tavra zorples a quarn, she traces it.', nonceOptions(true),
  );
  assert.equal(first.status, 'PARSED');
  assert.equal(renamed.status, 'PARSED');
  assert.deepEqual(formulaShape(first.formula), formulaShape(renamed.formula));
  assert.deepEqual(formulaShape(first.formula), [
    'forall', ['iff', ['and', ['predicate', 1], ['predicate', 2]], ['predicate', 2]],
  ]);
  const implication = parseControlledQuantifiedEnglish(
    'If Nira catalogs a glimmer, then she inspects it.', nonceOptions(),
  );
  assert.equal(implication.status, 'PARSED');
  assert.notDeepEqual(canonicalFormula(first.formula), canonicalFormula(implication.formula));
});

test('generic quantified-language module contains no benchmark or source dispatch', async () => {
  const source = await readFile(join(PROJECT_ROOT, 'src/language/quantified-english.mjs'), 'utf8');
  assert.doesNotMatch(source, /folio|benchmark|dataset|story[_ -]?id|example[_ -]?id|expected[_ -]?label/iu);
  assert.doesNotMatch(source, /Yale|WikiLogic|HybLogic|bonnie|james|monkeypox/iu);
});
