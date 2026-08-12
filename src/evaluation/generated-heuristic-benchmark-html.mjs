function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function percent(value) {
  return `${(value * 100).toFixed(value === 0 || value === 1 ? 0 : 2)}%`;
}

function aggregateRows(rows) {
  return rows.map((row) => `<tr><td><code>${escapeHtml(row.key)}</code></td>`
    + `<td>${row.passed}/${row.total} contracts passed (${percent(row.passRate)})</td></tr>`).join('\n');
}

function clusterRows(report) {
  if (report.failureClusters.length === 0) {
    return '<tr><td>Current run</td><td>No failures occurred in this fixed generated development run.</td></tr>';
  }
  return report.failureClusters.map((cluster) => `<tr><td><code>${escapeHtml(cluster.id)}</code></td>`
    + `<td>${cluster.count} cases; earliest stage: ${escapeHtml(cluster.stage)}; representatives: `
    + `${escapeHtml(cluster.representativeCaseIds.join(', '))}</td></tr>`).join('\n');
}

function representativeRows(report) {
  if (report.representativeFailures.length === 0) return '';
  const rows = report.representativeFailures.map((item) => `<tr><td><code>${escapeHtml(item.id)}</code></td>`
    + `<td><p>${escapeHtml(item.input)}</p><p>Status: <code>${escapeHtml(item.actual.status)}</code>. `
    + `Diagnostics: ${escapeHtml(item.failures.map((failure) => failure.code).join(', '))}.</p></td></tr>`).join('\n');
  return `<h2>Bounded representative failures</h2>
<div class="table-wrap"><table><thead><tr><th>Case</th><th>Input, status, and diagnostics</th>`
    + `</tr></thead><tbody>${rows}</tbody></table></div>`;
}

export function renderGeneratedHeuristicBenchmarkHtml(report) {
  const familyRows = aggregateRows(report.aggregates.targetFamily);
  const techniqueRows = aggregateRows(report.aggregates.technique);
  const oracleRows = aggregateRows(report.aggregates.oracleLevel);
  const routeRows = aggregateRows(report.aggregates.route);
  const statusRows = aggregateRows(report.aggregates.status);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<base href="../"><title>Generated heuristic development benchmark — ESLM Documentation</title>
<link rel="stylesheet" href="assets/site.css"><script src="partials-loader.js" defer></script></head>
<body><div data-include="partials/header.html"></div><main><p class="breadcrumb"><a href="index.html">ESLM Documentation</a> / <a href="evaluation.html">Evaluation</a> / Generated development</p>
<h1>Generated heuristic development benchmark</h1>
<p class="lead">A deterministic, structurally generated regression suite exercises local language strategies across renamed domains. Its claim is deliberately scoped to repeatable development evidence; official datasets and independently authored language evaluations remain separate tracks.</p>
<div class="callout"><p><strong>Evidence regime:</strong> <code>${escapeHtml(report.evidenceRegime)}</code>. <strong>Benchmark comparable:</strong> no.</p>
<p><strong>Fixed seed:</strong> <code>${escapeHtml(report.generator.seed)}</code>. <strong>Suite digest:</strong> <code>${escapeHtml(report.generator.suiteDigest)}</code>.</p></div>
<div class="metric"><strong>${report.passed}/${report.total}</strong><span>development contracts passed · ${percent(report.accuracy)} mixed contract rate</span></div>
<p>The run covers ${report.generator.uniqueInputs} unique inputs drawn from ${report.generator.techniques} defined techniques and ${report.generator.domains} defined domain themes. This execution observes ${report.generator.observedTargetFamilies} target families, ${report.generator.observedOracleLevels} contract levels, and ${report.generator.observedTechniqueDomainCells} technique-by-domain cells. Every case stays in the denominator. The runner disables grounding and the external Language Agent so that it measures the direct parser and bounded local heuristic strategies.</p>
<p>Generated ${escapeHtml(report.createdAt)}. Replay with <code>${escapeHtml(report.execution.replayCommand)}</code>. Inspect the <a href="results/latest-generated-heuristic-benchmark.json">machine report</a> for exact work policy, strategy selection, receipts, resource observations, aggregates, and failure clusters.</p>
<h2>How to read this result</h2>
<p>The fixed suite is intentionally development-visible. Its machine <code>accuracy</code> field is the exact passed/total rate across several different contract levels: semantic answers, exact candidate selection with accepted parse-only evidence, query-local decomposition, request execution, proposal-only preservation, and safe abstention. Candidate selection does not claim a complete relation-shaped Semantic IR. A proposal-only row can pass while the final runtime status remains <code>UNPARSED</code>; the status and route tables below keep those limitations visible. Proposed strategy changes still require renamed controls, an independent seed, negative and metamorphic cases, and public or independently authored evaluation before a broader claim.</p>
<h2>Failure clusters</h2>
<div class="table-wrap"><table><thead><tr><th>Cluster</th><th>Count, earliest stage, and representatives</th></tr></thead><tbody>${clusterRows(report)}</tbody></table></div>
<h2>Oracle levels</h2>
<div class="table-wrap"><table><thead><tr><th>Contract level</th><th>Outcome</th></tr></thead><tbody>${oracleRows}</tbody></table></div>
<h2>Observed final routes and statuses</h2>
<div class="table-wrap"><table><thead><tr><th>Route</th><th>Outcome</th></tr></thead><tbody>${routeRows}</tbody></table></div>
<div class="table-wrap"><table><thead><tr><th>Status</th><th>Outcome</th></tr></thead><tbody>${statusRows}</tbody></table></div>
<h2>Target-family contract results</h2>
<div class="table-wrap"><table><thead><tr><th>Target family</th><th>Outcome</th></tr></thead><tbody>${familyRows}</tbody></table></div>
<h2>Technique coverage</h2>
<div class="table-wrap"><table><thead><tr><th>Technique</th><th>Outcome</th></tr></thead><tbody>${techniqueRows}</tbody></table></div>
${representativeRows(report)}
</main></body></html>\n`;
}
