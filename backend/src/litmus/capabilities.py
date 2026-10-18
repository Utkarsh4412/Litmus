"""What this deployment can do with the keys it has, and where generation goes.

The answer is derived from settings only (no network call), so ``GET /health`` can show
it to the UI, which then disables a control and says why instead of failing on click.
The rule: nothing is silently disabled; every ``enabled: false`` carries a reason.
"""
from __future__ import annotations

from typing import Any
from urllib.parse import urlparse

from litmus.config import Settings

OPENAI_DEFAULT_HOST = "api.openai.com"
ANTHROPIC_HOST = "api.anthropic.com"
_ANTHROPIC_ONLY = "needs ANTHROPIC_API_KEY (this runs on Anthropic models)"


def _host(url: str) -> str | None:
    """``host[:port]`` of a URL, without credentials, path or query."""
    parsed = urlparse(url)
    if not parsed.hostname:
        return None
    return f"{parsed.hostname}:{parsed.port}" if parsed.port else parsed.hostname


def generator_endpoint(settings: Settings, provider: str | None = None) -> str | None:
    """Host that answers generation calls for `provider` (default: the configured one)."""
    provider = provider or settings.generator_provider
    if provider == "openai":
        return _host(settings.openai_base_url) if settings.openai_base_url else OPENAI_DEFAULT_HOST
    if provider == "local":
        return _host(settings.ollama_host)
    if provider == "anthropic":
        return ANTHROPIC_HOST
    return None


def _cap(enabled: bool, reason: str | None) -> dict[str, Any]:
    return {"enabled": enabled, "reason": None if enabled else reason}


def capabilities(settings: Settings) -> dict[str, Any]:
    """Per-feature availability for the current configuration."""
    provider = settings.generator_provider
    has_anthropic = bool(settings.anthropic_api_key)
    models = {
        "anthropic": settings.generator_model,
        "openai": settings.openai_generator_model,
        "local": settings.ollama_model,
    }
    keyed = {
        "anthropic": (has_anthropic, "ANTHROPIC_API_KEY is not set"),
        "openai": (bool(settings.openai_api_key), "OPENAI_API_KEY is not set"),
        "local": (True, None),
    }
    gen_ok, gen_reason = keyed.get(provider, (False, f"unknown provider {provider!r}"))
    return {
        "generation": {
            "provider": provider,
            "model": models.get(provider),
            "endpoint": generator_endpoint(settings, provider),
            **_cap(gen_ok, gen_reason),
        },
        "classic": _cap(gen_ok, gen_reason),
        "graph": _cap(has_anthropic, _ANTHROPIC_ONLY),
        "agentic": _cap(has_anthropic, _ANTHROPIC_ONLY),
        "judge": _cap(has_anthropic, _ANTHROPIC_ONLY),
        "graph_build": _cap(has_anthropic, _ANTHROPIC_ONLY),
        "advisor_llm": _cap(has_anthropic, "uses the heuristic profile (no ANTHROPIC_API_KEY)"),
    }
