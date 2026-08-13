import assert from 'node:assert/strict';
import test from 'node:test';
import { loadKnowledgeBase, mergeModels } from '../src/kbs.mjs';
import { EslmEngine } from '../src/runtime/engine.mjs';
import { HeuristicLanguageRuntime } from '../src/runtime/heuristic-language-runtime.mjs';
import { LanguageAgentAssistedRuntime } from '../src/runtime/language-agent-assisted-runtime.mjs';
import { EslmRuntime } from '../src/runtime/runtime.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';
import { RESULT_REALIZATION_STRATEGIES } from '../src/runtime/grounded-response-realization.mjs';
import { resolveWorkPolicy } from '../src/runtime/work-policy.mjs';

async function quickRuntime(profile = 'balanced') {
  const policy = resolveWorkPolicy(profile);
  const model = mergeModels(await createCoreModel(), [await loadKnowledgeBase('quick')]);
  const core = new EslmEngine(model, { workPolicy: policy });
  return new HeuristicLanguageRuntime(new EslmRuntime(core, [], ['quick'], undefined, policy));
}

function exactStrategyPolicy(stage, identities) {
  return {
    profile: 'balanced',
    strategies: { preset: 'all', selected: { [stage]: identities } },
  };
}

test('offline runtime repairs a near-CNL episode, votes visibly, and keeps interpretation defeasible', async () => {
  const runtime = await quickRuntime();
  const result = await runtime.ask(
    'Abura is an mura. All mura et bana. Is Abura eating bana?',
  );
  assert.equal(result.status, 'DEFEASIBLE');
  assert.equal(result.answer, 'Yes.');
  assert.equal(result.languageRoute, 'heuristic-cnl-approximated');
  assert.equal(result.approximation.selectedCandidate.text,
    'Abura is a mura. Every mura eats bana. Does Abura eat bana?');
  assert.equal(result.approximation.selectedCandidate.consensus, true);
  assert.deepEqual(result.approximation.selectedCandidate.supportingFamilies, [
    'determiner-agreement', 'predicate-agreement', 'progressive-question-reduction',
    'quantifier-canonicalization',
  ]);
  assert.ok(result.approximation.selectedCandidate.edits.every((edit) => edit.votes.length > 0));
  assert.equal(result.approximation.ephemeralPremises.committed, false);
  assert.equal(result.context.session.facts.length, 0);
  assert.equal(result.context.session.rules.length, 0);
  assert.deepEqual(result.learned, []);
  assert.deepEqual(result.learnedRules, []);
});

test('progressive reduction uses the aligned class rule instead of guessing a silent-e lemma', async () => {
  for (const [article, className, finite, progressive, lemma, object] of [
    ['a', 'grower', 'waters', 'watering', 'water', 'crop'],
    ['an', 'assembler', 'fixes', 'fixing', 'fix', 'module'],
    ['a', 'carrier', 'moves', 'moving', 'move', 'parcel'],
  ]) {
    const input = `Tavra is ${article} ${className}. Every ${className} ${finite} ${object}. `
      + `Is Tavra ${progressive} ${object}?`;
    const result = await (await quickRuntime()).ask(input, {}, { grounding: false });
    assert.equal(result.status, 'DEFEASIBLE', input);
    assert.equal(result.answer, 'Yes.', input);
    assert.equal(result.query.predicate, lemma, input);
    assert.equal(result.approximation.selectedCandidate.text,
      `Tavra is ${article} ${className}. Every ${className} ${finite} ${object}. `
        + `Does Tavra ${lemma} ${object}?`, input);
  }
});

test('multi-family spelling and morphology converge across renamed edit classes', async () => {
  for (const [ruleSurface, progressive, finite, lemma] of [
    ['waterr', 'watering', 'waters', 'water'],
    ['fixx', 'fixing', 'fixes', 'fix'],
    ['psas', 'passing', 'passes', 'pass'],
    ['buz', 'buzzing', 'buzzes', 'buzz'],
    ['mapp', 'mapping', 'maps', 'map'],
    ['moe', 'moving', 'moves', 'move'],
  ]) {
    const input = `Relo is an axin. All axin ${ruleSurface} yorin. Is Relo ${progressive} yorin?`;
    const result = await (await quickRuntime()).ask(input, {}, { grounding: false });
    assert.equal(result.status, 'DEFEASIBLE', input);
    assert.equal(result.answer, 'Yes.', input);
    assert.equal(result.query.predicate, lemma, input);
    assert.equal(result.approximation.selectedCandidate.text,
      `Relo is an axin. Every axin ${finite} yorin. Does Relo ${lemma} yorin?`, input);
  }
});

test('an exact language-strategy allowlist changes the bounded proposal ensemble', async () => {
  const source = 'Abura is an mura. All mura et bana. Is Abura eating bana?';
  const parser = 'strategy:language:direct-controlled-parser@1';
  const narrow = await quickRuntime(exactStrategyPolicy('runtime.language.interpret', [
    parser, 'strategy:language:determiner-agreement@1',
  ]));
  const incomplete = await narrow.ask(source, {}, { grounding: false });
  assert.equal(incomplete.status, 'UNPARSED');
  assert.deepEqual(incomplete.approximation.receipt.strategySelection.identities, [
    parser, 'strategy:language:determiner-agreement@1',
  ].toSorted());

  const sufficient = await quickRuntime(exactStrategyPolicy('runtime.language.interpret', [
    parser,
    'strategy:language:determiner-agreement@1',
    'strategy:language:predicate-agreement@1',
    'strategy:language:progressive-question-reduction@1',
    'strategy:language:quantifier-canonicalization@1',
  ]));
  const completed = await sufficient.ask(source, {}, { grounding: false });
  assert.equal(completed.status, 'DEFEASIBLE');
  assert.equal(completed.approximation.selectedCandidate.text,
    'Abura is a mura. Every mura eats bana. Does Abura eat bana?');
});

test('an approximated episode never persists its guessed facts into a later turn', async () => {
  const runtime = await quickRuntime();
  const approximated = await runtime.ask(
    'Abura is an mura. All mura et bana. Is Abura eating bana?',
  );
  assert.equal(approximated.context.session.facts.length, 0);
  const followUp = await runtime.ask('Does Abura eat bana?', approximated.context);
  assert.equal(followUp.status, 'UNKNOWN');
  assert.equal(followUp.query.missingEntity, 'abura');
  assert.equal(followUp.context.session.facts.length, 0);
});

test('a statement-only approximation never claims that its query-local premise was learned', async () => {
  const result = await (await quickRuntime()).ask('Nira a zoral.');
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.languageRoute, 'heuristic-cnl-approximated');
  assert.match(result.answer, /did not save it/u);
  assert.doesNotMatch(result.answer, /I learned/u);
  assert.deepEqual(result.learned, []);
  assert.deepEqual(result.provenance, []);
  assert.equal(result.context.session.facts.length, 0);
  assert.equal(result.approximation.ephemeralPremises.facts.length, 1);
});

test('well-formed direct input remains direct and does not run approximation', async () => {
  const result = await (await quickRuntime()).ask('Can Penguin swim?');
  assert.equal(result.status, 'SOLVED');
  assert.equal(result.languageRoute, 'direct-symbolic');
  assert.equal(result.approximation, undefined);
});

test('a structurally different apposition interpretation prevents strict flattened learning', async () => {
  const runtime = await quickRuntime();
  const result = await runtime.ask('Tavra, a qerin, is a velin.');
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.languageRoute, 'heuristic-cnl-approximated');
  assert.equal(result.approximation.selectedCandidate.text,
    'Tavra is a qerin. Tavra is a velin.');
  assert.deepEqual(result.approximation.selectedCandidate.supportingFamilies, [
    'apposition-expansion',
  ]);
  assert.equal(result.episode.transaction, 'heuristic-query-local');
  assert.equal(result.approximation.ephemeralPremises.committed, false);
  assert.deepEqual(result.learned, []);
  assert.deepEqual(result.context.session.facts, []);
  const followUp = await runtime.ask('Is Tavra a qerin?', result.context);
  assert.equal(followUp.status, 'UNKNOWN');
});

test('report intent plans KB retrieval and shapes a cited partial document', async () => {
  const result = await (await quickRuntime()).ask('Write a short report about Penguin.');
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.languageRoute, 'heuristic-request-synthesis');
  assert.equal(result.requestPlanning.status, 'PLANNED');
  assert.equal(result.episode.transaction, 'heuristic-request-query-local');
  assert.deepEqual(result.context.session.facts, []);
  assert.deepEqual(result.context.session.rules, []);
  assert.equal(result.requestPlanning.selectedPlan.outputContract.artifact, 'report');
  assert.equal(result.requestPlanning.selectedPlan.outputContract.length, 'brief');
  assert.match(result.answer, /^# Penguin/mu);
  assert.match(result.answer, /Penguin is a bird and can swim\. \[1\]\[2\]/u);
  assert.match(result.answer, /## Sources/u);
  assert.deepEqual(result.usedKbVersions, [{ kbId: 'quick', version: '1.0.0' }]);
  assert.ok(result.provenance.every((item) =>
    item.method === 'grounded-symbolic-realization' && item.sourceClaim === true));
  assert.equal(result.synthesis.claimMode, 'grounded-symbolic-generation');
  assert.ok(result.synthesis.realization.strategyTrace.includes(
    RESULT_REALIZATION_STRATEGIES.claimFusion,
  ));
  assert.equal(result.synthesis.answerAuthority, 'related-evidence-is-not-entailment');
  assert.equal(result.grounding.focus.strategy, 'semantic-role-phrase-morphology-v3');
  assert.equal(result.grounding.focus.source, 'typed-request-plan');
  assert.deepEqual(result.grounding.focus.obligations.map((item) => item.term), ['penguin']);
  assert.equal(result.grounding.search.termSelectionComplete, true);
  assert.equal(result.grounding.focus.terms[0], 'penguin');
  assert.ok(!result.grounding.focus.terms.some((term) =>
    ['write', 'short', 'report'].includes(term)));
});

test('result-construction allowlists gate concrete rhetorical, sentence, and assembly strategies', async () => {
  const summaryStrategies = [
    RESULT_REALIZATION_STRATEGIES.rhetoricalPlanner,
    RESULT_REALIZATION_STRATEGIES.coverageGap,
    RESULT_REALIZATION_STRATEGIES.proseAssembly,
    RESULT_REALIZATION_STRATEGIES.typedFact,
    RESULT_REALIZATION_STRATEGIES.claimFusion,
  ];
  const summaryOnly = await quickRuntime(exactStrategyPolicy('runtime.result.construct', [
    ...summaryStrategies,
  ]));
  const summary = await summaryOnly.ask('Summarize Penguin.');
  assert.equal(summary.status, 'PARTIAL');
  assert.equal(summary.languageRoute, 'heuristic-request-synthesis');

  const report = await summaryOnly.ask('Write a report about Penguin.');
  assert.equal(report.status, 'MISSING_KNOWLEDGE');
  assert.equal(report.languageRoute, 'heuristic-request-planned');
  assert.match(report.answer, /result-construction strategy was not selected/u);

  const summaryTable = await summaryOnly.ask(
    'Summarize "Penguins are birds." as a table.', {}, { grounding: false },
  );
  assert.equal(summaryTable.status, 'MISSING_KNOWLEDGE');
  assert.match(summaryTable.answer, /result-construction strategy was not selected/u);

  const summaryAndTable = await quickRuntime(exactStrategyPolicy('runtime.result.construct', [
    RESULT_REALIZATION_STRATEGIES.rhetoricalPlanner,
    RESULT_REALIZATION_STRATEGIES.coverageGap,
    RESULT_REALIZATION_STRATEGIES.tableAssembly,
    RESULT_REALIZATION_STRATEGIES.sourceSentence,
    RESULT_REALIZATION_STRATEGIES.typedFact,
    RESULT_REALIZATION_STRATEGIES.claimFusion,
  ]));
  const shaped = await summaryAndTable.ask(
    'Summarize "Penguins are birds." as a table.', {}, { grounding: false },
  );
  assert.equal(shaped.status, 'PARTIAL');
  assert.match(shaped.answer, /\| Supported statement \| Evidence \|/u);
});

test('a source-only summary excludes marker topics and keeps the supplied source separate from KBs', async () => {
  const result = await (await quickRuntime()).ask(
    'Summarize this text: Penguins swim in cold seas.',
  );
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.languageRoute, 'heuristic-request-synthesis');
  assert.deepEqual(result.requestPlanning.selectedPlan.topics, []);
  assert.equal(result.answer, 'Penguins swim in cold seas.');
  assert.equal(result.synthesis.realization.coverage.evidenceRealized, 0);
  assert.equal(result.synthesis.realization.coverage.suppliedSentencesRealized, 1);
  assert.ok(!result.requestPlanning.receipt.topicSelection.items.some((topic) =>
    ['this', 'text', 'following', 'passage', 'content'].includes(topic.normalized)));
});

test('explicit request force preempts an accidental direct assertion without committing it', async () => {
  const runtime = await quickRuntime();
  const input = 'Summarize this text: Nira is a zoral.';
  const direct = await runtime.askDirect(input, {}, { grounding: false });
  assert.equal(direct.status, 'SOLVED');
  assert.equal(direct.learned.length, 1);
  assert.equal(direct.context.session.facts.length, 1);

  const result = await runtime.ask(input, {}, { grounding: false });
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.languageRoute, 'heuristic-request-synthesis');
  assert.equal(result.episode.transaction, 'heuristic-request-query-local');
  assert.deepEqual(result.learned, []);
  assert.deepEqual(result.context.session.facts, []);
  assert.deepEqual(result.context.session.rules, []);
  assert.match(result.answer, /Nira is a zoral\./u);
});

test('planned retrieval remains local when ordinary failure grounding is deferred for an optional agent', async () => {
  const result = await (await quickRuntime()).ask(
    'Write a short report about Penguin.', {}, { grounding: false },
  );
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.languageRoute, 'heuristic-request-synthesis');
  assert.equal(result.requestPlanning.status, 'PLANNED');
  assert.match(result.answer, /Penguin can swim/u);
});

test('a recognized document request without source material returns a knowledge gap, not a language failure',
  async () => {
    const policy = resolveWorkPolicy('balanced');
    const core = new EslmEngine(await createCoreModel(), { workPolicy: policy });
    const runtime = new HeuristicLanguageRuntime(new EslmRuntime(core, [], [], undefined, policy));
    const result = await runtime.ask('Write an essay about zorals.', {}, { grounding: false });
    assert.equal(result.status, 'MISSING_KNOWLEDGE');
    assert.equal(result.languageRoute, 'heuristic-request-planned');
    assert.equal(result.requestPlanning.status, 'PLANNED');
    assert.match(result.answer, /understood the requested artifact/u);
    assert.deepEqual(result.usedKbVersions, []);
  });

test('explicit Language Agent mode still lets the local request planner finish first', async () => {
  let normalizerCalls = 0;
  const normalizer = {
    configuration: () => ({}),
    normalize: async () => {
      normalizerCalls += 1;
      throw new Error('The Language Agent must not run for a locally planned request.');
    },
  };
  const runtime = new LanguageAgentAssistedRuntime(await quickRuntime(), normalizer);
  const result = await runtime.ask('Write a short report about Penguin.');
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.languageRoute, 'heuristic-request-synthesis');
  assert.equal(normalizerCalls, 0);
});

test('a tied local request plan is terminal ambiguity and never invokes the Language Agent', async () => {
  let normalizerCalls = 0;
  const runtime = new LanguageAgentAssistedRuntime(await quickRuntime(), {
    configuration: () => ({}),
    normalize: async () => {
      normalizerCalls += 1;
      throw new Error('A locally identified intent tie must remain local ambiguity.');
    },
  });
  const result = await runtime.ask('Please write a summary outline about zorals.');
  assert.equal(result.status, 'AMBIGUOUS');
  assert.equal(result.languageRoute, 'heuristic-request-ambiguous');
  assert.equal(result.requestPlanning.status, 'AMBIGUOUS');
  assert.equal(result.unresolvedSubgoals[0].operation, 'confirm-request-intent');
  assert.ok(result.unresolvedSubgoals[0].candidates.length >= 2);
  assert.equal(normalizerCalls, 0);
});

test('a negated artifact request never executes the forbidden positive plan', async () => {
  const result = await (await quickRuntime()).ask('Do not write a report about Penguin.');
  assert.notEqual(result.languageRoute, 'heuristic-request-synthesis');
  assert.doesNotMatch(result.answer, /^# Report/mu);
  assert.notEqual(result.requestPlanning?.status, 'PLANNED');
});

test('request focus does not retrieve quantifiers as topics in the motivating failure', async () => {
  const runtime = await quickRuntime('quick');
  const direct = await runtime.askDirect(
    'Abura is an mura. All mura et bana. Is Abura eating bana?', {}, { grounding: false },
  );
  const grounded = await runtime.attachGrounding(direct);
  assert.ok(grounded.grounding);
  assert.ok(!grounded.grounding.entries.some((entry) =>
    /(?:^|\W)all(?:\W|$)/iu.test(entry.statement)));
  assert.ok(!grounded.grounding.queryText.startsWith('all'));
});

test('typed request-plan focus keeps operators in the plan but not in grounding obligations', async () => {
  const result = await (await quickRuntime()).ask(
    'Write a report about all mura eating bana.',
  );
  assert.equal(result.requestPlanning.status, 'PLANNED');
  assert.equal(result.requestPlanning.selectedPlan.topics[0].normalized, 'all mura eating bana');
  assert.equal(result.grounding.focus.source, 'typed-request-plan');
  assert.deepEqual(result.grounding.focus.obligations.map((item) => item.term), [
    'mura eating bana',
  ]);
  assert.ok(!result.grounding.focus.terms.some((term) => /(?:^|\s)all(?:\s|$)/u.test(term)));
  assert.equal(result.grounding.focus.candidates.find((candidate) => candidate.term === 'eat')?.role,
    'predicate');
});

test('work profiles change bounded heuristic effort without changing completed direct semantics', async () => {
  const quick = await quickRuntime('quick');
  const deep = await quickRuntime('deep');
  const quickResult = await quick.ask('Can Penguin swim?');
  const deepResult = await deep.ask('Can Penguin swim?');
  assert.equal(quickResult.status, deepResult.status);
  assert.deepEqual(quickResult.values, deepResult.values);
  assert.equal(quickResult.workPolicy.effective.profile, 'quick');
  assert.equal(deepResult.workPolicy.effective.profile, 'deep');
  assert.ok(deepResult.workPolicy.effective.limits.maximumHeuristicCandidates
    > quickResult.workPolicy.effective.limits.maximumHeuristicCandidates);
});

test('work profiles keep the same interpretation threshold and agree on the completed motivating episode', async () => {
  const source = 'Abura is an mura. All mura et bana. Is Abura eating bana?';
  const results = [];
  for (const profile of ['quick', 'balanced', 'deep', 'exhaustive-bounded']) {
    results.push(await (await quickRuntime(profile)).ask(source));
  }
  assert.deepEqual(results.map((result) => result.status),
    ['DEFEASIBLE', 'DEFEASIBLE', 'DEFEASIBLE', 'DEFEASIBLE']);
  assert.deepEqual(results.map((result) => result.answer), ['Yes.', 'Yes.', 'Yes.', 'Yes.']);
  assert.ok(results.every((result) => result.approximation.selectedCandidate.text
    === 'Abura is a mura. Every mura eats bana. Does Abura eat bana?'));
  assert.ok(results.every((result) =>
    result.workPolicy.effective.limits.minimumHeuristicConfidence === 0.68));
});

test('candidate selection compiles semantic IR locally and executes providers only after selection', async () => {
  const policy = resolveWorkPolicy('balanced');
  const model = await createCoreModel();
  const core = new EslmEngine(model, { workPolicy: policy });
  let providerCalls = 0;
  let providerCallsDuringInspection = 0;
  let inspecting = false;
  const provider = {
    manifest: { id: 'provider:nonce', kbId: 'nonce', kbVersion: '1' },
    memorySnapshot: () => ({ mode: 'eager' }),
    ask: () => {
      providerCalls += 1;
      if (inspecting) providerCallsDuringInspection += 1;
      return undefined;
    },
  };
  const base = new EslmRuntime(
    core, [provider], ['nonce'], undefined, policy,
  );
  const inspectLanguage = base.inspectLanguage.bind(base);
  base.inspectLanguage = (...args) => {
    inspecting = true;
    try {
      return inspectLanguage(...args);
    } finally {
      inspecting = false;
    }
  };
  const runtime = new HeuristicLanguageRuntime(base);
  const result = await runtime.ask(
    'Abura is an mura. All mura et bana. Is Abura eating bana?', {}, { grounding: false },
  );
  assert.equal(result.status, 'DEFEASIBLE');
  assert.equal(providerCalls, 2);
  assert.equal(providerCallsDuringInspection, 0);
  assert.ok(result.approximation.reparses.length > 2);
  assert.ok(result.approximation.reparses.every((receipt) =>
    !receipt.semanticSignature.includes('values')));
});

test('surface cleanup around an opaque question remains unparsed and eligible for an enabled agent', async () => {
  const runtime = await quickRuntime();
  const local = await runtime.ask('Actually, Flibber wobble?', {}, { grounding: false });
  assert.equal(local.status, 'UNPARSED');
  assert.notEqual(local.approximation.status, 'accepted-reparse');
  assert.ok(local.approximation.reparses.every((receipt) => receipt.acceptedSemanticIr === false));

  let calls = 0;
  const assisted = new LanguageAgentAssistedRuntime(runtime, {
    configuration: () => ({}),
    normalize: async () => {
      calls += 1;
      return { status: 'failed', externalInvocations: 1, receipts: [], diagnostic: 'fixture stop' };
    },
  });
  const result = await assisted.ask('Actually, Flibber wobble?');
  assert.equal(calls, 1);
  assert.equal(result.languageRoute, 'language-agent-normalization-failed');
});
