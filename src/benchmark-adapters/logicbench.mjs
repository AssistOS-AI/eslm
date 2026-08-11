import { createReadStream } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import { atom, binary, decideFiniteEntailment, negate } from '../reasoning/finite-entailment.mjs';
import { evaluateControlledDefaultArgument } from './controlled-default-argument.mjs';

const SOURCE_REVISION = 'c014153303c98de4d5f09d41c3a235cd869be5c8';
const DEVELOPMENT_DIRECTORY = 'LogicBench(Aug)';
const EVALUATION_DIRECTORY = 'LogicBench(Eval)';
const MAX_TEXT_LENGTH = 8_192;
const ANSWERS = new Set(['yes', 'no']);

function assertRecord(condition, message) {
  if (!condition) throw new Error(`Logic source schema: ${message}`);
}

function assertText(value, path) {
  assertRecord(typeof value === 'string' && value.length > 0 && value.length <= MAX_TEXT_LENGTH,
    `${path} must be non-empty bounded text.`);
}

async function jsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await jsonFiles(path));
    else if (entry.name === 'data_instances.json') files.push(path);
  }
  return files;
}

async function sha256File(path) {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  return digest.digest('hex');
}

async function readSourceShard(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function validateQaPair(pair, path, { exposeOracle }) {
  assertRecord(pair && typeof pair === 'object' && !Array.isArray(pair), `${path} must be an object.`);
  assertRecord(Object.keys(pair).every((field) => ['question', 'answer'].includes(field)), `${path} has unknown fields.`);
  assertText(pair.question, `${path}.question`);
  assertText(pair.answer, `${path}.answer`);
  assertRecord(ANSWERS.has(pair.answer.toLocaleLowerCase('en-US')), `${path}.answer is outside the binary answer domain.`);
  return exposeOracle ? { question: pair.question, answer: pair.answer.toLocaleLowerCase('en-US') } : undefined;
}

function validateDevelopmentDocument(document, path, { exposeOracle = true } = {}) {
  assertRecord(document && typeof document === 'object' && !Array.isArray(document), `${path} must be an object.`);
  assertRecord(Object.keys(document).every((field) => ['type', 'axiom', 'data_samples'].includes(field)),
    `${path} has unknown fields.`);
  assertText(document.type, `${path}.type`);
  assertText(document.axiom, `${path}.axiom`);
  assertRecord(Array.isArray(document.data_samples), `${path}.data_samples must be an array.`);
  const samples = [];
  let qaCount = 0;
  for (let index = 0; index < document.data_samples.length; index += 1) {
    const sample = document.data_samples[index];
    const samplePath = `${path}.data_samples[${index}]`;
    assertRecord(sample && typeof sample === 'object' && !Array.isArray(sample), `${samplePath} must be an object.`);
    assertRecord(Object.keys(sample).every((field) => ['context', 'qa_pairs'].includes(field)),
      `${samplePath} has unknown fields.`);
    assertText(sample.context, `${samplePath}.context`);
    assertRecord(Array.isArray(sample.qa_pairs) && [2, 4].includes(sample.qa_pairs.length),
      `${samplePath}.qa_pairs must contain two or four items.`);
    const pairs = sample.qa_pairs.map((pair, pairIndex) =>
      validateQaPair(pair, `${samplePath}.qa_pairs[${pairIndex}]`, { exposeOracle }));
    qaCount += pairs.length;
    if (exposeOracle) samples.push({ context: sample.context, qaPairs: pairs });
  }
  return { type: document.type, stratum: document.axiom, samples, sampleCount: document.data_samples.length, qaCount };
}

function validateFreshDocument(document, path, mode) {
  assertRecord(document && typeof document === 'object' && !Array.isArray(document), `${path} must be an object.`);
  assertRecord(Object.keys(document).every((field) => ['type', 'axiom', 'samples'].includes(field)),
    `${path} has unknown fields.`);
  assertText(document.type, `${path}.type`);
  assertText(document.axiom, `${path}.axiom`);
  assertRecord(Array.isArray(document.samples) && document.samples.length === 20,
    `${path}.samples must contain exactly 20 items.`);
  let caseCount = 0;
  let schemaAnomalies = 0;
  for (let index = 0; index < document.samples.length; index += 1) {
    const sample = document.samples[index];
    const samplePath = `${path}.samples[${index}]`;
    assertRecord(sample && typeof sample === 'object' && !Array.isArray(sample), `${samplePath} must be an object.`);
    assertRecord(Number.isInteger(sample.id), `${samplePath}.id must be an integer.`);
    assertText(sample.context, `${samplePath}.context`);
    if (mode === 'BQA') {
      assertRecord(Object.keys(sample).every((field) => ['id', 'context', 'qa_pairs'].includes(field)),
        `${samplePath} has unknown fields.`);
      assertRecord(Array.isArray(sample.qa_pairs) && [2, 4].includes(sample.qa_pairs.length),
        `${samplePath}.qa_pairs must contain two or four items.`);
      sample.qa_pairs.forEach((pair, pairIndex) =>
        validateQaPair(pair, `${samplePath}.qa_pairs[${pairIndex}]`, { exposeOracle: false }));
      caseCount += sample.qa_pairs.length;
    } else {
      assertRecord(Object.keys(sample).every((field) => ['id', 'context', 'question', 'choices', 'answer'].includes(field)),
        `${samplePath} has unknown fields.`);
      assertText(sample.question, `${samplePath}.question`);
      assertRecord(sample.choices && typeof sample.choices === 'object' && !Array.isArray(sample.choices),
        `${samplePath}.choices must be an object.`);
      const choiceKeys = Object.keys(sample.choices).sort();
      const expectedKeys = Array.from({ length: choiceKeys.length }, (_, choiceIndex) => `choice_${choiceIndex + 1}`);
      assertRecord([4, 5].includes(choiceKeys.length) && JSON.stringify(choiceKeys) === JSON.stringify(expectedKeys),
        `${samplePath}.choices must contain four or five contiguous numbered choices.`);
      Object.entries(sample.choices).forEach(([key, value]) => {
        assertRecord(typeof value === 'string' && value.length <= MAX_TEXT_LENGTH,
          `${samplePath}.choices.${key} must be bounded text.`);
        if (value.length === 0) schemaAnomalies += 1;
      });
      assertText(sample.answer, `${samplePath}.answer`);
      caseCount += 1;
    }
  }
  return {
    type: document.type, stratum: document.axiom, sampleCount: document.samples.length, caseCount, schemaAnomalies,
  };
}

export function logicBenchSourceRoot(cacheRoot) {
  return join(cacheRoot, 'extracted', `LogicBench-${SOURCE_REVISION}`, 'data');
}

export async function inventoryLogicBenchSource(cacheRoot) {
  const sourceRoot = logicBenchSourceRoot(cacheRoot);
  const developmentFiles = await jsonFiles(join(sourceRoot, DEVELOPMENT_DIRECTORY));
  const development = { files: developmentFiles.length, samples: 0, cases: 0, strata: {} };
  const sourceFiles = [];
  for (const path of developmentFiles) {
    const validated = validateDevelopmentDocument(await readSourceShard(path), relative(sourceRoot, path), {
      exposeOracle: false,
    });
    development.samples += validated.sampleCount;
    development.cases += validated.qaCount;
    development.strata[`${validated.type}/${validated.stratum}`] = validated.qaCount;
    sourceFiles.push({ path: relative(sourceRoot, path), sha256: await sha256File(path) });
  }
  const evaluation = {};
  for (const mode of ['BQA', 'MCQA']) {
    const files = await jsonFiles(join(sourceRoot, EVALUATION_DIRECTORY, mode));
    const aggregate = { files: files.length, samples: 0, cases: 0, schemaAnomalies: 0, strata: {} };
    for (const path of files) {
      const validated = validateFreshDocument(await readSourceShard(path), relative(sourceRoot, path), mode);
      aggregate.samples += validated.sampleCount;
      aggregate.cases += validated.caseCount;
      aggregate.schemaAnomalies += validated.schemaAnomalies;
      aggregate.strata[`${validated.type}/${validated.stratum}`] = validated.caseCount;
      sourceFiles.push({ path: relative(sourceRoot, path), sha256: await sha256File(path) });
    }
    evaluation[mode] = aggregate;
  }
  return Object.freeze({
    format: 'eslm-logicbench-source-inventory-v1', sourceRevision: SOURCE_REVISION,
    sourceRoot: relative(cacheRoot, sourceRoot), development, evaluation,
    sourceSetSha256: createHash('sha256').update(JSON.stringify(sourceFiles)).digest('hex'), sourceFiles,
    evaluationInspection: 'schema-and-aggregate-only',
  });
}

export async function* logicBenchDevelopmentCases(cacheRoot) {
  const sourceRoot = logicBenchSourceRoot(cacheRoot);
  for (const path of await jsonFiles(join(sourceRoot, DEVELOPMENT_DIRECTORY))) {
    const validated = validateDevelopmentDocument(await readSourceShard(path), relative(sourceRoot, path));
    for (let sampleIndex = 0; sampleIndex < validated.samples.length; sampleIndex += 1) {
      const sample = validated.samples[sampleIndex];
      for (let pairIndex = 0; pairIndex < sample.qaPairs.length; pairIndex += 1) {
        yield Object.freeze({
          id: `${validated.type}:${validated.stratum}:${sampleIndex + 1}:${pairIndex + 1}`,
          type: validated.type, stratum: validated.stratum, context: sample.context,
          question: sample.qaPairs[pairIndex].question, answer: sample.qaPairs[pairIndex].answer,
        });
      }
    }
  }
}

const IRREGULAR = Object.freeze({
  ate: 'eat', bought: 'buy', brought: 'bring', came: 'come', did: 'do', drank: 'drink',
  eaten: 'eat', felt: 'feel', forgotten: 'forget', forgot: 'forget', gave: 'give', gone: 'go',
  had: 'have', knew: 'know', left: 'leave', made: 'make', ran: 'run', read: 'read', saw: 'see',
  goes: 'go', paid: 'pay', stayed: 'stay', took: 'take', went: 'go', wrote: 'write', written: 'write',
});
const FUNCTION_WORDS = new Set([
  'a', 'an', 'and', 'any', 'are', 'be', 'been', 'being', 'can', 'could', 'do', 'does', 'did', 'for',
  'from', 'has', 'have', 'had', 'he', 'her', 'hers', 'him', 'his', 'i', 'in', 'is', 'it', 'its', 'may',
  'might', 'my', 'of', 'on', 'or', 'our', 'she', 'someone', 'that', 'the', 'their', 'them', 'they', 'this',
  'to', 'was', 'we', 'were', 'will', 'with', 'would', 'you', 'your',
]);

function stemToken(token) {
  if (IRREGULAR[token]) return IRREGULAR[token];
  if (token.length > 5 && token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.length > 5 && token.endsWith('ing')) return token.slice(0, -3).replace(/([a-z])\1$/u, '$1');
  if (token.length > 4 && token.endsWith('ed')) return token.slice(0, -2).replace(/([a-z])\1$/u, '$1');
  if (token.length > 4 && /(?:sses|shes|ches|xes|zes|oes)$/u.test(token)) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith('s')) return token.slice(0, -1);
  return token;
}

function propositionFeatures(surface) {
  let normalized = surface.normalize('NFKC').toLocaleLowerCase('en-US')
    .replace(/\bwon['’]?t\b/gu, ' will not ')
    .replace(/\bcan\s*not\b/gu, ' can not ')
    .replace(/\b([\p{L}]+)n['’]?t\b/gu, '$1 not ')
    .replace(/\bnone\b/gu, ' not ')
    .replace(/\bno\s+one\b/gu, ' someone not ')
    .replace(/\bknows? how to\b/gu, ' ability ')
    .replace(/\bhas? the ability to\b/gu, ' ability ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  const negative = /(?:^| )not(?: |$)|(?:^| )never(?: |$)/u.test(normalized);
  normalized = normalized.replace(/\b(?:not|never)\b/gu, ' ');
  const tokens = normalized.split(/\s+/u).filter(Boolean).filter((token) => !FUNCTION_WORDS.has(token))
    .map(stemToken).filter((token) => token.length > 1);
  return { negative, tokens: [...new Set(tokens)] };
}

function tokenSimilarity(left, right) {
  if (left.length === 0 || right.length === 0) return 0;
  const rightSet = new Set(right);
  const shared = left.filter((token) => rightSet.has(token)).length;
  return shared / Math.min(left.length, right.length);
}

function createRegistry() {
  const entries = [];
  function resolve(surface, { register = false } = {}) {
    const features = propositionFeatures(surface);
    const ranked = entries.map((entry) => ({ entry, similarity: tokenSimilarity(features.tokens, entry.tokens) }))
      .sort((left, right) => right.similarity - left.similarity || left.entry.id.localeCompare(right.entry.id));
    let selected = ranked[0];
    if (!selected || selected.similarity < 0.6 || (ranked[1] && selected.similarity === ranked[1].similarity)) {
      if (!register) return { formula: atom(`p:${entries.length + 1}:unresolved`), resolved: false, features };
      const entry = { id: `p:${entries.length + 1}`, tokens: features.tokens };
      entries.push(entry);
      selected = { entry, similarity: 1 };
    }
    const positive = atom(selected.entry.id);
    return { formula: features.negative ? negate(positive) : positive, resolved: true, features };
  }
  return { resolve, entries };
}

function conditionalPairs(text) {
  const pairs = [];
  const pattern = /(?:^|\.\s*)if\s+(.+?),\s*then\s+(.+?)(?=(?:\.\s*if\b)|(?:\.\s*we know\b)|$)/giu;
  for (const match of text.matchAll(pattern)) pairs.push([match[1].trim(), match[2].replace(/[.\s]+$/u, '').trim()]);
  return pairs;
}

function enumeratedPair(text, firstMarker = '1', secondMarker = '2') {
  const escapedFirst = firstMarker.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const escapedSecond = secondMarker.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const pattern = new RegExp(`\\(${escapedFirst}\\)\\s*(.+?)\\s+(?:and|or)\\s+\\(${escapedSecond}\\)\\s*(.+?)(?=(?:\\.\\s*(?:Note|It might))|$)`, 'iu');
  const match = text.match(pattern);
  return match ? [match[1].replace(/[.\s]+$/u, '').trim(), match[2].replace(/[.\s]+$/u, '').trim()] : undefined;
}

function questionEnumeration(text) {
  const marker = /\(a\)\s*(.+?)\s+(?:and|or)\s+\(b\)\s*(.+?)[?.]*$/iu.exec(text);
  return marker ? [marker[1].trim(), marker[2].trim()] : undefined;
}

function conditionalQuestion(text) {
  const match = /^if\s+(.+?),\s*(?:does|do)\s+this\s+(?:mean|imply|entail)\s+(?:that\s+)?(.+?)[?]*$/iu.exec(text.trim());
  return match ? [match[1].trim(), match[2].trim()] : undefined;
}

function directQuestionProposition(text) {
  return text.trim()
    .replace(/^(?:does this (?:mean|imply|entail) that|does this (?:mean|imply|entail)|is)\s+/iu, '')
    .replace(/[?]+$/u, '')
    .trim();
}

function parseUniversalContext(context, registry) {
  const sentences = context.split(/\.\s*/u).map((item) => item.trim()).filter(Boolean);
  const premises = [];
  for (const sentence of sentences) {
    const universal = /^all\s+(.+?)\s+are\s+(.+)$/iu.exec(sentence);
    if (universal) {
      const left = registry.resolve(universal[1], { register: true }).formula;
      const right = registry.resolve(universal[2], { register: true }).formula;
      premises.push(binary('implies', left, right));
      continue;
    }
    const membership = /^.+?\s+is\s+(?:a|an)\s+(.+)$/iu.exec(sentence);
    if (membership) premises.push(registry.resolve(membership[1], { register: false }).formula);
  }
  return premises;
}

export function evaluateControlledLogicalArgument(context, question) {
  assertText(context, 'context');
  assertText(question, 'question');
  const registry = createRegistry();
  const premises = [];
  const conditionals = conditionalPairs(context);
  for (const [antecedentSurface, consequentSurface] of conditionals) {
    const antecedent = registry.resolve(antecedentSurface, { register: true }).formula;
    const consequent = registry.resolve(consequentSurface, { register: true }).formula;
    premises.push(binary('implies', antecedent, consequent));
  }
  const contextEnumeration = enumeratedPair(context);
  if (contextEnumeration) {
    const left = registry.resolve(contextEnumeration[0], { register: true }).formula;
    const right = registry.resolve(contextEnumeration[1], { register: true }).formula;
    premises.push(binary('or', left, right));
  }
  if (premises.length === 0 && /^all\s+/iu.test(context.trim())) premises.push(...parseUniversalContext(context, registry));
  if (premises.length === 0 && !/[.].+[.]/u.test(context)) {
    registry.resolve(context.replace(/[.]+$/u, ''), { register: true });
    premises.push(registry.resolve(context.replace(/[.]+$/u, ''), { register: false }).formula);
  }
  if (premises.length === 0) return evaluateControlledDefaultArgument(context, question);

  let query;
  const questionPair = questionEnumeration(question);
  if (questionPair && /at least one/iu.test(question)) {
    query = binary('or', registry.resolve(questionPair[0]).formula, registry.resolve(questionPair[1]).formula);
  } else {
    const conditional = conditionalQuestion(question);
    if (conditional) {
      premises.push(registry.resolve(conditional[0]).formula);
      query = registry.resolve(conditional[1]).formula;
    } else {
      query = registry.resolve(directQuestionProposition(question)).formula;
    }
  }
  const result = decideFiniteEntailment({ premises, query, maxAtoms: 16 });
  return Object.freeze({
    ...result, method: 'method:core:finite-entailment', atomCount: registry.entries.length,
    semanticTrace: Object.freeze({ premises: Object.freeze(premises), query, atoms: Object.freeze(registry.entries) }),
  });
}

export async function runLogicBenchDevelopmentProbe(cacheRoot) {
  const byStratum = {};
  let total = 0;
  let correct = 0;
  let parsed = 0;
  for await (const item of logicBenchDevelopmentCases(cacheRoot)) {
    const result = evaluateControlledLogicalArgument(item.context, item.question);
    const predicted = result.status === 'SOLVED' ? (result.entailed ? 'yes' : 'no') : undefined;
    const key = `${item.type}/${item.stratum}`;
    byStratum[key] ??= { total: 0, correct: 0, parsed: 0, statuses: {} };
    byStratum[key].total += 1;
    byStratum[key].correct += Number(predicted === item.answer);
    byStratum[key].parsed += Number(result.status === 'SOLVED');
    byStratum[key].statuses[result.status] = (byStratum[key].statuses[result.status] ?? 0) + 1;
    total += 1;
    correct += Number(predicted === item.answer);
    parsed += Number(result.status === 'SOLVED');
  }
  return Object.freeze({
    format: 'eslm-logicbench-development-probe-v1', protocol: 'controlled-logical-entailment-development-v1',
    total, correct, accuracy: total ? correct / total : 0, parsed, directSymbolicRate: total ? parsed / total : 0,
    codingAgentInvocations: 0, byStratum,
  });
}

export const LOGICBENCH_BEHAVIORAL_DEPENDENCIES = Object.freeze([
  'src/benchmark-adapters/logicbench.mjs',
  'src/benchmark-adapters/controlled-default-argument.mjs',
  'src/reasoning/finite-entailment.mjs',
  'src/reasoning/preferred-entailment.mjs',
  'tests/logicbench-symbolic.test.mjs',
]);

export async function logicBenchDependencyDigests(projectRoot) {
  return Object.fromEntries(await Promise.all(LOGICBENCH_BEHAVIORAL_DEPENDENCIES.map(async (path) => [
    path, await sha256File(join(projectRoot, path)),
  ])));
}

function increment(target, key) {
  target[key] = (target[key] ?? 0) + 1;
}

function predictedChoice(context, question, choices) {
  if (/^(?:yes|no)[?.]*$/iu.test(Object.values(choices)[0] ?? '')) {
    const result = evaluateControlledLogicalArgument(context, question);
    if (result.status !== 'SOLVED') return { key: undefined, status: result.status };
    const expectedText = result.entailed ? 'yes' : 'no';
    const matched = Object.entries(choices).find(([, value]) => value.trim().replace(/[?.]+$/u, '')
      .toLocaleLowerCase('en-US') === expectedText);
    return { key: matched?.[0], status: matched ? 'SOLVED' : 'UNPARSED' };
  }
  const supported = [];
  const statuses = [];
  for (const [key, choice] of Object.entries(choices)) {
    if (!choice.trim()) continue;
    const result = evaluateControlledLogicalArgument(context, choice);
    statuses.push(result.status);
    if (result.status === 'SOLVED' && result.entailed) supported.push(key);
  }
  if (supported.length === 1) return { key: supported[0], status: 'SOLVED' };
  return { key: undefined, status: supported.length > 1 ? 'UNDERDETERMINED' : statuses.includes('SOLVED') ? 'UNKNOWN' : 'UNPARSED' };
}

function oracleChoice(answer, choices) {
  const normalized = String(answer).trim().toLocaleLowerCase('en-US');
  if (Object.hasOwn(choices, normalized)) return normalized;
  if (/^[1-5]$/u.test(normalized) && Object.hasOwn(choices, `choice_${normalized}`)) return `choice_${normalized}`;
  const byText = Object.entries(choices).find(([, value]) => value.trim().toLocaleLowerCase('en-US') === normalized);
  return byText?.[0];
}

export async function runLogicBenchFreshAggregate(cacheRoot, projectRoot, freeze) {
  assertRecord(freeze?.format === 'eslm-logicbench-candidate-freeze-v1', 'candidate freeze format is invalid.');
  const inventory = await inventoryLogicBenchSource(cacheRoot);
  assertRecord(freeze.sourceSetSha256 === inventory.sourceSetSha256, 'candidate freeze does not bind this source set.');
  const dependencies = await logicBenchDependencyDigests(projectRoot);
  assertRecord(JSON.stringify(freeze.dependencies) === JSON.stringify(dependencies),
    'candidate freeze dependency hashes do not match the executable checkpoint.');
  const sourceRoot = logicBenchSourceRoot(cacheRoot);
  const modes = {};
  for (const mode of ['BQA', 'MCQA']) {
    const result = { total: 0, correct: 0, statuses: {}, strata: {}, malformedSourceCases: 0 };
    for (const path of await jsonFiles(join(sourceRoot, EVALUATION_DIRECTORY, mode))) {
      const document = await readSourceShard(path);
      const validated = validateFreshDocument(document, relative(sourceRoot, path), mode);
      const stratum = `${validated.type}/${validated.stratum}`;
      result.strata[stratum] ??= { total: 0, correct: 0, statuses: {} };
      for (const sample of document.samples) {
        if (mode === 'BQA') {
          for (const pair of sample.qa_pairs) {
            const evaluated = evaluateControlledLogicalArgument(sample.context, pair.question);
            const predicted = evaluated.status === 'SOLVED' ? (evaluated.entailed ? 'yes' : 'no') : undefined;
            result.total += 1;
            result.correct += Number(predicted === pair.answer.toLocaleLowerCase('en-US'));
            increment(result.statuses, evaluated.status);
            result.strata[stratum].total += 1;
            result.strata[stratum].correct += Number(predicted === pair.answer.toLocaleLowerCase('en-US'));
            increment(result.strata[stratum].statuses, evaluated.status);
          }
        } else {
          const prediction = predictedChoice(sample.context, sample.question, sample.choices);
          const oracle = oracleChoice(sample.answer, sample.choices);
          result.total += 1;
          result.correct += Number(prediction.key !== undefined && prediction.key === oracle);
          result.malformedSourceCases += Number(!oracle || Object.values(sample.choices).some((value) => !value.trim()));
          increment(result.statuses, prediction.status);
          result.strata[stratum].total += 1;
          result.strata[stratum].correct += Number(prediction.key !== undefined && prediction.key === oracle);
          increment(result.strata[stratum].statuses, prediction.status);
        }
      }
    }
    result.accuracy = result.total ? result.correct / result.total : 0;
    modes[mode] = result;
  }
  const total = modes.BQA.total + modes.MCQA.total;
  const correct = modes.BQA.correct + modes.MCQA.correct;
  return Object.freeze({
    format: 'eslm-logicbench-fresh-aggregate-v1', protocol: 'logicbench-pinned-fresh-aggregate-v1',
    sourceSetSha256: inventory.sourceSetSha256, dependencySetSha256: createHash('sha256')
      .update(JSON.stringify(dependencies)).digest('hex'),
    total, correct, accuracy: total ? correct / total : 0, modes, codingAgentInvocations: 0,
    disclosure: 'Aggregate and bounded stratum counts only; protected questions, choices, answers, and item outcomes are omitted.',
  });
}

export const LOGICBENCH_SOURCE_REVISION = SOURCE_REVISION;
