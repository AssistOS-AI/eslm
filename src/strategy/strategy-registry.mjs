import {
  assertStrategyDescriptor,
  createStrategyRunResult,
  STRATEGY_REGISTRY_PROTOCOL,
  STRATEGY_STAGES,
  strategyIdentity,
} from './strategy-contract.mjs';

function freezeDeep(value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) freezeDeep(child, seen);
  return Object.freeze(value);
}

function canonicalEntries(entries) {
  return [...entries].toSorted((left, right) => {
    const stage = STRATEGY_STAGES.indexOf(left.descriptor.stage)
      - STRATEGY_STAGES.indexOf(right.descriptor.stage);
    return stage || strategyIdentity(left.descriptor).localeCompare(strategyIdentity(right.descriptor));
  });
}

export class StrategyRegistry {
  #strategies = new Map();

  #sealed = false;

  constructor() {
    this.format = STRATEGY_REGISTRY_PROTOCOL;
  }

  register(descriptor, execute, validators) {
    if (this.#sealed) throw new Error('A sealed strategy registry cannot be modified.');
    assertStrategyDescriptor(descriptor);
    if (descriptor.implementationState !== 'coordinated') {
      throw new Error(`${descriptor.strategyId} is ${descriptor.implementationState}, not a coordinated executor.`);
    }
    if (typeof execute !== 'function') throw new Error(`${descriptor.strategyId} requires a trusted executor.`);
    if (typeof validators?.validateInput !== 'function'
      || typeof validators?.validateOutput !== 'function') {
      throw new Error(`${descriptor.strategyId} requires trusted input and output validators.`);
    }
    const identity = strategyIdentity(descriptor);
    if (this.#strategies.has(identity)) throw new Error(`Duplicate strategy identity: ${identity}.`);
    const frozenDescriptor = freezeDeep(structuredClone(descriptor));
    this.#strategies.set(identity, Object.freeze({
      descriptor: frozenDescriptor, execute,
      validateInput: validators.validateInput,
      validateOutput: validators.validateOutput,
    }));
    return this;
  }

  seal() {
    this.#sealed = true;
    return this;
  }

  assertSealed() {
    if (!this.#sealed) throw new Error('Strategy execution requires a sealed registry.');
    return this;
  }

  descriptors(stage) {
    if (stage !== undefined && !STRATEGY_STAGES.includes(stage)) {
      throw new Error(`Unknown strategy stage: ${stage}.`);
    }
    return Object.freeze(canonicalEntries(this.#strategies.values())
      .filter((entry) => stage === undefined || entry.descriptor.stage === stage)
      .map((entry) => entry.descriptor));
  }

  entries(stage, selectedIdentities) {
    this.assertSealed();
    if (stage !== undefined && !STRATEGY_STAGES.includes(stage)) {
      throw new Error(`Unknown strategy stage: ${stage}.`);
    }
    const available = canonicalEntries(this.#strategies.values())
      .filter((entry) => stage === undefined || entry.descriptor.stage === stage);
    if (selectedIdentities !== undefined) {
      if (!Array.isArray(selectedIdentities) || selectedIdentities.length > 256) {
        throw new Error('Selected strategy identities must be a bounded array.');
      }
      const availableIdentities = new Set(available.map((entry) => strategyIdentity(entry.descriptor)));
      const unknown = selectedIdentities.filter((identity) => !availableIdentities.has(identity));
      if (unknown.length > 0) throw new Error(`Unknown selected strategy identities: ${unknown.join(', ')}.`);
    }
    const allowlist = selectedIdentities === undefined ? undefined : new Set(selectedIdentities);
    return Object.freeze(available
      .filter((entry) => !allowlist || allowlist.has(strategyIdentity(entry.descriptor))));
  }

  #executionEntry(identity) {
    this.assertSealed();
    if (typeof identity !== 'string') {
      throw new Error('Strategy execution requires an exact registered identity.');
    }
    const entry = this.#strategies.get(identity);
    if (!entry) throw new Error(`Unknown registered strategy identity: ${identity}.`);
    return entry;
  }

  async execute(identity, input, context) {
    const entry = this.#executionEntry(identity);
    if (entry.validateInput(input) !== true) throw new Error('Strategy input failed its trusted type validator.');
    const raw = await entry.execute(input, context);
    const result = createStrategyRunResult(entry.descriptor, raw);
    if (result.output !== undefined && entry.validateOutput(result.output) !== true) {
      const error = new Error('Strategy output failed its trusted type validator.');
      error.code = 'INVALID_STRATEGY_OUTPUT';
      throw error;
    }
    return result;
  }

  executeSync(identity, input, context) {
    const entry = this.#executionEntry(identity);
    if (entry.validateInput(input) !== true) throw new Error('Strategy input failed its trusted type validator.');
    const raw = entry.execute(input, context);
    if (raw && typeof raw.then === 'function') {
      throw new Error(`${entry.descriptor.strategyId} returned a Promise to a synchronous stage.`);
    }
    const result = createStrategyRunResult(entry.descriptor, raw);
    if (result.output !== undefined && entry.validateOutput(result.output) !== true) {
      const error = new Error('Strategy output failed its trusted type validator.');
      error.code = 'INVALID_STRATEGY_OUTPUT';
      throw error;
    }
    return result;
  }
}
