function runtimeWorkPolicy(engine) {
  return engine?.workPolicy ?? engine?.runtime?.workPolicy;
}

function loadedSourceCount(engine) {
  if (Array.isArray(engine?.providers)) return engine.providers.length;
  if (Array.isArray(engine?.selected)) return engine.selected.length;
  return 0;
}

export function symbolicProcessingActivityText(engine) {
  const policy = runtimeWorkPolicy(engine);
  const limits = policy?.effective?.limits;
  if (!limits) return 'Thinking: bounded symbolic processing started.';
  return `Thinking: bounded symbolic processing started — ${policy.effective.profile}; `
    + `up to ${limits.maximumHeuristicCandidates} local interpretations, `
    + `${limits.maximumHeuristicReparses} reparses, ${loadedSourceCount(engine)} loaded KB source(s), `
    + `and ${limits.maximumGroundingLookups} context lookups.`;
}

export function writeSymbolicProcessingActivity(engine, write, style) {
  if (typeof write !== 'function') {
    throw new TypeError('Symbolic processing activity output requires a writer function.');
  }
  if (!style || typeof style.dim !== 'function') {
    throw new TypeError('Symbolic processing activity output requires a terminal style.');
  }
  write(`${style.dim(symbolicProcessingActivityText(engine))}\n`);
}
