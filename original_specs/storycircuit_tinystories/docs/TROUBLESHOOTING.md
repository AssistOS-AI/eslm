# Troubleshooting

## The downloader fails or returns an HTML file

Delete the `.part` file only after inspecting it. Corporate proxies and authentication pages can return HTML with status 200. Compare size and SHA-256 against the manifest. Use the official repository manually if necessary, then place the exact file under `data/raw/` and rerun the checksum audit.

## Corpus preparation produces few stories

Check the story delimiter expected by `storycircuit.text.iter_stories`, the selected TinyStories variant, `min_chars`, `max_chars`, and whether the downloaded file is compressed or HTML. Run `scripts/corpus_profile.py` on the raw file.

## Training exhausts RAM

Lower n-gram order or corpus scale for diagnosis, but do not present that as the full profile. For large runs, shard context counts, intern tokens, prune low counts after a first pass, and use an on-disk key-value store or sorted merge. The architecture specification treats this as an implementation workstream.

## The model JSON is too large

The JSON reference format prioritizes auditability. Production artifacts should use a versioned binary or SQLite/LMDB representation plus a small JSON manifest. Keep deterministic export to a canonical inspection format.

## Parser coverage is very low on TinyStories

This is expected for the reference parser. Do not solve it by adding a permissive wildcard that creates invented semantics. Build an annotated set, cluster opaque spans, induce typed constructions, and measure precision as coverage grows.

## Structured scores improve but likelihood does not

`structured_score` is a reranking diagnostic. It is not normalized. This result means semantic features discriminate some candidates; it does not show lower perplexity. Implement DS-011 before making language-model probability claims.

## Hugging Face QA tasks are unsupported

A causal LM does not natively expose StoryCircuit's `answer` method. Add a versioned prompting adapter with fixed answer extraction, or report the task as unsupported. Do not compare native symbolic QA to a selectively hand-tuned neural prompt without documenting the asymmetry.

## Generation appears repetitive

Inspect planner diversity, realizer construction probabilities, n-gram backoff, random seed, and parse-back repair loops. A generator can satisfy required words through repetition; measure repeated n-grams and unique event sequences.

## Tests pass but results changed across machines

Check Python version, dictionary/set iteration that influences tie-breaking, locale, line endings, dependency versions, worker count, and floating-point serialization. Every ambiguous ordering needs an explicit stable sort.

## A coding agent wants access to hidden examples

Do not provide them. Return a sanitized failure code and aggregate metric through the shadow gate. If the agent cannot improve without examples, enlarge train/dev with newly generated or annotated cases rather than leaking protected data.
