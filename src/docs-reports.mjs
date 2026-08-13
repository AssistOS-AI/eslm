import { access, lstat, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import {
  assertMatchingBenchmarkBehaviorIdentity,
  benchmarkBehaviorIdentity,
} from './evaluation/benchmark-execution-identity.mjs';
import { auditFreshBenchmarkReceipts } from './evaluation/benchmark-receipt-audit.mjs';
import { validatePublicBenchmarkRows } from './evaluation/benchmark-report-contract.mjs';
import { assertGeneratedHeuristicBenchmarkReport } from './evaluation/generated-heuristic-benchmark-contract.mjs';
import { renderGeneratedHeuristicBenchmarkHtml } from './evaluation/generated-heuristic-benchmark-html.mjs';
import { assertGeneratedHeuristicMultiSeedAudit } from './evaluation/generated-heuristic-multi-seed-audit-contract.mjs';
import {
  assertInternalAuthoredBenchmarkReport,
  assertInternalEvaluationReport,
} from './evaluation/internal-authored-report-contract.mjs';
import { PROJECT_ROOT } from './paths.mjs';
import { processingGraphResearchStatus } from './research/processing-graph-research-status.mjs';

const SAFE_SPEC_SOURCE = /^(?:matrix|DS\d{3}-[A-Za-z0-9-]+)\.md$/u;

async function documentationHtmlFiles(directory = join(PROJECT_ROOT, 'docs'), prefix = '') {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...await documentationHtmlFiles(join(directory, entry.name), relativePath));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(relativePath);
    }
  }
  return files.toSorted();
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function percent(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(value === 0 || value === 1 ? 0 : 2)}%` : 'not measured';
}

export function renderReportHtml(title, report) {
  const cases = report.outcomes ?? report.results ?? [];
  const passed = report.passed ?? report.correct ?? cases.filter((item) => item.pass).length;
  const comparable = report.model?.comparable !== false;
  const regime = report.evidenceRegime ?? 'unspecified';
  const datasetPath = report.dataset?.path ?? report.suite ?? 'not recorded';
  const rows = cases.map((item) => `<tr><td>${escapeHtml(item.id)}</td>`
    + `<td><strong>${item.pass ? 'pass' : 'fail'}</strong><br><code>`
    + `${escapeHtml(JSON.stringify(item.actual))}</code></td></tr>`).join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<base href="../"><title>${escapeHtml(title)} — ESLM Documentation</title><link rel="stylesheet" href="assets/site.css"><script src="partials-loader.js" defer></script></head>
<body><div data-include="partials/header.html"></div><main><p class="breadcrumb"><a href="index.html">ESLM Documentation</a> / Results</p><h1>${escapeHtml(title)}</h1>
<p class="lead">This is a small internal regression report, not a public benchmark score or evidence of broad language coverage.</p>
<div class="callout"><p><strong>Evidence regime:</strong> <code>${escapeHtml(regime)}</code>.</p>
<p><strong>Suite:</strong> <code>${escapeHtml(datasetPath)}</code> (${cases.length} authored cases). <strong>Benchmark comparable:</strong> ${comparable ? 'yes' : 'no'}.</p></div>
<div class="metric"><strong>${passed}/${cases.length}</strong><span>authored cases passed · ${percent(report.accuracy)}</span></div>
<p>Generated ${escapeHtml(report.createdAt)}. Protocol: <code>${escapeHtml(report.protocol ?? report.format)}</code>. Claim scope: <code>${escapeHtml(report.claimScope ?? 'not recorded')}</code>.</p>
<h2>What this result means</h2>
<p>A passing row shows that one fixed software contract still works for this runtime and fixture. It does not estimate performance on unseen language, an official dataset, or a production workload. Public benchmark evidence, route labels, split quality, and receipt freshness are reported separately on the <a href="evaluation.html">evaluation page</a>.</p>
<div class="table-wrap"><table><thead><tr><th>Case</th><th>Verdict and actual result</th></tr></thead><tbody>${rows}</tbody></table></div>
</main></body></html>\n`;
}

export function validateDocumentationDiagrams(file, html) {
  const diagrams = [...html.matchAll(/<pre class="mermaid">([\s\S]*?)<\/pre>/gu)];
  let explainedDiagrams = 0;
  for (const figure of html.matchAll(/<figure\b[^>]*>([\s\S]*?)<\/figure>/gu)) {
    const figureDiagrams = [...figure[1].matchAll(/<pre class="mermaid">([\s\S]*?)<\/pre>/gu)];
    if (figureDiagrams.length === 0) continue;
    if (!/<figcaption(?:\s[^>]*)?>\s*\S[\s\S]*?<\/figcaption>/u.test(figure[1])) {
      throw new Error(`${file} must explain each Mermaid figure with a non-empty figcaption.`);
    }
    const caption = figure[1].match(/<figcaption(?:\s[^>]*)?>([\s\S]*?)<\/figcaption>/u)?.[1]
      .replace(/<[^>]+>/gu, ' ').replace(/\s+/gu, ' ').trim();
    if (caption.length > 72) {
      throw new Error(`${file} Mermaid captions must be short labels; put the explanation in normal prose.`);
    }
    const afterFigure = html.slice((figure.index ?? 0) + figure[0].length);
    if (!/^\s*<p class="diagram-explanation">\s*\S/gu.test(afterFigure)) {
      throw new Error(`${file} must follow each diagram with a left-aligned prose explanation.`);
    }
    explainedDiagrams += figureDiagrams.length;
  }
  if (explainedDiagrams !== diagrams.length) {
    throw new Error(`${file} contains a Mermaid diagram outside an explained figure.`);
  }
  if (diagrams.length > 0 && !html.includes('assets/mermaid-loader.mjs')) {
    throw new Error(`${file} contains a Mermaid diagram without loading the shared renderer.`);
  }
  for (const diagram of diagrams) {
    if (!/^flowchart LR\s*$/mu.test(diagram[1])) throw new Error(`${file} diagrams must use a left-to-right flow.`);
    const edges = (diagram[1].match(/-->/gu) ?? []).length;
    if (edges > 5) throw new Error(`${file} diagram has ${edges} edges; split or explain it in prose.`);
    for (const label of diagram[1].matchAll(/\[([^\]\n]+)\]/gu)) {
      if (label[1].trim().length > 42) {
        throw new Error(`${file} Mermaid node labels must stay within 42 characters.`);
      }
    }
  }
}

export async function validatePublishedSpecificationSources() {
  const docsDirectory = join(PROJECT_ROOT, 'docs');
  const specsDirectory = join(docsDirectory, 'specs');
  const noJekyllPath = join(docsDirectory, '.nojekyll');
  const noJekyll = await lstat(noJekyllPath);
  if (!noJekyll.isFile() || (await readFile(noJekyllPath, 'utf8')).trim() !== '') {
    throw new Error('docs/.nojekyll must be an empty regular file so GitHub Pages publishes raw DS Markdown.');
  }

  const matrix = await readFile(join(specsDirectory, 'matrix.md'), 'utf8');
  const rows = [...matrix.matchAll(
    /^\|\s*\[(DS\d{3})\]\(specsLoader\.html\?spec=([^)]+)\)\s*\|/gmu,
  )];
  const files = (await readdir(specsDirectory))
    .filter((file) => /^DS\d{3}-.+\.md$/u.test(file))
    .sort();
  if (rows.length !== files.length) {
    throw new Error(`Specification matrix exposes ${rows.length} DS sources, but ${files.length} files exist.`);
  }

  const targets = [];
  for (const row of rows) {
    let target;
    try {
      target = decodeURIComponent(row[2]);
    } catch {
      throw new Error(`Specification matrix contains an invalid encoded target: ${row[2]}.`);
    }
    if (!SAFE_SPEC_SOURCE.test(target) || target === 'matrix.md') {
      throw new Error(`Specification matrix contains an unsafe loader target: ${target}.`);
    }
    if (!target.startsWith(`${row[1]}-`)) {
      throw new Error(`Specification matrix label ${row[1]} does not identify ${target}.`);
    }
    await access(join(specsDirectory, target));
    targets.push(target);
  }
  if (JSON.stringify(targets.toSorted()) !== JSON.stringify(files)) {
    throw new Error('Specification matrix targets must identify every DS source exactly once.');
  }

  const loader = await readFile(join(docsDirectory, 'specsLoader.html'), 'utf8');
  if (!loader.includes('fetch(this.specResourcePath(this.specPath))')
      || !loader.includes('return `specs/${encodeURIComponent(specPath)}`;')) {
    throw new Error('Specification loader must fetch validated, encoded paths from the published specs directory.');
  }
  return { noJekyll: true, sources: targets.length, targets };
}

export async function publishReport(kind) {
  const jsonPath = join(PROJECT_ROOT, 'docs/results', `latest-${kind}.json`);
  const report = JSON.parse(await readFile(jsonPath, 'utf8'));
  if (kind === 'evaluation') assertInternalEvaluationReport(report);
  else if (kind === 'benchmark') assertInternalAuthoredBenchmarkReport(report);
  else throw new TypeError(`Unsupported authored report kind: ${kind}.`);
  const htmlPath = join(PROJECT_ROOT, 'docs/results', `latest-${kind}.html`);
  await writeFile(htmlPath, renderReportHtml(`Latest ${kind} report`, report), 'utf8');
  return htmlPath;
}

export async function publishGeneratedHeuristicBenchmark() {
  const jsonPath = join(PROJECT_ROOT, 'docs/results/latest-generated-heuristic-benchmark.json');
  const report = JSON.parse(await readFile(jsonPath, 'utf8'));
  assertGeneratedHeuristicBenchmarkReport(report);
  const htmlPath = join(PROJECT_ROOT, 'docs/results/latest-generated-heuristic-benchmark.html');
  await writeFile(htmlPath, renderGeneratedHeuristicBenchmarkHtml(report), 'utf8');
  return htmlPath;
}

export async function checkDocumentation() {
  const required = [
    '.nojekyll', 'index.html', 'evaluation.html', 'status.html', 'specsLoader.html',
    'architecture.html', 'language.html', 'knowledge-bases.html', 'reasoning-methods.html',
    'research-program.html', 'cli.html', 'sources.html', 'training.html',
    'architecture/architecture.html', 'architecture/logical-processing-architecture.html',
    'architecture/strategy-architecture.html',
    'language/language.html', 'language/heuristic-language.html', 'language/language-agent.html',
    'language/grounded-failure.html',
    'knowledge/knowledge-bases.html', 'knowledge/kb-storage-and-indexing.html',
    'knowledge/symbolic-document-kbs.html',
    'reasoning/reasoning-methods.html', 'reasoning/reasoning-categorical-logic.html',
    'reasoning/reasoning-deduction-and-models.html', 'reasoning/reasoning-defaults-and-abduction.html',
    'reasoning/reasoning-state-time-and-relations.html', 'reasoning/reasoning-narrative-and-compatibility.html',
    'research/research-program.html', 'research/research-horizons.html', 'research/research-decisions.html',
    'research/processing-graph-research.html',
    'operations/cli.html', 'operations/training.html', 'operations/metamorphic-testing.html',
    'operations/exceptions-issues.html',
    'reference/sources.html', 'reference/specification-architecture.html',
    'development/knowledge-bases.html', 'development/benchmarks.html', 'development/rl-datasets.html',
    'benchmarks/benchmark-logicbench.html', 'benchmarks/benchmark-iibench.html',
    'benchmarks/benchmark-proofwriter.html', 'benchmarks/benchmark-prontoqa.html',
    'benchmarks/benchmark-folio.html', 'assets/site.css',
    'assets/mermaid-loader.mjs', 'assets/public-benchmark-dashboard.mjs', 'assets/status-dashboard.mjs',
    'partials/header.html', 'partials/footer.html', 'partials-loader.js',
    'results/latest-evaluation.json', 'results/latest-evaluation.html',
    'results/latest-benchmark.json', 'results/latest-benchmark.html',
    'results/latest-generated-heuristic-benchmark.json',
    'results/latest-generated-heuristic-benchmark.html',
    'results/latest-generated-heuristic-seed-audit.json',
    'results/latest-processing-graph-pilot.json',
    'results/latest-processing-graph-pilot-plan.json',
    'results/latest-processing-graph-pilot-cycle.json',
    'results/latest-processing-graph-pilot-publication.json',
    'results/latest-oasst1-large-source-readiness.json',
    'results/latest-processing-graph-research.json',
    'results/latest-processing-graph-research-plan.json',
    'results/latest-processing-graph-research-cycle.json',
    'results/latest-oasst1-processing-graph-research.json',
    'results/latest-oasst1-processing-graph-research-plan.json',
    'results/latest-oasst1-processing-graph-research-cycle.json',
    'results/latest-processing-graph-source-status.json',
    'results/latest-processing-graph-scale-publication.json',
    'results/latest-public-benchmark-probes.json', 'results/current-status.json', 'specs/matrix.md',
  ];
  const missing = [];
  for (const path of required) {
    try { await access(join(PROJECT_ROOT, 'docs', path)); } catch { missing.push(path); }
  }
  if (missing.length) throw new Error(`Missing documentation files: ${missing.join(', ')}`);
  await validatePublishedSpecificationSources();
  await processingGraphResearchStatus({ root: PROJECT_ROOT });
  const publicReport = JSON.parse(await readFile(join(PROJECT_ROOT, 'docs/results/latest-public-benchmark-probes.json'), 'utf8'));
  if (publicReport.format !== 'eslm-public-benchmark-probe-report-v2' || !Array.isArray(publicReport.rows) || publicReport.rows.length === 0) {
    throw new Error('Latest public benchmark report must use the supported format and contain rows.');
  }
  const requestedBenchmarkIds = publicReport.assembly?.requestedBenchmarkIds;
  if (!Array.isArray(requestedBenchmarkIds)) {
    throw new Error('Latest public benchmark report must declare its requested benchmark IDs.');
  }
  validatePublicBenchmarkRows(publicReport.rows, requestedBenchmarkIds, { requireExecutionResources: true });
  const currentBehavior = await benchmarkBehaviorIdentity();
  for (const row of publicReport.rows.filter((item) => item.resultOrigin === 'current-execution')) {
    if (row.behaviorDependency.digest !== currentBehavior.digest) {
      throw new Error(`${row.id} public evidence was executed by a different source tree; republish the portfolio.`);
    }
  }
  const currentReceiptAudit = await auditFreshBenchmarkReceipts();
  if (JSON.stringify(publicReport.assembly.receiptAudit) !== JSON.stringify(currentReceiptAudit.summary)) {
    throw new Error('Public benchmark receipt states differ from the current static receipt audit.');
  }
  for (const row of publicReport.rows) {
    if (typeof row.id !== 'string' || !row.evidenceState) throw new Error('Every public benchmark row needs an id and evidence state.');
    if (row.total === null && (row.correct !== null || row.accuracy !== null)) throw new Error(`${row.id} has a score without a denominator.`);
    if (row.total !== null && (!row.track || !row.inputRoute || !row.resultOrigin)) {
      throw new Error(`${row.id} must identify its measured track, input route, and result origin.`);
    }
    if (row.inputRoute !== 'raw-language' && row.directSymbolicRate !== null) {
      throw new Error(`${row.id} must not report directSymbolicRate for a non-raw-language route.`);
    }
    if (row.endToEndAccuracy !== null && row.accuracy !== row.endToEndAccuracy) {
      throw new Error(`${row.id} accuracy must use end-to-end denominator semantics.`);
    }
    if (typeof row.diagnosis !== 'string' || row.diagnosis.trim().length === 0) {
      throw new Error(`${row.id} must carry its current diagnosis in the generated public report.`);
    }
    if (row.total !== null && (!Number.isInteger(row.sampleCoverage?.tested)
      || !Number.isInteger(row.sampleCoverage?.available))) {
      throw new Error(`${row.id} must carry tested and available coverage counts in the generated public report.`);
    }
  }
  const roadmapStatus = JSON.parse(await readFile(join(PROJECT_ROOT, 'docs/results/current-status.json'), 'utf8'));
  if (roadmapStatus.format !== 'eslm-current-roadmap-status-v2'
      || roadmapStatus.assessmentKind !== 'editorial-capability-rubric'
      || !Array.isArray(roadmapStatus.coverage?.areas)) {
    throw new Error('Current status must contain the supported roadmap coverage artifact.');
  }
  if ('benchmarkPortfolio' in roadmapStatus) throw new Error('Roadmap status must not duplicate the public benchmark report.');
  if (roadmapStatus.coverage.areas.some((area) => area.bands.some((band) => 'credit' in band))) {
    throw new Error('Roadmap capability bands must not expose arbitrary numeric credits.');
  }
  for (const kind of ['evaluation', 'benchmark']) {
    const report = JSON.parse(await readFile(join(PROJECT_ROOT, `docs/results/latest-${kind}.json`), 'utf8'));
    if (kind === 'evaluation') assertInternalEvaluationReport(report);
    else assertInternalAuthoredBenchmarkReport(report);
    assertMatchingBenchmarkBehaviorIdentity(report.behaviorIdentity, currentBehavior, `Latest ${kind} report`);
    const reportPage = await readFile(join(PROJECT_ROOT, `docs/results/latest-${kind}.html`), 'utf8');
    const expectedPage = renderReportHtml(`Latest ${kind} report`, report);
    if (reportPage !== expectedPage) {
      throw new Error(`Latest ${kind} HTML does not correspond exactly to its current JSON receipt.`);
    }
  }
  const generatedReport = JSON.parse(await readFile(
    join(PROJECT_ROOT, 'docs/results/latest-generated-heuristic-benchmark.json'), 'utf8',
  ));
  assertGeneratedHeuristicBenchmarkReport(generatedReport);
  assertMatchingBenchmarkBehaviorIdentity(
    generatedReport.execution.behaviorIdentity,
    currentBehavior,
    'Generated heuristic benchmark',
  );
  const generatedPage = await readFile(
    join(PROJECT_ROOT, 'docs/results/latest-generated-heuristic-benchmark.html'), 'utf8',
  );
  if (generatedPage !== renderGeneratedHeuristicBenchmarkHtml(generatedReport)) {
    throw new Error('Generated heuristic benchmark HTML does not correspond exactly to its current JSON receipt.');
  }
  const seedAudit = JSON.parse(await readFile(
    join(PROJECT_ROOT, 'docs/results/latest-generated-heuristic-seed-audit.json'), 'utf8',
  ));
  assertGeneratedHeuristicMultiSeedAudit(seedAudit);
  assertMatchingBenchmarkBehaviorIdentity(
    seedAudit.sharedIdentity.behaviorIdentity,
    currentBehavior,
    'Generated heuristic multi-seed audit',
  );
  const htmlFiles = (await documentationHtmlFiles())
    .filter((file) => !file.startsWith('partials/'));
  for (const file of htmlFiles) {
    const html = await readFile(join(PROJECT_ROOT, 'docs', file), 'utf8');
    validateDocumentationDiagrams(file, html);
    const compatibilityRedirect = html.includes('data-compatibility-redirect=');
    if (!compatibilityRedirect && !html.includes('data-include="partials/header.html"')) {
      throw new Error(`${file} must load the shared navigation partial.`);
    }
    if (/<nav\b[^>]*class="[^"]*\bsite-nav\b/u.test(html)) {
      throw new Error(`${file} duplicates the primary navigation instead of using the shared partial.`);
    }
    const fullPath = join(PROJECT_ROOT, 'docs', file);
    const declaredBase = html.match(/<base\s+href="([^"]+)"/u)?.[1];
    const linkBase = declaredBase
      ? resolve(dirname(fullPath), declaredBase)
      : dirname(fullPath);
    for (const match of html.matchAll(/(?:href|src|data-include)="([^"]+)"/gu)) {
      const rawTarget = match[1];
      if (/^(?:https?:|mailto:|data:|#|\$)/u.test(rawTarget)) continue;
      const target = rawTarget.split(/[?#]/u)[0];
      if (!target) continue;
      if (target === declaredBase) continue;
      const path = target.startsWith('/')
        ? resolve(join(PROJECT_ROOT, 'docs'), target.slice(1))
        : resolve(linkBase, target);
      try { await access(path); } catch { throw new Error(`${file} links to missing local target ${target}.`); }
    }
  }
  const header = await readFile(join(PROJECT_ROOT, 'docs/partials/header.html'), 'utf8');
  const navigationGroups = [...header.matchAll(/<details><summary>([^<]+)<\/summary>/gu)]
    .map((match) => match[1]);
  if (JSON.stringify(navigationGroups) !== JSON.stringify([
    'Overview', 'Language', 'System', 'Reasoning', 'Development', 'Reference',
  ])) {
    throw new Error('Shared navigation must contain the six canonical role-based menus.');
  }
  const home = await readFile(join(PROJECT_ROOT, 'docs/index.html'), 'utf8');
  if ((home.match(/<section(?:\s|>)/gu) ?? []).length !== 3) throw new Error('Home page must contain exactly three substantive sections.');
  if (home.includes('data-public-benchmark-dashboard')) throw new Error('Home page must link to, not duplicate, the full benchmark dashboard.');
  const benchmarkStatusPage = await readFile(join(PROJECT_ROOT, 'docs/development/benchmarks.html'), 'utf8');
  if ((benchmarkStatusPage.match(/data-public-benchmark-dashboard/gu) ?? []).length !== 1) {
    throw new Error('Benchmark development status must be the single full public benchmark dashboard page.');
  }
  for (const file of htmlFiles.filter((file) => file !== 'development/benchmarks.html')) {
    const html = await readFile(join(PROJECT_ROOT, 'docs', file), 'utf8');
    if (html.includes('data-public-benchmark-dashboard')) {
      throw new Error(`${file} duplicates the full public benchmark dashboard.`);
    }
  }
  const dashboard = await readFile(join(PROJECT_ROOT, 'docs/assets/public-benchmark-dashboard.mjs'), 'utf8');
  if (!dashboard.includes("['Benchmark and result', 'Evidence, diagnosis, and next action']") || !dashboard.includes("executed ? '✓' : '—'")) {
    throw new Error('Public benchmark dashboard must keep the two-column layout and first-column execution mark.');
  }
  if (!dashboard.includes("node('p', row.diagnosis)") || dashboard.includes('function diagnosisFor')) {
    throw new Error('Public benchmark dashboard must render diagnoses from the generated report without mutable hardcoded overrides.');
  }
  return { checked: required.length, htmlFiles: htmlFiles.length, missing };
}
