import test from 'node:test';
import assert from 'node:assert/strict';
import { EslmEngine } from '../src/runtime/engine.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';
import { EslmRuntime } from '../src/runtime/runtime.mjs';
import { HeuristicLanguageRuntime } from '../src/runtime/heuristic-language-runtime.mjs';
import { REGRESSION_SMOKE_SEED } from '../src/conversation-smoke.mjs';
import {
  interactiveCountAndSeed, interactiveExamplePage, interactiveExamples, interactiveResultText,
  interactiveSmoke, traceText,
} from '../src/interface/interactive-presenter.mjs';

const style = Object.freeze({
  blue: String, bold: String, dim: String, gray: String, green: String, magenta: String, red: String,
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
  assert.match(output, /^Thinking · symbolic processing/mu);
  assert.match(output, /Route: direct-symbolic; status UNKNOWN/u);
  assert.match(output, /\nAnswer\nI cannot establish the requested answer\./u);
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
  assert.deepEqual(interactiveCountAndSeed('', 4096), {
    count: 4096, seed: REGRESSION_SMOKE_SEED,
  });
  assert.deepEqual(interactiveExamplePage(''), {
    page: 1, seed: REGRESSION_SMOKE_SEED, pageCount: 171,
  });
  assert.deepEqual(interactiveExamplePage('2 review-seed'), {
    page: 2, seed: 'review-seed', pageCount: 171,
  });
  const first = interactiveExamples(style, 'review-seed', 1);
  const second = interactiveExamples(style, 'review-seed', 2);
  assert.match(first, /Page: 1 of 171/u);
  assert.match(second, /Page: 2 of 171/u);
  assert.equal((first.match(/Template:/gu) ?? []).length, 24);
  assert.equal((second.match(/Template:/gu) ?? []).length, 24);
  assert.match(first, /1,200 heuristic-language cases plus 2,896 core regressions/u);
  for (const level of [
    'answer-execution', 'candidate-selection', 'proposal-only', 'query-local-decomposition',
    'request-execution', 'request-planning', 'safety-abstention', 'semantic-query-execution',
  ]) assert.match(first, new RegExp(`\\[${level}\\]`, 'u'));
  assert.match(first, /categorical-subalternation/u);
  assert.match(first, /boolean-entailment-chain/u);
  assert.notEqual(first, second);
});

test('smoke output displays representative input, expected contract, and actual runtime response', async () => {
  const engine = new HeuristicLanguageRuntime(new EslmRuntime(
    new EslmEngine(await createCoreModel()),
  ));
  const output = await interactiveSmoke(engine, [], style, 'review-seed', 24);
  assert.match(output, /Input:/u);
  assert.match(output, /Expected:/u);
  assert.match(output, /Actual:/u);
  assert.match(output, /24 passed, 0 failed, 0 skipped/u);
  assert.match(output, /Contract levels:/u);
  assert.match(output, /Observed routes:/u);
  assert.match(output, /Observed statuses:/u);
  assert.equal((output.match(/^PASS \[/gmu) ?? []).length, 24);
});

test('accepted Language Agent simplification is shown as original, transformation, and symbolic result', () => {
  const output = interactiveResultText({
    status: 'SOLVED', answer: 'I am ready.', languageRoute: 'language-agent-normalized',
    normalization: {
      cacheHit: false,
      candidate: { operation: 'simplification', normalizedEnglish: 'How are you?' },
    },
  }, 'How are you doing?', style);
  assert.match(output, /Original: How are you doing\?/u);
  assert.match(output, /Simplification: How are you\?/u);
  assert.match(output, /symbolic status SOLVED/u);
  assert.match(output, /\nAnswer\nI am ready\./u);
});

test('English language rejection is visible and states the untouched boundaries', () => {
  const output = interactiveResultText({
    status: 'UNPARSED', languageRoute: 'english-language-gate-rejected',
    languageAssessment: {
      classification: 'likely-non-english', confidence: 0.81, threshold: 0.68,
      diagnostic: 'Bounded generic script evidence is unlikely to be English.',
    },
  }, 'Жарум кивес Нолта?', style);
  assert.match(output, /English language gate:/u);
  assert.match(output, /Confidence 0\.810 at threshold 0\.680/u);
  assert.match(output, /Translate the request to English/u);
  assert.match(output, /no parser, heuristic interpretation, KB lookup, or session update ran/iu);
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
  assert.match(output, /Language route: local heuristic interpretation; no Language Agent/u);
  assert.match(output, /Interpreted CNL: Tarin is a zoral/u);
  assert.match(output, /Confidence: 0\.810 \(medium\)/u);
  assert.match(output, /predicate-agreement, question-reduction/u);
  assert.match(output, /query-local and discarded/u);
  assert.match(output, /status DEFEASIBLE/u);
  assert.match(output, /\nAnswer\nYes\./u);
});

test('a short symbolic value is realized as an English sentence in the interactive answer', () => {
  const output = interactiveResultText({
    status: 'SOLVED', answer: 'northwest', languageRoute: 'direct-symbolic-task-adapter',
    values: ['northwest'], provenance: [], usedKbVersions: [],
    reasoning: { method: 'qualitative-spatial-relation' },
  }, 'Where is A relative to B?', style);
  assert.match(output, /Method: qualitative-spatial-relation/u);
  assert.match(output, /\nAnswer\nThe symbolic result is “northwest”\./u);
});

test('request synthesis separates a symbolic processing trace from the coherent answer', () => {
  const output = interactiveResultText({
    status: 'PARTIAL', languageRoute: 'heuristic-request-synthesis',
    answer: '# Report: zorals\n\n- A zoral is a mineral. [nonce@1; r1]',
    requestPlanning: { selectedPlan: {
      operations: ['compose'], confidence: 0.91, confidenceBand: 'high',
      subrequests: [{}, {}, {}],
      outputContract: { length: 'brief', artifact: 'report', format: 'sections' },
    } },
    synthesis: { realization: {
      coverage: { evidenceRealized: 1, evidenceRejected: 2 }, confidence: 0.82,
      strategyTrace: [
        'strategy:result:rhetorical-section-planner@1',
        'strategy:result:lexical-definition-sentence@1',
        'strategy:result:sectioned-document-assembly@1',
      ],
    } },
  }, 'Write a short report about zorals.', style);
  assert.match(output, /^Thinking · symbolic processing/mu);
  assert.match(output, /Request plan coordinator: compose; 3 bounded subrequests/u);
  assert.match(output, /Output contract: brief report, sections/u);
  assert.match(output, /Evidence admission: 1 KB claim\(s\) realized; 2 related claim\(s\) withheld/u);
  assert.match(output, /Result construction coordinator → Claim admission gate → Rhetorical plan builder/u);
  assert.match(output, /Sentence realization coordinator → Document assembly coordinator → Result schema gate/u);
  assert.match(output, /Selected strategies:/u);
  assert.match(output, /rhetorical-section-planner → lexical-definition-sentence/u);
  assert.match(output, /Authority boundary: citations support wording/u);
  assert.match(output, /\nAnswer\n# Report: zorals/u);
  assert.doesNotMatch(output.slice(output.indexOf('\nAnswer\n')), /PARTIAL/u);
});
