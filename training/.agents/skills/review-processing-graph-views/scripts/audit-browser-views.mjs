function parseArguments(argv) {
  const options = { cdp: 'http://127.0.0.1:9222', url: 'http://127.0.0.1:4173/index.html', width: 1400 };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--cdp') options.cdp = argv[++index];
    else if (value === '--url') options.url = argv[++index];
    else if (value === '--width') options.width = Number(argv[++index]);
    else throw new TypeError(`Unknown argument ${value}.`);
  }
  if (!Number.isInteger(options.width) || options.width < 320 || options.width > 4096) {
    throw new TypeError('--width must be an integer from 320 through 4096.');
  }
  return Object.freeze(options);
}

function browserAudit() {
  return (async () => {
    const projectionModule = await import(new URL('assets/processing-graph-explorer-data.mjs', location.href));
    const projection = projectionModule.HOMEPAGE_PROCESSING_GRAPH_PROJECTION;
    const issues = [];
    const coverage = { circuit: 0, node: 0, family: 0, strategy: 0 };
    const automaticDistributionViews = [];
    const lineBoxOverlaps = [];
    const lineKindCoverage = new Set();
    const expectedLineColors = Object.freeze({
      flow: 'rgb(0, 122, 69)',
      'boundary-flow': 'rgb(22, 93, 204)',
      'implementation-flow': 'rgb(196, 81, 0)',
      'reciprocal-flow': 'rgb(146, 42, 155)',
    });
    const waitForRender = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const rootId = projection.rootCircuitId;
    const circuitById = new Map(projection.circuits.map((item) => [item.circuitId, item]));
    const nodeById = new Map(projection.nodes.map((item) => [item.nodeId, item]));
    const familyById = new Map(projection.strategyFamilies.map((item) => [item.familyId, item]));

    function circuitSteps(circuitId) {
      const steps = [];
      let circuit = circuitById.get(circuitId);
      while (circuit && circuit.circuitId !== rootId) {
        steps.unshift({ kind: 'circuit', id: circuit.circuitId });
        circuit = circuitById.get(circuit.parentCircuitId);
      }
      return steps;
    }

    function nodeSteps(nodeId) {
      const node = nodeById.get(nodeId);
      return [...circuitSteps(node.circuitId), { kind: 'node', id: node.nodeId }];
    }

    function focusEntries() {
      const result = [{ kind: 'circuit', id: rootId, steps: [] }];
      for (const circuit of projection.circuits) {
        if (circuit.circuitId !== rootId) result.push({
          kind: 'circuit', id: circuit.circuitId, steps: circuitSteps(circuit.circuitId),
        });
      }
      for (const node of projection.nodes) result.push({
        kind: 'node', id: node.nodeId, steps: nodeSteps(node.nodeId),
      });
      for (const family of projection.strategyFamilies) {
        if (family.nodeIds.length === 0) continue;
        const nodeId = family.nodeIds[0];
        result.push({
          kind: 'family', id: family.familyId,
          steps: [...nodeSteps(nodeId), { kind: 'family', id: family.familyId }],
        });
      }
      for (const strategy of projection.strategies) {
        const family = projection.strategyFamilies.find((candidate) =>
          candidate.nodeIds.length > 0 && candidate.memberIdentities.includes(strategy.identity));
        const nodeId = family?.nodeIds[0] ?? strategy.nodeIds[0];
        result.push({
          kind: 'strategy', id: strategy.identity,
          steps: [
            ...nodeSteps(nodeId),
            ...(family ? [{ kind: 'family', id: family.familyId }] : []),
            { kind: 'strategy', id: strategy.identity },
          ],
        });
      }
      return result;
    }

    async function goHome() {
      const current = document.querySelector('.graph-camera__focus-info');
      if (current?.dataset.graphFocusKind === 'circuit'
        && current.dataset.graphFocusId === rootId) return;
      const button = document.querySelector('[data-graph-breadcrumb="0"]');
      if (button) {
        button.click();
        await waitForRender();
      }
    }

    async function openStep(step) {
      for (let page = 0; page < 40; page += 1) {
        const button = [...document.querySelectorAll('[data-graph-enter-kind]')].find((candidate) =>
          candidate.dataset.graphEnterKind === step.kind
          && candidate.dataset.graphEnterId === step.id);
        if (button) {
          button.click();
          await waitForRender();
          return;
        }
        const next = document.querySelector('[data-graph-page="next"]');
        if (!next || next.disabled) break;
        next.click();
        await waitForRender();
      }
      throw new Error(`Could not open ${step.kind}:${step.id}.`);
    }

    function roundedCenter(rect) {
      return rect.left + rect.width / 2;
    }

    function addIssue(focus, rule, details) {
      issues.push({ focus: `${focus.kind}:${focus.id}`, rule, details });
    }

    function auditCurrent(focus) {
      coverage[focus.kind] += 1;
      const stage = document.querySelector('[data-graph-stage]');
      const viewport = document.querySelector('[data-graph-viewport]');
      const headerInfo = document.querySelector('.graph-camera__focus-info');
      const header = document.querySelector('.graph-camera__header');
      if (!stage || !viewport || !headerInfo) {
        addIssue(focus, 'required-surface', 'Stage, viewport, or header information control is missing.');
        return;
      }
      if (document.querySelector('[data-graph-home], [data-graph-back], .graph-explorer__toolbar')) {
        addIssue(focus, 'duplicate-navigation-controls', 'Toolbar navigation remains outside the breadcrumb.');
      }
      const headerBreadcrumb = header?.querySelector('.graph-camera__breadcrumbs');
      if (!headerBreadcrumb) {
        addIssue(focus, 'header-breadcrumb', 'Focus has no breadcrumb identity row inside its header.');
      } else {
        const breadcrumbItems = headerBreadcrumb.querySelectorAll('button, [aria-current="page"]');
        if ([...breadcrumbItems].some((item) => !item.querySelector('.graph-entity-icon'))) {
          addIssue(focus, 'breadcrumb-role-icons', 'One or more breadcrumb identities lack a semantic role icon.');
        }
      }
      if (header?.querySelector('.graph-camera__identity, .graph-camera__type')) {
        addIssue(focus, 'duplicated-header-identity', 'A separate title or type caption remains beside the breadcrumb identity row.');
      }
      const context = stage.querySelector('.graph-stage-context');
      const contextTitle = context?.querySelector('strong')?.textContent.trim() ?? '';
      const contextExplanation = context?.querySelector('span')?.textContent.trim() ?? '';
      if (contextTitle.length < 12 || contextExplanation.length < 24) {
        addIssue(focus, 'semantic-view-context', `${contextTitle} / ${contextExplanation}`);
      }
      if (/ONE SELECTED|SOLID ARROWS|TYPED HANDOFFS|PARALLEL (?:IMPLEMENTATION|STRATEGY)|ONE EXACT STRATEGY|SIX PER PAGE|SOURCE NODE|SINK NODE/iu.test(contextTitle)) {
        addIssue(focus, 'legend-only-view-context', contextTitle);
      }
      if (headerInfo.dataset.graphFocusKind !== focus.kind
        || headerInfo.dataset.graphFocusId !== focus.id) {
        addIssue(focus, 'focus-identity', `Rendered ${headerInfo.dataset.graphFocusKind}:${headerInfo.dataset.graphFocusId}.`);
      }
      if (viewport.scrollWidth - viewport.clientWidth > 1
        || viewport.scrollHeight - viewport.clientHeight > 1) {
        addIssue(focus, 'graph-overflow', `${viewport.scrollWidth}x${viewport.scrollHeight} over ${viewport.clientWidth}x${viewport.clientHeight}.`);
      }
      for (const card of stage.querySelectorAll('.graph-node-card')) {
        if (!card.querySelector('.graph-node-card__info')) addIssue(focus, 'card-information', card.textContent.trim().slice(0, 80));
        if (!card.querySelector('[data-graph-drag]')) addIssue(focus, 'card-drag', card.textContent.trim().slice(0, 80));
      }
      const inputColumn = stage.querySelector('.graph-camera__ports--input');
      const outputColumn = stage.querySelector('.graph-camera__ports--output');
      if (!inputColumn || !outputColumn) {
        addIssue(focus, 'complete-component-boundary',
          `input=${Boolean(inputColumn)} output=${Boolean(outputColumn)}`);
      }
      for (const port of stage.querySelectorAll('.graph-boundary-port')) {
        if (!port.querySelector('.graph-boundary-port__info')) addIssue(focus, 'port-information', port.textContent.trim().slice(0, 80));
        const externalIcon = port.querySelector('[class*="graph-entity-icon--external-"]');
        if (externalIcon) {
          if (port.querySelector('.graph-boundary-port__arrow')) {
            addIssue(focus, 'terminal-exterior-arrow', port.textContent.trim().slice(0, 80));
          }
          if (port.querySelector('button.graph-boundary-port__open')) {
            addIssue(focus, 'terminal-exterior-navigation', port.textContent.trim().slice(0, 80));
          }
        }
      }
      const paths = [...stage.querySelectorAll('.graph-camera__edge')];
      const stageRectForPaths = stage.getBoundingClientRect();
      const graphEntities = [...stage.querySelectorAll('[data-graph-entity]')];
      for (const path of paths) {
        if (!path.getAttribute('d') || !path.getAttribute('marker-end')) {
          addIssue(focus, 'visible-directed-edge', path.outerHTML.slice(0, 160));
        }
        const pathData = path.getAttribute('d') ?? '';
        if ((pathData.match(/\bC\b/gu) ?? []).length !== 1 || /\b[LQHVAST]\b/u.test(pathData)) {
          addIssue(focus, 'continuous-curved-connector', path.getAttribute('d') ?? 'missing path');
        }
        const coordinates = (pathData.match(/-?\d+(?:\.\d+)?/gu) ?? []).map(Number);
        if (coordinates.length === 8) {
          const [startX, startY, control1X, control1Y, control2X, control2Y, endX, endY] = coordinates;
          const between = (value, left, right) => value >= Math.min(left, right) - .01
            && value <= Math.max(left, right) + .01;
          const horizontalControls = Math.abs(control1Y - startY) < .01
            && Math.abs(control2Y - endY) < .01
            && between(control1X, startX, endX) && between(control2X, startX, endX);
          const verticalControls = Math.abs(control1X - startX) < .01
            && Math.abs(control2X - endX) < .01
            && between(control1Y, startY, endY) && between(control2Y, startY, endY);
          if (!horizontalControls && !verticalControls) {
            addIssue(focus, 'monotonic-bezier-controls', pathData);
          }
        }
        if (path.dataset.graphRoute !== 'simple-bezier') {
          addIssue(focus, 'simple-bezier-route', path.dataset.graphRoute ?? 'missing route state');
        }
        const visualKind = path.dataset.graphLinkKind;
        lineKindCoverage.add(visualKind);
        if (!expectedLineColors[visualKind]) {
          addIssue(focus, 'known-line-kind', visualKind ?? 'missing data-graph-link-kind');
        } else if (getComputedStyle(path).stroke !== expectedLineColors[visualKind]) {
          addIssue(focus, 'line-kind-color',
            `${visualKind}: ${getComputedStyle(path).stroke} != ${expectedLineColors[visualKind]}`);
        }
        if (!path.getAttribute('marker-end')?.includes(`-${visualKind}`)) {
          addIssue(focus, 'matching-arrowhead-color', `${visualKind}: ${path.getAttribute('marker-end')}`);
        }
        const unrelatedEntities = graphEntities.filter((entity) =>
          entity.dataset.graphEntity !== path.dataset.graphLinkFrom
          && entity.dataset.graphEntity !== path.dataset.graphLinkTo);
        const length = path.getTotalLength();
        const sampleCount = Math.max(2, Math.ceil(length / 4));
        const crossed = new Set();
        for (let sample = 1; sample < sampleCount; sample += 1) {
          const point = path.getPointAtLength((length * sample) / sampleCount);
          const x = stageRectForPaths.left + point.x;
          const y = stageRectForPaths.top + point.y;
          for (const entity of unrelatedEntities) {
            const rect = entity.getBoundingClientRect();
            if (x > rect.left + 2 && x < rect.right - 2
              && y > rect.top + 2 && y < rect.bottom - 2) {
              crossed.add(entity.dataset.graphEntity);
            }
          }
        }
        if (crossed.size > 0) {
          lineBoxOverlaps.push({
            focus: `${focus.kind}:${focus.id}`,
            from: path.dataset.graphLinkFrom,
            to: path.dataset.graphLinkTo,
            crossed: [...crossed],
          });
        }
      }
      const opposedPaths = paths.filter((path) => path.dataset.graphLinkKind === 'reciprocal-flow');
      if (opposedPaths.length === 1) {
        addIssue(focus, 'opposed-aggregate-color',
          'One purple aggregate lane is missing its opposed direction.');
      }
      const cards = [...stage.querySelectorAll('.graph-node-card')];
      for (let left = 0; left < cards.length; left += 1) {
        const a = cards[left].getBoundingClientRect();
        for (let right = left + 1; right < cards.length; right += 1) {
          const b = cards[right].getBoundingClientRect();
          if (a.left < b.right - 1 && a.right > b.left + 1
            && a.top < b.bottom - 1 && a.bottom > b.top + 1) {
            addIssue(focus, 'card-overlap', `${cards[left].textContent.trim().slice(0, 35)} / ${cards[right].textContent.trim().slice(0, 35)}`);
          }
        }
      }
      const modules = [...stage.querySelectorAll('.graph-camera__module')];
      if (modules.length > 1) {
        for (let index = 1; index < modules.length; index += 1) {
          const previous = modules[index - 1].getBoundingClientRect();
          const current = modules[index].getBoundingClientRect();
          if (current.top < previous.bottom - 1) addIssue(focus, 'vertical-independent-modules', `Rows ${index} and ${index + 1} overlap.`);
        }
        for (const module of modules) {
          if (!module.querySelector('.graph-camera__ports--input')
            || !module.querySelector('.graph-camera__ports--output')) {
            addIssue(focus, 'complete-independent-module-boundary',
              module.textContent.trim().slice(0, 80));
          }
          const columns = [
            module.querySelector('.graph-camera__ports--input'),
            module.querySelector('.graph-node-card'),
            module.querySelector('.graph-camera__ports--output'),
          ].filter(Boolean).map((item) => item.getBoundingClientRect());
          if (columns.length === 3) {
            const gaps = [roundedCenter(columns[1]) - roundedCenter(columns[0]),
              roundedCenter(columns[2]) - roundedCenter(columns[1])];
            if (Math.abs(gaps[0] - gaps[1]) > 2) addIssue(focus, 'module-horizontal-balance', gaps.join('/'));
          }
        }
      }
      if (modules.length === 0 && !stage.classList.contains('graph-camera__stage--parallel')) {
        const internalCards = [...stage.querySelectorAll('.graph-camera__grid .graph-node-card')];
        const columns = [
          stage.querySelector('.graph-camera__circuit-layout > .graph-camera__ports--input'),
          ...internalCards,
          stage.querySelector('.graph-camera__circuit-layout > .graph-camera__ports--output'),
        ].filter(Boolean).map((item) => item.getBoundingClientRect());
        const horizontalGeometry = innerWidth > 760 || internalCards.length <= 1;
        if (horizontalGeometry && columns.length > 2) {
          const intervals = columns.slice(1).map((item, index) =>
            roundedCenter(item) - roundedCenter(columns[index]));
          if (Math.max(...intervals) - Math.min(...intervals) > 2) {
            addIssue(focus, 'equal-column-centers', intervals.map(Math.round).join('/'));
          }
          const gaps = columns.slice(1).map((item, index) =>
            item.left - columns[index].right);
          if (Math.max(...gaps) - Math.min(...gaps) > 2) {
            addIssue(focus, 'equal-visible-gaps', gaps.map(Math.round).join('/'));
          }
          const minimumVisibleGap = innerWidth <= 480 ? 6 : 16;
          if (Math.min(...gaps) < minimumVisibleGap) {
            addIssue(focus, 'minimum-visible-gap',
              `${Math.round(Math.min(...gaps))}px < ${minimumVisibleGap}px`);
          }
        }
        const crowded = internalCards.length >= 3
          || stage.querySelectorAll('.graph-boundary-port').length >= 4
          || paths.length >= 4;
        if (innerWidth > 760 && internalCards.length >= 2 && crowded) {
          if (stage.dataset.graphAutomaticVerticalDistribution !== 'safe-lane-cycle') {
            addIssue(focus, 'automatic-vertical-distribution',
              stage.dataset.graphAutomaticVerticalDistribution ?? 'missing mode');
          }
          const stageRect = stage.getBoundingClientRect();
          const contextRect = stage.querySelector('.graph-stage-context')?.getBoundingClientRect();
          const expectedBands = internalCards.length === 3
            ? ['top', 'bottom', 'top'] : ['top', 'bottom', 'middle'];
          automaticDistributionViews.push({
            focus: `${focus.kind}:${focus.id}`,
            cardCount: internalCards.length,
            bands: internalCards.map((card) => card.dataset.graphAutoBand),
          });
          for (const [index, card] of internalCards.entries()) {
            const offset = Number(card.dataset.graphAutoOffset);
            const band = expectedBands[index % expectedBands.length];
            if (!Number.isFinite(offset) || card.dataset.graphAutoBand !== band) {
              addIssue(focus, 'automatic-vertical-lane',
                `${index}: ${card.dataset.graphAutoBand ?? 'missing'} @ ${card.dataset.graphAutoOffset ?? 'missing'}`);
              continue;
            }
            const cardRect = card.getBoundingClientRect();
            const baseTop = cardRect.top - offset;
            const minimumTop = Math.max(stageRect.top + 8,
              (contextRect?.bottom ?? stageRect.top) + 6);
            const minimumOffset = minimumTop - baseTop;
            const maximumOffset = Math.max(minimumOffset,
              stageRect.bottom - 8 - cardRect.height - baseTop);
            const expectedOffset = Math.round(band === 'top' ? minimumOffset
              : band === 'bottom' ? maximumOffset
                : (minimumOffset + maximumOffset) / 2);
            if (Math.abs(offset - expectedOffset) > 1) {
              addIssue(focus, 'automatic-vertical-lane-limit',
                `${index}: ${band} ${offset}px != ${expectedOffset}px`);
            }
            if (!/^translateY\(-?\d+(?:\.\d+)?px\)$/u.test(card.style.transform)) {
              addIssue(focus, 'vertical-only-transform', card.style.transform || 'missing transform');
            }
          }
        }
      }
    }

    const focuses = focusEntries();
    const unreachableCatalogFamilies = projection.strategyFamilies
      .filter((family) => family.nodeIds.length === 0)
      .map((family) => family.familyId);
    for (const focus of focuses) {
      await goHome();
      try {
        for (const step of focus.steps) await openStep(step);
        auditCurrent(focus);
      } catch (error) {
        addIssue(focus, 'reachability', error.message);
      }
    }
    document.querySelector('[data-graph-guide-info]')?.click();
    await waitForRender();
    const guideDialog = document.querySelector('.graph-info-panel:not([hidden]) .graph-guide-dialog');
    if (!guideDialog) issues.push({
      focus: 'guide', rule: 'graph-guide-dialog', details: 'The header guide control did not open its dialog.',
    });
    const informationDialog = document.querySelector('.graph-info-panel:not([hidden])');
    if (informationDialog) {
      const rect = informationDialog.getBoundingClientRect();
      if (rect.width < innerWidth * 0.82 || rect.height < innerHeight * 0.82) issues.push({
        focus: 'guide', rule: 'large-information-dialog',
        details: `${Math.round(rect.width)}x${Math.round(rect.height)} within ${innerWidth}x${innerHeight}`,
      });
    }
    if (document.querySelector('.graph-explorer > .graph-explorer__legend, .graph-explorer + .diagram-explanation, .graph-explorer ~ .graph-concept-guide')) {
      issues.push({
        focus: 'guide', rule: 'permanently-expanded-graph-guide',
        details: 'Navigation, legend, or symbol guidance remains expanded outside the dialog.',
      });
    }
    for (const leaf of document.querySelectorAll('.graph-info-panel .graph-leaf')) {
      if (getComputedStyle(leaf).overflowY !== 'visible') issues.push({
        focus: 'guide', rule: 'nested-information-scroll', details: getComputedStyle(leaf).overflowY,
      });
    }
    const lineLegend = [...document.querySelectorAll('.graph-info-panel .graph-concept-guide .graph-link-key')].map((item) => {
      const reciprocal = item.classList.contains('graph-link-key--reciprocal');
      return {
        label: item.textContent.trim(),
        color: reciprocal ? getComputedStyle(item, '::after').color
          : getComputedStyle(item, '::before').borderTopColor,
        bottom: getComputedStyle(item, '::before').bottom,
        paddingBottom: getComputedStyle(item).paddingBottom,
      };
    });
    const expectedLegendColors = new Map([
      ['Typed flow · catalog packet', expectedLineColors.flow],
      ['Circuit boundary · exterior handoff', expectedLineColors['boundary-flow']],
      ['Implementation envelope · strategy candidate', expectedLineColors['implementation-flow']],
      ['Opposed aggregate paths · no exact cycle', expectedLineColors['reciprocal-flow']],
    ]);
    for (const [label, color] of expectedLegendColors) {
      const item = lineLegend.find((candidate) => candidate.label === label);
      if (!item || item.color !== color) issues.push({
        focus: 'legend', rule: 'distinct-line-color', details: `${label}: ${item?.color ?? 'missing'} != ${color}`,
      });
    }
    if (new Set(lineLegend.map((item) => item.color)).size !== expectedLegendColors.size) {
      issues.push({ focus: 'legend', rule: 'distinct-line-color-count', details: lineLegend });
    }
    const externalLegend = [...document.querySelectorAll('.graph-info-panel .graph-explorer__legend [class*="graph-entity-icon--external-"]')]
      .map((item) => item.parentElement.textContent.trim());
    if (externalLegend.length !== 3) issues.push({
      focus: 'legend', rule: 'external-interaction-kinds', details: externalLegend,
    });
    return {
      format: 'eslm-processing-graph-browser-view-audit-v1',
      viewport: { width: innerWidth, height: innerHeight },
      expectedViews: focuses.length,
      modeledViews: projection.circuits.length + projection.nodes.length
        + projection.strategyFamilies.length + projection.strategies.length,
      unreachableCatalogFamilies,
      coverage,
      auditedViews: Object.values(coverage).reduce((sum, value) => sum + value, 0),
      automaticDistributionViews,
      lineBoxOverlapCount: lineBoxOverlaps.length,
      lineBoxOverlapExamples: lineBoxOverlaps.slice(0, 20),
      lineKindCoverage: [...lineKindCoverage].sort(),
      lineLegend,
      externalLegend,
      issues,
      passed: issues.length === 0,
    };
  })();
}

const options = parseArguments(process.argv.slice(2));
const pages = await (await fetch(`${options.cdp}/json/list`)).json();
const target = pages.find((page) => page.type === 'page');
if (!target) throw new Error(`No page target is available at ${options.cdp}.`);
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});
let sequence = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const callback = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) callback.reject(new Error(message.error.message));
  else callback.resolve(message.result);
});
function command(method, params = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
await command('Page.enable');
await command('Runtime.enable');
await command('Network.enable');
await command('Network.setCacheDisabled', { cacheDisabled: true });
await command('Emulation.setDeviceMetricsOverride', {
  width: options.width, height: options.width <= 480 ? 844 : 1000, deviceScaleFactor: 1, mobile: false,
});
await command('Page.navigate', { url: options.url });
await command('Runtime.evaluate', {
  expression: `new Promise((resolve, reject) => {
    const started = performance.now();
    const inspect = () => {
      if (document.querySelector('[data-graph-stage]')
        && document.querySelector('.graph-camera__focus-info')) return resolve(true);
      if (performance.now() - started > 5000) return reject(new Error('Processing graph did not initialize within 5 seconds.'));
      requestAnimationFrame(inspect);
    };
    inspect();
  })`,
  awaitPromise: true,
  returnByValue: true,
});
const evaluation = await command('Runtime.evaluate', {
  expression: `(${browserAudit.toString()})()`,
  awaitPromise: true,
  returnByValue: true,
});
socket.close();
if (evaluation.exceptionDetails) throw new Error(evaluation.exceptionDetails.text);
const report = evaluation.result.value;
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.passed) process.exitCode = 1;
