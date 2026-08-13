import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createCliRuntime, inspectCliRuntimeComposition,
} from '../src/interface/cli-runtime-composition.mjs';
import { cliHelpText } from '../src/interface/cli-help.mjs';
import {
  languageAgentNormalizationEnabled, withLanguageAgentNormalization,
} from '../src/interface/cli-runtime-policy.mjs';
import { executeLegacyRowsSequentially } from '../src/interface/benchmark-command.mjs';
import { EnglishLanguageGateRuntime } from '../src/runtime/english-language-gate-runtime.mjs';
import { EslmEngine } from '../src/runtime/engine.mjs';
import { HeuristicLanguageRuntime } from '../src/runtime/heuristic-language-runtime.mjs';
import { LanguageAgentAssistedRuntime } from '../src/runtime/language-agent-assisted-runtime.mjs';
import { EslmRuntime } from '../src/runtime/runtime.mjs';

test('default CLI composition places the untrusted assisted boundary outside every local authority', async () => {
  const runtime = await createCliRuntime({ kb: 'quick', 'no-normalization-cache': true });
  assert.ok(runtime instanceof LanguageAgentAssistedRuntime);
  assert.ok(runtime.runtime instanceof EnglishLanguageGateRuntime);
  assert.ok(runtime.runtime.runtime instanceof HeuristicLanguageRuntime);
  assert.ok(runtime.runtime.runtime.runtime instanceof EslmRuntime);
  assert.ok(runtime.runtime.runtime.runtime.core instanceof EslmEngine);

  const receipt = inspectCliRuntimeComposition(runtime);
  assert.equal(receipt.profile, 'language-agent-assisted-normalization');
  assert.equal(receipt.externalLanguageAgent, true);
  assert.deepEqual(receipt.wrapperOrderOuterToInner, [
    'operator:language:external-proposal-boundary',
    'authority:language:english-likelihood-gate',
    'coordination:language:deterministic-heuristic-recovery',
    'runtime:knowledge:provider-aware-symbolic-execution',
    'runtime:reasoning:deterministic-core-engine',
  ]);
  assert.equal(receipt.authority.languageAgent, 'untrusted-language-form-proposal-only');
  assert.equal(receipt.authority.symbolicRuntime, 'sole-semantic-answer-authority');
});

test('offline CLI composition omits the external proposal wrapper without changing local order', async () => {
  const options = withLanguageAgentNormalization({
    kb: 'quick',
    'external-language-agent': true,
    'language-agent-timeout-ms': 1,
  }, false);
  assert.equal(languageAgentNormalizationEnabled(options), false);
  const runtime = await createCliRuntime(options);
  assert.ok(runtime instanceof EnglishLanguageGateRuntime);
  assert.ok(!(runtime instanceof LanguageAgentAssistedRuntime));
  assert.deepEqual(inspectCliRuntimeComposition(runtime).wrapperOrderOuterToInner, [
    'authority:language:english-likelihood-gate',
    'coordination:language:deterministic-heuristic-recovery',
    'runtime:knowledge:provider-aware-symbolic-execution',
    'runtime:reasoning:deterministic-core-engine',
  ]);
});

test('likely non-English input stops before the composed local parser and providers', async () => {
  const runtime = await createCliRuntime(withLanguageAgentNormalization({ kb: 'quick' }, false));
  let localExecutionCalls = 0;
  runtime.runtime.ask = async () => {
    localExecutionCalls += 1;
    throw new Error('The English likelihood gate called the local execution graph.');
  };

  const result = await runtime.ask('Жарум кивес Нолта?');
  assert.equal(result.languageRoute, 'english-language-gate-rejected');
  assert.equal(result.languageAssessment.classification, 'likely-non-english');
  assert.equal(localExecutionCalls, 0);
  assert.deepEqual(result.consultedKbVersions, []);
  assert.deepEqual(result.usedKbVersions, []);
});

test('public live benchmark runtime construction forcibly selects the local profile', async () => {
  const constructed = [];
  await executeLegacyRowsSequentially(
    ['entityTracking'],
    { 'external-language-agent': true, 'no-external-language-agent': false },
    async (options) => {
      constructed.push(options);
      return Object.freeze({ identity: 'offline-test-runtime' });
    },
    async () => [Object.freeze({ id: 'entityTracking', resultOrigin: 'current-execution' })],
    async () => Object.freeze({ digest: 'a'.repeat(64) }),
  );
  assert.equal(constructed.length, 1);
  assert.equal(constructed[0]['external-language-agent'], false);
  assert.equal(constructed[0]['no-external-language-agent'], true);
  assert.equal(languageAgentNormalizationEnabled(constructed[0]), false);
});

test('assisted construction validates its external timeout while offline construction ignores it', async () => {
  assert.match(cliHelpText('fixture-model'),
    /--language-agent-timeout-ms N external proposal timeout; 1000 through 600000, default 120000/u);
  await assert.rejects(
    createCliRuntime({ kb: 'quick', 'language-agent-timeout-ms': 999 }),
    /between 1000 and 600000/u,
  );
  const offline = await createCliRuntime(withLanguageAgentNormalization({
    kb: 'quick', 'language-agent-timeout-ms': 999,
  }, false));
  assert.ok(offline instanceof EnglishLanguageGateRuntime);
});

test('deployable runtime modules do not import the CLI composition or external proposal implementation', async () => {
  const sources = await Promise.all([
    readFile(new URL('../src/runtime/engine.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../src/runtime/runtime.mjs', import.meta.url), 'utf8'),
  ]);
  for (const source of sources) {
    assert.doesNotMatch(source, /cli-runtime-composition|language-agent-assisted|codex-normalizer/iu);
  }
});
