import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import {
  renderReportHtml,
  validateDocumentationDiagrams,
  validatePublishedSpecificationSources,
} from '../src/docs-reports.mjs';
import { PROJECT_ROOT } from '../src/paths.mjs';

async function readProjectFile(path) {
  return readFile(join(PROJECT_ROOT, path), 'utf8');
}

test('shared navigation is balanced by reader role and covers every substantive chapter', async () => {
  const [header, home, benchmarkDashboard] = await Promise.all([
    readProjectFile('docs/partials/header.html'),
    readProjectFile('docs/index.html'),
    readProjectFile('docs/assets/public-benchmark-dashboard.mjs'),
  ]);
  const expectedGroups = Object.freeze({
    Overview: Object.freeze([
      'research-program.html', 'status.html', 'research-horizons.html', 'research-decisions.html',
    ]),
    Language: Object.freeze([
      'language.html', 'heuristic-language.html', 'language-agent.html', 'grounded-failure.html',
    ]),
    System: Object.freeze([
      'architecture.html', 'strategy-architecture.html', 'knowledge-bases.html',
      'kb-storage-and-indexing.html', 'symbolic-document-kbs.html',
    ]),
    Reasoning: Object.freeze([
      'reasoning-methods.html', 'reasoning-deduction-and-models.html',
      'reasoning-categorical-logic.html', 'reasoning-state-time-and-relations.html',
      'reasoning-defaults-and-abduction.html', 'reasoning-narrative-and-compatibility.html',
    ]),
    Development: Object.freeze([
      'training.html', 'evaluation.html', 'metamorphic-testing.html', 'exceptions-issues.html',
    ]),
    Reference: Object.freeze([
      'cli.html', 'sources.html', 'specification-architecture.html',
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

  const headerTargets = new Set([...header.matchAll(/href="([^"]+)"/gu)]
    .map((match) => match[1].split('?')[0]));
  const benchmarkTargets = new Set([...benchmarkDashboard.matchAll(
    /page:\s*'(benchmark-[^']+\.html)'/gu,
  )].map((match) => match[1]));
  const substantivePages = (await readdir(join(PROJECT_ROOT, 'docs')))
    .filter((file) => file.endsWith('.html')).toSorted();
  const reachablePages = new Set([...headerTargets, ...benchmarkTargets]);
  assert.deepEqual(substantivePages.filter((file) => !reachablePages.has(file)), []);

  const sitemapGroups = [...home.matchAll(
    /<div class="sitemap-branch"><h3>([^<]+)<\/h3>([\s\S]*?)<\/div>/gu,
  )];
  assert.deepEqual(sitemapGroups.map((match) => match[1]), Object.keys(expectedGroups));
  for (const [, label, branch] of sitemapGroups) {
    const links = [...branch.matchAll(/href="([^"]+)"/gu)].map((match) => match[1]);
    assert.deepEqual(links, expectedGroups[label], `${label} sitemap`);
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
  const benchmarkPages = (await readdir(join(PROJECT_ROOT, 'docs')))
    .filter((file) => /^benchmark-.+\.html$/u.test(file))
    .sort();
  assert.ok(benchmarkPages.length > 0);

  for (const file of benchmarkPages) {
    const html = await readProjectFile(`docs/${file}`);
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

  const sources = await readProjectFile('docs/sources.html');
  assert.match(sources, /Execution status is generated/u);
  assert.match(sources, /href="evaluation\.html"/u);
  assert.match(sources, /href="results\/latest-public-benchmark-probes\.json"/u);
  assert.doesNotMatch(
    sources,
    /fresh-executed|Stage [0-9]|★|All sixteen|execution receipts|— adapted|adapted and|adapted with/iu,
  );
});

test('full public portfolio appears on evaluation only', async () => {
  const [home, evaluation, status] = await Promise.all([
    readProjectFile('docs/index.html'),
    readProjectFile('docs/evaluation.html'),
    readProjectFile('docs/status.html'),
  ]);
  assert.doesNotMatch(home, /data-public-benchmark-dashboard/u);
  assert.equal((evaluation.match(/data-public-benchmark-dashboard/gu) ?? []).length, 1);
  assert.doesNotMatch(status, /data-public-benchmark-dashboard/u);
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
    protocol: 'eslm-internal-regression-v1',
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
  assert.match(css, /table-layout:fixed/u);
  assert.match(css, /overflow-x:visible/u);
  assert.doesNotMatch(css, /\.table-wrap\s*>\s*table\s*\{[^}]*min-width/u);
  assert.match(css, /overflow-wrap:break-word; word-break:normal/u);
  assert.match(css, /\.table-wrap > table tbody,[^{]+\{ display:block/u);
  assert.match(css, /\.table-details > div,[^{]+grid-template-columns:minmax\(7rem,\.28fr\)/u);
});

test('every hand-authored documentation table has exactly two cells per row', async () => {
  const htmlFiles = (await readdir(join(PROJECT_ROOT, 'docs')))
    .filter((file) => file.endsWith('.html') && file !== 'specsLoader.html')
    .sort();
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
  assert.equal(publication.sources, 28);
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

  const htmlFiles = (await readdir(join(PROJECT_ROOT, 'docs'))).filter((file) => file.endsWith('.html'));
  for (const file of htmlFiles) {
    const html = await readProjectFile(`docs/${file}`);
    if (!html.includes('<pre class="mermaid">')) continue;
    assert.doesNotThrow(() => validateDocumentationDiagrams(file, html));
  }
});

test('documentation introductions state scope affirmatively', async () => {
  const htmlFiles = (await readdir(join(PROJECT_ROOT, 'docs'))).filter((file) => file.endsWith('.html'));
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
    readProjectFile('docs/heuristic-language.html'),
    readProjectFile('docs/partials/header.html'),
    readProjectFile('docs/index.html'),
  ]);
  assert.match(header, /href="heuristic-language\.html"/u);
  assert.match(home, /href="heuristic-language\.html"/u);
  assert.match(page, /Proposal lattice, voting, and confidence/u);
  assert.match(page, /Decomposition techniques and their safety gates/u);
  assert.match(page, /Request-intent planning for larger outputs/u);
  assert.match(page, /summarize, expand, explain, compare, draft an essay, or assemble a document/u);
  assert.match(page, /Language Agent escalation is opt-in and disabled by default/u);
  assert.match(page, /content nouns and verbs/u);
  assert.match(page, /<code>all<\/code> is a protected quantifier/u);
  assert.match(page, /DS022-heuristic-language-approximation-and-work-policy\.md/u);
  assert.ok((page.match(/<tr><td>/gu) ?? []).length >= 14);
});

test('research horizons separates executable relevance from protected research decisions', async () => {
  const [page, header, home] = await Promise.all([
    readProjectFile('docs/research-horizons.html'),
    readProjectFile('docs/partials/header.html'),
    readProjectFile('docs/index.html'),
  ]);
  assert.match(header, /href="research-horizons\.html"/u);
  assert.match(home, /href="research-horizons\.html"/u);
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
    readProjectFile('docs/grounded-failure.html'),
    readProjectFile('docs/architecture.html'),
    readProjectFile('docs/cli.html'),
    readProjectFile('docs/exceptions-issues.html'),
    readProjectFile('docs/partials/header.html'),
  ]);

  assert.match(header, /href="grounded-failure\.html"/u);
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
