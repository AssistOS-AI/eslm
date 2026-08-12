import test from 'node:test';
import assert from 'node:assert/strict';
import { EslmEngine } from '../src/runtime/engine.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';
import {
  interactiveExamplePage, interactiveExamples, interactiveResultText, interactiveSmoke, traceText,
} from '../src/interface/interactive-presenter.mjs';

const style = Object.freeze({
  blue: String, bold: String, dim: String, green: String, magenta: String, red: String,
  yellow: String, status: (_status, text) => text ?? _status,
});

test('related KB records render below an explicit not-an-answer boundary', () => {
  const grounding = {
    status: 'RELATED_EVIDENCE_FOUND',
    search: { complete: false, receipts: [{
      kbId: 'nonce-kb', kbVersion: '3', status: 'matches-found', coverage: 'exact-postings',
      truncationReasons: ['lookup-budget'],
    }] },
    entries: [{ kbId: 'nonce-kb', kbVersion: '3', statement: 'Qorin is a tool.' }],
  };
  const output = interactiveResultText({
    status: 'UNKNOWN', answer: 'I cannot establish the requested answer.', grounding,
  }, 'Can Qorin fly?', style);
  assert.match(output, /^\[UNKNOWN\] I cannot establish/u);
  assert.match(output, /Related KB evidence — not an answer/u);
  assert.match(output, /Qorin is a tool\. \[nonce-kb@3\]/u);
  assert.match(output, /Search coverage is incomplete: lookup-budget/u);

  const trace = traceText({
    status: 'UNKNOWN', reasoning: { method: 'epistemic-abstention' }, provenance: [], grounding,
  }, style);
  assert.match(trace, /No source facts were used/u);
  assert.match(trace, /Separate related-evidence search/u);
  assert.match(trace, /Related records were not used as answer premises/u);
});

test('examples uses deterministic 24-case pages from the executable smoke catalog', () => {
  assert.deepEqual(interactiveExamplePage('2 review-seed'), {
    page: 2, seed: 'review-seed', pageCount: 171,
  });
  const first = interactiveExamples(style, 'review-seed', 1);
  const second = interactiveExamples(style, 'review-seed', 2);
  assert.match(first, /Page: 1 of 171/u);
  assert.match(second, /Page: 2 of 171/u);
  assert.equal((first.match(/Template:/gu) ?? []).length, 24);
  assert.equal((second.match(/Template:/gu) ?? []).length, 24);
  assert.notEqual(first, second);
});

test('smoke output displays representative input, expected contract, and actual runtime response', async () => {
  const engine = new EslmEngine(await createCoreModel());
  const output = await interactiveSmoke(engine, [], style, 'review-seed', 24);
  assert.match(output, /Input:/u);
  assert.match(output, /Expected:/u);
  assert.match(output, /Actual:/u);
  assert.match(output, /24 passed, 0 failed, 0 skipped/u);
  assert.equal((output.match(/^PASS \[/gmu) ?? []).length, 24);
});

test('accepted Language Agent normalization is shown as original, transformation, and symbolic result', () => {
  const output = interactiveResultText({
    status: 'SOLVED', answer: 'I am ready.', languageRoute: 'language-agent-normalized',
    normalization: {
      cacheHit: false,
      candidate: { operation: 'translation', normalizedEnglish: 'How are you?' },
    },
  }, 'Ce mai faci?', style);
  assert.match(output, /Original: Ce mai faci\?/u);
  assert.match(output, /Translation: How are you\?/u);
  assert.match(output, /Symbolic result: \[SOLVED\] I am ready\./u);
});

test('accepted local approximation shows selected CNL, confidence votes, and ephemeral effects', () => {
  const result = {
    status: 'DEFEASIBLE', answer: 'Yes.', languageRoute: 'heuristic-cnl-approximated',
    approximation: {
      selectedCandidate: {
        text: 'Tarin is a zoral. Every zoral glims vepa. Does Tarin glim vepa?',
        confidence: 0.81, confidenceBand: 'medium',
        supportingFamilies: ['predicate-agreement', 'question-reduction'],
      },
    },
  };
  const output = interactiveResultText(result,
    'Tarin is an zoral. All zoral gim vepa. Is Tarin gliming vepa?', style);
  assert.match(output, /Local heuristic interpretation accepted — no Language Agent/u);
  assert.match(output, /Interpreted CNL: Tarin is a zoral/u);
  assert.match(output, /Confidence: 0\.810 \(medium\)/u);
  assert.match(output, /predicate-agreement, question-reduction/u);
  assert.match(output, /query-local and discarded/u);
  assert.match(output, /Symbolic result: \[DEFEASIBLE\] Yes\./u);
});

test('request synthesis shows intent, bounded subrequests, output shape, and evidence policy', () => {
  const output = interactiveResultText({
    status: 'PARTIAL', languageRoute: 'heuristic-request-synthesis',
    answer: '# Report: zorals\n\n- A zoral is a mineral. [nonce@1; r1]',
    requestPlanning: { selectedPlan: {
      operations: ['compose'], confidence: 0.91, confidenceBand: 'high',
      subrequests: [{}, {}, {}],
      outputContract: { length: 'brief', artifact: 'report', format: 'sections' },
    } },
  }, 'Write a short report about zorals.', style);
  assert.match(output, /Local request plan accepted/u);
  assert.match(output, /Intent: compose; 3 bounded subrequests/u);
  assert.match(output, /brief report, sections/u);
  assert.match(output, /related KB records are not upgraded to proof/u);
  assert.match(output, /\[PARTIAL\]/u);
});
