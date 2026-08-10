import entities from './entities.mjs';
import facts from './facts.mjs';
import indexes from './indexes.mjs';
import language from './language.mjs';
import reasoning from './reasoning.mjs';
import rules from './rules.mjs';

export const model = Object.freeze({ manifest: Object.freeze({
  "format": "eslm-code-model-v1",
  "modelId": "child-basic",
  "title": "Child-level common knowledge",
  "version": "1.0.0",
  "generatedAt": "2026-08-10T00:00:00.000Z",
  "generatedBy": "coding-agent",
  "sourceDigest": "cd2792379526aad9a9e2d96827f3efb4fac2c16e01081cf8d6c2d7990c2cd658",
  "evidenceRegime": "generated-educational-kb",
  "benchmarkEligible": false,
  "scope": "A deliberately small set of stable category, location, color, life, growth, and mortality claims suitable for elementary demonstrations. It is not an encyclopedia.",
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
    }
  ]
}), entities, facts, rules, lexicon: language, reasoning, indexes });
export default model;
