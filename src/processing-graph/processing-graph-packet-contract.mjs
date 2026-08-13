import { sha256, stableStringify } from '../util.mjs';
import { PROCESSING_GRAPH_CATALOG } from './processing-graph-catalog.mjs';
import {
  PROCESSING_GRAPH_PACKET_CONTRACT_CATALOG,
  PROCESSING_GRAPH_PACKET_CONTRACT_CATALOG_PROTOCOL,
} from './processing-graph-packet-catalog.mjs';

export const PROCESSING_GRAPH_PACKET_PRIVACY_CLASSES = Object.freeze([
  'internal', 'request-private', 'research-restricted', 'source-controlled',
]);
export const PROCESSING_GRAPH_PACKET_PROVENANCE_POLICIES = Object.freeze([
  'conditional', 'host-derived', 'required',
]);
export const PROCESSING_GRAPH_PACKET_LIFETIMES = Object.freeze([
  'audit-receipt', 'build', 'published-artifact', 'request', 'research-run', 'session-snapshot', 'transaction',
]);
export const PROCESSING_GRAPH_PACKET_AUTHORITY_EFFECTS = Object.freeze([
  'none', 'non-authoritative-proposal', 'publishes-artifact', 'records-gap', 'records-gate-decision',
  'records-selection', 'rollback-only', 'verified-claims-only', 'work-allocation',
]);

const CATALOG_FIELDS = new Set(['format', 'graphCatalogFormat', 'contracts']);
const CONTRACT_FIELDS = new Set([
  'packetType', 'producers', 'consumers', 'requiredFields', 'optionalFields', 'absenceMeaning',
  'boundResourceRefs', 'validationOwner', 'privacy', 'provenance', 'lifetime', 'authorityEffect',
]);
const IDENTIFIER = /^[a-z0-9]+(?::[a-z0-9][a-z0-9-]*)+(?:@\d+)?$/u;
const SEMANTIC_FIELD = /^[a-z][A-Za-z0-9]*$/u;
const SHARED_VALIDATION_OWNER_PACKET_TYPES = new Map([
  ['owner:shared:strategy-coordination', new Set([
    'packet:shared:coordinator-receipt',
    'packet:shared:correlation-ledger',
  ])],
]);
const VALIDATION_OWNER_KINDS_BY_AUTHORITY_EFFECT = new Map([
  ['none', new Set(['authority-gate', 'coordinator', 'process', 'source'])],
  ['non-authoritative-proposal', new Set(['sink'])],
  ['publishes-artifact', new Set(['sink'])],
  ['records-gap', new Set(['authority-gate', 'sink'])],
  ['records-gate-decision', new Set(['authority-gate'])],
  ['records-selection', new Set(['coordinator'])],
  ['rollback-only', new Set(['process'])],
  ['verified-claims-only', new Set(['authority-gate'])],
  ['work-allocation', new Set(['authority-gate', 'process'])],
]);

function record(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new TypeError(`${path} must be a plain object.`);
  }
  return value;
}

function exactFields(value, fields, path) {
  record(value, path);
  const keys = Reflect.ownKeys(value);
  const unknown = keys.filter((field) => typeof field !== 'string' || !fields.has(field));
  const missing = [...fields].filter((field) => !(field in value));
  if (unknown.length > 0 || missing.length > 0) {
    throw new TypeError(
      `${path} has a non-closed field set; unknown=${unknown.map(String).join(',')}; missing=${missing.join(',')}.`,
    );
  }
}

function identifier(value, path) {
  if (typeof value !== 'string' || value.length > 192 || !IDENTIFIER.test(value)) {
    throw new TypeError(`${path} must be a bounded namespaced identifier.`);
  }
}

function visibleText(value, path) {
  if (typeof value !== 'string' || value.length < 1 || Buffer.byteLength(value, 'utf8') > 512
      || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new TypeError(`${path} must be bounded visible text.`);
  }
}

function canonicalIdentifiers(value, path, { allowEmpty = true } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0) || value.length > 128) {
    throw new TypeError(`${path} must be a bounded${allowEmpty ? '' : ' non-empty'} array.`);
  }
  for (const [index, item] of value.entries()) identifier(item, `${path}[${index}]`);
  if (stableStringify(value) !== stableStringify([...new Set(value)].toSorted())) {
    throw new TypeError(`${path} must be unique and canonically ordered.`);
  }
}

function canonicalSemanticFields(value, path, { allowEmpty = true } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0) || value.length > 64) {
    throw new TypeError(`${path} must be a bounded${allowEmpty ? '' : ' non-empty'} field array.`);
  }
  for (const [index, field] of value.entries()) {
    if (typeof field !== 'string' || field.length > 64 || !SEMANTIC_FIELD.test(field)) {
      throw new TypeError(`${path}[${index}] must be a bounded high-level semantic field name.`);
    }
  }
  if (stableStringify(value) !== stableStringify([...new Set(value)].toSorted())) {
    throw new TypeError(`${path} must be unique and canonically ordered.`);
  }
}

function endpoints(graphCatalog, packetType, direction) {
  const field = direction === 'producer' ? 'outputPacketTypes' : 'inputPacketTypes';
  return graphCatalog.nodes.filter((item) => item[field].includes(packetType))
    .map((item) => item.nodeId).toSorted();
}

function assertValidationOwner(item, path, nodes, expectedProducers, expectedConsumers) {
  const ownerNode = nodes.get(item.validationOwner);
  if (!ownerNode) {
    const packetTypes = SHARED_VALIDATION_OWNER_PACKET_TYPES.get(item.validationOwner);
    if (!packetTypes?.has(item.packetType)) {
      throw new TypeError(`${path} has unknown or packet-ineligible validation owner ${item.validationOwner}.`);
    }
    if (expectedConsumers.length > 0 || expectedProducers.some((nodeId) =>
      nodes.get(nodeId)?.kind !== 'coordinator')) {
      throw new TypeError(
        `${path} shared strategy-coordination owner requires coordinator producers and no consumers.`,
      );
    }
    return;
  }

  const isProducer = expectedProducers.includes(item.validationOwner);
  const isConsumer = expectedConsumers.includes(item.validationOwner);
  if (!isProducer && !isConsumer) {
    throw new TypeError(
      `${path} validation owner must be a declared producer or consumer endpoint.`,
    );
  }
  const eligibleKinds = VALIDATION_OWNER_KINDS_BY_AUTHORITY_EFFECT.get(item.authorityEffect);
  if (!eligibleKinds?.has(ownerNode.kind)) {
    throw new TypeError(
      `${path} validation-owner kind ${ownerNode.kind} contradicts authority effect ${item.authorityEffect}.`,
    );
  }
  if (item.authorityEffect !== 'records-gap' && !isProducer) {
    throw new TypeError(
      `${path} validation owner must produce a non-gap packet before it crosses the boundary.`,
    );
  }
}

function canonicalPacketCatalogView(catalog) {
  return {
    format: catalog.format,
    graphCatalogFormat: catalog.graphCatalogFormat,
    contracts: [...catalog.contracts]
      .toSorted((left, right) => left.packetType.localeCompare(right.packetType)),
  };
}

export function processingGraphPacketContractCatalogDigest(
  catalog = PROCESSING_GRAPH_PACKET_CONTRACT_CATALOG,
) {
  return `sha256:${sha256(stableStringify(canonicalPacketCatalogView(catalog)))}`;
}

export function assertProcessingGraphPacketContractCatalog(
  catalog = PROCESSING_GRAPH_PACKET_CONTRACT_CATALOG,
  graphCatalog = PROCESSING_GRAPH_CATALOG,
) {
  exactFields(catalog, CATALOG_FIELDS, 'Processing graph packet-contract catalog');
  if (catalog.format !== PROCESSING_GRAPH_PACKET_CONTRACT_CATALOG_PROTOCOL) {
    throw new TypeError(
      `Packet-contract catalog format must be ${PROCESSING_GRAPH_PACKET_CONTRACT_CATALOG_PROTOCOL}.`,
    );
  }
  if (catalog.graphCatalogFormat !== graphCatalog.format) {
    throw new TypeError('Packet-contract catalog must name the validated processing-graph format.');
  }
  if (!Array.isArray(catalog.contracts)) {
    throw new TypeError('Processing graph packet contracts must be an array.');
  }
  const expectedPacketTypes = [...graphCatalog.packetTypes].toSorted();
  const actualPacketTypes = catalog.contracts.map((item) => item.packetType);
  if (stableStringify(actualPacketTypes) !== stableStringify(expectedPacketTypes)) {
    throw new TypeError('Packet contracts must exactly cover every live processing-graph packet identity.');
  }
  const nodes = new Map(graphCatalog.nodes.map((item) => [item.nodeId, item]));
  const resources = new Set(graphCatalog.resourceDimensions);
  for (const [index, item] of catalog.contracts.entries()) {
    const path = `Packet contract[${index}]`;
    exactFields(item, CONTRACT_FIELDS, path);
    identifier(item.packetType, `${path}.packetType`);
    canonicalIdentifiers(item.producers, `${path}.producers`, { allowEmpty: false });
    canonicalIdentifiers(item.consumers, `${path}.consumers`);
    canonicalSemanticFields(item.requiredFields, `${path}.requiredFields`, { allowEmpty: false });
    canonicalSemanticFields(item.optionalFields, `${path}.optionalFields`);
    if (item.requiredFields.some((field) => item.optionalFields.includes(field))) {
      throw new TypeError(`${path} required and optional semantic fields must be disjoint.`);
    }
    visibleText(item.absenceMeaning, `${path}.absenceMeaning`);
    canonicalIdentifiers(item.boundResourceRefs, `${path}.boundResourceRefs`, { allowEmpty: false });
    for (const resourceRef of item.boundResourceRefs) {
      if (!resources.has(resourceRef)) throw new TypeError(`${path} references unknown bound resource ${resourceRef}.`);
    }
    identifier(item.validationOwner, `${path}.validationOwner`);
    for (const [field, choices] of [
      ['privacy', PROCESSING_GRAPH_PACKET_PRIVACY_CLASSES],
      ['provenance', PROCESSING_GRAPH_PACKET_PROVENANCE_POLICIES],
      ['lifetime', PROCESSING_GRAPH_PACKET_LIFETIMES],
      ['authorityEffect', PROCESSING_GRAPH_PACKET_AUTHORITY_EFFECTS],
    ]) {
      if (!choices.includes(item[field])) throw new TypeError(`${path}.${field} is not in the closed vocabulary.`);
    }
    if (item.provenance === 'required' && !item.requiredFields.includes('provenance')) {
      throw new TypeError(`${path} requires provenance but does not require its semantic field.`);
    }
    const expectedProducers = endpoints(graphCatalog, item.packetType, 'producer');
    const expectedConsumers = endpoints(graphCatalog, item.packetType, 'consumer');
    assertValidationOwner(item, path, nodes, expectedProducers, expectedConsumers);
    if (stableStringify(item.producers) !== stableStringify(expectedProducers)
        || stableStringify(item.consumers) !== stableStringify(expectedConsumers)) {
      throw new TypeError(`${path} producer or consumer inventory contradicts the processing graph.`);
    }
  }
  return catalog;
}

export function processingGraphPacketContract(
  packetType,
  catalog = PROCESSING_GRAPH_PACKET_CONTRACT_CATALOG,
) {
  return catalog.contracts.find((item) => item.packetType === packetType);
}

export function assertProcessingGraphPacketEnvelope(
  packetType,
  envelope,
  catalog = PROCESSING_GRAPH_PACKET_CONTRACT_CATALOG,
) {
  assertProcessingGraphPacketContractCatalog(catalog, PROCESSING_GRAPH_CATALOG);
  const contract = processingGraphPacketContract(packetType, catalog);
  if (!contract) throw new TypeError(`Unknown processing-graph packet identity ${packetType}.`);
  record(envelope, packetType);
  const allowed = new Set([...contract.requiredFields, ...contract.optionalFields]);
  const unknown = Reflect.ownKeys(envelope).filter((field) => typeof field !== 'string' || !allowed.has(field));
  const missing = contract.requiredFields.filter((field) => !(field in envelope) || envelope[field] === undefined);
  if (unknown.length > 0 || missing.length > 0) {
    throw new TypeError(
      `${packetType} has unknown semantic fields=${unknown.map(String).join(',')} or missing=${missing.join(',')}.`,
    );
  }
  return envelope;
}
