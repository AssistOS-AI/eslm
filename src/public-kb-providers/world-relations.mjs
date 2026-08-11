import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { scoreSemanticCompatibility } from '../reasoning/semantic-compatibility.mjs';
import { sha256 } from '../util.mjs';
import { collectCompatibilityEvidence } from './compatibility-evidence.mjs';

export class WorldRelationsProvider {
  constructor(model, options = {}) {
    this.manifest = model.manifest;
    this.modelDirectory = options.modelDirectory;
    this.shard = options.shardsByRef.get('ontology/all.json');
    this.ontology = model.data?.['ontology/all.json'];
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

  memorySnapshot() { return { mode: this.ontology ? 'loaded' : 'lazy', estimatedBytes: this.shard.compressedBytes * 5 }; }

  async ask() { return undefined; }

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
