import entities from './entities.mjs';
import facts from './facts.mjs';
import indexes from './indexes.mjs';
import language from './language.mjs';
import reasoning from './reasoning.mjs';
import rules from './rules.mjs';

export const model = Object.freeze({ manifest: Object.freeze({
  "format": "eslm-code-model-v1",
  "modelId": "space-geography",
  "title": "Solar system and broad geography",
  "version": "1.0.0",
  "generatedAt": "2026-08-10T00:00:00.000Z",
  "generatedBy": "coding-agent",
  "sourceDigest": "f1ec8698da0010bf983a2dd2a17b40e9798c508565187c766bce18e6edd27fd9",
  "evidenceRegime": "generated-educational-kb",
  "benchmarkEligible": false,
  "scope": "Elementary Solar System membership and deliberately broad continent-scale spatial relations. Direction claims are coarse educational relations, not geometric boundaries.",
  "examples": [
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
  ]
}), entities, facts, rules, lexicon: language, reasoning, indexes });
export default model;
