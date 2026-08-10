# AGENT START HERE — StoryCircuit / TinyStories

This repository is a research package for testing how far an executable symbolic language model can approach TinyStories capabilities while remaining auditable, decomposable, and progressively extensible by coding agents.

## Immediate operating rule

Do not replace the architecture with a generic neural model. The research question is whether language can be compiled into explicit executable structures, with neural components used only where they are empirically necessary. Preserve the separation:

`text -> StoryIR -> symbolic execution/world model -> planning -> text`

A neural baseline is included only for comparison.

## Read in this order

1. `PROJECT_CHARTER.md`
2. `theory/00_RESEARCH_PROGRAM.md`
3. `theory/01_EXECUTABLE_SYMBOLIC_LM.md`
4. `theory/02_TASK_AND_CAPABILITY_TAXONOMY.md`
5. `theory/03_STORYIR_AND_WORLD_MODEL.md`
6. `theory/04_PROGRAM_INDUCTION_BY_CODING_AGENTS.md`
7. `theory/05_PROBABILISTIC_SCORING_AND_GENERATION.md`
8. `theory/06_EVALUATION_AND_FALSIFICATION.md`
9. `architecture/SYSTEM_OVERVIEW.md`
10. `design_specs/` in numerical order
11. `agents/MASTER_CODING_AGENT_PROMPT.md`
12. `agents/AGENT_OPERATING_MANUAL.md`
13. `reports/EXPERIMENT_STATUS.md`

`PACKAGE_INDEX.md` is the full map of the repository.

## First commands

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
python scripts/check_environment.py
python scripts/run_smoke.py
pytest -q
```

Then inspect the current baseline and pilot:

```bash
cat reports/EXPERIMENT_STATUS.md
cat reports/VALIDATION_PILOT_FINDINGS.md
cat reports/CONTROLLED_SUITE_FINDINGS.md
```

## Research discipline

Every proposed improvement should state: the failure class, the hypothesis, the changed executable representation or algorithm, positive tests, negative tests, metamorphic tests where applicable, complexity cost, dev-set effect, and whether the change reduces opaque/unparsed language rather than merely overfitting examples.

Do not use held-out test data to author rules. Follow the shadow-gate protocol and the agent assignment workflow defined under `agents/`.

## Main objective

Increase performance on TinyStories-like language and LM-comparable evaluations while measuring separately:

- text-to-IR fidelity and semantic coverage;
- entity/coreference/world-state tracking;
- temporal, causal, intentional, and rule reasoning;
- continuation and ending preference;
- normalized language-model scoring;
- generation quality and parse-back consistency;
- symbolic closure versus residual neural computation;
- compute, memory, model/program size, and reproducibility.

The project is successful only if gains survive held-out evaluation and if the symbolic machinery contributes measurable generalization, verification, compression, interpretability, or computational advantages over appropriate neural baselines.
