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

The research pipeline realizes this boundary as the closed `eslm-rl-dataset-source-manifest-v2` packet. Its
`acquisition` record names the authorized immutable URL, access terms, ignored-cache policy, and credential policy.
`deliveredFiles` binds every source, split-authority, license, or metadata file by role, safe relative cache path,
source URL, bytes, media type, and SHA-256. Each component separately binds its license URL, rights decision, allowed
uses, redistribution boundary, split visibility, raw identity, and exact semantic projection. Delivered-file IDs and
paths are unique. The manifest-level `identityFileId` must name the delivered file whose bytes, media type, and digest
equal the source identity. Each component likewise names one `identityFileId`; `supportingFileIds` separately names
split-authority or other content-bound inputs without pretending that their bytes are the component payload. Thus a
source or component identity cannot be an unrelated self-asserted digest. `rightsReview` names a
repository-policy review, exact reviewed revision, delivered-file and primary-source evidence, decision, and retained
limitations. `extractionInventory` names selected and excluded component classes and confirms that the raw source and
projection losses remain retained. Unknown fields, duplicate split names, unbound evidence, and review/revision drift
are rejected before source admission.

This manifest is an auditable repository policy decision, not a cryptographic proof that an upstream legal claim is
true and not legal advice. A reviewer still checks the pinned official pages and delivered license bytes. The
admission gate may authorize only the exact component and projection named by an `admit-declared-projection`
decision; it cannot broaden access, redistribution, runtime truth, or promotion authority.

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

### Question #3: What makes a research-source approval inspectable?

Response: Approval is not a bare enum. The v2 manifest binds the immutable acquisition URL, delivered source and
rights-evidence files, component license URL, split inventory, exact allowed use, extraction scope, reviewed revision,
limitations, and removal obligations. Host and portable validators reject an approval that omits or contradicts
those bindings. Live status must also re-read the current manifest, so a later tombstone, withdrawal, or rights change
closes admission instead of leaving a historical analysis looking current.

## Conclusion

External data enters ESLM through a frozen, attributable, rights-aware boundary. Scientific use, local possession, redistribution, and implementation remain separate claims, each supported by its own evidence.
