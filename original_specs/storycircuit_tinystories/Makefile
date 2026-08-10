PYTHON ?= python
PROFILE ?= configs/profiles/pilot.yaml
SUITE ?= configs/suites/core.yaml

.PHONY: install smoke test validate audit download prepare train evaluate controlled neural-smoke clean-cache package

install:
	$(PYTHON) -m pip install -e ".[dev]"

smoke:
	PYTHONPATH=src $(PYTHON) scripts/run_smoke.py

test:
	$(PYTHON) -m pytest -q

validate:
	PYTHONPATH=src $(PYTHON) scripts/validate_schemas.py

audit:
	PYTHONPATH=src $(PYTHON) scripts/audit_package.py --write-manifest

download:
	PYTHONPATH=src $(PYTHON) scripts/download_tinystories.py --variant v2-gpt4 --split both

prepare:
	PYTHONPATH=src $(PYTHON) scripts/prepare_corpus.py --profile $(PROFILE)

train:
	PYTHONPATH=src $(PYTHON) scripts/train_symbolic.py --profile $(PROFILE)

evaluate:
	PYTHONPATH=src $(PYTHON) scripts/evaluate.py --model artifacts/pilot/model.json --suite $(SUITE) --output-dir results/pilot

controlled:
	PYTHONPATH=src $(PYTHON) scripts/generate_eval_suite.py --output eval/generated --items-per-family 200 --seed 1729

neural-smoke:
	PYTHONPATH=src:. $(PYTHON) scripts/prepare_byte_corpus.py --input data/smoke/prepared/train.jsonl --output data/smoke/prepared/train.bytes.u16
	PYTHONPATH=src:. $(PYTHON) scripts/train_byte_transformer.py --tokens data/smoke/prepared/train.bytes.u16 --config configs/neural/byte_smoke.yaml --output artifacts/neural/byte_smoke.pt --device cpu
	PYTHONPATH=src:. $(PYTHON) scripts/evaluate_torch_baseline.py --checkpoint artifacts/neural/byte_smoke.pt --suite configs/suites/smoke.yaml --output-dir results/neural_smoke --device cpu

clean-cache:
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
	rm -rf .pytest_cache

package: audit clean-cache
	cd .. && zip -qr storycircuit_tinystories.zip storycircuit_tinystories -x 'storycircuit_tinystories/data/raw/*' 'storycircuit_tinystories/data/prepared/*'
