#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const ALLOWED_POOLS = new Set(["source-development", "structural-controls"]);
const ALLOWED_PROFILES = new Set(["quick-assisted", "real-kb", "core-only"]);
const ALLOWED_SCORING = new Set(["exact", "semantic"]);
const ROMANIAN_MARKERS = /[ăâîșşțţ]/iu;

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

const casesPath = option("--cases");
if (!casesPath) {
  fail("Usage: validate-eval-corpus.mjs --cases PATH");
} else {
  try {
    const raw = await readFile(casesPath, "utf8");
    const lines = raw.split(/\r?\n/u).filter((line) => line.trim().length > 0);
    const seenIds = new Set();
    const seenSourceLocators = new Set();
    const counts = { pools: {}, profiles: {}, scoring: {}, categories: {} };
    const errors = [];

    for (const [offset, line] of lines.entries()) {
      const lineNumber = offset + 1;
      let record;
      try {
        record = JSON.parse(line);
      } catch (error) {
        errors.push(`line ${lineNumber}: invalid JSON (${error.message})`);
        continue;
      }

      const at = `${record.id ?? `line ${lineNumber}`}`;
      if (record.format !== "eslm-basic-everyday-eval-case") errors.push(`${at}: invalid format`);
      if (!nonEmptyString(record.id)) errors.push(`${at}: id is required`);
      else if (seenIds.has(record.id)) errors.push(`${at}: duplicate id`);
      else seenIds.add(record.id);
      if (!ALLOWED_POOLS.has(record.pool)) errors.push(`${at}: invalid pool ${record.pool}`);
      if (!nonEmptyString(record.category)) errors.push(`${at}: category is required`);
      if (!nonEmptyString(record.difficulty)) errors.push(`${at}: difficulty is required`);
      if (!ALLOWED_SCORING.has(record.scoring)) errors.push(`${at}: invalid scoring mode ${record.scoring}`);
      if (!nonEmptyString(record.prompt)) errors.push(`${at}: prompt is required`);
      if (ROMANIAN_MARKERS.test(record.prompt ?? "")) errors.push(`${at}: prompt still contains Romanian diacritics`);
      if (!record.reference || !nonEmptyString(record.reference.answer)) errors.push(`${at}: reference.answer is required`);
      if (ROMANIAN_MARKERS.test(record.reference?.answer ?? "")) errors.push(`${at}: reference answer still contains Romanian diacritics`);
      if (!Array.isArray(record.reference?.requiredConcepts)) errors.push(`${at}: reference.requiredConcepts must be an array`);
      if (!Array.isArray(record.reference?.forbiddenClaims)) errors.push(`${at}: reference.forbiddenClaims must be an array`);
      if (!record.conversion || !nonEmptyString(record.conversion.method)) errors.push(`${at}: conversion method is required`);
      if (record.conversion?.reviewed !== true) errors.push(`${at}: conversion must be reviewed`);
      if (!Array.isArray(record.profiles) || record.profiles.length === 0) errors.push(`${at}: at least one profile is required`);
      for (const profile of record.profiles ?? []) {
        if (!ALLOWED_PROFILES.has(profile)) errors.push(`${at}: invalid profile ${profile}`);
        counts.profiles[profile] = (counts.profiles[profile] ?? 0) + 1;
      }

      const source = record.source;
      if (!source || !nonEmptyString(source.collection) || !nonEmptyString(source.locator) || !nonEmptyString(source.sourceId)) {
        errors.push(`${at}: complete source identity is required`);
      } else if (seenSourceLocators.has(`${source.collection}:${source.locator}`) && record.pool === "source-development") {
        errors.push(`${at}: duplicate source locator ${source.locator}`);
      } else if (record.pool === "source-development") {
        seenSourceLocators.add(`${source.collection}:${source.locator}`);
      }
      if (!/^sha256:[a-f0-9]{64}$/u.test(source?.sourceDigest ?? "")) errors.push(`${at}: invalid sourceDigest`);

      counts.pools[record.pool] = (counts.pools[record.pool] ?? 0) + 1;
      counts.scoring[record.scoring] = (counts.scoring[record.scoring] ?? 0) + 1;
      counts.categories[record.category] = (counts.categories[record.category] ?? 0) + 1;
    }

    if (errors.length > 0) {
      for (const error of errors.slice(0, 100)) fail(error);
      if (errors.length > 100) fail(`... ${errors.length - 100} additional error(s)`);
    } else {
      process.stdout.write(`${JSON.stringify({ valid: true, caseCount: lines.length, digest: sha256(raw), counts }, null, 2)}\n`);
    }
  } catch (error) {
    fail(`Cannot validate ${casesPath}: ${error.message}`);
  }
}
