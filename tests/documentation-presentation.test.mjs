import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import {
  renderReportHtml,
  validateDocumentationDiagrams,
  validatePublishedSpecificationSources,
} from '../src/docs-reports.mjs';
import { renderGeneratedHeuristicBenchmarkHtml } from '../src/evaluation/generated-heuristic-benchmark-html.mjs';
import { PROJECT_ROOT } from '../src/paths.mjs';

async function readProjectFile(path) {
  return readFile(join(PROJECT_ROOT, path), 'utf8');
}

async function collectHtmlFiles(directory = join(PROJECT_ROOT, 'docs'), prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...await collectHtmlFiles(join(directory, entry.name), relativePath));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(relativePath);
    }
  }
  return files.toSorted();
}

async function handAuthoredHtmlFiles() {
  return (await collectHtmlFiles()).filter((file) => (
    !file.startsWith('partials/') && !file.startsWith('results/')
  ));
}

test('shared navigation is balanced by reader role and covers every substantive chapter', async () => {
  const [header, home, benchmarkDashboard] = await Promise.all([
    readProjectFile('docs/partials/header.html'),
    readProjectFile('docs/index.html'),
    readProjectFile('docs/assets/public-benchmark-dashboard.mjs'),
  ]);
  const expectedGroups = Object.freeze({
    Overview: Object.freeze([
      'research/research-program.html', 'status.html',
      'research/research-horizons.html', 'research/research-decisions.html',
    ]),
    Language: Object.freeze([
      'language/language.html', 'language/heuristic-language.html',
      'language/language-agent.html', 'language/grounded-failure.html',
    ]),
    System: Object.freeze([
      'architecture/architecture.html', 'architecture/logical-processing-architecture.html',
      'architecture/strategy-architecture.html', 'knowledge/knowledge-bases.html',
      'knowledge/kb-storage-and-indexing.html', 'knowledge/symbolic-document-kbs.html',
    ]),
    Reasoning: Object.freeze([
      'reasoning/reasoning-methods.html', 'reasoning/reasoning-deduction-and-models.html',
      'reasoning/reasoning-categorical-logic.html', 'reasoning/reasoning-state-time-and-relations.html',
      'reasoning/reasoning-defaults-and-abduction.html',
      'reasoning/reasoning-narrative-and-compatibility.html',
    ]),
    Development: Object.freeze([
      'operations/training.html', 'research/processing-graph-research.html', 'evaluation.html',
      'operations/metamorphic-testing.html', 'operations/exceptions-issues.html',
    ]),
    Reference: Object.freeze([
      'operations/cli.html', 'reference/sources.html', 'reference/specification-architecture.html',
      'specsLoader.html?spec=matrix.md',
    ]),
  });
  const groups = [...header.matchAll(
    /<details><summary>([^<]+)<\/summary><div class="submenu">([\s\S]*?)<\/div><\/details>/gu,
  )];
  assert.deepEqual(groups.map((match) => match[1]), Object.keys(expectedGroups));
  for (const [, label, submenu] of groups) {
    const links = [...submenu.matchAll(/href="([^"]+)"/gu)].map((match) => match[1]);
    assert.deepEqual(links, expectedGroups[label], label);
    assert.ok(links.length >= 4 && links.length <= 6, `${label} is not balanced`);
  }
  assert.doesNotMatch(header, /Foundations/u);
  for (const [label, links] of Object.entries(expectedGroups)) {
    for (const link of links.filter((target) => !target.includes('?'))) {
      const page = await readProjectFile(`docs/${link}`);
      assert.match(
        page,
        new RegExp(`<p class="breadcrumb">[^\\n]* / ${label} /`, 'u'),
        `${link} breadcrumb must match its ${label} navigation group`,
      );
    }
  }

  const headerTargets = new Set([...header.matchAll(/href="([^"]+)"/gu)]
    .map((match) => match[1].split('?')[0]));
  const benchmarkTargets = new Set([...benchmarkDashboard.matchAll(
    /page:\s*'(benchmarks\/benchmark-[^']+\.html)'/gu,
  )].map((match) => match[1]));
  const evaluation = await readProjectFile('docs/evaluation.html');
  const developmentTargets = [...evaluation.matchAll(/href="(development\/[^"#]+\.html)"/gu)]
    .map((match) => match[1]);
  const substantivePages = await handAuthoredHtmlFiles();
  const canonicalPages = [];
  for (const file of substantivePages) {
    const html = await readProjectFile(`docs/${file}`);
    if (!html.includes('data-compatibility-redirect=')) canonicalPages.push(file);
  }
  const reachablePages = new Set([...headerTargets, ...benchmarkTargets, ...developmentTargets]);
  assert.deepEqual(canonicalPages.filter((file) => !reachablePages.has(file)), []);

  const sitemapGroups = [...home.matchAll(
    /<div class="sitemap-branch"><h3>([^<]+)<\/h3>([\s\S]*?)<\/div>/gu,
  )];
  assert.deepEqual(sitemapGroups.map((match) => match[1]), Object.keys(expectedGroups));
  for (const [, label, branch] of sitemapGroups) {
    const links = [...branch.matchAll(/href="([^"]+)"/gu)].map((match) => match[1]);
    assert.deepEqual(links, expectedGroups[label], `${label} sitemap`);
  }
});

test('documentation root keeps only operational entries and eight compatibility redirects', async () => {
  const redirects = Object.freeze({
    'architecture.html': 'architecture/architecture.html',
    'cli.html': 'operations/cli.html',
    'knowledge-bases.html': 'knowledge/knowledge-bases.html',
    'language.html': 'language/language.html',
    'reasoning-methods.html': 'reasoning/reasoning-methods.html',
    'research-program.html': 'research/research-program.html',
    'sources.html': 'reference/sources.html',
    'training.html': 'operations/training.html',
  });
  const operational = ['evaluation.html', 'index.html', 'specsLoader.html', 'status.html'];
  const rootHtml = (await readdir(join(PROJECT_ROOT, 'docs')))
    .filter((file) => file.endsWith('.html')).toSorted();
  assert.deepEqual(rootHtml, [...operational, ...Object.keys(redirects)].toSorted());

  for (const [file, destination] of Object.entries(redirects)) {
    const html = await readProjectFile(`docs/${file}`);
    assert.match(html, new RegExp(`data-compatibility-redirect="${destination.replaceAll('.', '\\.')}"`, 'u'));
    assert.match(html, new RegExp(`http-equiv="refresh" content="0; url=${destination.replaceAll('.', '\\.')}"`, 'u'));
    assert.match(html, new RegExp(`rel="canonical" href="${destination.replaceAll('.', '\\.')}"`, 'u'));
    assert.equal((html.match(new RegExp(`href="${destination.replaceAll('.', '\\.')}"`, 'gu')) ?? []).length, 2);
    assert.doesNotMatch(html, /data-include="partials\/header\.html"/u);
  }

  const redirectTargets = new Set(Object.keys(redirects));
  for (const file of (await collectHtmlFiles()).filter((path) => !redirectTargets.has(path))) {
    const html = await readProjectFile(`docs/${file}`);
    for (const link of html.matchAll(/href="([^"#?]+)(?:[?#][^"]*)?"/gu)) {
      assert.ok(!redirectTargets.has(link[1]), `${file} links through compatibility redirect ${link[1]}`);
    }
  }
});

test('public benchmark presentation reads mutable diagnoses and coverage from the report', async () => {
  const dashboard = await readProjectFile('docs/assets/public-benchmark-dashboard.mjs');
  assert.match(dashboard, /node\('p', row\.diagnosis\)/u);
  assert.doesNotMatch(dashboard, /function diagnosisFor/u);
  assert.doesNotMatch(dashboard, /The run solved 100 selected training cases/u);

  const coverageStart = dashboard.indexOf('function availableCoverage');
  const coverageEnd = dashboard.indexOf('function evidenceText');
  assert.ok(coverageStart >= 0 && coverageEnd > coverageStart);
  const coverageFunction = dashboard.slice(coverageStart, coverageEnd);
  assert.match(coverageFunction, /row\.sampleCoverage\?\.tested/u);
  assert.match(coverageFunction, /row\.sampleCoverage\?\.available/u);
  assert.doesNotMatch(coverageFunction, /row\.id|sourceEvidence|sourceValidation|developmentResult|const fresh/u);
  assert.match(dashboard, /row\.track/u);
  assert.match(dashboard, /row\.inputRoute/u);
  assert.match(dashboard, /row\.checkpointState/u);
  assert.match(dashboard, /row\.attemptCoverage/u);
  assert.match(dashboard, /report\.assembly/u);
});

test('benchmark protocol pages delegate mutable measurements to the generated v2 report', async () => {
  const benchmarkPages = (await readdir(join(PROJECT_ROOT, 'docs/benchmarks')))
    .filter((file) => /^benchmark-.+\.html$/u.test(file))
    .sort();
  assert.ok(benchmarkPages.length > 0);

  for (const file of benchmarkPages) {
    const html = await readProjectFile(`docs/benchmarks/${file}`);
    assert.match(html, /<strong>Current measurements:<\/strong>/u, file);
    assert.match(html, /href="evaluation\.html"/u, file);
    assert.match(html, /href="results\/latest-public-benchmark-probes\.json"/u, file);
    assert.doesNotMatch(html, /data-public-benchmark-dashboard/u, file);
    assert.doesNotMatch(
      html,
      /\b(?:latest|current|published) (?:complete |development |fresh )?(?:probe|profile|row|run|result)\b/iu,
      file,
    );
    assert.doesNotMatch(html, /no accuracy percentage|not (?:a misleading )?0%|not 0\/[0-9]/iu, file);
    assert.doesNotMatch(html, /<strong>[0-9][0-9,]*\s*\/\s*[0-9][0-9,]*[^<]*<\/strong>/u, file);

    for (const percentage of html.matchAll(/[0-9]+(?:\.[0-9]+)?%/gu)) {
      assert.equal(percentage[0], '0%', `${file} contains a hand-maintained percentage`);
      assert.match(html, /selective accuracy is <code>null<\/code>/u, file);
    }
  }

  const sources = await readProjectFile('docs/reference/sources.html');
  assert.match(sources, /Execution status is generated/u);
  assert.match(sources, /href="evaluation\.html"/u);
  assert.match(sources, /href="results\/latest-public-benchmark-probes\.json"/u);
  assert.doesNotMatch(
    sources,
    /fresh-executed|Stage [0-9]|★|All sixteen|execution receipts|— adapted|adapted and|adapted with/iu,
  );
});

test('the overview delegates the full public portfolio to benchmark development status', async () => {
  const [home, evaluation, benchmarkStatus, status] = await Promise.all([
    readProjectFile('docs/index.html'),
    readProjectFile('docs/evaluation.html'),
    readProjectFile('docs/development/benchmarks.html'),
    readProjectFile('docs/status.html'),
  ]);
  assert.doesNotMatch(home, /data-public-benchmark-dashboard/u);
  assert.doesNotMatch(evaluation, /data-public-benchmark-dashboard/u);
  assert.equal((benchmarkStatus.match(/data-public-benchmark-dashboard/gu) ?? []).length, 1);
  assert.match(benchmarkStatus, /<details>[\s\S]*data-public-benchmark-dashboard[\s\S]*<\/details>/u);
  assert.doesNotMatch(status, /data-public-benchmark-dashboard/u);
});

test('development evidence is split into three plain-language status pages', async () => {
  const paths = [
    'development/knowledge-bases.html',
    'development/benchmarks.html',
    'development/rl-datasets.html',
  ];
  const [overview, knowledge, benchmarks, datasets] = await Promise.all([
    readProjectFile('docs/evaluation.html'),
    ...paths.map((path) => readProjectFile(`docs/${path}`)),
  ]);

  for (const path of paths) assert.match(overview, new RegExp(`href="${path}"`, 'u'));
  for (const page of [overview, knowledge, benchmarks, datasets]) {
    assert.doesNotMatch(page, /sha256:/u);
  }
  for (const page of [knowledge, benchmarks, datasets]) {
    assert.match(page, /<base href="\.\.\/">/u);
    assert.match(page, /data-include="partials\/header\.html"/u);
  }

  for (const id of [
    'quick', 'babi-v1.2-language', 'clutrr-kinship-algebra', 'oewn-2025',
    'atomic-2020', 'geonames-2026', 'conceptnet-5.7.0-en', 'world-relations-1.0',
  ]) assert.match(knowledge, new RegExp(id.replaceAll('.', '\\.'), 'u'));

  for (const source of ['HelpSteer2', 'GSM8K', 'OASST1', 'PRM800K', 'Mind2Web', 'tau2-bench']) {
    assert.match(datasets, new RegExp(source, 'u'));
  }
  assert.match(benchmarks, /End-to-end accuracy/u);
  assert.match(benchmarks, /Raw-English companions/u);
});

test('roadmap dashboard exposes editorial states without invented percentages', async () => {
  const [dashboard, status] = await Promise.all([
    readProjectFile('docs/assets/status-dashboard.mjs'),
    readProjectFile('docs/results/current-status.json'),
  ]);
  assert.doesNotMatch(dashboard, /percentage|band equivalents|coverageScore/u);
  assert.match(dashboard, /editorial-capability-rubric/u);
  const artifact = JSON.parse(status);
  assert.equal(artifact.assessmentKind, 'editorial-capability-rubric');
  assert.ok(artifact.coverage.areas.every((area) => area.bands.every((band) => !('credit' in band))));
});

test('generated fixture report labels count, regime, and non-comparability', () => {
  const html = renderReportHtml('Fixture report', {
    createdAt: '2026-08-12T00:00:00.000Z',
    protocol: 'eslm-internal-regression-v2',
    evidenceRegime: 'internal-authored-smoke-fixture',
    claimScope: 'implementation-regression-only',
    dataset: { path: 'tests/fixtures/example.jsonl' },
    model: { comparable: false },
    total: 2,
    passed: 2,
    accuracy: 1,
    outcomes: [
      { id: 'one', pass: true, actual: 'SOLVED' },
      { id: 'two', pass: true, actual: 'UNKNOWN' },
    ],
  });
  assert.match(html, /2 authored cases/u);
  assert.match(html, /Benchmark comparable:<\/strong> no/u);
  assert.match(html, /2\/2[\s\S]*authored cases passed/u);
  assert.doesNotMatch(html, /<span>accuracy<\/span>|mermaid/u);
});

test('documentation stylesheet keeps prose readable and two-column tables responsive', async () => {
  const css = await readProjectFile('docs/assets/site.css');
  assert.match(css, /width:min\(calc\(100% - 2rem\),96rem\)/u);
  assert.match(css, /--reading-measure:100%/u);
  assert.match(css, /main p,main li,[^{]+\{ max-width:100%/u);
  assert.match(css, /text-align:left/u);
  assert.doesNotMatch(css, /text-align:justify/u);
  assert.doesNotMatch(css, /h1[^}]*max-width:\s*(?:32|42|78)ch/u);
  assert.doesNotMatch(css, /\.nodes\s*>\s*\.node:nth-child/u);
  for (const role of ['source', 'process', 'outcome']) {
    assert.match(css, new RegExp(`\\.node\\.diagram-${role}`, 'u'));
  }
  assert.match(css, /table-layout:auto/u);
  assert.match(css, /\.table--compact-key th:first-child,[^{]+\{ width:1%; white-space:nowrap/u);
  assert.match(css, /\.spec-table--matrix th,\.spec-table--matrix td \{ padding:\.48rem \.58rem/u);
  assert.doesNotMatch(css, /public-benchmark-table[^}]*table-layout:fixed/u);
  assert.doesNotMatch(css, /public-benchmark-table[^}]*width:(?:30|70)%/u);
  assert.match(css, /overflow-x:visible/u);
  assert.doesNotMatch(css, /\.table-wrap\s*>\s*table\s*\{[^}]*min-width/u);
  assert.match(css, /overflow-wrap:break-word; word-break:normal/u);
  assert.match(css, /\.table-wrap > table tbody,[^{]+\{ display:block/u);
  assert.match(css, /\.table-details > div,\.spec-table__details > div \{ display:block/u);
  assert.match(css, /\.table-details dt::after,\.spec-table__details dt::after \{ content:': '/u);
  assert.doesNotMatch(css, /grid-template-columns:minmax\(7rem,\.28fr\)/u);
  assert.match(css, /pre\.mermaid\[data-responsive-flow="TB"\]/u);
  assert.match(css, /pre\.mermaid:not\(\[data-responsive-flow="TB"\]\) svg/u);
  assert.match(css, /min-width:42rem/u);
});

test('every hand-authored documentation table has exactly two cells per row', async () => {
  const htmlFiles = (await handAuthoredHtmlFiles()).filter((file) => file !== 'specsLoader.html');
  for (const file of htmlFiles) {
    const html = await readProjectFile(`docs/${file}`);
    for (const table of html.matchAll(/<table\b[\s\S]*?<\/table>/gu)) {
      for (const row of table[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gu)) {
        const cellCount = (row[1].match(/<(?:th|td)\b/gu) ?? []).length;
        assert.equal(cellCount, 2, `${file} has a table row with ${cellCount} structural cells`);
      }
    }
  }
});

test('generated documentation renderers emit only two-column tables', async () => {
  const authored = renderReportHtml('Renderer table contract', {
    createdAt: '2026-08-12T00:00:00.000Z',
    protocol: 'eslm-internal-regression-v2',
    evidenceRegime: 'internal-authored-smoke-fixture',
    dataset: { path: 'fixture.jsonl' },
    model: { comparable: false },
    outcomes: [{ id: 'case-one', pass: true, actual: 'SOLVED' }],
  });
  const generatedReport = JSON.parse(await readProjectFile(
    'docs/results/latest-generated-heuristic-benchmark.json',
  ));
  const seedAudit = JSON.parse(await readProjectFile(
    'docs/results/latest-generated-heuristic-seed-audit.json',
  ));
  assert.equal(seedAudit.format, 'eslm-generated-heuristic-multi-seed-audit-v1');
  assert.equal(
    seedAudit.sharedIdentity.behaviorIdentity.digest,
    generatedReport.execution.behaviorIdentity.digest,
  );
  const rendered = [authored, renderGeneratedHeuristicBenchmarkHtml(generatedReport)];
  for (const html of rendered) {
    for (const table of html.matchAll(/<table\b[\s\S]*?<\/table>/gu)) {
      for (const row of table[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gu)) {
        const cellCount = (row[1].match(/<(?:th|td)\b/gu) ?? []).length;
        assert.equal(cellCount, 2, `generated renderer emitted ${cellCount} structural cells`);
      }
    }
  }
});

test('specification viewer preserves document structure and orientation aids', async () => {
  const loader = await readProjectFile('docs/specsLoader.html');
  assert.match(loader, /id="spec-toc"/u);
  assert.match(loader, /id="spec-navigation"/u);
  assert.match(loader, /removeLeadingHeading\(body\)/u);
  assert.match(loader, /statusContext\(metadata\.status\)/u);
  assert.match(loader, /id="\$\{id\}"/u);
  assert.match(loader, /appendListItem\('ol'/u);
  assert.match(loader, /\.join\(' '\)/u);
  assert.doesNotMatch(loader, /\.join\('<br>'\)/u);
  assert.doesNotMatch(loader, /cdn\.jsdelivr\.net/u);
  assert.match(loader, /specResourcePath\(specPath\)/u);
  assert.match(loader, /encodeURIComponent\(specPath\)/u);
  assert.match(loader, /const detailsHeader = headers\.length === 2 \? headers\[1\] : 'Details'/u);
  assert.match(loader, /tableDetails\(headers, row\)/u);
  assert.match(loader, /tableClass\(headers, rows\)/u);
  assert.match(loader, /compactPrimary/u);
  assert.match(loader, /spec-table--matrix/u);
  assert.match(loader, /class="spec-table__details"/u);
  assert.match(loader, /data-label=/u);
  assert.doesNotMatch(loader, /headers\.map\(\(cell\) => `<th>/u);
  assert.doesNotMatch(loader, /row\.map\(\(cell\) => `<td>/u);

  const inlineScripts = [...loader.matchAll(/<script>([\s\S]*?)<\/script>/gu)];
  assert.equal(inlineScripts.length, 1);
  assert.match(inlineScripts[0][1], /class SpecsLoader/u);
});

test('GitHub Pages publication preserves every loader-addressable DS source', async () => {
  const publication = await validatePublishedSpecificationSources();
  assert.equal(publication.noJekyll, true);
  assert.equal(publication.sources, 30);
  for (const target of publication.targets) {
    const rawUrl = new URL(
      `specs/${encodeURIComponent(target)}`,
      'https://assistos-ai.github.io/eslm/',
    );
    assert.equal(rawUrl.origin, 'https://assistos-ai.github.io');
    assert.equal(rawUrl.pathname, `/eslm/specs/${target}`);
    assert.match(target, /^DS\d{3}-[A-Za-z0-9-]+\.md$/u);
  }
});

test('operator documentation exposes research graph commands and DS029 without widening authority', async () => {
  const [readme, agents, cli, training, specificationArchitecture, research] = await Promise.all([
    readProjectFile('README.md'),
    readProjectFile('AGENTS.md'),
    readProjectFile('docs/operations/cli.html'),
    readProjectFile('docs/operations/training.html'),
    readProjectFile('docs/reference/specification-architecture.html'),
    readProjectFile('docs/research/processing-graph-research.html'),
  ]);
  for (const command of [
    'node src/cli.mjs research graph status',
    'npm run research:graph:pilot',
    'npm run research:graph:scale',
  ]) {
    assert.ok(readme.includes(command), command);
    assert.ok(agents.includes(command), command);
    assert.ok(cli.includes(command), command);
  }
  for (const command of [
    'npm run research:graph:pilot:publish',
    'npm run research:graph:scale:publish',
  ]) {
    assert.ok(agents.includes(command), command);
    assert.ok(cli.includes(command), command);
    assert.ok(training.includes(command), command);
  }
  const sealCommand = 'node scripts/seal-processing-graph-discovery-cycle.mjs';
  for (const page of [agents, cli, training]) assert.ok(page.includes(sealCommand), sealCommand);
  for (const page of [cli, training]) {
    for (const protocol of [
      'eslm-rl-dataset-discovery-plan-v1',
      'eslm-processing-graph-research-analysis-v5',
      'eslm-processing-graph-consolidation-review-v1',
      'eslm-rl-dataset-discovery-cycle-v3',
      'eslm-processing-graph-research-status-v3',
    ]) assert.match(page, new RegExp(protocol, 'u'));
    assert.match(page, /research-status-only/u);
    assert.match(page, /17,634/u);
    assert.match(page, /2,220/u);
    assert.match(page, /19,854/u);
    assert.match(page, /8,192/u);
    assert.match(page, /research-consolidation/u);
    assert.match(page, /promotion authority/iu);
    assert.match(page, /DS028-dataset-guided-processing-graph-discovery-research\.md/u);
    assert.match(page, /DS029-hierarchical-processing-circuits-and-packet-contracts\.md/u);
    assert.doesNotMatch(page, /2,341|19,975|analysis-v2|research-status-v1/iu);
  }
  assert.match(specificationArchitecture,
    /DS029-hierarchical-processing-circuits-and-packet-contracts\.md/u);
  assert.match(specificationArchitecture, /Execution, hypothesis, and catalog membership are three different claims/u);
  assert.match(agents, /For exact hierarchical circuit, node, edge, packet, authority/u);
  assert.match(research, /Four synthetic structural episode sketches/u);
  for (const category of [
    'Preference ranking', 'Socratic decomposition and witness gap',
    'Conversation continuation and repair dependency', 'Failure and rollback control',
  ]) assert.match(research, new RegExp(category, 'u'));
  assert.match(research, /contain no source quotation, source row or message identifier, answer/u);
  assert.match(research, /sketch itself proves nothing/u);
});

test('diagrams are optional but every present diagram remains constrained and explained', () => {
  assert.doesNotThrow(() => validateDocumentationDiagrams(
    'plain.html',
    '<main><h1>Plain documentation</h1><p>No diagram is needed here.</p></main>',
  ));
  assert.doesNotThrow(() => validateDocumentationDiagrams(
    'flow.html',
    '<script src="assets/mermaid-loader.mjs"></script><figure><pre class="mermaid">flowchart LR\nA --> B</pre><figcaption>Short flow.</figcaption></figure><p class="diagram-explanation">A normal prose explanation follows the compact caption.</p>',
  ));
  assert.throws(
    () => validateDocumentationDiagrams(
      'unexplained.html',
      '<script src="assets/mermaid-loader.mjs"></script><pre class="mermaid">flowchart LR\nA --> B</pre>',
    ),
    /outside an explained figure/u,
  );
  assert.throws(
    () => validateDocumentationDiagrams(
      'vertical.html',
      '<script src="assets/mermaid-loader.mjs"></script><figure><pre class="mermaid">flowchart TD\nA --> B</pre><figcaption>Wrong direction.</figcaption></figure><p class="diagram-explanation">The prose remains separate.</p>',
    ),
    /left-to-right flow/u,
  );
});

test('documentation diagrams use topology roles, short labels, and prose explanations', async () => {
  const loader = await readProjectFile('docs/assets/mermaid-loader.mjs');
  assert.match(loader, /class \$\{sources\.join\(','\)\} diagram-source/u);
  assert.match(loader, /class \$\{processes\.join\(','\)\} diagram-process/u);
  assert.match(loader, /class \$\{outcomes\.join\(','\)\} diagram-outcome/u);
  assert.match(loader, /matchMedia\('\(max-width: 700px\)'\)/u);
  assert.match(loader, /\(\?:flowchart\|graph\)\\s\+/u);
  assert.match(loader, /'\$1TB'/u);
  assert.match(loader, /diagram\.dataset\.responsiveFlow = layout\.direction/u);

  const htmlFiles = await handAuthoredHtmlFiles();
  for (const file of htmlFiles) {
    const html = await readProjectFile(`docs/${file}`);
    if (!html.includes('<pre class="mermaid">')) continue;
    assert.doesNotThrow(() => validateDocumentationDiagrams(file, html));
  }
});

test('documentation introductions state scope affirmatively', async () => {
  const htmlFiles = await handAuthoredHtmlFiles();
  for (const file of htmlFiles) {
    const html = await readProjectFile(`docs/${file}`);
    assert.doesNotMatch(html, /not yet (?:an? )?general/iu, file);
    const lead = html.match(/<p class="lead">([\s\S]*?)<\/p>/u)?.[1]
      .replace(/<[^>]+>/gu, ' ').replace(/\s+/gu, ' ').trim();
    if (!lead) continue;
    assert.doesNotMatch(lead, /^(?:[\p{L}0-9/+-]+\s+){0,4}(?:is not|does not|cannot)\b/iu, file);
  }
});

test('heuristic-language chapter explains the local-first recovery contract', async () => {
  const [page, header, home] = await Promise.all([
    readProjectFile('docs/language/heuristic-language.html'),
    readProjectFile('docs/partials/header.html'),
    readProjectFile('docs/index.html'),
  ]);
  assert.match(header, /href="language\/heuristic-language\.html"/u);
  assert.match(home, /href="language\/heuristic-language\.html"/u);
  assert.match(page, /Proposal lattice, voting, and confidence/u);
  assert.match(page, /Decomposition techniques and their safety gates/u);
  assert.match(page, /Request-intent planning for larger outputs/u);
  assert.match(page, /summarize, expand, explain, compare, draft an essay, or assemble a document/u);
  assert.match(page, /general CLI composes the external Language Agent proposal wrapper by default/u);
  assert.match(page, /--no-external-language-agent/u);
  assert.match(page, /English-likelihood gate rejects likely non-English input without translating it/u);
  assert.match(page, /content nouns and verbs/u);
  assert.match(page, /<code>all<\/code> is a protected quantifier/u);
  assert.match(page, /DS022-heuristic-language-approximation-and-work-policy\.md/u);
  assert.ok((page.match(/<tr><td>/gu) ?? []).length >= 14);
});

test('research horizons separates executable relevance from protected research decisions', async () => {
  const [page, header, home] = await Promise.all([
    readProjectFile('docs/research/research-horizons.html'),
    readProjectFile('docs/partials/header.html'),
    readProjectFile('docs/index.html'),
  ]);
  assert.match(header, /href="research\/research-horizons\.html"/u);
  assert.match(home, /href="research\/research-horizons\.html"/u);
  assert.match(page, /capped logarithmic vote/u);
  assert.match(page, /deliberately non-absolute/u);
  assert.match(page, /multi-token co-occurrence/u);
  assert.match(page, /registered reasoning probe/iu);
  assert.match(page, /conflict-aware aggregation/u);
  assert.match(page, /The current release stops at the inspectable estimate/u);
  assert.match(page, /Named decisions that remain open/u);
  for (const id of ['DS023', 'DS024', 'DS025', 'DS026']) {
    assert.match(page, new RegExp(`${id}[^"<]*\\.md`, 'u'));
  }
});

test('grounded-failure documentation preserves answer authority and current trigger boundaries', async () => {
  const [grounded, architecture, cli, issues, header] = await Promise.all([
    readProjectFile('docs/language/grounded-failure.html'),
    readProjectFile('docs/architecture/architecture.html'),
    readProjectFile('docs/operations/cli.html'),
    readProjectFile('docs/operations/exceptions-issues.html'),
    readProjectFile('docs/partials/header.html'),
  ]);

  assert.match(header, /href="language\/grounded-failure\.html"/u);
  assert.match(grounded, /answerSupported<\/code> is always <code>false/u);
  assert.match(grounded, /limits\.outputTruncated/u);
  assert.match(grounded, /search\.complete/u);
  assert.match(grounded, /downstream language model/u);
  for (const status of [
    'AMBIGUOUS', 'INCONSISTENT_CONTEXT', 'MISSING_KNOWLEDGE', 'NO_APPLICABLE_METHOD', 'PARTIAL',
    'UNDERDETERMINED', 'UNKNOWN', 'UNPARSED', 'UNSUPPORTED_OUTPUT',
  ]) assert.match(grounded, new RegExp(`<code>${status}</code>`, 'u'));
  assert.match(grounded, /never launches grounding after <code>RESOURCE_LIMIT<\/code>/u);

  assert.match(architecture, /does not build an AND\/OR graph/u);
  assert.doesNotMatch(architecture, /The planner matches a task frame to these descriptors/u);
  assert.match(cli, /grounding<\/code> bundle/u);
  assert.doesNotMatch(cli, /seven original public-adapter entries|sixteen typed research registrations|eight packages/u);
  assert.match(issues, /0% end-to-end accuracy/u);
  assert.match(issues, /0% attempt coverage/u);
  assert.match(issues, /selective accuracy <code>null<\/code>/u);
  assert.doesNotMatch(issues, /not rendered as 0% accuracy|Accuracy is absent rather than 0%/u);
});
