import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { PROJECT_ROOT } from './paths.mjs';

function source(definition) {
  return Object.freeze({
    ingestionStatus: 'planned',
    buildStatus: 'not-run',
    architectureGate: 'blocked-before-full-synthesis',
    nextArtifact: 'stratified-probe-report',
    ...definition,
    relations: Object.freeze(definition.relations ?? []),
    initialProfiles: Object.freeze(definition.initialProfiles ?? []),
  });
}

export const CORPUS_CATALOG = Object.freeze({
  'oewn-2025': source({
    id: 'oewn-2025',
    priority: 1,
    title: 'Open English WordNet 2025',
    role: 'English senses, synonyms, definitions, morphology, and lexical taxonomy',
    officialSource: 'https://en-word.net/static/english-wordnet-2025-json.zip',
    discoveredSourceBytes: 9986555,
    release: '2025',
    license: 'CC BY 4.0 with Princeton WordNet attribution retained',
    relations: [
      'synonym', 'hypernym', 'instance_hypernym', 'meronym', 'holonym',
      'antonym', 'similar', 'verb_entailment', 'verb_cause', 'derivation',
    ],
    initialProfiles: ['core-senses', 'full-lexicon'],
    ingestionStatus: 'cached-source-reset-rebuild-required',
    buildStatus: 'not-run-after-declarative-reset',
    architectureGate: 'source-specific-compact-profile-approved',
    nextArtifact: 'declarative-package-rebuild-and-equivalence-validation',
  }),
  'conceptnet-5.7.0-en': source({
    id: 'conceptnet-5.7.0-en',
    priority: 3,
    title: 'ConceptNet 5.7 English assertions',
    role: 'Everyday categories, properties, locations, purposes, capabilities, and causes',
    officialSource: 'https://conceptnet.s3.amazonaws.com/downloads/2019/edges/conceptnet-assertions-5.7.0.csv.gz',
    discoveredSourceBytes: 497963447,
    release: '5.7.0',
    license: 'CC BY-SA 4.0; per-assertion source and license metadata must be retained',
    relations: [
      'IsA', 'PartOf', 'HasA', 'UsedFor', 'CapableOf', 'AtLocation',
      'HasProperty', 'MadeOf', 'Causes', 'MotivatedByGoal', 'ReceivesAction',
    ],
    initialProfiles: ['english-core', 'english-physical', 'english-everyday-actions'],
    ingestionStatus: 'source-verified-adapter-pending',
  }),
  'wikidata-thematic': source({
    id: 'wikidata-thematic',
    priority: 5,
    title: 'Wikidata thematic snapshots',
    role: 'Versioned real-world facts about science, geography, people, organizations, and culture',
    officialSource: 'https://dumps.wikimedia.org/wikidatawiki/entities/',
    discoveredSourceBytes: 43196836486,
    release: 'dated snapshot required before fetch',
    license: 'CC0 for structured data',
    relations: [
      'P31', 'P279', 'P361', 'P527', 'P17', 'P30', 'P131', 'P625',
      'P571', 'P569', 'P570', 'P19', 'P106', 'P108',
    ],
    initialProfiles: ['science-core', 'geography-core', 'history-core'],
    ingestionStatus: 'future-thematic-packs-only',
  }),
  'atomic-2020': source({
    id: 'atomic-2020',
    priority: 2,
    title: 'ATOMIC 2020',
    role: 'Defeasible social, intentional, causal, and event-centered commonsense',
    officialSource: 'https://github.com/allenai/comet-atomic-2020',
    discoveredRecordCount: 1331113,
    release: 'February 2021 data release',
    license: 'CC BY for the dataset; Apache 2.0 applies only to the codebase',
    relations: [
      'xIntent', 'xNeed', 'xEffect', 'xReact', 'xWant',
      'oEffect', 'oReact', 'oWant', 'HinderedBy', 'Causes',
      'isBefore', 'isAfter', 'HasSubEvent',
    ],
    initialProfiles: ['social-core', 'event-causality'],
    ingestionStatus: 'cached-source-reset-rebuild-required',
    buildStatus: 'not-run-after-declarative-reset',
    architectureGate: 'source-specific-compact-profile-approved',
    nextArtifact: 'declarative-package-rebuild-and-equivalence-validation',
  }),
  'geonames-snapshot': source({
    id: 'geonames-snapshot',
    priority: 4,
    title: 'GeoNames snapshot',
    role: 'Places, alternate names, coordinates, administrative containment, and feature classes',
    officialSource: 'https://download.geonames.org/export/dump/',
    discoveredSourceBytes: 419923777,
    release: 'dated snapshot required before fetch',
    license: 'CC BY 4.0',
    relations: ['alternate_name', 'feature_class', 'country', 'admin_parent', 'coordinates'],
    initialProfiles: ['countries-and-capitals', 'global-places'],
    ingestionStatus: 'source-verified-adapter-pending',
  }),
  'dbpedia-snapshot': source({
    id: 'dbpedia-snapshot',
    priority: 6,
    title: 'DBpedia snapshot',
    role: 'Wikipedia-derived structured relations useful for cross-source validation',
    officialSource: 'https://databus.dbpedia.org/',
    release: 'snapshot and artifact selection pending',
    license: 'Dataset-specific attribution and share-alike terms must be resolved per artifact',
    relations: [],
    initialProfiles: ['cross-source-validation'],
    ingestionStatus: 'deferred-overlap-with-wikidata',
  }),
  'wikipedia-en-text': source({
    id: 'wikipedia-en-text',
    priority: 7,
    title: 'English Wikipedia article text',
    role: 'Rich textual evidence for claims that cannot be represented faithfully as simple edges',
    officialSource: 'https://dumps.wikimedia.org/enwiki/',
    release: 'dated pages-articles snapshot required',
    license: 'CC BY-SA 4.0 and GFDL; page attribution must be preserved',
    relations: [],
    initialProfiles: ['selected-articles-with-spans'],
    ingestionStatus: 'deferred-until-claim-extraction-and-citation-audit',
  }),
});

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export function selectedCorpusIds(value = 'all') {
  const requested = String(value).split(',').map((item) => item.trim()).filter(Boolean);
  const ids = requested.includes('all') ? Object.keys(CORPUS_CATALOG) : requested;
  for (const id of ids) {
    if (!CORPUS_CATALOG[id]) throw new Error(`Unknown knowledge corpus: ${id}`);
  }
  return [...new Set(ids)];
}

export async function corpusStatus(id) {
  const definition = CORPUS_CATALOG[id];
  if (!definition) throw new Error(`Unknown knowledge corpus: ${id}`);
  const directory = join(PROJECT_ROOT, 'training/KBs', id);
  const buildReport = await exists(join(directory, 'build-report.json'));
  const probeComplete = await exists(join(directory, 'probe', 'probe-report.json')) || buildReport;
  const sourceCached = await exists(join(directory, 'source-manifest.json'));
  const packageReady = await exists(join(directory, 'package', 'manifest.json'));
  return {
    id,
    priority: definition.priority,
    title: definition.title,
    ingestionStatus: packageReady ? 'compiled-declarative-source-profile' : definition.ingestionStatus,
    buildStatus: packageReady ? 'compiled-source-profile' : definition.buildStatus,
    architectureGate: packageReady ? 'source-specific-compact-profile-open' : definition.architectureGate,
    nextArtifact: packageReady ? 'canonical-record-normalization-and-held-out-evaluation' : probeComplete ? 'sense-aware-shard-prototype' : definition.nextArtifact,
    sourceCached,
    probeComplete,
    prepared: await exists(join(directory, 'prepared', 'manifest.json')),
    packageReady,
  };
}

export async function corpusStatuses(value = 'all') {
  const statuses = await Promise.all(selectedCorpusIds(value).map(corpusStatus));
  return statuses.sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));
}

export function corpusCatalog() {
  return Object.values(CORPUS_CATALOG).sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));
}
