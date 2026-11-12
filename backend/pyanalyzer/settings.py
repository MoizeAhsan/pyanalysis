"""Runtime configuration, read from ``PYANALYZER_*`` environment variables."""

from __future__ import annotations

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from pyanalyzer.scanner.file_scanner import DEFAULT_MAX_FILE_SIZE

_PACKAGE_DIR = Path(__file__).resolve().parent


def _default_static_dir() -> Path | None:
    """Built frontend, either packaged with the backend or in a source checkout."""
    for candidate in (_PACKAGE_DIR / "static", _PACKAGE_DIR.parents[1] / "frontend" / "dist"):
        if (candidate / "index.html").is_file():
            return candidate
    return None


class Settings(BaseSettings):
    """Settings for the local analyzer server."""

    model_config = SettingsConfigDict(env_prefix="PYANALYZER_", extra="ignore")

    host: str = "127.0.0.1"
    port: int = Field(default=8000, ge=1, le=65535)
    #: Host headers the server answers to. Restricting these blocks DNS-rebinding
    #: attacks, where a web page reaches a server on localhost via its own domain.
    allowed_hosts: list[str] = ["localhost", "127.0.0.1", "[::1]"]
    #: Browser origins allowed to call the API (the Vite dev server by default).
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    cache_dir: Path | None = None
    use_cache: bool = True
    workers: int | None = Field(default=None, ge=1)
    max_file_size: int = Field(default=DEFAULT_MAX_FILE_SIZE, ge=1)
    static_dir: Path | None = Field(default_factory=_default_static_dir)
    max_function_lines: int = Field(default=60, ge=1)
    max_parameters: int = Field(default=6, ge=1)
    max_complexity: int = Field(default=10, ge=1)
    max_class_methods: int = Field(default=20, ge=1)
