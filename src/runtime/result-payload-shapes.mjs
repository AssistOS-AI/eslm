const MAX_IDENTIFIER_CHARACTERS = 256;
const MAX_RESULT_ITEM_DEPTH = 32;
const MAX_RESULT_ITEM_NODES = 65_536;
const MAX_RESULT_STRING_BYTES = 64 * 1024;

export const MAX_RESULT_ARRAY_ITEMS = 4_096;
export const MAX_RESULT_ARRAY_BYTES = 4 * 1024 * 1024;

export function record(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object.`);
  }
  return value;
}

export function exactKeys(value, allowed, path) {
  const extras = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extras.length > 0) throw new TypeError(`${path} contains unsupported field ${extras[0]}.`);
}

export function string(value, path, maximumCharacters = MAX_IDENTIFIER_CHARACTERS) {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximumCharacters
    || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) {
    throw new TypeError(`${path} must be non-empty bounded text.`);
  }
  return value;
}

export function text(value, path, maximumCharacters) {
  if (typeof value !== 'string' || value.length > maximumCharacters || /\0/u.test(value)) {
    throw new TypeError(`${path} must be bounded text.`);
  }
  return value;
}

export function boolean(value, path) {
  if (typeof value !== 'boolean') throw new TypeError(`${path} must be a boolean.`);
  return value;
}

export function integer(value, path, maximum, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new TypeError(`${path} must be a safe integer from ${minimum} through ${maximum}.`);
  }
  return value;
}

export function finite(value, path, minimum = -Number.MAX_VALUE, maximum = Number.MAX_VALUE) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new TypeError(`${path} must be a finite number from ${minimum} through ${maximum}.`);
  }
  return value;
}

export function array(value, path, maximumItems) {
  if (!Array.isArray(value) || value.length > maximumItems) {
    throw new TypeError(`${path} must be an array with at most ${maximumItems} items.`);
  }
  return value;
}

export function jsonBytes(value, path, maximumBytes) {
  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new TypeError(`${path} must be JSON-serializable.`);
  }
  if (serialized === undefined || Buffer.byteLength(serialized, 'utf8') > maximumBytes) {
    throw new TypeError(`${path} exceeds its ${maximumBytes}-byte JSON limit.`);
  }
  return serialized;
}

export function boundedJson(value, path, maximumBytes) {
  jsonBytes(value, path, maximumBytes);
  let nodes = 0;
  const visit = (item, depth) => {
    nodes += 1;
    if (nodes > MAX_RESULT_ITEM_NODES || depth > MAX_RESULT_ITEM_DEPTH) {
      throw new TypeError(`${path} exceeds its structural limit.`);
    }
    if (typeof item === 'number' && !Number.isFinite(item)) {
      throw new TypeError(`${path} contains a non-finite number.`);
    }
    if (typeof item === 'bigint' || typeof item === 'function' || typeof item === 'symbol') {
      throw new TypeError(`${path} contains a non-JSON value.`);
    }
    if (typeof item === 'string' && Buffer.byteLength(item, 'utf8') > MAX_RESULT_STRING_BYTES) {
      throw new TypeError(`${path} contains an oversized string.`);
    }
    if (Array.isArray(item)) {
      if (item.length > MAX_RESULT_ARRAY_ITEMS) throw new TypeError(`${path} contains an oversized array.`);
      item.forEach((child) => visit(child, depth + 1));
    } else if (item && typeof item === 'object') {
      const entries = Object.entries(item);
      if (entries.length > MAX_RESULT_ARRAY_ITEMS) throw new TypeError(`${path} contains too many fields.`);
      entries.forEach(([key, child]) => {
        string(key, `${path} field name`);
        visit(child, depth + 1);
      });
    }
  };
  visit(value, 0);
}

export function stringArray(value, path, maximumItems, maximumCharacters = MAX_IDENTIFIER_CHARACTERS) {
  array(value, path, maximumItems).forEach((item, index) =>
    string(item, `${path}[${index}]`, maximumCharacters));
}

export function objectArray(value, path, maximumItems, maximumBytes) {
  array(value, path, maximumItems).forEach((item, index) => {
    record(item, `${path}[${index}]`);
    boundedJson(item, `${path}[${index}]`, maximumBytes);
  });
}

export function kbIdentity(identity, path) {
  const value = record(identity, path);
  const keys = Object.keys(value).toSorted();
  if (keys.some((key) => !['kbId', 'version'].includes(key))) {
    throw new TypeError(`${path} contains unsupported identity fields.`);
  }
  string(value.kbId, `${path}.kbId`);
  if (value.version !== undefined) string(value.version, `${path}.version`);
  if (/[\u0000-\u001f\u007f]/u.test(value.kbId)
    || (value.version !== undefined && /[\u0000-\u001f\u007f]/u.test(value.version))) {
    throw new TypeError(`${path} contains control characters.`);
  }
  return `${value.kbId}\u0000${value.version ?? ''}`;
}

export function kbIdentityArray(value, path, maximumItems = 256) {
  const seen = new Set();
  array(value, path, maximumItems).forEach((identity, index) => {
    const key = kbIdentity(identity, `${path}[${index}]`);
    if (seen.has(key)) throw new TypeError(`${path} contains duplicate identity ${identity.kbId}.`);
    seen.add(key);
  });
}

export function confidence(value, path) {
  finite(value, path, 0, 1);
}
