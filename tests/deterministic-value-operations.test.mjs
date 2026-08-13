import test from 'node:test';
import assert from 'node:assert/strict';
import { frameBoundedOperation } from '../src/language/bounded-operation-framing.mjs';
import { executeDeterministicValueOperation } from '../src/reasoning/deterministic-value-operations.mjs';

function solve(text) {
  const frame = frameBoundedOperation(text);
  assert.ok(frame, text);
  return executeDeterministicValueOperation(frame);
}

test('scalar arithmetic and percentage operations replay changed numeric witnesses', () => {
  assert.equal(solve('What is 91 - 37?').answer, '54');
  assert.equal(solve('What is 17% of 300?').answer, '51');
  assert.equal(solve('A price of 240 RON increases by 25%. What is the new price?').answer, '300 RON');
  assert.equal(solve('What is 7 divided by 0?').status, 'UNDERDETERMINED');
});

test('parity, arithmetic sequences, ratios, units, and clocks use generic numeric frames', () => {
  assert.equal(solve('Is the number 103 even? Answer only yes or no.').answer, 'no');
  assert.equal(solve('Continue the number sequence with one number: 7, 12, 17, 22, ...').answer, '27');
  assert.equal(solve('The ratio is 3:7. If the first term becomes 15, what must the second be?').answer, '35');
  assert.equal(solve('How many meters are in 2.5 kilometers?').answer, '2500 meters');
  assert.equal(solve('An activity starts at 22:30 and lasts 3 hours. When does it end?').answer, '01:30');
  assert.equal(solve('What is the mean of 8, 13, and 20?').answer, '13.67');
});

test('renamed short problems and ordered entities do not depend on benchmark identities', () => {
  assert.equal(solve('At a table there are 9 people and each person gets 4 glasses. How many glasses are needed?').answer, '36');
  assert.equal(solve('There are 7 people at a table, and each receives 6 glasses of water. How many glasses are needed?').answer, '42');
  assert.equal(solve('Talia has 93 pages to read and has read 28. How many pages are left?').answer, '65');
  assert.equal(solve('There are 8 boxes with 11 objects each. How many objects are there in total?').answer, '88');
  assert.equal(solve('Neris is taller than Calum, and Calum is taller than Veya. Who is the shortest?').answer, 'Veya');
});

test('unsupported sequences and unrelated questions remain outside the operation executor', () => {
  const geometric = frameBoundedOperation('Continue the number sequence with one number: 2, 4, 8, 16, ...');
  assert.ok(geometric);
  assert.equal(executeDeterministicValueOperation(geometric), undefined);
  assert.equal(frameBoundedOperation('Who discovered penicillin?'), undefined);
});
