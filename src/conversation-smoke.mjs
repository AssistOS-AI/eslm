export const REGRESSION_SMOKE_SEED = 'stage-a-regression-v1';
export const LONG_STRESS_SEED = 'stage-a-stress-v1';

function hash(value) {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.codePointAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function smokeCase(id, group, input, kb, expectedStatus, expectedValues, label = 'supported') {
  return Object.freeze({ id, group, input, kb, expectedStatus, expectedValues, label });
}

const BASE_CASES = Object.freeze([
  smokeCase('session-1', 'session assertions', 'Aster is a man. Is Aster a man?', 'base', 'SOLVED', [true]),
  smokeCase('session-2', 'session assertions', 'Bela is a navigator. Is Bela a navigator?', 'base', 'SOLVED', [true]),
  smokeCase('deduction-1', 'safe Horn deduction', 'Marns are afraid of wolves. Cora is a marn. What is Cora afraid of?', 'base', 'SOLVED', ['wolf']),
  smokeCase('deduction-2', 'safe Horn deduction', 'Zorbs are afraid of nels. Darin is a zorb. What does Darin fear?', 'base', 'SOLVED', ['nel']),
  smokeCase('quick-1', 'declarative quick KB', 'Can Penguin swim?', 'quick', 'SOLVED', [true]),
  smokeCase('quick-2', 'declarative quick KB', 'Is Penguin a bird?', 'quick', 'SOLVED', [true]),
  smokeCase('quick-3', 'declarative quick KB', 'Niko is a man. Is Niko going to die?', 'quick', 'SOLVED', [true]),
  smokeCase('wordnet-1', 'WordNet source package', 'Define dog', 'oewn-2025', 'SOLVED'),
  smokeCase('wordnet-2', 'WordNet source package', 'Is a dog an animal?', 'oewn-2025', 'SOLVED', [true]),
  smokeCase('wordnet-3', 'WordNet source package', 'Give me synonyms for bird', 'oewn-2025', 'SOLVED'),
  smokeCase('atomic-1', 'ATOMIC source package', 'Why might apologize?', 'atomic-2020', 'SOLVED'),
  smokeCase('atomic-2', 'ATOMIC source package', 'What might happen after PersonX apologizes profusely?', 'atomic-2020', 'SOLVED'),
  smokeCase('limit-1', 'honest limits', 'Compose a poem about Aster', 'base', 'UNPARSED', undefined, 'unsupported'),
  smokeCase('limit-2', 'honest limits', 'Browse the live web for Aster', 'base', 'UNPARSED', undefined, 'unsupported'),
  smokeCase('unknown-1', 'missing knowledge', 'Can Dana fly?', 'base', 'UNKNOWN', [], 'unknown by design'),
]);

export function conversationShape(input) {
  return input.normalize('NFKC').toLocaleLowerCase('en-US')
    .replace(/[\p{L}\p{N}-]+/gu, '$').replace(/\s+/gu, ' ').trim();
}

export function smokeExamples({ seed = REGRESSION_SMOKE_SEED, maxPerGroup = 2 } = {}) {
  const groups = new Map();
  for (const item of BASE_CASES) groups.set(item.group, [...(groups.get(item.group) ?? []), item]);
  const selected = [];
  for (const [group, cases] of groups) {
    const offset = hash(`${seed}:${group}`) % cases.length;
    for (let index = 0; index < Math.min(maxPerGroup, cases.length); index += 1) {
      selected.push(cases[(offset + index) % cases.length]);
    }
  }
  return Object.freeze(selected);
}

export function longConversationStressCases(size = 1000, seed = LONG_STRESS_SEED) {
  const cases = [];
  for (let index = 0; index < size; index += 1) {
    const template = BASE_CASES[(hash(`${seed}:${index}`) + index) % BASE_CASES.length];
    cases.push(Object.freeze({ ...template, id: `stress-${index + 1}` }));
  }
  return Object.freeze(cases);
}
