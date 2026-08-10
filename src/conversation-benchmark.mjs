import { performance } from 'node:perf_hooks';
import { EslmEngine } from './engine.mjs';
import { loadKnowledgeBase, mergeModels } from './kbs.mjs';
import { loadModel } from './model-loader.mjs';
import { loadPublicKnowledgeBase } from './public-kbs.mjs';
import { EslmRuntime } from './runtime.mjs';
import { conversationShape } from './conversation-smoke.mjs';

function equalValues(actual, expected) {
  return expected === undefined || JSON.stringify(actual ?? []) === JSON.stringify(expected);
}

async function createRuntimes(cases, options) {
  const base = await loadModel();
  const ids = new Set(cases.map((item) => item.kb));
  const runtimes = { base: new EslmRuntime(new EslmEngine(base, { profile: options.profile })) };
  if (ids.has('quick')) {
    const quick = mergeModels(base, [await loadKnowledgeBase('quick')]);
    runtimes.quick = new EslmRuntime(new EslmEngine(quick, { profile: options.profile }), [], ['quick']);
  }
  for (const id of ['oewn-2025', 'atomic-2020']) {
    if (!ids.has(id)) continue;
    const provider = await loadPublicKnowledgeBase(id, {
      mode: options.mode,
      cacheBytes: options.cacheBytes,
    });
    runtimes[id] = new EslmRuntime(new EslmEngine(base, { profile: options.profile }), [provider], [id]);
  }
  return { base, runtimes };
}

export async function runConversationBenchmark(cases, options = {}) {
  const settings = {
    mode: options.mode ?? 'lazy',
    cacheBytes: options.cacheBytes ?? 64 * 1024 * 1024,
    profile: Boolean(options.profile),
  };
  const memoryBefore = process.memoryUsage();
  const shapeGroups = Map.groupBy(cases, (item) => conversationShape(item.input));
  const initializedAt = performance.now();
  const { base, runtimes } = await createRuntimes(cases, settings);
  const initializationMs = performance.now() - initializedAt;
  const startedAt = performance.now();
  const groups = new Map();
  const failures = [];
  const examples = new Map();
  let passed = 0;
  for (const item of cases) {
    const result = await runtimes[item.kb].ask(item.input);
    const pass = result.status === item.expectedStatus && equalValues(result.values, item.expectedValues);
    const group = groups.get(item.group) ?? { group: item.group, total: 0, passed: 0 };
    group.total += 1;
    if (pass) {
      group.passed += 1;
      passed += 1;
    } else {
      failures.push({
        id: item.id, group: item.group, input: item.input, knowledgeBase: item.kb,
        expectedStatus: item.expectedStatus, expectedValues: item.expectedValues,
        actualStatus: result.status, actualValues: result.values, answer: result.answer,
      });
    }
    groups.set(item.group, group);
    if (!examples.has(item.group)) examples.set(item.group, {
      group: item.group, input: item.input, knowledgeBase: item.kb,
      expectedStatus: item.expectedStatus, actualStatus: result.status, answer: result.answer,
    });
  }
  const memoryAfter = process.memoryUsage();
  return {
    format: 'eslm-conversation-benchmark-v1',
    benchmarkClass: 'internal generated regression and stress suite',
    createdAt: new Date().toISOString(),
    model: { id: base.manifest.modelId, evidenceRegime: base.manifest.evidenceRegime },
    configuration: {
      publicKnowledgeMode: settings.mode,
      cacheBytesPerPublicKnowledgeBase: settings.cacheBytes,
      ...(options.seed ? { generatorSeed: String(options.seed) } : {}),
    },
    total: cases.length,
    diversity: {
      uniqueInputs: new Set(cases.map((item) => item.input)).size,
      structuralShapes: shapeGroups.size,
      largestRepeatedShape: Math.max(0, ...[...shapeGroups.values()].map((items) => items.length)),
    },
    passed,
    accuracy: cases.length === 0 ? 0 : passed / cases.length,
    durationMs: performance.now() - startedAt,
    initializationMs,
    memory: {
      rssBeforeBytes: memoryBefore.rss,
      rssAfterBytes: memoryAfter.rss,
      rssDeltaBytes: memoryAfter.rss - memoryBefore.rss,
      heapUsedBeforeBytes: memoryBefore.heapUsed,
      heapUsedAfterBytes: memoryAfter.heapUsed,
    },
    groups: [...groups.values()].map((group) => ({ ...group, accuracy: group.passed / group.total })),
    examples: [...examples.values()],
    failures,
  };
}
