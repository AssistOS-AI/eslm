import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { scoreSemanticCompatibility } from '../reasoning/semantic-compatibility.mjs';
import { sha256 } from '../util.mjs';
import { collectCompatibilityEvidence } from './compatibility-evidence.mjs';
import { makeGroundingEntry } from '../reasoning/grounding-retrieval.mjs';

function groundingKey(value) {
  return String(value ?? '').normalize('NFKD').replace(/\p{M}+/gu, '')
    .toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/gu, ' ').trim();
}

export class WorldRelationsProvider {
  constructor(model, options = {}) {
    this.manifest = model.manifest;
    this.modelDirectory = options.modelDirectory;
    this.shard = options.shardsByRef.get('ontology/all.json');
    this.groundingShard = options.shardsByRef.get('ontology/grounding.json');
    this.ontology = model.data?.['ontology/all.json'];
    this.groundingPostings = model.data?.['ontology/grounding.json']?.postings;
  }

  beginQuery() {}
  endQuery() {}

  async load() {
    if (this.ontology) return this.ontology;
    const bytes = await readFile(join(this.modelDirectory, 'ontology/all.json'));
    if (`sha256:${sha256(bytes)}` !== this.shard.checksum) throw new Error('World relation ontology checksum mismatch.');
    this.ontology = Object.freeze(JSON.parse(bytes.toString('utf8')));
    return this.ontology;
  }

  async loadGroundingPostings() {
    if (this.groundingPostings) return this.groundingPostings;
    const bytes = await readFile(join(this.modelDirectory, 'ontology/grounding.json'));
    if (`sha256:${sha256(bytes)}` !== this.groundingShard.checksum) {
      throw new Error('World relation grounding checksum mismatch.');
    }
    const value = JSON.parse(bytes.toString('utf8'));
    if (value.schema !== 'world-relations-grounding-postings-v1'
      || !value.postings || typeof value.postings !== 'object' || Array.isArray(value.postings)) {
      throw new Error('Invalid World Relations grounding postings.');
    }
    this.groundingPostings = Object.freeze(value.postings);
    return this.groundingPostings;
  }

  memorySnapshot() {
    return {
      mode: this.ontology ? 'loaded' : 'lazy',
      groundingMode: this.groundingPostings ? 'loaded' : 'lazy',
      estimatedBytes: this.shard.compressedBytes * 5 + this.groundingShard.compressedBytes * 5,
    };
  }

  async ask() { return undefined; }

  async retrieveGrounding(request) {
    const groundingPostings = await this.loadGroundingPostings();
    const maximumLookups = Math.min(request.limits.maximumLookups, request.terms.length);
    const maximumValues = request.limits.maximumValuesPerLookup;
    const records = new Map();
    let truncated = request.terms.length > maximumLookups;
    for (const term of request.terms.slice(0, maximumLookups)) {
      const posting = groundingPostings[groundingKey(term)] ?? [];
      if (posting.length > maximumValues) truncated = true;
      for (const record of posting.slice(0, maximumValues)) {
        const id = record.kind === 'relation-definition'
          ? `relation:${record.relation}` : `affordance:${record.index}`;
        records.set(id, record);
      }
    }
    const entries = [...records].map(([id, record]) => {
      if (record.kind === 'relation-definition') {
        const inverse = record.definition.inverse;
        return makeGroundingEntry({
          kbId: this.manifest.kbId,
          kbVersion: this.manifest.kbVersion,
          recordId: `world-relations:${id}`,
          statement: inverse
            ? `The reviewed relation ontology maps “${record.relation}” to inverse relation “${inverse.relation}” with polarity ${inverse.polarity}.`
            : `The reviewed relation ontology declares the relation “${record.relation}”.`,
          semantic: { kind: record.kind, relation: record.relation, ...record.definition },
          epistemicStatus: 'reviewed-ontology-record',
          provenance: [`world-relations-1.0:ontology/all.json#relations/${record.relation}`],
          relevance: { score: 14, reasons: ['exact-relation-label-match'] },
        });
      }
      return makeGroundingEntry({
        kbId: this.manifest.kbId,
        kbVersion: this.manifest.kbVersion,
        recordId: `world-relations:${id}`,
        statement: `The reviewed compatibility ontology records ${record.materialClass} → ${record.action} with polarity ${record.polarity}.`,
        semantic: {
          kind: record.kind,
          materialClass: record.materialClass,
          action: record.action,
          polarity: record.polarity,
        },
        epistemicStatus: 'reviewed-ontology-record',
        provenance: [`world-relations-1.0:ontology/all.json#affordances/${record.index}`],
        relevance: { score: 12, reasons: ['exact-affordance-term-match'] },
      });
    });
    return {
      entries,
      receipt: {
        kbId: this.manifest.kbId,
        kbVersion: this.manifest.kbVersion,
        status: entries.length > 0 ? 'matches-found' : 'no-match',
        coverage: 'bounded-exact-relation-and-affordance-postings',
        complete: !truncated && request.termSelection.complete,
        candidatesConsidered: records.size,
        truncationReasons: [
          ...(truncated ? ['lookup-or-posting-budget'] : []),
          ...(!request.termSelection.complete ? ['term-selection-budget'] : []),
        ],
      },
    };
  }

  async semanticEvidence(request) {
    return collectCompatibilityEvidence(this, request);
  }

  async scoreCompatibility(context, target) {
    const scored = scoreSemanticCompatibility(context, target, await this.load());
    return Object.freeze({
      ...scored,
      evidence: Object.freeze(scored.evidence.map((item) => Object.freeze({
        ...item,
        semanticFamily: item.contribution < 0 ? 'contradiction' : 'state',
      }))),
    });
  }
}
