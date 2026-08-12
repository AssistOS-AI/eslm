import { directCoreMemorySnapshot } from '../../src/runtime/result-contract.mjs';

export function textResult(overrides = {}) {
  return {
    protocol: 'eslm-runtime-result-v1', status: 'UNKNOWN', answer: 'unknown',
    languageRoute: 'direct-symbolic', values: [], provenance: [],
    usedKbVersions: [], selectedKbVersions: [], consultedKbVersions: [],
    unresolvedSubgoals: [], model: { id: 'model:test', memory: directCoreMemorySnapshot() },
    context: { session: { entities: [], facts: [], rules: [], history: [] } },
    episode: { original: 'What is a narl?', segments: ['What is a narl?'], unsupportedStatements: [] },
    ...overrides,
  };
}
