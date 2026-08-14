export const LANGUAGE_AGENT_ACTIVITY_TEXT =
  'Thinking: requesting a bounded external language proposal…';

function seconds(milliseconds) {
  return Number.isFinite(milliseconds) ? `${Math.ceil(milliseconds / 1_000)}s` : 'the configured limit';
}

export function languageAgentActivityText(event = {}) {
  const operation = event.operation === 'translation' ? 'translation' : 'English simplification';
  const attempt = Number.isSafeInteger(event.attempt) ? event.attempt : 1;
  const maximumAttempts = Number.isSafeInteger(event.maximumAttempts) ? event.maximumAttempts : 3;
  return `Thinking: Language Agent ${operation} proposal ${attempt}/${maximumAttempts} — `
    + `external ${event.adapter ?? 'language'} call, timeout ${seconds(event.timeoutMs)}.`;
}

export function createLanguageAgentActivityHook(write, style) {
  if (typeof write !== 'function') {
    throw new TypeError('Language Agent activity output requires a writer function.');
  }
  if (!style || typeof style.dim !== 'function') {
    throw new TypeError('Language Agent activity output requires a terminal style.');
  }
  return (event) => write(`${style.dim(languageAgentActivityText(event))}\n`);
}

export function withLanguageAgentActivity(options, write, style) {
  return {
    ...options,
    onLanguageAgentInvocation: createLanguageAgentActivityHook(write, style),
  };
}
