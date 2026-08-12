import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { renderReportHtml, validateDocumentationDiagrams } from '../src/docs-reports.mjs';
import { PROJECT_ROOT } from '../src/paths.mjs';

async function readProjectFile(path) {
  return readFile(join(PROJECT_ROOT, path), 'utf8');
}

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

test('documentation stylesheet keeps prose readable and tables responsive', async () => {
  const css = await readProjectFile('docs/assets/site.css');
  assert.match(css, /width:min\(calc\(100% - 2rem\),90rem\)/u);
  assert.match(css, /max-width:78ch/u);
  assert.match(css, /text-align:left/u);
  assert.doesNotMatch(css, /text-align:justify/u);
  assert.match(css, /table-layout:auto/u);
  assert.match(css, /overflow-x:auto/u);
  assert.match(css, /\.public-benchmark-table tbody,[^{]+\{ display:block/u);
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

  const inlineScripts = [...loader.matchAll(/<script>([\s\S]*?)<\/script>/gu)];
  assert.equal(inlineScripts.length, 1);
  assert.match(inlineScripts[0][1], /class SpecsLoader/u);
});

test('diagrams are optional but every present diagram remains constrained and explained', () => {
  assert.doesNotThrow(() => validateDocumentationDiagrams(
    'plain.html',
    '<main><h1>Plain documentation</h1><p>No diagram is needed here.</p></main>',
  ));
  assert.doesNotThrow(() => validateDocumentationDiagrams(
    'flow.html',
    '<script src="assets/mermaid-loader.mjs"></script><figure><pre class="mermaid">flowchart LR\nA --> B</pre><figcaption>A short, explained flow.</figcaption></figure>',
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
      '<script src="assets/mermaid-loader.mjs"></script><figure><pre class="mermaid">flowchart TD\nA --> B</pre><figcaption>Wrong direction.</figcaption></figure>',
    ),
    /left-to-right flow/u,
  );
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
