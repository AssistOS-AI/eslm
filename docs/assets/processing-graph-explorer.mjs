import { HOMEPAGE_PROCESSING_GRAPH_PROJECTION } from './processing-graph-explorer-data.mjs';
import { buildProcessingGraphExplorerView } from './processing-graph-explorer-model.mjs';
import {
  explainBoundaryPort,
  explainProcessingGraphView,
  plainTypeLabel,
} from './processing-graph-explorer-explanations.mjs';

const projection = HOMEPAGE_PROCESSING_GRAPH_PROJECTION;
const nodeById = new Map(projection.nodes.map((node) => [node.nodeId, node]));
const PAGE_SIZE = 6;
let explorerSequence = 0;

const ICONS = Object.freeze({
  external: '□',
  'external-actor': '♙',
  'external-system': '▤',
  'external-actor-system': '♙▤',
  plane: '▣',
  'circuit-group': '▦',
  circuit: '⬡',
  source: '↧',
  process: '⚙',
  coordinator: '⇄',
  'authority-gate': '◆',
  sink: '◎',
  'strategy-family': '✦',
  strategy: '◇',
});

const KIND_LABELS = Object.freeze({
  source: 'source',
  process: 'process',
  coordinator: 'coordinator',
  'authority-gate': 'authority gate',
  sink: 'sink',
});

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

function sentenceCase(value) {
  return value.replaceAll('-', ' ').replace(/^./u, (initial) => initial.toUpperCase());
}

function countText(value, singular, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function icon(kind, { label = null } = {}) {
  const glyph = element('span', {
    className: `graph-entity-icon graph-entity-icon--${kind}`,
    text: ICONS[kind] ?? '•',
    title: label ?? sentenceCase(kind),
  });
  glyph.setAttribute('aria-hidden', 'true');
  return glyph;
}

function hierarchyCounts(inventory) {
  const counts = element('span', {
    className: 'graph-node-card__inventory',
    title: 'C = immediate subcomponents; N = processing nodes in scope; S = strategies in scope',
  });
  counts.setAttribute('aria-label', `${inventory.subcomponentCount} immediate subcomponents, `
    + `${inventory.processingNodeCount} processing nodes, ${inventory.strategyCount} strategies`);
  counts.append(
    element('span', { text: `C ${inventory.subcomponentCount}` }),
    document.createTextNode(' / '),
    element('span', { text: `N ${inventory.processingNodeCount}` }),
    document.createTextNode(' / '),
    element('span', { text: `S ${inventory.strategyCount}` }),
  );
  return counts;
}

function headerHierarchyCounts(view) {
  const counts = element('span', {
    className: 'graph-header-counts',
    title: 'Immediate circuits; processing nodes and strategies in the selected scope',
  });
  const values = [
    ['circuits', view.items.filter((item) => item.entityKind === 'circuit').length],
    ['nodes', view.inventory.processingNodeCount],
    ['strategies', view.inventory.strategyCount],
  ];
  counts.setAttribute('aria-label', values.map(([label, value]) => `${value} ${label}`).join(', '));
  for (const [label, value] of values) {
    const chip = element('span', { className: `graph-header-count graph-header-count--${label}` });
    chip.append(element('strong', { text: String(value) }), document.createTextNode(` ${label}`));
    counts.append(chip);
  }
  return counts;
}

function kindCounts(inventory) {
  const counts = element('span', { className: 'graph-node-card__kinds' });
  for (const kind of Object.keys(KIND_LABELS)) {
    const count = inventory.kindCounts[kind];
    const item = element('span', {
      className: `graph-kind-count graph-kind-count--${kind}`,
      title: `${count} ${KIND_LABELS[kind]} processing ${count === 1 ? 'node' : 'nodes'}`,
    });
    item.append(icon(kind), document.createTextNode(String(count)));
    counts.append(item);
  }
  return counts;
}

function visualKind(item) {
  return item.entityKind === 'node' ? item.nodeKind : item.semanticTier;
}

function stateIndicator(state) {
  if (!state) return null;
  const indicator = element('span', {
    className: `graph-implementation-state graph-implementation-state--${state}`,
    title: `Implementation state: ${sentenceCase(state)}`,
  });
  indicator.setAttribute('aria-label', `Implementation state: ${sentenceCase(state)}`);
  return indicator;
}

function verticalDragHandle(label) {
  const handle = element('button', {
    className: 'graph-node-card__drag',
    text: '↕',
    title: `Drag ${label} vertically`,
  });
  handle.type = 'button';
  handle.setAttribute('aria-label', `Drag ${label} vertically`);
  handle.dataset.graphDrag = '';
  return handle;
}

function focusForItem(item, parentFocus) {
  if (item.entityKind === 'circuit' || item.entityKind === 'node') {
    return { kind: item.entityKind, id: item.id };
  }
  if (item.entityKind === 'family') {
    return {
      kind: 'family',
      id: item.id,
      ...(parentFocus.kind === 'node' ? { parentNodeId: parentFocus.id } : {}),
    };
  }
  return {
    kind: 'strategy',
    id: item.id,
    ...(parentFocus.kind === 'node' ? { parentNodeId: parentFocus.id } : {}),
    ...(parentFocus.kind === 'family' ? {
      parentFamilyId: parentFocus.id,
      ...(parentFocus.parentNodeId ? { parentNodeId: parentFocus.parentNodeId } : {}),
    } : {}),
  };
}

function itemCard(item, parentFocus) {
  const kind = visualKind(item);
  const card = element('article', {
    className: `graph-node-card graph-node-card--${item.semanticTier} graph-node-card--kind-${kind}`
      + `${item.implementationState ? ` graph-node-card--state-${item.implementationState}` : ''}`,
  });
  card.dataset.graphEntity = item.entityKey;

  const open = element('button', {
    className: 'graph-node-card__open',
    title: `Enter ${item.label}`,
  });
  open.type = 'button';
  open.dataset.graphEnterKind = item.entityKind;
  open.dataset.graphEnterId = item.id;
  const targetFocus = focusForItem(item, parentFocus);
  if (targetFocus.parentNodeId) open.dataset.graphParentNode = targetFocus.parentNodeId;
  if (targetFocus.parentFamilyId) open.dataset.graphParentFamily = targetFocus.parentFamilyId;

  const heading = element('span', { className: 'graph-node-card__heading' });
  heading.append(icon(kind, {
    label: item.entityKind === 'node' ? KIND_LABELS[item.nodeKind] : item.semanticTier,
  }), element('strong', { text: item.label }));
  const state = stateIndicator(item.implementationState);
  if (state) heading.append(state);
  heading.append(element('span', { className: 'graph-node-card__arrow', text: '›' }));
  open.append(heading, hierarchyCounts(item), kindCounts(item));

  const info = element('button', {
    className: 'graph-node-card__info',
    text: 'i',
    title: `Information about ${item.label}`,
  });
  info.type = 'button';
  info.setAttribute('aria-label', `Information about ${item.label}`);
  info.dataset.graphInfoKind = targetFocus.kind;
  info.dataset.graphInfoId = targetFocus.id;
  if (targetFocus.parentNodeId) info.dataset.graphParentNode = targetFocus.parentNodeId;
  if (targetFocus.parentFamilyId) info.dataset.graphParentFamily = targetFocus.parentFamilyId;

  card.append(open, info, verticalDragHandle(item.label));
  return card;
}

function breadcrumbVisualKind(breadcrumb, index) {
  if (breadcrumb.focus.kind === 'node') return nodeById.get(breadcrumb.focus.id)?.kind ?? 'process';
  if (breadcrumb.focus.kind === 'family') return 'strategy-family';
  if (breadcrumb.focus.kind === 'strategy') return 'strategy';
  return index === 1 ? 'plane' : index === 2 ? 'circuit-group' : 'circuit';
}

function renderBreadcrumbs(view) {
  const navigation = element('nav', { className: 'graph-camera__breadcrumbs' });
  navigation.setAttribute('aria-label', 'Processing graph location');
  view.breadcrumbs.forEach((breadcrumb, index) => {
    const kind = breadcrumbVisualKind(breadcrumb, index);
    if (index > 0) navigation.append(element('span', { className: 'graph-camera__separator', text: '›' }));
    if (index === view.breadcrumbs.length - 1) {
      const current = element('span', { className: 'graph-camera__breadcrumb-current' });
      current.setAttribute('aria-current', 'page');
      current.append(icon(kind), element('strong', { text: breadcrumb.label }));
      navigation.append(current);
      return;
    }
    const button = element('button', { title: `Open ${breadcrumb.label}` });
    button.type = 'button';
    button.dataset.graphBreadcrumb = String(index);
    button.append(icon(kind), element('span', { text: breadcrumb.label }));
    navigation.append(button);
  });
  return navigation;
}

function focusVisualKind(view) {
  if (view.focus.kind === 'node') return view.detail.kind;
  if (view.focus.kind === 'family') return 'strategy-family';
  if (view.focus.kind === 'strategy') return 'strategy';
  const depth = view.breadcrumbs.length - 1;
  return depth === 1 ? 'plane' : depth === 2 ? 'circuit-group' : 'circuit';
}

function focusHeader(view) {
  const kind = focusVisualKind(view);
  const header = element('header', {
    className: `graph-camera__header graph-camera__header--${kind}`,
  });
  const inventory = element('div', { className: 'graph-camera__inventory' });
  inventory.append(headerHierarchyCounts(view), kindCounts(view.inventory));
  const info = element('button', {
    className: 'graph-camera__focus-info',
    text: 'i',
    title: `Information about ${view.label}`,
  });
  info.type = 'button';
  info.setAttribute('aria-label', `Information about ${view.label}`);
  info.dataset.graphFocusInfo = '';
  info.dataset.graphFocusKind = view.focus.kind;
  info.dataset.graphFocusId = view.focus.id;
  const guide = element('button', {
    className: 'graph-camera__guide-info',
    text: '?',
    title: 'Open graph navigation, legend, and symbol guide',
  });
  guide.type = 'button';
  guide.setAttribute('aria-label', 'Open graph navigation, legend, and symbol guide');
  guide.dataset.graphGuideInfo = '';
  const actions = element('div', { className: 'graph-camera__header-actions' });
  actions.append(info, guide);
  const content = element('div', { className: 'graph-camera__header-content' });
  const breadcrumbs = renderBreadcrumbs(view);
  content.append(breadcrumbs, inventory, actions);
  header.append(content);
  return header;
}

function appendDetailRow(parent, label, values, { exact = true } = {}) {
  if (!Array.isArray(values) || values.length === 0) return;
  const row = element('div', { className: 'graph-leaf__row' });
  row.append(element('dt', { text: label }));
  const value = element('dd');
  values.forEach((item, index) => {
    if (index > 0) value.append(document.createTextNode(' · '));
    value.append(exact ? code(item) : document.createTextNode(item));
  });
  row.append(value);
  parent.append(row);
}

function appendInventoryRows(list, inventory) {
  appendDetailRow(list, 'Hierarchy inventory', [
    countText(inventory.subcomponentCount, 'immediate subcomponent'),
    countText(inventory.processingNodeCount, 'processing node'),
    countText(inventory.strategyCount, 'strategy', 'strategies'),
  ], { exact: false });
  appendDetailRow(list, 'Processing roles', Object.entries(inventory.kindCounts)
    .map(([kind, count]) => `${count} ${KIND_LABELS[kind]}`), { exact: false });
}

function connectionLabel(edge, direction) {
  const neighbourId = direction === 'incoming' ? edge.from : edge.to;
  const neighbour = nodeById.get(neighbourId);
  return `${direction === 'incoming' ? 'From' : 'To'} ${neighbour.label}: ${sentenceCase(edge.kind)} when `
    + `${edge.condition.replaceAll('-', ' ')}`;
}

function detailShell(title, summary, explanation = null) {
  const section = element('section', { className: 'graph-leaf' });
  section.append(element('h3', { text: title }));
  if (summary) section.append(element('p', { className: 'graph-leaf__summary', text: summary }));
  if (explanation) section.append(element('p', { className: 'graph-leaf__plain', text: explanation }));
  return section;
}

function circuitDetail(view) {
  const detail = view.detail;
  const copy = explainProcessingGraphView(view, projection);
  const section = detailShell(detail.label, copy.summary, copy.explanation);
  const list = element('dl');
  appendDetailRow(list, 'Exact circuit identity', [detail.circuitId]);
  appendDetailRow(list, 'Parent circuit', detail.parentCircuitId === null ? ['Root boundary']
    : [detail.parentCircuitId], { exact: detail.parentCircuitId !== null });
  appendInventoryRows(list, view.inventory);
  appendDetailRow(list, 'Immediate child circuits', detail.childCircuitIds);
  appendDetailRow(list, 'Direct processing nodes', detail.nodeIds);
  section.append(list);
  return section;
}

function nodeLeaf(view) {
  const detail = view.detail;
  const copy = explainProcessingGraphView(view, projection);
  const section = detailShell(`${detail.label} · processing-node contract`, copy.summary, copy.explanation);
  const list = element('dl');
  appendDetailRow(list, 'Exact identity', [detail.nodeId]);
  appendDetailRow(list, 'Responsibility type', [sentenceCase(detail.kind)], { exact: false });
  appendDetailRow(list, 'Implementation state', [sentenceCase(detail.implementationState)], { exact: false });
  appendDetailRow(list, 'Stage', detail.stageRef === null ? ['Host-owned boundary'] : [detail.stageRef], {
    exact: detail.stageRef !== null,
  });
  appendInventoryRows(list, view.inventory);
  appendDetailRow(list, 'Consumes', detail.inputPacketTypes);
  appendDetailRow(list, 'Emits', detail.outputPacketTypes);
  appendDetailRow(list, 'Finite resources', detail.resourceDimensions);
  appendDetailRow(list, 'Implementation owner', [detail.ownerModule]);
  const authority = [
    detail.authority === 'none' ? 'No authority decision' : `Authority: ${detail.authority}`,
    detail.answerAuthority === 'none' ? 'No answer authority' : `Answer authority: ${detail.answerAuthority}`,
    detail.canVote ? 'May compare typed candidates' : 'Does not vote',
  ];
  appendDetailRow(list, 'Authority boundary', authority, { exact: false });
  section.append(list);

  const connections = [...view.incomingEdges.map((edge) => connectionLabel(edge, 'incoming')),
    ...view.outgoingEdges.map((edge) => connectionLabel(edge, 'outgoing'))];
  if (connections.length > 0) {
    const connectionDetails = element('details', { className: 'graph-leaf__connections' });
    connectionDetails.append(element('summary', { text: countText(connections.length, 'typed connection') }));
    const connectionList = element('ul');
    for (const connection of connections) connectionList.append(element('li', { text: connection }));
    connectionDetails.append(connectionList);
    section.append(connectionDetails);
  }
  return section;
}

function familyLeaf(view) {
  const family = view.detail;
  const copy = explainProcessingGraphView(view, projection);
  const section = detailShell(`${family.label} · strategy family`, copy.summary, copy.explanation);
  const list = element('dl');
  appendDetailRow(list, 'Exact family identity', [family.familyId]);
  appendInventoryRows(list, view.inventory);
  appendDetailRow(list, 'Mapped processing nodes', family.nodeIds);
  appendDetailRow(list, 'Member strategies', family.memberIdentities);
  section.append(list);
  return section;
}

function strategyLeaf(view) {
  const strategy = view.detail;
  const copy = explainProcessingGraphView(view, projection);
  const section = detailShell(`${view.label} · strategy contract`, copy.summary, copy.explanation);
  const list = element('dl');
  appendDetailRow(list, 'Exact identity', [strategy.identity]);
  appendDetailRow(list, 'Stage', [strategy.stage]);
  appendDetailRow(list, 'Epistemic role', [strategy.epistemicRole]);
  appendDetailRow(list, 'Confidence meaning', [strategy.confidenceKind]);
  appendDetailRow(list, 'Correlation group', [strategy.correlationGroup]);
  appendDetailRow(list, 'Cost model', [strategy.costModel]);
  appendDetailRow(list, 'Finite budgets', strategy.budgetKeys);
  appendDetailRow(list, 'Input types', strategy.inputTypes);
  appendDetailRow(list, 'Output types', strategy.outputTypes);
  appendDetailRow(list, 'Eligibility preconditions', strategy.preconditions);
  appendDetailRow(list, 'Declared failures', strategy.failureClasses);
  appendDetailRow(list, 'Witness', [strategy.witnessKind]);
  appendDetailRow(list, 'Answer authority', [strategy.answerAuthority]);
  appendDetailRow(list, 'Implementation state', [sentenceCase(strategy.implementationState)], { exact: false });
  section.append(list);

  const reuse = element('div', { className: 'graph-leaf__reuse' });
  reuse.append(element('h4', {
    text: countText(view.reusedByNodes.length, 'processing node reuses this strategy',
      'processing nodes reuse this strategy'),
  }));
  const reuseList = element('ul');
  for (const node of view.reusedByNodes) {
    const item = element('li');
    const button = element('button', { text: node.label, title: `Open ${node.label}` });
    button.type = 'button';
    button.dataset.graphOpenNode = node.nodeId;
    item.append(button, document.createTextNode(` — ${node.role}`));
    reuseList.append(item);
  }
  reuse.append(reuseList);
  section.append(reuse);
  return section;
}

function entityDetail(view) {
  if (view.focus.kind === 'circuit') return circuitDetail(view);
  if (view.focus.kind === 'node') return nodeLeaf(view);
  if (view.focus.kind === 'family') return familyLeaf(view);
  return strategyLeaf(view);
}

function connectedPortKind(port, view) {
  if (port.externalEndpoint) return port.externalEndpointKind ?? 'external-system';
  if (port.navigationNodeKinds?.length === 1) return port.navigationNodeKinds[0];
  const item = view.items.find((candidate) => candidate.entityKey === port.entityKey);
  return item ? visualKind(item) : focusVisualKind(view);
}

function boundaryPortTarget(port, view) {
  if (port.externalEndpoint || port.navigationNodeIds?.length !== 1) return null;
  return { kind: 'node', id: port.navigationNodeIds[0] };
}

function boundaryPort(port, view) {
  const connectedKind = connectedPortKind(port, view);
  const targetFocus = boundaryPortTarget(port, view);
  const card = element('article', {
    className: `graph-boundary-port graph-boundary-port--${port.direction}`,
    title: `${port.label}: ${port.packetTypes.join(', ')}`,
  });
  card.dataset.graphEntity = port.portId;
  const open = element(targetFocus === null ? 'div' : 'button', {
    className: 'graph-boundary-port__open',
    title: targetFocus === null ? null : `Open the connected ${sentenceCase(connectedKind)}`,
  });
  if (targetFocus !== null) {
    open.type = 'button';
    open.dataset.graphPortEnterKind = targetFocus.kind;
    open.dataset.graphPortEnterId = targetFocus.id;
    if (targetFocus.parentNodeId) open.dataset.graphParentNode = targetFocus.parentNodeId;
    if (targetFocus.parentFamilyId) open.dataset.graphParentFamily = targetFocus.parentFamilyId;
  }
  const direction = element('span', { className: 'graph-boundary-port__direction' });
  direction.append(icon(connectedKind, { label: `Connected to ${sentenceCase(connectedKind)}` }),
    element('strong', { text: port.direction === 'input' ? 'IN' : 'OUT' }));
  if (targetFocus !== null) direction.append(element('span', {
    className: 'graph-boundary-port__arrow', text: '›',
  }));
  open.append(direction, element('span', { className: 'graph-boundary-port__label', text: port.label }));
  const packets = element('span', { className: 'graph-boundary-port__packets' });
  for (const packetType of port.packetTypes.slice(0, 2)) {
    packets.append(element('span', { text: plainTypeLabel(packetType), title: packetType }));
  }
  if (port.packetTypes.length > 2) packets.append(element('span', {
    text: `+${port.packetTypes.length - 2}`,
    title: port.packetTypes.slice(2).join(', '),
  }));
  const info = element('button', {
    className: 'graph-boundary-port__info',
    text: 'i',
    title: `Information about this ${port.direction} boundary`,
  });
  info.type = 'button';
  info.setAttribute('aria-label', `Information about ${port.label}`);
  info.dataset.graphPortInfo = port.portId;
  open.append(packets);
  card.append(open, info);
  return card;
}

function boundaryPortDetail(port, view) {
  const copy = explainBoundaryPort(port, view);
  const section = detailShell(`${port.direction === 'input' ? 'IN' : 'OUT'} · ${port.label}`,
    copy.summary,
    copy.explanation);
  const list = element('dl');
  appendDetailRow(list, 'Direction', [port.direction === 'input' ? 'Into the visible circuit' : 'Out of the visible circuit'], {
    exact: false,
  });
  appendDetailRow(list, 'Connected component', [copy.connectedLabel], { exact: false });
  if (port.navigationNodeIds?.length === 1) {
    appendDetailRow(list, 'Navigates to catalog node', [port.navigationNodeIds[0]]);
  } else if (port.externalEndpoint) {
    appendDetailRow(list, 'Navigation', ['Terminal exterior endpoint; no catalog target'], { exact: false });
    appendDetailRow(list, 'Exterior interaction', [{
      'external-actor': 'Human actor',
      'external-system': 'Software container or application',
      'external-actor-system': 'Human operator or software client',
    }[port.externalEndpointKind] ?? 'External system'], { exact: false });
  }
  appendDetailRow(list, 'Packet types', port.packetTypes);
  appendDetailRow(list, 'Adjacent boundary', port.neighbourLabels, { exact: false });
  appendDetailRow(list, 'Catalog edges', port.edgeIds);
  section.append(list);
  return section;
}

function selfCard(view) {
  const kind = focusVisualKind(view);
  const implementationState = view.detail.implementationState ?? null;
  const card = element('article', {
    className: `graph-node-card graph-node-card--self graph-node-card--kind-${kind}`,
  });
  card.dataset.graphEntity = view.selfEntityKey;
  const heading = element('span', { className: 'graph-node-card__heading' });
  heading.append(icon(kind), element('strong', { text: view.label }));
  const state = stateIndicator(implementationState);
  if (state) heading.append(state);
  card.append(heading, hierarchyCounts(view.inventory), kindCounts(view.inventory));
  const info = element('button', {
    className: 'graph-node-card__info',
    text: 'i',
    title: `Information about ${view.label}`,
  });
  info.type = 'button';
  info.setAttribute('aria-label', `Information about ${view.label}`);
  info.dataset.graphFocusInfo = '';
  card.append(info, verticalDragHandle(view.label));
  return card;
}

function portColumn(ports, direction, view) {
  const column = element('div', {
    className: `graph-camera__ports graph-camera__ports--${direction}`,
  });
  for (const port of ports) column.append(boundaryPort(port, view));
  return column;
}

function compactTypeList(values, fallback) {
  const labels = [...new Set(values.map(plainTypeLabel))];
  return labels.length === 0 ? fallback : labels.join(', ');
}

function stageContext(view) {
  const copy = explainProcessingGraphView(view, projection);
  if (view.focus.kind === 'circuit') {
    if (view.detail.parentCircuitId === null) {
      return {
        title: 'Runtime answers requests; build publishes packages; research proposes reviewed graph changes',
        explanation: 'The three planes share a vocabulary but neither execute nor grant authority to one another.',
      };
    }
    const inputTypes = view.inputPorts.flatMap((port) => port.packetTypes);
    const outputTypes = view.outputPorts.flatMap((port) => port.packetTypes);
    return {
      title: view.role,
      explanation: `${view.items.map((item) => item.label).join(' → ')} turn `
        + `${compactTypeList(inputTypes, 'the admitted input')} into `
        + `${compactTypeList(outputTypes, 'the declared result')}.`,
    };
  }
  if (view.focus.kind === 'node') {
    const decision = {
      source: 'It bounds the representation that enters the graph and grants no answer authority.',
      process: 'It performs this transformation only and forwards its typed result.',
      coordinator: 'It funds eligible alternatives, preserves conflicts, and makes the declared owner selection.',
      'authority-gate': 'It accepts or rejects the mandatory condition; strategy confidence cannot outvote it.',
      sink: 'It releases the already validated result to its declared recipient.',
    }[view.detail.kind];
    return {
      title: view.detail.role,
      explanation: `Consumes ${compactTypeList(view.detail.inputPacketTypes, 'the concrete exterior input')}; `
        + `emits ${compactTypeList(view.detail.outputPacketTypes, 'the concrete exterior result')}. ${decision}`,
    };
  }
  if (view.focus.kind === 'family') {
    const owners = view.reusedByNodes.map((node) => node.label).join(', ') || 'its processing owner';
    return {
      title: `Reviewed alternatives for ${owners}`,
      explanation: `${view.detail.memberIdentities.length} strategies may propose typed candidates; the owner `
        + 'applies eligibility, budget, comparison, and downstream authority checks.',
    };
  }
  const outputs = compactTypeList(view.detail.outputTypes, 'a typed candidate or explicit failure');
  const owners = view.reusedByNodes.map((node) => node.label).join(', ') || 'its processing owner';
  const operationalSentence = copy.explanation.split(/(?<=\.)\s+/u)[1] ?? copy.explanation;
  return {
    title: `Proposes ${outputs} for ${owners}`,
    explanation: operationalSentence,
  };
}

function graphStage(view, items, inputPorts, outputPorts, { modularBoundaries = false } = {}) {
  const parallelAlternatives = (view.focus.kind === 'node' || view.focus.kind === 'family')
    && items.length > 1;
  const stage = element('div', {
    className: `graph-camera__stage graph-camera__stage--${view.focus.kind}`
      + `${view.focus.kind === 'circuit' && view.breadcrumbs.length === 1 ? ' graph-camera__stage--root' : ''}`
      + `${modularBoundaries ? ' graph-camera__stage--modular-boundaries' : ''}`
      + `${parallelAlternatives ? ' graph-camera__stage--parallel' : ''}`,
  });
  stage.dataset.graphStage = '';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'graph-camera__edges');
  svg.setAttribute('aria-hidden', 'true');
  svg.dataset.graphEdges = '';
  const contextCopy = stageContext(view);
  const context = element('div', { className: 'graph-stage-context' });
  context.title = `${contextCopy.title}. ${contextCopy.explanation}`;
  context.append(element('strong', { text: contextCopy.title }));
  if (contextCopy.explanation) {
    stage.classList.add('graph-camera__stage--context-detail');
    context.append(element('span', { text: contextCopy.explanation }));
  }
  stage.append(context);
  if (modularBoundaries) {
    const modules = element('div', { className: 'graph-camera__modules' });
    for (const item of items) {
      const module = element('div', { className: 'graph-camera__module' });
      module.append(
        portColumn(inputPorts.filter((port) => port.entityKey === item.entityKey), 'input', view),
        itemCard(item, view.focus),
        portColumn(outputPorts.filter((port) => port.entityKey === item.entityKey), 'output', view),
      );
      modules.append(module);
    }
    stage.append(svg, modules);
  } else {
    const centralItemCount = Math.max(items.length, 1);
    const boundaryColumnCount = Number(inputPorts.length > 0) + Number(outputPorts.length > 0);
    const layout = element('div', {
      className: 'graph-camera__circuit-layout'
        + `${inputPorts.length === 0 ? ' graph-camera__circuit-layout--no-input' : ''}`
        + `${outputPorts.length === 0 ? ' graph-camera__circuit-layout--no-output' : ''}`,
    });
    layout.style.setProperty('--graph-port-width', items.length <= 2 ? '9rem'
      : items.length <= 3 ? '8rem' : '6.4rem');
    layout.style.setProperty('--graph-track-count', String(centralItemCount + boundaryColumnCount));
    layout.style.setProperty('--graph-box-inset', items.length >= 4 ? '2rem'
      : items.length >= 3 ? '1.5rem' : '1rem');
    const grid = element('div', { className: 'graph-camera__grid' });
    if (items.length > 0) {
      for (const item of items) grid.append(itemCard(item, view.focus));
    } else {
      grid.append(selfCard(view));
    }
    if (inputPorts.length > 0) layout.append(portColumn(inputPorts, 'input', view));
    layout.append(grid);
    if (outputPorts.length > 0) layout.append(portColumn(outputPorts, 'output', view));
    stage.append(svg, layout);
  }
  return stage;
}

function pageControls(page, pageCount, itemCount) {
  if (pageCount <= 1) return null;
  const controls = element('nav', { className: 'graph-camera__pages' });
  controls.setAttribute('aria-label', 'Visible graph-node page');
  const previous = element('button', { text: '← Previous nodes' });
  previous.type = 'button';
  previous.dataset.graphPage = 'previous';
  previous.disabled = page === 0;
  const status = element('span', {
    text: `Nodes ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, itemCount)} of ${itemCount}`,
  });
  const next = element('button', { text: 'Next nodes →' });
  next.type = 'button';
  next.dataset.graphPage = 'next';
  next.disabled = page === pageCount - 1;
  controls.append(previous, status, next);
  return controls;
}

function linkTitle(link) {
  return `${countText(link.edgeCount, 'typed edge')} · ${link.edgeKinds.join(', ')} · `
    + `${link.packetTypes.join(', ')} · ${link.conditions.join(', ')}`;
}

function localRectangle(rect, stageRect, padding = 0) {
  return {
    left: rect.left - stageRect.left - padding,
    right: rect.right - stageRect.left + padding,
    top: rect.top - stageRect.top - padding,
    bottom: rect.bottom - stageRect.top + padding,
  };
}

function freeBezierSegment(start, end, horizontal) {
  if (horizontal) {
    const direction = end.x >= start.x ? 1 : -1;
    const handle = Math.min(Math.abs(end.x - start.x) * .42, 150);
    return {
      start,
      control1: { x: start.x + direction * handle, y: start.y },
      control2: { x: end.x - direction * handle, y: end.y },
      end,
    };
  }
  const direction = end.y >= start.y ? 1 : -1;
  const handle = Math.min(Math.abs(end.y - start.y) * .42, 120);
  return {
    start,
    control1: { x: start.x, y: start.y + direction * handle },
    control2: { x: end.x, y: end.y - direction * handle },
    end,
  };
}

function freeBezierPath(segment) {
  return `M ${segment.start.x} ${segment.start.y} C ${segment.control1.x} ${segment.control1.y} `
    + `${segment.control2.x} ${segment.control2.y} ${segment.end.x} ${segment.end.y}`;
}

function linkPath(fromRect, toRect, stageRect, _obstacleRects, _contextRect, laneOffset = 0) {
  const from = localRectangle(fromRect, stageRect);
  const to = localRectangle(toRect, stageRect);
  const fromCenter = { x: (from.left + from.right) / 2, y: (from.top + from.bottom) / 2 };
  const toCenter = { x: (to.left + to.right) / 2, y: (to.top + to.bottom) / 2 };
  // Boundary rails remain horizontal interfaces even when their matching port is
  // several rows above or below a card. Only vertically aligned, overlapping
  // columns attach at the top or bottom of a component.
  const horizontal = from.right <= to.left || to.right <= from.left;
  let start;
  let end;
  if (horizontal) {
    const direction = toCenter.x >= fromCenter.x ? 1 : -1;
    start = { x: direction > 0 ? from.right : from.left, y: fromCenter.y + laneOffset };
    end = { x: direction > 0 ? to.left : to.right, y: toCenter.y + laneOffset };
  } else {
    const direction = toCenter.y >= fromCenter.y ? 1 : -1;
    start = { x: fromCenter.x + laneOffset, y: direction > 0 ? from.bottom : from.top };
    end = { x: toCenter.x + laneOffset, y: direction > 0 ? to.top : to.bottom };
  }
  return { path: freeBezierPath(freeBezierSegment(start, end, horizontal)), routed: true };
}

function applyAutomaticVerticalDistribution(stage, view) {
  const cards = [...stage.querySelectorAll('.graph-camera__grid .graph-node-card')];
  const window = stage.ownerDocument.defaultView;
  const unavailable = window.innerWidth <= 760
    || stage.classList.contains('graph-camera__stage--modular-boundaries')
    || stage.classList.contains('graph-camera__stage--parallel');
  if (unavailable) {
    for (const card of cards.filter((candidate) => candidate.dataset.graphUserAdjusted !== 'true')) {
      card.style.removeProperty('transform');
      delete card.dataset.graphAutoOffset;
      delete card.dataset.graphAutoBand;
      delete card.dataset.graphVerticalOffset;
    }
    delete stage.dataset.graphAutomaticVerticalDistribution;
    return;
  }

  const boundaryPortCount = stage.querySelectorAll('.graph-boundary-port').length;
  const crowded = cards.length >= 3 || boundaryPortCount >= 4 || view.links.length >= 4;
  if (!crowded || cards.length < 2) return;

  stage.dataset.graphAutomaticVerticalDistribution = 'safe-lane-cycle';
  const stageRect = stage.getBoundingClientRect();
  const contextRect = stage.querySelector('.graph-stage-context')?.getBoundingClientRect();
  const bands = cards.length === 3 ? ['top', 'bottom', 'top'] : ['top', 'bottom', 'middle'];

  for (const [index, card] of cards.entries()) {
    if (card.dataset.graphUserAdjusted === 'true') continue;
    const currentOffset = Number(card.dataset.graphVerticalOffset ?? 0);
    const cardRect = card.getBoundingClientRect();
    const baseTop = cardRect.top - currentOffset;
    const minimumTop = Math.max(stageRect.top + 8, (contextRect?.bottom ?? stageRect.top) + 6);
    const minimumOffset = minimumTop - baseTop;
    const maximumOffset = stageRect.bottom - 8 - cardRect.height - baseTop;
    const safeMaximumOffset = Math.max(minimumOffset, maximumOffset);
    const band = bands[index % bands.length];
    const offset = Math.round(band === 'top' ? minimumOffset
      : band === 'bottom' ? safeMaximumOffset
        : (minimumOffset + safeMaximumOffset) / 2);
    card.dataset.graphAutoBand = band;
    card.dataset.graphAutoOffset = String(offset);
    card.dataset.graphVerticalOffset = String(offset);
    card.style.transform = `translateY(${offset}px)`;
  }
}

function drawLinks(stage, view, markerId) {
  const svg = stage.querySelector('[data-graph-edges]');
  const stageRect = stage.getBoundingClientRect();
  const entityByKey = new Map([...stage.querySelectorAll('[data-graph-entity]')]
    .map((item) => [item.dataset.graphEntity, item]));
  const contextRect = stage.querySelector('.graph-stage-context')?.getBoundingClientRect() ?? null;
  svg.setAttribute('viewBox', `0 0 ${stageRect.width} ${stageRect.height}`);
  svg.replaceChildren();
  const definitions = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const markerColors = {
    flow: '#007a45',
    'boundary-flow': '#165dcc',
    'implementation-flow': '#c45100',
    'reciprocal-flow': '#922a9b',
  };
  for (const [kind, color] of Object.entries(markerColors)) {
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', `${markerId}-${kind}`);
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('orient', 'auto-start-reverse');
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arrow.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    arrow.setAttribute('fill', color);
    marker.append(arrow);
    definitions.append(marker);
  }
  svg.append(definitions);

  for (const link of view.links) {
    const from = entityByKey.get(link.from);
    const to = entityByKey.get(link.to);
    if (!from || !to) continue;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const hasReciprocal = view.links.some((candidate) => candidate.from === link.to
      && candidate.to === link.from);
    const laneOffset = hasReciprocal ? (link.from.localeCompare(link.to) < 0 ? -5 : 5) : 0;
    const visualLinkKind = hasReciprocal && link.linkKind === 'flow'
      ? 'reciprocal-flow' : link.linkKind;
    const route = linkPath(
      from.getBoundingClientRect(),
      to.getBoundingClientRect(),
      stageRect,
      [...entityByKey.entries()]
        .filter(([key]) => key !== link.from && key !== link.to)
        .map(([, element]) => element.getBoundingClientRect()),
      contextRect,
      laneOffset,
    );
    path.setAttribute('d', route.path);
    path.dataset.graphRoute = 'simple-bezier';
    path.setAttribute('class', `graph-camera__edge graph-camera__edge--${link.linkKind}`
      + `${visualLinkKind === link.linkKind ? '' : ` graph-camera__edge--${visualLinkKind}`}`);
    path.dataset.graphLinkKind = visualLinkKind;
    path.dataset.graphLinkFrom = link.from;
    path.dataset.graphLinkTo = link.to;
    path.setAttribute('marker-end', `url(#${markerId}-${visualLinkKind})`);
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = `${hasReciprocal ? 'Opposed aggregate path; no exact cycle · ' : ''}`
      + linkTitle(link);
    path.append(title);
    svg.append(path);
  }
}

function installVerticalDragging(stage, redraw) {
  let redrawFrame = null;
  const scheduleRedraw = () => {
    if (redrawFrame !== null) cancelAnimationFrame(redrawFrame);
    redrawFrame = requestAnimationFrame(() => {
      redrawFrame = null;
      redraw();
    });
  };
  for (const handle of stage.querySelectorAll('[data-graph-drag]')) {
    const card = handle.closest('.graph-node-card');
    let drag = null;
    const boundedOffset = (candidate) => {
      const stageRect = stage.getBoundingClientRect();
      const contextRect = stage.querySelector('.graph-stage-context')?.getBoundingClientRect();
      const currentOffset = Number(card.dataset.graphVerticalOffset ?? 0);
      const cardRect = card.getBoundingClientRect();
      const baseTop = cardRect.top - currentOffset;
      const minimumTop = Math.max(stageRect.top + 8, (contextRect?.bottom ?? stageRect.top) + 6);
      const minimum = minimumTop - baseTop;
      const maximum = stageRect.bottom - 8 - cardRect.height - baseTop;
      return Math.min(Math.max(candidate, minimum), Math.max(minimum, maximum));
    };
    handle.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      handle.setPointerCapture(event.pointerId);
      drag = {
        pointerId: event.pointerId,
        startY: event.clientY,
        startOffset: Number(card.dataset.graphVerticalOffset ?? 0),
      };
      card.classList.add('graph-node-card--dragging');
    });
    handle.addEventListener('pointermove', (event) => {
      if (drag === null || drag.pointerId !== event.pointerId) return;
      const offset = boundedOffset(drag.startOffset + event.clientY - drag.startY);
      card.dataset.graphUserAdjusted = 'true';
      delete card.dataset.graphAutoOffset;
      delete card.dataset.graphAutoBand;
      card.dataset.graphVerticalOffset = String(offset);
      card.style.transform = `translateY(${offset}px)`;
      scheduleRedraw();
    });
    const endDrag = (event) => {
      if (drag === null || drag.pointerId !== event.pointerId) return;
      if (stage.classList.contains('graph-camera__stage--parallel')) {
        const container = card.parentElement;
        const cardCenter = card.getBoundingClientRect().top + card.getBoundingClientRect().height / 2;
        const siblings = [...container.children].filter((candidate) => candidate !== card
          && candidate.classList.contains('graph-node-card'));
        const targetIndex = siblings.filter((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.top + rect.height / 2 < cardCenter;
        }).length;
        card.style.removeProperty('transform');
        delete card.dataset.graphVerticalOffset;
        if (targetIndex >= siblings.length) container.append(card);
        else container.insertBefore(card, siblings[targetIndex]);
      }
      drag = null;
      card.classList.remove('graph-node-card--dragging');
      scheduleRedraw();
    };
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
    handle.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      event.preventDefault();
      if (stage.classList.contains('graph-camera__stage--parallel')) {
        const sibling = event.key === 'ArrowUp' ? card.previousElementSibling : card.nextElementSibling;
        if (sibling?.classList.contains('graph-node-card')) {
          if (event.key === 'ArrowUp') card.parentElement.insertBefore(card, sibling);
          else card.parentElement.insertBefore(sibling, card);
          scheduleRedraw();
        }
        return;
      }
      const current = Number(card.dataset.graphVerticalOffset ?? 0);
      const offset = boundedOffset(current + (event.key === 'ArrowUp' ? -8 : 8));
      card.dataset.graphUserAdjusted = 'true';
      delete card.dataset.graphAutoOffset;
      delete card.dataset.graphAutoBand;
      card.dataset.graphVerticalOffset = String(offset);
      card.style.transform = `translateY(${offset}px)`;
      scheduleRedraw();
    });
  }
}

function datasetFocus(button) {
  return {
    kind: button.dataset.graphInfoKind,
    id: button.dataset.graphInfoId,
    ...(button.dataset.graphParentNode ? { parentNodeId: button.dataset.graphParentNode } : {}),
    ...(button.dataset.graphParentFamily ? { parentFamilyId: button.dataset.graphParentFamily } : {}),
  };
}

function explorerController(explorer) {
  const host = explorer.querySelector('[data-graph-host]');
  const guideTemplate = explorer.querySelector('[data-graph-guide-template]');
  const markerId = `processing-graph-arrow-${++explorerSequence}`;
  let focus = { kind: 'circuit', id: projection.rootCircuitId };
  let page = 0;
  let resizeObserver = null;

  const goTo = (nextFocus) => {
    focus = nextFocus;
    page = 0;
    render();
  };

  const render = () => {
    const view = buildProcessingGraphExplorerView(projection, focus);
    const pageCount = Math.max(1, Math.ceil(view.items.length / PAGE_SIZE));
    page = Math.min(page, pageCount - 1);
    const visibleItems = view.items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const canvas = element('div', { className: 'graph-explorer__canvas' });
    canvas.dataset.graphCanvas = '';
    canvas.append(focusHeader(view));
    const pages = pageControls(page, pageCount, view.items.length);
    if (pages) canvas.append(pages);

    const visibleKeys = new Set(visibleItems.map((item) => item.entityKey));
    if (visibleItems.length === 0 && view.selfEntityKey) visibleKeys.add(view.selfEntityKey);
    const catalogLinks = view.links.filter((link) => {
      const fromVisible = visibleKeys.has(link.from) || link.from.startsWith('port:');
      const toVisible = visibleKeys.has(link.to) || link.to.startsWith('port:');
      if (!fromVisible || !toVisible) return false;
      const nonPortKey = link.from.startsWith('port:') ? link.to : link.from;
      return visibleKeys.has(nonPortKey);
    });
    const visibleLinks = catalogLinks;
    const visiblePortIds = new Set(visibleLinks.flatMap((link) => [link.from, link.to])
      .filter((key) => key.startsWith('port:')));
    const itemOrder = new Map(visibleItems.map((item, index) => [item.entityKey, index]));
    const sortPorts = (ports) => ports.filter((port) => visiblePortIds.has(port.portId))
      .toSorted((left, right) => (itemOrder.get(left.entityKey) ?? 0) - (itemOrder.get(right.entityKey) ?? 0));
    const visibleInputPorts = sortPorts(view.inputPorts);
    const visibleOutputPorts = sortPorts(view.outputPorts);
    const visibleView = { ...view, links: visibleLinks };
    const hasOwnBoundary = (item, ports) => ports.some((port) => port.entityKey === item.entityKey);
    const directSiblingLinks = visibleLinks.filter((link) => !link.from.startsWith('port:')
      && !link.to.startsWith('port:'));
    const modularBoundaries = view.focus.kind === 'circuit' && visibleItems.length > 1
      && directSiblingLinks.length === 0
      && visibleItems.every((item) => hasOwnBoundary(item, visibleInputPorts)
        && hasOwnBoundary(item, visibleOutputPorts));
    const stage = graphStage(visibleView, visibleItems, visibleInputPorts, visibleOutputPorts, {
      modularBoundaries,
    });
    canvas.append(stage);

    const infoPanel = element('aside', { className: 'graph-info-panel' });
    infoPanel.hidden = true;
    infoPanel.setAttribute('role', 'dialog');
    infoPanel.setAttribute('aria-modal', 'true');
    canvas.append(infoPanel);

    const showInfo = (content) => {
      const close = element('button', {
        className: 'graph-info-panel__close',
        text: 'Close ×',
        title: 'Close information',
      });
      close.type = 'button';
      close.addEventListener('click', () => {
        infoPanel.hidden = true;
      });
      infoPanel.replaceChildren(close, content);
      infoPanel.hidden = false;
      close.focus();
      for (const button of infoPanel.querySelectorAll('[data-graph-open-node]')) {
        button.addEventListener('click', () => goTo({ kind: 'node', id: button.dataset.graphOpenNode }));
      }
    };
    const openInfo = (detailFocus) => {
      const detailView = buildProcessingGraphExplorerView(projection, detailFocus);
      showInfo(entityDetail(detailView));
    };

    host.classList.remove('graph-explorer__loading');
    host.replaceChildren(canvas);

    for (const button of canvas.querySelectorAll('[data-graph-enter-kind]')) {
      button.addEventListener('click', () => goTo({
        kind: button.dataset.graphEnterKind,
        id: button.dataset.graphEnterId,
        ...(button.dataset.graphParentNode ? { parentNodeId: button.dataset.graphParentNode } : {}),
        ...(button.dataset.graphParentFamily ? { parentFamilyId: button.dataset.graphParentFamily } : {}),
      }));
    }
    for (const button of canvas.querySelectorAll('[data-graph-port-enter-kind]')) {
      button.addEventListener('click', () => goTo({
        kind: button.dataset.graphPortEnterKind,
        id: button.dataset.graphPortEnterId,
        ...(button.dataset.graphParentNode ? { parentNodeId: button.dataset.graphParentNode } : {}),
        ...(button.dataset.graphParentFamily ? { parentFamilyId: button.dataset.graphParentFamily } : {}),
      }));
    }
    for (const button of canvas.querySelectorAll('[data-graph-breadcrumb]')) {
      button.addEventListener('click', () => goTo(view.breadcrumbs[Number(button.dataset.graphBreadcrumb)].focus));
    }
    for (const button of canvas.querySelectorAll('[data-graph-info-kind]')) {
      button.addEventListener('click', () => openInfo(datasetFocus(button)));
    }
    const visiblePortById = new Map([...visibleInputPorts, ...visibleOutputPorts]
      .map((port) => [port.portId, port]));
    for (const button of canvas.querySelectorAll('[data-graph-port-info]')) {
      button.addEventListener('click', () => {
        showInfo(boundaryPortDetail(visiblePortById.get(button.dataset.graphPortInfo), visibleView));
      });
    }
    for (const button of canvas.querySelectorAll('[data-graph-focus-info]')) {
      button.addEventListener('click', () => openInfo(view.focus));
    }
    for (const button of canvas.querySelectorAll('[data-graph-guide-info]')) {
      button.addEventListener('click', () => {
        const guideContent = guideTemplate?.content.firstElementChild?.cloneNode(true);
        if (guideContent) showInfo(guideContent);
      });
    }
    for (const button of canvas.querySelectorAll('[data-graph-page]')) {
      button.addEventListener('click', () => {
        page += button.dataset.graphPage === 'next' ? 1 : -1;
        render();
      });
    }

    const layoutAndDraw = () => {
      applyAutomaticVerticalDistribution(stage, visibleView);
      drawLinks(stage, visibleView, markerId);
    };
    requestAnimationFrame(layoutAndDraw);
    installVerticalDragging(stage, () => drawLinks(stage, visibleView, markerId));
    resizeObserver?.disconnect();
    resizeObserver = new ResizeObserver(layoutAndDraw);
    resizeObserver.observe(stage);
  };

  explorer.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const panel = explorer.querySelector('.graph-info-panel:not([hidden])');
      if (panel) {
        event.preventDefault();
        panel.hidden = true;
      }
    }
    if (event.key === 'Backspace') {
      const parentFocus = buildProcessingGraphExplorerView(projection, focus).parentFocus;
      if (parentFocus !== null) {
        event.preventDefault();
        goTo(parentFocus);
      }
    }
    if (event.key === 'Home' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      goTo({ kind: 'circuit', id: projection.rootCircuitId });
    }
  });
  render();
}

for (const explorer of document.querySelectorAll('[data-processing-graph-explorer]')) {
  explorerController(explorer);
}
