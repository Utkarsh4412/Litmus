from __future__ import annotations

from litmus.config import settings
from litmus.generation.providers.base import MissingKeyError, ProviderError
from litmus.observability.logs import get_structured_logger

logger = get_structured_logger(__name__)


async def generate(*, model: str, prompt: str, max_tokens: int = 1024) -> str:
    """Generate text with the OpenAI API. See :func:`generate_with_usage`."""
    result = await generate_with_usage(model=model, prompt=prompt, max_tokens=max_tokens)
    return result["text"]


async def generate_with_usage(
    *,
    model: str,
    prompt: str,
    max_tokens: int = 1024,
    system: str | None = None,
    temperature: float | None = None,
) -> dict:
    """Generate text with the OpenAI API and report token usage.

    Args:
        model: OpenAI model ID.
        prompt: The user prompt.
        max_tokens: Maximum tokens to generate.
        system: Optional system prompt.
        temperature: Optional sampling temperature.

    Returns:
        Dict with ``text``, ``input_tokens`` and ``output_tokens``.

    Raises:
        MissingKeyError: If OPENAI_API_KEY is not configured.
        ProviderError: If the openai package is not installed or the call fails.
    """
    if not settings.openai_api_key:
        raise MissingKeyError(
            "OPENAI_API_KEY is not configured. Add it to .env and restart."
        )

    try:
        # Imported lazily so the OpenAI SDK stays an optional dependency.
        from openai import AsyncOpenAI
    except ImportError as e:  # pragma: no cover
        raise ProviderError(
            "The 'openai' package is not installed. Install it with "
            "`pip install openai` to use GENERATOR_PROVIDER=openai."
        ) from e

    messages: list[dict] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    kwargs: dict = {"model": model, "max_tokens": max_tokens, "messages": messages}
    if temperature is not None:
        kwargs["temperature"] = temperature

    client_kwargs: dict = {
        "api_key": settings.openai_api_key,
        "timeout": settings.provider_timeout_seconds,
    }
    if settings.openai_base_url:
        # An OpenAI-compatible server (xAI, a local gateway). Empty means api.openai.com.
        client_kwargs["base_url"] = settings.openai_base_url

    try:
        async with AsyncOpenAI(**client_kwargs) as client:
            try:
                resp = await client.chat.completions.create(**kwargs)
            except Exception as first:
                retry = _adjusted_kwargs(kwargs, first)
                if retry is None:
                    raise
                logger.info(
                    "Retrying once with adjusted parameters",
                    extra_fields={"model": model, "changed": sorted(set(kwargs) ^ set(retry))},
                )
                resp = await client.chat.completions.create(**retry)
    except Exception as e:
        logger.warning(
            f"OpenAI call failed: {type(e).__name__}: {e}",
            extra_fields={"error_type": type(e).__name__, "model": model},
        )
        raise ProviderError(f"OpenAI request failed ({type(e).__name__}).") from e

    usage = getattr(resp, "usage", None)
    choice = resp.choices[0]
    out: dict = {
        "text": (choice.message.content or "").strip(),
        "input_tokens": int(getattr(usage, "prompt_tokens", 0) or 0),
        "output_tokens": int(getattr(usage, "completion_tokens", 0) or 0),
    }
    # Reasoning models report their hidden thinking separately. Whether it is already
    # inside completion_tokens is not documented for every server, so it is reported
    # on its own and never added to output_tokens.
    details = getattr(usage, "completion_tokens_details", None)
    reasoning = int(getattr(details, "reasoning_tokens", 0) or 0)
    if reasoning:
        out["reasoning_tokens"] = reasoning
    if getattr(choice, "finish_reason", None) == "length":
        # The budget ran out (with a reasoning model, possibly while thinking): the text
        # may be empty or cut off. Callers fall back to plain text grounding.
        out["truncated"] = True
        logger.warning(
            "OpenAI-compatible reply stopped at the token limit",
            extra_fields={"model": model, "max_tokens": max_tokens, "reasoning_tokens": reasoning},
        )
    return out


def _adjusted_kwargs(kwargs: dict, exc: Exception) -> dict | None:
    """Parameters to retry with after a 400 that names a parameter the server rejects.

    Servers differ on the output limit's name (``max_tokens`` or
    ``max_completion_tokens``) and some reasoning models reject ``temperature``. The
    first failure names the culprit, so one retry fixes it. Anything else is not retried.
    """
    if getattr(exc, "status_code", None) != 400:
        return None
    msg = str(exc).lower()
    retry = dict(kwargs)
    if "max_tokens" in retry and "max_tokens" in msg:
        retry["max_completion_tokens"] = retry.pop("max_tokens")
    elif "max_completion_tokens" in retry and "max_completion_tokens" in msg:
        retry["max_tokens"] = retry.pop("max_completion_tokens")
    elif "temperature" in msg and "temperature" in retry:
        del retry["temperature"]
    else:
        return None
    return retry
