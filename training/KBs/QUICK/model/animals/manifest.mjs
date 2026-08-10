import entities from './entities.mjs';
import facts from './facts.mjs';
import indexes from './indexes.mjs';
import language from './language.mjs';
import reasoning from './reasoning.mjs';
import rules from './rules.mjs';

export const model = Object.freeze({ manifest: Object.freeze({
  "format": "eslm-code-model-v1",
  "modelId": "animals",
  "title": "Animals and ordinary capabilities",
  "version": "1.0.0",
  "generatedAt": "2026-08-10T00:00:00.000Z",
  "generatedBy": "coding-agent",
  "sourceDigest": "e21ac3df0211feac1f0d6d186bbf15b4ef782a2fad8883e83430baf5beac9fd2",
  "evidenceRegime": "generated-educational-kb",
  "benchmarkEligible": false,
  "scope": "A small educational taxonomy with explicit capabilities. It avoids a universal bird-flying rule because penguins and ostriches are counterexamples.",
  "examples": [
    {
      "input": "Can Sparrow fly?",
      "answer": "Yes.",
      "reasoning": "explicit capability fact"
    },
    {
      "input": "Is Penguin an animal?",
      "answer": "Yes.",
      "reasoning": "one-step class deduction"
    },
    {
      "input": "Can Penguin swim?",
      "answer": "Yes.",
      "reasoning": "explicit capability fact"
    },
    {
      "input": "Can Penguin fly?",
      "answer": "I have no evidence that this is true.",
      "reasoning": "open-world unknown, not a false claim"
    }
  ]
}), entities, facts, rules, lexicon: language, reasoning, indexes });
export default model;
