"""Reject state-changing requests sent by other web sites.

CORS only stops a foreign page from *reading* responses; a plain form
``POST`` from any site still reaches the server. Because this server runs
on the user's machine, an unrelated page could otherwise cancel or reset
an analysis. Browsers attach ``Origin`` to every non-GET request, so a
mutating request is allowed only when it has no ``Origin`` (command-line
clients) or its origin is this server itself or a configured CORS origin.
"""

from __future__ import annotations

import json
from collections.abc import Iterable
from urllib.parse import urlsplit

from starlette.types import ASGIApp, Receive, Scope, Send

_SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})


class SameOriginMiddleware:
    """Return 403 for unsafe methods from an untrusted browser origin."""

    def __init__(self, app: ASGIApp, trusted_origins: Iterable[str]) -> None:
        self.app = app
        self.trusted = frozenset(origin.rstrip("/").lower() for origin in trusted_origins)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope["method"] in _SAFE_METHODS:
            await self.app(scope, receive, send)
            return
        headers = {
            key.decode("latin-1"): value.decode("latin-1") for key, value in scope["headers"]
        }
        origin = headers.get("origin")
        if origin is None or self._allowed(origin.lower(), headers.get("host", "").lower()):
            await self.app(scope, receive, send)
            return
        body = json.dumps(
            {
                "error": {
                    "code": "forbidden_origin",
                    "message": "Requests that change state must come from this application.",
                }
            }
        ).encode()
        await send(
            {
                "type": "http.response.start",
                "status": 403,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(body)).encode()),
                ],
            }
        )
        await send({"type": "http.response.body", "body": body})

    def _allowed(self, origin: str, host: str) -> bool:
        if origin.rstrip("/") in self.trusted:
            return True
        parts = urlsplit(origin)
        return parts.scheme in {"http", "https"} and bool(host) and parts.netloc == host
