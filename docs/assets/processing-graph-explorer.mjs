import { HOMEPAGE_PROCESSING_GRAPH_PROJECTION } from './processing-graph-explorer-data.mjs';

const projection = HOMEPAGE_PROCESSING_GRAPH_PROJECTION;
const circuitById = new Map(projection.circuits.map((circuit) => [circuit.circuitId, circuit]));
const nodeById = new Map(projection.nodes.map((node) => [node.nodeId, node]));
const edgeById = new Map(projection.edges.map((edge) => [edge.edgeId, edge]));
const strategyByIdentity = new Map(
  projection.strategies.map((strategy) => [strategy.identity, strategy]),
);

function element(name, { className, text, title } = {}) {
  const result = document.createElement(name);
  if (className) result.className = className;
  if (text !== undefined) result.textContent = text;
  if (title) result.title = title;
  return result;
}

function code(value, className = '') {
  return element('code', { className, text: value });
}

function appendLabelledValues(parent, label, values, className) {
  if (values.length === 0) return;
  const row = element('div', { className: `graph-node__row ${className}` });
  row.append(element('strong', { text: label }));
  const list = element('span', { className: 'graph-node__values' });
  values.forEach((value, index) => {
    if (index > 0) list.append(document.createTextNode(' · '));
    list.append(code(value));
  });
  row.append(list);
  parent.append(row);
}

function strategyTitle(strategy) {
  return [
    `stage ${strategy.stage}`,
    strategy.confidenceKind,
    strategy.correlationGroup,
    strategy.costModel,
    `budgets ${strategy.budgetKeys.join(', ')}`,
    `state ${strategy.implementationState}`,
  ].join(' · ');
}

function renderStrategy(identity) {
  const strategy = strategyByIdentity.get(identity);
  const item = element('li', { className: 'graph-strategy' });
  item.append(code(identity, 'graph-strategy__identity'));
  item.title = strategyTitle(strategy);
  const semantics = element('span', { className: 'graph-strategy__semantics' });
  semantics.append(
    code(strategy.confidenceKind),
    document.createTextNode(' / '),
    code(strategy.correlationGroup),
  );
  const work = element('span', { className: 'graph-strategy__work' });
  work.append(document.createTextNode('budgets '));
  strategy.budgetKeys.forEach((budgetKey, index) => {
    if (index > 0) work.append(document.createTextNode(' · '));
    work.append(code(budgetKey));
  });
  work.append(document.createTextNode(' / '), code(strategy.costModel));
  item.append(semantics, work);
  return item;
}

function renderEdge(edgeId) {
  const edge = edgeById.get(edgeId);
  const item = element('li');
  item.append(
    code(edge.edgeId),
    document.createTextNode(` · ${edge.kind} · `),
    code(edge.packetType),
    document.createTextNode(` → ${nodeById.get(edge.to).label} when ${edge.condition}`),
  );
  return item;
}

function renderNode(nodeId) {
  const node = nodeById.get(nodeId);
  const article = element('article', {
    className: `graph-node graph-node--${node.kind} graph-node--${node.implementationState}`,
  });
  article.dataset.nodeId = node.nodeId;

  const heading = element('header', { className: 'graph-node__heading' });
  const title = element('div');
  title.append(element('strong', { text: node.label }), code(node.nodeId));
  const badges = element('span', { className: 'graph-node__badges' });
  badges.append(
    element('span', { className: `graph-badge graph-badge--${node.kind}`, text: node.kind }),
    element('span', {
      className: `graph-badge graph-badge--${node.implementationState}`,
      text: node.implementationState,
    }),
  );
  heading.append(title, badges);
  article.append(heading, element('p', { className: 'graph-node__role', text: node.role }));

  appendLabelledValues(article, 'Stage', node.stageRef === null ? [] : [node.stageRef],
    'graph-node__stage');
  appendLabelledValues(article, 'Owner', [node.ownerModule], 'graph-node__owner');
  appendLabelledValues(article, 'Consumes', node.inputPacketTypes, 'graph-node__packets');
  appendLabelledValues(article, 'Emits', node.outputPacketTypes, 'graph-node__packets');
  appendLabelledValues(article, 'Resources', node.resourceDimensions, 'graph-node__resources');
  const authority = [
    node.authority !== 'none' ? `authority:${node.authority}` : null,
    node.answerAuthority !== 'none' ? `answer-authority:${node.answerAuthority}` : null,
    node.canVote ? 'coordination-votes:true' : null,
  ].filter(Boolean);
  appendLabelledValues(article, 'Boundary', authority, 'graph-node__authority');

  if (node.strategyIdentities.length > 0) {
    const strategyBlock = element('section', { className: 'graph-node__strategies' });
    strategyBlock.append(element('h5', { text: 'Exact strategies' }));
    const list = element('ul');
    for (const identity of node.strategyIdentities) list.append(renderStrategy(identity));
    strategyBlock.append(list);
    article.append(strategyBlock);
  }

  if (node.outgoingEdgeIds.length > 0) {
    const details = element('details', { className: 'graph-node__edges' });
    details.append(element('summary', { text: 'Typed exits and exceptional paths' }));
    const list = element('ul');
    for (const edgeId of node.outgoingEdgeIds) list.append(renderEdge(edgeId));
    details.append(list);
    article.append(details);
  }
  return article;
}

function renderCircuit(circuitId, depth = 0) {
  const circuit = circuitById.get(circuitId);
  const section = element('section', {
    className: `graph-circuit graph-circuit--depth-${Math.min(depth, 3)}`,
  });
  section.dataset.circuitId = circuit.circuitId;
  const heading = element('header', { className: 'graph-circuit__heading' });
  const title = element(depth === 0 ? 'h3' : 'h4', { text: circuit.label });
  heading.append(title, code(circuit.circuitId), element('p', { text: circuit.role }));
  section.append(heading);

  if (circuit.nodeIds.length > 0) {
    const nodes = element('div', { className: 'graph-circuit__nodes' });
    for (const nodeId of circuit.nodeIds) nodes.append(renderNode(nodeId));
    section.append(nodes);
  }
  if (circuit.childCircuitIds.length > 0) {
    const children = element('div', { className: 'graph-circuit__children' });
    for (const childId of circuit.childCircuitIds) children.append(renderCircuit(childId, depth + 1));
    section.append(children);
  }
  return section;
}

function renderExplorer(host) {
  const root = circuitById.get(projection.rootCircuitId);
  const canvas = element('div', { className: 'graph-explorer__canvas' });
  canvas.dataset.graphCanvas = '';
  const rootHeading = element('header', { className: 'graph-explorer__root' });
  rootHeading.append(element('h3', { text: root.label }), code(root.circuitId), element('p', { text: root.role }));
  const planes = element('div', { className: 'graph-explorer__planes' });
  for (const circuitId of root.childCircuitIds) planes.append(renderCircuit(circuitId, 1));
  canvas.append(rootHeading, planes);
  host.replaceChildren(canvas);
}

function installZoomControls(explorer) {
  const viewport = explorer.querySelector('[data-graph-viewport]');
  const canvas = explorer.querySelector('[data-graph-canvas]');
  const output = explorer.querySelector('[data-graph-zoom-output]');
  const narrow = window.matchMedia('(max-width: 700px)').matches;
  let zoom = narrow ? 0.62 : 0.78;
  const apply = () => {
    canvas.style.setProperty('--graph-zoom', String(zoom));
    output.value = `${Math.round(zoom * 100)}%`;
    output.textContent = output.value;
  };
  for (const button of explorer.querySelectorAll('[data-graph-zoom]')) {
    button.addEventListener('click', () => {
      const operation = button.dataset.graphZoom;
      zoom = operation === 'reset' ? (narrow ? 0.62 : 0.78)
        : Math.max(0.5, Math.min(1.15, zoom + (operation === 'in' ? 0.08 : -0.08)));
      apply();
    });
  }
  for (const button of explorer.querySelectorAll('[data-graph-focus]')) {
    button.addEventListener('click', () => {
      const target = canvas.querySelector(`[data-circuit-id="${button.dataset.graphFocus}"]`);
      if (!target) return;
      viewport.scrollTo({ left: Math.max(0, target.offsetLeft * zoom - 24), top: 0, behavior: 'smooth' });
    });
  }
  viewport.addEventListener('keydown', (event) => {
    if (!event.altKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    viewport.scrollBy({ left: event.key === 'ArrowLeft' ? -320 : 320, behavior: 'smooth' });
  });
  apply();
}

for (const explorer of document.querySelectorAll('[data-processing-graph-explorer]')) {
  const host = explorer.querySelector('[data-graph-host]');
  renderExplorer(host);
  installZoomControls(explorer);
}

for (const detail of document.querySelectorAll('[data-processing-node-detail]')) {
  const nodeId = detail.dataset.processingNodeDetail;
  if (!nodeById.has(nodeId)) throw new TypeError(`Unknown homepage node detail ${nodeId}.`);
  detail.replaceChildren(renderNode(nodeId));
}
