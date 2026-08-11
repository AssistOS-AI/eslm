#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

const path = resolve(process.argv[2] ?? 'ASSIGNMENT.json');
const assignment = JSON.parse(await readFile(path, 'utf8'));
if (assignment.format !== 'eslm-agent-assignment-v1') throw new Error('Unsupported assignment format.');
if (assignment.skill !== 'document-to-kb-builder') throw new Error('Assignment selected another skill.');
const packetPath = join(dirname(path), assignment.packet);
if (basename(packetPath) !== assignment.packet) throw new Error('Packet path must stay inside the workspace root.');
const packetBytes = await readFile(packetPath);
const digest = createHash('sha256').update(packetBytes).digest('hex');
if (digest !== assignment.packetSha256) throw new Error('Packet checksum mismatch.');
const packet = JSON.parse(packetBytes);
if (packet.split !== 'train' || packet.leakagePolicy !== 'agent-visible') throw new Error('Packet is not agent-visible train evidence.');
if (assignment.targetNamespace !== packet.targetNamespace || !/^[a-z][a-z0-9-]*$/u.test(packet.targetNamespace)) {
  throw new Error('Assignment target namespace is missing or differs from the packet.');
}
if (basename(assignment.baselineAnalysis) !== assignment.baselineAnalysis) throw new Error('Baseline analysis path must stay inside the workspace root.');
const analysisBytes = await readFile(join(dirname(path), assignment.baselineAnalysis));
const analysisDigest = createHash('sha256').update(analysisBytes).digest('hex');
if (analysisDigest !== assignment.baselineAnalysisSha256) throw new Error('Baseline analysis checksum mismatch.');
const analysisRecords = analysisBytes.toString('utf8').split(/\r?\n/u).filter(Boolean).length;
if (analysisRecords !== assignment.baselineAnalysisRecords) throw new Error('Baseline analysis record count mismatch.');
process.stdout.write(`${JSON.stringify({ valid: true, packet: assignment.packet, records: packet.source?.recordCount, analysisRecords })}\n`);
