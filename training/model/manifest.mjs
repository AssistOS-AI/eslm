import entities from './entities.mjs';
import facts from './facts.mjs';
import indexes from './indexes.mjs';
import language from './language.mjs';
import reasoning from './reasoning.mjs';
import rules from './rules.mjs';

export const model = Object.freeze({
  manifest: Object.freeze({
    format: 'eslm-code-model-v1',
    modelId: 'babi-15+16-en-10k-v1.2',
    generatedAt: '2026-08-10T00:00:00.000Z',
    sourceDigest: 'edf87945fde73c7a8cb7dce6907486056e2f75c720d0ddaf3a81bb87734eab35',
    evidenceRegime: 'babi-tasks-15-and-16-train-only',
  }),
  entities,
  facts,
  rules,
  lexicon: language,
  reasoning,
  indexes,
});

export default model;
