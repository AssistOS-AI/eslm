function node(name, text, className) {
  const value = document.createElement(name);
  if (text !== undefined) value.textContent = text;
  if (className) value.className = className;
  return value;
}

const BENCHMARKS = {
  blimp: { title: 'BLiMP', page: 'benchmark-blimp.html' },
  babi: { title: 'bAbI', page: 'benchmark-babi.html' },
  clutrr: { title: 'CLUTRR', page: 'benchmark-clutrr.html' },
  ewok: { title: 'EWoK', page: 'benchmark-ewok.html' },
  simpleqa: { title: 'SimpleQA', page: 'benchmark-simpleqa.html' },
  entityTracking: { title: 'Entity Tracking', page: 'benchmark-entity-tracking.html' },
  storyCloze: { title: 'Story Cloze', page: 'benchmark-story-cloze.html' },
  logicbench: { title: 'LogicBench', page: 'benchmark-logicbench.html' },
  iibench: { title: 'IIBench', page: 'benchmark-iibench.html' },
  proofwriter: { title: 'ProofWriter', page: 'benchmark-proofwriter.html' },
  prontoqa: { title: 'PrOntoQA', page: 'benchmark-prontoqa.html' },
  folio: { title: 'FOLIO', page: 'benchmark-folio.html' },
  'slr-bench': { title: 'SLR-Bench', page: 'benchmark-slr-bench.html' },
  logicskills: { title: 'LogicSkills', page: 'benchmark-logicskills.html' },
  proverqa: { title: 'ProverQA', page: 'benchmark-proverqa.html' },
  stepgame: { title: 'StepGame', page: 'benchmark-stepgame.html' },
  'sparc-sparp': { title: 'SpaRC / SpaRP', page: 'benchmark-sparp.html' },
  satbench: { title: 'SATBench', page: 'benchmark-satbench.html' },
  zebralogic: { title: 'ZebraLogic', page: 'benchmark-zebralogic.html' },
  'defeasible-nli': { title: 'Defeasible NLI', page: 'benchmark-defeasible-nli.html' },
  'alpha-nli-art': { title: 'αNLI / ART', page: 'benchmark-alpha-nli-art.html' },
  reclor: { title: 'ReClor', page: 'benchmark-reclor.html' },
  logiqa: { title: 'LogiQA', page: 'benchmark-logiqa.html' },
};

function titleFor(id) {
  if (BENCHMARKS[id]) return BENCHMARKS[id].title;
  return String(id).split(/[-_]/u).map((part) => part.length <= 4
    ? part.toLocaleUpperCase('en-US')
    : `${part[0].toLocaleUpperCase('en-US')}${part.slice(1)}`).join(' ');
}

function benchmarkPage(row, anchor = '') {
  const page = BENCHMARKS[row.id]?.page ?? 'evaluation.html';
  return page.includes('#') ? page : `${page}${anchor}`;
}

function percent(value) {
  if (value === null || value === undefined) return 'not applicable';
  return `${(value * 100).toFixed(value === 0 || value === 1 ? 0 : 2)}%`;
}

function linkedTerm(row, text, anchor) {
  const link = node('a', text);
  link.href = benchmarkPage(row, anchor);
  return link;
}

function appendParts(container, parts) {
  parts.forEach((part, index) => {
    if (index > 0) container.append(document.createTextNode(' · '));
    container.append(typeof part === 'string' ? document.createTextNode(part) : part);
  });
}

function outcomeLine(row) {
  const line = node('p', undefined, 'benchmark-count-line');
  if (row.total === null) {
    line.textContent = 'No scored cases';
    return line;
  }
  if (Number.isInteger(row.ties)) {
    const reversed = row.reversedPreferences ?? row.total - row.correct - row.ties;
    appendParts(line, [
      linkedTerm(row, `${row.correct} correct`, '#preference-outcomes'),
      linkedTerm(row, `${reversed} reversed`, '#preference-outcomes'),
      linkedTerm(row, `${row.ties} tied`, '#preference-outcomes'),
      linkedTerm(row, 'ties fail', '#preference-outcomes'),
    ]);
    return line;
  }
  if (row.id === 'storyCloze' && Number.isInteger(row.omissions)) {
    appendParts(line, [
      `${row.total - row.omissions} answered`,
      linkedTerm(row, `${row.omissions} omissions`, '#omission'),
    ]);
    return line;
  }
  if (row.id === 'simpleqa') {
    appendParts(line, [
      linkedTerm(row, `${row.statusCounts?.UNKNOWN ?? 0} UNKNOWN`, '#unknown-and-unparsed'),
      linkedTerm(row, `${row.statusCounts?.UNPARSED ?? 0} UNPARSED`, '#unknown-and-unparsed'),
    ]);
    return line;
  }
  if (row.id === 'clutrr') {
    appendParts(line, [
      `${row.statusCounts?.SOLVED ?? row.correct} solved`,
      linkedTerm(row, `${row.statusCounts?.AMBIGUOUS ?? 0} AMBIGUOUS`, '#ambiguous'),
    ]);
    return line;
  }
  const statuses = Object.entries(row.statusCounts ?? {});
  if (statuses.length === 0) {
    line.textContent = `${row.correct} correct cases`;
    return line;
  }
  statuses.forEach(([status, count], index) => {
    if (index > 0) line.append(document.createElement('br'));
    const readable = status.replaceAll('_', ' ').toLocaleLowerCase('en-US');
    line.append(linkedTerm(row, `${count} ${readable}`, '#outcomes'));
  });
  return line;
}

function subtrackLines(row) {
  return (row.subtrackResults ?? []).map((subtrack) => node(
    'p',
    `${subtrack.label}: ${subtrack.correct.toLocaleString('en-US')}/${subtrack.tested.toLocaleString('en-US')} (${percent(subtrack.accuracy)})`,
    'benchmark-result-summary',
  ));
}

function availableCoverage(row) {
  if (row.total === null) return 'Coverage: no runnable denominator';
  if (Number.isInteger(row.sampleCoverage?.tested) && Number.isInteger(row.sampleCoverage?.available)) {
    const unit = row.sampleCoverage.unit ?? 'cases';
    return `${row.sampleCoverage.tested.toLocaleString('en-US')}/${row.sampleCoverage.available.toLocaleString('en-US')} ${unit} tested`;
  }
  if (row.id === 'blimp') {
    const fullSource = row.total + (row.developmentResult?.total ?? 0);
    return `${row.total.toLocaleString('en-US')} tested / ${row.total.toLocaleString('en-US')} in the frozen fresh partition; ${fullSource.toLocaleString('en-US')} source pairs`;
  }
  if (row.id === 'babi') {
    return `${row.total.toLocaleString('en-US')} tested / four of 20 task families; source-case total is not recorded in this report`;
  }
  if (row.id === 'clutrr') {
    const available = (row.sourceEvidence ?? []).reduce((sum, item) => sum + (item.sourceRows ?? 0), 0);
    return `${row.total.toLocaleString('en-US')} tested / ${available.toLocaleString('en-US')} rows in the listed depth files`;
  }
  if (row.id === 'entityTracking') {
    const available = row.sourceEvidence?.find((item) => Number.isInteger(item.sourceRows))?.sourceRows;
    return `${row.total.toLocaleString('en-US')} tested / ${available?.toLocaleString('en-US') ?? 'unreported'} development rows`;
  }
  if (row.id === 'ewok') {
    const available = row.sourceValidation?.decisions ?? row.total;
    return `${row.total.toLocaleString('en-US')} tested / ${row.total.toLocaleString('en-US')} in the frozen fresh partition; ${available.toLocaleString('en-US')} retained decisions overall`;
  }
  if (row.id === 'storyCloze') {
    const fresh = 314;
    return `${row.total.toLocaleString('en-US')} tested / ${row.total.toLocaleString('en-US')} in the development partition; ${(row.total + fresh).toLocaleString('en-US')} validation cases overall`;
  }
  if (row.id === 'simpleqa') {
    const available = row.sourceEvidence?.find((item) => Number.isInteger(item.records))?.records;
    return `${row.total.toLocaleString('en-US')} tested / ${available?.toLocaleString('en-US') ?? 'unreported'} official records`;
  }
  return `${row.total.toLocaleString('en-US')} tested / available source denominator not recorded`;
}

function evidenceText(row) {
  if (row.total === null) return row.evidenceState === 'source-cached-no-valid-symbolic-method'
    ? 'The source is cached and validated, but no method was valid enough to produce predictions.'
    : 'The source cannot yet provide a runnable denominator. Follow the access action below.';
  const labels = {
    'development-probe-executed': 'This is an executed development probe. Its cases may have influenced implementation and are not untouched test evidence.',
    'diagnostic-probe-executed': 'This is an executed diagnostic probe. Its scorer is intended to locate failures, not reproduce an official leaderboard score.',
    'fresh-evaluation-executed': 'This is a frozen fresh evaluation. The candidate was fixed before this partition was scored once.',
    'sealed-fresh-aggregate-only': 'This is a frozen fresh evaluation. The candidate was fixed before the complete sealed partition was executed once, and only aggregate evidence left the evaluator.',
  };
  return labels[row.evidenceState] ?? 'The declared probe executed.';
}

function diagnosisFor(row) {
  const explanations = {
    babi: 'The run solved 100 selected training cases: 25 each from the two-supporting-facts, three-supporting-facts, basic-deduction, and basic-induction tasks. It demonstrates the implemented state-history and declarative induction mechanisms on those inspected cases. It is not a run over the other 16 bAbI task families and is not an untouched official test score.',
    blimp: 'The fresh run covers every grammar paradigm, but not every pair is solved. Most failures now concern phrase structure, attachment, lexical selection, agreement, valency, participle interpretation, and binding domains. These are grammar-model gaps; the result is not a percentage of English understood.',
    clutrr: 'Typed relation composition solves 104 sampled graphs. Four graphs remain ambiguous because their observable typed structure is compatible with more than one official kinship label. The runtime preserves that ambiguity instead of guessing from names, row identifiers, label frequency, or answer order.',
    entityTracking: 'The adapter converts the bounded stories into explicit add, remove, and move operations, and the core executes those operations as state transitions. This establishes the declared structured schema on the sample, not arbitrary event-language understanding.',
    ewok: 'The small development probe was fully covered, but the much larger frozen fresh partition exposed a narrow world-relation ontology. Many targets receive equal scores in both contexts, especially in social and material domains. A new candidate needs broader independently justified knowledge; the opened fresh cases cannot be patched while still being called fresh evidence.',
    storyCloze: 'The narrative method runs and exposes its evidence, but it still misses many goals, causal consequences, social expectations, contradictions, and multi-event temporal dependencies. This is an unresolved capability gap, not a proof that story continuation is impossible.',
    simpleqa: 'The 100-case diagnostic found two different limitations. Thirty-five questions were outside the current parser, and 65 were parsed but lacked independently sourced facts. Exact string comparison is a local diagnostic and is not the official semantic-grader score.',
  };
  return explanations[row.id] ?? row.diagnosis;
}

function capabilityText(row) {
  if (!row.capabilityCoverage?.description) return undefined;
  return `What this covers: ${row.capabilityCoverage.description}`;
}

function unscoredSummary(row) {
  const solved = row.statusCounts?.SOLVED ?? 0;
  if (solved > 0) {
    return `${solved.toLocaleString('en-US')}/${row.total.toLocaleString('en-US')} tasks produced verified outputs; no aggregate score across unavailable methods`;
  }
  return `${row.total.toLocaleString('en-US')} task contracts executed; no score before a valid method exists`;
}

function action(row) {
  if (!row.access?.actionUrl) return undefined;
  const container = node('div', undefined, 'benchmark-action');
  if (row.access.operatorAction) container.append(node('p', row.access.operatorAction));
  const link = node('a', row.access.actionLabel ?? 'Open the official access page');
  link.href = row.access.actionUrl;
  container.append(link);
  return container;
}

function render(report) {
  const wrapper = node('div', undefined, 'table-wrap');
  const table = node('table');
  table.className = 'public-benchmark-table';
  const head = node('thead');
  const header = node('tr');
  for (const label of ['Benchmark and result', 'Evidence, diagnosis, and next action']) header.append(node('th', label));
  head.append(header);
  const body = node('tbody');
  for (const row of report.rows) {
    const tr = node('tr');
    const identity = node('td');
    const executed = row.total !== null;
    const scored = Number.isInteger(row.correct) && Number.isFinite(row.accuracy);
    const titleLink = node('a', titleFor(row.id));
    titleLink.href = benchmarkPage(row);
    titleLink.className = 'benchmark-title-link';
    identity.append(
      node('span', executed ? '✓' : '—', executed ? 'benchmark-state benchmark-state--run' : 'benchmark-state'),
      document.createTextNode(' '),
      titleLink,
      node('p', row.total === null
        ? 'Not run'
        : scored
          ? `${row.correct}/${row.total} (${percent(row.accuracy)})`
          : unscoredSummary(row), 'benchmark-result-summary'),
      outcomeLine(row),
      node('p', availableCoverage(row), 'benchmark-sample-coverage'),
    );
    identity.append(...subtrackLines(row));
    if (row.total !== null && Number.isFinite(row.normalizationCandidateRate)) {
      identity.append(node('p', `Normalization candidates: ${percent(row.normalizationCandidateRate)}`, 'benchmark-normalization-rate'));
    }

    const result = node('td');
    const protocol = node('p');
    const protocolLink = node('a', `How ${titleFor(row.id)} is evaluated`);
    protocolLink.href = benchmarkPage(row, '#protocol');
    protocol.append(protocolLink, document.createTextNode(` — ${row.protocolDescription ?? 'See the protocol page for the scoring contract.'}`));
    result.append(node('p', evidenceText(row), 'benchmark-evidence-state'), protocol);
    if (row.sampleDescription) result.append(node('p', `Sampling scope: ${row.sampleDescription}`));
    if (row.sampleCoverage?.scope) result.append(node('p', `Tested-versus-available scope: ${row.sampleCoverage.scope}`));
    if ((row.agentInvocations ?? 0) > 0) {
      result.append(node('p', `Actual Language Agent normalization invocations: ${row.agentInvocations} (${percent(row.agentInvocationRate)}).`));
    }
    const capability = capabilityText(row);
    if (capability) result.append(node('p', capability, 'benchmark-coverage'));
    result.append(node('p', diagnosisFor(row)));
    const access = action(row);
    if (access) result.append(access);
    tr.append(identity, result);
    body.append(tr);
  }
  table.append(head, body);
  wrapper.append(table);
  return wrapper;
}

async function main() {
  const response = await fetch('results/latest-public-benchmark-probes.json');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const report = await response.json();
  if (report.format !== 'eslm-public-benchmark-probe-report-v1' || !Array.isArray(report.rows)) throw new Error('unsupported report format');
  for (const target of document.querySelectorAll('[data-public-benchmark-dashboard]')) target.replaceChildren(render(report));
}

main().catch((error) => {
  for (const target of document.querySelectorAll('[data-public-benchmark-dashboard]')) {
    target.textContent = `The latest public benchmark report could not be loaded: ${error.message}`;
  }
});
