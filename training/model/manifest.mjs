import entities from './entities.mjs';
import facts from './facts.mjs';
import indexes from './indexes.mjs';
import language from './language.mjs';
import reasoning from './reasoning.mjs';
import rules from './rules.mjs';

export const model = Object.freeze({
  manifest: Object.freeze({
    format: 'eslm-code-model-v1',
    modelId: 'babi-15-en-10k-v1.2',
    generatedAt: '2026-08-10T00:00:00.000Z',
    sourceDigest: '149fd0cba766b19507dded58def9559bc53e54fdbf692055fbe57bda7380ffec',
    evidenceRegime: 'babi-task-15-train-only',
  }),
  entities,
  facts,
  rules,
  lexicon: language,
  reasoning,
  indexes,
});

export default model;
