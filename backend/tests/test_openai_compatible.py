"""OpenAI-compatible servers (xAI Grok): base_url pass-through and failure shapes.

Part 1 uses a stub SDK to check what the provider hands to the client. Part 2 runs the REAL
``openai`` SDK and the real provider against ``fake_xai_server`` (a local HTTP server), so
the wire format, retries and error classes are the SDK's own. Part 3 sends those replies
through the real classic strategy to see what the user would get. A real Grok call is a
separate, laptop-only check.
"""
from __future__ import annotations

import sys
import types
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from fake_xai_server import ANSWER, API_KEY, FakeXai
from pydantic import ValidationError

from litmus.config import Settings
from litmus.generation.grounding import parse_structured
from litmus.generation.providers import ProviderError, base, openai_provider
from litmus.generation.providers.openai_provider import _adjusted_kwargs
from litmus.retrieval.retrieve import RetrievalResult
from litmus.strategies.classic import ClassicRAG

# --------------------------------------------------------------------------- settings


class TestBaseUrlSetting:
    def test_default_is_empty(self):
        assert Settings(_env_file=None).openai_base_url == ""

    @pytest.mark.parametrize(
        "raw, expected",
        [
            ("https://api.x.ai/v1", "https://api.x.ai/v1"),
            ("https://api.x.ai/v1/", "https://api.x.ai/v1"),
            ("  http://localhost:8080/v1  ", "http://localhost:8080/v1"),
            ("", ""),
            ("   ", ""),
        ],
    )
    def test_accepts_http_urls_and_empty(self, raw, expected):
        assert Settings(_env_file=None, openai_base_url=raw).openai_base_url == expected

    @pytest.mark.parametrize("raw", ["api.x.ai/v1", "ftp://x.ai/v1", "https://", "not a url"])
    def test_rejects_anything_else(self, raw):
        with pytest.raises(ValidationError, match="OPENAI_BASE_URL"):
            Settings(_env_file=None, openai_base_url=raw)

    def test_read_from_the_environment(self, monkeypatch):
        monkeypatch.setenv("OPENAI_BASE_URL", "https://api.x.ai/v1")
        assert Settings(_env_file=None).openai_base_url == "https://api.x.ai/v1"


# --------------------------------------------------------------------------- part 1: stub SDK


@pytest.fixture
def stub_sdk(monkeypatch, settings):
    monkeypatch.setattr(settings, "openai_api_key", "xai-key")
    state = SimpleNamespace(clients=[], create=AsyncMock())
    state.create.return_value = SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content="ok"), finish_reason="stop")],
        usage=SimpleNamespace(prompt_tokens=1, completion_tokens=2),
    )

    class AsyncOpenAI:
        def __init__(self, **kwargs):
            self.kwargs = kwargs
            self.chat = SimpleNamespace(completions=SimpleNamespace(create=state.create))
            state.clients.append(self)

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

    module = types.ModuleType("openai")
    module.AsyncOpenAI = AsyncOpenAI  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "openai", module)
    return state


class _Rejected(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


class TestStubbedClient:
    async def test_base_url_is_passed_to_the_client(self, stub_sdk, settings, monkeypatch):
        monkeypatch.setattr(settings, "openai_base_url", "https://api.x.ai/v1")
        await openai_provider.generate_with_usage(model="m", prompt="p")
        assert stub_sdk.clients[0].kwargs["base_url"] == "https://api.x.ai/v1"
        assert stub_sdk.clients[0].kwargs["api_key"] == "xai-key"

    async def test_empty_base_url_means_the_default_endpoint(self, stub_sdk, settings, monkeypatch):
        monkeypatch.setattr(settings, "openai_base_url", "")
        await openai_provider.generate_with_usage(model="m", prompt="p")
        assert "base_url" not in stub_sdk.clients[0].kwargs

    async def test_reasoning_tokens_are_reported_separately(self, stub_sdk):
        stub_sdk.create.return_value = SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content="a"), finish_reason="stop")],
            usage=SimpleNamespace(
                prompt_tokens=10,
                completion_tokens=5,
                completion_tokens_details=SimpleNamespace(reasoning_tokens=200),
            ),
        )
        out = await openai_provider.generate_with_usage(model="m", prompt="p")
        assert out == {"text": "a", "input_tokens": 10, "output_tokens": 5, "reasoning_tokens": 200}

    async def test_length_stop_is_flagged(self, stub_sdk):
        stub_sdk.create.return_value = SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=None), finish_reason="length")],
            usage=SimpleNamespace(prompt_tokens=10, completion_tokens=0),
        )
        out = await openai_provider.generate_with_usage(model="m", prompt="p")
        assert out["text"] == "" and out["truncated"] is True

    async def test_retries_once_with_max_completion_tokens(self, stub_sdk):
        good = stub_sdk.create.return_value
        stub_sdk.create.side_effect = [_Rejected("Unsupported parameter: 'max_tokens'"), good]
        out = await openai_provider.generate_with_usage(model="m", prompt="p", max_tokens=77)
        assert out["text"] == "ok"
        first, second = (c.kwargs for c in stub_sdk.create.await_args_list)
        assert first["max_tokens"] == 77 and "max_completion_tokens" not in first
        assert second["max_completion_tokens"] == 77 and "max_tokens" not in second

    async def test_a_second_failure_is_not_retried_again(self, stub_sdk):
        stub_sdk.create.side_effect = _Rejected("Unsupported parameter: 'max_tokens'")
        with pytest.raises(ProviderError):
            await openai_provider.generate_with_usage(model="m", prompt="p")
        assert stub_sdk.create.await_count == 2

    async def test_unrelated_errors_are_not_retried(self, stub_sdk):
        stub_sdk.create.side_effect = _Rejected("model not found", status_code=404)
        with pytest.raises(ProviderError):
            await openai_provider.generate_with_usage(model="m", prompt="p")
        assert stub_sdk.create.await_count == 1


class TestAdjustedKwargs:
    base = {"model": "m", "max_tokens": 9, "temperature": 0, "messages": []}

    def test_drops_temperature_when_rejected(self):
        out = _adjusted_kwargs(self.base, _Rejected("'temperature' is not supported"))
        assert out is not None and "temperature" not in out and out["max_tokens"] == 9

    def test_switches_back_to_max_tokens(self):
        kw = {"model": "m", "max_completion_tokens": 9, "messages": []}
        out = _adjusted_kwargs(kw, _Rejected("max_completion_tokens is not supported"))
        assert out == {"model": "m", "max_tokens": 9, "messages": []}

    @pytest.mark.parametrize("exc", [_Rejected("boom", 500), _Rejected("messages empty"), RuntimeError("x")])
    def test_other_failures_give_no_retry(self, exc):
        assert _adjusted_kwargs(self.base, exc) is None


# --------------------------------------------------------------------------- part 2: real SDK, fake server

openai = pytest.importorskip("openai")


@pytest.fixture
def xai(monkeypatch, settings):
    with FakeXai() as server:
        monkeypatch.setattr(settings, "openai_api_key", API_KEY)
        monkeypatch.setattr(settings, "openai_base_url", server.base_url)
        yield server


async def _gen(model: str, **kw):
    return await openai_provider.generate_with_usage(model=model, prompt="Question?", **kw)


class TestRealSdkAgainstFakeServer:
    async def test_request_goes_to_the_configured_server(self, xai):
        out = await _gen("grok-ok", system="Be brief.", max_tokens=321, temperature=0)
        assert out["input_tokens"] == 120 and out["output_tokens"] == 40
        (req,) = xai.requests
        assert req["path"] == "/v1/chat/completions"
        assert req["auth"] == f"Bearer {API_KEY}"
        assert req["body"]["model"] == "grok-ok"
        assert req["body"]["max_tokens"] == 321
        assert [m["role"] for m in req["body"]["messages"]] == ["system", "user"]

    async def test_reasoning_usage_fields(self, xai):
        out = await _gen("grok-reasoning")
        assert out["reasoning_tokens"] == 300 and out["output_tokens"] == 40
        assert "truncated" not in out

    async def test_reasoning_budget_exhausted_returns_empty_text_flagged(self, xai):
        out = await _gen("grok-reasoning-exhausted", max_tokens=512)
        assert out["text"] == "" and out["truncated"] is True and out["reasoning_tokens"] == 512

    async def test_wrong_model_is_a_clean_provider_error(self, xai):
        with pytest.raises(ProviderError) as info:
            await _gen("grok-404")
        assert str(info.value) == "OpenAI request failed (NotFoundError)."
        assert len(xai.requests) == 1

    async def test_wrong_key_is_a_clean_provider_error(self, xai, settings, monkeypatch):
        monkeypatch.setattr(settings, "openai_api_key", "xai-wrong")
        with pytest.raises(ProviderError, match="AuthenticationError"):
            await _gen("grok-ok")

    async def test_rate_limit_is_retried_by_the_sdk_then_reported(self, xai):
        with pytest.raises(ProviderError, match="RateLimitError"):
            await _gen("grok-429")
        assert len(xai.requests) == 3  # the SDK's own default: one try plus two retries

    async def test_timeout_is_a_clean_provider_error(self, xai, settings, monkeypatch):
        monkeypatch.setattr(settings, "provider_timeout_seconds", 0.2)
        with pytest.raises(ProviderError, match="APITimeoutError"):
            await _gen("grok-slow")

    async def test_max_completion_tokens_is_negotiated(self, xai):
        out = await _gen("grok-needs-max-completion-tokens", max_tokens=64)
        assert out["text"]
        first, second = xai.requests
        assert "max_tokens" in first["body"] and "max_tokens" not in second["body"]
        assert second["body"]["max_completion_tokens"] == 64

    async def test_temperature_is_dropped_when_the_model_refuses_it(self, xai):
        out = await _gen("grok-no-temperature", temperature=0)
        assert out["text"]
        first, second = xai.requests
        assert "temperature" in first["body"] and "temperature" not in second["body"]

    async def test_other_bad_requests_are_not_retried(self, xai):
        with pytest.raises(ProviderError, match="BadRequestError"):
            await _gen("grok-bad-request")
        assert len(xai.requests) == 1


# --------------------------------------------------------------------------- part 3: through the classic strategy


async def _classic(fake_chunks, model: str):
    strategy = ClassicRAG()
    strategy.provider = "openai"
    hits = RetrievalResult(chunks=fake_chunks(3))
    with patch("litmus.strategies.classic.hybrid_search", new=AsyncMock(return_value=hits)):
        return await strategy.run("What is BM25?", top_k=8, model=model, prompt_version="default")


class TestClassicOnTheFakeServer:
    async def test_valid_json_is_grounded(self, xai, fake_chunks):
        result = await _classic(fake_chunks, "grok-ok")
        assert result.grounded is True and result.refusal is False
        assert [s.handle for s in result.sources] == ["S2"]
        assert result.input_tokens == 120 and result.output_tokens == 40

    async def test_json_in_a_code_fence_is_grounded(self, xai, fake_chunks):
        result = await _classic(fake_chunks, "grok-fenced")
        assert result.grounded is True

    async def test_reasoning_reply_is_grounded_and_usage_kept(self, xai, fake_chunks):
        result = await _classic(fake_chunks, "grok-reasoning")
        assert result.grounded is True and result.output_tokens == 40

    async def test_prose_with_handles_falls_back_to_text_mode(self, xai, fake_chunks):
        result = await _classic(fake_chunks, "grok-prose")
        assert result.refusal is False
        assert {s.handle for s in result.sources} == {"S1", "S2"}

    async def test_malformed_json_does_not_crash_and_is_text_mode(self, xai, fake_chunks):
        result = await _classic(fake_chunks, "grok-malformed")
        assert result.refusal is False and result.answer.startswith("Sure.")
        raw = parse_structured(None, result.answer)
        assert raw.mode == "text"

    async def test_truncated_reply_is_refused_not_shown(self, xai, fake_chunks):
        # finish_reason "length" means the JSON is cut off. The fragment is never
        # shown as an answer and no handle inside it is kept, even though one validates.
        result = await _classic(fake_chunks, "grok-truncated")
        assert result.refusal is True and result.grounded is False
        assert not any(s.handle for s in result.sources)  # only the usual refusal placeholder
        assert not result.answer.startswith("{")
        assert result.extra["grounding"]["refusal_reason"] == "truncated"

    async def test_reasoning_budget_exhausted_is_an_honest_refusal(self, xai, fake_chunks):
        result = await _classic(fake_chunks, "grok-reasoning-exhausted")
        assert result.refusal is True and result.grounded is False

    async def test_wrong_model_surfaces_as_provider_error(self, xai, fake_chunks):
        with pytest.raises(ProviderError):
            await _classic(fake_chunks, "grok-404")

    def test_fixture_answer_is_what_the_parser_expects(self):
        raw = parse_structured(None, __import__("json").dumps(ANSWER))
        assert raw.mode == "json" and raw.status == "answered"


def test_dispatcher_passes_extra_usage_keys_through():
    async def run():
        fn = AsyncMock(return_value={"text": "t", "input_tokens": 1, "output_tokens": 1, "reasoning_tokens": 9})
        with patch("litmus.generation.providers.openai_provider.generate_with_usage", new=fn):
            return await base.generate_with_usage("openai", model="m", prompt="p")

    import asyncio

    assert asyncio.run(run())["reasoning_tokens"] == 9
