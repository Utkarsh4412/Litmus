"""What /health says about each feature, and what an eval run records about its judge.

No Grok pricing rows are added (prices come from the owner's console, never from a guess);
the last tests pin that an unlisted OpenAI-compatible model yields "not priced", not a number.
"""
from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

import pytest
from test_eval_accounting import DATASET, _judge, _pipeline

from litmus.capabilities import capabilities, generator_endpoint
from litmus.evaluation import metrics, regression
from litmus.evaluation.regression import _config_key, compare_runs, config_id
from litmus.observability.pricing import cost_breakdown, estimate_cost, price_table

ANTHROPIC_ONLY = "needs ANTHROPIC_API_KEY"


def _configure(settings, monkeypatch, **values):
    for k, v in values.items():
        monkeypatch.setattr(settings, k, v)


class TestCapabilities:
    def test_no_keys_anthropic_default(self, settings, monkeypatch):
        _configure(settings, monkeypatch, generator_provider="anthropic", anthropic_api_key="",
                   openai_api_key="")
        caps = capabilities(settings)
        assert caps["generation"]["enabled"] is False
        assert caps["classic"] == {"enabled": False, "reason": "ANTHROPIC_API_KEY is not set"}
        for name in ("graph", "agentic", "judge", "graph_build"):
            assert caps[name]["enabled"] is False and ANTHROPIC_ONLY in caps[name]["reason"]

    def test_grok_only(self, settings, monkeypatch):
        _configure(settings, monkeypatch, generator_provider="openai", anthropic_api_key="",
                   openai_api_key="xai-secret-key", openai_base_url="https://api.x.ai/v1",
                   openai_generator_model="some-model")
        caps = capabilities(settings)
        assert caps["classic"] == {"enabled": True, "reason": None}
        assert caps["generation"] == {
            "provider": "openai", "model": "some-model", "endpoint": "api.x.ai",
            "enabled": True, "reason": None,
        }
        assert caps["graph"]["enabled"] is False and caps["judge"]["enabled"] is False
        assert caps["advisor_llm"]["enabled"] is False
        assert "heuristic" in caps["advisor_llm"]["reason"]

    def test_openai_without_its_key(self, settings, monkeypatch):
        _configure(settings, monkeypatch, generator_provider="openai", openai_api_key="")
        assert capabilities(settings)["classic"]["reason"] == "OPENAI_API_KEY is not set"

    def test_local_needs_no_key(self, settings, monkeypatch):
        _configure(settings, monkeypatch, generator_provider="local", anthropic_api_key="",
                   ollama_host="http://host.docker.internal:11434")
        caps = capabilities(settings)
        assert caps["classic"]["enabled"] is True
        assert caps["generation"]["endpoint"] == "host.docker.internal:11434"

    def test_everything_with_an_anthropic_key(self, settings, monkeypatch):
        _configure(settings, monkeypatch, generator_provider="anthropic", anthropic_api_key="k")
        caps = capabilities(settings)
        assert all(caps[n]["enabled"] and caps[n]["reason"] is None
                   for n in ("classic", "graph", "agentic", "judge", "graph_build", "advisor_llm"))

    def test_every_disabled_feature_has_a_reason(self, settings, monkeypatch):
        _configure(settings, monkeypatch, generator_provider="openai", anthropic_api_key="",
                   openai_api_key="")
        for name, cap in capabilities(settings).items():
            if not cap["enabled"]:
                assert cap["reason"], name


class TestGeneratorEndpoint:
    @pytest.mark.parametrize(
        "provider, base_url, expected",
        [
            ("openai", "", "api.openai.com"),
            ("openai", "https://api.x.ai/v1", "api.x.ai"),
            ("openai", "http://gateway.local:8080/v1", "gateway.local:8080"),
            ("anthropic", "", "api.anthropic.com"),
            ("bogus", "", None),
        ],
    )
    def test_host_only(self, settings, monkeypatch, provider, base_url, expected):
        monkeypatch.setattr(settings, "openai_base_url", base_url)
        assert generator_endpoint(settings, provider) == expected

    def test_credentials_and_path_never_leak(self, settings, monkeypatch):
        monkeypatch.setattr(settings, "openai_base_url", "https://user:pw@api.x.ai/secret/v1?k=1")
        assert generator_endpoint(settings, "openai") == "api.x.ai"


class TestHealthEndpoint:
    def test_health_lists_capabilities_additively(self, client, settings, monkeypatch):
        _configure(settings, monkeypatch, generator_provider="openai", anthropic_api_key="",
                   openai_api_key="xai-secret-key", openai_base_url="https://api.x.ai/v1/")
        body = client.get("/health").json()
        # Existing fields are untouched.
        assert body["status"] == "ok" and set(body["providers"]) >= {"anthropic", "openai"}
        caps = body["capabilities"]
        assert caps["classic"]["enabled"] is True
        assert caps["judge"] == {"enabled": False, "reason": caps["judge"]["reason"]}
        assert caps["generation"]["endpoint"] == "api.x.ai"
        text = json.dumps(body)
        assert "xai-secret-key" not in text and "/v1" not in json.dumps(caps)


# ------------------------------------------------------------------ run records and the group key


@pytest.fixture
def run(tmp_path, monkeypatch):
    monkeypatch.setattr(metrics, "GOLDEN_DIR", tmp_path)
    (tmp_path / "acc.jsonl").write_text(
        "\n".join(json.dumps(r) for r in DATASET) + "\n", encoding="utf-8"
    )

    async def go(**kwargs):
        with (
            patch("litmus.evaluation.metrics.answer_question_detailed", new=AsyncMock(side_effect=_pipeline)),
            patch("litmus.evaluation.metrics.score_example_detailed", new=AsyncMock(side_effect=_judge)),
        ):
            return await metrics.run_evaluation(dataset="acc", **kwargs)

    return go


@pytest.mark.asyncio
class TestRunRecord:
    async def test_judged_run_records_the_judge_provider_and_endpoint(self, run):
        r = await run()
        assert r["judge_provider"] == "anthropic"
        assert r["generator_endpoint"] == "api.anthropic.com"

    async def test_unjudged_run_has_no_judge_provider(self, run):
        r = await run(judge_answers=False)
        assert r["judge_provider"] is None

    async def test_summaries_expose_the_new_fields(self, run):
        await run()
        (summary,) = regression.list_run_summaries()
        assert summary["judge_provider"] == "anthropic"
        assert summary["generator_endpoint"] == "api.anthropic.com"


BASE = {
    "dataset": "d", "strategy": "classic", "provider": "openai", "model": "m",
    "prompt_version": "default", "judge_model": "j", "rubric_version": "r", "config_hash": "h",
}


class TestGroupKey:
    def test_old_runs_keep_the_exact_key_and_baseline_id(self):
        old = dict(BASE)
        assert len(_config_key(old)) == 8
        assert _config_key(old) == (
            "d", "classic", "openai", "m", "default", "j", "r", "h",
        )

    def test_anthropic_judge_groups_with_old_runs(self):
        new = {**BASE, "judge_provider": "anthropic"}
        assert _config_key(new) == _config_key(BASE)
        assert config_id(new) == config_id(BASE)

    def test_a_judge_on_another_provider_is_a_separate_group(self):
        other = {**BASE, "judge_provider": "openai"}
        assert _config_key(other) != _config_key(BASE)
        assert config_id(other) != config_id(BASE)
        assert _config_key(other)[-1] == "openai"

    def test_compare_reports_the_judge_mismatch(self):
        report = compare_runs(BASE, {**BASE, "judge_provider": "openai"})
        assert report["comparable"] is False
        assert report["config_mismatch"] == ["judge_provider"]

    def test_compare_ignores_the_difference_between_missing_and_anthropic(self):
        report = compare_runs(BASE, {**BASE, "judge_provider": "anthropic"})
        assert report["config_mismatch"] == []
        assert report["current"]["judge_provider"] == "anthropic"

    def test_generator_endpoint_is_recorded_in_the_run_reference(self):
        report = compare_runs(BASE, {**BASE, "generator_endpoint": "api.x.ai"})
        assert report["current"]["generator_endpoint"] == "api.x.ai"
        assert report["config_mismatch"] == []  # informational: provider and model decide


class TestUnpricedModels:
    def test_an_unlisted_openai_compatible_model_has_no_price(self):
        assert price_table().price("some-grok-model") is None
        assert cost_breakdown("some-grok-model", 1000, 1000) is None
        assert estimate_cost("some-grok-model", 1000, 1000) is None
