import test from 'node:test';
import assert from 'node:assert/strict';
import { frameEverydayTask } from '../src/language/everyday-task-framing.mjs';
import { executeEverydaySuppliedTextOperation } from '../src/reasoning/everyday-supplied-text-operations.mjs';

function solve(text) {
  const task = frameEverydayTask(text);
  assert.ok(task, text);
  const result = executeEverydaySuppliedTextOperation(task);
  assert.ok(result, text);
  return result;
}

test('option-conditioned intent classification generalizes to renamed labels and phrasing', () => {
  assert.equal(solve('Classify the request as security, billing, technical issue, or shipping. “The invoice charged me twice.”').answer, 'billing');
  assert.equal(solve('Classify the request as membership, technical issue, or shipping. “When should my package arrive?”').answer, 'shipping');
  assert.equal(solve('Classify the request as account, billing, technical issue, or delivery. “My payment appears twice.”').answer, 'billing');
});

test('sentiment classification distinguishes affect from neutral event completion', () => {
  assert.equal(solve('Classify the tone as positive, negative, or neutral. Answer with one word: “The device is unusable, and I am frustrated.”').answer, 'negative');
  assert.equal(solve('Classify the tone as positive, negative, or neutral. Answer with one word: “The record was created successfully.”').answer, 'neutral');
});

test('typed supplied-text extraction uses exact spans with renamed entities', () => {
  assert.equal(solve('From the text “Talia Meren is 47 years old and lives in Norwick.” extract only the city.').answer, 'Norwick');
  assert.equal(solve('From the text “Calum Verin is 32 years old and lives in Eastmere.” extract the full name and age.').answer, 'Calum Verin, 32 years old');
});

test('orthographic, tone, and title operations retain bounded supplied content', () => {
  assert.equal(solve('Correct the capitalization and punctuation: “where does the train stop”').answer, 'Where does the train stop?');
  assert.equal(solve('Rephrase more politely without changing the meaning: “Review the totals again.”').answer, 'Please review the totals again.');
  const title = solve('Turn the sentence into a title of no more than five words: “The archive is extending access during winter.”').answer;
  assert.ok(title.split(/\s+/u).length <= 5);
  assert.match(title, /Archive/iu);
});

test('structured extraction preserves missing fields rather than inventing values', () => {
  const result = solve('Extract only explicit information and return a table with: company, monthly_fee, currency, payment_term_days, initial_duration_months. Then write two short observations. If a field is missing, write “unknown”.\n\nText: “The contract with Northwind LLC has an initial duration of 9 months. The monthly fee is USD 420. The excerpt says nothing about renewal.”');
  assert.match(result.answer, /\| company \| Northwind LLC \|/u);
  assert.match(result.answer, /\| payment_term_days \| unknown \|/u);
  assert.doesNotMatch(result.answer, /payable within/iu);
});
