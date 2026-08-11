import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ShardCache } from '../memory-policy.mjs';
import { sha256 } from '../util.mjs';
import { CONCEPTNET_RELATIONS, conceptBucket, normalizeConceptTerm } from './conceptnet-relations.mjs';
import { collectCompatibilityEvidence } from './compatibility-evidence.mjs';

async function readShard(path, expectedChecksum) {
  const bytes = await readFile(path);
  if (`sha256:${sha256(bytes)}` !== expectedChecksum) throw new Error(`Checksum mismatch for ConceptNet shard ${path}.`);
  return { value: Object.freeze(JSON.parse(bytes.toString('utf8'))), sourceBytes: bytes.length };
}

function variants(value) {
  const clean = normalizeConceptTerm(value).replace(/^(?:a|an|the)\s+/u, '');
  const values = new Set([clean]);
  if (clean.endsWith('ies') && clean.length > 4) values.add(`${clean.slice(0, -3)}y`);
  if (clean.endsWith('es') && clean.length > 4) values.add(clean.slice(0, -2));
  if (clean.endsWith('s') && clean.length > 3) values.add(clean.slice(0, -1));
  return [...values];
}

function answer(provider, relation, subject, edges, direction) {
  if (edges.length === 0) return undefined;
  const selected = edges.slice(0, 12);
  const values = selected.map((edge) => edge[0]);
  return {
    status: 'ANSWERED', answer: values.join(', '), values,
    provenance: selected.flatMap((edge) => edge[3].slice(0, 4).map((row) => ({
      fact: `conceptnet:${row}`, source: [`ConceptNet-5.7.0:${row}`], relation,
      method: 'source-retrieval', weight: edge[1], provenanceIds: edge[2],
    }))),
    reasoning: { method: 'typed-defeasible-relation-retrieval', relation,
      policy: CONCEPTNET_RELATIONS[relation].inference, direction },
    query: { provider: provider.manifest.id, relation, subject, direction },
    learned: [], learnedRules: [], context: {},
  };
}

function cleanQuestion(text) {
  return text.trim().replace(/^(?:please|can you tell me|could you tell me)\s+/iu, '').replace(/[?.!]+$/u, '');
}

const FUNCTION_WORDS = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'to', 'of', 'in', 'on', 'at', 'with', 'from', 'for', 'and', 'or', 'that', 'this', 'it', 'its',
  'then', 'than', 'there', 'what', 'which', 'who', 'does', 'do', 'did', 'can', 'could', 'will', 'would']);

function lexicalTerms(text) {
  const tokens = normalizeConceptTerm(text).split(' ').filter((token) => token && !FUNCTION_WORDS.has(token));
  const terms = new Set(tokens);
  for (let size = 2; size <= 3; size += 1) {
    for (let index = 0; index <= tokens.length - size; index += 1) terms.add(tokens.slice(index, index + size).join(' '));
  }
  return [...terms];
}

function boundedLexicalTerms(text, limit) {
  return lexicalTerms(text).toSorted((left, right) => {
    const leftWords = left.split(' ').length;
    const rightWords = right.split(' ').length;
    return rightWords - leftWords || right.length - left.length || left.localeCompare(right);
  }).slice(0, limit);
}

function continuationFamily(relation) {
  const family = CONCEPTNET_RELATIONS[relation]?.family;
  if (family === 'causal') return 'causal';
  if (family === 'intentional' || family === 'purpose') return 'goal';
  if (family === 'lexical-opposition') return 'contradiction';
  if (['location', 'material', 'property', 'taxonomy', 'mereology'].includes(family)) return 'state';
  return 'event';
}

async function relationalMatches(provider, sourceTerms, targetTerms, relations) {
  const wanted = new Set(targetTerms);
  const evidence = [];
  for (const subject of sourceTerms) {
    for (const relation of relations) {
      for (const edge of await provider.relationEdges('forward', relation, subject)) {
        const object = normalizeConceptTerm(edge[0]);
        if (!wanted.has(object)) continue;
        evidence.push({
          relation,
          subject,
          object,
          weight: edge[1],
          contribution: Math.log1p(edge[1]),
          semanticFamily: continuationFamily(relation),
          sourceRefs: edge[3].slice(0, 8).map((row) => `ConceptNet-5.7.0:${row}`),
        });
      }
    }
  }
  return evidence;
}

export class ConceptNetProvider {
  constructor(model, options = {}) {
    this.manifest = model.manifest;
    this.modelDirectory = options.modelDirectory;
    this.shardsByRef = options.shardsByRef;
    this.mode = options.mode ?? 'eager';
    if (this.mode === 'eager') this.data = model.data;
    else this.cache = new ShardCache(options.cacheBytes, 7);
  }

  beginQuery() { this.queryShards = new Map(); }
  endQuery() { this.queryShards = undefined; }

  async load(ref) {
    if (this.queryShards?.has(ref)) return this.queryShards.get(ref);
    const shard = this.shardsByRef.get(ref);
    const loader = () => readShard(join(this.modelDirectory, ref), shard.checksum);
    const value = this.mode === 'eager' ? this.data[ref] : await this.cache.get(ref, loader);
    this.queryShards?.set(ref, value);
    return value;
  }

  async relationEdges(direction, relation, term) {
    const all = [];
    for (const candidate of variants(term)) {
      const ref = `${direction}/${relation.toLocaleLowerCase('en-US')}-${conceptBucket(candidate)}.json`;
      for (const edge of (await this.load(ref))[candidate] ?? []) {
        const known = all.find((item) => item[0] === edge[0]);
        if (!known) all.push(edge);
        else known[1] = Math.max(known[1], edge[1]);
      }
    }
    return all.sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  }

  async query(direction, relation, term) {
    return answer(this, relation, normalizeConceptTerm(term), await this.relationEdges(direction, relation, term), direction);
  }

  memorySnapshot() {
    return this.mode === 'eager' ? { mode: 'eager', estimatedBytes: 220 * 1024 * 1024 }
      : { mode: 'lazy', ...this.cache.snapshot() };
  }

  async edgeWeight(relation, subject, object) {
    const wanted = new Set(variants(object));
    const edges = await this.relationEdges('forward', relation, subject);
    return edges.filter((edge) => wanted.has(normalizeConceptTerm(edge[0])))
      .reduce((best, edge) => Math.max(best, edge[1]), 0);
  }

  async semanticEvidence(request) {
    return collectCompatibilityEvidence(this, request);
  }

  async scorePlausibility(text) {
    const clauses = text.split(/[.!?]+/u).map((item) => item.trim()).filter(Boolean);
    const evidence = [];
    for (const clause of clauses) {
      const frames = [];
      let match = clause.match(/^(.+?) (?:is|are) (?:a|an) (.+)$/iu);
      if (match) frames.push(['IsA', match[1], match[2]]);
      match = clause.match(/^(.+?) (?:is|are) (.+)$/iu);
      if (match) frames.push(['HasProperty', match[1], match[2]]);
      match = clause.match(/^(.+?) can (.+)$/iu);
      if (match) frames.push(['CapableOf', match[1], match[2]]);
      match = clause.match(/^(.+?) (?:is|are) used (?:to|for) (.+)$/iu);
      if (match) frames.push(['UsedFor', match[1], match[2]]);
      match = clause.match(/^(.+?) (?:is|are) (?:found|located) (?:in|at) (.+)$/iu);
      if (match) frames.push(['AtLocation', match[1], match[2]]);
      match = clause.match(/^(.+?) (?:is|are) made of (.+)$/iu);
      if (match) frames.push(['MadeOf', match[1], match[2]]);
      match = clause.match(/^(.+?) (?:has|have) (.+)$/iu);
      if (match) frames.push(['HasA', match[1], match[2]]);
      match = clause.match(/^(.+?) (?:causes?|can cause) (.+)$/iu);
      if (match) frames.push(['Causes', match[1], match[2]]);
      let clauseWeight = 0;
      for (const [relation, subject, object] of frames) {
        const weight = await this.edgeWeight(relation, subject, object);
        if (weight > clauseWeight) clauseWeight = weight;
        if (weight > 0) evidence.push({ relation, subject: normalizeConceptTerm(subject), object: normalizeConceptTerm(object), weight });
      }
      if (clauseWeight > 0) evidence.push({ clause, weight: clauseWeight });
    }
    return { score: evidence.filter((item) => item.clause).reduce((sum, item) => sum + Math.log1p(item.weight), 0), evidence };
  }

  async scoreCompatibility(context, target) {
    const contextTerms = boundedLexicalTerms(context, 32);
    const targetTerms = boundedLexicalTerms(target, 16);
    const targetTermSet = new Set(targetTerms);
    let score = 0;
    const evidence = [];
    for (const contextTerm of contextTerms) {
      for (const relation of ['Synonym', 'Antonym']) {
        const direction = CONCEPTNET_RELATIONS[relation].direction === 'symmetric' ? 'forward' : 'forward';
        const edges = await this.relationEdges(direction, relation, contextTerm);
        for (const edge of edges) {
          if (!targetTermSet.has(normalizeConceptTerm(edge[0]))) continue;
          const contribution = Math.log1p(edge[1]) * (relation === 'Antonym' ? -1 : 1);
          score += contribution;
          evidence.push({
            relation, subject: contextTerm, object: edge[0], weight: edge[1], contribution,
            semanticFamily: continuationFamily(relation),
            sourceRefs: edge[3].slice(0, 8).map((row) => `ConceptNet-5.7.0:${row}`),
          });
        }
      }
    }
    const forward = await relationalMatches(this, contextTerms, targetTerms, [
      'Causes', 'UsedFor', 'CapableOf', 'HasProperty', 'AtLocation',
    ]);
    const goals = await relationalMatches(this, targetTerms, contextTerms, ['MotivatedByGoal']);
    evidence.push(...forward, ...goals);
    score += [...forward, ...goals].reduce((total, item) => total + item.contribution, 0);
    const factual = await this.scorePlausibility(target);
    const factualEvidence = factual.evidence.map((item) => ({
      ...item,
      semanticFamily: continuationFamily(item.relation),
    }));
    return { score: score + factual.score, evidence: [...evidence, ...factualEvidence] };
  }

  async ask(text) {
    const clean = cleanQuestion(text);
    const patterns = [
      [/^what (?:is|are) (.+?) used for$/iu, 'UsedFor'],
      [/^what can (.+?) do$/iu, 'CapableOf'],
      [/^where (?:is|are) (.+?) (?:found|located)$/iu, 'AtLocation'],
      [/^what propert(?:y|ies) (?:does|do) (.+?) have$/iu, 'HasProperty'],
      [/^what (?:is|are) (.+?) made of$/iu, 'MadeOf'],
      [/^what (?:does|do) (.+?) cause$/iu, 'Causes'],
      [/^what motivates (.+)$/iu, 'MotivatedByGoal'],
      [/^what (?:is|are) (.+?) (?:a kind|a type) of$/iu, 'IsA'],
      [/^what parts (?:does|do) (.+?) have$/iu, 'HasA'],
      [/^what (?:is|are) part of (.+)$/iu, 'PartOf'],
      [/^what is (?:an )?antonym of (.+)$/iu, 'Antonym'],
      [/^what is (?:a )?synonym of (.+)$/iu, 'Synonym'],
    ];
    for (const [pattern, relation] of patterns) {
      const match = clean.match(pattern);
      if (match) return this.query('forward', relation, match[1]);
    }
    const reverse = clean.match(/^what (?:is|are) (.+?) used by$/iu);
    return reverse ? this.query('reverse', 'UsedFor', reverse[1]) : undefined;
  }
}
