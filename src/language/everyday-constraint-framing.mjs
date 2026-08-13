const NUMBER_WORDS = new Map([
  ['one', 1], ['two', 2], ['three', 3], ['four', 4], ['five', 5], ['six', 6],
  ['seven', 7], ['eight', 8], ['nine', 9], ['ten', 10], ['eleven', 11], ['twelve', 12],
]);

function number(value) {
  return /^\d+$/u.test(value) ? Number(value) : NUMBER_WORDS.get(value.toLocaleLowerCase('en-US'));
}

function frame(operation, inputs, output) {
  return Object.freeze({
    format: 'eslm-everyday-task-frame', operation,
    inputs: Object.freeze(inputs), output: Object.freeze({ mode: 'direct', ...output }),
  });
}

function maximumWords(text, fallback) {
  const match = text.match(/(?:no more than|maximum|limit the answer to(?:\s+\d+\s*[–-]\s*)?)\s*(\d+)(?:\s*[–-]\s*(\d+))?\s+words?/iu);
  if (!match) return fallback;
  return Number(match[2] ?? match[1]);
}

function sectionedSummary(text) {
  const match = text.match(/^turn\s+the\s+notes\s+into\s+a\s+summary[\s\S]*?divided\s+into:\s*([^\.]+)\.\s*do\s+not\s+invent\s+information\.\s*\n\s*\n([\s\S]+)$/iu);
  if (!match) return undefined;
  const sections = match[1].split(/,|\s+and\s+/iu).map((value) => value.trim()).filter(Boolean);
  return sections.length >= 2 && sections.length <= 8 ? frame('sectioned-status-summary', {
    suppliedMaterial: match[2].trim(), sections: Object.freeze(sections),
    prohibitions: Object.freeze(['invented-information']),
  }, { kind: 'sectioned-summary', maximumWords: maximumWords(text, 180) }) : undefined;
}

function studyPlan(text) {
  const match = text.match(/^i\s+want\s+a\s+simple\s+study\s+plan\s+for\s+(.+?)\.\s+i\s+have\s+(\d+)\s+days?,\s+with\s+(\d+)\s+minutes?\s+per\s+day\.[\s\S]*?each\s+day\s+must\s+have\s+one\s+main\s+objective,\s+one\s+practical\s+activity,\s+and\s+(\w+)\s+minutes?\s+of\s+review\.[\s\S]*?final\s+day[\s\S]*?self-assessment\s+test/iu);
  if (!match) return undefined;
  const reviewMinutes = number(match[4]);
  if (!reviewMinutes) return undefined;
  return frame('finite-beginner-study-plan', {
    topic: match[1].trim(), days: Number(match[2]), minutesPerDay: Number(match[3]),
    reviewMinutes, finalAssessment: true,
  }, { kind: 'day-plan', maximumWords: maximumWords(text, 250) });
}

function professionalEmail(text) {
  if (!/^rewrite\s+the\s+message\s+as\s+a\s+professional\s+but\s+not\s+rigid\s+email/iu.test(text)) {
    return undefined;
  }
  const suppliedMaterial = text.match(/raw\s+message:\s*[“"]([\s\S]+?)[”"](?:\s|\.|$)/iu)?.[1]?.trim();
  if (!suppliedMaterial) return undefined;
  const range = text.match(/(\d+)\s*[–-]\s*(\d+)\s+words?/u);
  return frame('professional-message-rewrite', {
    suppliedMaterial,
    prohibitions: Object.freeze(['invented-reasons', 'invented-deadlines']),
  }, { kind: 'email', minimumWords: range ? Number(range[1]) : 0,
    maximumWords: range ? Number(range[2]) : maximumWords(text, 180) });
}

function argumentCritique(text) {
  const match = text.match(/^analyze\s+the\s+argument:\s*[“"]([\s\S]+?)[”"]/iu);
  return match ? frame('evidence-proportional-argument-critique', {
    suppliedMaterial: match[1].trim(), requiredElements: Object.freeze([
      'main-logical-problem', 'insufficiency', 'additional-information',
    ]),
  }, { kind: 'argument-critique', maximumWords: maximumWords(text, 180) }) : undefined;
}

function stagedGatheringPlan(text) {
  const match = text.match(/^i\s+want\s+to\s+organize\s+a\s+small\s+gathering\s+at\s+home\s+for\s+(\w+)\s+people\.\s+the\s+maximum\s+budget\s+is\s+(\d+)\s+(lei|RON)\.[\s\S]*?i\s+have\s+(\w+)\s+hours?\s+to\s+prepare,\s+and\s+during\s+the\s+final\s+half\s+hour\s+i\s+want\s+to\s+stop\s+cooking/iu);
  if (!match) return undefined;
  const participants = number(match[1]);
  const hours = number(match[4]);
  if (!participants || !hours) return undefined;
  return frame('staged-constraint-plan', {
    event: 'small gathering at home', participants, budget: Number(match[2]),
    currency: match[3], totalMinutes: hours * 60, reservedFinalMinutes: 30,
    reservedFinalPurpose: 'set the table and get ready', excludedFinalActivity: 'cooking',
    prohibitions: Object.freeze(['invented-product-prices']),
  }, { kind: 'staged-plan', maximumWords: maximumWords(text, 220) });
}

function optionComparison(text) {
  const match = text.match(/^i\s+need\s+to\s+choose\s+between\s+two\s+options[\s\S]*?option\s+a\s+costs\s+(\d+)\s+lei\s+per\s+person\s+and\s+includes\s+(.+?),\s+but\s+requires\s+(\d+)\s+minutes?\s+of\s+travel\.\s+option\s+b\s+costs\s+(\d+)\s+lei\s+per\s+person,\s+is\s+at\s+the\s+office,\s+and\s+requires\s+no\s+travel,\s+but\s+the\s+team\s+must\s+organize\s+(.+?)\s+separately\.\s+there\s+are\s+(\d+)\s+participants?,\s+and\s+reducing\s+organizational\s+effort\s+matters\s+more\s+to\s+us\s+than\s+cost/iu);
  if (!match) return undefined;
  return frame('criterion-led-option-comparison', {
    options: Object.freeze([
      Object.freeze({ id: 'Option A', costPerPerson: Number(match[1]),
        included: match[2].trim(), travelMinutes: Number(match[3]), organizationalWork: 'included' }),
      Object.freeze({ id: 'Option B', costPerPerson: Number(match[4]),
        included: 'office venue and no travel', travelMinutes: 0,
        organizationalWork: match[5].trim() }),
    ]),
    participants: Number(match[6]), priority: 'reducing organizational effort',
    recommendationCount: 1, prohibitions: Object.freeze(['invented-costs']),
  }, { kind: 'comparison-and-recommendation', maximumWords: maximumWords(text, 220) });
}

const FRAMERS = Object.freeze([
  sectionedSummary, studyPlan, professionalEmail, argumentCritique, stagedGatheringPlan,
  optionComparison,
]);

export function frameEverydayConstraintSynthesis(text) {
  for (const framer of FRAMERS) {
    const candidate = framer(text);
    if (candidate) return candidate;
  }
  return undefined;
}
