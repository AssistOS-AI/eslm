import test from 'node:test';
import assert from 'node:assert/strict';
import { EslmEngine } from '../src/runtime/engine.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';
import { EslmRuntime } from '../src/runtime/runtime.mjs';
import { HeuristicLanguageRuntime } from '../src/runtime/heuristic-language-runtime.mjs';
import { REGRESSION_SMOKE_SEED } from '../src/conversation-smoke.mjs';
import { BASIC_EVAL_SMOKE_SEED, loadBasicEvalCases } from '../src/evaluation/basic-eval-catalog.mjs';
import {
  interactiveBasicEvalSmoke, interactiveCountAndSeed, interactiveExamplePage, interactiveExamples,
  interactiveFailureText, interactiveResultText, interactiveSmoke, traceText,
} from '../src/interface/interactive-presenter.mjs';

const style = Object.freeze({
  blue: String, bold: String, dim: String, gray: String, green: String, magenta: String, red: String,
  yellow: String, status: (_status, text) => text ?? _status,
});

test('related KB records stay in trace and do not overwhelm the conversational answer', () => {
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
  assert.match(output, /request was understood, but no answer was established/u);
  assert.match(output, /\nAnswer\nI cannot establish the requested answer\./u);
  assert.doesNotMatch(output, /Qorin is a tool|nonce-kb|lookup-budget/u);

  const trace = traceText({
    status: 'UNKNOWN', reasoning: { method: 'epistemic-abstention' }, provenance: [], grounding,
  }, style);
  assert.match(trace, /No source facts were used/u);
  assert.match(trace, /Separate related-evidence search/u);
  assert.match(trace, /Related records were not used as answer premises/u);
});

test('examples uses deterministic 24-case pages from Basic Eval and its structural controls', async () => {
  assert.deepEqual(interactiveCountAndSeed('', 4096), {
    count: 4096, seed: REGRESSION_SMOKE_SEED,
  });
  assert.deepEqual(interactiveExamplePage(''), {
    page: 1, seed: BASIC_EVAL_SMOKE_SEED, pageCount: 43,
  });
  assert.deepEqual(interactiveExamplePage('2 review-seed'), {
    page: 2, seed: 'review-seed', pageCount: 43,
  });
  const first = await interactiveExamples(style, 'review-seed', 1);
  const second = await interactiveExamples(style, 'review-seed', 2);
  assert.match(first, /Page: 1 of 43/u);
  assert.match(second, /Page: 2 of 43/u);
  assert.equal((first.match(/Case: /gu) ?? []).length, 24);
  assert.equal((second.match(/Case: /gu) ?? []).length, 24);
  assert.match(first, /1,010 questions and controls/u);
  assert.match(first, /1,000 development-visible English projections/u);
  assert.match(first, /\[exact contract\]/u);
  assert.match(first, /\[semantic review\]/u);
  assert.notEqual(first, second);
});

test('Basic Eval smoke scores source cases locally and keeps semantic results in review', async () => {
  const cases = await loadBasicEvalCases();
  const references = new Map(cases.map((item) => [item.prompt, item.reference.answer]));
  const engine = { ask: async (prompt) => ({
    status: 'SOLVED', answer: references.get(prompt), languageRoute: 'test-local', taskFrame: {},
  }) };
  const output = await interactiveBasicEvalSmoke({
    'core-only': engine, 'quick-assisted': engine, 'real-kb': engine,
  },
    style, 'review-seed', 24);
  assert.match(output, /Basic Eval smoke — 24 cases and controls/u);
  assert.match(output, /Language Agent off/u);
  assert.match(output, /0 fail/u);
  assert.match(output, /review/u);
  assert.match(output, /development-visible English conversions/u);
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

test('a short symbolic value retains the standard operational processing panel', () => {
  const output = interactiveResultText({
    status: 'SOLVED', answer: 'northwest', languageRoute: 'direct-symbolic-task-adapter',
    values: ['northwest'], provenance: [], usedKbVersions: [],
    reasoning: { method: 'qualitative-spatial-relation' },
  }, 'Where is A relative to B?', style);
  assert.match(output, /^Thinking · symbolic processing/mu);
  assert.match(output, /direct local task adapter/u);
  assert.match(output, /qualitative-spatial-relation/u);
  assert.match(output, /\nAnswer\nNorthwest\./u);
});

test('a bounded operation result exposes its method in both the standard panel and trace', () => {
  const result = {
    status: 'SOLVED', answer: '51', languageRoute: 'bounded-operation-executed',
    values: [51], provenance: [{ method: 'verified-scalar-operation' }], usedKbVersions: [],
    reasoning: { method: 'verified-scalar-operation', witness: { result: 51 } },
  };
  const output = interactiveResultText(result, 'What is 17% of 300?', style);
  assert.match(output, /^Thinking · symbolic processing/mu);
  assert.match(output, /verified bounded operation/u);
  assert.match(output, /\nAnswer\n51$/u);
  assert.match(traceText(result, style), /verified-scalar-operation/u);
});

test('interactive validation failures are humanized and keep the session usable', () => {
  const output = interactiveFailureText(
    new TypeError('Unattempted normalization triggerStatus must match the direct result status.'), style,
  );
  assert.match(output, /^Thinking · symbolic processing/mu);
  assert.match(output, /language-route receipt disagreed/u);
  assert.match(output, /Session state: unchanged/u);
  assert.match(output, /session is still active/u);
  assert.doesNotMatch(output, /Unattempted normalization triggerStatus/u);
});

test('local UNPARSED results recommend Language Agent help without invoking it', () => {
  const text = interactiveResultText({
    status: 'UNPARSED', languageRoute: 'direct-symbolic',
    answer: 'I could not represent the request.', provenance: [], usedKbVersions: [],
  }, 'Please untangle this construction.', style);
  assert.match(text, /Optional language help/u);
  assert.match(text, /\/normalize on/u);
  assert.match(text, /external disclosure is acceptable/u);
  assert.doesNotMatch(text, /Language Agent .*proposal/u);
});

test('defeasible answers show their confidence grade and assumption in the processing panel', () => {
  const text = interactiveResultText({
    status: 'DEFEASIBLE', languageRoute: 'direct-symbolic',
    answer: 'Probably Orun (confidence 0.62).', values: ['orun'], provenance: [], usedKbVersions: [],
    reasoning: {
      method: 'finite-episodic-world', confidence: 0.62,
      assumption: 'The possessed entity normally shares the current location of its owner.',
    },
  }, 'Where is the possessed object living?', style);
  assert.match(text, /Confidence: 0\.620/u);
  assert.match(text, /Assumption: The possessed entity normally shares/u);
  assert.match(text, /\nAnswer\nProbably Orun \(confidence 0\.62\)\./u);
});

test('skipped language assistance is described as unnecessary rather than unattempted', () => {
  const output = interactiveResultText({
    status: 'UNKNOWN', languageRoute: 'direct-symbolic',
    answer: 'The local knowledge bases do not establish an answer.',
    normalization: { attempted: false, triggerStatus: 'UNKNOWN' },
    provenance: [], usedKbVersions: [],
  }, 'Where do zorals live?', style);
  assert.match(output, /External language assistance: not needed/u);
  assert.match(output, /reached UNKNOWN before optional context construction/u);
  assert.doesNotMatch(output, /unattempted/iu);
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
