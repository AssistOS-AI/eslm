export const LANGUAGE_AGENT_ACTIVITY_TEXT =
  'Thinking: interpreting with the configured Language Agent…';

export function createLanguageAgentActivityHook(write, style) {
  if (typeof write !== 'function') {
    throw new TypeError('Language Agent activity output requires a writer function.');
  }
  if (!style || typeof style.dim !== 'function') {
    throw new TypeError('Language Agent activity output requires a terminal style.');
  }
  return () => write(`${style.dim(LANGUAGE_AGENT_ACTIVITY_TEXT)}\n`);
}

export function withLanguageAgentActivity(options, write, style) {
  return {
    ...options,
    onLanguageAgentInvocation: createLanguageAgentActivityHook(write, style),
  };
}
