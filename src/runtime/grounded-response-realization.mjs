import { normalizedGroundingSurface } from '../reasoning/grounding-query-focus.mjs';

export const GROUNDED_RESPONSE_REALIZATION_PROTOCOL = 'eslm-grounded-response-realization-v1';

export const RESULT_REALIZATION_STRATEGIES = Object.freeze({
  rhetoricalPlanner: 'strategy:result:rhetorical-section-planner@1',
  sourceSentence: 'strategy:result:source-summary-sentence@1',
  lexicalDefinition: 'strategy:result:lexical-definition-sentence@1',
  typedFact: 'strategy:result:typed-fact-sentence@1',
  defeasibleRelation: 'strategy:result:defeasible-relation-sentence@1',
  claimFusion: 'strategy:result:claim-fusion@1',
  comparisonBridge: 'strategy:result:comparison-bridge@1',
  coverageGap: 'strategy:result:coverage-gap-sentence@1',
  proseAssembly: 'strategy:result:prose-assembly@1',
  sectionedAssembly: 'strategy:result:sectioned-document-assembly@1',
  outlineAssembly: 'strategy:result:outline-assembly@1',
  tableAssembly: 'strategy:result:table-assembly@1',
});

const SMALL_TITLE_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to',
]);
const CAUSAL_RELATIONS = new Set([
  'because', 'causes', 'cause', 'hasreason', 'has_reason', 'motivation', 'reason', 'xintent',
  'xneed', 'xwant', 'oeffect', 'o effect', 'xeffect', 'x effect',
]);

function boundedSurface(value, maximum = 2_048) {
  const surface = String(value ?? '').normalize('NFKC').replace(/\s+/gu, ' ').trim();
  if (surface.length <= maximum) return surface;
  return `${surface.slice(0, maximum - 1)}…`;
}

function sentenceSurface(value) {
  const surface = boundedSurface(value);
  if (!surface) return '';
  return /[.!?][”’"']?$/u.test(surface) ? surface : `${surface}.`;
}

function titleSurface(value, fallback) {
  const words = boundedSurface(value, 240).split(/\s+/u).filter(Boolean);
  if (words.length === 0) return fallback;
  return words.map((word, index) => {
    const lower = word.toLocaleLowerCase('en-US');
    if (index > 0 && index < words.length - 1 && SMALL_TITLE_WORDS.has(lower)) return lower;
    return `${word[0].toLocaleUpperCase('en-US')}${word.slice(1)}`;
  }).join(' ');
}

function evidenceIdentity(entry) {
  return `${entry.kbId}@${entry.kbVersion ?? 'unversioned'}:${entry.recordId}`;
}

function evidenceLabel(entry) {
  return `${entry.kbId}${entry.kbVersion ? ` ${entry.kbVersion}` : ''}, ${entry.recordId}`;
}

function operationById(operationResults, operationId) {
  return operationResults.find(({ artifact }) => artifact.operationId === operationId);
}

function topicOrder(plan, lemma) {
  const surface = normalizedGroundingSurface(plan.topics.map((topic) => topic.surface).join(' '));
  const index = surface.split(' ').indexOf(normalizedGroundingSurface(lemma));
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}

function lexicalSentence(entry, ordinal) {
  const lemma = boundedSurface(entry.semantic.lemma, 96);
  const definition = boundedSurface(entry.semantic.definition, 480).replace(/[.!?]$/u, '');
  if (!lemma || !definition) return null;
  const prefix = ordinal === 0 ? 'The lexical evidence defines' : 'It also defines';
  return `${prefix} “${lemma}” as ${definition}.`;
}

function causalRelationSentence(entry) {
  const event = boundedSurface(entry.semantic.event ?? entry.semantic.subject, 160);
  const relation = boundedSurface(entry.semantic.relation ?? entry.semantic.predicate, 96)
    .replaceAll('_', ' ').replace(/([a-z])([A-Z])/gu, '$1 $2').toLocaleLowerCase('en-US');
  const value = boundedSurface(entry.semantic.value ?? entry.semantic.object, 240);
  if (!event || !relation || !value) return null;
  return `A defeasible relation in the retrieved evidence connects “${event}” to “${value}” through ${relation}.`;
}

function isDefeasible(entry) {
  return String(entry.epistemicStatus ?? '').includes('defeasible')
    || String(entry.semantic.kind ?? '').includes('defeasible');
}

function isCausal(entry) {
  const relation = normalizedGroundingSurface(entry.semantic.relation ?? entry.semantic.predicate ?? '');
  return CAUSAL_RELATIONS.has(relation) || [...CAUSAL_RELATIONS].some((item) => relation.includes(item));
}

function directTopicSupport(item) {
  return item.reasons.includes('exact-topic-phrase')
    || item.reasons.some((reason) => reason.startsWith('topic-token:'));
}

function realizeEvidenceClaims(plan, operationResults) {
  const candidates = operationResults.flatMap(({ artifact }) => artifact.evidence.selected.map((item) => ({
    item, operationId: artifact.operationId, intent: artifact.intent,
  })));
  const lexicalOrdinals = new Map();
  const seenLexicalLemmas = new Set();
  const claims = [];
  const citations = [];
  const citationByEvidence = new Map();
  const ordered = candidates.toSorted((left, right) => {
    const leftLemma = left.item.entry.semantic?.lemma;
    const rightLemma = right.item.entry.semantic?.lemma;
    if (leftLemma && rightLemma) return topicOrder(plan, leftLemma) - topicOrder(plan, rightLemma);
    return 0;
  });
  for (const candidate of ordered) {
    const { entry } = candidate.item;
    const identity = evidenceIdentity(entry);
    const base = {
      claimId: `claim:${claims.length + 1}`,
      operationId: candidate.operationId,
      sourceKind: 'kb-evidence',
      evidenceIdentity: identity,
      citationNumber: null,
    };
    let strategyId = RESULT_REALIZATION_STRATEGIES.typedFact;
    let status = 'realized';
    let confidence = Math.min(0.98, 0.62 + Math.min(0.3, candidate.item.topicScore / 10));
    let reason = 'direct-topic-fact';
    let sentence = sentenceSurface(entry.statement);
    if (entry.semantic?.kind === 'lexical-sense') {
      const lemma = normalizedGroundingSurface(entry.semantic.lemma);
      strategyId = RESULT_REALIZATION_STRATEGIES.lexicalDefinition;
      if (!lemma || seenLexicalLemmas.has(lemma) || !directTopicSupport(candidate.item)) {
        status = 'rejected';
        sentence = null;
        reason = seenLexicalLemmas.has(lemma)
          ? 'lower-ranked-sense-for-same-lemma' : 'lexical-sense-lacks-topic-support';
        confidence = 0;
      } else {
        const ordinal = lexicalOrdinals.get(candidate.operationId) ?? 0;
        sentence = lexicalSentence(entry, ordinal);
        lexicalOrdinals.set(candidate.operationId, ordinal + 1);
        seenLexicalLemmas.add(lemma);
        reason = 'topic-matched-lexical-definition';
        confidence = Math.min(0.98, 0.78 + Math.min(0.18, candidate.item.topicScore / 10));
      }
    } else if (isDefeasible(entry)) {
      strategyId = RESULT_REALIZATION_STRATEGIES.defeasibleRelation;
      if (candidate.intent !== 'explain' || !isCausal(entry)) {
        status = 'rejected';
        sentence = null;
        reason = 'defeasible-relation-not-required-by-supported-explanation';
        confidence = 0;
      } else {
        sentence = causalRelationSentence(entry);
        reason = 'causal-defeasible-relation';
        confidence = 0.58;
      }
    } else if (!directTopicSupport(candidate.item) || !sentence) {
      status = 'rejected';
      sentence = null;
      reason = 'fact-lacks-direct-topic-support';
      confidence = 0;
    }
    if (status === 'realized' && sentence) {
      let citationNumber = citationByEvidence.get(identity);
      if (!citationNumber) {
        citationNumber = citations.length + 1;
        citationByEvidence.set(identity, citationNumber);
        citations.push(Object.freeze({
          citationNumber, evidenceIdentity: identity, label: evidenceLabel(entry),
          statement: sentenceSurface(entry.statement),
        }));
      }
      claims.push(Object.freeze({
        ...base, strategyId, status, confidence: Number(confidence.toFixed(6)), reason, sentence,
        citationNumber,
      }));
    } else {
      claims.push(Object.freeze({
        ...base, strategyId, status: 'rejected', confidence: 0, reason, sentence: null,
      }));
    }
  }
  return Object.freeze({ claims: Object.freeze(claims), citations: Object.freeze(citations) });
}

function realizeSourceClaims(operationResults, startingIndex) {
  const claims = [];
  for (const { artifact } of operationResults) {
    for (const selected of artifact.sourceSummary?.selected ?? []) {
      claims.push(Object.freeze({
        claimId: `claim:${startingIndex + claims.length + 1}`,
        operationId: artifact.operationId,
        sourceKind: 'supplied-sentence',
        evidenceIdentity: `supplied-sentence:${selected.index}`,
        citationNumber: null,
        strategyId: RESULT_REALIZATION_STRATEGIES.sourceSentence,
        status: 'realized',
        confidence: selected.complete ? 0.98 : 0.7,
        reason: selected.complete ? 'complete-supplied-sentence' : 'bounded-supplied-excerpt',
        sentence: sentenceSurface(selected.surface),
      }));
    }
  }
  return Object.freeze(claims);
}

function citationMarkers(claims) {
  const numbers = [...new Set(claims.map((claim) => claim.citationNumber).filter(Boolean))];
  return numbers.map((number) => `[${number}]`).join('');
}

function fuseSimpleFacts(claims) {
  if (claims.length !== 2 || claims.some((claim) => claim.strategyId
    !== RESULT_REALIZATION_STRATEGIES.typedFact)) return null;
  const [left, right] = claims.map((claim) => claim.sentence);
  const leftMatch = /^(.+?) is (.+)\.$/u.exec(left);
  const rightMatch = /^(.+?) (can|has) (.+)\.$/u.exec(right);
  if (!leftMatch || !rightMatch || leftMatch[1] !== rightMatch[1]) return null;
  return `${leftMatch[1]} is ${leftMatch[2]} and ${rightMatch[2]} ${rightMatch[3]}. ${citationMarkers(claims)}`.trim();
}

function proseForClaims(claims) {
  const fused = fuseSimpleFacts(claims);
  if (fused) return Object.freeze({
    surface: fused, strategyId: RESULT_REALIZATION_STRATEGIES.claimFusion,
  });
  return Object.freeze({
    surface: claims.map((claim) => `${claim.sentence}${claim.citationNumber
      ? ` [${claim.citationNumber}]` : ''}`).join(' '),
    strategyId: claims.length > 1
      ? RESULT_REALIZATION_STRATEGIES.claimFusion : claims[0]?.strategyId,
  });
}

function sectionHeading(plan, artifact, multiple) {
  if (!multiple) return plan.outputContract.format === 'sections' ? 'Overview' : null;
  const label = `${artifact.intent[0].toLocaleUpperCase('en-US')}${artifact.intent.slice(1)}`;
  const topics = plan.topics.filter((topic) => artifact.topicIds.includes(topic.topicId))
    .map((topic) => topic.surface).join(' and ');
  return `${label}${topics ? `: ${topics}` : ''}`;
}

function meaningfulLimitSentences(plan, operationResults, claims, grounding, sourceSummary, gaps) {
  const sentences = [];
  const realized = claims.filter((claim) => claim.status === 'realized');
  const suppliedRealized = realized.some((claim) => claim.sourceKind === 'supplied-sentence');
  const rejected = claims.filter((claim) => claim.status === 'rejected');
  const lexicalOnly = realized.length > 0 && realized.every((claim) =>
    claim.strategyId === RESULT_REALIZATION_STRATEGIES.lexicalDefinition);
  if (operationResults.some(({ artifact }) => artifact.intent === 'explain'
    && !artifact.evidence.selected.some(({ entry }) => isCausal(entry)))) {
    sentences.push('The retrieved evidence does not contain an explicit causal relation, so no cause is invented.');
  }
  if (lexicalOnly && ['compose', 'expand'].includes(plan.primaryIntent)) {
    sentences.push('These definitions establish the requested vocabulary, but they do not describe the broader processes or conditions that a fuller document would require.');
  }
  if (rejected.length > 0 && !suppliedRealized) {
    sentences.push('Some retrieved records were not used because they did not support a sufficiently direct claim for this output.');
  }
  if (grounding?.search?.complete === false) {
    sentences.push('The evidence search was bounded and incomplete, so the answer is not exhaustive.');
  }
  if (sourceSummary && !sourceSummary.complete) {
    sentences.push('Only bounded excerpts of the supplied material fit within the selected output policy.');
  }
  if (gaps.some((gap) => gap.includes('Request planning was incomplete:'))) {
    sentences.push('The request plan reached its operation budget, so the answer does not cover every requested operation.');
  }
  return Object.freeze([...new Set(sentences)]);
}

function assemblyStrategy(format) {
  if (format === 'table') return RESULT_REALIZATION_STRATEGIES.tableAssembly;
  if (['outline', 'bullets'].includes(format)) return RESULT_REALIZATION_STRATEGIES.outlineAssembly;
  if (format === 'sections') return RESULT_REALIZATION_STRATEGIES.sectionedAssembly;
  return RESULT_REALIZATION_STRATEGIES.proseAssembly;
}

function assembleAnswer(plan, operationResults, claims, citations, limitSentences, correlation) {
  const lines = [];
  const titleTopic = plan.topics.map((topic) => topic.surface).join(' and ');
  const title = titleSurface(titleTopic, titleSurface(plan.outputContract.artifact, 'Answer'));
  if (!['summary', 'paragraph'].includes(plan.outputContract.artifact)) lines.push(`# ${title}`, '');
  const paragraphs = [];
  const sections = [];
  const multiple = operationResults.length > 1;
  for (const { artifact } of operationResults) {
    const operationClaims = claims.filter((claim) =>
      claim.operationId === artifact.operationId && claim.status === 'realized');
    if (operationClaims.length === 0) continue;
    const sectionId = `section:${sections.length + 1}`;
    const heading = sectionHeading(plan, artifact, multiple);
    sections.push(Object.freeze({
      sectionId, heading, purpose: artifact.intent,
      claimIds: Object.freeze(operationClaims.map((claim) => claim.claimId)),
    }));
    if (heading) lines.push(`## ${heading}`, '');
    if (artifact.outputContract.format === 'table') {
      lines.push('| Supported statement | Evidence |', '|---|---|');
      const renderedRows = [];
      for (const claim of operationClaims) {
        const marker = claim.citationNumber ? `[${claim.citationNumber}]` : 'supplied material';
        const row = `| ${claim.sentence.replaceAll('|', '\\|')} | ${marker} |`;
        renderedRows.push(row);
        lines.push(row);
      }
      paragraphs.push(Object.freeze({
        paragraphId: `paragraph:${paragraphs.length + 1}`, sectionId,
        strategyId: RESULT_REALIZATION_STRATEGIES.tableAssembly,
        claimIds: Object.freeze(operationClaims.map((claim) => claim.claimId)),
        surface: renderedRows.join('\n'),
      }));
    } else if (['outline', 'bullets'].includes(artifact.outputContract.format)) {
      const renderedItems = [];
      for (const claim of operationClaims) {
        const item = `- ${claim.sentence}${claim.citationNumber ? ` [${claim.citationNumber}]` : ''}`;
        renderedItems.push(item);
        lines.push(item);
      }
      paragraphs.push(Object.freeze({
        paragraphId: `paragraph:${paragraphs.length + 1}`, sectionId,
        strategyId: RESULT_REALIZATION_STRATEGIES.outlineAssembly,
        claimIds: Object.freeze(operationClaims.map((claim) => claim.claimId)),
        surface: renderedItems.join('\n'),
      }));
    } else {
      const prose = proseForClaims(operationClaims);
      lines.push(prose.surface);
      paragraphs.push(Object.freeze({
        paragraphId: `paragraph:${paragraphs.length + 1}`, sectionId,
        strategyId: prose.strategyId,
        claimIds: Object.freeze(operationClaims.map((claim) => claim.claimId)),
        surface: prose.surface,
      }));
    }
    lines.push('');
  }
  if (correlation) {
    const comparisonClaims = claims.filter((claim) => claim.status === 'realized'
      && operationResults.some(({ artifact }) => artifact.intent === 'compare'
        && artifact.operationId === claim.operationId));
    const sectionId = `section:${sections.length + 1}`;
    sections.push(Object.freeze({
      sectionId, heading: 'Comparison', purpose: 'compare-supported-relations',
      claimIds: Object.freeze(comparisonClaims.map((claim) => claim.claimId)),
    }));
    lines.push('## Comparison', '', sentenceSurface(correlation.statement), '');
    paragraphs.push(Object.freeze({
      paragraphId: `paragraph:${paragraphs.length + 1}`, sectionId,
      strategyId: RESULT_REALIZATION_STRATEGIES.comparisonBridge,
      claimIds: Object.freeze(comparisonClaims.map((claim) => claim.claimId)),
      surface: sentenceSurface(correlation.statement),
    }));
  }
  if (limitSentences.length > 0) {
    const sectionId = `section:${sections.length + 1}`;
    sections.push(Object.freeze({
      sectionId, heading: 'Evidence limits', purpose: 'state-supported-boundary', claimIds: Object.freeze([]),
    }));
    lines.push('## Evidence limits', '', limitSentences.join(' '), '');
    paragraphs.push(Object.freeze({
      paragraphId: `paragraph:${paragraphs.length + 1}`, sectionId,
      strategyId: RESULT_REALIZATION_STRATEGIES.coverageGap,
      claimIds: Object.freeze([]), surface: limitSentences.join(' '),
    }));
  }
  if (citations.length > 0) {
    lines.push('## Sources', '');
    citations.forEach((item) => lines.push(
      `${item.citationNumber}. ${item.statement} (${item.label})`,
    ));
  }
  return Object.freeze({
    answer: lines.join('\n').trim(), title, sections: Object.freeze(sections),
    paragraphs: Object.freeze(paragraphs),
  });
}

export function requiredGroundedResponseStrategies(plan, grounding) {
  const required = new Set([
    RESULT_REALIZATION_STRATEGIES.rhetoricalPlanner,
    RESULT_REALIZATION_STRATEGIES.coverageGap,
    assemblyStrategy(plan.outputContract.format),
  ]);
  if (plan.sourceMaterial) {
    required.add(RESULT_REALIZATION_STRATEGIES.sourceSentence);
    required.add(RESULT_REALIZATION_STRATEGIES.claimFusion);
  }
  for (const entry of grounding?.entries ?? []) {
    if (entry.semantic?.kind === 'lexical-sense') required.add(RESULT_REALIZATION_STRATEGIES.lexicalDefinition);
    else if (isDefeasible(entry)) required.add(RESULT_REALIZATION_STRATEGIES.defeasibleRelation);
    else required.add(RESULT_REALIZATION_STRATEGIES.typedFact);
  }
  if ((grounding?.entries?.length ?? 0) > 1) required.add(RESULT_REALIZATION_STRATEGIES.claimFusion);
  if (plan.operations.includes('compare')) required.add(RESULT_REALIZATION_STRATEGIES.comparisonBridge);
  return Object.freeze([...required]);
}

export function realizeGroundedResponse({
  plan, operationResults, evidence, sourceSummary, correlation, gaps, grounding,
}) {
  const evidenceResult = realizeEvidenceClaims(plan, operationResults);
  const sourceClaims = realizeSourceClaims(operationResults, evidenceResult.claims.length);
  const claims = Object.freeze([...sourceClaims, ...evidenceResult.claims].map((claim, index) =>
    Object.freeze({ ...claim, claimId: `claim:${index + 1}` })));
  const realizedClaims = claims.filter((claim) => claim.status === 'realized');
  if (realizedClaims.length === 0) return null;
  const limitSentences = meaningfulLimitSentences(
    plan, operationResults, claims, grounding, sourceSummary, gaps,
  );
  const assembly = assembleAnswer(
    plan, operationResults, claims, evidenceResult.citations, limitSentences, correlation,
  );
  const strategyTrace = [...new Set([
    RESULT_REALIZATION_STRATEGIES.rhetoricalPlanner,
    ...claims.map((claim) => claim.strategyId),
    ...assembly.paragraphs.map((paragraph) => paragraph.strategyId),
    ...(correlation ? [RESULT_REALIZATION_STRATEGIES.comparisonBridge] : []),
    assemblyStrategy(plan.outputContract.format),
  ])];
  const confidence = realizedClaims.reduce((sum, claim) => sum + claim.confidence, 0)
    / realizedClaims.length;
  return Object.freeze({
    protocol: GROUNDED_RESPONSE_REALIZATION_PROTOCOL,
    rhetoricalPlan: Object.freeze({
      artifact: plan.outputContract.artifact,
      format: plan.outputContract.format,
      length: plan.outputContract.length,
      title: assembly.title,
      sections: assembly.sections,
    }),
    claims,
    paragraphs: assembly.paragraphs,
    citations: evidenceResult.citations,
    strategyTrace: Object.freeze(strategyTrace),
    confidence: Number(confidence.toFixed(6)),
    confidenceKind: 'construction-evidence-coverage',
    coverage: Object.freeze({
      evidenceConsidered: claims.filter((claim) => claim.sourceKind === 'kb-evidence').length,
      evidenceRealized: claims.filter((claim) =>
        claim.sourceKind === 'kb-evidence' && claim.status === 'realized').length,
      evidenceRejected: claims.filter((claim) =>
        claim.sourceKind === 'kb-evidence' && claim.status === 'rejected').length,
      suppliedSentencesRealized: sourceClaims.length,
      complete: false,
      reasons: Object.freeze(gaps),
    }),
    answer: assembly.answer,
  });
}

export function reproduceGroundedResponseRealization(synthesis) {
  return realizeGroundedResponse({
    plan: synthesis.plan,
    operationResults: synthesis.operationArtifacts.map((artifact) => ({ artifact })),
    evidence: synthesis.evidence,
    sourceSummary: synthesis.sourceSummary,
    correlation: synthesis.correlation,
    gaps: synthesis.gaps,
    grounding: {
      search: {
        complete: !synthesis.gaps.includes('The related-evidence search was incomplete.'),
      },
    },
  });
}
