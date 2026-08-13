export const DEFAULT_CODEX_NORMALIZATION_MODEL = 'gpt-5.3-codex-spark';
export const LANGUAGE_AGENT_NORMALIZATION_PROTOCOL = 'eslm-language-agent-normalization-v2';
export const LANGUAGE_AGENT_NORMALIZATION_POLICY = 'language-agent-language-only-v5';
export const CODEX_NORMALIZATION_PROTOCOL = LANGUAGE_AGENT_NORMALIZATION_PROTOCOL;
export const CODEX_NORMALIZATION_POLICY = LANGUAGE_AGENT_NORMALIZATION_POLICY;
export const CODEX_NORMALIZATION_VALIDATOR = 'protected-semantic-anchors-v5';

export const MAX_NORMALIZATION_INPUT_CHARACTERS = 12_000;
export const MAX_NORMALIZATION_OUTPUT_CHARACTERS = 24_000;
export const NORMALIZATION_ANCHOR_KINDS = Object.freeze([
  'named-entity', 'number', 'answer-option', 'quoted-material', 'interrogative', 'lexical-content',
  'negation', 'quantifier', 'modality', 'conditional', 'temporal', 'conjunction', 'disjunction',
  'comparison', 'directed-relation',
]);

export const CODEX_NORMALIZATION_RESPONSE_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['protocol', 'operation', 'sourceLanguage', 'normalizedEnglish', 'alignments'],
  properties: {
    protocol: { type: 'string', const: CODEX_NORMALIZATION_PROTOCOL },
    operation: { type: 'string', enum: ['translation', 'simplification'] },
    sourceLanguage: {
      type: 'string', minLength: 2, maxLength: 35, pattern: '^[A-Za-z][A-Za-z0-9-]*$',
    },
    normalizedEnglish: {
      type: 'string', minLength: 1, maxLength: MAX_NORMALIZATION_OUTPUT_CHARACTERS,
    },
    alignments: {
      type: 'array',
      maxItems: 256,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'source', 'target'],
        properties: {
          kind: { type: 'string', enum: NORMALIZATION_ANCHOR_KINDS },
          source: { type: 'string', minLength: 1, maxLength: 256 },
          target: { type: 'string', minLength: 1, maxLength: 256 },
        },
      },
    },
  },
});
