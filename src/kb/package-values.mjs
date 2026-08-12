import { createHash } from 'node:crypto';

export function sha256Identity(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (isObject(value)) {
    const properties = Object.keys(value).sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`);
    return `{${properties.join(',')}}`;
  }
  return JSON.stringify(value);
}

export function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}
