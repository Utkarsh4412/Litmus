"""Build the backend wheel from a copy of backend/ and assert the packaged data files are inside."""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

REQUIRED = (
    "litmus/generation/prompts/default.md",
    "litmus/observability/data/model_pricing.toml",
)


def main() -> int:
    backend = Path(__file__).resolve().parents[1] / "backend"
    skip = shutil.ignore_patterns(
        "__pycache__", ".venv*", "build", "*.egg-info", "tests", ".pytest_cache", ".mypy_cache",
        ".ruff_cache", ".coverage*",
    )  # fmt: skip
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp) / "backend"
        shutil.copytree(backend, work, ignore=skip)
        out = Path(tmp) / "dist"
        cmd = [sys.executable, "-m", "pip", "wheel", "--no-deps", "-q", "-w", str(out), str(work)]
        subprocess.run(cmd, check=True)
        wheels = sorted(out.glob("*.whl"))
        if len(wheels) != 1:
            print(f"expected one wheel, found {len(wheels)}")
            return 1
        with zipfile.ZipFile(wheels[0]) as zf:
            names = set(zf.namelist())
    missing = [r for r in REQUIRED if r not in names]
    for r in missing:
        print(f"MISSING in {wheels[0].name}: {r}")
    print(f"{wheels[0].name}: {len(names)} files; required present: {len(REQUIRED) - len(missing)}/{len(REQUIRED)}")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
