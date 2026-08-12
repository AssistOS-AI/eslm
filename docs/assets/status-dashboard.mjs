function element(name, text, className) {
  const node = document.createElement(name);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function stateCounts(area) {
  return Object.fromEntries(['implemented', 'partial', 'absent'].map((state) => [
    state,
    area.bands.filter((band) => band.state === state).length,
  ]));
}

function coverageSummary(status) {
  const wrapper = element('div', undefined, 'table-wrap');
  const table = element('table');
  const head = element('thead');
  const headRow = element('tr');
  for (const label of ['Coverage area', 'Current evidence, editorial state, and main gap']) {
    headRow.append(element('th', label));
  }
  head.append(headRow);
  const body = element('tbody');
  for (const area of status.coverage.areas) {
    const counts = stateCounts(area);
    const implemented = area.bands.filter((band) => band.state === 'implemented').map((band) => band.label);
    const partial = area.bands.filter((band) => band.state === 'partial').map((band) => band.label);
    const evidence = `${implemented.length ? `Implemented: ${implemented.join(', ')}. ` : ''}`
      + `${partial.length ? `Partial: ${partial.join(', ')}.` : ''}`;
    const tr = element('tr');
    const details = element('td');
    details.append(
      element('p', `${counts.implemented} implemented · ${counts.partial} partial · ${counts.absent} absent`),
      element('p', evidence),
      element('p', `Main gap: ${area.mainGap}`),
    );
    tr.append(element('td', area.label), details);
    body.append(tr);
  }
  table.append(head, body);
  wrapper.append(table);
  return wrapper;
}

function coverageDetails(status) {
  const container = element('div');
  container.append(element('p', status.warning), element('p', status.coverage.method));
  for (const area of status.coverage.areas) {
    container.append(element('h3', area.label));
    const wrapper = element('div', undefined, 'table-wrap');
    const table = element('table');
    const head = element('thead');
    const headRow = element('tr');
    for (const label of ['Target band', 'Editorial state, current evidence, and boundary']) {
      headRow.append(element('th', label));
    }
    head.append(headRow);
    const body = element('tbody');
    for (const band of area.bands) {
      const tr = element('tr');
      const badgeClass = band.state === 'implemented' ? 'yes' : band.state === 'partial' ? 'partial' : 'no';
      const details = element('td');
      details.append(element('span', band.state, `cap cap--${badgeClass}`), element('p', band.evidence));
      tr.append(element('td', band.label), details);
      body.append(tr);
    }
    table.append(head, body);
    wrapper.append(table);
    container.append(wrapper);
  }
  return container;
}

async function renderStatus() {
  const response = await fetch('results/current-status.json');
  if (!response.ok) throw new Error(`Current status request failed with HTTP ${response.status}.`);
  const status = await response.json();
  if (status.format !== 'eslm-current-roadmap-status-v2'
      || status.assessmentKind !== 'editorial-capability-rubric'
      || !Array.isArray(status.coverage?.areas)) {
    throw new Error('unsupported roadmap status format');
  }
  for (const node of document.querySelectorAll('[data-current-status-meta]')) {
    node.textContent = `Roadmap assessment updated ${new Date(status.updatedAt).toLocaleString()}. ${status.coverage.method}`;
  }
  for (const node of document.querySelectorAll('[data-coverage-summary]')) node.replaceChildren(coverageSummary(status));
  for (const node of document.querySelectorAll('[data-coverage-details]')) node.replaceChildren(coverageDetails(status));
}

renderStatus().catch((error) => {
  for (const node of document.querySelectorAll('[data-current-status-meta], [data-coverage-summary], [data-coverage-details]')) {
    node.textContent = `Current roadmap status could not be loaded: ${error.message}`;
  }
});
