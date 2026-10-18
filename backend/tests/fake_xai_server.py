"""A local stand-in for an OpenAI-compatible server such as xAI's ``/v1/chat/completions``.

It exists so the real ``openai`` SDK and the real provider code can be exercised against
the failure shapes a live Grok key could produce, without network access or a key. The
scenario is chosen by the request's ``model`` field. Nothing here claims to be xAI's exact
behaviour: the shapes follow the public OpenAI-compatible schema; which one a given Grok
model really returns is UNVERIFIED until a real call is made.
"""
from __future__ import annotations

import json
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

API_KEY = "xai-test-key"

ANSWER = {
    "answer": "BM25 ranks documents by term frequency and length [S2].",
    "claims": [
        {"text": "BM25 ranks documents by term frequency and length.", "citations": ["S2"], "supported": True}
    ],
    "status": "answered",
    "unsupported_notes": "",
}
ANSWER_JSON = json.dumps(ANSWER)


def _completion(content: str, *, finish: str = "stop", prompt=120, completion=40, reasoning=None) -> dict:
    usage: dict = {"prompt_tokens": prompt, "completion_tokens": completion, "total_tokens": prompt + completion}
    if reasoning is not None:
        usage["completion_tokens_details"] = {"reasoning_tokens": reasoning}
    return {
        "id": "chatcmpl-fake",
        "object": "chat.completion",
        "created": 0,
        "model": "fake",
        "choices": [{"index": 0, "message": {"role": "assistant", "content": content}, "finish_reason": finish}],
        "usage": usage,
    }


class _Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *args):  # keep test output quiet
        pass

    def _send(self, status: int, body: dict, headers: dict | None = None) -> None:
        raw = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(raw)

    def do_POST(self) -> None:  # noqa: N802
        length = int(self.headers.get("Content-Length", "0"))
        body = json.loads(self.rfile.read(length) or b"{}")
        self.server.requests.append(  # type: ignore[attr-defined]
            {"path": self.path, "auth": self.headers.get("Authorization"), "body": body}
        )
        if self.path != "/v1/chat/completions":
            return self._send(404, {"error": {"message": f"no route {self.path}"}})
        if self.headers.get("Authorization") != f"Bearer {API_KEY}":
            return self._send(401, {"error": {"message": "Incorrect API key provided."}})

        model = body.get("model", "")
        if model == "grok-ok":
            return self._send(200, _completion(ANSWER_JSON))
        if model == "grok-fenced":
            return self._send(200, _completion(f"```json\n{ANSWER_JSON}\n```"))
        if model == "grok-prose":
            return self._send(200, _completion("BM25 is a ranking function [S2]. It scores term matches [S1]."))
        if model == "grok-malformed":
            bad = ANSWER_JSON.replace('"supported": true}', '"supported": tru}')
            return self._send(200, _completion(f"Sure. {bad}"))
        if model == "grok-truncated":
            return self._send(200, _completion(ANSWER_JSON[:70], finish="length", completion=body.get("max_tokens", 70)))
        if model == "grok-reasoning":
            return self._send(200, _completion(ANSWER_JSON, completion=40, reasoning=300))
        if model == "grok-reasoning-exhausted":
            return self._send(200, _completion("", finish="length", completion=0, reasoning=body.get("max_tokens", 1024)))
        if model == "grok-404":
            return self._send(404, {"error": {"message": "The model grok-404 does not exist or your key has no access."}})
        if model == "grok-429":
            return self._send(429, {"error": {"message": "Rate limit reached."}}, {"retry-after": "0"})
        if model == "grok-slow":
            time.sleep(2.0)
            return self._send(200, _completion(ANSWER_JSON))
        if model == "grok-needs-max-completion-tokens":
            if "max_tokens" in body:
                return self._send(
                    400,
                    {"error": {"message": "Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead."}},
                )
            return self._send(200, _completion(ANSWER_JSON))
        if model == "grok-no-temperature":
            if "temperature" in body:
                return self._send(400, {"error": {"message": "Unsupported value: 'temperature' does not support 0 with this model."}})
            return self._send(200, _completion(ANSWER_JSON))
        if model == "grok-bad-request":
            return self._send(400, {"error": {"message": "messages: must not be empty"}})
        return self._send(404, {"error": {"message": f"unknown model {model}"}})


class FakeXai:
    """Context manager: ``with FakeXai() as srv:`` then use ``srv.base_url`` and ``srv.requests``."""

    def __enter__(self) -> FakeXai:
        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
        self.httpd.daemon_threads = True
        self.httpd.requests = []  # type: ignore[attr-defined]
        self.thread = threading.Thread(target=self.httpd.serve_forever, kwargs={"poll_interval": 0.02}, daemon=True)
        self.thread.start()
        return self

    def __exit__(self, *exc) -> None:
        self.httpd.shutdown()
        self.httpd.server_close()

    @property
    def base_url(self) -> str:
        return f"http://127.0.0.1:{self.httpd.server_address[1]}/v1"

    @property
    def requests(self) -> list[dict]:
        return self.httpd.requests  # type: ignore[attr-defined,no-any-return]
