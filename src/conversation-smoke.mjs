const NAMES = Object.freeze([
  'Aster', 'Bela', 'Cora', 'Darin', 'Elin', 'Faron', 'Gita', 'Hale', 'Iris', 'Jorin',
  'Kara', 'Leto', 'Mina', 'Nolan', 'Orin', 'Pia', 'Quin', 'Rhea', 'Soren', 'Tala',
]);
const PLACES = Object.freeze(['Atrium', 'Library', 'Garden', 'Workshop', 'Harbor', 'Gallery', 'Station', 'Archive', 'Kitchen', 'Courtyard']);

function smokeCase(id, group, input, expectedStatus, expectedValues, kb = 'base') {
  return Object.freeze({ id, group, input, kb, expectedStatus, expectedValues });
}

export function conversationSmokeCases() {
  const cases = [];
  NAMES.forEach((name, index) => cases.push(smokeCase(
    `membership-${index + 1}`, 'session membership', `${name} is a voyager. Is ${name} a voyager?`, 'ANSWERED', [true],
  )));
  NAMES.forEach((name, index) => cases.push(smokeCase(
    `description-${index + 1}`, 'entity description', `${name} is a keeper. Who is ${name}?`, 'ANSWERED', ['keeper'],
  )));
  PLACES.forEach((place, index) => cases.push(smokeCase(
    `location-${index + 1}`, 'session location', `${NAMES[index]} is in ${place}. Where is ${NAMES[index]}?`, 'ANSWERED', [place.toLocaleLowerCase('en-US')],
  )));
  NAMES.slice(0, 10).forEach((name, index) => cases.push(smokeCase(
    `ownership-${index + 1}`, 'session ownership', `${name} owns a token${index}. What does ${name} own?`, 'ANSWERED', [`token${index}`],
  )));
  NAMES.slice(0, 10).forEach((name, index) => cases.push(smokeCase(
    `color-${index + 1}`, 'configured induction', `Ava${index} is a zorb${index}. Ava${index} is green. ${name} is a zorb${index}. What color is ${name}?`, 'INDUCTIVE', ['green'],
  )));
  const typoPairs = [
    ['Alxander', 'Alexander'], ['Micheal', 'Michael'], ['Jonathon', 'Jonathan'], ['Katarina', 'Katrina'], ['Sorctare', 'Socrate'],
    ['Ariadnne', 'Ariadne'], ['Marcell', 'Marcel'], ['Isabell', 'Isabel'], ['Theodor', 'Theodore'], ['Emmeline', 'Emeline'],
  ];
  typoPairs.forEach(([stated, asked], index) => cases.push(smokeCase(
    `proper-name-${index + 1}`, 'proper-name tolerance', `${stated} is a navigator. Is ${asked} a navigator?`, 'ANSWERED', [true],
  )));
  [
    ['Who are you?', 'ANSWERED', ['eslm']], ['What are you?', 'ANSWERED', ['eslm']],
    ['Tell me who you are.', 'ANSWERED', ['eslm']], ['Who am I?', 'UNKNOWN', []],
    ['Do you know who I am?', 'UNKNOWN', []], ['What can you do?', 'ANSWERED', undefined],
    ['What do you do?', 'ANSWERED', undefined], ['Show me what you can do.', 'ANSWERED', undefined],
    ['Who is Jhon?', 'UNKNOWN', undefined],
  ].forEach(([input, status, values], index) => cases.push(smokeCase(`meta-${index + 1}`, 'conversation', input, status, values)));
  NAMES.slice(0, 10).forEach((name, index) => cases.push(smokeCase(
    `quick-mortality-${index + 1}`, 'QUICK fixture deduction', `${name} is a man. Is ${name} going to die?`, 'ANSWERED', [true], 'quick',
  )));
  [
    ['Jhon is a man. Is Jhon going to die?', 'ANSWERED', [true]],
    ['Sorctare is a man. Is Socrate going to die?', 'ANSWERED', [true]],
    ['Can Penguin swim?', 'ANSWERED', [true]],
    ['Can Penguin fly?', 'UNKNOWN', []],
    ['Where is Neptune?', 'ANSWERED', ['solar-system']],
  ].forEach(([input, status, values], index) => cases.push(smokeCase(
    `quick-user-example-${index + 1}`, 'QUICK fixture deduction', input, status, values, 'quick',
  )));
  [
    ['Define dog', 'ANSWERED'], ['Define cat', 'ANSWERED'], ['Define fox', 'ANSWERED'], ['Define bank', 'ANSWERED'],
    ['Define tree', 'ANSWERED'], ['What are synonyms of dog?', 'ANSWERED'], ['What are synonyms of fox?', 'ANSWERED'],
    ['How many senses does bank have?', 'ANSWERED'], ['Is a dog an animal?', 'ANSWERED'], ['Is a cat an animal?', 'ANSWERED'],
  ].forEach(([input, status], index) => cases.push(smokeCase(`wordnet-${index + 1}`, 'WordNet', input, status, undefined, 'oewn-2025')));
  [
    'Why might apologize?', 'WHY MIGHT APOLOGIZE?',
    'What might happen after PersonX apologizes profusely?',
    'What might happen before PersonX apologizes profusely?',
    'How might PersonX feel after PersonX apologizes profusely?',
    'How might someone feel after PersonX apologizes profusely?',
    'What might PersonX want after PersonX apologizes profusely?',
    'What might someone want after PersonX apologizes profusely?',
    'What could prevent PersonX apologizes to PersonX s boss?',
    'Why might PersonX apologizes to PersonX s boss?',
  ].forEach((input, index) => cases.push(smokeCase(`atomic-${index + 1}`, 'ATOMIC', input, 'ANSWERED', undefined, 'atomic-2020')));
  [
    'Write a new poem.', 'Prove an arbitrary theorem.', 'Compose a symphony.', 'Translate an entire novel.',
    'Browse the live internet.', 'Predict tomorrow perfectly.', 'Deploy my application.', 'Read my private email.',
    'Generate a photorealistic image.', 'Solve every possible equation.',
  ].forEach((input, index) => cases.push(smokeCase(`limit-${index + 1}`, 'honest limits', input, 'UNSUPPORTED')));
  return Object.freeze(cases);
}

export function smokeExamples() {
  return conversationSmokeCases().map((item) => ({
    ...item,
    label: item.expectedStatus === 'UNSUPPORTED' ? 'unsupported' : item.expectedStatus === 'UNKNOWN' ? 'unknown by design' : item.kb === 'base' ? 'works' : `works with ${item.kb}`,
  }));
}

export function longConversationStressCases(size = 1000) {
  if (!Number.isInteger(size) || size < 1000) throw new Error('Long conversation stress requires at least 1000 cases.');
  const cases = [];
  const add = (group, input, status, values, kb = 'base') => cases.push(smokeCase(`long-${cases.length + 1}`, group, input, status, values, kb));
  for (let index = 0; index < 100; index += 1) {
    add('long membership', `Dara${index} is in Archive${index}. Bela${index} owns a token${index}. Aster${index} is a voyager${index}. Cora${index} is a keeper${index}. Is Aster${index} a voyager${index}?`, 'ANSWERED', [true]);
    add('long description', `Dara${index} is in Garden${index}. Bela${index} owns a key${index}. Cora${index} is a keeper${index}. Aster${index} is a navigator${index}. Who is Aster${index}?`, 'ANSWERED', [`navigator${index}`]);
    add('long location', `Bela${index} owns a token${index}. Cora${index} is a keeper${index}. Dara${index} is in Library${index}. Aster${index} is in Harbor${index}. Where is Aster${index}?`, 'ANSWERED', [`harbor${index}`]);
    add('long ownership', `Cora${index} is a keeper${index}. Dara${index} is in Gallery${index}. Bela${index} owns a marker${index}. Aster${index} owns a compass${index}. What does Aster${index} own?`, 'ANSWERED', [`compass${index}`]);
    add('long induction', `Dara${index} is a glim${index}. Dara${index} is gray. Bela${index} is a zorb${index}. Bela${index} is green. Cora${index} is a glim${index}. Cora${index} is white. Aster${index} is a zorb${index}. What color is Aster${index}?`, 'INDUCTIVE', ['green']);
  }
  const lemmas = ['dog', 'cat', 'fox', 'bank', 'tree', 'bird', 'fish', 'person', 'city', 'river', 'book', 'music', 'light', 'time', 'house', 'car', 'water', 'fire', 'child', 'garden'];
  const definitionForms = [
    (lemma) => `Please define ${lemma}.`, (lemma) => `Could you define ${lemma} for me?`,
    (lemma) => `Tell me what ${lemma} means.`, (lemma) => `Explain what ${lemma} means, please.`,
    (lemma) => `Using the loaded knowledge, define ${lemma}.`,
  ];
  for (const lemma of lemmas) for (const form of definitionForms) add('long WordNet definition', form(lemma), 'ANSWERED', undefined, 'oewn-2025');
  const synonymLemmas = ['dog', 'cat', 'fox', 'bank', 'tree', 'bird', 'house', 'car', 'child', 'person'];
  const synonymForms = [
    (lemma) => `Please give me synonyms for ${lemma}.`, (lemma) => `Could you give me synonyms for ${lemma}?`,
    (lemma) => `Give me the synonyms for ${lemma}, please.`, (lemma) => `Using the loaded knowledge, what are synonyms of ${lemma}?`,
    (lemma) => `What are the synonyms for ${lemma}, according to the compiled source?`,
  ];
  for (const lemma of synonymLemmas) for (const form of synonymForms) add('long WordNet synonyms', form(lemma), 'ANSWERED', undefined, 'oewn-2025');
  const pairs = [['dog', 'animal'], ['cat', 'animal'], ['fox', 'animal'], ['bird', 'animal'], ['fish', 'animal'], ['car', 'vehicle'], ['river', 'body of water'], ['tree', 'plant'], ['house', 'building'], ['child', 'person']];
  for (const [left, right] of pairs) for (const prefix of ['Please ', 'Could you ', 'Using the loaded knowledge, ', '']) {
    add('long WordNet taxonomy', `${prefix}is a ${left} a ${right}?`, 'ANSWERED', [true], 'oewn-2025');
  }
  const atomicQuestions = [
    'Why might apologize?', 'What might happen after PersonX apologizes profusely?',
    'What might happen before PersonX apologizes profusely?', 'How might PersonX feel after PersonX apologizes profusely?',
    'What might PersonX want after PersonX apologizes profusely?', 'What could prevent PersonX apologizes to PersonX s boss?',
    'Why might PersonX apologizes to PersonX s boss?', 'How might someone feel after PersonX apologizes profusely?',
    'What might someone want after PersonX apologizes profusely?', 'WHY MIGHT APOLOGIZE?',
  ];
  const wrappers = [
    (question) => `Please tell me ${question[0].toLocaleLowerCase('en-US')}${question.slice(1)}`,
    (question) => `Could you tell me ${question[0].toLocaleLowerCase('en-US')}${question.slice(1)}`,
    (question) => `Based on the loaded source, ${question}`, (question) => `${question.replace(/\?$/u, '')}, please?`,
    (question) => `${question.replace(/\?$/u, '')} according to the compiled source?`,
  ];
  for (const question of atomicQuestions) for (const wrapper of wrappers) add('long ATOMIC', wrapper(question), 'ANSWERED', undefined, 'atomic-2020');
  let limitIndex = 0;
  while (cases.length < size) {
    add('long honest limit', `For stress request ${limitIndex}, please read private live data, invent unsupported facts, write a long poem, and guarantee that every claim is certainly true.`, 'UNSUPPORTED');
    limitIndex += 1;
  }
  return Object.freeze(cases.slice(0, size));
}
