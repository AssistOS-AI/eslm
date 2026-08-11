import { access, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { PROJECT_ROOT } from './paths.mjs';

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function reportHtml(title, report) {
  const rows = (report.outcomes ?? report.results ?? []).map((item) =>
    `<tr><td>${escapeHtml(item.id)}</td><td>${item.pass ? 'pass' : 'fail'}</td><td><code>${escapeHtml(JSON.stringify(item.actual))}</code></td></tr>`).join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<base href="../"><title>${escapeHtml(title)} — ESLM Documentation</title><link rel="stylesheet" href="assets/site.css"><script src="partials-loader.js" defer></script><script type="module" src="assets/mermaid-loader.mjs"></script></head>
<body><div data-include="partials/header.html"></div><main><p class="breadcrumb"><a href="index.html">ESLM Documentation</a> / Results</p><h1>${escapeHtml(title)}</h1>
<p>Generated ${escapeHtml(report.createdAt)}. Protocol: <code>${escapeHtml(report.protocol ?? report.format)}</code>.</p>
<div class="metric"><strong>${escapeHtml(report.accuracy ?? 0)}</strong><span>accuracy</span></div>
<table><thead><tr><th>Case</th><th>Verdict</th><th>Actual</th></tr></thead><tbody>${rows}</tbody></table>
<h2>Execution flow</h2><figure class="diagram"><pre class="mermaid">flowchart LR
  Input[Fixed suite] --> Runtime[Offline ESLM]
  Runtime --> Result[Semantic result]
  Result --> Oracle[Deterministic oracle]
  Oracle --> Report[Evidence report]</pre><figcaption>The runtime returns semantic values, statuses, and traces as one structured result. The deterministic oracle checks that result and preserves every case in the evidence report.</figcaption></figure>
</main></body></html>\n`;
}

export async function publishReport(kind) {
  const jsonPath = join(PROJECT_ROOT, 'docs/results', `latest-${kind}.json`);
  const report = JSON.parse(await readFile(jsonPath, 'utf8'));
  const htmlPath = join(PROJECT_ROOT, 'docs/results', `latest-${kind}.html`);
  await writeFile(htmlPath, reportHtml(`Latest ${kind} report`, report), 'utf8');
  return htmlPath;
}

export async function checkDocumentation() {
  const required = [
    'index.html', 'architecture.html', 'language.html', 'knowledge-bases.html', 'training.html',
    'evaluation.html', 'cli.html', 'status.html', 'research-program.html', 'reasoning-methods.html',
    'reasoning-categorical-logic.html',
    'reasoning-deduction-and-models.html', 'reasoning-defaults-and-abduction.html',
    'reasoning-state-time-and-relations.html', 'reasoning-narrative-and-compatibility.html',
    'language-agent.html', 'research-decisions.html', 'specification-architecture.html',
    'kb-storage-and-indexing.html', 'symbolic-document-kbs.html', 'sources.html', 'specsLoader.html',
    'benchmark-logicbench.html', 'benchmark-iibench.html', 'benchmark-proofwriter.html',
    'benchmark-prontoqa.html', 'benchmark-folio.html', 'assets/site.css',
    'assets/mermaid-loader.mjs', 'assets/public-benchmark-dashboard.mjs', 'assets/status-dashboard.mjs',
    'partials/header.html', 'partials/footer.html', 'partials-loader.js', 'results/latest-public-benchmark-probes.json',
    'results/current-status.json', 'specs/matrix.md',
  ];
  const missing = [];
  for (const path of required) {
    try { await access(join(PROJECT_ROOT, 'docs', path)); } catch { missing.push(path); }
  }
  if (missing.length) throw new Error(`Missing documentation files: ${missing.join(', ')}`);
  const publicReport = JSON.parse(await readFile(join(PROJECT_ROOT, 'docs/results/latest-public-benchmark-probes.json'), 'utf8'));
  if (publicReport.format !== 'eslm-public-benchmark-probe-report-v1' || !Array.isArray(publicReport.rows) || publicReport.rows.length === 0) {
    throw new Error('Latest public benchmark report must use the supported format and contain rows.');
  }
  for (const row of publicReport.rows) {
    if (typeof row.id !== 'string' || !row.evidenceState) throw new Error('Every public benchmark row needs an id and evidence state.');
    if (row.total === null && (row.correct !== null || row.accuracy !== null)) throw new Error(`${row.id} has a score without a denominator.`);
  }
  const roadmapStatus = JSON.parse(await readFile(join(PROJECT_ROOT, 'docs/results/current-status.json'), 'utf8'));
  if (roadmapStatus.format !== 'eslm-current-roadmap-status-v1' || !Array.isArray(roadmapStatus.coverage?.areas)) {
    throw new Error('Current status must contain the supported roadmap coverage artifact.');
  }
  if ('benchmarkPortfolio' in roadmapStatus) throw new Error('Roadmap status must not duplicate the public benchmark report.');
  const htmlFiles = (await readdir(join(PROJECT_ROOT, 'docs'))).filter((file) => file.endsWith('.html'));
  for (const file of htmlFiles) {
    const html = await readFile(join(PROJECT_ROOT, 'docs', file), 'utf8');
    if (file !== 'specsLoader.html' && !html.includes('class="mermaid"')) throw new Error(`${file} must contain a small explained Mermaid diagram.`);
    if (file !== 'specsLoader.html' && !html.includes('<figcaption>')) throw new Error(`${file} must explain its Mermaid diagram in a figcaption.`);
    if (file !== 'specsLoader.html') {
      for (const diagram of html.matchAll(/<pre class="mermaid">([\s\S]*?)<\/pre>/gu)) {
        if (!/^flowchart LR\s*$/mu.test(diagram[1])) throw new Error(`${file} diagrams must use a left-to-right flow.`);
        const edges = (diagram[1].match(/-->/gu) ?? []).length;
        if (edges > 5) throw new Error(`${file} diagram has ${edges} edges; split or explain it in prose.`);
      }
    }
    if (!html.includes('data-include="partials/header.html"')) throw new Error(`${file} must load the shared navigation partial.`);
    if (/<nav(?:\s|>)/u.test(html)) throw new Error(`${file} duplicates navigation instead of using the shared partial.`);
    for (const match of html.matchAll(/href="([^"#]+)"/gu)) {
      const target = match[1].split('?')[0];
      if (/^(?:https?:|mailto:|\$)/u.test(target)) continue;
      const path = resolve(dirname(join(PROJECT_ROOT, 'docs', file)), target);
      try { await access(path); } catch { throw new Error(`${file} links to missing local target ${target}.`); }
    }
  }
  const header = await readFile(join(PROJECT_ROOT, 'docs/partials/header.html'), 'utf8');
  if ((header.match(/<details>/gu) ?? []).length !== 4) throw new Error('Shared navigation must contain four grouped menus.');
  const home = await readFile(join(PROJECT_ROOT, 'docs/index.html'), 'utf8');
  if ((home.match(/<section(?:\s|>)/gu) ?? []).length !== 3) throw new Error('Home page must contain exactly three substantive sections.');
  if (!home.includes('data-public-benchmark-dashboard')) throw new Error('Home page must render the public benchmark report client-side.');
  const dashboard = await readFile(join(PROJECT_ROOT, 'docs/assets/public-benchmark-dashboard.mjs'), 'utf8');
  if (!dashboard.includes("['Benchmark and result', 'Evidence, diagnosis, and next action']") || !dashboard.includes("executed ? '✓' : '—'")) {
    throw new Error('Public benchmark dashboard must keep the two-column layout and first-column execution mark.');
  }
  return { checked: required.length, htmlFiles: htmlFiles.length, missing };
}
