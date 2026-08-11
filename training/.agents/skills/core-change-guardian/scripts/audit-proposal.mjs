#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const proposal = JSON.parse(await readFile(resolve(process.argv[2]), 'utf8'));
const required = ['format', 'title', 'independentExamples', 'inputTypes', 'outputTypes', 'preconditions', 'invariants', 'uncertaintySemantics', 'proofBehavior', 'resourceBounds', 'failureStatuses', 'tests', 'kbMigration'];
const missing = required.filter((field) => proposal[field] === undefined);
const failures = [...missing.map((field) => `missing ${field}`)];
if (proposal.format !== 'eslm-core-change-proposal-v1') failures.push('invalid format');
if (!Array.isArray(proposal.independentExamples) || proposal.independentExamples.length < 2) failures.push('fewer than two independent examples');
if (proposal.renameTestPassed !== true) failures.push('rename test not passed');
if (proposal.forbiddenDispatchAuditPassed !== true) failures.push('forbidden dispatch audit not passed');
if (!Array.isArray(proposal.renamedDimensions)
  || !['entity', 'predicate', 'value', 'ordering'].every((kind) => proposal.renamedDimensions.includes(kind))) {
  failures.push('rename test does not cover entity, predicate, value, and ordering');
}
if (!Array.isArray(proposal.tests) || !['unit', 'metamorphic', 'contrastive', 'regression'].every((kind) => proposal.tests.includes(kind))) failures.push('required test classes missing');
process.stdout.write(`${JSON.stringify({ eligibleForImplementation: failures.length === 0, failures }, null, 2)}\n`);
