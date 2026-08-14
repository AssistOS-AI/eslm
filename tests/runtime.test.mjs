import test from 'node:test';
import assert from 'node:assert/strict';
import { EslmEngine } from '../src/runtime/engine.mjs';
import { EslmRuntime } from '../src/runtime/runtime.mjs';
import { HeuristicLanguageRuntime } from '../src/runtime/heuristic-language-runtime.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';
import { loadKnowledgeBase, mergeModels } from '../src/kbs.mjs';
import { regressionSmokeCases, smokeCatalogSummary, smokeExamples } from '../src/conversation-smoke.mjs';
import { assessGeneratedHeuristicCase } from '../src/evaluation/generated-heuristic-benchmark.mjs';
import { SESSION_LIMITS } from '../src/language/session.mjs';
import { directCoreMemorySnapshot } from '../src/runtime/result-contract.mjs';

test('runtime compiles session language, plans deduction, and emits a proof-bearing result', async () => {
  const engine = new EslmEngine(await createCoreModel());
  const result = engine.ask('Mice are afraid of wolves. Gertrude is a mouse. What is Gertrude afraid of?');
  assert.equal(result.protocol, 'eslm-runtime-result-v1');
  assert.equal(result.status, 'SOLVED');
  assert.deepEqual(result.values, ['wolf']);
  assert.equal(result.taskFrame.languageRoute, 'direct-symbolic');
  assert.equal(result.plan.methodId, 'method:core:safe-horn-deduction');
  assert.equal(result.provenance[0].support[0], 'session:f0');
  assert.deepEqual(result.model.memory, directCoreMemorySnapshot());
});

test('unique discourse possession supports a bounded defeasible location answer with explicit confidence', async () => {
  const engine = new EslmEngine(await createCoreModel());
  for (const [input, expectedPlace] of [
    ['Nera is a pilot. She lives in Orwick. She has a ferret. Where is her ferret living?', 'orwick'],
    ['Tavin is a mason. He lives in Velden. He has a badger. Where does his badger live?', 'velden'],
  ]) {
    const result = engine.ask(input);
    assert.equal(result.status, 'DEFEASIBLE', input);
    assert.deepEqual(result.values, [expectedPlace], input);
    assert.equal(result.plan.methodId, 'method:core:finite-episodic-world', input);
    assert.equal(result.reasoning.inference, 'possession-location-default', input);
    assert.equal(result.reasoning.confidence, 0.62, input);
    assert.match(result.answer, /Probably .*confidence 0\.62/u, input);
    assert.match(result.answer, /location was not stated directly/u, input);
    assert.deepEqual(result.episode.unsupportedStatements, [], input);
  }
});

test('possession-location defaults abstain without an owner location and exact object locations take priority', async () => {
  const engine = new EslmEngine(await createCoreModel());
  const missingBridge = engine.ask(
    "Nera is a pilot. Nera lives in Orwick. Tavin has a ferret. Where is Tavin's ferret living?",
  );
  assert.equal(missingBridge.status, 'UNKNOWN');
  assert.deepEqual(missingBridge.values ?? [], []);

  const exact = engine.ask(
    "Nera is a pilot. She lives in Orwick. She has a ferret. The ferret lives in Velden. Where is Nera's ferret living?",
  );
  assert.equal(exact.status, 'SOLVED');
  assert.deepEqual(exact.values, ['velden']);
  assert.equal(exact.reasoning.method, 'retrieval');
  assert.doesNotMatch(exact.answer, /Probably|confidence/u);
});

test('a committed session rule composes with loaded KB facts in a later turn', async () => {
  const model = mergeModels(await createCoreModel(), [await loadKnowledgeBase('quick')]);
  const engine = new EslmEngine(model);
  const learned = engine.ask('Every bird fears wolves.');
  assert.equal(learned.status, 'SOLVED');
  assert.equal(learned.context.session.facts.length, 0);
  assert.equal(learned.context.session.rules.length, 1);

  const result = engine.ask('What is Penguin afraid of?', learned.context);
  assert.equal(result.status, 'SOLVED');
  assert.deepEqual(result.values, ['wolf']);
  assert.equal(result.reasoning.method, 'deduction');
  assert.deepEqual(result.taskFrame.contextStack,
    ['context:runtime:baseline', 'context:session:current']);
});

test('unsupported language is UNPARSED and missing evidence is UNKNOWN', async () => {
  const engine = new EslmEngine(await createCoreModel());
  assert.equal(engine.ask('Write a poem about rain.').status, 'UNPARSED');
  const learned = engine.ask('Ada is a person.');
  assert.equal(engine.ask('Can Ada fly?', learned.context).status, 'UNKNOWN');
});

test('unsupported nominal surfaces are never resolved as English discourse pronouns', async () => {
  const engine = new EslmEngine(await createCoreModel());
  const context = { lastEntity: 'penguin' };
  for (const surface of ['xe', 'qa']) {
    const result = engine.ask(`Can ${surface} swim?`, context);
    assert.notEqual(result.query?.subject, 'penguin', surface);
    assert.notEqual(result.status, 'SOLVED', surface);
  }
});

test('mixed supported and unsupported episodes roll back atomically', async () => {
  const engine = new EslmEngine(await createCoreModel());
  for (const input of [
    'Zara is a pilot. Sing a song about Zara.',
    'Sing a song about Zara. Zara is a pilot.',
    'Zara is a pilot. Sing a song about Zara. Is Zara a pilot?',
  ]) {
    const result = engine.ask(input);
    assert.equal(result.status, 'UNPARSED', input);
    assert.equal(result.episode.transaction, 'rolled-back', input);
    assert.deepEqual(result.learned, [], input);
    assert.equal(result.context.session.facts.length, 0, input);
    assert.equal(engine.ask('Is Zara a pilot?', result.context).status, 'UNKNOWN', input);
  }
});

test('an unsupported final question rolls back otherwise valid tentative assertions', async () => {
  const engine = new EslmEngine(await createCoreModel());
  const rejected = engine.ask('Nira is a zoral. Could you tell me whether Nira is a zoral?');
  assert.equal(rejected.status, 'UNPARSED');
  assert.equal(rejected.episode.transaction, 'rolled-back');
  assert.deepEqual(rejected.learned, []);
  assert.deepEqual(rejected.learnedRules, []);
  assert.deepEqual(rejected.context.session.facts, []);

  const followUp = engine.ask('Is Nira a zoral?', rejected.context);
  assert.equal(followUp.status, 'UNKNOWN');
});

test('oversized input and accumulated sessions fail before mutation with structured resource accounting', async () => {
  const engine = new EslmEngine(await createCoreModel());
  const oversized = engine.ask('a'.repeat(SESSION_LIMITS.maximumInputBytes + 1));
  assert.equal(oversized.status, 'RESOURCE_LIMIT');
  assert.equal(oversized.unresolvedSubgoals[0].resource, 'inputBytes');
  assert.equal(oversized.episode.original, '');
  assert.deepEqual(oversized.model.memory, directCoreMemorySnapshot());

  const facts = Array.from({ length: SESSION_LIMITS.maximumFacts }, (_, index) => ({
    id: `session:f${index}`, subject: `entity-${index}`, predicate: 'is_a', value: 'nonce',
    provenance: [`session:${index}`], session: true,
  }));
  const context = { session: { entities: [], facts, rules: [], history: [] } };
  const exhausted = engine.ask('Zara is a pilot.', context);
  assert.equal(exhausted.status, 'RESOURCE_LIMIT');
  assert.equal(exhausted.unresolvedSubgoals[0].resource, 'facts');
  assert.equal(exhausted.context.session.facts.length, SESSION_LIMITS.maximumFacts);
  assert.equal(exhausted.context.session.facts.some((fact) => fact.subject === 'zara'), false);

  const hiddenOversize = engine.ask('Is Zara a pilot?', { session: {
    entities: [], rules: [], history: [], facts: [{
      id: 'session:f0', subject: 'zara', predicate: 'is_a', value: 'pilot',
      provenance: ['session:1'], session: true,
      sourceText: 'x'.repeat(SESSION_LIMITS.maximumStringBytes + 1),
    }],
  } });
  assert.equal(hiddenOversize.status, 'RESOURCE_LIMIT');
  assert.equal(hiddenOversize.unresolvedSubgoals[0].resource,
    'context.session.facts[0].sourceText');
  assert.deepEqual(hiddenOversize.context.session.facts, []);
});

test('the provider runtime enforces request bounds before consulting selected KBs', async () => {
  const core = new EslmEngine(await createCoreModel());
  let calls = 0;
  const provider = {
    manifest: { id: 'bounded-provider', kbId: 'bounded-provider', kbVersion: '1' },
    async ask() { calls += 1; return undefined; },
  };
  const runtime = new EslmRuntime(core, [provider], ['bounded-provider']);
  const result = await runtime.ask('a'.repeat(SESSION_LIMITS.maximumInputBytes + 1));
  assert.equal(result.status, 'RESOURCE_LIMIT');
  assert.equal(calls, 0);
});

test('invalid session and non-text input produce structured failures without provider consultation', async () => {
  const core = new EslmEngine(await createCoreModel());
  let calls = 0;
  const provider = {
    manifest: { id: 'guarded-provider', kbId: 'guarded-provider', kbVersion: '1' },
    async ask() { calls += 1; return undefined; },
  };
  const runtime = new EslmRuntime(core, [provider], ['guarded-provider']);
  const invalidContext = await runtime.ask('Is Zara a pilot?', {
    session: { entities: [], facts: [], rules: [], history: [], hidden: { payload: 'x' } },
  });
  assert.equal(invalidContext.status, 'INCONSISTENT_CONTEXT');
  assert.deepEqual(invalidContext.context.session.facts, []);
  assert.equal(invalidContext.unresolvedSubgoals[0].operation, 'validate-session-context');
  const invalidInput = await runtime.ask({ text: 'Is Zara a pilot?' });
  assert.equal(invalidInput.status, 'UNPARSED');
  assert.equal(invalidInput.unresolvedSubgoals[0].operation, 'validate-input');
  assert.equal(calls, 0);
});

test('selected QUICK package supplies declarative facts and safe rules', async () => {
  const engine = new EslmEngine(mergeModels(await createCoreModel(), [await loadKnowledgeBase('quick')]));
  assert.equal(engine.ask('Can Penguin swim?').status, 'SOLVED');
  const result = engine.ask('Jhon is a man. Is Jhon going to die?');
  assert.equal(result.status, 'SOLVED');
  assert.equal(result.reasoning.depth, 3);
});

test('interactive smoke catalog agrees with the implemented base and QUICK runtime', async () => {
  const engine = new EslmEngine(mergeModels(await createCoreModel(), [await loadKnowledgeBase('quick')]));
  const cases = smokeExamples({ seed: 'test', maxPerGroup: 100 })
    .filter((item) => ['base', 'quick'].includes(item.kb));
  for (const item of cases) {
    const result = engine.ask(item.input, {});
    assert.equal(result.status, item.expectedStatus, item.id);
    if (item.expectedValues !== undefined) assert.deepEqual(result.values ?? [], item.expectedValues, item.id);
  }
});

test('multi-thousand nonce smoke corpus is deterministic and passes without agent assistance', async () => {
  const engine = new EslmEngine(await createCoreModel());
  const heuristic = new HeuristicLanguageRuntime(new EslmRuntime(engine));
  const cases = regressionSmokeCases();
  const replay = regressionSmokeCases();
  const summary = smokeCatalogSummary();
  assert.equal(cases.length, 4096);
  assert.deepEqual(cases, replay);
  assert.equal(summary.format, 'eslm-smoke-catalog-summary-v2');
  assert.equal(summary.total, 4096);
  assert.deepEqual(summary.catalogKinds, { 'core-regression': 2896, 'heuristic-language': 1200 });
  assert.equal(summary.heuristicTechniqueCount, 43);
  assert.equal(summary.coreTemplateCount, 26);
  assert.equal(summary.templateCount, 69);
  assert.deepEqual(Object.keys(summary.oracleLevels), [
    'answer-execution', 'candidate-selection', 'proposal-only', 'query-local-decomposition',
    'request-execution', 'request-planning', 'safety-abstention', 'semantic-query-execution',
  ]);
  assert.equal(new Set(cases.map((item) => item.input)).size, 4096);
  for (const item of cases) {
    if (item.catalogKind === 'heuristic-language') {
      const result = await heuristic.ask(item.input, {}, { grounding: false });
      const assessment = assessGeneratedHeuristicCase(item, result);
      assert.equal(assessment.pass, true,
        `${item.id} ${item.technique}: ${assessment.failures.map((failure) => failure.code).join(', ')}`);
      continue;
    }
    if (item.kind === 'preference') {
      assert.ok(engine.score(item.good).score > engine.score(item.bad).score, item.id);
      continue;
    }
    const result = item.kind === 'task' ? engine.executeTask(item.taskFrame) : engine.ask(item.input, {});
    assert.equal(result.status, item.expectedStatus, item.id);
    assert.deepEqual(result.values ?? [], item.expectedValues ?? [], item.id);
    assert.equal(result.languageRoute, item.kind === 'task' ? 'direct-symbolic-task-adapter' : 'direct-symbolic', item.id);
  }
});

test('generic state transitions and the declarative bAbI policy solve renamed temporal and induction cases', async () => {
  const model = mergeModels(await createCoreModel(), [await loadKnowledgeBase('babi-v1.2-language')]);
  const engine = new EslmEngine(model);
  const carried = engine.ask('Nara moved to the vault. Nara grabbed the token. Nara journeyed to the garden. Where is the token?');
  assert.deepEqual(carried.values, ['garden']);
  assert.equal(carried.languageRoute, 'direct-symbolic');
  const temporal = engine.ask('Nara moved to the vault. Nara grabbed the token. Nara journeyed to the garden. Nara moved to the hall. Where was the token before the hall?');
  assert.deepEqual(temporal.values, ['garden']);
  assert.equal(temporal.plan.methodId, 'method:core:temporal-state-predecessor');
  const induced = engine.ask('Ari is a zorb. Bela is a zorb. Cora is a zorb. Ari is yellow. Cora is green. What color is Bela?');
  assert.deepEqual(induced.values, ['green']);
  assert.equal(induced.reasoning.selection, 'latest-member');
});

test('property induction follows renamed predicate metadata instead of a benchmark relation constant', async () => {
  const model = await createCoreModel();
  model.reasoning.propertyValues = { texture: ['rough', 'smooth'] };
  model.reasoning.induction = {
    enabled: true, predicates: ['texture'], implicitPredicates: ['texture'],
    minSupport: 1, minCoverage: 0.25,
    byPredicate: { texture: { minSupport: 1, minCoverage: 0.25, selection: 'latest-member' } },
  };
  const result = new EslmEngine(model).ask(
    'Ivo is a neral. Pema is a neral. Suri is a neral. Ivo is rough. Suri is smooth. What texture is Pema?',
  );
  assert.deepEqual(result.values, ['smooth']);
  assert.equal(result.query.predicate, 'texture');
  assert.equal(result.reasoning.selection, 'latest-member');
});

test('generic quantified transitive relations execute under fully renamed vocabulary', async () => {
  const engine = new EslmEngine(await createCoreModel());
  const entailed = engine.ask(
    'Tarin is a zoral. Every zoral glims vepa. Does Tarin glim vepa?',
  );
  assert.equal(entailed.status, 'SOLVED');
  assert.deepEqual(entailed.values, [true]);
  assert.equal(entailed.query.predicate, 'glim');
  assert.ok(entailed.provenance.some((item) => item.rule === 'session:r0'));

  const contrast = engine.ask(
    'Tarin is a zoral. Every zoral glims vepa. Does Tarin avoid vepa?',
  );
  assert.equal(contrast.status, 'UNKNOWN');
  assert.deepEqual(contrast.values, []);
});

test('generic quantified relations lemmatize supported third-person endings symmetrically', async () => {
  const engine = new EslmEngine(await createCoreModel());
  const cases = [
    ['fixes', 'fix'], ['watches', 'watch'], ['passes', 'pass'], ['buzzes', 'buzz'],
    ['carries', 'carry'], ['glims', 'glim'],
  ];
  for (const [surface, lemma] of cases) {
    const result = engine.ask(
      `Every zoral ${surface} vepa. Tarin is a zoral. Does Tarin ${lemma} vepa?`,
    );
    assert.equal(result.status, 'SOLVED', `${surface}/${lemma}`);
    assert.equal(result.answer, 'Yes.', `${surface}/${lemma}`);
  }
});

test('generic relation objects reject embedded operators instead of encoding them as opaque symbols', async () => {
  const engine = new EslmEngine(await createCoreModel());
  for (const object of [
    'tea and drinks water', 'tea or coffee', 'tea because Odo waits', 'tea before noon',
  ]) {
    const result = engine.ask(
      `Every zoral eats ${object}. Tarin is a zoral. Does Tarin eat ${object}?`,
    );
    assert.equal(result.status, 'UNPARSED', object);
    assert.ok(!result.provenance?.some((item) => JSON.stringify(item).includes('_and_')
      || JSON.stringify(item).includes('_or_') || JSON.stringify(item).includes('_because_')
      || JSON.stringify(item).includes('_before_')), object);
  }
});

test('short unknown relation spellings stay unsupported for heuristic recovery', async () => {
  const engine = new EslmEngine(await createCoreModel());
  const result = engine.ask('Abura is a mura. All mura et bana. Does Abura eat bana?');
  assert.equal(result.status, 'UNPARSED');
  assert.deepEqual(result.episode.unsupportedStatements, ['All mura et bana.']);
  assert.equal(result.context.session.facts.length, 0);
});

test('container-state core executes a renamed semantic program without dataset surface vocabulary', async () => {
  const engine = new EslmEngine(await createCoreModel());
  const result = engine.executeTask({
    operation: 'complete-container-contents', taskId: 'nonce-container-program',
    stateProgram: {
      schema: 'finite-relation-state-program-v1', relation: 'holds',
      initial: [
        { subject: 'vessel:orion', relation: 'holds', values: ['quartz', 'reed'] },
        { subject: 'vessel:lyra', relation: 'holds', values: [] },
      ],
      transitions: [
        { operator: 'transfer', relation: 'holds', values: ['quartz'], from: 'vessel:orion', to: 'vessel:lyra' },
        { operator: 'add', relation: 'holds', values: ['amber'], to: 'vessel:orion' },
        { operator: 'remove', relation: 'holds', values: ['reed'], from: 'vessel:orion' },
      ],
      query: { subject: 'vessel:orion', relation: 'holds' },
    },
  });
  assert.equal(result.status, 'SOLVED');
  assert.deepEqual(result.values, ['amber']);
  assert.equal(result.reasoning.relation, 'holds');
  assert.equal(result.plan.methodId, 'method:core:container-state-transitions');
});
