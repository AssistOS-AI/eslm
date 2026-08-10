const ESC = '\u001b[';

export function createTerminalStyle(mode = 'auto', stream = process.stdout) {
  const normalized = String(mode ?? 'auto').toLocaleLowerCase('en-US');
  if (!['auto', 'always', 'never'].includes(normalized)) throw new Error('--color must be auto, always, or never.');
  const enabled = normalized === 'always' || (normalized === 'auto' && Boolean(stream.isTTY));
  const paint = (code, value) => enabled ? `${ESC}${code}m${value}${ESC}0m` : String(value);
  return Object.freeze({
    enabled,
    bold: (value) => paint('1', value), dim: (value) => paint('2', value),
    blue: (value) => paint('36', value), green: (value) => paint('32', value),
    yellow: (value) => paint('33', value), red: (value) => paint('31', value),
    magenta: (value) => paint('35', value), gray: (value) => paint('90', value),
    status(status, value = status) {
      if (status === 'ANSWERED') return paint('32', value);
      if (['UNKNOWN', 'AMBIGUOUS', 'INDUCTIVE', 'ABDUCTIVE'].includes(status)) return paint('33', value);
      if (['UNSUPPORTED', 'CONTRADICTED'].includes(status)) return paint('31', value);
      return paint('36', value);
    },
  });
}
