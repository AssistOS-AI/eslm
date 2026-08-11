# ProverQA / ProverGen integration note

## Frozen source and rights boundary

The official Hugging Face dataset was frozen at revision `e2561beed450272690da658d21ae667570dbbafc`; the official ProverGen code archive was frozen at revision `1d8abd227912cee0b24819eb373ceba80979cb49`. The four dataset arrays contain 1,500 public evaluation rows and 5,000 training rows. All rows were validated. Three training rows contain malformed JSON inside the otherwise valid `output` string; they remain counted and retained but cannot enter a structured training packet without an explicit repair record.

The dataset card does not assign an explicit license identifier to the assembled dataset. It describes public academic/research use and the licenses of component name and keyword sources. ESLM therefore records a narrow local academic-research/no-redistribution policy instead of inferring a license grant.

## Evidence lifecycle

The public evaluation set was partitioned before adaptation by stable hash within the official easy, medium, and hard levels. Exactly 100 cases per level are development-visible. Exactly 400 per level formed the protected fresh partition. After the development candidate passed completely, the source, membership, adapter, solvers, and tests were frozen. The first evaluator attempt returned no semantic or aggregate outcome because of an output-only property-name error; that failure and the permitted serialization correction are recorded explicitly. After a second freeze, one aggregate-producing retry executed all 1,200 members. No fresh case, identifier, formula, sentence, label, reasoning trace, witness, or per-case outcome left the evaluator.

## Typed projection and scorer

The visible natural-language task contains context, question, options, difficulty level, and no answer or reference reasoning. A separate annotation-assisted diagnostic projects the official `nl2fol` premises and `conclusion_fol` into a finite named-domain formula task. The source inventory contains only unary predicates, 2,278 universal quantifiers, and no existential quantifiers, so this projection does not claim unrestricted first-order completeness. The existing scalable Boolean entailment method decides the grounded formula set. The scorer returns A when the conclusion is entailed, B when its negation is entailed, and C when neither is entailed. Every selected proof or countermodel is independently replayed.

## Development evidence and adapter-local repair

Without predicate reconciliation, 295 of 300 development cases matched the oracle. All five mismatches were traceable to inconsistent predicate identifiers inside official annotations, such as inflectional, derivational, auxiliary-prefixed, or modifier-omitting variants used for the same surface concept. A label-blind adapter policy first groups same-arity predicate signatures whose normalized token roots agree symmetrically. One additional modifier-omission alignment is permitted only when the shorter signature already has two content roots, differs by exactly one content root, and every source statement supporting that shorter identifier explicitly contains the omitted root. The policy does not inspect source IDs, answers, or reference reasoning. It raises the development diagnostic to 300 of 300; all 300 executions return `SOLVED`, and all 300 proof or countermodel witnesses verify.

An unrestricted subset-style predicate merge was rejected because it makes another development-visible context classically inconsistent by conflating predicates whose surfaces are related but whose formal roles differ. The accepted rule instead requires aligned source-language evidence for the one omitted modifier and passes a nonce positive control plus a contrast in which that surface evidence is absent. This is source-annotation repair, not a new logical axiom or an answer-specific branch. The next missing capability is a separately validated natural-language-to-formula method evaluated against newly untouched evidence.

## Core Guardian decision

No generic core code changed. The scalable Boolean method already passes the full rename test and returns verifiable witnesses. The new behavior is confined to source annotation normalization in the adapter. Static inspection found no benchmark name, row ID, expected answer, answer position, source predicate constant, or question hash in `src/reasoning/` or `src/language/` as part of this change.

## Fresh aggregate

The frozen annotation-assisted candidate matched 1,196 of 1,200 fresh oracle labels. It returned 1,198 independently valid proof or countermodel witnesses; two compiled contexts were reported as inconsistent. Only aggregates reveal two further strict mismatches among solved cases. Because no individual outcome escaped, those four cases cannot become a repair list. This checkpoint is fresh evidence for source-provided formula adaptation and finite logical execution, not direct understanding of the English input and not an official leaderboard result. The protected partition is now exhausted for iterative development.
