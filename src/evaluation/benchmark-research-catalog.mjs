import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { PROJECT_ROOT } from '../paths.mjs';

function freezeEntry(definition) {
  return Object.freeze({
    format: 'eslm-benchmark-research-registration-v1',
    adapterState: 'not-implemented',
    evaluationState: 'not-run',
    ...definition,
    capabilities: Object.freeze([...definition.capabilities]),
    access: Object.freeze({ ...definition.access }),
    cache: Object.freeze({ ...definition.cache }),
  });
}

function registration(definition) {
  const id = definition.id;
  return freezeEntry({
    ...definition,
    cache: {
      path: definition.cache?.path ?? `training/.cache/benchmarks/${id}/source`,
      validation: definition.cache?.validation ?? 'A local path is only cached bytes. Freeze a revision and hashes, validate the source schema, '
        + 'record split visibility, and implement a label-isolating adapter before any execution claim.',
    },
  });
}

export const RESEARCH_BENCHMARK_CATALOG = Object.freeze({
  logicbench: registration({
    id: 'logicbench', family: 'LogicBench', stage: 1, priority: 5,
    task: 'single-rule natural-language logical inference in binary and multiple-choice forms',
    capabilities: ['propositional inference', 'first-order inference', 'non-monotonic inference', 'negation'],
    source: 'https://github.com/Mihir3009/LogicBench', paper: 'https://arxiv.org/abs/2404.15522',
    sourceRevision: 'c014153303c98de4d5f09d41c3a235cd869be5c8',
    sourceArtifact: Object.freeze({
      path: 'training/.cache/benchmarks/logicbench/source/c014153303c98de4d5f09d41c3a235cd869be5c8.tar.gz',
      bytes: 584_313,
      sha256: '11c04b6c09a5b0a60dd73da9c3c356d89d9228b6212cb38f0e61e360a1582de5',
    }),
    schemaInventory: Object.freeze({
      augmented: '25 JSON files; 3,752 top-level records with context and qa_pairs',
      evaluation: '50 JSON files; 1,000 records total: 500 BQA and 500 MCQA',
      inspectionBoundary: 'Schema and aggregate counts only; evaluation text and labels were not printed or inspected.',
    }),
    license: 'MIT repository and dataset release',
    access: { state: 'public-direct-repository', actionUrl: 'https://github.com/Mihir3009/LogicBench' },
    adapterState: 'implemented-fresh', evaluationState: 'fresh-evaluation-executed',
    nextAction: 'The one-shot fresh partition is exhausted for the frozen candidate. Improve generic clause alignment, '
      + 'coreference, existential representation, and controlled default parsing on new development evidence, then create '
      + 'a new untouched partition before making another fresh claim.',
  }),
  iibench: registration({
    id: 'iibench', family: 'IIBench', stage: 1, priority: 4,
    task: 'immediate inference over categorical propositions',
    capabilities: ['categorical propositions', 'quantifiers', 'negation', 'immediate-inference operators'],
    source: 'https://github.com/michaellu5475/IIBench', paper: 'https://aclanthology.org/2026.acl-long.808/',
    sourceRevision: '5db6067770fa7d7fdc93b0b17747c7f1cf1d35c8',
    sourceArtifact: Object.freeze({
      path: 'training/.cache/benchmarks/iibench/source/5db6067770fa7d7fdc93b0b17747c7f1cf1d35c8.tar.gz',
      bytes: 322_908,
      sha256: 'e1f0cacf12547560d19b8c77bc4b8d8dddbf153b3304ab9c99af3106fc3d54a7',
    }),
    schemaInventory: Object.freeze({ files: 5, rows: 5_284, development: 4_196, sealedFresh: 1_088 }),
    license: 'The author release contains no benchmark LICENSE at the pinned revision. Local research evaluation is '
      + 'recorded separately from the cited Wikidata and WordNet input licenses; redistribution requires author clarification.',
    access: { state: 'official-author-release-license-clarification-required', actionUrl: 'https://github.com/michaellu5475/IIBench/issues' },
    adapterState: 'implemented-fresh', evaluationState: 'fresh-evaluation-executed',
    nextAction: 'The one-shot fresh partition is exhausted. Ask the authors whether the requested syllogism mood is '
      + 'intended to be visible or whether every sound entailed conclusion should score, and create a new untouched pool '
      + 'before evaluating any later semantic change.',
  }),
  proofwriter: registration({
    id: 'proofwriter', family: 'ProofWriter', stage: 2, priority: 5,
    task: 'deduction, multi-step proofs, implication enumeration, and single-fact abduction over rule bases',
    capabilities: ['safe rule deduction', 'open-world status', 'proof construction', 'abduction'],
    source: 'https://allenai.org/data/proofwriter', paper: 'https://aclanthology.org/2021.findings-acl.317/',
    sourceRevision: 'V2020.12.3; supporting allenai/ruletaker revision abaacec9364992eff5ec4555b837e20fee2f2ff0',
    sourceArtifact: Object.freeze({
      path: 'training/.cache/benchmarks/proofwriter/source/proofwriter-dataset-V2020.12.3.zip',
      bytes: 214_185_889,
      sha256: 'bbc5694901e8306d0bd659aa1ad53ccfd02c201864f4b320ffa3777827d1fc26',
    }),
    schemaInventory: Object.freeze({
      files: 110,
      records: 702_271,
      taskItems: 2_670_022,
      mainOpenWorldDevelopmentQuestions: 50_844,
      inspectionBoundary: 'All files were schema-validated by a streaming host pass. Test text, labels, and proofs '
        + 'were not emitted, sampled, or used for development.',
    }),
    license: 'The official archive bundles no dataset license. The supporting RuleTaker code repository is Apache '
      + '2.0; local research evaluation proceeds without plaintext redistribution pending dataset-terms clarification.',
    access: { state: 'public-direct-official-archive-terms-not-bundled', actionUrl: 'https://allenai.org/data/proofwriter' },
    adapterState: 'implemented-development',
    evaluationState: 'development-probe-executed',
    nextAction: 'Clarify the archive-specific dataset terms with AI2, then add separately gated staged-implication and '
      + 'single-fact-abduction scoring; the current main OWA logical-form development track must not be described as those tracks.',
  }),
  prontoqa: registration({
    id: 'prontoqa', family: 'PrOntoQA', stage: 2, priority: 5,
    task: 'generated ontology reasoning with controlled multi-hop proof depth',
    capabilities: ['ontology deduction', 'multi-hop proof planning', 'proof-chain validation'],
    source: 'https://github.com/asaparov/prontoqa', paper: 'https://arxiv.org/abs/2210.01240',
    sourceRevision: '0a6412b6fddf46324a1cb96e066dd7b3d89b87d6',
    sourceArtifact: Object.freeze({
      path: 'training/.cache/benchmarks/prontoqa/source/0a6412b6fddf46324a1cb96e066dd7b3d89b87d6.tar.gz',
      bytes: 39_854_588,
      sha256: '9e978f96efabff27bfee721b7bf14957dfaabe4d6527b2a69f810c3fee288094',
    }),
    schemaInventory: Object.freeze({ files: 79, cases: 7_900, development: 1_580, sealedFresh: 6_320 }),
    license: 'Apache-2.0 official repository and bundled generated artifact',
    access: { state: 'public-generated-source', actionUrl: 'https://github.com/asaparov/prontoqa' },
    adapterState: 'implemented-fresh', evaluationState: 'fresh-evaluation-executed',
    nextAction: 'Preserve the frozen semantic candidate and independently verified fresh aggregate. Future work may compare '
      + 'solver certificates with official natural-language proof steps, but must not reopen this fresh partition for tuning.',
  }),
  'slr-bench': registration({
    id: 'slr-bench', family: 'SLR-Bench', stage: 2, priority: 5,
    task: 'inductive rule synthesis across relational, arithmetic, ordering, and recursive curricula',
    capabilities: ['inductive rule synthesis', 'relations', 'arithmetic', 'recursion', 'symbolic validation'],
    source: 'https://huggingface.co/datasets/AIML-TUDA/SLR-Bench',
    paper: 'https://aclanthology.org/2026.acl-long.16/',
    sourceRevision: 'cecc0aa2602943ead28a4ea74c7a8f3c91264cbf; v1-All; generator 3b46979ccdf9bb1c624809cfc140fe7c5af0f778',
    schemaInventory: Object.freeze({
      sourceShards: 5, sourceBytes: 260_070_558, cases: 19_253, levels: 20,
      train: 18_053, development: 200, sealedFresh: 1_000,
      inertValidationFacts: 13_999_345, rejectedRows: 0, sizeBasedRejections: 0,
      prepared: '79 deterministic JSONL shards; 1,261,211,442 bytes; complete row retention',
    }),
    license: 'CC BY 4.0 official dataset; MIT official generator; Apache-2.0 header on the official symbolic judge',
    access: { state: 'public-direct-dataset', actionUrl: 'https://huggingface.co/datasets/AIML-TUDA/SLR-Bench' },
    adapterState: 'implemented-development', evaluationState: 'development-probe-executed',
    nextAction: 'The registered finite conjunctive method covers the simple relational fragment with replayable evidence. '
      + 'Develop separate typed hypothesis languages for quantification, negation, inequality, arithmetic, and aggregation; '
      + 'the visible release contains no self-recursive target examples, so recursion needs an independent development source. '
      + 'Keep the untouched 1,000-case official test split sealed until the broader checkpoint is frozen.',
  }),
  logicskills: registration({
    id: 'logicskills', family: 'LogicSkills', stage: 3, priority: 5,
    task: 'formal symbolization, finite countermodel construction, and validity assessment',
    capabilities: ['natural-language to FOL', 'finite countermodels', 'validity', 'nonce-language transfer'],
    source: 'https://github.com/brianrabern/LogicSkills', paper: 'https://arxiv.org/abs/2602.06533v2',
    sourceRevision: '1f23e684d6b1a465047f8b0d833d9b9b3388441a',
    sourceArtifact: Object.freeze({
      path: 'training/.cache/benchmarks/logicskills/source/1f23e684d6b1a465047f8b0d833d9b9b3388441a.tar.gz',
      bytes: 45_726_962,
      sha256: '8f25d38f2fc0efd7eaed73e801bc01202076544ca776b4a0861a205341275286',
    }),
    schemaInventory: Object.freeze({
      files: 3, cases: 1_500, development: 1_200, sealedFresh: 300,
      tasks: '600 symbolization, 600 validity, and 300 finite-countermodel cases',
      validation: 'All normalized fixed-evaluation rows passed streaming closed-schema validation; zero rows were discarded.',
    }),
    license: 'CC BY 4.0 benchmark question/JSON data; repository code is MIT',
    access: { state: 'public-direct-repository', actionUrl: 'https://github.com/brianrabern/LogicSkills' },
    adapterState: 'implemented-development', evaluationState: 'development-probe-executed',
    nextAction: 'Extend the conservative controlled-language symbolizer and sound equivalence checker on development '
      + 'evidence, then implement a proof-producing validity method. The earlier 60-case fresh countermodel stratum is '
      + 'exhausted; keep the 240 fresh symbolization and validity members sealed until those methods are frozen.',
  }),
  folio: registration({
    id: 'folio', family: 'FOLIO', stage: 3, priority: 5,
    task: 'expert-authored natural-language inference paired with first-order logic annotations',
    capabilities: ['natural-language to FOL', 'first-order deduction', 'true-false-unknown classification'],
    source: 'https://github.com/Yale-LILY/FOLIO', paper: 'https://arxiv.org/abs/2209.00840',
    sourceRevision: '5d7bb84c7edab3fb358e057d2807f19cf5cf5e2d; official v0.0 train and validation',
    sourceArtifact: Object.freeze({
      path: 'training/.cache/benchmarks/folio/source/5d7bb84c7edab3fb358e057d2807f19cf5cf5e2d.tar.gz',
      bytes: 216_478,
      sha256: 'c1ab92c373a8e4f1e55781f89d44675082379a2c3d841c3667dbbe0209ee0924',
    }),
    schemaInventory: Object.freeze({
      train: '1,004 records and 5,237 natural-language premises; conclusion-FOL is absent in v0.0 train',
      validation: '204 records and 1,088 natural-language premises with conclusion-FOL; all rows are development-visible',
      sourceAnomalies: 'Six empty train formula annotations, two train and ten validation premise-alignment mismatches, '
        + 'and four empty train natural-language premise slots are preserved and counted.',
      inspectionBoundary: 'The official v0.0 test set is unreleased; no local test text or labels exist.',
    }),
    license: 'CC BY-SA 4.0 official repository',
    access: { state: 'public-direct-repository', actionUrl: 'https://github.com/Yale-LILY/FOLIO' },
    adapterState: 'implemented-development',
    evaluationState: 'development-probe-executed',
    nextAction: 'Obtain authorized access to the official quality-corrected v2 release and freeze it as a separate '
      + 'source version, or use a future official labeled test evaluator for a fresh checkpoint. The current v0.0 '
      + 'files cannot support an honest fresh claim because both locally labeled files are development-visible.',
  }),
  proverqa: registration({
    id: 'proverqa', family: 'ProverQA', stage: 3, priority: 4,
    task: 'complex first-order deduction with explicit intermediate reasoning chains',
    capabilities: ['first-order deduction', 'intermediate proof steps', 'multi-level reasoning depth'],
    source: 'https://huggingface.co/datasets/opendatalab/ProverQA', paper: 'https://openreview.net/forum?id=C25SgeXWjE',
    sourceRevision: 'dataset e2561beed450272690da658d21ae667570dbbafc; ProverGen code 1d8abd227912cee0b24819eb373ceba80979cb49',
    schemaInventory: Object.freeze({
      evaluation: 1_500, training: 5_000, development: 300, sealedFresh: 1_200,
      premiseAnnotations: 15_842, formulas: 17_342,
      anomalies: 'Three malformed embedded training-output JSON strings are retained and excluded from structured packets.',
    }),
    license: 'No explicit assembled-dataset license identifier; local academic research without source-row redistribution pending clarification',
    access: { state: 'public-academic-research-license-clarification-required', actionUrl: 'https://huggingface.co/datasets/opendatalab/ProverQA' },
    adapterState: 'implemented-fresh', evaluationState: 'fresh-evaluation-executed',
    nextAction: 'Preserve the exhausted fresh aggregate for its frozen annotation-assisted checkpoint. Develop a '
      + 'provenance-bearing natural-language-to-formula compiler and evaluate it on newly untouched evidence.',
  }),
  stepgame: registration({
    id: 'stepgame', family: 'StepGame', stage: 4, priority: 4,
    task: 'robust multi-hop spatial relation classification with noise and unseen hop depths',
    capabilities: ['spatial relations', 'relation composition', 'multi-hop paths', 'distractor robustness'],
    source: 'https://huggingface.co/datasets/ZhengyanShi/StepGame', paper: 'https://doi.org/10.1609/aaai.v36i10.21383',
    sourceRevision: 'corrected dataset 6d859381dfd518cae3f073b268aaa323bf4dcf04; generator repository 5e6aff1563a6d7f46ee1f1aeff98b94e68c29005',
    schemaInventory: Object.freeze({
      rows: 155_000, retainedRows: 155_000, sizeBasedRejections: 0,
      train: 50_000, development: 5_000, sealedTest: 100_000,
      officialUsableTemplates: 213, malformedOfficialTemplates: 1,
    }),
    license: 'MIT corrected official dataset and official repository',
    access: { state: 'public-direct-dataset', actionUrl: 'https://huggingface.co/datasets/ZhengyanShi/StepGame' },
    adapterState: 'implemented-development', evaluationState: 'development-probe-executed',
    nextAction: 'Preserve the official malformed-template cases as source issues without answer-guided repair. Build '
      + 'new source-independent spatial language controls before any parser change, and keep the 100,000-case test split sealed.',
  }),
  'sparc-sparp': registration({
    id: 'sparc-sparp', family: 'SpaRC / SpaRP', stage: 4, priority: 4,
    task: 'spatial-relation characterization and explicit spatial reasoning paths',
    capabilities: ['qualitative relation closure', 'topology and containment composition', 'spatial relation properties', 'reasoning-path generation'],
    source: 'https://huggingface.co/datasets/UKPLab/sparp',
    paper: 'https://aclanthology.org/2024.acl-long.261/',
    cache: { path: 'training/.cache/benchmarks/sparp-2706ed46' },
    sourceRevision: 'dataset 2706ed464416758c67a09716ed0262c880ee6bdd; code b4568a8030976941cb0037fb6399d48f893d8fa4',
    schemaInventory: Object.freeze({
      uniqueRows: 416_678, retainedRows: 416_678, sizeBasedRejections: 0,
      uniqueArtifacts: 24, logicalPaths: 36, fullValidation: 15_647, smallValidation: 2_000,
      sealedTest: 242_887,
    }),
    license: 'CC BY-SA 4.0 official dataset; Apache-2.0 official code',
    access: { state: 'public-direct-dataset', actionUrl: 'https://huggingface.co/datasets/UKPLab/sparp' },
    adapterState: 'implemented-development', evaluationState: 'development-probe-executed',
    nextAction: 'Preserve the complete PS1–PS4 validation execution and its replayable proofs while keeping every '
      + 'official test configuration sealed. Preserve the measured StepGame overlap and do not count transformed subsets as independent evidence.',
  }),
  satbench: registration({
    id: 'satbench', family: 'SATBench', stage: 5, priority: 5,
    task: 'Boolean satisfiability and unsatisfiability search over generated CNF puzzles and their natural-language renderings',
    capabilities: ['Boolean constraints', 'satisfiability search', 'witness construction', 'unsatisfiability certificates'],
    source: 'https://huggingface.co/datasets/LLM4Code/SATBench', paper: 'https://aclanthology.org/2025.emnlp-main.1716/',
    sourceRevision: 'dataset 186740e5fb7c0fede11d13f3fbcf7d7d92d70dc9; code 3c93c5b6ee89c563fff279bdf286845d8b7cbe36',
    sourceArtifact: Object.freeze({
      path: 'training/.cache/benchmarks/satbench/dataset/SATBench-problems-186740e5fb7c0fede11d13f3fbcf7d7d92d70dc9.jsonl',
      bytes: 32_618_716,
      sha256: 'd32ee8ca8ccee4ee3dcb322e174d4cbe5ffebbd1b76dcdb702d397afd34294b5',
    }),
    schemaInventory: Object.freeze({
      cases: 2_100, sat: 1_050, unsat: 1_050, variables: '5 through 90',
      development: 420, sealedFresh: 1_680, retainedRows: 2_100, sizeBasedRejections: 0,
    }),
    license: 'Apache-2.0 official dataset card; upstream code README carries an Apache-2.0 badge but no bundled LICENSE file',
    access: { state: 'public-direct-dataset', actionUrl: 'https://huggingface.co/datasets/LLM4Code/SATBench' },
    adapterState: 'implemented-fresh', evaluationState: 'fresh-evaluation-executed',
    nextAction: 'Preserve the frozen 1,680-case formula-track aggregate. Build a separately gated natural-language '
      + 'constraint compiler and evaluate it on a new untouched partition; do not describe the annotation track as the official prompt-only score.',
  }),
  zebralogic: registration({
    id: 'zebralogic', family: 'ZebraLogic', stage: 5, priority: 5,
    task: 'logic-grid constraint satisfaction with controllable search complexity',
    capabilities: ['constraint satisfaction', 'backtracking', 'all-different constraints', 'unique-solution validation'],
    source: 'https://huggingface.co/datasets/allenai/ZebraLogicBench', paper: 'https://arxiv.org/abs/2502.01100',
    sourceRevision: 'public dataset 2f94a445d7079f20146f5443e2606049de8543e0; ZeroEval 8c1485edf12c6efb5f69135a562927c5ad484059',
    sourceArtifact: Object.freeze({
      path: 'training/.cache/benchmarks/zebralogic/public-source/grid-mode-test-2f94a445d7079f20146f5443e2606049de8543e0.parquet',
      bytes: 324_151,
      sha256: '0886953f65988c2c14965192e8df0abf345dd84a31657bdb4f78fdf004907bc6',
    }),
    schemaInventory: Object.freeze({
      gridCases: 1_000, multipleChoiceCases: 3_259, retainedRows: 4_259,
      development: 200, sealedFresh: 800, publicReferenceAssignments: 0,
      sizeBasedRejections: 0,
    }),
    license: 'ZeroEval code Apache-2.0; the pinned public and private dataset cards declare no dataset license',
    access: {
      state: 'public-clues-private-oracle-gated',
      actionUrl: 'https://huggingface.co/datasets/allenai/ZebraLogicBench-private',
    },
    adapterState: 'implemented-fresh', evaluationState: 'fresh-evaluation-executed',
    nextAction: 'Accept the private-dataset terms and provide an authorized local Hugging Face token or immutable copy '
      + 'to compare generated assignments with the official labels. Keep the nine sealed-fresh parser failures aggregate-only; '
      + 'improve clue parsing from independent development examples before creating a new untouched evaluation partition.',
  }),
  'defeasible-nli': registration({
    id: 'defeasible-nli', family: 'Defeasible NLI', stage: 6, priority: 5,
    task: 'classify whether an update strengthens or weakens a defeasible inference',
    capabilities: ['defaults', 'exceptions', 'non-monotonic updates', 'strengthener-weakener classification'],
    source: 'https://github.com/rudinger/defeasible-nli',
    paper: 'https://aclanthology.org/2020.findings-emnlp.418/',
    sourceRevision: 'c675ffc1b0eec5fa56287f08490da8ed43c1ecc5',
    sourceArtifact: Object.freeze({
      path: 'training/.cache/benchmarks/defeasible-nli/source/c675ffc1b0eec5fa56287f08490da8ed43c1ecc5.tar.gz',
      bytes: 9_393_470,
      sha256: '5ce22943ab9e6cd1b687eb241e7da4db31ee30dcd24e66b7595c1e34d571d03b',
    }),
    schemaInventory: Object.freeze({
      files: 9, sourceRows: 245_720, retainedRows: 245_720, sizeBasedRejections: 0,
      train: 213_226, development: 16_008, officialEligibleDevelopment: 14_968,
      sealedTest: 16_486, officialEligibleTest: 15_414,
    }),
    license: 'MIT release with attribution and upstream ATOMIC, SNLI, and Social Chemistry conditions',
    access: { state: 'public-direct-compound-source', actionUrl: 'https://github.com/rudinger/defeasible-nli' },
    adapterState: 'implemented-development', evaluationState: 'development-probe-executed',
    nextAction: 'Compile event, causal, physical, and normative update semantics into provenance-bearing defaults, then '
      + 'implement a generic before/after preferred-support comparator. Preserve the official test split until that method passes renamed development controls.',
  }),
  'alpha-nli-art': registration({
    id: 'alpha-nli-art', family: 'alphaNLI / ART', stage: 6, priority: 4,
    task: 'select the more plausible abductive explanation between two narrative observations',
    capabilities: ['abduction', 'event plausibility', 'narrative bridging', 'alternative ranking'],
    source: 'https://github.com/allenai/abductive-commonsense-reasoning',
    paper: 'https://openreview.net/forum?id=Byg1v1HKDB',
    sourceRevision: 'code 8ed901f038df77b7a4d0d8889255160d351d2b49; official ICLR 2020 data archive',
    sourceArtifact: Object.freeze({
      path: 'training/.cache/benchmarks/alpha-nli-art/source/anli.zip',
      bytes: 5_415_361,
      sha256: '4e00551fd9ee04c92e823a8fe078e017c78b35739b36e8f9f122b4bf8a84b16b',
    }),
    schemaInventory: Object.freeze({
      sourceRows: 174_245, retainedRows: 174_245, sizeBasedRejections: 0,
      train: 169_654, development: 1_532, sealedTest: 3_059,
      anomalies: 'All duplicate train pairs, identical hypotheses, embedded line breaks, and replacement characters remain retained and counted.',
    }),
    license: 'Apache-2.0 code; no explicit dataset license identifier; local noncommercial research without source-row redistribution',
    access: { state: 'public-direct-archive', actionUrl: 'https://github.com/allenai/abductive-commonsense-reasoning' },
    adapterState: 'implemented-development', evaluationState: 'development-probe-executed',
    nextAction: 'Compile observations and candidate bridges into typed events with causal, temporal, goal, state, and '
      + 'contradiction evidence before implementing generic narrative-bridge selection. Preserve the official test split until that method passes development controls.',
  }),
  reclor: registration({
    id: 'reclor', family: 'ReClor', stage: 7, priority: 4,
    task: 'multiple-choice reading comprehension requiring logical argument analysis',
    capabilities: ['argument structure', 'quantified constraints', 'conditional reasoning', 'multiple-choice validation'],
    source: 'https://github.com/yuweihao/reclor', paper: 'https://openreview.net/forum?id=HJgJtT4tvB',
    sourceRevision: 'official data release v1; code 19b9d6c6025866ceafb4a4028819654b3817069b',
    sourceArtifact: Object.freeze({
      path: 'training/.cache/benchmarks/reclor/source/v1/reclor_data.zip',
      bytes: 1_974_536,
      sha256: 'fc64ad8755e88d7ab353a4679101f6b9a7f22c7718ce57f993abd974920f055b',
    }),
    schemaInventory: Object.freeze({
      rows: 6_138, retainedRows: 6_138, train: 4_638, development: 500,
      sealedTest: 1_000, sizeBasedRejections: 0,
    }),
    license: 'official delivery states non-commercial research purpose; no separate dataset license identifier',
    access: { state: 'official-noncommercial-research-release', actionUrl: 'https://github.com/yuweihao/reclor' },
    adapterState: 'implemented-development', evaluationState: 'development-probe-executed',
    nextAction: 'Design a generic argument-structure representation and candidate-validation method for quantified, '
      + 'conditional, ordering, weakening, strengthening, and flaw questions. Keep the 1,000-case test byte-sealed until renamed and contrastive development controls pass.',
  }),
  logiqa: registration({
    id: 'logiqa', family: 'LogiQA', stage: 7, priority: 4,
    task: 'expert-authored multiple-choice reading comprehension with deductive reasoning',
    capabilities: ['argument comprehension', 'deduction', 'ordering constraints', 'multiple-choice validation'],
    source: 'https://github.com/lgw863/LogiQA-dataset', paper: 'https://arxiv.org/abs/2007.08124',
    sourceRevision: 'ff6c4cbca47627b3ac2da94a29fa28204a167b41',
    schemaInventory: Object.freeze({
      sourceRows: 17_356, semanticCasesPerLanguage: 8_678, retainedRows: 17_356,
      englishTrain: 7_376, englishDevelopment: 651, englishSealedTest: 651,
      chineseTrain: 7_376, chineseDevelopment: 651, chineseSealedTest: 651,
      sizeBasedRejections: 0,
    }),
    license: 'no explicit dataset license in the pinned official repository; local academic research without redistribution pending clarification',
    access: { state: 'public-repository-license-uncertain', actionUrl: 'https://github.com/lgw863/LogiQA-dataset' },
    adapterState: 'implemented-development', evaluationState: 'development-probe-executed',
    nextAction: 'Request authoritative dataset-license clarification and implement a generic argument-structure and '
      + 'candidate-validation method on the complete English development source. Keep both language test files sealed until the method passes renamed controls.',
  }),
});

export function validateResearchBenchmarkCatalog(catalog = RESEARCH_BENCHMARK_CATALOG) {
  const ids = new Set();
  for (const [key, entry] of Object.entries(catalog)) {
    if (entry.format !== 'eslm-benchmark-research-registration-v1') {
      throw new Error(`${key}: unsupported research benchmark registration format.`);
    }
    if (entry.id !== key) throw new Error(`${key}: catalog key and registration id differ.`);
    if (ids.has(entry.id)) throw new Error(`${key}: duplicate research benchmark id.`);
    ids.add(entry.id);
    if (!Number.isInteger(entry.stage) || entry.stage < 1 || entry.stage > 7) {
      throw new Error(`${key}: stage must be an integer from 1 through 7.`);
    }
    if (!Number.isInteger(entry.priority) || entry.priority < 1 || entry.priority > 5) {
      throw new Error(`${key}: priority must be an integer from 1 through 5.`);
    }
    for (const field of ['family', 'task', 'source', 'license', 'nextAction']) {
      if (typeof entry[field] !== 'string' || !entry[field].trim()) throw new Error(`${key}: missing ${field}.`);
    }
    if (!Array.isArray(entry.capabilities) || entry.capabilities.length === 0) {
      throw new Error(`${key}: capabilities must be a non-empty array.`);
    }
    if (!entry.access?.state || !entry.access?.actionUrl) throw new Error(`${key}: incomplete access action.`);
    if (!entry.cache?.path || !entry.cache?.validation) throw new Error(`${key}: incomplete cache contract.`);
    if (!['not-implemented', 'implemented-development', 'implemented-fresh'].includes(entry.adapterState)) {
      throw new Error(`${key}: unsupported adapter state.`);
    }
    if (!['not-run', 'development-probe-executed', 'fresh-evaluation-executed'].includes(entry.evaluationState)) {
      throw new Error(`${key}: unsupported evaluation state.`);
    }
    if (entry.evaluationState !== 'not-run' && entry.adapterState === 'not-implemented') {
      throw new Error(`${key}: an executed development probe requires an implemented adapter.`);
    }
  }
  return true;
}

export async function researchBenchmarkCacheStatus(catalog = RESEARCH_BENCHMARK_CATALOG) {
  validateResearchBenchmarkCatalog(catalog);
  const statuses = [];
  for (const entry of Object.values(catalog)) {
    let cached = false;
    let bytes;
    try {
      const details = await stat(join(PROJECT_ROOT, entry.cache.path));
      cached = true;
      if (details.isFile()) bytes = details.size;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    statuses.push(Object.freeze({
      id: entry.id,
      family: entry.family,
      stage: entry.stage,
      priority: entry.priority,
      task: entry.task,
      capabilities: entry.capabilities,
      accessState: entry.access.state,
      actionLabel: entry.evaluationState !== 'not-run' ? 'Inspect the execution receipt and remaining gates'
        : cached ? 'Validate and freeze the cached source' : 'Open the official source or access page',
      actionUrl: entry.access.actionUrl,
      license: entry.license,
      cached,
      cacheState: cached && entry.evaluationState !== 'not-run' ? 'validated-frozen'
        : cached ? 'cached-unvalidated' : 'absent',
      cachePath: entry.cache.path,
      ...(bytes === undefined ? {} : { bytes }),
      adapterState: entry.adapterState,
      evaluationState: entry.evaluationState,
      nextAction: entry.nextAction,
      ...(entry.sourceRevision ? { sourceRevision: entry.sourceRevision } : {}),
      ...(entry.sourceArtifact ? { sourceArtifact: entry.sourceArtifact } : {}),
      ...(entry.schemaInventory ? { schemaInventory: entry.schemaInventory } : {}),
    }));
  }
  return Object.freeze(statuses);
}
