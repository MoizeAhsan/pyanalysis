"""Shared pytest fixtures."""

from __future__ import annotations

import textwrap
from collections.abc import Callable, Iterator, Mapping
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from pyanalyzer.analysis.pipeline import AnalysisOptions, AnalysisResult, analyze_project
from pyanalyzer.main import create_app

ProjectFactory = Callable[[Mapping[str, str]], Path]
Analyze = Callable[[Mapping[str, str]], AnalysisResult]


@pytest.fixture
def make_project(tmp_path: Path) -> ProjectFactory:
    """Return a factory that writes ``{relative_path: source}`` into a new temp project.

    Every call creates a separate directory named ``project``.
    """

    created = 0

    def _make(files: Mapping[str, str]) -> Path:
        nonlocal created
        created += 1
        root = tmp_path / f"workspace{created}" / "project"
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
def analyze(make_project: ProjectFactory) -> Analyze:
    """Return a function that writes a project and analyzes it in-process."""

    def _analyze(files: Mapping[str, str]) -> AnalysisResult:
        return analyze_project(str(make_project(files)), AnalysisOptions(workers=1))

    return _analyze


@pytest.fixture
def client() -> Iterator[TestClient]:
    """API client backed by a fresh application and an empty analysis store."""
    with TestClient(create_app()) as test_client:
        yield test_client
