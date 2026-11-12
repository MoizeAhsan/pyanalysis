"""Tests for the command-line interface."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from pyanalyzer import __version__, cli


def test_analyze_prints_a_readable_summary(
    sample_project: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    assert cli.main(["analyze", str(sample_project), "--no-cache"]) == 0

    output = capsys.readouterr().out
    assert "project: project" in output
    assert "files: 5" in output
    assert "import cycles: 0" in output


def test_analyze_json_output(sample_project: Path, capsys: pytest.CaptureFixture[str]) -> None:
    assert cli.main(["analyze", str(sample_project), "--json", "--exclude", "services/"]) == 0

    summary = json.loads(capsys.readouterr().out)
    assert (summary["files"], summary["classes"]) == (3, 3)
    assert summary["path"] == str(sample_project.resolve())


def test_analyze_reports_bad_paths_on_stderr(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    assert cli.main(["analyze", str(tmp_path / "missing")]) == 2

    captured = capsys.readouterr()
    assert captured.out == ""
    assert "does not exist" in captured.err


def test_version(capsys: pytest.CaptureFixture[str]) -> None:
    with pytest.raises(SystemExit) as exit_info:
        cli.main(["--version"])

    assert exit_info.value.code == 0
    assert __version__ in capsys.readouterr().out


def test_a_command_is_required() -> None:
    with pytest.raises(SystemExit) as exit_info:
        cli.main([])

    assert exit_info.value.code == 2


def test_serve_starts_the_server_and_the_requested_analysis(
    sample_project: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    import uvicorn

    served: dict[str, Any] = {}

    def fake_run(app: Any, **options: Any) -> None:
        served.update(options, status=app.state.manager.wait(10))

    monkeypatch.setattr(uvicorn, "run", fake_run)
    monkeypatch.setenv("PYANALYZER_PORT", "9123")

    code = cli.main(["serve", str(sample_project), "--no-browser", "--host", "127.0.0.1"])

    assert code == 0
    assert (served["host"], served["port"]) == ("127.0.0.1", 9123)
    assert served["status"].state == "completed"
    assert "http://localhost:9123" in capsys.readouterr().out


def test_serve_rejects_a_bad_startup_path(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    import uvicorn

    monkeypatch.setattr(uvicorn, "run", lambda *_a, **_k: pytest.fail("server should not start"))

    assert cli.main(["serve", str(tmp_path / "missing")]) == 2
    assert "does not exist" in capsys.readouterr().err
