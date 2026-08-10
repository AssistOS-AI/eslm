import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readJsonLines, writeJson } from './io.mjs';
import { validateModel } from './model-loader.mjs';
import { PROJECT_ROOT } from './paths.mjs';
import { hashFile, sha256, stableStringify } from './util.mjs';
import { ExecutionProfiler } from './profiling.mjs';

const RECORD_TYPES = new Set(['entity', 'fact', 'rule', 'lexeme', 'construction', 'document']);

function validateRecord(record, index) {
  if (!record || typeof record !== 'object') throw new Error(`Record ${index} is not an object.`);
  if (!RECORD_TYPES.has(record.type)) throw new Error(`Record ${index} has unsupported type ${record.type}.`);
  if (record.type === 'entity' && (!record.id || !Array.isArray(record.names))) throw new Error(`Entity record ${index} requires id and names.`);
  if (record.type === 'fact' && (!record.subject || !record.predicate || (!record.object && record.value === undefined))) throw new Error(`Fact record ${index} is incomplete.`);
  if (record.type === 'rule' && (!Array.isArray(record.when) || !Array.isArray(record.then))) throw new Error(`Rule record ${index} is incomplete.`);
}

export async function prepareTraining({
  input,
  output = join(PROJECT_ROOT, 'training/work/packet.json'),
  split = 'train',
  profile = false,
}) {
  const profiler = new ExecutionProfiler('training-preparation', profile, { split });
  const inputPath = resolve(input);
  const records = await profiler.measure('input.read-jsonl', () => readJsonLines(inputPath));
  profiler.annotate('input.read-jsonl', { records: records.length });
  profiler.measureSync('input.validate-records', () => records.forEach(validateRecord), { records: records.length });
  const canonical = profiler.measureSync(
    'input.canonicalize', () => records.map((record) => stableStringify(record)).join('\n'),
    { records: records.length },
  );
  const typeCounts = profiler.measureSync('input.count-types', () => Object.fromEntries(
    [...RECORD_TYPES].map((type) => [type, records.filter((record) => record.type === type).length]),
  ), { records: records.length });
  const sourceDigest = await profiler.measure('input.hash-source', () => hashFile(inputPath));
  const packet = {
    format: 'eslm-training-packet-v1',
    createdAt: new Date().toISOString(),
    source: { file: basename(inputPath), sha256: sourceDigest, recordCount: records.length },
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
  return { output, ...packet.source, typeCounts, split, profilePath, profile: preparationProfile };
}

export async function validateGeneratedModel(modelDirectory = join(PROJECT_ROOT, 'training/model')) {
  const directory = resolve(modelDirectory);
  const files = (await readdir(directory)).filter((file) => file.endsWith('.mjs')).sort();
  if (!files.includes('manifest.mjs')) throw new Error('Generated model requires manifest.mjs.');
  const forbidden = [
    /\beval\s*\(/u, /new\s+Function\b/u, /node:(?:child_process|http|https|net|tls|vm)/u,
    /\bfetch\s*\(/u, /process\.env/u, /import\s*\(\s*[^'"`]/u,
  ];
  for (const file of files) {
    const source = await readFile(join(directory, file), 'utf8');
    for (const pattern of forbidden) {
      if (pattern.test(source)) throw new Error(`${file} violates generated-code policy: ${pattern}`);
    }
  }
  const url = `${pathToFileURL(join(directory, 'manifest.mjs')).href}?validate=${Date.now()}`;
  const imported = await import(url);
  const summary = validateModel(imported.default ?? imported.model);
  return { directory, files, ...summary };
}

export async function writeCandidateSkeleton(packetPath, outputDirectory) {
  const packet = JSON.parse(await readFile(packetPath, 'utf8'));
  if (packet.split !== 'train' || !packet.records) throw new Error('Only an agent-visible training packet can generate a candidate.');
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(join(outputDirectory, 'PACKET.json'), `${JSON.stringify(packet, null, 2)}\n`, 'utf8');
  return { outputDirectory, instruction: 'Use training/.agents/skills/synthesize-eslm-model to generate the candidate modules.' };
}
