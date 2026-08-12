import {
  DEFAULT_GENERATED_HEURISTIC_BENCHMARK_SIZE,
  generateHeuristicBenchmarkCases,
  generatedHeuristicBenchmarkDefinition,
} from './evaluation/generated-heuristic-cases.mjs';

export const REGRESSION_SMOKE_SEED = 'stage-a-regression-v2';
export const LONG_STRESS_SEED = 'stage-a-stress-v1';
export const REGRESSION_SMOKE_CATALOG_SIZE = 4096;
export const SMOKE_EXAMPLES_PER_PAGE = 24;

const MAXIMUM_SMOKE_CASES = 100_000;
const MAXIMUM_HEURISTIC_GENERATOR_BATCH = 20_000;

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
  smokeCase('atomic-1', 'ATOMIC source package', 'Why might apologize?', 'atomic-2020', 'DEFEASIBLE'),
  smokeCase('atomic-2', 'ATOMIC source package', 'What might happen after PersonX apologizes profusely?', 'atomic-2020', 'DEFEASIBLE'),
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

const CORE_TEMPLATES = Object.freeze([
  {
    id: 'class-direct-question', group: 'class membership', relation: 'rename entity and class',
    sourceFamilies: ['babi', 'simpleqa'],
    build: ({ name, className }) => ({
      input: `${name} is a ${className}. Is ${name} a ${className}?`, expectedStatus: 'SOLVED', expectedValues: [true],
    }),
  },
  {
    id: 'class-belongs-paraphrase', group: 'class membership', relation: 'paraphrase assertion and question',
    sourceFamilies: ['babi', 'simpleqa'],
    build: ({ name, className }) => ({
      input: `${name} belongs to the ${className} class. Does ${name} belong to the ${className} class?`,
      expectedStatus: 'SOLVED', expectedValues: [true],
    }),
  },
  {
    id: 'class-classified-paraphrase', group: 'class membership', relation: 'change surface construction',
    sourceFamilies: ['babi', 'simpleqa'],
    build: ({ name, className }) => ({
      input: `${name} is classified as a ${className}. Would you classify ${name} as a ${className}?`,
      expectedStatus: 'SOLVED', expectedValues: [true],
    }),
  },
  {
    id: 'class-category-inverse', group: 'class membership', relation: 'invert category phrasing',
    sourceFamilies: ['babi', 'simpleqa'],
    build: ({ name, className }) => ({
      input: `${name} is one of the ${className}s. Does the ${className}s category include ${name}?`,
      expectedStatus: 'SOLVED', expectedValues: [true],
    }),
  },
  {
    id: 'class-description', group: 'class retrieval', relation: 'change Boolean goal to value retrieval',
    sourceFamilies: ['simpleqa'],
    build: ({ name, className }) => ({
      input: `The category of ${name} is ${className}. How is ${name} classified?`,
      expectedStatus: 'SOLVED', expectedValues: [className],
    }),
  },
  {
    id: 'location-direct-question', group: 'location retrieval', relation: 'rename entity and place',
    sourceFamilies: ['babi', 'entityTracking'],
    build: ({ name, placeA }) => ({
      input: `${name} is in ${placeA}. Where is ${name}?`, expectedStatus: 'SOLVED', expectedValues: [placeA],
    }),
  },
  {
    id: 'location-found-paraphrase', group: 'location retrieval', relation: 'paraphrase assertion and WH question',
    sourceFamilies: ['babi', 'entityTracking'],
    build: ({ name, placeA }) => ({
      input: `${name} can be found in ${placeA}. Where can I find ${name}?`,
      expectedStatus: 'SOLVED', expectedValues: [placeA],
    }),
  },
  {
    id: 'location-containment-paraphrase', group: 'location retrieval', relation: 'reverse containment question',
    sourceFamilies: ['babi', 'entityTracking'],
    build: ({ name, placeA }) => ({
      input: `${name} stays in ${placeA}. Which place contains ${name}?`,
      expectedStatus: 'SOLVED', expectedValues: [placeA],
    }),
  },
  {
    id: 'location-movement-verb', group: 'state transitions', relation: 'replace static assertion with movement event',
    sourceFamilies: ['babi', 'entityTracking', 'storyCloze'],
    build: ({ name, placeA }) => ({
      input: `${name} traveled to ${placeA}. In which place is ${name} located?`,
      expectedStatus: 'SOLVED', expectedValues: [placeA],
    }),
  },
  {
    id: 'location-last-state', group: 'state transitions', relation: 'append a later state that replaces the first',
    sourceFamilies: ['babi', 'entityTracking', 'storyCloze'],
    build: ({ name, placeA, placeB }) => ({
      input: `${name} moved to ${placeA}. ${name} journeyed to ${placeB}. Where is ${name}?`,
      expectedStatus: 'SOLVED', expectedValues: [placeB],
    }),
  },
  {
    id: 'carried-object-follows-holder', group: 'state transitions', relation: 'compose acquisition with movement',
    sourceFamilies: ['babi', 'entityTracking', 'storyCloze'],
    build: ({ name, placeA, placeB, object }) => ({
      input: `${name} moved to ${placeA}. ${name} grabbed the ${object}. ${name} journeyed to ${placeB}. Where is the ${object}?`,
      expectedStatus: 'SOLVED', expectedValues: [placeB],
    }),
  },
  {
    id: 'temporal-predecessor', group: 'temporal state', relation: 'query the state immediately before a boundary',
    sourceFamilies: ['babi', 'entityTracking', 'storyCloze'],
    build: ({ name, placeA, placeB, placeC, object }) => ({
      input: `${name} moved to ${placeA}. ${name} took the ${object}. ${name} traveled to ${placeB}. ${name} moved to ${placeC}. Where was the ${object} before ${placeC}?`,
      expectedStatus: 'SOLVED', expectedValues: [placeB],
    }),
  },
  {
    id: 'possession-direct-question', group: 'possession', relation: 'rename owner and object',
    sourceFamilies: ['babi', 'entityTracking'],
    build: ({ name, object }) => ({
      input: `${name} owns a ${object}. What does ${name} own?`, expectedStatus: 'SOLVED', expectedValues: [object],
    }),
  },
  {
    id: 'possession-carrying-paraphrase', group: 'possession', relation: 'replace ownership with supported carrying surface',
    sourceFamilies: ['babi', 'entityTracking'],
    build: ({ name, object }) => ({
      input: `${name} carries the ${object}. What is ${name} carrying?`,
      expectedStatus: 'SOLVED', expectedValues: [object],
    }),
  },
  {
    id: 'possession-belongs-inverse', group: 'possession', relation: 'reverse subject and object surface order',
    sourceFamilies: ['babi', 'entityTracking'],
    build: ({ name, object }) => ({
      input: `The ${object} belongs to ${name}. Which object belongs to ${name}?`,
      expectedStatus: 'SOLVED', expectedValues: [object],
    }),
  },
  {
    id: 'owner-retrieval', group: 'possession', relation: 'change object query into owner query',
    sourceFamilies: ['babi', 'entityTracking'],
    build: ({ name, object }) => ({
      input: `${name} has the ${object}. Who owns the ${object}?`,
      expectedStatus: 'SOLVED', expectedValues: [name.toLocaleLowerCase('en-US')],
    }),
  },
  {
    id: 'ability-direct-question', group: 'ability', relation: 'rename actor and action',
    sourceFamilies: ['ewok', 'simpleqa'],
    build: ({ name, action }) => ({
      input: `${name} can ${action}. Can ${name} ${action}?`, expectedStatus: 'SOLVED', expectedValues: [true],
    }),
  },
  {
    id: 'ability-able-paraphrase', group: 'ability', relation: 'replace modal with able-to construction',
    sourceFamilies: ['ewok', 'simpleqa'],
    build: ({ name, action }) => ({
      input: `${name} is able to ${action}. Is ${name} able to ${action}?`,
      expectedStatus: 'SOLVED', expectedValues: [true],
    }),
  },
  {
    id: 'ability-nominal-paraphrase', group: 'ability', relation: 'replace modal with nominal ability construction',
    sourceFamilies: ['ewok', 'simpleqa'],
    build: ({ name, action }) => ({
      input: `${name} has the ability to ${action}. Is ${action} something ${name} can do?`,
      expectedStatus: 'SOLVED', expectedValues: [true],
    }),
  },
  {
    id: 'horn-every-fears', group: 'safe Horn deduction', relation: 'instantiate a universally phrased rule',
    sourceFamilies: ['babi', 'clutrr'],
    build: ({ name, className, targetClass }) => ({
      input: `Every ${className} fears ${targetClass}s. ${name} is a ${className}. What does ${name} fear?`,
      expectedStatus: 'SOLVED', expectedValues: [targetClass],
    }),
  },
  {
    id: 'horn-all-fear', group: 'safe Horn deduction', relation: 'paraphrase the universal rule and query',
    sourceFamilies: ['babi', 'clutrr'],
    build: ({ name, className, targetClass }) => ({
      input: `All ${className}s fear ${targetClass}s. ${name} belongs to the ${className} class. Who does ${name} fear?`,
      expectedStatus: 'SOLVED', expectedValues: [targetClass],
    }),
  },
  {
    id: 'unknown-location', group: 'open-world controls', relation: 'remove the location premise',
    sourceFamilies: ['babi', 'simpleqa'],
    build: ({ name, className }) => ({
      input: `${name} is a ${className}. Where is ${name}?`, expectedStatus: 'UNKNOWN', expectedValues: [],
    }),
  },
  {
    id: 'preference-repetition', group: 'grammatical preference', relation: 'introduce adjacent-word repetition',
    sourceFamilies: ['blimp'],
    build: ({ name }) => ({
      kind: 'preference', good: `Where is ${name}?`, bad: `Where where is ${name}?`,
      input: `Compare “Where is ${name}?” with an adjacent-word repetition.`, expectedStatus: 'SCORED',
    }),
  },
  {
    id: 'preference-copula-order', group: 'grammatical preference', relation: 'scramble copula order',
    sourceFamilies: ['blimp'],
    build: ({ name, className }) => ({
      kind: 'preference', good: `Is ${name} a ${className}?`, bad: `${className} ${name} is is?`,
      input: `Compare a regular copula question about ${name} with a scrambled copula order.`, expectedStatus: 'SCORED',
    }),
  },
  {
    id: 'boolean-entailment-chain', group: 'scalable Boolean entailment',
    relation: 'rename every atom while preserving a multi-step implication chain',
    sourceFamilies: ['logicbench', 'prontoqa'],
    build: ({ serial }) => {
      const ids = Array.from({ length: 12 }, (_, index) => `nonce:${serial}:p${index}`);
      const atom = (id) => ({ operator: 'atom', id });
      return {
        kind: 'task',
        input: `Typed task: ${ids[0]} is true and eleven nonce implications must entail ${ids.at(-1)}.`,
        taskFrame: {
          operation: 'decide-boolean-entailment', taskId: `smoke:boolean:${serial}`,
          premises: [atom(ids[0]), ...ids.slice(0, -1).map((id, index) => ({
            operator: 'implies', left: atom(id), right: atom(ids[index + 1]),
          }))],
          query: atom(ids.at(-1)), inconsistencyPolicy: 'report',
        },
        expectedStatus: 'SOLVED', expectedValues: [true],
      };
    },
  },
  {
    id: 'categorical-subalternation', group: 'categorical logic',
    relation: 'rename both terms while preserving traditional existential import',
    sourceFamilies: ['iibench', 'logicskills'],
    build: ({ serial }) => {
      const term = (value) => ({ term: value, canonical: value, negationDepth: 0 });
      const subject = `subject-${serial}`;
      const predicate = `predicate-${serial}`;
      return {
        kind: 'task',
        input: `Typed task: under traditional existential import, test whether All ${subject} are ${predicate} entails Some ${subject} are ${predicate}.`,
        taskFrame: {
          operation: 'judge-categorical-opposition', taskId: `smoke:categorical:${serial}`,
          premise: { form: 'A', subject: term(subject), predicate: term(predicate) },
          candidate: { form: 'I', subject: term(subject), predicate: term(predicate) },
        },
        expectedStatus: 'SOLVED', expectedValues: ['True'],
      };
    },
  },
]);

function generatedCoreCase(index, seed) {
  const serial = `${index.toString(36)}${(hash(`${seed}:${index}`) % 1296).toString(36).padStart(2, '0')}`;
  const name = `Talvora${serial}`;
  const className = `marn${serial}q`;
  const targetClass = `vel${serial}q`;
  const placeA = `chamber${serial}a`;
  const placeB = `chamber${serial}b`;
  const placeC = `chamber${serial}c`;
  const object = `token${serial}`;
  const action = `glide${serial}`;
  const template = CORE_TEMPLATES[index % CORE_TEMPLATES.length];
  return Object.freeze({
    id: `generated-${index + 1}`, group: template.group, templateId: template.id,
    metamorphicRelation: template.relation, kb: 'base', generated: true,
    catalogKind: 'core-regression', contractLevel: 'core-execution',
    sourceFamilies: template.sourceFamilies,
    ...template.build({ serial, name, className, targetClass, placeA, placeB, placeC, object, action }),
  });
}

const HEURISTIC_TECHNIQUE_IDENTITIES = Object.freeze(Object.fromEntries(
  generatedHeuristicBenchmarkDefinition().techniques.map((item) => [item.technique, item.id]),
));

function heuristicCountFor(size) {
  if (size === REGRESSION_SMOKE_CATALOG_SIZE) return DEFAULT_GENERATED_HEURISTIC_BENCHMARK_SIZE;
  return Math.min(size, Math.max(1, Math.round(
    size * DEFAULT_GENERATED_HEURISTIC_BENCHMARK_SIZE / REGRESSION_SMOKE_CATALOG_SIZE,
  )));
}

function heuristicGeneratorSeed(seed, batch) {
  const prefix = seed.slice(0, 72);
  return `${prefix}:smoke-heuristic:${hash(seed).toString(16)}:${batch}`;
}

function generatedHeuristicSmokeCases(size, seed) {
  const output = [];
  for (let offset = 0, batch = 0; offset < size; batch += 1) {
    const count = Math.min(MAXIMUM_HEURISTIC_GENERATOR_BATCH, size - offset);
    const generated = generateHeuristicBenchmarkCases({
      size: count,
      seed: heuristicGeneratorSeed(seed, batch),
    });
    for (const [batchIndex, item] of generated.entries()) {
      output.push(Object.freeze({
        ...item,
        id: `smoke-heuristic-${String(offset + batchIndex + 1).padStart(5, '0')}`,
        group: `heuristic ${item.oracle.oracleLevel}`,
        templateId: HEURISTIC_TECHNIQUE_IDENTITIES[item.technique] ?? item.technique,
        metamorphicRelation: `${item.technique}; ${item.targetFamily}`,
        kb: 'base',
        generated: true,
        catalogKind: 'heuristic-language',
        contractLevel: item.oracle.oracleLevel,
        sourceFamilies: Object.freeze(['heuristicLanguage']),
      }));
    }
    offset += count;
  }
  return output;
}

function interleaveCatalog(heuristic, core) {
  const size = heuristic.length + core.length;
  const result = [];
  let heuristicIndex = 0;
  let coreIndex = 0;
  for (let index = 0; index < size; index += 1) {
    const shouldTakeHeuristic = Math.floor((index + 1) * heuristic.length / size)
      > Math.floor(index * heuristic.length / size);
    if (shouldTakeHeuristic && heuristicIndex < heuristic.length) {
      result.push(heuristic[heuristicIndex]);
      heuristicIndex += 1;
    } else {
      result.push(core[coreIndex]);
      coreIndex += 1;
    }
  }
  return result;
}

export function regressionSmokeCases({
  size = REGRESSION_SMOKE_CATALOG_SIZE, seed = REGRESSION_SMOKE_SEED,
} = {}) {
  if (!Number.isSafeInteger(size) || size < 1 || size > MAXIMUM_SMOKE_CASES) {
    throw new Error('Smoke size must be an integer from 1 to 100000.');
  }
  if (typeof seed !== 'string' || seed.length < 1 || seed.length > 128) {
    throw new Error('Smoke seed must be a string from 1 to 128 characters.');
  }
  const heuristicCount = heuristicCountFor(size);
  const coreCount = size - heuristicCount;
  const offset = hash(seed) % REGRESSION_SMOKE_CATALOG_SIZE;
  const heuristic = generatedHeuristicSmokeCases(heuristicCount, seed);
  const core = Array.from({ length: coreCount }, (_, index) =>
    generatedCoreCase((offset + index) % Math.max(coreCount, REGRESSION_SMOKE_CATALOG_SIZE), seed));
  return Object.freeze(interleaveCatalog(heuristic, core));
}

function countBy(cases, selector) {
  const counts = new Map();
  for (const item of cases) {
    const key = selector(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts].toSorted(([left], [right]) => left.localeCompare(right)));
}

export function stratifiedSmokeCases(cases) {
  const buckets = new Map();
  for (const item of cases) {
    const stratum = item.catalogKind === 'heuristic-language'
      ? `heuristic:${item.oracle.oracleLevel}`
      : `core:${item.group}`;
    buckets.set(stratum, [...(buckets.get(stratum) ?? []), item]);
  }
  const orderedBuckets = [...buckets.entries()].toSorted(([left], [right]) => left.localeCompare(right));
  const output = [];
  for (let depth = 0; output.length < cases.length; depth += 1) {
    for (const [, bucket] of orderedBuckets) {
      if (bucket[depth]) output.push(bucket[depth]);
    }
  }
  return Object.freeze(output);
}

export function summarizeSmokeCases(cases) {
  const heuristic = cases.filter((item) => item.catalogKind === 'heuristic-language');
  const core = cases.filter((item) => item.catalogKind === 'core-regression');
  return Object.freeze({
    format: 'eslm-smoke-catalog-summary-v2', total: cases.length,
    templateCount: new Set(cases.map((item) => `${item.catalogKind}:${item.templateId}`)).size,
    heuristicTechniqueCount: new Set(heuristic.map((item) => item.technique)).size,
    coreTemplateCount: new Set(core.map((item) => item.templateId)).size,
    catalogKinds: countBy(cases, (item) => item.catalogKind),
    oracleLevels: countBy(heuristic, (item) => item.oracle.oracleLevel),
    groups: countBy(cases, (item) => item.group),
    sourceFamilies: Object.fromEntries([
      'blimp', 'babi', 'clutrr', 'entityTracking', 'ewok', 'storyCloze', 'simpleqa',
      'logicbench', 'iibench', 'prontoqa', 'logicskills', 'heuristicLanguage',
    ]
      .map((family) => [family, cases.filter((item) => item.sourceFamilies.includes(family)).length])),
  });
}

export function smokeCatalogSummary(size = REGRESSION_SMOKE_CATALOG_SIZE, seed = REGRESSION_SMOKE_SEED) {
  return summarizeSmokeCases(regressionSmokeCases({ size, seed }));
}

export function longConversationStressCases(size = 1000, seed = LONG_STRESS_SEED) {
  return regressionSmokeCases({ size, seed }).map((item, index) => Object.freeze({ ...item, id: `stress-${index + 1}` }));
}
