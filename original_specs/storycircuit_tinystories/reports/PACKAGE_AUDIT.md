# Package Audit

Release 0.1 was audited on 10 August 2026.

```text
required-file audit: pass
JSON/JSONL and schema validation: pass
controlled evaluation items validated: 1,600+
unit/integration tests: 11 passed
raw TinyStories corpus packaged: no
```

The audit command is:

```bash
python scripts/audit_package.py --write-manifest
```

During local development after downloading TinyStories, use `--allow-raw-data`; omit that option when constructing a distributable archive.
