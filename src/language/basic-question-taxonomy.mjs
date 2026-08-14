import { analyzeNominalSurface } from './nominal-surface.mjs';

export const BASIC_QUESTION_ANALYSIS_PROTOCOL = 'eslm-basic-question-analysis-v1';
export const BASIC_QUESTION_TAXONOMY_VERSION = '1';

const MAX_INPUT_CHARACTERS = 65_536;
const MAX_QUESTION_SURFACES = 16;
const MAX_TOPICS = 8;
const MAX_SELF_QUESTIONS = 64;
const LOCAL_TOPIC_PRONOUNS = new Set(['he', 'her', 'him', 'it', 'she', 'that', 'them', 'they', 'this']);

const FAMILY_ROWS = [
  ['definition', 'definition', 'What does {topic} mean?', 100],
  ['identity', 'identity', 'Who or what is {topic}?', 98],
  ['lexical-sense', 'lexical sense', 'Which meanings of {topic} are recorded?', 72],
  ['synonym', 'synonym', 'What is a synonym of {topic}?', 64],
  ['antonym', 'antonym', 'What is an antonym of {topic}?', 56],
  ['taxonomy', 'category', 'What is {topic} a kind of?', 96],
  ['example', 'example', 'What is an example of {topic}?', 54],
  ['property', 'property', 'What properties does {topic} have?', 92],
  ['composition', 'material', 'What is {topic} made of?', 74],
  ['part-whole', 'part or whole', 'What parts does {topic} have?', 76],
  ['purpose', 'purpose', 'What is {topic} used for?', 94],
  ['capability', 'capability', 'What can {topic} do?', 90],
  ['affordance', 'affordance', 'What can be done to {topic}?', 58],
  ['method', 'usage method', 'How is {topic} used?', 88],
  ['location', 'location', 'Where is {topic} found or used?', 86],
  ['permission', 'permission or prohibition', 'Where or when is {topic} restricted?', 84],
  ['requirement', 'requirement', 'What does {topic} require?', 89],
  ['cause-origin', 'cause or origin', 'What causes or originates {topic}?', 82],
  ['reason', 'reason', 'Why does {topic} exist or happen?', 87],
  ['intent', 'intent or motivation', 'What goal might motivate {topic}?', 62],
  ['effect', 'effect', 'What can {topic} cause?', 85],
  ['continuation', 'continuation', 'What might happen after {topic}?', 60],
  ['risk', 'risk', 'What risks or failure conditions are recorded for {topic}?', 83],
  ['benefit', 'benefit', 'What benefits or positive effects are recorded for {topic}?', 70],
  ['limitation', 'limitation or exception', 'What limits or exceptions qualify {topic}?', 81],
  ['agent-responsibility', 'agent or responsibility', 'Who performs, owns, or controls {topic}?', 68],
  ['time-history', 'time or history', 'When does {topic} occur or apply?', 52],
  ['quantity', 'quantity or measurement', 'What quantities or measurements describe {topic}?', 50],
  ['comparison', 'comparison', 'How does {topic} compare with the requested alternative?', 78],
  ['alternative', 'alternative', 'What alternatives or substitutes for {topic} are recorded?', 48],
  ['evidence', 'evidence or provenance', 'What source evidence supports claims about {topic}?', 80],
  ['confidence-conflict', 'confidence or conflict', 'Is knowledge about {topic} uncertain or conflicting?', 79],
  ['relation', 'relation', 'How is {topic} connected to the other request topics?', 77],
  ['change-lifecycle', 'change or lifecycle', 'What changes or lifecycle stages affect {topic}?', 46],
  ['stakeholder', 'stakeholder or audience', 'Who uses, receives, or is affected by {topic}?', 44],
];

export const BASIC_QUESTION_FAMILIES = Object.freeze(FAMILY_ROWS.map(([
  family, relationSurface, canonicalTemplate, defaultPriority,
]) => Object.freeze({ family, relationSurface, canonicalTemplate, defaultPriority })));

const FAMILY_BY_ID = new Map(BASIC_QUESTION_FAMILIES.map((item) => [item.family, item]));

const DEFAULT_EXPANSION = Object.freeze([
  'definition', 'identity', 'taxonomy', 'property', 'purpose', 'capability', 'method', 'location',
  'requirement', 'limitation', 'risk', 'effect', 'evidence', 'confidence-conflict', 'relation',
  'example', 'alternative', 'time-history', 'stakeholder',
]);

function cleanSurface(value) {
  return String(value ?? '').normalize('NFKC').replace(/\s+/gu, ' ').trim().replace(/[?.!]+$/u, '');
}

function boundedTopic(value, { allowClause = false } = {}) {
  const analysis = analyzeNominalSurface(cleanSurface(value), {
    limits: { maximumBytes: 4_096, maximumTokens: allowClause ? 32 : 12 },
  });
  return analysis.accepted ? analysis.surface : undefined;
}

function coordinatedTopicSurfaces(value) {
  const parts = cleanSurface(value).split(/\s*(?:,|\band\b|\bor\b)\s*/iu).filter(Boolean);
  if (parts.length < 2 || parts.length > MAX_TOPICS) return undefined;
  const topics = parts.map((part) => boundedTopic(part));
  if (topics.some((topic) => !topic)) return undefined;
  const unique = [...new Map(topics.map((topic) => [canonicalTopic(topic), topic])).values()];
  return unique.length > 1 ? Object.freeze(unique) : undefined;
}

function frame(family, surface, subjectSurface, fields = {}) {
  const descriptor = FAMILY_BY_ID.get(family);
  return Object.freeze({
    family,
    construction: family,
    relationSurface: descriptor.relationSurface,
    surface: cleanSurface(surface),
    ...(subjectSurface ? { subjectSurface } : {}),
    direction: fields.direction ?? 'forward',
    wh: fields.wh ?? (/^who\b/iu.test(surface) ? 'who'
      : /^where\b/iu.test(surface) ? 'where'
        : /^when\b/iu.test(surface) ? 'when'
          : /^why\b/iu.test(surface) ? 'why'
            : /^how\b/iu.test(surface) ? 'how' : 'what'),
    ...(fields.objectSurface ? { objectSurface: fields.objectSurface } : {}),
    ...(fields.topicSurfaces ? { topicSurfaces: fields.topicSurfaces } : {}),
    canonicalCandidates: Object.freeze((fields.canonicalCandidates ?? [
      descriptor.canonicalTemplate.replace('{topic}', subjectSurface ?? cleanSurface(surface)),
    ]).map(cleanSurface)),
  });
}

function firstMatch(clean, patterns) {
  for (const item of patterns) {
    const match = clean.match(item.pattern);
    if (!match) continue;
    const subjectValue = match[item.subject ?? 1] ?? match.slice(1).find(Boolean);
    const topicSurfaces = item.coordinated ? coordinatedTopicSurfaces(subjectValue) : undefined;
    const subject = topicSurfaces
      ? cleanSurface(subjectValue)
      : boundedTopic(subjectValue, { allowClause: item.allowClause });
    if (!subject) continue;
    return frame(item.family, clean, subject, {
      direction: item.direction,
      wh: item.wh,
      objectSurface: item.object ? boundedTopic(match[item.object]) : undefined,
      topicSurfaces,
      canonicalCandidates: typeof item.candidates === 'function'
        ? item.candidates(subject, match) : item.candidates,
    });
  }
  return undefined;
}

const SPECIFIC_PATTERNS = Object.freeze([
  { family: 'definition', pattern: /^what is the meaning of (.+)$/iu,
    candidates: (subject) => [`What does ${subject} mean?`] },
  { family: 'definition', pattern: /^what does (.+?) mean$/iu,
    candidates: (subject) => [`What does ${subject} mean?`] },
  { family: 'definition', pattern: /^(?:define|describe the (?:word|term)) (.+)$/iu,
    candidates: (subject) => [`What does ${subject} mean?`] },
  { family: 'definition', pattern: /^(?:tell me|explain) what (.+?) (?:is|means)$/iu,
    candidates: (subject) => [`What does ${subject} mean?`] },
  { family: 'lexical-sense', pattern: /^(?:which meaning of|how many (?:senses|meanings) does) (.+?)(?: apply| have)?$/iu },
  { family: 'synonym', pattern: /^(?:what is another word for|what is (?:a )?synonym of) (.+)$/iu,
    candidates: (subject) => [`What is a synonym of ${subject}?`] },
  { family: 'antonym', pattern: /^(?:what is the opposite of|what is (?:an )?antonym of) (.+)$/iu,
    candidates: (subject) => [`What is an antonym of ${subject}?`] },
  { family: 'purpose', pattern: /^what (?:is|are) (.+?) (?:for|used for)$/iu,
    candidates: (subject) => [`What is ${subject} used for?`] },
  { family: 'purpose', pattern: /^what purpose does (.+?) serve$/iu,
    candidates: (subject) => [`What is ${subject} used for?`] },
  { family: 'purpose', pattern: /^what can (.+?) be used for$/iu,
    candidates: (subject) => [`What is ${subject} used for?`] },
  { family: 'purpose', pattern: /^what are the uses of (.+)$/iu,
    candidates: (subject) => [`What is ${subject} used for?`] },
  { family: 'capability', pattern: /^(?:what can|what (?:is|are)) (.+?) (?:do|capable of)$/iu,
    candidates: (subject) => [`What can ${subject} do?`] },
  { family: 'affordance', pattern: /^(?:what can be done to|what actions can affect) (.+)$/iu },
  { family: 'method', pattern: /^how (?:do i|can i|should i|does one) (?:use|operate) (.+)$/iu,
    candidates: (subject) => [`How is ${subject} used?`] },
  { family: 'method', pattern: /^how (?:is|are) (.+?) used$/iu,
    candidates: (subject) => [`How is ${subject} used?`] },
  { family: 'method', pattern: /^how does (.+?) work$/iu,
    candidates: (subject) => [`How is ${subject} used?`] },
  { family: 'permission', pattern: /^(?:where|when) (?:is|are) (.+?) (?:allowed|required|restricted|prohibited|forbidden|not allowed)$/iu },
  { family: 'location', pattern: /^where (?:is|are) (.+?) living$/iu,
    candidates: (subject) => [`Where is ${subject} found?`] },
  { family: 'location', pattern: /^(?:where (?:is|are|can) (.+?)(?: found| located| available| be used| used)?|in what place is (.+?))$/iu,
    subject: 1, candidates: (subject) => [`Where is ${subject} located?`] },
  { family: 'location', pattern: /^where (?:do|does) (.+?) live$/iu, coordinated: true,
    candidates: (subject) => [`Where is ${subject} found?`] },
  { family: 'requirement', pattern: /^what (?:does|do) (.+?) require$/iu,
    candidates: (subject) => [`What might be required before ${subject}?`] },
  { family: 'requirement', pattern: /^(?:what is needed for|what must happen before) (.+)$/iu,
    candidates: (subject) => [`What might be required before ${subject}?`] },
  { family: 'composition', pattern: /^what (?:is|are) (.+?) made of$/iu,
    candidates: (subject) => [`What is ${subject} made of?`] },
  { family: 'part-whole', pattern: /^what parts (?:does|do) (.+?) have$/iu,
    candidates: (subject) => [`What parts does ${subject} have?`] },
  { family: 'part-whole', pattern: /^what (?:is|are) part of (.+)$/iu, direction: 'reverse',
    candidates: (subject) => [`What is part of ${subject}?`] },
  { family: 'property', pattern: /^what propert(?:y|ies) (?:does|do) (.+?) have$/iu,
    candidates: (subject) => [`What properties does ${subject} have?`] },
  { family: 'property', pattern: /^what (?:is|are) (.+?) like$/iu,
    candidates: (subject) => [`What properties does ${subject} have?`] },
  { family: 'cause-origin', pattern: /^(?:what causes|what is the origin of|where did) (.+?)(?: come from)?$/iu,
    candidates: (subject) => [`What does ${subject} cause?`] },
  { family: 'reason', pattern: /^why (?:does|do|is|are) (.+?)(?: exist| happen| used)?$/iu,
    candidates: (subject) => [`What reason could there be for ${subject}?`] },
  { family: 'intent', pattern: /^(?:what motivates|what goal might motivate) (.+)$/iu,
    candidates: (subject) => [`What motivates ${subject}?`] },
  { family: 'effect', pattern: /^(?:what (?:does|do) (.+?) cause|what are possible effects of (.+?)|what could (.+?) lead to)$/iu,
    subject: 1, candidates: (subject) => [`What does ${subject} cause?`, `What are possible effects of ${subject}?`] },
  { family: 'continuation', pattern: /^(?:what follows|what comes next after|what might happen after) (.+)$/iu,
    candidates: (subject) => [`What might happen after ${subject}?`] },
  { family: 'risk', pattern: /^(?:what (?:are the )?risks of|what can go wrong with|what hazards are recorded for) (.+)$/iu },
  { family: 'benefit', pattern: /^what (?:are the )?benefits of (.+)$/iu },
  { family: 'benefit', pattern: /^what does (.+?) help with$/iu },
  { family: 'limitation', pattern: /^(?:what (?:are the )?limits of|what exceptions apply to) (.+)$/iu },
  { family: 'limitation', pattern: /^when does (.+?) not apply$/iu },
  { family: 'agent-responsibility', pattern: /^(?:who (?:performs|owns|controls|manages|is responsible for)|who is affected by) (.+)$/iu, wh: 'who' },
  { family: 'time-history', pattern: /^(?:when (?:did|does|is|was)|how long (?:does|is)) (.+?)(?: occur| happen| valid| last)?$/iu, wh: 'when' },
  { family: 'quantity', pattern: /^(?:how many|how much|how large|how often) (.+)$/iu, wh: 'how' },
  { family: 'comparison', pattern: /^how (?:is|are|does) (.+?) (?:compare(?:d)? (?:to|with)|differ from|resemble) (.+)$/iu,
    object: 2, candidates: (subject, match) => [`How does ${subject} compare with ${cleanSurface(match[2])}?`] },
  { family: 'example', pattern: /^(?:what is an example of|which examples of) (.+?)(?: are known)?$/iu },
  { family: 'alternative', pattern: /^(?:what can replace|what is an alternative to|what substitutes for) (.+)$/iu },
  { family: 'evidence', pattern: /^(?:what supports|which source (?:supports|states)|what evidence exists for) (.+)$/iu },
  { family: 'confidence-conflict', pattern: /^(?:is|are) (.+?) (?:certain|uncertain|disputed|conflicting)$/iu },
  { family: 'relation', pattern: /^how (?:is|are) (.+?) (?:related|connected) to (.+)$/iu, object: 2 },
  { family: 'change-lifecycle', pattern: /^(?:what changed|what started|what stopped|what superseded) (.+)$/iu },
  { family: 'stakeholder', pattern: /^(?:who (?:uses|needs|receives)|who is affected by) (.+)$/iu, wh: 'who' },
  { family: 'taxonomy', pattern: /^(?:what kind of thing is|what type of thing is|what category does) (.+?)(?: belong to)?$/iu,
    candidates: (subject) => [`What is ${subject} a kind of?`] },
  { family: 'taxonomy', pattern: /^what (?:is|are) (.+?) (?:a kind|a type) of$/iu,
    candidates: (subject) => [`What is ${subject} a kind of?`] },
  { family: 'identity', pattern: /^(?:who is (.+)|what is (.+?) known as)$/iu },
]);

function copularDefinition(clean) {
  const match = clean.match(/^what (?:is|are) ((?:a|an)\s+)?(.+)$/iu);
  if (!match) return undefined;
  const hasStrongArticleCue = Boolean(match[1]);
  const analysis = analyzeNominalSurface(match[2], {
    limits: { maximumBytes: 4_096, maximumTokens: 8 },
  });
  if (!analysis.accepted) return undefined;
  if (!hasStrongArticleCue && (analysis.tokens.length > 4
    || analysis.tokens.some((token) => /\d/u.test(token))
    || /(?:ing|ed)$/u.test(analysis.tokens.at(-1)))) return undefined;
  const subject = analysis.surface;
  return frame('definition', clean, subject, {
    canonicalCandidates: [`What does ${subject} mean?`],
  });
}

export function recognizeBasicQuestion(text) {
  if (typeof text !== 'string') return undefined;
  const clean = cleanSurface(text);
  if (!clean || clean.length > 4_096) return undefined;
  return firstMatch(clean, SPECIFIC_PATTERNS) ?? copularDefinition(clean);
}

function questionSurfaces(text) {
  const source = String(text ?? '').normalize('NFKC').slice(0, MAX_INPUT_CHARACTERS);
  const values = [];
  const questionPattern = /[^?]{1,4096}\?/gu;
  for (const match of source.matchAll(questionPattern)) {
    const raw = match[0];
    const separator = Math.max(raw.lastIndexOf('.'), raw.lastIndexOf('!'), raw.lastIndexOf('\n'));
    const surface = raw.slice(separator + 1).trim();
    if (surface) values.push({ surface, start: match.index + separator + 1, end: match.index + raw.length });
  }
  if (values.length === 0 && /^(?:define|describe|explain|tell me|show me|give me)\b/iu.test(source.trim())) {
    values.push({ surface: source.trim(), start: 0, end: source.trim().length });
  }
  return { values: values.slice(0, MAX_QUESTION_SURFACES), observed: values.length };
}

function openQuestion(surface) {
  const clean = cleanSurface(surface);
  const wh = clean.match(/\b(who|what|which|where|when|why|how)\b/iu)?.[1]
    ?.toLocaleLowerCase('en-US');
  return wh ? Object.freeze({ family: 'open', construction: 'open', surface: clean, wh }) : undefined;
}

export function analyzeBasicQuestions(text) {
  const raw = String(text ?? '');
  const bounded = raw.slice(0, MAX_INPUT_CHARACTERS);
  const surfaces = questionSurfaces(bounded);
  let precedingTopic;
  const questions = surfaces.values.map((item, index) => {
    const recognized = recognizeBasicQuestion(item.surface) ?? openQuestion(item.surface);
    let resolved = recognized;
    if (recognized?.subjectSurface && LOCAL_TOPIC_PRONOUNS.has(canonicalTopic(recognized.subjectSurface))
      && precedingTopic) {
      resolved = Object.freeze({
        ...recognized,
        subjectSurface: precedingTopic,
        referenceResolution: 'unique-prior-question-topic',
        canonicalCandidates: Object.freeze(recognized.canonicalCandidates.map((candidate) =>
          candidate.replace(new RegExp(`\\b${recognized.subjectSurface}\\b`, 'giu'), precedingTopic))),
      });
    } else if (recognized?.subjectSurface && !(recognized.topicSurfaces?.length > 1)
      && !LOCAL_TOPIC_PRONOUNS.has(canonicalTopic(recognized.subjectSurface))) {
      precedingTopic = recognized.subjectSurface;
    }
    return Object.freeze({
      questionId: `question:${String(index + 1).padStart(2, '0')}`,
      sourceSpan: Object.freeze({ start: item.start, end: item.end }),
      embedded: item.start > 0 || item.end < bounded.length,
      ...(resolved ?? { family: 'unresolved', construction: 'unresolved', surface: cleanSurface(item.surface) }),
    });
  });
  return Object.freeze({
    format: BASIC_QUESTION_ANALYSIS_PROTOCOL,
    taxonomyVersion: BASIC_QUESTION_TAXONOMY_VERSION,
    questions: Object.freeze(questions),
    observedQuestionSurfaces: surfaces.observed,
    retainedQuestionSurfaces: questions.length,
    omittedQuestionSurfaces: Math.max(0, surfaces.observed - questions.length),
    complete: raw.length <= MAX_INPUT_CHARACTERS && surfaces.observed <= MAX_QUESTION_SURFACES,
  });
}

function canonicalTopic(value) {
  return cleanSurface(value).toLocaleLowerCase('en-US');
}

function preferredTopics(analysis, focusTerms) {
  const explicitSurfaces = analysis.questions.flatMap((question) => [
    ...(question.topicSurfaces ?? []), question.subjectSurface, question.objectSurface,
  ]).filter(Boolean);
  const surfaces = (explicitSurfaces.length > 0 ? explicitSurfaces : focusTerms ?? []).filter(Boolean);
  const result = [];
  const seen = new Set();
  for (const surface of surfaces) {
    const key = canonicalTopic(surface);
    if (!key || seen.has(key)) continue;
    if (result.some((existing) => canonicalTopic(existing).includes(key)
      || key.includes(canonicalTopic(existing)))) continue;
    seen.add(key);
    result.push(cleanSurface(surface));
    if (result.length >= MAX_TOPICS) break;
  }
  return result;
}

function selfQuestion(topic, family, disposition, priority, order) {
  const descriptor = FAMILY_BY_ID.get(family);
  return Object.freeze({
    selfQuestionId: `context-question:${String(order).padStart(3, '0')}`,
    topic,
    family,
    relationSurface: descriptor.relationSurface,
    disposition,
    priority,
    canonicalQuestion: descriptor.canonicalTemplate.replace('{topic}', topic),
  });
}

export function buildSelfQuestionPlan(analysis, focusTerms, options = {}) {
  const maximumQuestions = Math.min(options.maximumQuestions ?? MAX_SELF_QUESTIONS, MAX_SELF_QUESTIONS);
  const topics = preferredTopics(analysis, focusTerms);
  const proposed = [];
  const seen = new Set();
  const add = (topic, family, disposition, boost = 0) => {
    if (!topic || !FAMILY_BY_ID.has(family)) return;
    const key = `${canonicalTopic(topic)}\u0000${family}`;
    if (seen.has(key)) return;
    seen.add(key);
    const descriptor = FAMILY_BY_ID.get(family);
    proposed.push({ topic, family, disposition, priority: descriptor.defaultPriority + boost });
  };
  for (const question of analysis.questions) {
    if (!question.subjectSurface || !FAMILY_BY_ID.has(question.family)) continue;
    for (const topic of question.topicSurfaces ?? [question.subjectSurface]) {
      add(topic, question.family, 'explicit', 100);
    }
    if (question.objectSurface) add(question.objectSurface, question.family, 'explicit-related-topic', 90);
  }
  for (const topic of topics) {
    for (const family of DEFAULT_EXPANSION) add(topic, family, 'default-context');
  }
  const ordered = proposed.toSorted((left, right) => right.priority - left.priority
    || left.topic.localeCompare(right.topic) || left.family.localeCompare(right.family));
  const selected = ordered.slice(0, maximumQuestions).map((item, index) =>
    selfQuestion(item.topic, item.family, item.disposition, item.priority, index + 1));
  return Object.freeze({
    strategy: 'question-facet-expansion-v1',
    topics: Object.freeze(topics),
    questions: Object.freeze(selected),
    observedQuestions: ordered.length,
    omittedQuestions: Math.max(0, ordered.length - selected.length),
    complete: topics.length < MAX_TOPICS && ordered.length <= maximumQuestions,
  });
}
