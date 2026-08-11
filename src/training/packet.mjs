import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { readJsonLines, writeJson } from '../io.mjs';
import { PROJECT_ROOT } from '../paths.mjs';
import { hashFile, sha256, stableStringify } from '../util.mjs';
import { ExecutionProfiler } from '../profiling.mjs';
import { loadPackageRecords, openKnowledgePackage } from '../kb/package.mjs';

const RECORD_TYPES = new Set(['source', 'document', 'benchmarkCase', 'canonicalRecord']);

function validateRecord(record, index) {
  if (!record || typeof record !== 'object') throw new Error(`Record ${index} is not an object.`);
  if (!RECORD_TYPES.has(record.type)) throw new Error(`Record ${index} has unsupported type ${record.type}.`);
  if (!record.id) throw new Error(`Record ${index} requires a stable id.`);
  if (record.type === 'source') {
    for (const field of ['uri', 'mediaType', 'language', 'license']) {
      if (typeof record[field] !== 'string' || !record[field]) throw new Error(`Source record ${index} requires ${field}.`);
    }
    if (!/^[a-f0-9]{64}$/u.test(record.sha256)) throw new Error(`Source record ${index} requires a SHA-256 digest.`);
  }
  if (record.type === 'document' && (typeof record.text !== 'string' || typeof record.sourceId !== 'string')) {
    throw new Error(`Document record ${index} requires text and sourceId.`);
  }
  if (record.type === 'benchmarkCase' && !['train-visible', 'development-visible'].includes(record.expectedPolicy)) {
    throw new Error(`Benchmark record ${index} requires train-visible or development-visible expectedPolicy.`);
  }
  if (record.type === 'canonicalRecord' && typeof record.record !== 'object') {
    throw new Error(`Canonical record wrapper ${index} requires record.`);
  }
}

function validateRecordGraph(records) {
  const ids = new Set();
  for (const record of records) {
    if (ids.has(record.id)) throw new Error(`Duplicate training record id ${record.id}.`);
    ids.add(record.id);
  }
  const sourceIds = new Set(records.filter((record) => record.type === 'source').map((record) => record.id));
  for (const document of records.filter((record) => record.type === 'document')) {
    if (!sourceIds.has(document.sourceId)) throw new Error(`Document ${document.id} references unknown source ${document.sourceId}.`);
  }
}

export async function prepareTraining({
  input,
  output = join(tmpdir(), 'eslm-training', 'packet.json'),
  split = 'train',
  targetNamespace = 'local-candidate',
  profile = false,
}) {
  if (!/^[a-z][a-z0-9-]*$/u.test(targetNamespace)) {
    throw new Error('Training targetNamespace must be a lowercase namespace identifier.');
  }
  const profiler = new ExecutionProfiler('training-preparation', profile, { split });
  const inputPath = resolve(input);
  const records = await profiler.measure('input.read-jsonl', () => readJsonLines(inputPath));
  profiler.annotate('input.read-jsonl', { records: records.length });
  profiler.measureSync('input.validate-records', () => records.forEach(validateRecord), { records: records.length });
  profiler.measureSync('input.validate-record-graph', () => validateRecordGraph(records), { records: records.length });
  const canonical = profiler.measureSync(
    'input.canonicalize', () => records.map((record) => stableStringify(record)).join('\n'),
    { records: records.length },
  );
  const typeCounts = profiler.measureSync('input.count-types', () => Object.fromEntries(
    [...RECORD_TYPES].map((type) => [type, records.filter((record) => record.type === type).length]),
  ), { records: records.length });
  const sourceDigest = await profiler.measure('input.hash-source', () => hashFile(inputPath));
  const packet = {
    format: 'eslm-training-packet-v2',
    createdAt: new Date().toISOString(),
    source: {
      file: basename(inputPath), sha256: sourceDigest, recordCount: records.length,
      evidenceContainer: 'PACKET.json#records', embeddedRecords: split === 'train', mediaType: 'application/jsonl',
    },
    targetNamespace,
    split,
    leakagePolicy: split === 'train' ? 'agent-visible' : 'agent-hidden',
    contentDigest: sha256(canonical),
    typeCounts,
    records: split === 'train' ? records : undefined,
  };
  await profiler.measure('output.write-packet', () => writeJson(output, packet), {
    visibleRecords: split === 'train' ? records.length : 0,
  });
  const preparationProfile = profiler.finish('ok', {
    records: records.length,
    canonicalBytes: Buffer.byteLength(canonical),
  });
  const profilePath = profile ? `${output}.profile.json` : undefined;
  if (profilePath) await writeJson(profilePath, preparationProfile);
  return { output, ...packet.source, targetNamespace, typeCounts, split, profilePath, profile: preparationProfile };
}

export async function validateGeneratedModel(modelDirectory = join(PROJECT_ROOT, 'training/KBs/quick/package')) {
  const directory = resolve(modelDirectory);
  const handle = await openKnowledgePackage(join(directory, 'manifest.json'));
  if (handle.shards.length === 0) throw new Error('Candidate requires a non-empty shard directory.');
  const loaded = await loadPackageRecords(handle);
  if (handle.manifest.canonicalSource?.recordCount !== loaded.records.length) {
    throw new Error('Candidate manifest record count does not match compiled shards.');
  }
  return {
    directory,
    kbId: handle.manifest.kbId,
    kbVersion: handle.manifest.kbVersion,
    shards: handle.shards.length,
    records: loaded.records.length,
  };
}

export async function writeCandidateSkeleton(packetPath, outputDirectory) {
  const packet = JSON.parse(await readFile(packetPath, 'utf8'));
  if (packet.split !== 'train' || !packet.records) throw new Error('Only an agent-visible training packet can generate a candidate.');
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(join(outputDirectory, 'PACKET.json'), `${JSON.stringify(packet, null, 2)}\n`, 'utf8');
  return { outputDirectory, instruction: 'Use training/.agents/skills/document-to-kb-builder to generate canonical declarative records.' };
}
