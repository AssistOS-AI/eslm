import test from 'node:test';
import assert from 'node:assert/strict';
import { BENCHMARK_CATALOG } from '../src/benchmarks.mjs';
import {
  RESEARCH_BENCHMARK_CATALOG,
  researchBenchmarkCacheStatus,
  validateResearchBenchmarkCatalog,
} from '../src/evaluation/benchmark-research-catalog.mjs';

test('research benchmark registrations preserve the requested staged capability program', () => {
  assert.equal(validateResearchBenchmarkCatalog(), true);
  assert.equal(Object.keys(RESEARCH_BENCHMARK_CATALOG).length, 16);
  assert.equal(Object.keys(BENCHMARK_CATALOG).length, 23);
  assert.deepEqual(
    Object.values(RESEARCH_BENCHMARK_CATALOG).map((item) => item.stage).sort(),
    [1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7],
  );
  assert.deepEqual(
    Object.values(RESEARCH_BENCHMARK_CATALOG).filter((item) => item.priority === 5)
      .map((item) => item.family),
    [
      'LogicBench', 'ProofWriter', 'PrOntoQA', 'SLR-Bench', 'LogicSkills', 'FOLIO',
      'SATBench', 'ZebraLogic', 'Defeasible NLI',
    ],
  );
});

test('research benchmark registrations distinguish catalog entries from validated development tracks', async () => {
  const statuses = await researchBenchmarkCacheStatus();
  assert.equal(statuses.length, 16);
  for (const status of statuses) {
    assert.match(status.actionUrl, /^https:\/\//u);
    assert.ok(status.nextAction.length > 40);
    if (status.evaluationState !== 'not-run') {
      assert.ok(['implemented-development', 'implemented-fresh'].includes(status.adapterState));
      if (status.evaluationState === 'fresh-evaluation-executed') {
        assert.ok(['current', 'historical-stale', 'historical-unrecoverable', 'invalid', 'unavailable']
          .includes(status.cacheState));
        assert.equal(status.cacheState, status.freshReceiptState);
        const expected = status.freshReceiptState === 'current' ? 'fresh-evaluation-executed'
          : ['historical-stale', 'historical-unrecoverable'].includes(status.freshReceiptState)
            ? 'historical-fresh-evaluation'
            : status.freshReceiptState === 'invalid' ? 'invalid-fresh-evaluation'
              : 'unavailable-fresh-evaluation';
        assert.equal(status.effectiveEvaluationState, expected);
      } else {
        assert.equal(status.cacheState, 'validated-frozen');
      }
    } else {
      assert.equal(status.adapterState, 'not-implemented');
      assert.equal(status.evaluationState, 'not-run');
      assert.equal(status.cacheState, status.cached ? 'cached-unvalidated' : 'absent');
    }
  }
  assert.equal(statuses.find((item) => item.id === 'iibench').accessState,
    'official-author-release-license-clarification-required');
  assert.equal(statuses.find((item) => item.id === 'logiqa').accessState, 'public-repository-license-uncertain');
  const logicBench = statuses.find((item) => item.id === 'logicbench');
  assert.equal(logicBench.cached, true);
  assert.equal(logicBench.sourceRevision, 'c014153303c98de4d5f09d41c3a235cd869be5c8');
  assert.equal(logicBench.sourceArtifact.sha256, '11c04b6c09a5b0a60dd73da9c3c356d89d9228b6212cb38f0e61e360a1582de5');
  assert.match(logicBench.schemaInventory.inspectionBoundary, /labels were not printed or inspected/u);
  const proofWriter = statuses.find((item) => item.id === 'proofwriter');
  assert.equal(proofWriter.sourceArtifact.sha256,
    'bbc5694901e8306d0bd659aa1ad53ccfd02c201864f4b320ffa3777827d1fc26');
  assert.equal(proofWriter.schemaInventory.mainOpenWorldDevelopmentQuestions, 50_844);
  const logicSkills = statuses.find((item) => item.id === 'logicskills');
  assert.equal(logicSkills.cached, true);
  assert.equal(logicSkills.sourceArtifact.sha256,
    '8f25d38f2fc0efd7eaed73e801bc01202076544ca776b4a0861a205341275286');
  assert.equal(logicSkills.schemaInventory.cases, 1_500);
  const slrBench = statuses.find((item) => item.id === 'slr-bench');
  assert.equal(slrBench.cached, true);
  assert.match(slrBench.sourceRevision, /^cecc0aa2602943ead28a4ea74c7a8f3c91264cbf/u);
  assert.equal(slrBench.schemaInventory.cases, 19_253);
  assert.equal(slrBench.schemaInventory.inertValidationFacts, 13_999_345);
  assert.equal(slrBench.schemaInventory.sizeBasedRejections, 0);
  const proverQa = statuses.find((item) => item.id === 'proverqa');
  assert.equal(proverQa.schemaInventory.evaluation, 1_500);
  assert.equal(proverQa.schemaInventory.sealedFresh, 1_200);
  const satBench = statuses.find((item) => item.id === 'satbench');
  assert.equal(satBench.sourceArtifact.sha256,
    'd32ee8ca8ccee4ee3dcb322e174d4cbe5ffebbd1b76dcdb702d397afd34294b5');
  assert.equal(satBench.schemaInventory.cases, 2_100);
  const defeasibleNli = statuses.find((item) => item.id === 'defeasible-nli');
  assert.equal(defeasibleNli.adapterState, 'implemented-development');
  assert.equal(defeasibleNli.evaluationState, 'development-probe-executed');
  assert.equal(defeasibleNli.schemaInventory.sourceRows, 245_720);
  assert.equal(defeasibleNli.schemaInventory.retainedRows, 245_720);
  const alphaNli = statuses.find((item) => item.id === 'alpha-nli-art');
  assert.equal(alphaNli.adapterState, 'implemented-development');
  assert.equal(alphaNli.evaluationState, 'development-probe-executed');
  assert.equal(alphaNli.schemaInventory.sourceRows, 174_245);
  assert.equal(alphaNli.schemaInventory.sealedTest, 3_059);
  const stepGame = statuses.find((item) => item.id === 'stepgame');
  assert.equal(stepGame.adapterState, 'implemented-development');
  assert.equal(stepGame.schemaInventory.rows, 155_000);
  assert.equal(stepGame.schemaInventory.retainedRows, 155_000);
  const sparp = statuses.find((item) => item.id === 'sparc-sparp');
  assert.equal(sparp.adapterState, 'implemented-development');
  assert.equal(sparp.schemaInventory.uniqueRows, 416_678);
  assert.equal(sparp.schemaInventory.sizeBasedRejections, 0);
  const zebraLogic = statuses.find((item) => item.id === 'zebralogic');
  assert.equal(zebraLogic.adapterState, 'implemented-fresh');
  assert.equal(zebraLogic.evaluationState, 'fresh-evaluation-executed');
  assert.equal(zebraLogic.schemaInventory.gridCases, 1_000);
  assert.equal(zebraLogic.schemaInventory.retainedRows, 4_259);
  assert.equal(zebraLogic.accessState, 'public-clues-private-oracle-gated');
  const reclor = statuses.find((item) => item.id === 'reclor');
  assert.equal(reclor.adapterState, 'implemented-development');
  assert.equal(reclor.schemaInventory.rows, 6_138);
  assert.equal(reclor.schemaInventory.sealedTest, 1_000);
  const logiqa = statuses.find((item) => item.id === 'logiqa');
  assert.equal(logiqa.adapterState, 'implemented-development');
  assert.equal(logiqa.schemaInventory.sourceRows, 17_356);
  assert.equal(logiqa.schemaInventory.chineseSealedTest, 651);
});

test('research benchmark catalog validator rejects execution without an adapter', () => {
  const invalid = {
    sample: {
      ...RESEARCH_BENCHMARK_CATALOG.logicbench,
      id: 'sample',
      adapterState: 'not-implemented',
      evaluationState: 'executed',
    },
  };
  assert.throws(() => validateResearchBenchmarkCatalog(invalid), /unsupported evaluation state/u);

  invalid.sample.evaluationState = 'development-probe-executed';
  assert.throws(() => validateResearchBenchmarkCatalog(invalid), /requires an implemented adapter/u);
});
