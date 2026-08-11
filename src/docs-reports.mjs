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
    'evaluation.html', 'cli.html', 'status.html', 'specsLoader.html', 'assets/site.css',
    'assets/mermaid-loader.mjs', 'partials/header.html', 'partials/footer.html', 'partials-loader.js',
    'specs/matrix.md',
  ];
  const missing = [];
  for (const path of required) {
    try { await access(join(PROJECT_ROOT, 'docs', path)); } catch { missing.push(path); }
  }
  if (missing.length) throw new Error(`Missing documentation files: ${missing.join(', ')}`);
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
  return { checked: required.length, htmlFiles: htmlFiles.length, missing };
}
