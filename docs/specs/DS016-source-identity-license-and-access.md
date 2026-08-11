---
id: DS016
title: Source Identity, License, and Access Authority
status: in-progress
owner: data-governance
summary: Defines immutable source identity, acquisition authority, licensing and redistribution boundaries, protected caches, citations, and the separation between project code licensing and third-party data rights.
---

# DS016 Source Identity, License, and Access Authority

## Introduction

This specification governs external documents, knowledge sources, and benchmark releases before their contents become input to an adapter or compiler. It separates the scientific desire to use a source from the legal and operational authority to acquire, retain, transform, and redistribute it.

## Core Content

### Immutable source manifest

Every external source receives a source manifest before semantic use. The manifest records a stable source identifier, upstream owner, official source and paper URLs, exact revision or delivered edition, acquisition method, local cache policy, byte length, cryptographic digest, media type, declared license, access terms, citation, redistribution boundary, and extraction inventory. A mutable branch name, landing page, or cache directory is not a frozen source identity.

Redirected and form-delivered artifacts record the authorized initial URL and the final delivered artifact identity. Protected sources remain in ignored local storage. Tokens, cookies, signed URLs, and credentials never enter the manifest, repository, diagnostics, or documentation.

### Authority classes

An openly downloadable source may be acquired only through an explicit acquisition command or operator action. A gated source requires the operator to accept the official terms and authorize the local identity used for access. A form-delivered source requires preservation of the delivered link or file and the accompanying terms. A source with unclear dataset licensing may be used only under the narrow locally reviewed research policy until rights are clarified.

`cached`, `authorized`, `licensed for local research`, `redistributable`, and `implemented` are different states. The presence of bytes proves none of the others. Status output must give an actionable official URL and exact operator step when authority or delivery is missing.

### Project license and third-party rights

The repository's MIT license governs ESLM-authored code and documentation. It does not relicense benchmark rows, knowledge dumps, papers, annotations, or form-delivered files. A non-commercial source may be used for this declared research project when its terms permit that use; non-commercial status is not itself a technical blocker. Attribution, access, confidentiality, derivative-work, and redistribution conditions remain binding.

A code repository license does not automatically cover a dataset archive unless the upstream release says so. Licenses attached to component sources such as WordNet or Wikidata do not automatically govern an assembled benchmark. Uncertainty remains explicit in the source manifest and source documentation.

### Complete retention and semantic projection

Acquisition retains the complete authorized frozen source in ignored storage when feasible. A compiler may select a documented semantic projection by language, relation family, source quality, license class, or supported schema. The manifest and build report count every valid row outside the current projection. Physical size, memory budget, or convenience is never a reason to delete or silently reject a valid source record.

Protected benchmark rows, test labels, and form-delivered data are not committed in plaintext. Their manifests and aggregate receipts may be committed when those artifacts reveal no protected content and comply with the source terms.

### Citation and attribution

Each source registration records the citation requested by its owner and any paper that defines the task or data. Human documentation names every source actually used and distinguishes a paper's license from the dataset's license. Generated answers preserve source-level provenance when facts from an external KB contribute.

### Access status versus evaluation status

Acquiring and validating a source does not establish an adapter, executable method, score, or official protocol match. The catalog reports source access separately from adapter and evaluation states. Missing access produces `not-run` with no denominator, never a fabricated zero. A score may be published only after DS017 oracle isolation and DS010 measurement requirements are satisfied.

## Decisions & Questions

### Question #1: May non-commercial benchmark data be used within its terms?

Response: Yes when the benchmark's own terms authorize non-commercial research. The project still preserves attribution, access controls, redistribution prohibitions, and any derivative-work conditions; MIT does not override them.

### Question #2: How is a dataset archive handled when it has no explicit license?

Response: The manifest records that precise uncertainty, the official owner and contact path, and a narrow local research/no-redistribution policy. The project may validate locally authorized bytes, but it does not publish or imply broader rights.

## Conclusion

External data enters ESLM through a frozen, attributable, rights-aware boundary. Scientific use, local possession, redistribution, and implementation remain separate claims, each supported by its own evidence.
