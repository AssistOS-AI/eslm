import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  approximateControlledEnglish,
  compareHeuristicCnlProtection,
  HEURISTIC_CNL_PROTOCOL,
} from '../src/language/heuristic-cnl-approximation.mjs';
import {
  baseThirdPersonSingular, thirdPersonSingular,
} from '../src/language/heuristic-cnl-morphology.mjs';
import { PROJECT_ROOT } from '../src/paths.mjs';

function acceptedFamily(result, family) {
  return result.receipt.proposalReceipts.find((receipt) => receipt.family === family && receipt.accepted);
}

function familyReceipt(result, family) {
  return result.receipt.familyReceipts.find((receipt) => receipt.family === family);
}

test('bounded heuristic ensemble repairs a near-CNL episode without answering or consulting knowledge', () => {
  const result = approximateControlledEnglish(
    'Abura is an mura. All mura et bana. Is Abura eating bana?',
  );
  assert.equal(result.protocol, HEURISTIC_CNL_PROTOCOL);
  assert.equal(result.status, 'CANDIDATES');
  assert.equal(result.recommendedCandidate.text,
    'Abura is a mura. Every mura eats bana. Does Abura eat bana?');
  assert.equal(result.recommendedCandidate.authority, 'surface-approximation-only');
  assert.equal(result.recommendedCandidate.requiresSymbolicReparse, true);
  assert.equal(result.recommendedCandidate.confidenceBand, 'medium');
  assert.ok(result.recommendedCandidate.uncertainties.some((item) => item.includes('predicate lemma')));
  assert.ok(result.recommendedCandidate.edits.every((edit) => edit.votes.length >= 1));
  assert.ok(result.receipt.consensusRejectedEdits.some((item) =>
    item.edit.replacement === 'eat' && item.winningEdit.replacement === 'eats'));
  assert.deepEqual({
    answerProduced: result.receipt.answerProduced,
    kbConsulted: result.receipt.kbConsulted,
    sessionMutated: result.receipt.sessionMutated,
  }, { answerProduced: false, kbConsulted: false, sessionMutated: false });
  assert.equal(Object.isFrozen(result), true);
});

test('predicate repair survives complete nonce renaming and independent statement reordering', () => {
  const first = approximateControlledEnglish(
    'Tavra is an qerin. All qerin blim navox. Is Tavra blimming navox?',
  );
  assert.equal(first.recommendedCandidate.text,
    'Tavra is a qerin. Every qerin blims navox. Does Tavra blim navox?');
  const reordered = approximateControlledEnglish(
    'All qerin blim navox. Tavra is an qerin. Is Tavra blimming navox?',
  );
  assert.equal(reordered.recommendedCandidate.text,
    'Every qerin blims navox. Tavra is a qerin. Does Tavra blim navox?');
  assert.deepEqual(first.recommendedCandidate.supportingFamilies,
    reordered.recommendedCandidate.supportingFamilies);
});

test('third-person morphology round-trips sibilants, y endings, and nonce predicates', () => {
  for (const lemma of ['fix', 'watch', 'pass', 'buzz', 'carry', 'glim', 'go', 'do', 'have']) {
    assert.equal(baseThirdPersonSingular(thirdPersonSingular(lemma)), lemma, lemma);
  }
});

test('a well-formed but different predicate is not overwritten by an edit-near question predicate', () => {
  const result = approximateControlledEnglish(
    'Tavra is a qerin. Every qerin glips navox. Is Tavra glopping navox?',
  );
  assert.ok(result.candidates.length > 0);
  assert.ok(result.candidates.every((candidate) => candidate.text.includes('Every qerin glips navox.')));
  assert.equal(result.receipt.proposalReceipts.some((receipt) =>
    receipt.edits.some((edit) => edit.original === 'glips')), false);
});

test('protected quantifier, polarity, relation direction, and temporal direction changes fail the safety gate', () => {
  const contrasts = [
    ['Every zorb is calm.', 'Some zorb is calm.'],
    ['Nira is not calm.', 'Nira is calm.'],
    ['Nira is left of Odo.', 'Nira is right of Odo.'],
    ['Nira rests before Odo.', 'Nira rests after Odo.'],
  ];
  for (const [source, changed] of contrasts) {
    const comparison = compareHeuristicCnlProtection(source, changed);
    assert.equal(comparison.preserved, false, `${source} -> ${changed}`);
    assert.ok(comparison.differences.length > 0);
  }
});

test('copula, auxiliary, article, and sentence-boundary families compose without hidden content changes', () => {
  const omitted = approximateControlledEnglish('Tavra an qerin. Tavra calm?');
  assert.equal(omitted.recommendedCandidate.text, 'Tavra is a qerin. Is Tavra calm?');
  assert.ok(omitted.recommendedCandidate.supportingFamilies.includes('copula-and-auxiliary-insertion'));
  const segmented = approximateControlledEnglish('Tavra is a qerin; Is Tavra calm?');
  assert.equal(segmented.recommendedCandidate.text, 'Tavra is a qerin. Is Tavra calm?');
  assert.ok(segmented.recommendedCandidate.supportingFamilies.includes('sentence-segmentation'));
});

test('complex decomposition families produce bounded positive candidates with visible penalties', async (context) => {
  const cases = [
    ['coordination', 'Nira is calm and Odo is bright.', 'independent-clause-coordination',
      'Nira is calm. Odo is bright.'],
    ['ellipsis', 'Nira is calm and bright.', 'local-parallel-ellipsis',
      'Nira is calm. Nira is bright.'],
    ['relative', 'Nira, who is calm, enters vault.', 'relative-clause-extraction',
      'Nira is calm. Nira enters vault.'],
    ['apposition', 'Nira, a qerin, enters vault.', 'apposition-expansion',
      'Nira is a qerin. Nira enters vault.'],
    ['passive', 'The orb was glorped by Tavra.', 'explicit-passive-to-active',
      'Tavra glorped the orb.'],
    ['conditional', 'If Nira is calm, then Odo waits.', 'conditional-punctuation-normalization',
      'If Nira is calm then Odo waits.'],
    ['temporal', 'Before Nira enters vault, Odo leaves hall.', 'temporal-clause-normalization',
      'Odo leaves hall before Nira enters vault.'],
    ['causal', 'Because Nira is calm, Odo waits.', 'causal-clause-normalization',
      'Odo waits because Nira is calm.'],
    ['request', 'Could you tell me whether Nira eats quartz?', 'request-envelope-stripping',
      'Does Nira eat quartz?'],
    ['WH nominalization', 'What is the color of Nira?', 'wh-nominalization-reduction',
      'What color is Nira?'],
    ['parenthetical', 'Nira (for reference) is calm.', 'nonsemantic-parenthetical-removal',
      'Nira is calm.'],
    ['duplicate filler', 'Well, actually, Nira is calm.', 'discourse-filler-removal',
      'Nira is calm.'],
    ['reference', 'The robot entered vault. It rested.', 'unique-local-reference-substitution',
      'The robot entered vault. The robot rested.'],
    ['ordering', 'Is Nira calm? Nira is a qerin. Every qerin is calm.', 'question-last-reordering',
      'Nira is a qerin. Every qerin is calm. Is Nira calm?'],
  ];
  for (const [label, source, family, expected] of cases) {
    await context.test(label, () => {
      const result = approximateControlledEnglish(source);
      const receipt = acceptedFamily(result, family);
      assert.ok(receipt, `${family} did not emit an accepted proposal`);
      assert.equal(receipt.candidateText, expected);
      assert.ok(receipt.penalty >= 0 && receipt.penalty <= 1);
      assert.ok(receipt.evidence.length > 0);
      assert.equal(receipt.protection.preserved, true);
    });
  }
});

test('nominalized embedded question receives two independent votes for the same candidate', () => {
  const result = approximateControlledEnglish('The question is whether Nira eats quartz.');
  assert.equal(result.recommendedCandidate.text, 'Does Nira eat quartz?');
  assert.deepEqual(result.recommendedCandidate.supportingFamilies, [
    'embedded-polar-question',
    'nominalized-request-simplification',
  ]);
  assert.equal(result.recommendedCandidate.edits[0].votes.length, 2);
  assert.ok(result.recommendedCandidate.semanticRiskPenalty > 0);
});

test('unsafe or structurally unsupported decompositions emit declined family receipts', async (context) => {
  const cases = [
    ['coordination scope', 'Nira is not calm and bright.', 'independent-clause-coordination'],
    ['ellipsis scope', 'Nira is not calm and bright.', 'local-parallel-ellipsis'],
    ['restrictive relative', 'Every qerin who is calm enters vault.', 'relative-clause-extraction'],
    ['unbounded apposition', 'Nira who is a qerin enters vault.', 'apposition-expansion'],
    ['negated passive', 'The orb was not glorped by Tavra.', 'explicit-passive-to-active'],
    ['implicit conditional', 'If Nira is calm, Odo waits.', 'conditional-punctuation-normalization'],
    ['nested temporal', 'Before Nira enters vault, Odo waits, Tavra leaves.', 'temporal-clause-normalization'],
    ['nested causal', 'Because Nira is calm, Odo waits, Tavra leaves.', 'causal-clause-normalization'],
    ['unsupported request', 'Could you explain why Nira waits?', 'request-envelope-stripping'],
    ['content parenthetical', 'Nira (not calm) waits.', 'nonsemantic-parenthetical-removal'],
    ['competing reference', 'The robot met a drone. It rested.', 'unique-local-reference-substitution'],
    ['temporal reorder', 'Is Nira ready? Before Odo leaves, Nira waits.', 'question-last-reordering'],
  ];
  for (const [label, source, family] of cases) {
    await context.test(label, () => {
      const result = approximateControlledEnglish(source);
      assert.equal(acceptedFamily(result, family), undefined);
      const receipt = familyReceipt(result, family);
      assert.ok(receipt, `${family} receipt is missing`);
      assert.equal(receipt.declined, true);
      assert.equal(typeof receipt.declineReason, 'string');
      assert.ok(receipt.declineReason.length > 10);
    });
  }
});

test('temporal, causal, conditional, and negative controls retain their visible operators', () => {
  const before = approximateControlledEnglish('Before Nira enters vault, Odo leaves hall.');
  assert.match(before.recommendedCandidate.text, /\bbefore\b/u);
  assert.doesNotMatch(before.recommendedCandidate.text, /\bafter\b/u);
  const because = approximateControlledEnglish('Because Nira is calm, Odo waits.');
  assert.match(because.recommendedCandidate.text, /\bbecause\b/u);
  const conditional = approximateControlledEnglish('If Nira is calm, then Odo waits.');
  assert.match(conditional.recommendedCandidate.text, /^If\b.*\bthen\b/u);
  const negated = approximateControlledEnglish('Nira is not calm and bright.');
  assert.ok(negated.candidates.every((candidate) => candidate.text.includes('not')));
});

test('every complex technique reports a bounded declined reason even on opaque input', () => {
  const result = approximateControlledEnglish('Opaque fragment.');
  const expected = [
    'independent-clause-coordination', 'local-parallel-ellipsis', 'request-envelope-stripping',
    'embedded-polar-question', 'nominalized-request-simplification', 'relative-clause-extraction',
    'apposition-expansion', 'temporal-clause-normalization', 'causal-clause-normalization',
    'conditional-punctuation-normalization', 'explicit-passive-to-active',
    'nonsemantic-parenthetical-removal', 'discourse-filler-removal', 'wh-nominalization-reduction',
    'unique-local-reference-substitution', 'question-last-reordering',
  ];
  for (const family of expected) {
    const receipt = familyReceipt(result, family);
    assert.ok(receipt, family);
    assert.equal(receipt.declined, true, family);
    assert.equal(typeof receipt.declineReason, 'string', family);
  }
});

test('work is deterministic, deeply frozen, and stopped by explicit byte, token, and candidate limits', () => {
  const source = 'Tavra is an qerin. All qerin blim navox. Is Tavra blimming navox?';
  assert.deepEqual(approximateControlledEnglish(source), approximateControlledEnglish(source));
  const tokenLimited = approximateControlledEnglish(source, { limits: { maximumTokens: 4 } });
  assert.equal(tokenLimited.status, 'RESOURCE_LIMIT');
  assert.equal(tokenLimited.receipt.exhaustedResource, 'maximumTokens');
  assert.deepEqual(tokenLimited.candidates, []);
  const bounded = approximateControlledEnglish(source, {
    limits: { maximumCandidates: 1, maximumProposals: 3, maximumEditDistanceEvaluations: 64 },
  });
  assert.ok(bounded.candidates.length <= 1);
  assert.ok(bounded.receipt.observed.proposals <= 3);
  assert.ok(bounded.receipt.observed.editDistanceEvaluations <= 64);
  assert.equal(Object.isFrozen(bounded.receipt), true);
  const exhaustiveProfileCompatible = approximateControlledEnglish(source, {
    limits: { maximumTokens: 4_096, maximumSentences: 128, maximumCandidates: 128 },
  });
  assert.equal(exhaustiveProfileCompatible.status, 'CANDIDATES');
  assert.throws(() => approximateControlledEnglish(source, { limits: { maximumCandidates: 0 } }), RangeError);
  assert.throws(() => approximateControlledEnglish(source, {
    limits: { maximumCandidates: 257 },
  }), RangeError);
  assert.throws(() => approximateControlledEnglish(source, { unexpected: true }), TypeError);
});

test('large decomposition receipts remain byte-bounded without quadratic vote evidence', () => {
  const source = `${Array.from({ length: 128 }, (_, index) => `N${index} a zoral`).join('; ')}.`;
  const maximumReceiptBytes = 1024 * 1024;
  const result = approximateControlledEnglish(source, {
    limits: {
      maximumTokens: 4_096,
      maximumSentences: 128,
      maximumProposals: 1_024,
      maximumCandidates: 128,
      maximumEditDistanceEvaluations: 131_072,
      maximumReceiptBytes,
    },
  });
  assert.ok(Buffer.byteLength(JSON.stringify(result), 'utf8') <= maximumReceiptBytes);
  assert.equal(result.status, 'RESOURCE_LIMIT');
  assert.equal(result.receipt.exhaustedResource, 'maximumReceiptBytes');
  assert.ok(result.receipt.observed.receiptBytes > maximumReceiptBytes);

  const ordinary = approximateControlledEnglish('Nira a zoral.');
  assert.ok(ordinary.recommendedCandidate.edits[0].votes.every((vote) =>
    typeof vote.proposalReceiptId === 'string' && vote.evidence === undefined));
  assert.ok(ordinary.receipt.proposalReceipts.some((receipt) => receipt.evidence.length > 0));
});

test('heuristic core passes forbidden-dispatch and deployed-boundary audit', async () => {
  const files = [
    'heuristic-cnl-approximation.mjs',
    'heuristic-cnl-contract.mjs',
    'heuristic-cnl-decomposition.mjs',
    'heuristic-cnl-families.mjs',
    'heuristic-cnl-morphology.mjs',
    'heuristic-cnl-protection.mjs',
    'heuristic-cnl-surface.mjs',
  ];
  const text = (await Promise.all(files.map((file) =>
    readFile(join(PROJECT_ROOT, 'src/language', file), 'utf8')))).join('\n');
  assert.doesNotMatch(text, /\b(?:Abura|mura|bana|Tavra|Nira|benchmark|dataset|rowId|expectedAnswer)\b/iu);
  assert.doesNotMatch(text, /(?:node:child_process|node:http|node:https|\.\.\/kb\/|\.\.\/runtime\/)/u);
  assert.doesNotMatch(text, /(?:eval\s*\(|new\s+Function\s*\()/u);
});
