import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  canonicalFormula,
  compileControlledFolSentence,
  controlledFolFormulasEquivalent,
  verifyControlledFolSymbolization,
} from '../src/language/controlled-fol-symbolizer.mjs';
import { parseCompactFolFormula } from '../src/language/compact-fol.mjs';

const lexicon = Object.freeze({
  predicates: Object.freeze([
    Object.freeze({ symbol: 'K', arity: 1, frame: '[1] is a narl' }),
    Object.freeze({ symbol: 'L', arity: 1, frame: '[1] is lucid' }),
    Object.freeze({ symbol: 'R', arity: 2, frame: '[1] vexed [2]' }),
  ]),
  constants: Object.freeze([
    Object.freeze({ symbol: 'c', surface: 'Tavra' }),
    Object.freeze({ symbol: 'e', surface: 'Vesko' }),
  ]),
});

test('controlled symbolization composes quantifiers, negation, and only-if with a replayable witness', () => {
  const input = Object.freeze({
    sentence: 'If not all narls vexed Tavra, then Vesko is lucid only if no narls vexed Vesko.',
    lexicon,
  });
  const result = compileControlledFolSentence(input);
  assert.equal(result.status, 'SOLVED');
  assert.equal(verifyControlledFolSymbolization(input, result), true);
  const expected = parseCompactFolFormula('(∃x(Kx∧¬Rxc)→(Le→¬∃x(Kx∧Rxe)))');
  assert.equal(controlledFolFormulasEquivalent(result.formula, expected), true);
});

test('full surface and identifier renaming plus lexicon reordering preserve typed structure', () => {
  const renamed = Object.freeze({
    predicates: Object.freeze([
      Object.freeze({ symbol: 'Rho', arity: 2, frame: '[1] zorpled [2]' }),
      Object.freeze({ symbol: 'Sigma', arity: 1, frame: '[1] is a quarn' }),
      Object.freeze({ symbol: 'Tau', arity: 1, frame: '[1] is vivid' }),
    ]),
    constants: Object.freeze([
      Object.freeze({ symbol: 'opal', surface: 'Neris' }),
      Object.freeze({ symbol: 'flint', surface: 'Odrin' }),
    ]),
  });
  const result = compileControlledFolSentence({
    sentence: 'If not all quarns zorpled Neris, then Odrin is vivid only if no quarns zorpled Odrin.',
    lexicon: renamed,
  });
  assert.equal(result.status, 'SOLVED');
  assert.match(canonicalFormula(result.formula), /Sigma/u);
  assert.doesNotMatch(canonicalFormula(result.formula), /p:"(?:K|L|R)"|Tavra|Vesko/u);
});

test('a meaning-changing conditional reversal changes the formula and a tampered witness is rejected', () => {
  const forwardInput = Object.freeze({ sentence: 'Every narl is lucid only if Tavra is lucid.', lexicon });
  const reverseInput = Object.freeze({ sentence: 'Tavra is lucid only if every narl is lucid.', lexicon });
  const forward = compileControlledFolSentence(forwardInput);
  const reverse = compileControlledFolSentence(reverseInput);
  assert.equal(forward.status, 'SOLVED');
  assert.equal(reverse.status, 'SOLVED');
  assert.equal(controlledFolFormulasEquivalent(forward.formula, reverse.formula), false);
  assert.equal(verifyControlledFolSymbolization(forwardInput, {
    ...forward,
    witness: { ...forward.witness, sourceSha256: '0'.repeat(64) },
  }), false);
});

test('the equivalence checker proves only declared alpha, Boolean, and safe quantifier rewrites', () => {
  const nestedExists = parseCompactFolFormula('∃x(Kx∧∃y(Ky∧Rxy))');
  const prenexExists = parseCompactFolFormula('∃x∃y((Kx∧Ky)∧Rxy)');
  const nestedForall = parseCompactFolFormula('∀x(Kx→∀y(Ky→Rxy))');
  const prenexForall = parseCompactFolFormula('∀x∀y((Kx∧Ky)→Rxy)');
  assert.equal(controlledFolFormulasEquivalent(nestedExists, prenexExists), true);
  assert.equal(controlledFolFormulasEquivalent(nestedForall, prenexForall), true);
  assert.equal(controlledFolFormulasEquivalent(parseCompactFolFormula('¬¬Kc'), parseCompactFolFormula('Kc')), true);
  assert.equal(controlledFolFormulasEquivalent(parseCompactFolFormula('∀x(Kx→Lx)'),
    parseCompactFolFormula('∀x(Lx→Kx)')), false);
});

test('opaque, ambiguous, and partially matched constructions abstain', () => {
  assert.equal(compileControlledFolSentence({ sentence: 'Tavra contemplated a hidden premise.', lexicon }).status,
    'UNPARSED');
  assert.equal(compileControlledFolSentence({ sentence: 'Every narl vexed somebody unspecified.', lexicon }).status,
    'UNPARSED');
  assert.equal(compileControlledFolSentence({ sentence: 'Tavra and Vesko are lucid.', lexicon }).status,
    'UNPARSED');
});

test('oversized sentences and lexicons return visible resource limits', () => {
  assert.equal(compileControlledFolSentence({ sentence: 'x'.repeat(4_097), lexicon }).status, 'RESOURCE_LIMIT');
  const predicates = Array.from({ length: 257 }, (_, index) => ({
    symbol: `predicate-${index}`, arity: 1, frame: `[1] is property-${index}`,
  }));
  assert.equal(compileControlledFolSentence({ sentence: 'Tavra is lucid.',
    lexicon: { predicates, constants: [] } }).status, 'RESOURCE_LIMIT');
});

test('generic symbolizer source contains no benchmark identity or answer-position dispatch', async () => {
  const source = await readFile(new URL('../src/language/controlled-fol-symbolizer.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /LogicSkills|dataset|benchmark|sourceId|answer(?:Index|Position)|choice\s*[1-6]/iu);
});
