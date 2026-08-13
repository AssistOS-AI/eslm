#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const STAGES = new Set([
  "language-boundary",
  "parse",
  "task-frame",
  "planning",
  "grounding",
  "reasoning",
  "authority",
  "realization",
  "coverage-gap",
  "eval-contract"
]);
const SCORE_STATES = new Set(["pass", "fail", "review"]);

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function readJsonl(path) {
  const raw = await readFile(path, "utf8");
  return raw.split(/\r?\n/u).filter((line) => line.trim().length > 0).map((line, offset) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`${path}:${offset + 1}: ${error.message}`);
    }
  });
}

const casesPath = option("--cases");
const resultsPath = option("--results");
if (!casesPath || !resultsPath) {
  fail("Usage: analyze-eval-results.mjs --cases PATH --results PATH");
} else {
  try {
    const cases = await readJsonl(casesPath);
    const results = await readJsonl(resultsPath);
    const casesById = new Map(cases.map((record) => [record.id, record]));
    const seen = new Set();
    const errors = [];
    const summary = { total: results.length, states: {}, profiles: {}, stages: {}, categories: {} };

    for (const result of results) {
      const key = `${result.caseId}:${result.profile}`;
      const sourceCase = casesById.get(result.caseId);
      if (result.format !== "eslm-basic-everyday-eval-result") errors.push(`${key}: invalid format`);
      if (!sourceCase) errors.push(`${key}: unknown caseId`);
      if (seen.has(key)) errors.push(`${key}: duplicate result`);
      seen.add(key);
      if (sourceCase && !sourceCase.profiles.includes(result.profile)) errors.push(`${key}: profile is not declared by the case`);
      if (!SCORE_STATES.has(result.score?.state)) errors.push(`${key}: invalid score state`);
      if (result.score?.state === "fail") {
        if (!STAGES.has(result.diagnosis?.earliestStage)) errors.push(`${key}: failed result needs a valid earliest stage`);
        if (typeof result.diagnosis?.code !== "string" || result.diagnosis.code.length === 0) errors.push(`${key}: failed result needs a diagnosis code`);
      } else if (result.diagnosis?.earliestStage != null) {
        errors.push(`${key}: non-failed result must not name a failure stage`);
      }

      const state = result.score?.state ?? "invalid";
      const profile = result.profile ?? "invalid";
      const stage = result.diagnosis?.earliestStage ?? "none";
      const category = sourceCase?.category ?? "unknown";
      summary.states[state] = (summary.states[state] ?? 0) + 1;
      summary.profiles[profile] = (summary.profiles[profile] ?? 0) + 1;
      summary.stages[stage] = (summary.stages[stage] ?? 0) + 1;
      summary.categories[category] ??= { total: 0, pass: 0, fail: 0, review: 0 };
      summary.categories[category].total += 1;
      if (SCORE_STATES.has(state)) summary.categories[category][state] += 1;
    }

    for (const sourceCase of cases) {
      for (const profile of sourceCase.profiles) {
        if (!seen.has(`${sourceCase.id}:${profile}`)) errors.push(`${sourceCase.id}:${profile}: missing result`);
      }
    }

    if (errors.length > 0) {
      for (const error of errors.slice(0, 100)) fail(error);
      if (errors.length > 100) fail(`... ${errors.length - 100} additional error(s)`);
    } else {
      process.stdout.write(`${JSON.stringify({ valid: true, ...summary }, null, 2)}\n`);
    }
  } catch (error) {
    fail(error.message);
  }
}
