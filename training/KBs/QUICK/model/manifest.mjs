import entities from './entities.mjs';
import facts from './facts.mjs';
import indexes from './indexes.mjs';
import language from './language.mjs';
import reasoning from './reasoning.mjs';
import rules from './rules.mjs';

export const model = Object.freeze({ manifest: Object.freeze({
  "format": "eslm-code-model-v1",
  "modelId": "quick",
  "benchmarkComparable": false,
  "knowledgeBases": [
    "quick"
  ],
  "title": "QUICK development knowledge base",
  "version": "1.0.0",
  "generatedAt": "2026-08-10T00:00:00.000Z",
  "generatedBy": "coding-agent",
  "evidenceRegime": "authored-development-fixtures",
  "scope": "small inspectable examples for smoke tests, tutorials, and reasoning regression",
  "examples": [
    {
      "input": "Jhon is a man. Is Jhon going to die?",
      "answer": "Yes.",
      "reasoning": "three-step deduction from a session fact"
    },
    {
      "input": "Can Tree grow?",
      "answer": "Yes.",
      "reasoning": "plant to living-being to capability"
    },
    {
      "input": "Where is Moon?",
      "answer": "Moon is in Solar System.",
      "reasoning": "direct retrieval"
    },
    {
      "input": "What color is water?",
      "answer": "water is colorless.",
      "reasoning": "direct retrieval"
    },
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
    },
    {
      "input": "Is Mars a planet?",
      "answer": "Yes.",
      "reasoning": "direct category fact"
    },
    {
      "input": "Where is Neptune?",
      "answer": "Neptune is in Solar System.",
      "reasoning": "direct location fact"
    },
    {
      "input": "What color is Mars?",
      "answer": "Mars is red.",
      "reasoning": "direct attribute fact"
    },
    {
      "input": "What is north of Africa?",
      "answer": "Europe is north of Africa.",
      "reasoning": "broad directional relation"
    }
  ],
  "benchmarkEligible": false
}), entities, facts, rules, lexicon: language, reasoning, indexes });
export default model;
