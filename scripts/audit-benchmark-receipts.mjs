import { auditFreshBenchmarkReceipts } from '../src/evaluation/benchmark-receipt-audit.mjs';
import { parseArgs } from '../src/util.mjs';

const { options } = parseArgs(process.argv.slice(2));
const report = await auditFreshBenchmarkReceipts();

if (options.json) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  process.stdout.write([
    `Benchmark receipt audit: ${report.summary.current} current`,
    `${report.summary.historicalStale} historical-stale`,
    `${report.summary.historicalUnrecoverable} historical-unrecoverable`,
    `${report.summary.invalid} invalid`,
    `${report.summary.unavailable} unavailable.\n`,
  ].join(', '));
  for (const row of report.rows) {
    const details = row.state === 'current'
      ? `${row.dependencies.checked} dependency hashes match`
      : `${row.dependencies.changed} changed, ${row.dependencies.missing} missing, `
        + `${row.receiptBinding.issues.length} binding issue(s), `
        + `${row.receiptValidity.issues.length} validity/completeness issue(s)`;
    process.stdout.write(`- ${row.id}: ${row.state} (${details})\n`);
  }
}

const nonCurrent = report.summary.checked - report.summary.current;
if (options['require-current'] && nonCurrent > 0) process.exitCode = 1;
