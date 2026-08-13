import { OASST1_VALIDATION_SOURCE } from './oasst1-validation-membership.mjs';

export const OASST1_LARGE_SOURCE = Object.freeze({
  sourceId: 'oasst1', componentId: 'ready-conversation-trees',
  revision: 'fdf72ae0827c1cda404aff25b6603abec9e3399b',
  projectionId: 'oasst1-ready-english-structural-trees-v1',
  sha256: '2a9a8fd343e9b28e04a895a669d3253f82d93e9c174d440199ae19d5fafbdff7',
  bytes: 34_145_252, rawTrees: 10_364, rawMessages: 88_838,
  trainingTrees: 9_846, trainingMessages: 84_437,
  developmentTrees: 518, developmentMessages: 4_401,
  validationMembershipDigest: OASST1_VALIDATION_SOURCE.membershipDigest,
  projectedTrees: 2_220, projectedMessages: 22_373, shardCount: 16,
  rawRows: 10_364, trainingRows: 9_846, developmentRows: 518, projectedRows: 2_220,
  projectionDigest: 'sha256:ffb914e544f774123d323db4921031963c316f4fb7689696c5f94784291580b5',
  contentMembershipDigest: 'sha256:990121179c410e6ac769f4cf1e0517143e67fb008b7379ba4a59e285b392bb3d',
  projectionManifestDigest: 'sha256:8fbe40ea887f56e71a75ebea2c09bd170bdf4402691fb05d723917d8eb173181',
  supportingFiles: Object.freeze([Object.freeze({
    fileId: 'oasst1-validation-split', role: 'split-authority',
    sha256: OASST1_VALIDATION_SOURCE.parquetSha256,
    bytes: OASST1_VALIDATION_SOURCE.parquetBytes,
    mediaType: 'application/parquet',
  })]),
});
