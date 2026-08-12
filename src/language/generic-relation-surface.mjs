const STRUCTURAL_OBJECT_WORDS = new Set([
  'all', 'and', 'are', 'because', 'before', 'but', 'can', 'could', 'did', 'do', 'does',
  'every', 'if', 'is', 'may', 'might', 'must', 'not', 'or', 'should', 'than', 'then',
  'unless', 'until', 'was', 'were', 'when', 'while', 'will', 'would',
]);

export function genericRelationObjectSurface(value) {
  const normalized = String(value ?? '').normalize('NFKC').toLocaleLowerCase('en-US')
    .replace(/^(?:the|a|an)\s+/u, '').trim();
  if (!normalized || /[^\p{L}\p{N}_'’\- ]/u.test(normalized)) return undefined;
  const tokens = normalized.split(/\s+/u).filter(Boolean);
  if (tokens.length < 1 || tokens.length > 6 || tokens.some((token) =>
    STRUCTURAL_OBJECT_WORDS.has(token))) return undefined;
  return tokens.join('_');
}
