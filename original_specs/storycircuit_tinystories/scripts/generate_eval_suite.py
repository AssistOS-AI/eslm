from __future__ import annotations

import runpy
from pathlib import Path

from _bootstrap import ROOT

if __name__ == "__main__":
    runpy.run_path(str(ROOT / "eval" / "generators" / "generate_suite.py"), run_name="__main__")
