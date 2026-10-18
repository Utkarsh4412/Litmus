"""Check the provisioned dashboard against the backend registry and scrape jobs.

Run from any directory with the backend installed. This checks the static PromQL
used by this dashboard, not arbitrary PromQL: dynamic metric names are rejected.
"""
from __future__ import annotations

import ast
import json
import re
import sys
import tempfile
from pathlib import Path
from typing import Any

import yaml
from prometheus_client import CollectorRegistry, ProcessCollector

from litmus.observability.metrics import REGISTRY

ROOT = Path(__file__).resolve().parents[1]
MONITORING = ROOT / "infra/monitoring"
IDENTIFIER = re.compile(r"[a-zA-Z_:][a-zA-Z0-9_:]*")
SUFFIXES = {
    "counter": ("_total", "_created"),
    "histogram": ("_bucket", "_sum", "_count", "_created"),
}


def process_families():
    """Validate the Linux collector's names on Windows using its public proc API.

    Confirm metrics.py registers that same unnamespaced collector first. The
    tiny procfs fixture supplies names only; no live process values are tested.
    """
    tree = ast.parse((ROOT / "backend/src/litmus/observability/metrics.py").read_text())
    assert any(
        isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
        and node.func.id == "ProcessCollector" and not node.args
        and len(node.keywords) == 1 and node.keywords[0].arg == "registry"
        and isinstance(node.keywords[0].value, ast.Name)
        and node.keywords[0].value.id == "REGISTRY"
        for node in ast.walk(tree)
    ), "metrics.py must register an unnamespaced ProcessCollector in REGISTRY"
    with tempfile.TemporaryDirectory() as directory:
        proc = Path(directory)
        (proc / "stat").write_text("btime 1\n")
        (proc / "self").mkdir()
        (proc / "self/stat").write_text("1 (python) " + " ".join(["0"] * 22))
        return list(ProcessCollector(proc=directory, registry=CollectorRegistry()).collect())


def query_metrics(expression: str) -> set[str]:
    """Remove labels/ranges/grouping, then retain bare vector identifiers.

    Function names are followed by '('; operators and numeric literals are not
    metrics. Reject name matchers/variables instead of silently ignoring them.
    """
    if re.search(r"\b__name__\s*", expression):
        raise ValueError("__name__ matchers are unsupported; use a literal metric name")
    expression = re.sub(r'"(?:\\.|[^"\\])*"', '""', expression)
    expression = re.sub(r"\{[^{}]*\}|\[[^\[\]]*\]", " ", expression)
    expression = re.sub(
        r"\b(?:by|without|on|ignoring|group_left|group_right)\s*\([^()]*\)",
        " ", expression,
    )
    if "$" in expression or "{" in expression or "[" in expression:
        raise ValueError("unsupported dynamic metric or selector")
    expression = re.sub(r"\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b", " ", expression)
    return {
        token.group()
        for token in IDENTIFIER.finditer(expression)
        if token.group() not in {"and", "or", "unless", "bool", "offset"}
        and not expression[token.end():].lstrip().startswith("(")
    }


def walk(value: Any) -> list[dict[str, Any]]:
    if isinstance(value, dict):
        return [value, *(item for child in value.values() for item in walk(child))]
    if isinstance(value, list):
        return [item for child in value for item in walk(child)]
    return []


def main() -> int:
    dashboard_path = MONITORING / "grafana/dashboards/litmus-overview.json"
    dashboard = json.loads(dashboard_path.read_text(encoding="utf-8"))
    prometheus = yaml.safe_load((MONITORING / "prometheus.yml").read_text(encoding="utf-8"))
    provisioning = MONITORING / "grafana/provisioning"
    datasources = yaml.safe_load(
        (provisioning / "datasources/prometheus.yml").read_text(encoding="utf-8")
    )["datasources"]
    providers = yaml.safe_load(
        (provisioning / "dashboards/litmus.yml").read_text(encoding="utf-8")
    )["providers"]
    errors: list[str] = []
    jobs = {job["job_name"]: job for job in prometheus["scrape_configs"]}
    backend_job = jobs.get("litmus-backend", {})
    if backend_job.get("metrics_path") != "/metrics" or not any(
        "backend:8000" in config.get("targets", [])
        for config in backend_job.get("static_configs", [])
    ):
        errors.append("litmus-backend must scrape backend:8000/metrics")
    if dashboard.get("uid") != "litmus-overview":
        errors.append("unexpected dashboard UID")
    if not any(
        provider.get("name") == "Litmus" and provider.get("folder") == "Litmus"
        and provider.get("options", {}).get("path") == "/var/lib/grafana/dashboards"
        for provider in providers
    ):
        errors.append("Litmus dashboard provider/path missing")
    if not any(
        source.get("uid") == "litmus-prometheus" and source.get("type") == "prometheus"
        and source.get("url") == "http://prometheus:9090"
        for source in datasources
    ):
        errors.append("litmus-prometheus datasource missing or misrouted")

    families = list(REGISTRY.collect())
    families.extend(process_families())
    series: dict[str, str] = {}
    for family in families:
        for suffix in SUFFIXES.get(family.type, ("",)):
            series[family.name + suffix] = family.name
    used: set[str] = set()
    for node in walk(dashboard):
        source = node.get("datasource")
        if source is not None and source.get("uid") != "litmus-prometheus":
            errors.append("dashboard datasource UID differs from provisioning")
        if "expr" not in node:
            continue
        expression = node["expr"]
        used.update(query_metrics(expression))
        for job in re.findall(r'\bjob\s*=\s*"([^"]+)"', expression):
            if job not in jobs:
                errors.append(f"dashboard job absent from prometheus.yml: {job}")
    # Recording rules have their own registry, which this project does not use.
    if prometheus.get("rule_files"):
        errors.append("rule_files need explicit validation before use")
    errors.extend(f"metric absent from REGISTRY: {name}" for name in sorted(used - series.keys()))
    guide = (ROOT / "docs/guides/monitoring.md").read_text(encoding="utf-8")
    documented = {
        name for line in guide.splitlines() if line.startswith("| `")
        for name in re.findall(r"`(litmus_\w+)`", line.split("|")[1])
    }
    # The guide names histogram families; PromQL must use their actual series.
    documented_names = {**series, **{family.name: family.name for family in families}}
    errors.extend(
        f"documented metric absent from REGISTRY: {name}"
        for name in sorted(documented - documented_names.keys())
    )
    application = {family.name for family in families if family.name.startswith("litmus_")}
    errors.extend(
        f"application metric missing from guide: {name}"
        for name in sorted(application - {
            documented_names[name] for name in documented if name in documented_names
        })
    )
    covered = {series[name] for name in used if name in series}
    errors.extend(
        f"documented metric has no panel: {name}"
        for name in sorted(documented & documented_names.keys())
        if documented_names[name] not in covered
    )
    if not used or not documented:
        errors.append("dashboard queries and documented metrics must be nonempty")
    for error in errors:
        print(f"ERROR: {error}")
    print(f"dashboard metrics={len(used)} documented={len(documented)} errors={len(errors)}")
    return int(bool(errors))


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, KeyError, TypeError, AssertionError) as exc:
        print(f"ERROR: {exc}")
        sys.exit(1)
