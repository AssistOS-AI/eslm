#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [directoryValue, dataset, checkpoint, hypothesis] = process.argv.slice(2);
if (!directoryValue || !dataset || !checkpoint || !hypothesis) throw new Error('Usage: init-cycle.mjs DIRECTORY DATASET CHECKPOINT HYPOTHESIS');
const directory = resolve(directoryValue);
await mkdir(directory, { recursive: false });
const cycle = { format: 'eslm-learning-cycle-v1', dataset, acceptedCheckpoint: checkpoint, hypothesis, status: 'baseline-required' };
await writeFile(resolve(directory, 'cycle.json'), `${JSON.stringify(cycle, null, 2)}\n`, { flag: 'wx' });
await writeFile(resolve(directory, 'research-note.md'), '# Research Note\n\nObserved failure cluster:\n\nRoot cause and trace evidence:\n\nChange:\n\nWhy KB or why core:\n\nTarget result before/after:\n\nFresh result:\n\nMetamorphic result:\n\nRegression result:\n\nProof audit:\n\nResource growth:\n\nRemaining counterexamples and uncertainty:\n\nDecision:\n', { flag: 'wx' });
process.stdout.write(`${JSON.stringify({ directory, cycle })}\n`);
