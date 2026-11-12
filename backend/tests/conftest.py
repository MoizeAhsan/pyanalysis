"""Shared pytest fixtures."""

from __future__ import annotations

import textwrap
from collections.abc import Callable, Iterator, Mapping
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from pyanalyzer.main import app
from pyanalyzer.models.core import current_session

ProjectFactory = Callable[[Mapping[str, str]], Path]


@pytest.fixture
def make_project(tmp_path: Path) -> ProjectFactory:
    """Return a factory that writes ``{relative_path: source}`` into a temp project."""

    def _make(files: Mapping[str, str]) -> Path:
        root = tmp_path / "project"
        for rel_path, source in files.items():
            target = root / rel_path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(textwrap.dedent(source), encoding="utf-8")
        root.mkdir(parents=True, exist_ok=True)
        return root

    return _make


@pytest.fixture
def sample_project(make_project: ProjectFactory) -> Path:
    """A small multi-module project with imports, classes, and cross-file calls."""
    return make_project(
        {
            "main.py": '''
                """Entry point."""
                from utils import helper_function
                from models import User, Product
                from services.user_service import UserService


                class Application:
                    """Top-level application."""

                    def __init__(self) -> None:
                        self.service = UserService()

                    def run(self) -> int:
                        user = User("ada")
                        return helper_function([user, Product("book")])


                def main() -> None:
                    Application().run()
            ''',
            "utils.py": '''
                """Helpers."""


                def helper_function(data: list[object]) -> int:
                    """Count items."""
                    return len(data)


                def format_output(value: int) -> str:
                    return str(value)
            ''',
            "models.py": '''
                """Domain models."""


                class User:
                    def __init__(self, name: str) -> None:
                        self.name = name


                class Product:
                    def __init__(self, title: str) -> None:
                        self.title = title
            ''',
            "services/__init__.py": "",
            "services/user_service.py": """
                from models import User


                class UserService:
                    def create(self, name: str) -> User:
                        return User(name)
            """,
        }
    )


@pytest.fixture
def client() -> Iterator[TestClient]:
    """API client with a clean analysis session before and after each test."""
    current_session.reset()
    with TestClient(app) as test_client:
        yield test_client
    current_session.reset()
