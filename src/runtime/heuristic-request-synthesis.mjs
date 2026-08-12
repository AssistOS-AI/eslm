import {
  groundingTerms, groundingTokens, normalizedGroundingSurface,
} from '../reasoning/grounding-query-focus.mjs';

export const HEURISTIC_SYNTHESIS_PROTOCOL = 'eslm-heuristic-request-synthesis-v1';

const SOURCE_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have', 'in', 'is', 'it',
  'of', 'on', 'or', 'that', 'the', 'their', 'this', 'to', 'was', 'were', 'with',
]);

function boundedText(value, maximum = 480) {
  const text = String(value ?? '').normalize('NFKC').replace(/\s+/gu, ' ').trim();
  return text.length <= maximum ? text : `${text.slice(0, maximum - 1)}…`;
}

function sentenceUnits(text) {
  const normalized = String(text ?? '').normalize('NFKC').trim();
  if (!normalized) return [];
  return normalized.split(/(?<=[.!?])\s+/u).map((originalSurface, index) => Object.freeze({
    index,
    surface: boundedText(originalSurface),
    originalCharacters: originalSurface.length,
    retainedCharacters: boundedText(originalSurface).length,
    complete: originalSurface.length <= 480,
    tokens: normalizedGroundingSurface(originalSurface).split(' ').filter((token) =>
      token.length > 1 && !SOURCE_STOP_WORDS.has(token)),
  })).filter((item) => item.surface);
}

function extractiveSummary(text, maximumSentences) {
  const sentences = sentenceUnits(text);
  const frequencies = new Map();
  for (const sentence of sentences) {
    for (const token of new Set(sentence.tokens)) {
      frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
    }
  }
  const scored = sentences.map((sentence) => {
    const lexical = sentence.tokens.reduce((sum, token) => sum + (frequencies.get(token) ?? 0), 0)
      / Math.max(1, sentence.tokens.length);
    const position = sentence.index === 0 ? 0.35 : 0.12 / (sentence.index + 1);
    return Object.freeze({ ...sentence, score: Number((lexical + position).toFixed(6)) });
  });
  const selected = scored.toSorted((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, maximumSentences).toSorted((left, right) => left.index - right.index);
  return Object.freeze({
    selected: Object.freeze(selected),
    omitted: Math.max(0, sentences.length - selected.length),
    complete: sentences.length <= maximumSentences && selected.every((item) => item.complete),
    truncatedSentences: sentences.filter((item) => !item.complete).length,
  });
}

function contentLimits(outputContract) {
  const length = outputContract.length;
  return Object.freeze({
    maximumEntries: length === 'brief' ? 3 : length === 'detailed' ? 12 : 6,
    maximumSourceSentences: length === 'brief' ? 2 : length === 'detailed' ? 8 : 4,
  });
}

function entryIdentity(entry) {
  return `${entry.kbId}@${entry.kbVersion ?? 'unversioned'}:${entry.recordId}`;
}

function citation(entry) {
  return `[${entry.kbId}${entry.kbVersion ? `@${entry.kbVersion}` : ''}; ${entry.recordId}]`;
}

function topicMatch(entry, topic) {
  const statement = normalizedGroundingSurface(entry.statement);
  const semanticValues = Object.values(entry.semantic ?? {}).flatMap((value) =>
    Array.isArray(value) ? value : [value]).filter((value) => ['string', 'number'].includes(typeof value))
    .map((value) => normalizedGroundingSurface(value));
  const searchableSurfaces = [statement, ...semanticValues].filter(Boolean);
  const searchableTokenSets = searchableSurfaces.map((surface) => new Set(surface.split(' ').filter(Boolean)));
  const topicSurface = normalizedGroundingSurface(topic.surface);
  const topicTokens = [...new Set([
    ...groundingTokens(topic.surface),
    ...groundingTerms(topic.surface, { maximumTerms: 32, maximumWords: 3 })
      .filter((term) => !term.includes(' ')),
  ])];
  const matchedTokens = topicTokens.filter((token) =>
    searchableTokenSets.some((tokens) => tokens.has(token)));
  const topicPhrase = topicSurface.split(' ').filter(Boolean);
  const exact = topicPhrase.length > 0 && searchableSurfaces.some((surface) => {
    const tokens = surface.split(' ').filter(Boolean);
    return tokens.some((_, index) => topicPhrase.every((token, offset) => tokens[index + offset] === token));
  });
  return Object.freeze({
    exact,
    matchedTokens: Object.freeze(matchedTokens),
    score: (exact ? 2 : 0) + matchedTokens.length / Math.max(1, topicTokens.length),
  });
}

function selectEntries(plan, grounding, maximumEntries) {
  const entries = grounding?.entries ?? [];
  const topics = plan.topics ?? [];
  const candidates = [];
  for (const entry of entries) {
    const matches = topics.map((topic) => ({ topic, match: topicMatch(entry, topic) }))
      .filter((item) => item.match.score > 0)
      .toSorted((left, right) => right.match.score - left.match.score
        || left.topic.topicId.localeCompare(right.topic.topicId));
    if (topics.length > 0 && matches.length === 0) continue;
    candidates.push(Object.freeze({
      entry,
      topicIds: Object.freeze(matches.map((item) => item.topic.topicId)),
      topicScore: matches[0]?.match.score ?? 0,
      selectionScore: Number(((entry.relevance?.score ?? 0) + (matches[0]?.match.score ?? 0)).toFixed(6)),
      reasons: Object.freeze([
        ...(matches[0]?.match.exact ? ['exact-topic-phrase'] : []),
        ...((matches[0]?.match.matchedTokens ?? []).map((token) => `topic-token:${token}`)),
        ...((entry.relevance?.reasons ?? []).map((reason) => `retrieval:${reason}`)),
      ]),
    }));
  }
  const ordered = candidates.toSorted((left, right) => right.selectionScore - left.selectionScore
    || entryIdentity(left.entry).localeCompare(entryIdentity(right.entry)));
  const selected = [];
  const seen = new Set();
  for (const topic of topics) {
    const candidate = ordered.find((item) => item.topicIds.includes(topic.topicId)
      && !seen.has(entryIdentity(item.entry)));
    if (candidate && selected.length < maximumEntries) {
      selected.push(candidate);
      seen.add(entryIdentity(candidate.entry));
    }
  }
  for (const candidate of ordered) {
    if (selected.length >= maximumEntries) break;
    if (seen.has(entryIdentity(candidate.entry))) continue;
    selected.push(candidate);
    seen.add(entryIdentity(candidate.entry));
  }
  return Object.freeze({
    selected: Object.freeze(selected),
    candidateEntryIds: Object.freeze(ordered.map((item) => entryIdentity(item.entry))),
    candidatesConsidered: candidates.length,
    unrelatedEntriesOmitted: entries.length - candidates.length,
    budgetOmitted: Math.max(0, candidates.length - selected.length),
  });
}

function groupedByTopic(plan, selected) {
  const groups = new Map(plan.topics.map((topic) => [topic.topicId, { topic, items: [] }]));
  for (const item of selected) {
    for (const topicId of item.topicIds) groups.get(topicId)?.items.push(item);
  }
  return [...groups.values()];
}

function titleFor(plan) {
  const topics = plan.topics.map((topic) => topic.surface).join(' and ');
  const artifact = plan.outputContract.artifact;
  return `${artifact[0].toLocaleUpperCase('en-US')}${artifact.slice(1)}${topics ? `: ${topics}` : ''}`;
}

function statementLine(item, prefix = '- ') {
  return `${prefix}${boundedText(item.entry.statement)} ${citation(item.entry)}`;
}

function renderTable(plan, selected) {
  const lines = ['| Topic | Retrieved KB statement | Source |', '|---|---|---|'];
  for (const item of selected) {
    const names = plan.topics.filter((topic) => item.topicIds.includes(topic.topicId))
      .map((topic) => topic.surface).join(', ') || 'general';
    const statement = boundedText(item.entry.statement).replaceAll('|', '\\|');
    lines.push(`| ${names.replaceAll('|', '\\|')} | ${statement} | ${citation(item.entry)} |`);
  }
  return lines;
}

function renderSource(summary, outputContract, intent) {
  if (!summary?.selected.length) return [];
  if (outputContract.format === 'table') {
    return [
      '| Supplied excerpt | Origin |',
      '|---|---|',
      ...summary.selected.map((item) =>
        `| ${item.surface.replaceAll('|', '\\|')} | supplied material |`),
    ];
  }
  if (intent === 'expand' || ['outline', 'bullets'].includes(outputContract.format)) {
    return summary.selected.map((item) => `- ${item.surface}`);
  }
  return [summary.selected.map((item) => item.surface).join(' ')];
}

function renderOutline(plan, selected) {
  const lines = [];
  for (const group of groupedByTopic(plan, selected)) {
    lines.push(`- ${group.topic.surface}`);
    for (const item of group.items) lines.push(statementLine(item, '  - '));
    if (group.items.length === 0) lines.push('  - No matching KB record was retrieved within this work policy.');
  }
  if (plan.topics.length === 0) for (const item of selected) lines.push(statementLine(item));
  return lines;
}

function renderSections(plan, selected) {
  const lines = [];
  const groups = groupedByTopic(plan, selected);
  if (groups.length === 0) {
    lines.push('## Retrieved evidence', ...selected.map((item) => statementLine(item)));
    return lines;
  }
  for (const group of groups) {
    lines.push(`## ${group.topic.surface}`);
    if (group.items.length === 0) {
      lines.push('No matching KB record was retrieved within this work policy.');
    } else {
      lines.push(...group.items.map((item) => statementLine(item)));
    }
  }
  return lines;
}

function correlationSummary(plan, selected) {
  if (plan.topics.length < 2) return null;
  const byPredicate = new Map();
  for (const item of selected) {
    const predicate = item.entry.semantic?.predicate ?? item.entry.semantic?.relation;
    if (!predicate) continue;
    const topics = byPredicate.get(predicate) ?? new Set();
    item.topicIds.forEach((topicId) => topics.add(topicId));
    byPredicate.set(predicate, topics);
  }
  const shared = [...byPredicate].filter(([, topics]) => topics.size > 1)
    .map(([predicate]) => String(predicate).replaceAll('_', ' ')).toSorted();
  return Object.freeze({
    sharedRelations: Object.freeze(shared),
    statement: shared.length > 0
      ? `The retrieved records share these explicit relation labels: ${shared.join(', ')}.`
      : 'The bounded retrieval did not expose one explicit relation label shared by every topic.',
  });
}

function publicEvidence(evidence) {
  return Object.freeze({
    selected: evidence.selected,
    candidatesConsidered: evidence.candidatesConsidered,
    unrelatedEntriesOmitted: evidence.unrelatedEntriesOmitted,
    budgetOmitted: evidence.budgetOmitted,
  });
}

function operationView(plan, operation) {
  const topicIds = new Set(operation.topicIds);
  return Object.freeze({
    ...plan,
    primaryIntent: operation.intent,
    topics: Object.freeze(plan.topics.filter((topic) => topicIds.has(topic.topicId))),
    outputContract: operation.outputContract,
  });
}

function hasCausalEvidence(evidence) {
  return evidence.selected.some((item) => /(?:cause|reason|intent|because)/iu.test(
    JSON.stringify(item.entry.semantic),
  ));
}

function operationGaps(operation, sourceSummary, evidence, correlation, grounding) {
  const gaps = [
    `Operation ${operation.order} produced a bounded extractive ${operation.intent} artifact; `
      + 'complete generative composition was not performed.',
  ];
  if (sourceSummary && !sourceSummary.complete) {
    gaps.push(`${sourceSummary.truncatedSentences} supplied sentence(s) exceeded the per-sentence excerpt cap, `
      + `or ${sourceSummary.omitted} sentence(s) exceeded this operation's output budget.`);
  }
  if (!grounding?.search?.complete) gaps.push('The related-evidence search was incomplete.');
  if (evidence.budgetOmitted > 0) {
    gaps.push(`${evidence.budgetOmitted} relevant record(s) exceeded this operation's output budget.`);
  }
  if (!sourceSummary?.selected.length && evidence.selected.length === 0) {
    gaps.push('No supplied sentence or matching KB record was available for this operation.');
  }
  if (operation.intent === 'explain' && !hasCausalEvidence(evidence)) {
    gaps.push('No explicit causal or reason relation was retrieved, so this operation invents no explanation.');
  }
  if (operation.intent === 'compare' && correlation?.sharedRelations.length === 0) {
    gaps.push('No explicit relation label was shared across the comparison topics.');
  }
  return Object.freeze(gaps);
}

function buildOperationArtifacts(plan, grounding) {
  const results = [];
  let remainingEntries = 32;
  for (const operation of plan.operationPlans) {
    const view = operationView(plan, operation);
    const remainingOperations = plan.operationPlans.length - results.length;
    const requestedEntries = contentLimits(operation.outputContract).maximumEntries;
    const maximumEntries = Math.min(requestedEntries,
      Math.max(1, remainingEntries - (remainingOperations - 1)));
    const sourceSummary = plan.sourceMaterial
      ? extractiveSummary(plan.sourceMaterial.text,
        contentLimits(operation.outputContract).maximumSourceSentences) : null;
    const privateEvidence = selectEntries(view, grounding, maximumEntries);
    remainingEntries -= privateEvidence.selected.length;
    const evidence = publicEvidence(privateEvidence);
    const correlation = operation.intent === 'compare'
      ? correlationSummary(view, evidence.selected) : null;
    const gaps = operationGaps(operation, sourceSummary, evidence, correlation, grounding);
    results.push(Object.freeze({
      artifact: Object.freeze({
        operationId: operation.operationId,
        order: operation.order,
        intent: operation.intent,
        topicIds: operation.topicIds,
        outputContract: operation.outputContract,
        sourceSummary,
        evidence,
        correlation,
        gaps,
        complete: false,
      }),
      candidateEntryIds: privateEvidence.candidateEntryIds,
      view,
    }));
  }
  return Object.freeze(results);
}

function mergeSelections(operationResults) {
  const selected = new Map();
  for (const { artifact } of operationResults) {
    for (const item of artifact.evidence.selected) {
      const identity = entryIdentity(item.entry);
      const previous = selected.get(identity);
      if (!previous) {
        selected.set(identity, item);
        continue;
      }
      selected.set(identity, Object.freeze({
        ...previous,
        topicIds: Object.freeze([...new Set([...previous.topicIds, ...item.topicIds])]),
        topicScore: Math.max(previous.topicScore, item.topicScore),
        selectionScore: Math.max(previous.selectionScore, item.selectionScore),
        reasons: Object.freeze([...new Set([...previous.reasons, ...item.reasons])]),
      }));
    }
  }
  return Object.freeze([...selected.values()]);
}

function aggregateEvidence(operationResults, grounding) {
  const selected = mergeSelections(operationResults);
  const candidateIds = new Set(operationResults.flatMap((item) => item.candidateEntryIds));
  return Object.freeze({
    selected,
    candidatesConsidered: candidateIds.size,
    unrelatedEntriesOmitted: Math.max(0, (grounding?.entries?.length ?? 0) - candidateIds.size),
    budgetOmitted: Math.max(0, candidateIds.size - selected.length),
  });
}

function renderOperation(lines, result, multiple) {
  const { artifact, view } = result;
  const topics = view.topics.map((topic) => topic.surface).join(' and ');
  if (multiple) {
    const label = `${artifact.intent[0].toLocaleUpperCase('en-US')}${artifact.intent.slice(1)}`;
    lines.push('', `## Obligation ${artifact.order}: ${label}${topics ? ` — ${topics}` : ''}`);
  }
  if (artifact.sourceSummary?.selected.length) {
    lines.push('', multiple ? '### Supplied material' : '## Supplied material');
    lines.push(...renderSource(artifact.sourceSummary, artifact.outputContract, artifact.intent));
  }
  if (artifact.evidence.selected.length) {
    const evidenceTitle = artifact.outputContract.format === 'table' ? 'Evidence table' : 'KB evidence';
    lines.push('', `${multiple ? '###' : '##'} ${evidenceTitle}`);
    if (artifact.outputContract.format === 'table') {
      lines.push(...renderTable(view, artifact.evidence.selected));
    } else if (['outline', 'bullets'].includes(artifact.outputContract.format)) {
      lines.push(...renderOutline(view, artifact.evidence.selected));
    } else if (artifact.outputContract.format === 'sections') {
      lines.push(...renderSections(view, artifact.evidence.selected).map((line) =>
        multiple && line.startsWith('## ') ? `###${line.slice(2)}` : line));
    } else {
      lines.push(...artifact.evidence.selected.map((item) => statementLine(item)));
    }
  }
  if (artifact.correlation) {
    lines.push('', `${multiple ? '###' : '##'} Correlation check`, artifact.correlation.statement);
  }
  if (multiple) {
    lines.push('', '### Obligation coverage gaps', ...artifact.gaps.map((gap) => `- ${gap}`));
  }
}

function boundedGaps(gaps) {
  const unique = [...new Set(gaps)];
  if (unique.length <= 64) return Object.freeze(unique);
  return Object.freeze([
    ...unique.slice(0, 63),
    `${unique.length - 63} additional gap(s) remain recorded in operationArtifacts.`,
  ]);
}

export function synthesizeHeuristicRequest(planResult, grounding) {
  if (planResult?.status !== 'PLANNED' || !planResult.selectedPlan) return null;
  const plan = planResult.selectedPlan;
  const operationResults = buildOperationArtifacts(plan, grounding);
  const operationArtifacts = Object.freeze(operationResults.map((item) => item.artifact));
  const evidence = aggregateEvidence(operationResults, grounding);
  const sourceSummary = operationArtifacts.length === 1
    ? operationArtifacts[0].sourceSummary
    : plan.sourceMaterial
      ? extractiveSummary(plan.sourceMaterial.text,
        contentLimits(plan.outputContract).maximumSourceSentences) : null;
  if (!sourceSummary?.selected.length && evidence.selected.length === 0) return null;
  const correlation = operationArtifacts.find((item) => item.correlation)?.correlation ?? null;
  const fullyPreserved = (plan.sourceMaterial?.complete ?? true) && (sourceSummary?.complete ?? true);
  const multiple = operationArtifacts.length > 1;
  const lines = [
    `# ${titleFor(plan)}`,
    '',
    `This is a bounded, source-grounded draft. It ${fullyPreserved ? 'preserves' : 'quotes bounded excerpts from'} `
      + 'supplied sentences and retrieved KB statements; '
      + 'it does not treat lexical relevance as proof or claim that the search was exhaustive.',
  ];
  operationResults.forEach((result) => renderOperation(lines, result, multiple));

  const aggregateGaps = [
    'This route produced a bounded extractive draft with explicit operation artifacts; '
      + 'complete generative composition was not performed.',
  ];
  if (plan.sourceMaterial && !plan.sourceMaterial.complete) {
    aggregateGaps.push(
      `Supplied material exceeded the ${plan.sourceMaterial.retainedCharacters}-character planning cap.`,
    );
  }
  if (sourceSummary && !sourceSummary.complete) {
    aggregateGaps.push(
      `${sourceSummary.truncatedSentences} supplied sentence(s) exceeded the per-sentence excerpt cap, `
        + `or ${sourceSummary.omitted} sentence(s) exceeded the requested output budget.`,
    );
  }
  if (planResult.receipt?.complete === false) {
    aggregateGaps.push(...(planResult.receipt.truncationReasons ?? []).map((reason) =>
      `Request planning was incomplete: ${reason}.`));
  }
  if (!grounding?.search?.complete) aggregateGaps.push('The related-evidence search was incomplete.');
  if (evidence.unrelatedEntriesOmitted > 0) {
    aggregateGaps.push(
      `${evidence.unrelatedEntriesOmitted} retrieved record(s) lacked direct topic overlap and were omitted.`,
    );
  }
  if (evidence.budgetOmitted > 0) {
    aggregateGaps.push(`${evidence.budgetOmitted} relevant record(s) exceeded the aggregate output budget.`);
  }
  const operationGaps = operationArtifacts.flatMap((item) =>
    item.gaps.slice(1).map((gap) => multiple ? `Operation ${item.order}: ${gap}` : gap));
  const gaps = boundedGaps([...aggregateGaps, ...operationGaps]);
  if (multiple) {
    lines.push('', '## Aggregate artifact',
      'The obligation sections above are the aggregate artifact, preserved in request order; '
        + 'no additional factual bridge was generated.');
  }
  lines.push('', multiple ? '## Aggregate coverage gaps' : '## Coverage gaps',
    ...gaps.map((gap) => `- ${gap}`));
  return Object.freeze({
    protocol: HEURISTIC_SYNTHESIS_PROTOCOL,
    status: 'PARTIAL',
    answer: lines.join('\n'),
    plan,
    claimMode: 'extractive-source-and-related-kb-draft',
    answerAuthority: 'related-evidence-is-not-entailment',
    operationArtifacts,
    sourceSummary,
    evidence,
    correlation,
    gaps: Object.freeze(gaps),
    contributingKbVersions: Object.freeze([...new Map(evidence.selected.flatMap((item) =>
      item.entry.contributingKbVersions.map((identity) => [
        `${identity.kbId}\u0000${identity.version ?? ''}`, identity,
      ]))).values()].toSorted((left, right) => left.kbId.localeCompare(right.kbId)
      || String(left.version).localeCompare(String(right.version)))),
  });
}
