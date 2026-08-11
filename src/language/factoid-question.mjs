const MAX_FACTOID_CHARACTERS = 4096;

function cleanSurface(value) {
  return value.normalize('NFKC').replace(/\s+/gu, ' ').trim().replace(/[?.!]+$/u, '');
}

function freezeCandidate(text, derivation) {
  return Object.freeze({ text: `${cleanSurface(text)}?`, derivation });
}

function whType(value) {
  return value.toLocaleLowerCase('en-US').replace(/\s+/gu, '-');
}

function genericFrame(sourceText, fields, candidateTexts = []) {
  const seen = new Set();
  const candidates = [];
  for (const [text, derivation] of [[sourceText, 'original'], ...candidateTexts]) {
    const candidate = freezeCandidate(text, derivation);
    const key = candidate.text.toLocaleLowerCase('en-US');
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(candidate);
  }
  return Object.freeze({
    format: 'eslm-factoid-question-v1',
    kind: 'factoid-question',
    operation: 'retrieve-semantic-values',
    sourceText: `${cleanSurface(sourceText)}?`,
    ...fields,
    candidates: Object.freeze(candidates),
  });
}

/**
 * Compile a bounded English factoid question into a provider-independent frame.
 * Surface relation names remain data: this frontend does not know which KB, if any,
 * can provide evidence for the requested value.
 */
export function parseFactoidQuestion(text) {
  if (typeof text !== 'string') return undefined;
  const clean = cleanSurface(text);
  if (clean.length === 0 || clean.length > MAX_FACTOID_CHARACTERS) return undefined;

  let match = clean.match(/^(?:what is the meaning of|what does) (.+?)(?: mean)?$/iu)
    ?? clean.match(/^define (.+)$/iu);
  if (match) {
    const subjectSurface = cleanSurface(match[1]);
    return genericFrame(clean, {
      wh: 'what', construction: 'definition', direction: 'forward',
      relationSurface: 'definition', subjectSurface,
    }, [[`What does ${subjectSurface} mean`, 'definition-paraphrase']]);
  }

  match = clean.match(/^(what|which|who) (?:is|are) the (.+?) of (.+)$/iu);
  if (match) {
    return genericFrame(clean, {
      wh: whType(match[1]), construction: 'property-of', direction: 'forward',
      relationSurface: cleanSurface(match[2]), subjectSurface: cleanSurface(match[3]),
    });
  }

  match = clean.match(/^(what|which) (?:is|are) (.+?)[’']s (.+)$/iu);
  if (match) {
    const subjectSurface = cleanSurface(match[2]);
    const relationSurface = cleanSurface(match[3]);
    return genericFrame(clean, {
      wh: whType(match[1]), construction: 'possessive-property', direction: 'forward',
      relationSurface, subjectSurface,
    }, [[`What is the ${relationSurface} of ${subjectSurface}`, 'possessive-to-property-of']]);
  }

  match = clean.match(/^(what|which) (.+?) (?:does|do) (.+?) have$/iu);
  if (match) {
    const relationSurface = cleanSurface(match[2]);
    const subjectSurface = cleanSurface(match[3]);
    return genericFrame(clean, {
      wh: whType(match[1]), construction: 'property-have', direction: 'forward',
      relationSurface, subjectSurface,
    }, [[`What is the ${relationSurface} of ${subjectSurface}`, 'have-to-property-of']]);
  }

  match = clean.match(/^(?:tell|give|show) me (?:the )?(.+?) of (.+)$/iu);
  if (match) {
    const relationSurface = cleanSurface(match[1]);
    const subjectSurface = cleanSurface(match[2]);
    return genericFrame(clean, {
      wh: 'what', construction: 'property-request', direction: 'forward',
      relationSurface, subjectSurface,
    }, [[`What is the ${relationSurface} of ${subjectSurface}`, 'request-to-property-of']]);
  }

  match = clean.match(/^(?:where can (.+?) be (?:found|located)|in what country (?:is|are) (.+?)(?: located)?)$/iu);
  if (match) {
    const subjectSurface = cleanSurface(match[1] ?? match[2]);
    return genericFrame(clean, {
      wh: 'where', construction: 'location', direction: 'forward',
      relationSurface: 'location', subjectSurface,
    }, [[`Where is ${subjectSurface} located`, 'location-paraphrase']]);
  }

  match = clean.match(/^what can (.+?) be used for$/iu);
  if (match) {
    const subjectSurface = cleanSurface(match[1]);
    return genericFrame(clean, {
      wh: 'what', construction: 'relation-value', direction: 'forward',
      relationSurface: 'used for', subjectSurface,
    }, [[`What is ${subjectSurface} used for`, 'passive-use-paraphrase']]);
  }

  match = clean.match(/^(?:what comes next after|what follows) (.+)$/iu);
  if (match) {
    const subjectSurface = cleanSurface(match[1]);
    return genericFrame(clean, {
      wh: 'what', construction: 'event-continuation', direction: 'forward',
      relationSurface: 'possible effect', subjectSurface,
    }, [[`What might happen after ${subjectSurface}`, 'event-continuation-paraphrase']]);
  }

  match = clean.match(/^(who|what|which|where|when|how many|how much)\b(.+)$/iu);
  if (!match) return undefined;
  return genericFrame(clean, {
    wh: whType(match[1]), construction: 'open-relation', direction: 'unspecified',
    relationSurface: cleanSurface(match[2]), subjectSurface: undefined,
  });
}
