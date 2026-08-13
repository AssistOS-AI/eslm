function element(name, text, className) {
  const node = document.createElement(name);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function profileLabel(profileId) {
  return ({
    'core-only': 'Core only',
    'quick-assisted': 'QUICK assisted',
    'real-kb': 'Real KB',
  })[profileId] ?? profileId;
}

function profileCard(profile) {
  const card = element('article', undefined, 'status-card');
  card.append(element('h3', profileLabel(profile.profileId)));
  const state = profile.current ? 'Current executable checkpoint' : 'Stored snapshot — rerun required';
  card.append(element('p', state, profile.current ? 'status-good' : 'status-warning'));
  card.append(element('p', `${profile.counts.total} assigned · ${profile.validated.pass} validated pass · ${profile.validated.pendingReview} pending review · ${profile.validated.fail} fail`));
  card.append(element('p', `${profile.validatedPassPercent}% qualitative pass rate (${profile.counts.pass} machine-exact and ${profile.semanticReview.pass} reviewed semantic).`));
  if (!profile.semanticReview.current) {
    card.append(element('p', 'The stored semantic decisions do not match this result file and are excluded.', 'status-warning'));
  }
  const clusters = profile.failureClusters.length === 0
    ? 'No failed-stage cluster.'
    : profile.failureClusters.map((item) => `${item.stage} ${item.count}`).join(' · ');
  card.append(element('p', `Earliest remaining failures: ${clusters}`, 'muted'));
  return card;
}

async function renderStatus(container) {
  const response = await fetch(container.dataset.source);
  if (!response.ok) throw new Error(`Status request failed with ${response.status}.`);
  const status = await response.json();
  const inventory = status.inventory;
  const preferred = status.preferredSourceOutcome;
  const heading = element('div', undefined, 'status-summary');
  heading.append(element('p', `${inventory.convertedCases} of ${inventory.sourceCases} source proposals converted, plus ${inventory.structuralControls} independently authored controls · ${inventory.categories} source categories · ${inventory.byScoring.exact} exact · ${inventory.byScoring.semantic} semantic-review source cases.`));
  heading.append(element('p', `Preferred fully local result: ${preferred.pass}/${preferred.total} validated qualitative passes (${preferred.passPercent}%), ${preferred.pendingReview} pending review, and ${preferred.fail} failures. Each source question is counted once; the auxiliary QUICK profile is excluded from this total.`,
    preferred.pendingReview === 0 ? 'status-good' : 'status-warning'));
  heading.append(element('p', status.checkpoint.allProfilesCurrent
    ? 'All three profile reports match the current executable and case manifest.'
    : `${status.checkpoint.currentProfileCount} of ${status.checkpoint.expectedProfileCount} profile reports match the current executable; stale cards remain visible rather than being presented as current.`,
  status.checkpoint.allProfilesCurrent ? 'status-good' : 'status-warning'));
  container.replaceChildren(heading);
  const grid = element('div', undefined, 'status-grid');
  for (const profile of status.profiles) grid.append(profileCard(profile));
  container.append(grid);
  const controls = status.structuralControls;
  container.append(element('p', `Structural controls: ${controls.counts.pass}/${controls.counts.total} exact pass, ${controls.counts.fail} fail${controls.current ? '; current executable checkpoint.' : '; stored snapshot — rerun required.'}`,
    controls.current && controls.counts.fail === 0 ? 'status-good' : 'status-warning'));
}

for (const container of document.querySelectorAll('[data-basic-eval-status]')) {
  renderStatus(container).catch((error) => {
    container.replaceChildren(element('p', `Basic Eval status is unavailable: ${error.message}`, 'status-warning'));
  });
}
