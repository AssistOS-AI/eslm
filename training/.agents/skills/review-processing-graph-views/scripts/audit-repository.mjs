import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const REQUIRED_FILES = Object.freeze([
  'AGENTS.md',
  'docs/index.html',
  'docs/assets/processing-graph-explorer-data.mjs',
  'docs/assets/processing-graph-explorer-explanations.mjs',
  'docs/assets/processing-graph-explorer-model.mjs',
  'docs/assets/processing-graph-explorer.mjs',
  'docs/assets/site.css',
  'docs/specs/DS012-documentation-operations-and-status.md',
  'docs/specs/DS027-trusted-strategy-extensions-and-meta-rational-coordination.md',
  'docs/specs/DS029-hierarchical-processing-circuits-and-packet-contracts.md',
  'src/processing-graph/processing-graph-catalog.mjs',
  'src/processing-graph/processing-graph-packet-catalog.mjs',
  'src/strategy/builtin-strategy-catalog.mjs',
  'tests/logical-processing-documentation.test.mjs',
  'tests/processing-graph-catalog.test.mjs',
  'tests/strategy-architecture.test.mjs',
]);

const COMMANDS = Object.freeze([
  Object.freeze({
    name: 'generated explorer projection is current',
    command: 'node',
    args: ['docs/assets/generate-processing-graph-explorer-data.mjs', '--check'],
  }),
  Object.freeze({
    name: 'catalog, projection, explanation, and strategy tests',
    command: 'node',
    args: ['--test', 'tests/logical-processing-documentation.test.mjs',
      'tests/processing-graph-catalog.test.mjs', 'tests/strategy-architecture.test.mjs'],
  }),
]);

function parseArguments(argv) {
  let root = '.';
  let runCommands = true;
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--root') root = argv[++index];
    else if (value === '--skip-commands') runCommands = false;
    else throw new TypeError(`Unknown argument ${value}.`);
  }
  return Object.freeze({ root: resolve(root), runCommands });
}

function digest(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function parseGeneratedProjection(source) {
  const prefix = 'export const HOMEPAGE_PROCESSING_GRAPH_PROJECTION = Object.freeze(';
  const start = source.indexOf(prefix);
  const end = source.lastIndexOf(');');
  if (start < 0 || end < start) throw new TypeError('Could not locate the generated projection object.');
  return JSON.parse(source.slice(start + prefix.length, end));
}

function run(root, command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 16 * 1024 * 1024,
  });
  return Object.freeze({
    command: [command, ...args].join(' '),
    status: result.status,
    passed: result.status === 0,
    stdout: result.stdout.trim().slice(-4000),
    stderr: result.stderr.trim().slice(-4000),
  });
}

function tokenCheck(name, source, required, forbidden = []) {
  const missing = required.filter((value) => !source.includes(value));
  const presentForbidden = forbidden.filter((value) => source.includes(value));
  return Object.freeze({
    name,
    passed: missing.length === 0 && presentForbidden.length === 0,
    missing,
    presentForbidden,
  });
}

const options = parseArguments(process.argv.slice(2));
const missingFiles = [];
for (const path of REQUIRED_FILES) {
  try {
    await access(resolve(options.root, path));
  } catch {
    missingFiles.push(path);
  }
}

if (missingFiles.length > 0) {
  process.stdout.write(`${JSON.stringify({
    format: 'eslm-processing-graph-view-repository-audit-v1',
    status: 'failed',
    root: options.root,
    missingFiles,
  }, null, 2)}\n`);
  process.exitCode = 1;
} else {
  const paths = Object.fromEntries(await Promise.all(REQUIRED_FILES.map(async (path) => [
    path, await readFile(resolve(options.root, path), 'utf8'),
  ])));
  const projection = paths['docs/assets/processing-graph-explorer-data.mjs'];
  const projectionRecord = parseGeneratedProjection(projection);
  const ownerModules = projectionRecord.nodes.map((node) => node.ownerModule);
  const uniqueOwnerModules = [...new Set(ownerModules)].toSorted();
  const missingOwners = [];
  for (const owner of uniqueOwnerModules) {
    try {
      await access(resolve(options.root, owner));
    } catch {
      missingOwners.push(owner);
    }
  }

  const staticChecks = [
    tokenCheck('homepage line legend and explanations', paths['docs/index.html'], [
      'Typed flow · catalog packet',
      'Circuit boundary · exterior handoff',
      'Implementation envelope · strategy candidate',
      'Opposed aggregate paths · no exact cycle',
      'How to read every graph symbol',
      'graph-link-key graph-link-key--flow',
      'graph-link-key graph-link-key--boundary',
      'graph-link-key graph-link-key--implementation',
      'graph-entity-icon--external-actor',
      'graph-entity-icon--external-system',
      'graph-entity-icon--external-actor-system',
    ]),
    tokenCheck('renderer interaction surfaces', paths['docs/assets/processing-graph-explorer.mjs'], [
      'buildProcessingGraphExplorerView',
      'applyAutomaticVerticalDistribution',
      'installVerticalDragging',
      'freeBezierPath',
      'breadcrumbVisualKind',
      'graph-boundary-port__info',
      'graph-camera__stage--parallel',
      '--graph-track-count',
      '--graph-box-inset',
      'directSiblingLinks.length === 0',
      'marker-end',
    ]),
    tokenCheck('edge colors and fitted geometry', paths['docs/assets/site.css'], [
      '#007a45', '#165dcc', '#c45100', '#922a9b',
      'repeat(var(--graph-track-count,3),minmax(0,1fr))',
      'var(--graph-box-inset,1rem)',
      '.graph-link-key::before',
      '.graph-camera__edge--reciprocal-flow',
      'overflow:visible',
    ]),
    tokenCheck('entity-specific explanation module',
      paths['docs/assets/processing-graph-explorer-explanations.mjs'], [
        'explainProcessingGraphView', 'explainBoundaryPort', 'plainTypeLabel',
      ], [
        'This is a leaf. Its full contract appears below.',
      ]),
    tokenCheck('authoritative documentation contract',
      paths['docs/specs/DS012-documentation-operations-and-status.md'], [
        'processing-graph', 'boundary', 'information',
      ]),
    tokenCheck('authoritative graph contract',
      paths['docs/specs/DS029-hierarchical-processing-circuits-and-packet-contracts.md'], [
        'circuit', 'packet', 'authority', 'implementation state',
      ]),
  ];
  staticChecks.push(Object.freeze({
    name: 'every projected owner path exists',
    passed: missingOwners.length === 0,
    missing: missingOwners,
    presentForbidden: [],
  }));

  const commandChecks = options.runCommands
    ? COMMANDS.map((item) => ({ name: item.name, ...run(options.root, item.command, item.args) }))
    : [];
  const gitStatus = run(options.root, 'git', ['status', '--short']);
  const relevantChanges = gitStatus.stdout.split('\n').filter((line) =>
    /(?:src\/|docs\/|tests\/|AGENTS\.md|training\/.agents\/skills\/)/u.test(line));
  const passed = staticChecks.every((item) => item.passed)
    && commandChecks.every((item) => item.passed);
  const report = {
    format: 'eslm-processing-graph-view-repository-audit-v1',
    status: passed ? 'machine-checks-passed-semantic-review-required' : 'failed',
    root: options.root,
    inventory: {
      circuits: projectionRecord.circuits.length,
      nodes: projectionRecord.nodes.length,
      edges: projectionRecord.edges.length,
      strategyFamilies: projectionRecord.strategyFamilies.length,
      strategies: projectionRecord.strategies.length,
      ownerReferences: ownerModules.length,
      uniqueOwnerModules: uniqueOwnerModules.length,
    },
    projectionDigest: digest(projection),
    ownerModules: uniqueOwnerModules,
    staticChecks,
    commandChecks,
    relevantWorkingTreeChanges: relevantChanges,
    semanticReviewRequired: true,
    semanticReviewReason: 'Catalog equality cannot prove that owner behavior, authority, failure paths, resources, or implementation-state claims remain current.',
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!passed) process.exitCode = 1;
}
