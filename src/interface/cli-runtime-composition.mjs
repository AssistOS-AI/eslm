import { CodexLanguageNormalizer, DEFAULT_CODEX_NORMALIZATION_MODEL } from '../language/codex-normalizer.mjs';
import {
  KB_CATALOG, loadKnowledgeBases, mergeModels, registeredKnowledgeBases,
} from '../kbs.mjs';
import {
  PUBLIC_KB_CATALOG, loadPublicKnowledgeBases,
} from '../public-kbs.mjs';
import { createCoreModel } from '../runtime/core-model.mjs';
import { EnglishLanguageGateRuntime } from '../runtime/english-language-gate-runtime.mjs';
import { EslmEngine } from '../runtime/engine.mjs';
import { HeuristicLanguageRuntime } from '../runtime/heuristic-language-runtime.mjs';
import { LanguageAgentAssistedRuntime } from '../runtime/language-agent-assisted-runtime.mjs';
import { EslmRuntime } from '../runtime/runtime.mjs';
import {
  languageAgentNormalizationEnabled, workPolicyFromCliOptions,
} from './cli-runtime-policy.mjs';

export const CLI_RUNTIME_COMPOSITION_PROTOCOL = 'eslm-cli-runtime-composition-v1';

const LOCAL_WRAPPER_ORDER = Object.freeze([
  'authority:language:english-likelihood-gate',
  'coordination:language:deterministic-heuristic-recovery',
  'runtime:knowledge:provider-aware-symbolic-execution',
  'runtime:reasoning:deterministic-core-engine',
]);

const ASSISTED_WRAPPER_ORDER = Object.freeze([
  'operator:language:external-proposal-boundary',
  ...LOCAL_WRAPPER_ORDER,
]);

function assertOptions(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('CLI runtime construction options must be an object.');
  }
  return options;
}

export function languageAgentTimeoutFromCliOptions(options = {}) {
  assertOptions(options);
  const timeoutMs = Number(
    options['language-agent-timeout-ms'] ?? options['codex-timeout-ms'] ?? 120_000,
  );
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 600_000) {
    throw new Error('--language-agent-timeout-ms must be between 1000 and 600000.');
  }
  return timeoutMs;
}

export async function selectedRuntimeKbIds(value) {
  if (!value) return [];
  const registered = await registeredKnowledgeBases();
  const known = new Set([
    ...Object.keys(KB_CATALOG),
    ...Object.keys(PUBLIC_KB_CATALOG),
    ...registered.map((entry) => entry.kbId),
  ]);
  const requested = String(value).split(',')
    .map((item) => item.trim().toLocaleLowerCase('en-US'))
    .filter(Boolean);
  const ids = requested.includes('all') ? [...known] : requested;
  for (const id of ids) {
    if (!known.has(id)) throw new Error(`Unknown knowledge base: ${id}`);
  }
  return [...new Set(ids)];
}

function assertLocalWrapperOrder(runtime) {
  if (!(runtime instanceof EnglishLanguageGateRuntime)
      || !(runtime.runtime instanceof HeuristicLanguageRuntime)
      || !(runtime.runtime.runtime instanceof EslmRuntime)
      || !(runtime.runtime.runtime.core instanceof EslmEngine)) {
    throw new Error('CLI local runtime composition does not match the reviewed processing graph.');
  }
}

export function inspectCliRuntimeComposition(runtime) {
  const assisted = runtime instanceof LanguageAgentAssistedRuntime;
  const local = assisted ? runtime.runtime : runtime;
  assertLocalWrapperOrder(local);
  return Object.freeze({
    protocol: CLI_RUNTIME_COMPOSITION_PROTOCOL,
    profile: assisted ? 'language-agent-assisted-normalization' : 'deterministic-local',
    externalLanguageAgent: assisted,
    wrapperOrderOuterToInner: assisted ? ASSISTED_WRAPPER_ORDER : LOCAL_WRAPPER_ORDER,
    selectedKnowledgeBases: Object.freeze([...(local.selected ?? [])]),
    workPolicy: local.workPolicy,
    authority: Object.freeze({
      languageAgent: assisted ? 'untrusted-language-form-proposal-only' : 'absent',
      englishLikelihoodGate: 'fail-closed-before-local-language-and-knowledge-execution',
      symbolicRuntime: 'sole-semantic-answer-authority',
    }),
  });
}

export async function createCliRuntime(options = {}) {
  assertOptions(options);
  const workPolicy = workPolicyFromCliOptions(options);
  const base = await createCoreModel(options.model);
  const selected = await selectedRuntimeKbIds(options.kb);
  const publicIds = selected.filter((id) => PUBLIC_KB_CATALOG[id]);
  const graphIds = selected.filter((id) => !PUBLIC_KB_CATALOG[id]);
  const knowledgeBases = await loadKnowledgeBases(graphIds.join(','));
  const core = new EslmEngine(mergeModels(base, knowledgeBases), {
    profile: options.profile,
    workPolicy,
  });
  const loaded = await loadPublicKnowledgeBases(publicIds, {
    memoryMb: options['memory-mb'],
    memoryPolicy: options['memory-policy'],
  });
  const local = new EnglishLanguageGateRuntime(new HeuristicLanguageRuntime(
    new EslmRuntime(core, loaded.providers, selected, loaded.memoryPlan, workPolicy),
  ));
  if (!languageAgentNormalizationEnabled(options)) {
    inspectCliRuntimeComposition(local);
    return local;
  }
  const runtime = new LanguageAgentAssistedRuntime(local, new CodexLanguageNormalizer({
    model: options['language-agent-model'] ?? options['codex-model'] ?? DEFAULT_CODEX_NORMALIZATION_MODEL,
    command: options['language-agent-command'] ?? options['codex-command'],
    timeoutMs: languageAgentTimeoutFromCliOptions(options),
    cache: !options['no-normalization-cache'],
    onExternalInvocation: options.onLanguageAgentInvocation,
  }));
  inspectCliRuntimeComposition(runtime);
  return runtime;
}
