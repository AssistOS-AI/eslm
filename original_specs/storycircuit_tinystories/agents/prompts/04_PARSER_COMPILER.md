# Incremental Parser and Compiler Prompt

Implement a total text-to-StoryIR compiler: every input receives either typed structures or explicit opaque/ambiguous nodes. Support incremental parsing, competing analyses, typed slot constraints, source spans, confidence, and deterministic replay. Do not drop failed sentences. Separate syntax recognition from world inference. Measure exact span, construction, slot, entity, event, and graph fidelity on annotated data, plus runtime and chart growth.
