export function cliHelpText(defaultLanguageAgentModel) {
  return `ESLM — offline executable symbolic language model

Usage:
  eslm                         interactive conversation
  eslm ask <question>          answer one question
  eslm run --input FILE [--output FILE]
  eslm train prepare --input FILE --namespace ID [--output FILE]
  eslm train candidate --packet FILE --output DIRECTORY
  eslm train run --packet FILE --output DIRECTORY --skill NAME [--dry-run]
  eslm train validate [--model KB_PACKAGE_DIRECTORY]
  eslm dataset catalog
  eslm dataset fetch --dataset ID
  eslm dataset prepare --dataset ID [--chunk-size 500]
  eslm dataset status --dataset ID
  eslm corpus catalog
  eslm corpus status [--corpus ID[,ID]|all]
  eslm corpus probe --corpus oewn-2025 --archive FILE
  eslm kb list
  eslm kb show ID
  eslm kb register MANIFEST
  eslm kb unregister ID
  eslm kb compile --input RECORDS --output DIRECTORY --id ID --version VERSION --namespace ID
  eslm kb build ID|all
  eslm kb validate ID|all
  eslm evaluate --suite FILE [--publish]
  eslm benchmark catalog
  eslm benchmark references
  eslm benchmark status
  eslm benchmark probe --benchmark all|ID[,ID] [--publish]
  eslm benchmark run --suite FILE [--publish]
  eslm benchmark export --suite FILE --output FILE
  eslm benchmark score-predictions --suite FILE --input FILE --protocol-metadata FILE [--output FILE]
  eslm benchmark import-results --input FILE [--output FILE]
  eslm docs check|publish

Global options:
  --kb quick,oewn-2025          declarative knowledge packages; use --kb all for every catalog entry
  --memory-mb 512               soft process-memory target; enables adaptive shard loading
  --memory-policy auto          auto, eager, or lazy public-KB loading
  --work-profile balanced       quick, balanced, deep, or exhaustive-bounded work
  --heuristic-max-candidates N  exact symbolic approximation candidate override
  --heuristic-max-reparses N    exact candidate reparse override
  --heuristic-max-segments N    exact approximation segment override
  --heuristic-max-tokens N      exact approximation token override
  --heuristic-max-receipt-bytes N exact approximation receipt-byte override
  --heuristic-min-confidence X  accepted heuristic confidence threshold from 0 to 1
  --provider-max-sources N      exact provider fan-out override
  --provider-max-paraphrases N  exact alternative-surface override per provider
  --grounding-max-lookups N     exact grounding lookup override for the selected work profile
  --grounding-max-entries N     exact related-record output override
  --grounding-max-terms N       exact grounding topic-term override
  --grounding-max-values N      exact posting values per lookup override
  --grounding-max-candidates N  exact aggregate grounding candidate override
  --grounding-max-sources N     exact grounding source-and-receipt override
  --grounding-max-bytes N       exact related-record payload-byte override
  --horn-max-rounds N           exact positive Horn fixed-point round override
  --horn-max-facts N            exact Horn fact-inventory override
  --horn-max-joins N            exact Horn join-attempt override
  --color auto                  auto, always, or never; structured output is never colored
  --profile                     include per-stage timing, CPU, memory deltas, and work counts
  --external-language-agent     opt in to the configured Language Agent after local heuristics
  --no-external-language-agent  explicitly select the entirely local execution profile
  --language-agent-model MODEL  adapter model; default ${defaultLanguageAgentModel}
  --no-normalization-cache      do not read or write the ignored operator normalization cache
`;
}

export function cliStartupText(style, selectedKbIds, workPolicy, languageAgentEnabled) {
  const knowledge = selectedKbIds.join(', ') || 'none';
  const normalization = languageAgentEnabled ? style.yellow('on') : style.green('off');
  return `${style.bold(style.blue('ESLM'))} is ready. Public knowledge: ${style.green(knowledge)}.
Use ${style.blue('/help')} for an explanation, ${style.blue('/examples')} for varied examples, or \
${style.blue('/smoke')} to execute a regression check. Press Tab to complete commands and KB names.
Work profile: ${style.green(workPolicy.effective.profile)}. Language Agent normalization is \
${normalization}; external assistance is opt-in.`;
}
