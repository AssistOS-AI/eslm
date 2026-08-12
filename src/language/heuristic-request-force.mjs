const DISCOURSE_PREFIX = /^(?:(?:then|also|instead|next|finally|now)\b[\s,:-]*)*/iu;
const POLITE_PREFIX = /^please\b[\s,:-]*/iu;
const MODAL_REQUEST = /^(?:could|would|can|will)\s+you(?:\s+please)?\b[\s,:-]*/iu;
const DESIRE_REQUEST = /^i\s+(?:want|need|would\s+like|ask)\s+(?:you\s+)?(?:to\s+)?/iu;
const NEGATIVE_COMMAND = /^(?:do(?:es)?\s+not|do(?:es)n't|never|not\s+only)\b\s*/iu;
const WITHOUT_PREFIX = /^without\b[^,;.!?]{0,512},\s*/iu;

function skipMatch(text, start, expression) {
  const match = expression.exec(text.slice(start));
  return match ? start + match[0].length : start;
}

function commandHead(text, start = 0) {
  let cursor = skipMatch(text, start, DISCOURSE_PREFIX);
  cursor = skipMatch(text, cursor, POLITE_PREFIX);
  const framed = [
    ['operator-request', MODAL_REQUEST],
    ['artifact-request', DESIRE_REQUEST],
    ['negative-command', NEGATIVE_COMMAND],
  ];
  for (const [kind, expression] of framed) {
    const end = skipMatch(text, cursor, expression);
    if (end !== cursor) {
      cursor = skipMatch(text, end, POLITE_PREFIX);
      return Object.freeze({ start: cursor, kind });
    }
  }
  return Object.freeze({ start: cursor, kind: cursor > start ? 'modified-imperative' : 'imperative' });
}

function atOperationHead(text, start, match) {
  return match.span[0] >= start
    && /^(?:to\s+)?[\s,:-]*$/iu.test(text.slice(start, match.span[0]));
}

function atArtifactHead(text, start, match) {
  return match.span[0] >= start
    && /^(?:(?:a|an|the)\s+)?[\s,:-]*$/iu.test(text.slice(start, match.span[0]));
}

function nominalPleaseRequest(text, artifacts) {
  if (!/\bplease[.!?]?$/iu.test(text.trim())) return null;
  const artifact = artifacts.find((match) => atArtifactHead(text, 0, match));
  return artifact ? Object.freeze({ start: artifact.span[0], kind: 'nominal-please-request' }) : null;
}

export function classifyHeuristicRequestForce(text, matches) {
  const explicitOperations = matches.intents.filter((match) => match.family === 'explicit-operation');
  const heads = [commandHead(text)];
  const without = WITHOUT_PREFIX.exec(text);
  if (without) heads.push(commandHead(text, without[0].length));

  for (const head of heads) {
    if (explicitOperations.some((match) => atOperationHead(text, head.start, match))) {
      return Object.freeze({ accepted: true, kind: head.kind, anchor: head.start });
    }
    if (head.kind === 'artifact-request'
      && matches.artifacts.some((match) => atArtifactHead(text, head.start, match))) {
      return Object.freeze({ accepted: true, kind: head.kind, anchor: head.start });
    }
  }

  const questionHead = commandHead(text);
  if (/^why\b/iu.test(text.slice(questionHead.start))
    && matches.intents.some((match) => match.family === 'question-form')) {
    return Object.freeze({ accepted: true, kind: 'explicit-question', anchor: questionHead.start });
  }

  const nominal = nominalPleaseRequest(text, matches.artifacts);
  if (nominal) return Object.freeze({ accepted: true, kind: nominal.kind, anchor: nominal.start });
  return Object.freeze({ accepted: false, kind: 'no-request-force', anchor: null });
}
