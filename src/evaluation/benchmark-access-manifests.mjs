export const BENCHMARK_ACCESS_MANIFESTS = Object.freeze({
  'ewok-core-1.0': Object.freeze({
    format: 'eslm-benchmark-source-registration-v1',
    id: 'ewok-core-1.0',
    family: 'EWoK',
    task: 'world-knowledge minimal-pair preference',
    source: 'https://huggingface.co/datasets/ewok-core/ewok-core-1.0',
    sourceRevision: '34d912a608066c92e2990a0328ffc3bd9a716042',
    primaryDescription: 'https://ewok-core.github.io/',
    license: 'CC BY 4.0 with dataset Terms of Use',
    terms: 'https://github.com/ewok-core/ewok-paper/blob/main/TERMS_OF_USE.txt',
    access: Object.freeze({
      state: 'gated-explicit-acceptance-required',
      reason: 'The official host requires an authenticated user to acknowledge the license and Terms of Use.',
      operatorAction: 'Sign in to Hugging Face, accept the dataset conditions in the browser, then provide an authenticated protected download.',
      actionLabel: 'Open EWoK on Hugging Face and accept the terms',
      actionUrl: 'https://huggingface.co/datasets/ewok-core/ewok-core-1.0',
      credentialPolicy: 'Use an individual read token only in the operator environment; never commit or log it.',
    }),
    publicationPolicy: Object.freeze({
      plaintextRedistribution: false,
      trainingUseRequiresAttribution: true,
    }),
    scoreState: 'not-run-no-authorized-local-copy',
  }),
  'story-cloze-winter-2018': Object.freeze({
    format: 'eslm-benchmark-source-registration-v1',
    id: 'story-cloze-winter-2018',
    family: 'Story Cloze',
    task: 'select a coherent fifth sentence for a four-sentence story',
    source: 'https://goo.gl/XWjas1',
    testSource: 'https://goo.gl/BcTtB4',
    landingPage: 'https://cs.rochester.edu/nlp/rocstories/',
    primaryPaper: 'https://aclanthology.org/P18-2119/',
    license: 'dataset-specific terms are not stated on the public landing page',
    access: Object.freeze({
      state: 'authorized-delivered-links',
      reason: 'The operator completed the official access flow and supplied the delivered Winter 2018 validation and test links.',
      operatorAction: 'Acquire and validate the delivered Winter 2018 files in the ignored local cache.',
      actionLabel: 'Open the official ROCStories landing page',
      actionUrl: 'https://cs.rochester.edu/nlp/rocstories/',
    }),
    publicationPolicy: Object.freeze({
      plaintextRedistribution: false,
      reason: 'Do not assume redistribution rights before the delivered dataset terms are reviewed.',
    }),
    scoreState: 'not-run-no-valid-symbolic-narrative-method',
  }),
  'simpleqa-official-test-2024': Object.freeze({
    format: 'eslm-benchmark-source-registration-v1',
    id: 'simpleqa-official-test-2024',
    family: 'SimpleQA',
    task: 'short-form factual question answering',
    source: 'https://openaipublic.blob.core.windows.net/simple-evals/simple_qa_test_set.csv',
    sourceRepository: 'https://github.com/openai/simple-evals',
    sourceRevision: '652c89d0ca9df547706735883097e9537d40dc47',
    evaluatorPath: 'simpleqa_eval.py',
    license: 'MIT repository',
    access: Object.freeze({ state: 'public-direct-download' }),
    expectedArtifact: Object.freeze({
      filename: 'simple_qa_test_set.csv',
      bytes: 2_012_910,
      sha256: 'feee3f7e7db3617e94e8fcf1977b756ec420ef8568f4e0fcbbe0e92e9d5fc032',
      header: Object.freeze(['metadata', 'problem', 'answer']),
    }),
    oraclePolicy: Object.freeze({
      split: 'test',
      inputs: 'evaluation-visible',
      answers: 'local-evaluator-only',
      synthesisPacket: 'forbidden',
    }),
    officialScoring: Object.freeze({
      method: 'semantic CORRECT, INCORRECT, or NOT_ATTEMPTED classification by the official model-grader prompt',
      localExactMatch: 'diagnostic-only-not-an-official-simpleqa-score',
    }),
  }),
});

export function benchmarkAccessManifest(id) {
  const manifest = BENCHMARK_ACCESS_MANIFESTS[id];
  if (!manifest) throw new Error(`Unknown benchmark source registration: ${id}`);
  return manifest;
}

export function assertBenchmarkAcquirable(id) {
  const manifest = benchmarkAccessManifest(id);
  if (manifest.access.state !== 'public-direct-download') {
    throw new Error(`${id} cannot be acquired automatically: ${manifest.access.reason} ${manifest.access.operatorAction ?? ''}`.trim());
  }
  return manifest;
}
