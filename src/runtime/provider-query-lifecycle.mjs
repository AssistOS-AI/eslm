function boundedDiagnostic(error) {
  return String(error?.message ?? error).slice(0, 240);
}

function providerIdentity(provider) {
  return {
    provider: provider?.manifest?.id,
    kbId: provider?.manifest?.kbId ?? provider?.manifest?.id,
    kbVersion: provider?.manifest?.kbVersion,
  };
}

function lifecycleDiagnostic(provider, operation, stage, error) {
  return Object.freeze({
    ...providerIdentity(provider),
    operation,
    stage,
    diagnostic: `Provider ${stage} failed: ${boundedDiagnostic(error)}`,
  });
}

/**
 * Run one optional provider operation as a complete begin/use/end transaction.
 * A failed begin, operation, or cleanup invalidates the whole contribution. The
 * caller receives bounded diagnostics instead of an exception or partial value.
 */
export async function runOptionalProviderQuery(provider, operation, execute) {
  const diagnostics = [];
  try {
    await provider.beginQuery?.();
  } catch (error) {
    diagnostics.push(lifecycleDiagnostic(provider, operation, 'beginQuery', error));
    try {
      await provider.endQuery?.();
    } catch (cleanupError) {
      diagnostics.push(lifecycleDiagnostic(provider, operation, 'endQuery', cleanupError));
    }
    return Object.freeze({ value: undefined, diagnostics: Object.freeze(diagnostics) });
  }

  let value;
  try {
    value = await execute();
  } catch (error) {
    diagnostics.push(lifecycleDiagnostic(provider, operation, 'operation', error));
  }

  try {
    await provider.endQuery?.();
  } catch (error) {
    diagnostics.push(lifecycleDiagnostic(provider, operation, 'endQuery', error));
  }

  return Object.freeze({
    value: diagnostics.length === 0 ? value : undefined,
    diagnostics: Object.freeze(diagnostics),
  });
}
