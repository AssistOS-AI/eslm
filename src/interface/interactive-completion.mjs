const COMMANDS = Object.freeze([
  '/help', '/kbs', '/load ', '/unload ', '/model', '/memory', '/work', '/normalize', '/examples ', '/smoke ',
  '/trace', '/profile', '/clear', '/quit', '/exit',
]);

const ARGUMENTS = Object.freeze({
  '/normalize ': Object.freeze(['on', 'off']),
  '/memory ': Object.freeze(['auto', 'eager', 'lazy']),
  '/work ': Object.freeze(['quick', 'balanced', 'deep', 'exhaustive-bounded']),
});

function matches(values, prefix) {
  return values.filter((value) => value.startsWith(prefix));
}

function knowledgeBaseCompletion(line, command, kbIds) {
  const value = line.slice(command.length);
  const separator = value.lastIndexOf(',');
  const fixed = separator < 0 ? '' : value.slice(0, separator + 1);
  const prefix = value.slice(separator + 1).trimStart();
  const candidates = matches(['all', ...kbIds], prefix).map((id) => `${command}${fixed}${id}`);
  return [candidates.length ? candidates : [line], line];
}

export function interactiveCompletions(line, kbIds = []) {
  if (!line.startsWith('/')) return [[], line];
  for (const [command, values] of Object.entries(ARGUMENTS)) {
    if (line.startsWith(command)) {
      const prefix = line.slice(command.length);
      const candidates = matches(values, prefix).map((value) => `${command}${value}`);
      return [candidates.length ? candidates : [line], line];
    }
  }
  for (const command of ['/load ', '/unload ']) {
    if (line.startsWith(command)) return knowledgeBaseCompletion(line, command, [...new Set(kbIds)].sort());
  }
  const candidates = matches(COMMANDS, line);
  return [candidates.length ? candidates : [line], line];
}

export function interactiveCommandCatalog() {
  return [...COMMANDS];
}
