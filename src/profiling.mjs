import { performance } from 'node:perf_hooks';
import process from 'node:process';

function resources() {
  return { memory: process.memoryUsage(), cpu: process.cpuUsage() };
}

function rounded(value) {
  return Math.round(value * 1000) / 1000;
}

function delta(after, before) {
  return {
    rssBytes: after.memory.rss - before.memory.rss,
    heapUsedBytes: after.memory.heapUsed - before.memory.heapUsed,
    externalBytes: after.memory.external - before.memory.external,
    cpuUserMs: rounded((after.cpu.user - before.cpu.user) / 1000),
    cpuSystemMs: rounded((after.cpu.system - before.cpu.system) / 1000),
  };
}

export class ExecutionProfiler {
  constructor(kind, enabled = false, metadata = {}) {
    this.kind = kind;
    this.enabled = Boolean(enabled);
    this.metadata = metadata;
    this.startedAt = this.enabled ? performance.now() : 0;
    this.startedResources = this.enabled ? resources() : undefined;
    this.stages = [];
  }

  measureSync(name, operation, metrics = {}) {
    if (!this.enabled) return operation();
    const startedAt = performance.now();
    const before = resources();
    try {
      const value = operation();
      this.#record(name, startedAt, before, 'ok', metrics);
      return value;
    } catch (error) {
      this.#record(name, startedAt, before, 'error', { ...metrics, error: error.message });
      throw error;
    }
  }

  async measure(name, operation, metrics = {}) {
    if (!this.enabled) return operation();
    const startedAt = performance.now();
    const before = resources();
    try {
      const value = await operation();
      this.#record(name, startedAt, before, 'ok', metrics);
      return value;
    } catch (error) {
      this.#record(name, startedAt, before, 'error', { ...metrics, error: error.message });
      throw error;
    }
  }

  annotate(name, metrics) {
    if (!this.enabled) return;
    const stage = [...this.stages].reverse().find((item) => item.name === name);
    if (stage) stage.metrics = { ...stage.metrics, ...metrics };
  }

  finish(status = 'ok', metrics = {}) {
    if (!this.enabled) return undefined;
    const finished = resources();
    return {
      format: 'eslm-profile-v1',
      kind: this.kind,
      status,
      metadata: this.metadata,
      durationMs: rounded(performance.now() - this.startedAt),
      ...delta(finished, this.startedResources),
      metrics,
      stages: this.stages,
    };
  }

  #record(name, startedAt, before, status, metrics) {
    const finished = resources();
    this.stages.push({
      name,
      status,
      durationMs: rounded(performance.now() - startedAt),
      ...delta(finished, before),
      metrics: { ...metrics },
    });
  }
}
