import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { longConversationStressCases } from '../src/conversation-smoke.mjs';
import { runConversationBenchmark } from '../src/conversation-benchmark.mjs';
import { writeJson } from '../src/io.mjs';
import { PROJECT_ROOT } from '../src/paths.mjs';

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function mib(bytes) { return (bytes / 1024 / 1024).toFixed(1); }

function htmlReport(report) {
  const rows = report.groups.map((group) => `<tr><td>${escapeHtml(group.group)}</td><td>${group.passed} / ${group.total}</td><td>${(group.accuracy * 100).toFixed(1)}%</td></tr>`).join('\n');
  const examples = report.examples.map((item) => `<section><h3>${escapeHtml(item.group)}</h3><p><code>${escapeHtml(item.input)}</code></p><p><strong>${escapeHtml(item.actualStatus)}</strong> — ${escapeHtml(item.answer)}</p></section>`).join('\n');
  const failureSection = report.failures.length === 0
    ? '<p class="notice success">No failing cases remained in the accepted run.</p>'
    : `<table><thead><tr><th>Group</th><th>Input</th><th>Expected</th><th>Actual</th></tr></thead><tbody>${report.failures.slice(0, 100).map((item) => `<tr><td>${escapeHtml(item.group)}</td><td>${escapeHtml(item.input)}</td><td>${escapeHtml(item.expectedStatus)}</td><td>${escapeHtml(item.actualStatus)}</td></tr>`).join('')}</tbody></table>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<base href="../"><title>Long conversational benchmark</title><link rel="stylesheet" href="assets/site.css"><script src="partials-loader.js" defer></script></head>
<body><div data-include="partials/header.html"></div><main><p class="breadcrumb"><a href="index.html">ESLM Documentation</a> / <a href="benchmarks.html">Benchmarks</a> / Long conversational benchmark</p>
<h1>Long conversational benchmark</h1>
<p>This is ESLM's generated internal stress and regression suite, not a public benchmark and not evidence of comparison with another model. It checks longer contexts, surface variation, loaded WordNet and ATOMIC queries, explicit uncertainty, and unsupported requests.</p>
<div class="metric"><strong>${report.passed} / ${report.total}</strong><span>accepted cases</span></div>
<p>The run used lazy public-KB shards with ${(report.configuration.cacheBytesPerPublicKnowledgeBase / 1024 / 1024).toFixed(0)} MiB per provider. Queries took ${(report.durationMs / 1000).toFixed(2)} seconds after ${(report.initializationMs / 1000).toFixed(2)} seconds of initialization. RSS changed by ${mib(report.memory.rssDeltaBytes)} MiB during the process.</p>
<h2>Coverage by question family</h2><table><thead><tr><th>Family</th><th>Passed</th><th>Accuracy</th></tr></thead><tbody>${rows}</tbody></table>
<h2>What one case from each family looks like</h2>${examples}
<h2>Failures in the latest run</h2>${failureSection}
<p>See <a href="cli.html">the CLI tutorial</a> for interactive use, <a href="knowledge-bases.html">knowledge-base behavior</a>, and <a href="specs/DS022-conversational-regression-and-stress-benchmark.md">the benchmark contract</a>.</p>
</main><div data-include="partials/footer.html"></div></body></html>\n`;
}

const jsonPath = resolve(PROJECT_ROOT, 'docs/results/latest-conversation-benchmark.json');
const htmlPath = resolve(PROJECT_ROOT, 'docs/results/latest-conversation-benchmark.html');
const report = await runConversationBenchmark(longConversationStressCases(1000));
await writeJson(jsonPath, report);
await writeFile(htmlPath, htmlReport(report));
console.log(`Long conversational benchmark: ${report.passed}/${report.total} in ${(report.durationMs / 1000).toFixed(2)}s.`);
if (report.failures.length > 0) process.exitCode = 1;
