import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  PROCESSING_GRAPH_CATALOG,
  PROCESSING_GRAPH_PACKET_CONTRACT_CATALOG,
  processingGraphInventory,
  processingGraphValidationReceipt,
} from '../../src/processing-graph/index.mjs';
import { BUILTIN_STRATEGY_CATALOG } from '../../src/strategy/builtin-strategy-catalog.mjs';
import { STRATEGY_STAGES } from '../../src/strategy/strategy-contract.mjs';

const pageUrl = new URL('../architecture/logical-processing-architecture.html', import.meta.url);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function code(value) {
  return `<code>${escapeHtml(value)}</code>`;
}

function codeList(values, empty = 'none') {
  return values.length > 0 ? values.map(code).join(', ') : empty;
}

function marker(name, content) {
  return `<!-- GENERATED:${name}:START -->\n${content}\n<!-- GENERATED:${name}:END -->\n`;
}

function replaceGeneratedOrInitial(source, name, initialPattern, content) {
  const start = `<!-- GENERATED:${name}:START -->`;
  const end = `<!-- GENERATED:${name}:END -->`;
  const generated = marker(name, content);
  if (source.includes(start) && source.includes(end)) {
    const startIndex = source.indexOf(start);
    const endIndex = source.indexOf(end, startIndex);
    if (endIndex < 0) throw new Error(`Missing generated end marker for ${name}.`);
    return source.slice(0, startIndex) + generated + source.slice(endIndex + end.length)
      .replace(/^\n/u, '');
  }
  if (!initialPattern.test(source)) throw new Error(`Could not locate initial ${name} section.`);
  return source.replace(initialPattern, generated);
}

function packetContractSection() {
  const contracts = PROCESSING_GRAPH_PACKET_CONTRACT_CATALOG.contracts;
  const rows = contracts.map((contract) => (
    `<tr><td>${code(contract.packetType)}</td><td><dl class="table-details">`
    + `<div><dt>Endpoints</dt><dd>Produces: ${codeList(contract.producers)}. `
    + `Consumes: ${codeList(contract.consumers)}.</dd></div>`
    + `<div><dt>Semantic fields</dt><dd>Required: ${codeList(contract.requiredFields)}. `
    + `Optional: ${codeList(contract.optionalFields)}.</dd></div>`
    + `<div><dt>Absence</dt><dd>${escapeHtml(contract.absenceMeaning)}</dd></div>`
    + `<div><dt>Policy</dt><dd>Bounds: ${codeList(contract.boundResourceRefs)}. `
    + `Validator: ${code(contract.validationOwner)}. Privacy ${code(contract.privacy)}; `
    + `provenance ${code(contract.provenance)}; lifetime ${code(contract.lifetime)}; `
    + `authority effect ${code(contract.authorityEffect)}.</dd></div>`
    + '</dl></td></tr>'
  )).join('\n');
  return `<h3>Packet-contract catalog · ${contracts.length} closed semantic envelopes</h3>
<p>The table below is generated from <code>eslm-processing-graph-packet-contract-catalog-v1</code>. Endpoint lists are recomputed from graph node declarations. Required and optional names close the high-level envelope; unknown names fail before semantic-owner validation. “Absence” explains what no packet means, rather than treating an empty collection, a rejected gate, and an unvisited path as equivalent. Bound resources identify the dimensions that limit the packet. Privacy, provenance, lifetime, and authority effect constrain downstream use; an authority effect records an established decision and never creates authority on its own.</p>
<div class="table-wrap architecture-catalog"><table><thead><tr><th>Exact packet identity</th><th>Endpoints, semantic fields, absence, and policy</th></tr></thead><tbody>
${rows}
</tbody></table></div>`;
}

function resolvedNodeStrategies(node, familyById) {
  return [...new Set([
    ...node.strategyRefs,
    ...node.strategyFamilyRefs.flatMap((familyId) => familyById.get(familyId)?.members ?? []),
  ])].toSorted();
}

function circuitTable(inventory, circuitById) {
  const rows = inventory.circuits.map((item) => {
    const circuit = circuitById.get(item.circuitId);
    return `<tr><td>${code(item.circuitId)}<br><strong>${escapeHtml(item.label)}</strong></td><td>`
      + `<dl class="table-details"><div><dt>Parent and depth</dt><dd>${item.parentCircuitId === null
        ? 'root circuit' : code(item.parentCircuitId)}; depth ${item.depth}.</dd></div>`
      + `<div><dt>Responsibility</dt><dd>${escapeHtml(circuit.role)}</dd></div>`
      + `<div><dt>Population</dt><dd>${item.directNodeCount} direct nodes; `
      + `${item.nestedNodeCount} nodes including descendants.</dd></div>`
      + `<div><dt>Implementation state</dt><dd>${item.implementationStates.coordinated} coordinated; `
      + `${item.implementationStates['instrumented-local']} instrumented-local; `
      + `${item.implementationStates.planned} planned.</dd></div></dl></td></tr>`;
  }).join('\n');
  return `<div class="table-wrap architecture-catalog"><table><thead><tr><th>Exact circuit identity</th><th>Hierarchy, responsibility, and population</th></tr></thead><tbody>
${rows}
</tbody></table></div>`;
}

function edgeDescription(edge) {
  return `${code(edge.edgeId)} (${code(edge.kind)}) → ${code(edge.to)} via `
    + `${code(edge.packetType)} when ${code(edge.condition)}`;
}

function nodeTable(title, description, nodes, familyById, edgeById) {
  const rows = nodes.map((node) => {
    const strategies = resolvedNodeStrategies(node, familyById);
    const outgoing = [...node.normalEdges, ...node.exceptionalEdges]
      .map((edgeId) => edgeById.get(edgeId));
    return `<tr><td>${code(node.nodeId)}<br><strong>${escapeHtml(node.label)}</strong><br>`
      + `${code(node.implementationState)}</td><td><dl class="table-details">`
      + `<div><dt>Placement</dt><dd>${code(node.circuitId)}; ${code(node.kind)}; `
      + `${node.stageRef === null ? 'no DS027 stage reference' : `DS027 stage ${code(node.stageRef)}`}.</dd></div>`
      + `<div><dt>Responsibility</dt><dd>${escapeHtml(node.role)}</dd></div>`
      + `<div><dt>Packets</dt><dd>${codeList(node.inputPacketTypes)} → `
      + `${codeList(node.outputPacketTypes)}.</dd></div>`
      + `<div><dt>Authority</dt><dd>${code(node.authority)}; ${node.canVote
        ? 'correlation-aware voting permitted' : 'non-voting'}; answer authority `
      + `${code(node.answerAuthority)}.</dd></div>`
      + `<div><dt>Strategies</dt><dd>${codeList(strategies)}${node.strategyFamilyRefs.length > 0
        ? `; expanded from ${codeList(node.strategyFamilyRefs)}` : ''}.</dd></div>`
      + `<div><dt>Resources</dt><dd>${codeList(node.resourceDimensions)}.</dd></div>`
      + `<div><dt>Outgoing edges</dt><dd>${outgoing.length > 0
        ? outgoing.map(edgeDescription).join('; ') : 'none'}.</dd></div>`
      + '</dl></td></tr>';
  }).join('\n');
  return `<h4>${escapeHtml(title)} · ${nodes.length} nodes</h4>
<p>${escapeHtml(description)}</p>
<div class="table-wrap architecture-catalog"><table><thead><tr><th>Exact node identity</th><th>Contract, authority, resources, and outgoing topology</th></tr></thead><tbody>
${rows}
</tbody></table></div>`;
}

function graphInventorySection() {
  const inventory = processingGraphInventory();
  const validation = processingGraphValidationReceipt();
  const circuitById = new Map(PROCESSING_GRAPH_CATALOG.circuits
    .map((item) => [item.circuitId, item]));
  const familyById = new Map(PROCESSING_GRAPH_CATALOG.strategyFamilies
    .map((item) => [item.familyId, item]));
  const edgeById = new Map(PROCESSING_GRAPH_CATALOG.edges.map((item) => [item.edgeId, item]));
  const planeNodes = (plane) => inventory.canonicalNodeOrder
    .map((nodeId) => PROCESSING_GRAPH_CATALOG.nodes.find((item) => item.nodeId === nodeId))
    .filter((item) => item.nodeId.startsWith(`node:${plane}:`));
  const exceptional = PROCESSING_GRAPH_CATALOG.edges
    .filter((item) => ['exception', 'rollback'].includes(item.kind));
  const exceptionalRows = exceptional.map((edge) => `<tr><td>${code(edge.edgeId)}<br>${code(edge.kind)}</td>`
    + `<td>${code(edge.from)} → ${code(edge.to)}; carries ${code(edge.packetType)} when `
    + `${code(edge.condition)}.</td></tr>`).join('\n');
  const c = validation.counts;
  return `<h3>Zoom 3 · exact processing-node inventory</h3>
<p><code>eslm-processing-graph-catalog-v1</code> freezes ${c.nodes} exact nodes inside ${c.circuits} nested circuits, connected by ${c.edges} typed normal, authority, resource, rollback, control, and exceptional edges. The nodes expose ${c.packetTypes} packet types with ${c.packetContracts} matching packet contracts and ${c.resourceDimensions} resource dimensions, and all ${c.strategiesMapped} strategy identities are mapped. State is explicit: ${inventory.implementationStates.coordinated} node is <code>coordinated</code>, ${inventory.implementationStates['instrumented-local']} are <code>instrumented-local</code>, and ${inventory.implementationStates.planned} are <code>planned</code>. Of the ${c.nodes} nodes, ${inventory.nodeKinds['authority-gate']} are non-voting authority gates, ${inventory.nodeKinds.coordinator} are coordination nodes, ${inventory.nodeKinds.process} are transformations, ${inventory.nodeKinds.source} are sources, and ${inventory.nodeKinds.sink} are sinks. These are descriptive architecture records, not evidence that every node crossed the common coordinator or executed in a particular request.</p>
<p><strong>Current validation identity.</strong> <code>processingGraphValidationReceipt()</code> reports graph-catalog digest ${code(validation.catalogDigest)}, topology digest ${code(validation.topologyDigest)}, and packet-contract digest ${code(validation.packetContractDigest)}. The receipt validates closed schemas, rooted acyclic hierarchy and graph, reachability, packet-contract closure, non-voting gates, answer-authority limits, exact strategy-stage mappings, state honesty, and rename-neutral metadata. It validates descriptive catalogs, not a request execution.</p>

<figure class="diagram"><pre class="mermaid">flowchart LR
  G[${c.circuits}-circuit graph catalog] --> R[Runtime: ${c.runtime} nodes]
  G --> C[Compiler: ${c.compiler} nodes]
  G --> D[Research: ${c.research} nodes]
  classDef source fill:#eaf2fb,stroke:#315a7d,color:#17324d,font-weight:bold
  classDef coordinate fill:#efe8f7,stroke:#674786,color:#352345,font-weight:bold
  classDef process fill:#f4efe3,stroke:#76632f,color:#3f3519,font-weight:bold
  classDef gate fill:#e8f4ec,stroke:#39704a,color:#1f422b,font-weight:bold
  class G source
  class R process
  class C coordinate
  class D gate</pre><figcaption>One catalog, three authority-separated processing planes.</figcaption></figure>
<p class="diagram-explanation">The root catalog provides one vocabulary for inspection, but it does not merge authority. Runtime nodes consume a request and may emit a validated result. Compiler nodes consume frozen source evidence and may publish an immutable declarative package. Research nodes consume only authorized inert episodes and may emit a non-executable proposal for manual review. Circuit membership, node state, packet types, strategy references, resources, and outgoing edges below come directly from the live static catalog.</p>

<h4>Exact circuit hierarchy</h4>
${circuitTable(inventory, circuitById)}
${nodeTable('Runtime request circuit', 'This plane transforms one bounded request into a validated runtime result or an explicit typed inability.', planeNodes('runtime'), familyById, edgeById)}
${nodeTable('Knowledge-build circuit', 'This plane turns frozen, rights-cleared source material into reviewed canonical records and immutable package bytes.', planeNodes('compiler'), familyById, edgeById)}
${nodeTable('Graph-discovery research circuit', 'This plane carries inert source evidence through structural projection, bounded hypothesis coordination, review gates, and a non-executable promotion handoff.', planeNodes('research'), familyById, edgeById)}

<h4>Exact exceptional and rollback edges</h4>
<p>The graph contains ${exceptional.filter((item) => item.kind === 'exception').length} explicit exceptional edges and ${exceptional.filter((item) => item.kind === 'rollback').length} rollback edge. Each carries a named packet and a bounded condition; none is an invisible jump or an invitation to reinterpret failure as success.</p>
<div class="table-wrap architecture-catalog"><table><thead><tr><th>Exact edge identity</th><th>Producer, consumer, packet, and condition</th></tr></thead><tbody>
${exceptionalRows}
</tbody></table></div>`;
}

function strategyNodeIndex() {
  const familyById = new Map(PROCESSING_GRAPH_CATALOG.strategyFamilies
    .map((item) => [item.familyId, item]));
  const index = new Map(BUILTIN_STRATEGY_CATALOG.strategies
    .map((strategy) => [`${strategy.strategyId}@${strategy.version}`, []]));
  for (const node of PROCESSING_GRAPH_CATALOG.nodes) {
    for (const identity of resolvedNodeStrategies(node, familyById)) index.get(identity).push(node.nodeId);
  }
  return index;
}

function strategyInventorySection() {
  const strategies = BUILTIN_STRATEGY_CATALOG.strategies;
  const nodeIndex = strategyNodeIndex();
  const stateCounts = Object.fromEntries(['coordinated', 'instrumented-local', 'planned'].map((state) => [
    state, strategies.filter((item) => item.implementationState === state).length,
  ]));
  const rows = STRATEGY_STAGES.map((stage) => {
    const stageStrategies = strategies.filter((strategy) => strategy.stage === stage);
    const stageNodes = PROCESSING_GRAPH_CATALOG.nodes.filter((node) => node.stageRef === stage)
      .map((node) => node.nodeId).toSorted();
    const list = stageStrategies.length === 0 ? '<p>No built-in strategy descriptor is registered at this stage.</p>'
      : `<ul class="strategy-identity-list">${stageStrategies.map((strategy) => {
        const identity = `${strategy.strategyId}@${strategy.version}`;
        return `<li>${code(identity)} <strong>${code(strategy.implementationState)}</strong>`
          + `<dl class="table-details"><div><dt>Mapped nodes</dt><dd>${codeList(nodeIndex.get(identity))}.</dd></div>`
          + `<div><dt>Types</dt><dd>${codeList(strategy.inputTypes)} → `
          + `${codeList(strategy.outputTypes)}.</dd></div>`
          + `<div><dt>Eligibility</dt><dd>${codeList(strategy.preconditions)}.</dd></div>`
          + `<div><dt>Epistemic contract</dt><dd>Role ${code(strategy.epistemicRole)}; confidence `
          + `${code(strategy.confidenceKind)}; answer authority ${code(strategy.answerAuthority)}.</dd></div>`
          + `<div><dt>Cost and budgets</dt><dd>${code(strategy.costModel)}; ${codeList(strategy.budgetKeys)}.</dd></div>`
          + `<div><dt>Witness and dependence</dt><dd>${code(strategy.witnessKind)}; correlation `
          + `${code(strategy.correlationGroup)}.</dd></div>`
          + `<div><dt>Failures</dt><dd>${codeList(strategy.failureClasses)}.</dd></div></dl></li>`;
      }).join('')}</ul>`;
    return `<tr><td>${code(stage)}<br><strong>${stageStrategies.length} strategies</strong></td><td>`
      + `<p><strong>Mapped processing nodes:</strong> ${codeList(stageNodes)}.</p>${list}</td></tr>`;
  }).join('\n');
  return `<h3>Zoom 3 · exact strategy inventory by DS027 stage</h3>
<p>The source-owned built-in catalog contains ${strategies.length} descriptors: ${stateCounts.coordinated} <code>coordinated</code>, ${stateCounts['instrumented-local']} <code>instrumented-local</code>, and ${stateCounts.planned} <code>planned</code>. The state is attached to every exact identity. <code>Coordinated</code> means the executor crosses the common registry and coordinator. <code>Instrumented-local</code> means a real bounded owner and descriptor exist; only stages whose owner enforces the allowlist are policy-selectable. <code>Planned</code> means no selectable executor is claimed. The generated catalog below names all identities, node mappings, types, preconditions, confidence meanings, cost models, budgets, witnesses, correlation groups, authority, and failures.</p>
<div class="table-wrap architecture-catalog"><table><thead><tr><th>DS027 stage</th><th>Mapped nodes and exact strategy design specifications</th></tr></thead><tbody>
${rows}
</tbody></table></div>`;
}

let page = await readFile(pageUrl, 'utf8');
page = page.replace(/closes all \d+ live identities/u,
  `closes all ${PROCESSING_GRAPH_PACKET_CONTRACT_CATALOG.contracts.length} live identities`);
page = replaceGeneratedOrInitial(
  page,
  'PROCESSING_GRAPH_PACKET_CONTRACTS',
  /<h3>Packet-contract catalog · \d+ closed semantic envelopes<\/h3>[\s\S]*?(?=<h3>Zoom 3 · exact processing-node inventory<\/h3>)/u,
  packetContractSection(),
);
page = replaceGeneratedOrInitial(
  page,
  'PROCESSING_GRAPH_CATALOG',
  /<h3>Zoom 3 · exact processing-node inventory<\/h3>[\s\S]*?(?=<h3>Zoom 3 · exact strategy inventory by DS027 stage<\/h3>)/u,
  graphInventorySection(),
);
page = replaceGeneratedOrInitial(
  page,
  'PROCESSING_GRAPH_STRATEGIES',
  /<h3>Zoom 3 · exact strategy inventory by DS027 stage<\/h3>[\s\S]*?(?=<h3>Current integration boundary<\/h3>)/u,
  strategyInventorySection(),
);

const validation = processingGraphValidationReceipt();
const baselineRow = `<tr><td>Current catalog baseline</td><td>Every analysis is compared with catalog `
  + `${code(validation.catalogDigest)} and topology ${code(validation.topologyDigest)}. The packet-contract catalog is `
  + `${code(validation.packetContractDigest)}. A changed baseline supersedes the research chain; research never mutates `
  + 'the baseline itself.</td></tr>';
page = page.replace(/<tr><td>Current catalog baseline<\/td>[\s\S]*?<\/tr>/u, baselineRow);

await writeFile(pageUrl, page, 'utf8');
process.stdout.write(`${fileURLToPath(pageUrl)}\n`);
