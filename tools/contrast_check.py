"""WCAG glass contrast from actual CSS tokens; flat-sample approximation, not GPU blur."""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / "frontend/src/design-system/styles/tokens.css"


def tokens(theme: str) -> dict[str, str]:
    css = CSS.read_text(encoding="utf-8")
    values = dict(re.findall(rf"--{theme}-([\w-]+):\s*([^;]+);", css))
    for key in values:
        if not re.search(rf"--{key}:\s*var\(--{theme}-{key}\);", css):
            raise ValueError(f"{theme} {key}: public alias must reference the measured token")
    return values


def rgb(value: str) -> list[float]:
    return [float(int(value[i:i + 2], 16)) for i in (1, 3, 5)]


def luminance(color: list[float]) -> float:
    channels = [v / 255 for v in color]
    linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in channels]
    return sum(a * b for a, b in zip(linear, [.2126, .7152, .0722], strict=True))


def contrast(a: list[float], b: list[float]) -> float:
    hi, lo = sorted((luminance(a), luminance(b)), reverse=True)
    return (hi + .05) / (lo + .05)


def check(theme: str) -> tuple[bool, dict[str, dict[str, str]]]:
    t = tokens(theme)
    samples = ["plane-base", "plane-band-a", "plane-band-b", "sample-band-a-noise", "sample-band-b-noise"]
    surfaces: dict[str, str] = {}
    valid = True
    for level in range(1, 4):
        alpha = float(t[f"glass-alpha-l{level}"])
        for name in samples:
            composite = [round(c * (1 - alpha) + 255 * alpha) for c in rgb(t[name])]
            surfaces[f"L{level}/{name}"] = "#" + "".join(f"{c:02x}" for c in composite)
        level_surfaces = [v for k, v in surfaces.items() if k.startswith(f"L{level}/")]
        worst = min(level_surfaces, key=lambda v: contrast(rgb(t["ink-3"]), rgb(v)))
        if t[f"surface-solid-l{level}"] != worst:
            print(f"{theme} L{level}: fallback differs from worst sample {worst} FAIL")
            valid = False
    for name in ["ink", "ink-2", "ink-3"]:
        ratio, surface = min((contrast(rgb(t[name]), rgb(v)), k) for k, v in surfaces.items())
        ok = ratio >= 4.5
        valid &= ok
        print(f"{theme} {name}: {ratio:.2f}:1 {surface} >=4.5 {'PASS' if ok else 'FAIL'}")
    status_min = min(contrast(rgb(t[f"status-{name}"]), rgb(v))
                     for name in ["ok", "warn", "bad", "idle"] for v in surfaces.values())
    valid &= status_min >= 3
    print(f"{theme} status marks: {status_min:.2f}:1 >=3 {'PASS' if status_min >= 3 else 'FAIL'} (text uses ink)")
    return valid, {"surfaces": surfaces}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--theme", choices=["dark", "light", "all"], default="all")
    parser.add_argument("--write-surfaces", action="store_true")
    args = parser.parse_args()
    themes = ["dark", "light"] if args.theme == "all" else [args.theme]
    results = {theme: check(theme) for theme in themes}
    if args.write_surfaces:
        target = ROOT / "tools/artifacts/glass-surfaces.json"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps({k: v[1] for k, v in results.items()}, indent=2) + "\n", encoding="utf-8")
    return 0 if all(v[0] for v in results.values()) else 1


if __name__ == "__main__":
    raise SystemExit(main())
