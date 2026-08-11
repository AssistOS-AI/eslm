export function languageAgentNormalizationEnabled(options = {}) {
  if (options['no-external-language-agent']) return false;
  if (Object.hasOwn(options, 'external-language-agent')) return options['external-language-agent'] !== false;
  return true;
}

export function withLanguageAgentNormalization(options, enabled) {
  return {
    ...options,
    'external-language-agent': Boolean(enabled),
    'no-external-language-agent': !enabled,
  };
}
