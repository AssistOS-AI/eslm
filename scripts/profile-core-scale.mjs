#!/usr/bin/env node
import process from 'node:process';
import { resolve } from 'node:path';
import { writeJson } from '../src/io.mjs';
import { ExecutionProfiler } from '../src/profiling.mjs';
import { deriveClosure, indexFacts } from '../src/reasoning/datalog.mjs';
import { parseArgs } from '../src/util.mjs';

function parseSizes(value) {
  const sizes = String(value ?? '1000,10000,100000').split(',').map(Number);
  if (sizes.length === 0 || sizes.some((size) => !Number.isInteger(size) || size < 1)) {
    throw new Error('sizes must be comma-separated positive integers.');
  }
  return [...new Set(sizes)];
}

function factsFor(size) {
  return Array.from({ length: size }, (_, index) => ({
    id: `f${index}`,
    subject: `e${index}`,
    predicate: 'is_a',
    value: index % 2 === 0 ? 'object' : 'animal',
    provenance: [`synthetic:${index}`],
  }));
}

function profileSize(size, closureLimit) {
  const facts = factsFor(size);
  const profiler = new ExecutionProfiler('core-scale', true, { directFacts: size });
  const index = profiler.measureSync('retrieval.build-index', () => indexFacts(facts), { facts: size });
  profiler.annotate('retrieval.build-index', {
    subjectKeys: index.bySubject.size,
    predicateKeys: index.byPredicate.size,
    objectKeys: index.byObject.size,
  });
  let closureFacts;
  if (size <= closureLimit) {
    const model = {
      facts,
      rules: [{
        id: 'synthetic:animal-living',
        when: [['?entity', 'is_a', 'animal']],
        then: ['?entity', 'has_property', 'living'],
        source: 'synthetic:rule',
      }],
      reasoning: { deduction: { maxRounds: 3 } },
    };
    const closure = profiler.measureSync('reasoning.one-premise-closure', () => deriveClosure(model), {
      facts: size, rules: 1, maxRounds: 3,
    });
    closureFacts = closure.length;
    profiler.annotate('reasoning.one-premise-closure', { closureFacts });
  }
  return profiler.finish('ok', { directFacts: size, closureFacts });
}

async function main() {
  const { options } = parseArgs(process.argv.slice(2));
  const sizes = parseSizes(options.sizes);
  const closureLimit = Number(options['closure-limit'] ?? 10000);
  if (!Number.isInteger(closureLimit) || closureLimit < 0) throw new Error('closure-limit must be a non-negative integer.');
  const report = {
    format: 'eslm-core-scale-report-v1',
    createdAt: new Date().toISOString(),
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    interpretation: 'Synthetic primitive profile; not a corpus or end-to-end model benchmark.',
    sizes,
    closureLimit,
    profiles: sizes.map((size) => profileSize(size, closureLimit)),
  };
  if (options.output) await writeJson(resolve(options.output), report);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`profile-core-scale: ${error.message}\n`);
  process.exitCode = 1;
});
