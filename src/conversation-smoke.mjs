const PEOPLE = Object.freeze([
  'Aster', 'Bela', 'Cora', 'Darin', 'Elin', 'Faron', 'Gita', 'Hale', 'Iris', 'Jorin',
  'Kara', 'Leto', 'Mina', 'Nolan', 'Orin', 'Pia', 'Quin', 'Rhea', 'Soren', 'Tala',
]);
const PLACES = Object.freeze(['Atrium', 'Library', 'Garden', 'Workshop', 'Harbor', 'Gallery', 'Station', 'Archive']);
const CLASSES = Object.freeze(['voyager', 'keeper', 'navigator', 'artisan', 'scholar', 'warden', 'pilot', 'healer']);

export const REGRESSION_SMOKE_SEED = 'conversation-regression-v2';
export const LONG_STRESS_SEED = 'conversation-stress-v2';

function seedOffset(seed, label, length) {
  let hash = 2166136261;
  for (const character of `${seed}:${label}`) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % length;
}

function seededItem(values, index, seed, label, stride = 1) {
  return values[(seedOffset(seed, label, values.length) + index * stride) % values.length];
}

function articleFor(value) {
  return /^[aeiou]/iu.test(value) ? 'an' : 'a';
}

const STRUCTURE_WORDS = new Set(`a an the is are was were be been being of to in at on for from with as
who what where which why how does do can could would will might may tell show explain define describe give
list count classify classified category class kind type one belongs belong include contains located find stays
occupies owns own has have carries carrying able ability color colored afraid fear fears going die eventually
likely mean means meant definition definitions synonym synonyms senses meanings words word similar alternative
before after effects effect lead occur required feel react want next prevent stop used found every all not no
please based loaded source knowledge lexical event if evidence thing object something`.split(/\s+/u));

export function conversationShape(input) {
  return input.normalize('NFKC').toLocaleLowerCase('en-US')
    .match(/[a-z]+|\d+|[?.!,;:]/gu)
    ?.map((token) => /^\d+$/u.test(token) ? '#' : STRUCTURE_WORDS.has(token) || /^[?.!,;:]$/u.test(token) ? token : '$')
    .join(' ').replace(/(?:\$ ){2,}/gu, '$ ') ?? '';
}

function smokeCase(id, group, input, expectedStatus, expectedValues, kb = 'base', example = false) {
  return Object.freeze({ id, group, input, kb, expectedStatus, expectedValues, example });
}

const classificationStatements = Object.freeze([
  (name, kind) => `${name} is ${articleFor(kind)} ${kind}.`,
  (name, kind) => `${name} belongs to the ${kind} class.`,
  (name, kind) => `${name} is classified as ${articleFor(kind)} ${kind}.`,
  (name, kind) => `${name} is one of the ${kind}s.`,
  (name, kind) => `The category of ${name} is ${kind}.`,
]);
const membershipQuestions = Object.freeze([
  (name, kind) => `Is ${name} ${articleFor(kind)} ${kind}?`,
  (name, kind) => `Does ${name} belong to the ${kind} class?`,
  (name, kind) => `Is ${name} classified as ${articleFor(kind)} ${kind}?`,
  (name, kind) => `Would you classify ${name} as ${articleFor(kind)} ${kind}?`,
  (name, kind) => `Does the ${kind} category include ${name}?`,
]);
const descriptionQuestions = Object.freeze([
  (name) => `Who is ${name}?`,
  (name) => `What is ${name}?`,
  (name) => `What kind of thing is ${name}?`,
  (name) => `Which class does ${name} belong to?`,
  (name) => `How is ${name} classified?`,
]);
const locationStatements = Object.freeze([
  (name, place) => `${name} is in ${place}.`,
  (name, place) => `${name} is located at ${place}.`,
  (name, place) => `${name} can be found in ${place}.`,
  (name, place) => `${name} stays at ${place}.`,
  (name, place) => `${name} occupies ${place}.`,
]);
const locationQuestions = Object.freeze([
  (name) => `Where is ${name}?`,
  (name) => `Where can I find ${name}?`,
  (name) => `Where is ${name} located?`,
  (name) => `In which place is ${name}?`,
  (name) => `Which place contains ${name}?`,
]);
const ownershipStatements = Object.freeze([
  (name, object) => `${name} owns a ${object}.`,
  (name, object) => `${name} has the ${object}.`,
  (name, object) => `The ${object} belongs to ${name}.`,
  (name, object) => `${name} carries a ${object}.`,
]);
const possessionQuestions = Object.freeze([
  (name) => `What does ${name} own?`,
  (name) => `What does ${name} have?`,
  (name) => `Which object belongs to ${name}?`,
  (name) => `What is ${name} carrying?`,
]);
const capabilityStatements = Object.freeze([
  (name, action) => `${name} can ${action}.`,
  (name, action) => `${name} is able to ${action}.`,
  (name, action) => `${name} has the ability to ${action}.`,
]);
const capabilityQuestions = Object.freeze([
  (name, action) => `Can ${name} ${action}?`,
  (name, action) => `Is ${name} able to ${action}?`,
  (name, action) => `Does ${name} have the ability to ${action}?`,
  (name, action) => `Is ${action} something ${name} can do?`,
]);
const propertyStatements = Object.freeze([
  (name, value) => `${name} is ${value}.`,
  (name, value) => `${name} has color ${value}.`,
  (name, value) => `${name} is colored ${value}.`,
  (name, value) => `The color of ${name} is ${value}.`,
]);
const colorQuestions = Object.freeze([
  (name) => `What color is ${name}?`,
  (name) => `Which color is ${name}?`,
  (name) => `What is the color of ${name}?`,
  (name) => `Tell me the color of ${name}.`,
]);

function addCrossProduct(cases, definition) {
  for (let index = 0; index < definition.count; index += 1) {
    const name = seededItem(PEOPLE, index, definition.seed, `${definition.id}:people`);
    const value = seededItem(definition.values, index, definition.seed, `${definition.id}:values`, 3);
    const statement = seededItem(definition.statements, index, definition.seed, `${definition.id}:statements`)(name, value);
    const question = seededItem(definition.questions, Math.floor(index / definition.statements.length), definition.seed, `${definition.id}:questions`)(name, value);
    cases.push(smokeCase(
      `${definition.id}-${index + 1}`, definition.group, `${statement} ${question}`,
      definition.status ?? 'ANSWERED', definition.expected(value), definition.kb ?? 'base', index < definition.exampleCount,
    ));
  }
}

export function conversationSmokeCases(options = {}) {
  const seed = String(options.seed ?? REGRESSION_SMOKE_SEED);
  const cases = [];
  addCrossProduct(cases, {
    seed,
    id: 'membership', group: 'classification and membership', count: 25, exampleCount: 5,
    values: CLASSES, statements: classificationStatements, questions: membershipQuestions,
    expected: () => [true],
  });
  for (let index = 0; index < 20; index += 1) {
    const name = seededItem(PEOPLE, index, seed, 'description:people');
    const kind = seededItem(CLASSES, index, seed, 'description:classes', 3);
    cases.push(smokeCase(
      `description-${index + 1}`, 'entity descriptions',
      `${seededItem(classificationStatements, index, seed, 'description:statements')(name, kind)} ${seededItem(descriptionQuestions, index, seed, 'description:questions', 2)(name)}`,
      'ANSWERED', [kind], 'base', index < 5,
    ));
  }
  for (let index = 0; index < 25; index += 1) {
    const name = seededItem(PEOPLE, index, seed, 'location:people');
    const place = seededItem(PLACES, index, seed, 'location:places', 3);
    cases.push(smokeCase(
      `location-${index + 1}`, 'spatial statements and questions',
      `${seededItem(locationStatements, index, seed, 'location:statements')(name, place)} ${seededItem(locationQuestions, Math.floor(index / locationStatements.length), seed, 'location:questions')(name)}`,
      'ANSWERED', [place.toLocaleLowerCase('en-US')], 'base', index < 5,
    ));
  }
  for (let index = 0; index < 16; index += 1) {
    const name = seededItem(PEOPLE, index, seed, 'possession:people');
    const object = seededItem(['compass', 'lantern', 'notebook', 'telescope'], index, seed, 'possession:objects');
    cases.push(smokeCase(
      `possession-${index + 1}`, 'possession and inverse phrasing',
      `${seededItem(ownershipStatements, index, seed, 'possession:statements')(name, object)} ${seededItem(possessionQuestions, Math.floor(index / ownershipStatements.length), seed, 'possession:questions')(name)}`,
      'ANSWERED', [object], 'base', index < 4,
    ));
  }
  addCrossProduct(cases, {
    seed,
    id: 'capability', group: 'abilities', count: 12, exampleCount: 4,
    values: ['swim', 'navigate', 'whistle', 'climb'], statements: capabilityStatements, questions: capabilityQuestions,
    expected: () => [true],
  });
  for (let index = 0; index < 16; index += 1) {
    const exemplar = `Exemplar${index}`;
    const target = seededItem(PEOPLE, index, seed, 'induction:people');
    const kind = `zorb${index}`;
    const color = ['green', 'white', 'gray', 'yellow'][index % 4];
    cases.push(smokeCase(
      `induction-${index + 1}`, 'configured class-property induction',
      `${seededItem(classificationStatements, index, seed, 'induction:statement-a')(exemplar, kind)} ${seededItem(propertyStatements, index, seed, 'induction:properties')(exemplar, color)} ${seededItem(classificationStatements, index + 2, seed, 'induction:statement-b')(target, kind)} ${seededItem(colorQuestions, index, seed, 'induction:questions')(target)}`,
      'INDUCTIVE', [color], 'base', index < 4,
    ));
  }
  const fearRules = [
    (left, right) => `${left}s are afraid of ${right}s.`,
    (left, right) => `Every ${left} fears ${right}s.`,
    (left, right) => `All ${left}s fear ${right}s.`,
  ];
  const fearQuestions = [
    (name) => `What is ${name} afraid of?`,
    (name) => `What does ${name} fear?`,
    (name) => `Who does ${name} fear?`,
  ];
  for (let index = 0; index < 12; index += 1) {
    const name = seededItem(PEOPLE, index, seed, 'deduction:people');
    const left = `marn${index}`;
    const right = `vex${index}`;
    cases.push(smokeCase(
      `deduction-${index + 1}`, 'rule deduction',
      `${seededItem(fearRules, index, seed, 'deduction:rules')(left, right)} ${seededItem(classificationStatements, index, seed, 'deduction:statements')(name, left)} ${seededItem(fearQuestions, index, seed, 'deduction:questions')(name)}`,
      'ANSWERED', [right], 'base', index < 3,
    ));
  }
  const typoPairs = [
    ['Alxander', 'Alexander'], ['Micheal', 'Michael'], ['Jonathon', 'Jonathan'], ['Katarina', 'Katrina'], ['Sorctare', 'Socrate'],
    ['Ariadnne', 'Ariadne'], ['Marcell', 'Marcel'], ['Isabell', 'Isabel'], ['Theodor', 'Theodore'], ['Emmeline', 'Emeline'],
  ];
  typoPairs.forEach(([stated, asked], index) => cases.push(smokeCase(
    `proper-name-${index + 1}`, 'bounded proper-name tolerance',
    `${seededItem(classificationStatements, index, seed, 'names:statements')(stated, 'navigator')} ${seededItem(membershipQuestions, index, seed, 'names:questions')(asked, 'navigator')}`,
    'ANSWERED', [true], 'base', index < 5,
  )));
  [
    ['Who are you?', 'ANSWERED', ['eslm']], ['What are you?', 'ANSWERED', ['eslm']],
    ['Tell me who you are.', 'ANSWERED', ['eslm']], ['Who am I?', 'UNKNOWN', []],
    ['Do you know who I am?', 'UNKNOWN', []], ['What can you do?', 'ANSWERED'],
    ['What do you do?', 'ANSWERED'], ['Show me what you can do.', 'ANSWERED'],
    ['Who is an unknown visitor?', 'UNKNOWN'],
  ].forEach(([input, status, values], index) => cases.push(smokeCase(
    `conversation-${index + 1}`, 'conversation and epistemic boundaries', input, status, values, 'base', true,
  )));
  [
    ['Jhon is a man. Is Jhon going to die?', 'ANSWERED', [true]],
    ['Sorctare is a man. Will Socrate eventually die?', 'ANSWERED', [true]],
    ['Can Penguin swim?', 'ANSWERED', [true]],
    ['Is Penguin able to swim?', 'ANSWERED', [true]],
    ['Can Penguin fly?', 'UNKNOWN', []],
    ['Where is Neptune?', 'ANSWERED', ['solar-system']],
    ['Where is Neptune located?', 'ANSWERED', ['solar-system']],
    ['Does Neptune belong to the planet class?', 'ANSWERED', [true]],
  ].forEach(([input, status, values], index) => cases.push(smokeCase(
    `quick-${index + 1}`, 'QUICK fixture demonstrations', input, status, values, 'quick', true,
  )));
  const wordnetCases = [
    'Define dog', 'Please define cat.', 'Tell me what fox means.', 'Explain what bank means, please.',
    'What is the definition of tree?', 'Give me a definition of bird.', 'What is meant by fish?', 'Describe the word person.',
    'What are synonyms of dog?', 'Give me synonyms for fox.', 'Which words are similar to person?', 'What other words can mean book?',
    'List alternative words for car.', 'How many senses does bank have?', 'How many meanings does light have?',
    'Count the senses of time.', 'Is a dog an animal?', 'Is a cat a kind of animal?', 'Is a bird a type of animal?',
    'Does car belong to the vehicle category?', 'Can tree be classified as a plant?',
  ];
  wordnetCases.forEach((input, index) => cases.push(smokeCase(
    `wordnet-${index + 1}`, 'Open English WordNet queries', input, 'ANSWERED', undefined, 'oewn-2025', true,
  )));
  const atomicCases = [
    'Why might apologize?', 'Could you tell me why someone might apologize?',
    'What intention might motivate apologizing?', 'What reason could there be for PersonX apologizes profusely?',
    'What might happen after PersonX apologizes profusely?', 'What are possible effects of PersonX apologizes profusely?',
    'What could PersonX apologizes profusely lead to?', 'After PersonX apologizes profusely, what may occur?',
    'What might happen before PersonX apologizes profusely?', 'What might be required before PersonX apologizes profusely?',
    'How might PersonX feel after PersonX apologizes profusely?', 'How could PersonX react after PersonX apologizes profusely?',
    'What might PersonX want after PersonX apologizes profusely?', 'What might PersonX want next after PersonX apologizes profusely?',
    'What could prevent PersonX apologizes to PersonX s boss?', 'What might stop PersonX apologizes to PersonX s boss?',
  ];
  atomicCases.forEach((input, index) => cases.push(smokeCase(
    `atomic-${index + 1}`, 'ATOMIC defeasible event queries', input, 'ANSWERED', undefined, 'atomic-2020', true,
  )));
  [
    'Write a new poem.', 'Prove an arbitrary theorem.', 'Compose a symphony.', 'Translate an entire novel.',
    'Browse the live internet.', 'Predict tomorrow perfectly.', 'Deploy my application.', 'Read my private email.',
    'Generate a photorealistic image.', 'Solve every possible equation.', 'Book a flight for me.', 'Delete my files.',
    'Tell me a fact that is absent from every loaded source.', 'Guarantee the next event with certainty.',
  ].forEach((input, index) => cases.push(smokeCase(
    `limit-${index + 1}`, 'honest unsupported boundaries', input, 'UNSUPPORTED', undefined, 'base', index < 10,
  )));
  return Object.freeze(cases);
}

export function smokeExamples(options = {}) {
  const seed = String(options.seed ?? REGRESSION_SMOKE_SEED);
  const maximum = Number(options.maxPerGroup ?? 4);
  const selected = [];
  for (const [, group] of Map.groupBy(conversationSmokeCases({ seed }), (item) => item.group)) {
    const offset = seedOffset(seed, group[0].group, group.length);
    const candidates = group.map((_, index) => group[(offset + index) % group.length]);
    const finalShapes = new Set();
    for (const item of candidates) {
      const finalSegment = item.input.match(/[^.!?]+[.!?]?/gu)?.at(-1)?.trim() ?? item.input;
      const finalShape = conversationShape(finalSegment);
      if (finalShapes.has(finalShape)) continue;
      selected.push(item);
      finalShapes.add(finalShape);
      if (finalShapes.size >= Math.min(maximum, group.length)) break;
    }
    for (const item of candidates) {
      if (selected.includes(item) || selected.filter((candidate) => candidate.group === item.group).length >= Math.min(maximum, group.length)) continue;
      selected.push(item);
    }
  }
  return selected.map((item) => ({
    ...item,
    label: item.expectedStatus === 'UNSUPPORTED' ? 'unsupported'
      : item.expectedStatus === 'UNKNOWN' ? 'unknown by design'
        : item.kb === 'base' ? 'works' : `works with ${item.kb}`,
  }));
}

function longCase(index, group, input, expectedStatus, expectedValues, kb = 'base') {
  return smokeCase(`long-${index}`, group, input, expectedStatus, expectedValues, kb);
}

export function longConversationStressCases(size = 1000, options = {}) {
  if (!Number.isInteger(size) || size < 1000) throw new Error('Long conversation stress requires at least 1000 cases.');
  const seed = String(options.seed ?? LONG_STRESS_SEED);
  const cases = [];
  const add = (group, input, status, values, kb = 'base') => cases.push(longCase(cases.length + 1, group, input, status, values, kb));
  const distractors = [
    (i) => `Dara${i} is in Archive${i}. Bela${i} owns a token${i}.`,
    (i) => `Cora${i} can whistle. Dara${i} is a scholar${i}.`,
    (i) => `Bela${i} has the marker${i}. Cora${i} stays at Garden${i}.`,
    (i) => `The category of Dara${i} is observer${i}. Cora${i} is able to climb.`,
  ];
  for (let index = 0; index < 100; index += 1) {
    const name = `Aster${index}`;
    const kind = `voyager${index}`;
    const prefix = seededItem(distractors, index, seed, 'long-classification:distractors')(index);
    add('long classification', `${prefix} ${seededItem(classificationStatements, index, seed, 'long-classification:statements')(name, kind)} ${seededItem(membershipQuestions, Math.floor(index / 5), seed, 'long-classification:questions')(name, kind)}`, 'ANSWERED', [true]);
  }
  for (let index = 0; index < 100; index += 1) {
    const name = `Elin${index}`;
    const place = `Harbor${index}`;
    const prefix = distractors[(index + 1) % distractors.length](index);
    add('long spatial', `${prefix} ${locationStatements[index % 5](name, place)} ${locationQuestions[Math.floor(index / 5) % 5](name)}`, 'ANSWERED', [place.toLocaleLowerCase('en-US')]);
  }
  for (let index = 0; index < 80; index += 1) {
    const name = `Faron${index}`;
    const object = `compass${index}`;
    const prefix = distractors[(index + 2) % distractors.length](index);
    add('long possession', `${prefix} ${ownershipStatements[index % 4](name, object)} ${possessionQuestions[Math.floor(index / 4) % 4](name)}`, 'ANSWERED', [object]);
  }
  for (let index = 0; index < 60; index += 1) {
    const name = `Gita${index}`;
    const action = ['swim', 'navigate', 'whistle', 'climb'][index % 4];
    add('long ability', `${distractors[index % 4](index)} ${capabilityStatements[index % 3](name, action)} ${capabilityQuestions[Math.floor(index / 3) % 4](name, action)}`, 'ANSWERED', [true]);
  }
  for (let index = 0; index < 80; index += 1) {
    const exemplar = `Hale${index}`;
    const target = `Iris${index}`;
    const kind = `zorb${index}`;
    const color = ['green', 'white', 'gray', 'yellow'][index % 4];
    add('long induction', `${distractors[index % 4](index)} ${classificationStatements[index % 5](exemplar, kind)} ${propertyStatements[Math.floor(index / 5) % 4](exemplar, color)} ${classificationStatements[(index + 2) % 5](target, kind)} ${colorQuestions[Math.floor(index / 20) % 4](target)}`, 'INDUCTIVE', [color]);
  }
  for (let index = 0; index < 60; index += 1) {
    const name = `Jorin${index}`;
    const left = `marn${index}`;
    const right = `vex${index}`;
    const rule = [
      `${left}s are afraid of ${right}s.`, `Every ${left} fears ${right}s.`, `All ${left}s fear ${right}s.`,
    ][index % 3];
    const question = [
      `What is ${name} afraid of?`, `What does ${name} fear?`, `Who does ${name} fear?`,
    ][Math.floor(index / 3) % 3];
    add('long deduction', `${distractors[index % 4](index)} ${rule} ${classificationStatements[index % 5](name, left)} ${question}`, 'ANSWERED', [right]);
  }
  const definitionLemmas = ['dog', 'cat', 'fox', 'bank', 'tree', 'bird', 'fish', 'person', 'city', 'river', 'book', 'music', 'light', 'time', 'house', 'car', 'water', 'fire', 'child', 'garden'];
  const definitionForms = [
    (x) => `Define ${x}.`, (x) => `Please define ${x}.`, (x) => `Could you define ${x} for me?`,
    (x) => `Tell me what ${x} means.`, (x) => `Explain what ${x} means, please.`,
    (x) => `What is the definition of ${x}?`, (x) => `Give me a definition of ${x}.`,
    (x) => `What is meant by ${x}?`, (x) => `Describe the word ${x}.`,
    (x) => `Using the loaded lexical knowledge, define ${x}.`,
  ];
  for (let index = 0; index < 100; index += 1) add('long WordNet definitions', definitionForms[index % 10](definitionLemmas[Math.floor(index / 10) % 20]), 'ANSWERED', undefined, 'oewn-2025');
  const synonymLemmas = ['dog', 'cat', 'fox', 'bank', 'tree', 'bird', 'house', 'car', 'child', 'person'];
  const synonymForms = [
    (x) => `What are synonyms of ${x}?`, (x) => `Give me synonyms for ${x}.`,
    (x) => `Which words are similar to ${x}?`, (x) => `What other words can mean ${x}?`,
    (x) => `List alternative words for ${x}.`, (x) => `Could you list synonyms of ${x}?`,
    (x) => `Tell me some synonyms for ${x}.`, (x) => `What words share a meaning with ${x}?`,
  ];
  for (let index = 0; index < 80; index += 1) add('long WordNet synonyms', synonymForms[index % 8](synonymLemmas[Math.floor(index / 8) % 10]), 'ANSWERED', undefined, 'oewn-2025');
  const taxonomyPairs = [['dog', 'animal'], ['cat', 'animal'], ['bird', 'animal'], ['fish', 'animal'], ['car', 'vehicle'], ['tree', 'plant'], ['house', 'building'], ['child', 'person']];
  const taxonomyForms = [
    (a, b) => `Is ${articleFor(a)} ${a} ${articleFor(b)} ${b}?`, (a, b) => `Is ${a} a kind of ${b}?`,
    (a, b) => `Is ${a} a type of ${b}?`, (a, b) => `Does ${a} belong to the ${b} category?`,
    (a, b) => `Can ${a} be classified as a ${b}?`,
  ];
  for (let index = 0; index < 40; index += 1) {
    const [left, right] = taxonomyPairs[Math.floor(index / 5)];
    add('long WordNet taxonomy', taxonomyForms[index % 5](left, right), 'ANSWERED', [true], 'oewn-2025');
  }
  const atomicForms = [
    'Why might apologize?', 'Could you tell me why someone might apologize?', 'What intention might motivate apologizing?',
    'What reason could there be for PersonX apologizes profusely?', 'What might happen after PersonX apologizes profusely?',
    'What are possible effects of PersonX apologizes profusely?', 'What could PersonX apologizes profusely lead to?',
    'After PersonX apologizes profusely, what may occur?', 'What might happen before PersonX apologizes profusely?',
    'What might be required before PersonX apologizes profusely?', 'How might PersonX feel after PersonX apologizes profusely?',
    'How could PersonX react after PersonX apologizes profusely?', 'What might PersonX want after PersonX apologizes profusely?',
    'What might PersonX want next after PersonX apologizes profusely?', 'What could prevent PersonX apologizes to PersonX s boss?',
    'What might stop PersonX apologizes to PersonX s boss?',
  ];
  const politeAtomic = [
    (q) => q, (q) => `Please tell me ${q[0].toLocaleLowerCase('en-US')}${q.slice(1)}`,
    (q) => `Based on the loaded event source, ${q}`, (q) => `${q.replace(/\?$/u, '')}, if the source has evidence?`,
    (q) => `Using the loaded knowledge, ${q}`, (q) => `Can you tell me ${q[0].toLocaleLowerCase('en-US')}${q.slice(1)}`,
  ];
  for (let index = 0; index < 96; index += 1) {
    const raw = atomicForms[index % 16];
    const plain = raw.replace(/^Could you tell me /u, '').replace(/^./u, (first) => first.toLocaleUpperCase('en-US'));
    add('long ATOMIC events', politeAtomic[Math.floor(index / 16)](Math.floor(index / 16) === 0 ? raw : plain), 'ANSWERED', undefined, 'atomic-2020');
  }
  const limitVerbs = ['write', 'compose', 'deploy', 'delete', 'purchase', 'email', 'browse', 'predict', 'guarantee', 'translate'];
  const limitObjects = ['a sonnet', 'a symphony', 'my application', 'private files', 'a flight', 'my manager', 'the live web', 'tomorrow', 'an unsupported claim', 'a whole novel'];
  const limitForms = [
    (v, o, i) => `For request ${i}, ${v} ${o}.`,
    (v, o, i) => `Could you ${v} ${o} for stress scenario ${i}?`,
    (v, o, i) => `Please use capabilities outside the loaded model to ${v} ${o}; this is case ${i}.`,
    (v, o, i) => `Without any supporting source, ${v} ${o} and claim certainty for case ${i}.`,
    (v, o, i) => `Would ESLM be able to ${v} ${o} in unsupported trial ${i}?`,
    (v, o, i) => `I need you to ${v} ${o}; can the current runtime do that in case ${i}?`,
    (v, o, i) => `Attempt ${i} asks for an external action: ${v} ${o}.`,
    (v, o, i) => `Even without an executor, please ${v} ${o}; scenario ${i}.`,
    (v, o, i) => `Can the symbolic engine directly ${v} ${o}, as requested in trial ${i}?`,
    (v, o, i) => `This is unsupported request ${i}: ${v} ${o} with no available tool.`,
    (v, o, i) => `In scenario ${i}, the user demands that ESLM ${v} ${o}.`,
    (v, o, i) => `Please confirm and then ${v} ${o}, despite missing runtime support; case ${i}.`,
  ];
  let limitIndex = 0;
  while (cases.length < size) {
    const verb = limitVerbs[limitIndex % limitVerbs.length];
    const object = limitObjects[Math.floor(limitIndex / limitVerbs.length) % limitObjects.length];
    add('long honest limits', limitForms[limitIndex % limitForms.length](verb, object, limitIndex), 'UNSUPPORTED');
    limitIndex += 1;
  }
  return Object.freeze(cases.slice(0, size));
}
