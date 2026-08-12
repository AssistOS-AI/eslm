const STABLE_SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;
const RANGE_TOKEN_PATTERN = /^(<=|>=|<|>|=)?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

export function parseStableSemver(value, label = 'Version') {
  const match = typeof value === 'string' ? STABLE_SEMVER_PATTERN.exec(value) : undefined;
  requireValue(match, `${label} must be a stable semantic version (major.minor.patch).`);
  const version = match.slice(1).map(Number);
  requireValue(version.every(Number.isSafeInteger), `${label} contains an unsafe numeric component.`);
  return Object.freeze(version);
}

function compareSemver(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] < right[index] ? -1 : 1;
  }
  return 0;
}

function incrementForCaret(version) {
  if (version[0] > 0) return [version[0] + 1, 0, 0];
  if (version[1] > 0) return [0, version[1] + 1, 0];
  return [0, 0, version[2] + 1];
}

function testComparator(version, operator, boundary) {
  const comparison = compareSemver(version, boundary);
  if (operator === '>') return comparison > 0;
  if (operator === '>=') return comparison >= 0;
  if (operator === '<') return comparison < 0;
  if (operator === '<=') return comparison <= 0;
  return comparison === 0;
}

function parseRange(rangeText) {
  requireValue(typeof rangeText === 'string' && rangeText.length > 0 && rangeText.length <= 128
    && rangeText === rangeText.trim(), 'Dependency versionRange must be a bounded plain string.');
  requireValue(!rangeText.includes('||') && !/[xX*]/u.test(rangeText),
    `Unsupported dependency version range: ${rangeText}.`);
  if (rangeText.startsWith('^') || rangeText.startsWith('~')) {
    const floor = parseStableSemver(rangeText.slice(1), 'Dependency versionRange');
    const ceiling = rangeText[0] === '^' ? incrementForCaret(floor) : [floor[0], floor[1] + 1, 0];
    requireValue(ceiling.every(Number.isSafeInteger),
      `Dependency version range upper bound is numerically unsafe: ${rangeText}.`);
    return Object.freeze([{ operator: '>=', boundary: floor }, { operator: '<', boundary: ceiling }]);
  }
  const tokens = rangeText.split(/\s+/u);
  requireValue(tokens.length >= 1 && tokens.length <= 4, `Unsupported dependency version range: ${rangeText}.`);
  return Object.freeze(tokens.map((token) => {
    const match = RANGE_TOKEN_PATTERN.exec(token);
    requireValue(match, `Unsupported dependency version comparator: ${token}.`);
    const boundary = match.slice(2).map(Number);
    requireValue(boundary.every(Number.isSafeInteger),
      `Dependency version comparator is numerically unsafe: ${token}.`);
    return Object.freeze({ operator: match[1] ?? '=', boundary: Object.freeze(boundary) });
  }));
}

export function assertSupportedVersionRange(rangeText) {
  parseRange(rangeText);
  return rangeText;
}

export function satisfiesVersionRange(versionText, rangeText) {
  const version = parseStableSemver(versionText, 'KB version');
  return parseRange(rangeText).every(({ operator, boundary }) => testComparator(version, operator, boundary));
}
