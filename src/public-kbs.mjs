import { access, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { PROJECT_ROOT } from './paths.mjs';

export const PUBLIC_KB_CATALOG = Object.freeze({
  'oewn-2025': Object.freeze({
    id: 'oewn-2025', title: 'Open English WordNet 2025', role: 'public lexical and taxonomic knowledge',
    model: 'training/KBs/oewn-2025/model/manifest.mjs', documentation: 'knowledge-sources.html',
    defaultInteractive: true, benchmarkEligible: false,
  }),
  'atomic-2020': Object.freeze({
    id: 'atomic-2020', title: 'ATOMIC 2020', role: 'public defeasible event and social commonsense',
    model: 'training/KBs/atomic-2020/model/manifest.mjs', documentation: 'knowledge-sources.html',
    defaultInteractive: true, benchmarkEligible: false,
  }),
});

function normalizedLemma(value) {
  return value.normalize('NFKC').toLocaleLowerCase('en-US').replaceAll('_', ' ')
    .replace(/^(?:the|a|an)\s+/u, '').replace(/[?.!]+$/gu, '').trim();
}

function provenance(id, source, detail) {
  return [{ fact: `${id}:${source}`, source: [detail], method: 'source-retrieval' }];
}

function response(provider, answer, values, source, detail, reasoning = 'retrieval') {
  return {
    status: values.length > 0 ? 'ANSWERED' : 'UNKNOWN', answer, values,
    provenance: provenance(provider.manifest.id, source, detail),
    reasoning: { method: reasoning }, query: { provider: provider.manifest.id, source },
    learned: [], learnedRules: [], context: {},
  };
}

class WordNetProvider {
  constructor(model) {
    this.manifest = model.manifest;
    this.synsets = model.data.synsets;
    this.lemmas = model.data.lemmas;
  }

  senses(lemma) {
    return (this.lemmas[normalizedLemma(lemma)] ?? []).map((id) => ({ id, ...this.synsets[id] }));
  }

  hypernymProof(left, right, maxDepth = 16) {
    const starts = this.senses(left);
    const targets = new Set(this.senses(right).map((sense) => sense.id));
    if (starts.length === 0 || targets.size === 0) return undefined;
    const queue = starts.map((sense) => ({ id: sense.id, path: [sense.id] }));
    const seen = new Set(queue.map((item) => item.id));
    while (queue.length > 0) {
      const current = queue.shift();
      if (targets.has(current.id)) return current.path;
      if (current.path.length > maxDepth) continue;
      for (const next of this.synsets[current.id]?.h ?? []) {
        if (!this.synsets[next] || seen.has(next)) continue;
        seen.add(next);
        queue.push({ id: next, path: [...current.path, next] });
      }
    }
    return undefined;
  }

  ask(text) {
    const clean = text.trim();
    let match = clean.match(/^(?:what does (.+?) mean|define (.+?))\??$/iu);
    if (match) {
      const lemma = match[1] ?? match[2];
      const senses = this.senses(lemma);
      if (senses.length === 0) return response(this, `Open English WordNet 2025 has no compiled sense for “${lemma}”.`, [], normalizedLemma(lemma), 'oewn-2025');
      const descriptions = senses.slice(0, 5).map((sense, index) => `${index + 1}. (${sense.p}) ${sense.d[0] ?? 'definition unavailable'}`);
      return response(this, `${normalizedLemma(lemma)} has ${senses.length} compiled sense${senses.length === 1 ? '' : 's'}:\n${descriptions.join('\n')}`, senses.map((sense) => sense.id), senses[0].id, `oewn-2025:${senses[0].l}`);
    }
    match = clean.match(/^(?:what are (?:the )?synonyms (?:of|for)|give me synonyms (?:of|for)) (.+?)\??$/iu);
    if (match) {
      const senses = this.senses(match[1]);
      if (senses.length === 0) return response(this, `Open English WordNet 2025 has no compiled sense for “${match[1]}”.`, [], normalizedLemma(match[1]), 'oewn-2025');
      const synonyms = [...new Set(senses.flatMap((sense) => sense.m).filter((word) => normalizedLemma(word) !== normalizedLemma(match[1])))];
      return response(this, synonyms.length > 0 ? `Possible synonyms across the compiled senses are: ${synonyms.slice(0, 20).join(', ')}.` : 'No distinct synonyms are recorded for that lemma.', synonyms, senses[0].id, `oewn-2025:${senses[0].l}`);
    }
    match = clean.match(/^how many senses does (.+?) have\??$/iu);
    if (match) {
      const senses = this.senses(match[1]);
      return response(this, `${normalizedLemma(match[1])} has ${senses.length} compiled sense${senses.length === 1 ? '' : 's'} in Open English WordNet 2025.`, senses.length > 0 ? [senses.length] : [], normalizedLemma(match[1]), 'oewn-2025');
    }
    match = clean.match(/^is (?:a |an )?(.+?) (?:a|an) (.+?)\??$/iu);
    if (match) {
      if (this.senses(match[1]).length === 0 || this.senses(match[2]).length === 0) return undefined;
      const proof = this.hypernymProof(match[1], match[2]);
      if (!proof) return response(this, `I found no WordNet hypernym path proving that ${normalizedLemma(match[1])} is ${normalizedLemma(match[2])}. This is unknown, not proven false.`, [], normalizedLemma(match[1]), 'oewn-2025', 'bounded-deduction');
      return response(this, `Yes. At least one sense of ${normalizedLemma(match[1])} reaches ${normalizedLemma(match[2])} through a ${proof.length - 1}-edge WordNet path.`, [true], proof.at(-1), `oewn-2025:path:${proof.join('>')}`, 'bounded-deduction');
    }
    return undefined;
  }
}

function eventTokens(value) {
  return normalizedEvent(value)
    .split(/[^a-z0-9']+/u).filter(Boolean).filter((token) => !['personx', 'persony', 'someone', 'the', 'a', 'an', 'to'].includes(token))
    .map((token) => token.length > 4 && token.endsWith('s') ? token.slice(0, -1) : token);
}

function normalizedEvent(value) {
  return value.normalize('NFKC').toLocaleLowerCase('en-US').replace(/\s+/gu, ' ')
    .replace(/[?.!]+$/gu, '').trim().replace(/person\s*x/gu, 'personx').replace(/person\s*y/gu, 'persony');
}

class AtomicProvider {
  constructor(model) {
    this.manifest = model.manifest;
    this.events = model.data.events;
    this.keys = Object.keys(this.events);
  }

  findEvent(input) {
    const exact = normalizedEvent(input);
    if (this.events[exact]) return { key: exact, score: 1 };
    const wanted = new Set(eventTokens(exact));
    if (wanted.size === 0) return undefined;
    let best;
    for (const key of this.keys) {
      const candidate = new Set(eventTokens(key));
      const overlap = [...wanted].filter((token) => candidate.has(token)).length;
      if (overlap === 0) continue;
      const score = overlap / new Set([...wanted, ...candidate]).size;
      if (!best || score > best.score || (score === best.score && key.length < best.key.length)) best = { key, score };
    }
    return best?.score >= 0.5 ? best : undefined;
  }

  answerFor(eventText, relations, label) {
    const match = this.findEvent(eventText);
    if (!match) return response(this, `ATOMIC 2020 has no sufficiently close compiled event for “${eventText}”.`, [], normalizedEvent(eventText), 'atomic-2020:train');
    const event = this.events[match.key];
    const candidates = relations.flatMap((relation) => (event.r[relation] ?? []).map(([tail, line]) => ({ tail, line, relation })));
    if (candidates.length === 0) return response(this, `ATOMIC 2020 matched “${event.h}”, but its train tuples contain no ${label} candidate.`, [], match.key, 'atomic-2020:train');
    const selected = candidates.slice(0, 8);
    const answer = `${label} candidates for “${event.h}”: ${selected.map((item) => item.tail).join('; ')}. These are defeasible possibilities, not certain facts.`;
    return {
      ...response(this, answer, selected.map((item) => item.tail), match.key, `atomic-2020:train:${selected[0].line}`, 'defeasible-retrieval'),
      match: { event: event.h, score: match.score },
      provenance: selected.map((item) => ({
        fact: `atomic-2020:train:${item.line}`, source: [`atomic-2020:train.tsv:${item.line}`],
        relation: item.relation, method: 'source-retrieval',
      })),
    };
  }

  ask(text) {
    const clean = text.trim();
    let match = clean.match(/^what might happen after (.+?)\??$/iu);
    if (match) return this.answerFor(match[1], ['xEffect', 'oEffect', 'isAfter', 'Causes'], 'possible effect');
    match = clean.match(/^what might happen before (.+?)\??$/iu);
    if (match) return this.answerFor(match[1], ['xNeed', 'isBefore'], 'possible prerequisite');
    match = clean.match(/^why might (.+?)\??$/iu);
    if (match) return this.answerFor(match[1], ['xIntent', 'xReason'], 'possible intention or reason');
    match = clean.match(/^how might (?:personx|someone|they) feel after (.+?)\??$/iu);
    if (match) return this.answerFor(match[1], ['xReact'], 'possible reaction');
    match = clean.match(/^what might (?:personx|someone|they) want after (.+?)\??$/iu);
    if (match) return this.answerFor(match[1], ['xWant'], 'possible next desire');
    match = clean.match(/^what could prevent (.+?)\??$/iu);
    if (match) return this.answerFor(match[1], ['HinderedBy'], 'possible obstacle');
    match = clean.match(/^what (?:is|are) (.+?) used for\??$/iu);
    if (match) return this.answerFor(match[1], ['ObjectUse'], 'possible use');
    match = clean.match(/^where (?:is|are) (.+?) (?:found|located)\??$/iu);
    if (match) return this.answerFor(match[1], ['AtLocation'], 'possible location');
    return undefined;
  }
}

async function exists(path) {
  try { await access(path); return true; } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function publicKbStatuses() {
  const statuses = [];
  for (const definition of Object.values(PUBLIC_KB_CATALOG)) {
    const modelPath = join(PROJECT_ROOT, definition.model);
    const built = await exists(modelPath);
    let manifest;
    if (built) {
      const reportPath = join(PROJECT_ROOT, 'training/KBs', definition.id, 'build-report.json');
      manifest = JSON.parse(await readFile(reportPath, 'utf8')).manifest;
    }
    statuses.push({ ...definition, available: built, loaded: false, counts: manifest?.counts, capabilities: manifest?.capabilities, limitations: manifest?.limitations });
  }
  return statuses;
}

export async function loadPublicKnowledgeBase(id) {
  const definition = PUBLIC_KB_CATALOG[id];
  if (!definition) throw new Error(`Unknown public knowledge base: ${id}`);
  const path = join(PROJECT_ROOT, definition.model);
  const module = await import(`${pathToFileURL(path).href}?kb=${Date.now()}`);
  if (module.manifest?.format !== 'eslm-public-kb-v1') throw new Error(`Invalid public KB manifest: ${id}`);
  if (id === 'oewn-2025') return new WordNetProvider(module);
  if (id === 'atomic-2020') return new AtomicProvider(module);
  throw new Error(`No runtime provider for ${id}.`);
}

export async function loadPublicKnowledgeBases(ids) {
  return Promise.all(ids.map(loadPublicKnowledgeBase));
}

export async function validatePublicKnowledgeBase(id) {
  const provider = await loadPublicKnowledgeBase(id);
  if (id === 'oewn-2025') {
    const synsets = Object.keys(provider.synsets).length;
    const lemmas = Object.keys(provider.lemmas).length;
    if (synsets !== provider.manifest.counts.synsets || lemmas !== provider.manifest.counts.uniqueLemmas) {
      throw new Error('Open English WordNet generated counts do not match its indexes.');
    }
    const smoke = provider.ask('Is a dog an animal?');
    if (smoke?.values?.[0] !== true) throw new Error('Open English WordNet hypernym smoke test failed.');
    return { id, valid: true, counts: provider.manifest.counts, smoke: smoke.answer };
  }
  const events = Object.keys(provider.events).length;
  if (events !== provider.manifest.counts.uniqueEvents) throw new Error('ATOMIC generated event count does not match its index.');
  const smoke = provider.ask('Why might apologize?');
  if (smoke?.status !== 'ANSWERED') throw new Error('ATOMIC intent smoke test failed.');
  return { id, valid: true, counts: provider.manifest.counts, smoke: smoke.answer };
}
