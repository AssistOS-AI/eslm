function sentenceCase(value) {
  return value.replaceAll('-', ' ').replace(/^./u, (initial) => initial.toUpperCase());
}

export function plainTypeLabel(value) {
  return value.split(':').at(-1)
    .replace(/-v\d+(?:\.\d+)*$/iu, '')
    .replaceAll('-', ' ');
}

export function plainList(values, empty = 'none') {
  const labels = [...new Set(values)];
  if (labels.length === 0) return empty;
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels.at(-1)}`;
}

function typedList(values, empty) {
  return plainList(values.map(plainTypeLabel), empty);
}

function labelsForEdges(edges, direction, nodeById) {
  return [...new Set(edges.map((edge) => nodeById.get(direction === 'incoming' ? edge.from : edge.to).label))];
}

function circuitExplanation(view) {
  const children = view.items.map((item) => item.label);
  const incoming = view.inputPorts.flatMap((port) => port.neighbourLabels);
  const outgoing = view.outputPorts.flatMap((port) => port.neighbourLabels);
  const inputs = view.inputPorts.flatMap((port) => port.packetTypes);
  const outputs = view.outputPorts.flatMap((port) => port.packetTypes);
  if (view.detail.parentCircuitId === null) {
    return {
      summary: 'A descriptive catalog root for three independent processing planes, not one executable pipeline.',
      explanation: `${view.label} is a catalog index, not a fourth executable circuit. Runtime request cycle handles `
        + `a caller request and returns a runtime result. Knowledge build `
        + `separately turns frozen, rights-cleared source material into an immutable declarative package. Graph `
        + `discovery research separately turns authorized inert dataset evidence into a non-executable proposal for `
        + `manual review. These planes do not feed data into one another on this view. Each isolated `
        + `IN → plane → OUT module therefore shows that plane's own real exterior contract rather than inventing a `
        + `false cross-plane flow.`,
    };
  }
  return {
    summary: view.role,
    explanation: `${view.label} exists to keep ${plainList(children, 'its current direct work')} inside one `
      + `inspectable boundary. ${view.role} It receives ${typedList(inputs, 'no external packet')} from `
      + `${plainList(incoming, 'no exterior producer at this level')}. The solid arrows show the actual typed `
      + `handoffs between those named components; entering a card and using the breadcrumb reveals hierarchy without `
      + `misrepresenting it as execution flow. The circuit can `
      + `hand ${typedList(outputs, 'no external packet')} to `
      + `${plainList(outgoing, 'no exterior consumer at this level')}.`,
  };
}

function nodeExplanation(view, nodeById) {
  const detail = view.detail;
  const incomingLabels = labelsForEdges(view.incomingEdges, 'incoming', nodeById);
  const outgoingLabels = labelsForEdges(view.outgoingEdges, 'outgoing', nodeById);
  const inputSentence = detail.inputPacketTypes.length === 0
    ? `It begins at the concrete exterior interaction shown on the left and admits the representation that becomes ${typedList(detail.outputPacketTypes, 'its first typed packet')}.`
    : incomingLabels.length > 0
      ? `It receives ${typedList(detail.inputPacketTypes, 'its declared input')} after work by ${plainList(incomingLabels)}.`
      : `It receives ${typedList(detail.inputPacketTypes, 'its declared input')} from the exterior interface shown on the left.`;
  const outputSentence = detail.outputPacketTypes.length === 0
    ? `It completes at the concrete exterior interaction shown on the right after consuming ${typedList(detail.inputPacketTypes, 'its final typed packet')}.`
    : outgoingLabels.length > 0
      ? `It sends ${typedList(detail.outputPacketTypes, 'its declared output')} toward ${plainList(outgoingLabels)}.`
      : `It hands ${typedList(detail.outputPacketTypes, 'its declared output')} to the exterior interface shown on the right.`;
  const action = {
    source: 'It introduces bounded data into this graph instance and does not infer or authorize an answer.',
    process: 'It performs only this named transformation under the listed finite resources; it cannot silently add policy or facts.',
    coordinator: 'It funds only eligible registered strategies, preserves correlated or conflicting proposals, and forwards typed candidates without replacing a downstream gate.',
    'authority-gate': 'It evaluates this mandatory check. A successful check permits the declared downstream handoff; a failed check follows an explicit rejection, gap, or rollback path and cannot be outvoted.',
    sink: 'It is the terminal handoff for this plane and releases only the already validated packet supplied by its upstream gate.',
  }[detail.kind];
  return {
    summary: detail.role,
    explanation: `${detail.label} exists as a separate ${sentenceCase(detail.kind)} owner so this responsibility, `
      + `its authority, and its failure path remain inspectable. ${inputSentence} ${detail.role} ${action} `
      + `${outputSentence}`,
  };
}

function familyExplanation(view) {
  const owners = view.reusedByNodes.map((node) => node.label);
  return {
    summary: `${view.detail.memberIdentities.length} reviewed strategies registered as one catalog family.`,
    explanation: `${view.label} exists so ${plainList(owners, 'its owner node')} can address one processing `
      + `responsibility with ${view.detail.memberIdentities.length} separately reviewable alternatives. The owner may `
      + `run only members whose preconditions and budgets are satisfied, then compares their typed candidates under `
      + `the owner stage. Family membership does not execute every member, grant answer authority, or bypass witness `
      + `and downstream gate checks.`,
  };
}

function strategyStageAction(strategy, label) {
  const input = typedList(strategy.inputTypes, 'no typed input');
  const output = typedList(strategy.outputTypes, 'no typed output');
  const preconditions = typedList(strategy.preconditions, 'no additional precondition');
  const witness = plainTypeLabel(strategy.witnessKind);
  const actions = {
    'runtime.language.interpret': `It looks for ${preconditions} in the bounded surface analysis and applies only the ${label} rewrite. It proposes a controlled-language candidate; the unchanged parser and semantic-preservation gates still decide whether that candidate is usable.`,
    'runtime.request.plan': `It reads explicit instruction spans, detects the requested operations and constraints, and orders them as an obligation plan. It does not supply facts or execute the requested work.`,
    'compiler.knowledge.extract': `It reads a rights-gated frozen source packet using the ${label} extraction profile and emits canonical-record candidates. Those candidates remain untrusted until record, provenance, safety, promotion, and package-equivalence gates accept them.`,
    'runtime.knowledge.focus': `It inspects the visible request and Semantic IR using the ${label} focus rule, then proposes ranked search terms. The ranking can guide retrieval but cannot make a term true or authorize an answer.`,
    'runtime.evidence.assess': `It applies the ${label} relevance feature to one provenance-bearing candidate and grounding request. It emits a relevance vote; correlated votes are combined without converting relevance into truth.`,
    'runtime.reason.execute': `It runs the ${label} reasoning method only when ${preconditions} holds. It derives ${output} from ${input}; the declared witness must then be independently replayed before a strict answer can be accepted.`,
    'runtime.result.construct': `It performs the ${label} presentation operation using only admitted, provenance-bearing inputs. It may arrange or realize grounded wording, but it cannot add an unsupported claim; the result schema and provenance gates still validate the output.`,
    'runtime.knowledge.retrieve': `It opens the bounded registered-provider frontier selected by the query focus and KB scope, retrieves provenance-bearing candidates, and records per-source search receipts and truncation. A miss is not treated as logical absence.`,
    'runtime.method.plan': `It matches the typed task frame against declared method capabilities, preconditions, and finite costs, then proposes an ordered capability-aware plan. It does not execute a method or decide an answer.`,
    'runtime.result.verify': `It replays the method-specific declared witness against the method result and emits an accept or reject decision. This step exists so an executor cannot authorize its own unsupported answer.`,
    'runtime.failure.ground': `It searches a separately budgeted related-evidence frontier only after an eligible inability. It returns a non-answer grounding bundle with answerSupported false and never copies related material into proof or answer provenance.`,
  };
  return `${actions[strategy.stage] ?? `It transforms ${input} into ${output} under ${preconditions}.`} `
    + `Its auditable witness is ${witness}; declared failures remain explicit rather than becoming an empty result.`;
}

function strategyExplanation(view) {
  const strategy = view.detail;
  return {
    summary: `${sentenceCase(strategy.epistemicRole)} strategy at ${strategy.stage}.`,
    explanation: `${view.label} exists as one reviewed implementation option for its owner node. `
      + strategyStageAction(strategy, view.label),
  };
}

const EXTERNAL_PACKET_ACTIONS = Object.freeze({
  'packet:runtime:bounded-request': 'A human CLI operator or a software library client submits one bounded request. Request ingress introduces that request into the runtime plane without assigning semantic or answer authority.',
  'packet:runtime:runtime-result': 'After result construction, schema validation, and session-commit checks, Runtime result sink returns the closed runtime result to the human CLI operator or software library client that owns the request interaction.',
  'packet:compiler:frozen-source': 'A source-acquisition process or frozen-file store supplies bytes whose identity, rights, and decoder metadata are already frozen. Frozen source ingress accepts that immutable packet before decoding or extraction begins.',
  'packet:compiler:immutable-package': 'After record validation, explicit promotion, compilation, and byte-equivalence checks, Immutable package sink hands the validated declarative package to the package catalog and immutable storage.',
  'packet:research:episode-batch': 'The authorized dataset adapter supplies inert, training-visible episodes. Research actions remain evidence and are never executed as runtime policy.',
  'packet:research:source-status': 'The source-status packet records rights, visibility, split, identity, and coverage state for the authorized research projection.',
  'packet:research:promotion-proposal': 'Promotion proposal sink presents a non-executable component or strategy hypothesis, together with scale and omission receipts, to a human reviewer. The reviewer may reject it or begin a separate promotion change; nothing enters the runtime catalog automatically.',
});

export function explainBoundaryPort(port, view) {
  const connectedItem = view.items.find((item) => item.entityKey === port.entityKey);
  const connectedLabel = connectedItem?.label ?? view.label;
  const connectedRole = connectedItem?.role ?? view.role;
  const externalActions = port.packetTypes.map((packetType) => EXTERNAL_PACKET_ACTIONS[packetType])
    .filter(Boolean);
  let explanation;
  if (externalActions.length > 0) {
    explanation = `${externalActions.join(' ')} The ${port.direction} arrow connects that exterior operation `
      + `${port.direction === 'input' ? 'to' : 'from'} ${connectedLabel}, whose responsibility is: ${connectedRole}`;
    const exteriorKind = {
      'external-actor': 'a human actor',
      'external-system': 'a software container or application',
      'external-actor-system': 'a human operator or software client',
    }[port.externalEndpointKind] ?? 'an exterior system';
    explanation += ` The endpoint represents ${exteriorKind}. It is terminal in this explorer, so it has no navigation arrow and does not open another catalog component.`;
  } else if (port.edgeIds.length > 0) {
    explanation = port.direction === 'input'
      ? `${plainList(port.neighbourLabels)} emits ${typedList(port.packetTypes, 'typed data')} across the selected `
        + `circuit boundary. ${connectedLabel} receives it and ${connectedRole.toLowerCase()}`
      : `${connectedLabel} ${connectedRole.toLowerCase()} It emits ${typedList(port.packetTypes, 'typed data')} `
        + `across the selected circuit boundary toward ${plainList(port.neighbourLabels)}.`;
    explanation += ` The connector summarizes ${port.edgeIds.length} exact catalog `
      + `${port.edgeIds.length === 1 ? 'edge' : 'edges'} listed below.`;
  } else if (view.focus.kind === 'node' && view.items.length === 0) {
    explanation = `${connectedLabel} has no registered strategy layer, so this is the processing node's own `
      + `declared ${port.direction} contract. The solid arrow carries `
      + `${typedList(port.packetTypes, 'typed data')} ${port.direction === 'input' ? 'into the node'
        : 'from the node toward its next catalog handoff'}. ${connectedRole}`;
  } else if (view.focus.kind === 'node') {
    if (port.direction === 'input') {
      explanation = `${connectedLabel} owns the shared input to the alternatives shown vertically. The fan-out means `
        + `that every eligible registered strategy receives the same typed contract; it does not mean that the `
        + `strategies execute in sequence or that every strategy must run. Eligibility, budget, and precondition `
        + `checks happen before dispatch. ${connectedRole}`;
    } else {
      const decision = {
        coordinator: 'It compares eligible candidates under the declared budget and correlation rules, retaining conflicts instead of counting correlated proposals as independent votes.',
        'authority-gate': 'It applies its mandatory acceptance check to the candidate set; strategy confidence cannot outvote or bypass that gate.',
        process: 'It accepts only a candidate that satisfies the deterministic owner contract; the alternatives do not gain voting or answer authority.',
        source: 'It accepts only the bounded source representation required by its owner contract and assigns no semantic or answer authority.',
        sink: 'It releases only an already accepted candidate and does not create a new decision at the handoff.',
      }[view.detail.kind];
      explanation = `Candidate paths converge visually at this OUT rail, where ${connectedLabel} makes the node-level `
        + `owner decision. ${decision} Only the accepted typed candidate or explicit bounded candidate set crosses `
        + `this rail; it is not an automatic merge of every strategy output. ${connectedRole}`;
    }
  } else if (view.focus.kind === 'family') {
    explanation = port.direction === 'input'
      ? `${connectedLabel} groups concurrent reviewed alternatives for one owner responsibility. This input fans the `
        + `same typed contract to eligible members; vertical placement means alternatives, not processing order, and `
        + `family membership does not require every member to run.`
      : `The member candidate paths converge visually at this handoff, but ${connectedLabel} itself makes no `
        + `selection and has no answer authority. It returns typed candidates to the owning processing node, which `
        + `performs the declared comparison or acceptance step and keeps failures and conflicts explicit.`;
  } else if (view.focus.kind === 'strategy') {
    explanation = port.direction === 'input'
      ? `${connectedLabel} receives this typed contract from its owning processing node only after the strategy's `
        + `preconditions and finite budget are satisfied. Opening the strategy does not itself execute it.`
      : `${connectedLabel} emits one typed candidate and its declared witness or failure. The owning processing node `
        + `must still accept, reject, or compare that candidate; the arrow does not grant proof, answer, or gate authority.`;
  } else {
    explanation = `${connectedLabel} owns this implementation envelope. The ${port.direction} side carries `
      + `${typedList(port.packetTypes, 'typed data')} ${port.direction === 'input' ? 'into eligible strategies'
        : 'from an accepted strategy candidate back to the owner'}. ${connectedRole}`;
  }
  explanation += ` This boundary carries ${typedList(port.packetTypes, 'typed data')}.`;
  return {
    connectedLabel,
    summary: `${sentenceCase(port.direction)} connection between ${port.label} and ${connectedLabel}.`,
    explanation,
  };
}

export function explainProcessingGraphView(view, projection) {
  const nodeById = new Map(projection.nodes.map((node) => [node.nodeId, node]));
  if (view.focus.kind === 'circuit') return circuitExplanation(view);
  if (view.focus.kind === 'node') return nodeExplanation(view, nodeById);
  if (view.focus.kind === 'family') return familyExplanation(view);
  return strategyExplanation(view);
}
