import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function readJsonArgument(value, usage) {
  if (!value) throw new Error(usage);
  return JSON.parse(await readFile(resolve(value), 'utf8'));
}

export function exactKeys(value, keys, path) {
  plainObject(value, path);
  const actual = Object.keys(value).toSorted();
  const expected = [...keys].toSorted();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new TypeError(`${path} must contain exactly: ${keys.join(', ')}.`);
  }
}

export function plainObject(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${path} must be a plain object.`);
  }
}

export function boundedText(value, path, maximum = 2_048) {
  if (typeof value !== 'string' || value.length === 0 || Buffer.byteLength(value) > maximum) {
    throw new TypeError(`${path} must be bounded non-empty text.`);
  }
}

export function identifier(value, path) {
  if (typeof value !== 'string' || value.length > 256
      || !/^[a-z0-9]+(?:[._:+>@-][a-z0-9]+)*$/u.test(value)) {
    throw new TypeError(`${path} must be a canonical identifier.`);
  }
}

export function digest(value, path) {
  if (typeof value !== 'string' || !/^sha256:[a-f0-9]{64}$/u.test(value)) {
    throw new TypeError(`${path} must be a SHA-256 digest.`);
  }
}

export function integer(value, path, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) throw new TypeError(`${path} must be an integer >= ${minimum}.`);
}

export function finiteRate(value, path) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new TypeError(`${path} must be a rate from 0 to 1.`);
}

export function enumValue(value, values, path) {
  if (!values.includes(value)) throw new TypeError(`${path} must be one of: ${values.join(', ')}.`);
}

export function uniqueStrings(value, path, { minimum = 0, maximum = 128 } = {}) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum
      || value.some((item) => typeof item !== 'string' || item.length === 0 || item.length > 512)
      || new Set(value).size !== value.length) {
    throw new TypeError(`${path} must be a bounded unique string array.`);
  }
}

export function canonicalStrings(value, path, { minimum = 0, maximum = 128 } = {}) {
  uniqueStrings(value, path, { minimum, maximum });
  if (JSON.stringify(value) !== JSON.stringify([...value].toSorted())) {
    throw new TypeError(`${path} must be canonical and sorted.`);
  }
}

export function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).toSorted().map((key) =>
      `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

export function same(left, right) {
  return stable(left) === stable(right);
}

export function output(result) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
