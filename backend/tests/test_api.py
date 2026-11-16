"""Tests for the v2 HTTP API."""

from __future__ import annotations

import threading
import time
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from pyanalyzer.analysis.pipeline import AnalysisCancelled, analyze_project
from pyanalyzer.main import create_app
from pyanalyzer.settings import Settings
from tests.conftest import ProjectFactory

PROJECT = {
    "app/__init__.py": "",
    "app/models.py": '''
        """Domain models."""


        class Base:
            """Common behaviour."""

            def save(self) -> None:
                """Persist the object to storage."""

            def describe(self) -> str:
                return "base"


        class User(Base):
            def save(self) -> None:
                super().save()

            def rename(self, name: str) -> None: ...
    ''',
    "app/services.py": '''
        import os
        from app.models import User


        def create_user(name: str) -> User:
            """Create and persist a user."""
            user = User()
            user.rename(name)
            return user


        def unused_helper() -> None: ...
    ''',
    "main.py": """
        from app import services

        services.create_user("ada")
    """,
    "broken.py": "def oops(:\n",
}


def wait_until_finished(client: TestClient) -> dict[str, Any]:
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline:
        status: dict[str, Any] = client.get("/api/analysis").json()
        if status["state"] != "running":
            return status
        time.sleep(0.01)
    raise AssertionError("analysis did not finish")


@pytest.fixture
def analyzed(client: TestClient, make_project: ProjectFactory) -> TestClient:
    """A client whose application has finished analyzing :data:`PROJECT`."""
    project = make_project(PROJECT)
    response = client.post("/api/analysis", json={"project_path": str(project)})
    assert response.status_code == 202
    assert wait_until_finished(client)["state"] == "completed"
    return client


# ------------------------------------------------------------------- lifecycle


def test_health(client: TestClient) -> None:
    body = client.get("/api/health").json()
    assert body["status"] == "ok"
    assert body["version"]


def test_status_is_idle_before_any_analysis(client: TestClient) -> None:
    assert client.get("/api/analysis").json() == {
        "state": "idle",
        "phase": None,
        "processed": 0,
        "total": 0,
        "project_path": None,
        "error": None,
        "started_at": None,
        "elapsed_seconds": 0.0,
        "has_result": False,
    }


def test_analysis_runs_in_the_background_and_reports_completion(
    client: TestClient, make_project: ProjectFactory
) -> None:
    project = make_project(PROJECT)

    started = client.post("/api/analysis", json={"project_path": str(project)})

    assert started.status_code == 202
    assert started.json()["project_path"] == str(project.resolve())
    finished = wait_until_finished(client)
    assert (finished["state"], finished["has_result"], finished["error"]) == (
        "completed",
        True,
        None,
    )
    assert (finished["processed"], finished["total"]) == (5, 5)
    assert finished["elapsed_seconds"] > 0


@pytest.mark.parametrize(
    ("path", "status", "code"),
    [("", 400, "invalid_project_path"), ("/definitely/not/here", 400, "invalid_project_path")],
)
def test_invalid_paths_are_rejected_with_a_code(
    client: TestClient, path: str, status: int, code: str
) -> None:
    response = client.post("/api/analysis", json={"project_path": path})

    assert response.status_code == status
    assert response.json()["error"]["code"] == code
    assert client.get("/api/analysis").json()["state"] == "idle"


def test_request_body_is_validated(client: TestClient) -> None:
    assert client.post("/api/analysis", json={}).status_code == 422
    too_many = {"project_path": "/tmp", "exclude": ["x"] * 101}
    assert client.post("/api/analysis", json=too_many).status_code == 422


def test_exclude_patterns_are_applied(client: TestClient, make_project: ProjectFactory) -> None:
    project = make_project(PROJECT)

    client.post("/api/analysis", json={"project_path": str(project), "exclude": ["app/"]})
    wait_until_finished(client)

    assert client.get("/api/summary").json()["total_files"] == 2


def _blocking_app(settings: Settings, release: threading.Event) -> TestClient:
    """An app whose analysis blocks until released, reporting progress first."""
    app = create_app(settings)

    def runner(path: str, options: Any, on_progress: Any, should_cancel: Any) -> Any:
        on_progress("parsing", 3, 10)
        while not release.wait(0.01):
            if should_cancel():
                raise AnalysisCancelled
        return analyze_project(path, options, on_progress, should_cancel)

    app.state.manager._runner = runner
    return TestClient(app, base_url="http://localhost")


def test_progress_conflict_and_cancellation(
    settings: Settings, make_project: ProjectFactory
) -> None:
    project = str(make_project(PROJECT))
    release = threading.Event()
    with _blocking_app(settings, release) as client:
        client.post("/api/analysis", json={"project_path": project})

        running = client.get("/api/analysis").json()
        assert (running["state"], running["phase"]) == ("running", "parsing")
        assert (running["processed"], running["total"]) == (3, 10)

        again = client.post("/api/analysis", json={"project_path": project})
        assert again.status_code == 409
        assert again.json()["error"]["code"] == "analysis_running"

        client.post("/api/analysis/cancel")
        cancelled = wait_until_finished(client)
        assert (cancelled["state"], cancelled["has_result"]) == ("cancelled", False)

        # A new analysis can start after a cancelled one.
        release.set()
        assert client.post("/api/analysis", json={"project_path": project}).status_code == 202
        assert wait_until_finished(client)["state"] == "completed"


def test_cancelling_keeps_the_previous_result(
    settings: Settings, make_project: ProjectFactory
) -> None:
    project = str(make_project(PROJECT))
    release = threading.Event()
    release.set()
    with _blocking_app(settings, release) as client:
        client.post("/api/analysis", json={"project_path": project})
        wait_until_finished(client)
        release.clear()
        client.post("/api/analysis", json={"project_path": project})
        client.post("/api/analysis/cancel")

        assert wait_until_finished(client)["state"] == "cancelled"
        assert client.get("/api/summary").status_code == 200


def test_failed_analysis_reports_the_error(
    settings: Settings, make_project: ProjectFactory
) -> None:
    app = create_app(settings)

    def runner(*_args: Any) -> Any:
        raise RuntimeError("disk on fire")

    app.state.manager._runner = runner
    with TestClient(app, base_url="http://localhost") as client:
        client.post("/api/analysis", json={"project_path": str(make_project({}))})

        status = wait_until_finished(client)

    assert (status["state"], status["error"]) == ("failed", "RuntimeError: disk on fire")


def test_reset_discards_results(analyzed: TestClient) -> None:
    response = analyzed.delete("/api/analysis")

    assert response.json()["state"] == "idle"
    assert response.json()["has_result"] is False
    assert analyzed.get("/api/summary").status_code == 404


@pytest.mark.parametrize(
    "path",
    [
        "/api/summary",
        "/api/tree",
        "/api/elements",
        "/api/element?id=x",
        "/api/usages?id=x",
        "/api/search?q=x",
        "/api/graph",
        "/api/issues",
        "/api/cycles",
        "/api/patterns",
        "/api/source?file=x.py",
    ],
)
def test_read_endpoints_need_an_analysis(client: TestClient, path: str) -> None:
    response = client.get(path)

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "no_analysis"


# --------------------------------------------------------------------- summary


def test_summary(analyzed: TestClient) -> None:
    body = analyzed.get("/api/summary").json()

    assert body["name"] == "project"
    assert (body["total_files"], body["modules"], body["classes"], body["functions"]) == (
        5,
        5,
        2,
        6,
    )
    assert body["skipped_total"] == 1
    assert body["skipped_files"][0]["file_path"] == "broken.py"
    assert body["skipped_files"][0]["reason"].startswith("syntax error")
    assert body["issues"]["unused_import"] == 1
    assert body["most_imported_modules"][0]["name"] == "app.models"
    assert body["import_cycles"] == 0


def test_second_analysis_is_served_from_cache(
    client: TestClient, make_project: ProjectFactory
) -> None:
    project = str(make_project(PROJECT))
    for _ in range(2):
        client.post("/api/analysis", json={"project_path": project})
        wait_until_finished(client)

    assert client.get("/api/summary").json()["cached_files"] == 5


# ------------------------------------------------------------------------ tree


def test_tree_expands_lazily_from_the_root(analyzed: TestClient) -> None:
    root = analyzed.get("/api/tree").json()
    assert [(n["id"], n["type"], n["child_count"]) for n in root["children"]] == [
        ("dir:app", "directory", 3),
        ("module:broken.py", "module", 0),
        ("module:main.py", "module", 0),
    ]

    package = analyzed.get("/api/tree", params={"parent": "dir:app"}).json()
    assert [n["name"] for n in package["children"]] == ["__init__", "models", "services"]

    module = analyzed.get("/api/tree", params={"parent": "module:app/models.py"}).json()
    assert [(n["name"], n["type"], n["child_count"]) for n in module["children"]] == [
        ("Base", "class", 2),
        ("User", "class", 2),
    ]


def test_tree_rejects_unknown_nodes(analyzed: TestClient) -> None:
    for parent in ("dir:nope", "module:nope.py"):
        response = analyzed.get("/api/tree", params={"parent": parent})
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "unknown_node"


# -------------------------------------------------------------------- elements


def test_elements_are_paginated_without_gaps_or_overlap(analyzed: TestClient) -> None:
    seen: list[str] = []
    offset: int | None = 0
    while offset is not None:
        page = analyzed.get("/api/elements", params={"offset": offset, "limit": 4}).json()
        assert page["total"] == 13
        assert len(page["items"]) <= 4
        seen.extend(item["id"] for item in page["items"])
        offset = page["next_offset"]

    assert len(seen) == len(set(seen)) == 13


def test_elements_filter_by_type_and_file(analyzed: TestClient) -> None:
    classes = analyzed.get("/api/elements", params={"type": "class"}).json()
    assert [item["name"] for item in classes["items"]] == ["Base", "User"]

    in_file = analyzed.get(
        "/api/elements", params={"file": "app/services.py", "type": "function"}
    ).json()
    assert [item["name"] for item in in_file["items"]] == ["create_user", "unused_helper"]
    assert in_file["items"][0]["summary"] == "Create and persist a user."
    assert "docstring" not in in_file["items"][0]


@pytest.mark.parametrize(
    "params", [{"limit": 0}, {"limit": 501}, {"offset": -1}, {"type": "bogus"}]
)
def test_list_parameters_are_bounded(analyzed: TestClient, params: dict[str, Any]) -> None:
    assert analyzed.get("/api/elements", params=params).status_code == 422


def test_element_detail_includes_hierarchy_and_overrides(analyzed: TestClient) -> None:
    user = analyzed.get("/api/element", params={"id": "class:app/models.py:User"}).json()
    assert [b["name"] for b in user["bases"]] == ["Base"]
    assert [c["name"] for c in user["children"]] == ["save", "rename"]
    assert user["parent"]["id"] == "module:app/models.py"
    assert user["usage_counts"] == {"import": 1, "type_hint": 1, "call": 1}

    base = analyzed.get("/api/element", params={"id": "class:app/models.py:Base"}).json()
    assert [s["name"] for s in base["subclasses"]] == ["User"]
    assert base["docstring"] == "Common behaviour."

    save = analyzed.get("/api/element", params={"id": "function:app/models.py:User.save"}).json()
    assert save["overrides"]["id"] == "function:app/models.py:Base.save"
    assert save["is_method"] is True
    assert [d["qualified_name"] for d in save["dependencies"]] == ["Base.save"]

    create = analyzed.get(
        "/api/element", params={"id": "function:app/services.py:create_user"}
    ).json()
    assert create["parameters"] == [
        {"name": "name", "kind": "positional", "type_hint": "str", "default_value": None}
    ]
    assert create["return_type"] == "User"


def test_element_detail_lists_its_issues(analyzed: TestClient) -> None:
    helper = analyzed.get(
        "/api/element", params={"id": "function:app/services.py:unused_helper"}
    ).json()

    assert [issue["kind"] for issue in helper["issues"]] == ["dead_code"]


def test_unknown_element_is_a_404(analyzed: TestClient) -> None:
    for path in ("/api/element", "/api/usages"):
        response = analyzed.get(path, params={"id": "function:nope.py:nope"})
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "unknown_element"


# ---------------------------------------------------------------------- usages


def test_usages_are_paginated_and_grouped_by_file(analyzed: TestClient) -> None:
    body = analyzed.get("/api/usages", params={"id": "class:app/models.py:User"}).json()

    assert body["total"] == 3
    assert body["by_file"] == [{"file_path": "app/services.py", "count": 3}]
    assert [(u["usage_type"], u["line"], u["context"]) for u in body["items"]] == [
        ("import", 3, "from app.models import User"),
        ("type_hint", 6, "def create_user(name: str) -> User:"),
        ("call", 8, "user = User()"),
    ]
    assert body["items"][2]["used_by"]["name"] == "create_user"

    page = analyzed.get(
        "/api/usages", params={"id": "class:app/models.py:User", "limit": 2, "offset": 2}
    ).json()
    assert (len(page["items"]), page["next_offset"]) == (1, None)


def test_usages_filter_by_type(analyzed: TestClient) -> None:
    body = analyzed.get(
        "/api/usages", params={"id": "class:app/models.py:User", "type": "call"}
    ).json()

    assert [u["usage_type"] for u in body["items"]] == ["call"]


# ---------------------------------------------------------------------- search


def test_search_ranks_names_before_qualified_names(analyzed: TestClient) -> None:
    body = analyzed.get("/api/search", params={"q": "user"}).json()

    assert [(r["element"]["qualified_name"], r["match_type"]) for r in body["items"]] == [
        ("User", "name"),  # exact
        ("create_user", "name"),  # substring
        ("User.rename", "qualified_name"),
        ("User.save", "qualified_name"),
    ]
    assert body["total"] == 4


def test_search_matches_paths_and_optionally_docstrings(analyzed: TestClient) -> None:
    by_path = analyzed.get("/api/search", params={"q": "services", "type": "function"}).json()
    assert {r["match_type"] for r in by_path["items"]} == {"file_path"}
    assert len(by_path["items"]) == 2

    without = analyzed.get("/api/search", params={"q": "storage"}).json()
    with_docs = analyzed.get("/api/search", params={"q": "storage", "docstrings": True}).json()
    assert without["total"] == 0
    assert [(r["element"]["qualified_name"], r["match_type"]) for r in with_docs["items"]] == [
        ("Base.save", "docstring")
    ]
    assert "storage" in with_docs["items"][0]["match_text"]


def test_search_is_case_insensitive_and_paginated(analyzed: TestClient) -> None:
    first = analyzed.get("/api/search", params={"q": "SAVE", "limit": 1}).json()
    second = analyzed.get("/api/search", params={"q": "SAVE", "limit": 1, "offset": 1}).json()

    assert (first["total"], first["next_offset"], second["next_offset"]) == (2, 1, None)
    assert first["items"][0]["element"]["id"] != second["items"][0]["element"]["id"]


def test_empty_search_returns_nothing(analyzed: TestClient) -> None:
    assert analyzed.get("/api/search", params={"q": "  "}).json()["total"] == 0
    assert analyzed.get("/api/search", params={"q": "x" * 201}).status_code == 422


# ----------------------------------------------------------------------- graph


def test_module_graph(analyzed: TestClient) -> None:
    body = analyzed.get("/api/graph").json()

    assert {(e["source"], e["target"]) for e in body["edges"]} == {
        ("module:app/services.py", "module:app/models.py"),
        ("module:main.py", "module:app/services.py"),
    }
    assert {n["id"] for n in body["nodes"]} == {
        "module:app/models.py",
        "module:app/services.py",
        "module:main.py",
    }
    assert (body["total_nodes"], body["truncated"]) == (5, False)

    everything = analyzed.get("/api/graph", params={"connected_only": False}).json()
    assert len(everything["nodes"]) == 5


def test_graph_levels(analyzed: TestClient) -> None:
    classes = analyzed.get("/api/graph", params={"level": "class"}).json()
    assert [(e["source"], e["target"], e["relationship_type"]) for e in classes["edges"]] == [
        ("class:app/models.py:User", "class:app/models.py:Base", "inherits"),
        ("class:app/models.py:User", "class:app/models.py:Base", "uses"),
    ]

    packages = analyzed.get("/api/graph", params={"level": "package"}).json()
    assert [(e["source"], e["target"]) for e in packages["edges"]] == [(".", "app")]
    assert analyzed.get("/api/graph", params={"level": "galaxy"}).status_code == 422


def test_graph_focus_limits_to_a_neighbourhood(analyzed: TestClient) -> None:
    one_hop = analyzed.get("/api/graph", params={"focus": "module:main.py", "depth": 1}).json()
    two_hops = analyzed.get("/api/graph", params={"focus": "module:main.py", "depth": 2}).json()

    assert {n["id"] for n in one_hop["nodes"]} == {"module:main.py", "module:app/services.py"}
    assert len(two_hops["nodes"]) == 3
    missing = analyzed.get("/api/graph", params={"focus": "module:nope.py"})
    assert missing.json()["error"]["code"] == "unknown_node"


def test_graph_truncation_keeps_the_best_connected_nodes_and_the_focus(
    analyzed: TestClient,
) -> None:
    capped = analyzed.get("/api/graph", params={"max_nodes": 2}).json()
    assert capped["truncated"] is True
    assert {n["id"] for n in capped["nodes"]} == {"module:app/services.py", "module:app/models.py"}
    assert len(capped["edges"]) == 1

    focused = analyzed.get(
        "/api/graph", params={"max_nodes": 1, "focus": "module:main.py", "depth": 2}
    ).json()
    assert [n["id"] for n in focused["nodes"]] == ["module:main.py"]


# ---------------------------------------------------------- issues and friends


def test_issues_filter_and_count(analyzed: TestClient) -> None:
    everything = analyzed.get("/api/issues").json()
    assert everything["counts"] == {"unused_import": 1, "dead_code": 2}

    unused = analyzed.get("/api/issues", params={"kind": "unused_import"}).json()
    assert [(i["file_path"], i["line"], i["message"]) for i in unused["items"]] == [
        ("app/services.py", 2, "'os' is imported but never used")
    ]
    assert unused["counts"] == everything["counts"]

    info = analyzed.get("/api/issues", params={"severity": "info"}).json()
    assert {i["kind"] for i in info["items"]} == {"dead_code"}
    in_file = analyzed.get("/api/issues", params={"file": "app/models.py"}).json()
    assert [i["element_id"] for i in in_file["items"]] == ["function:app/models.py:Base.describe"]


def test_cycles_and_patterns(client: TestClient, make_project: ProjectFactory) -> None:
    project = make_project(
        {
            "a.py": "import b\n",
            "b.py": "import a\n",
            "f.py": "class WidgetFactory:\n    def create_widget(self): ...\n",
        }
    )
    client.post("/api/analysis", json={"project_path": str(project)})
    wait_until_finished(client)

    cycles = client.get("/api/cycles").json()
    assert cycles["total"] == 1
    assert [m["qualified_name"] for m in cycles["items"][0]["modules"]] == ["a", "b"]

    patterns = client.get("/api/patterns").json()["items"]
    assert [(p["type"], p["elements"][0]["name"]) for p in patterns] == [
        ("factory", "WidgetFactory")
    ]


# ---------------------------------------------------------------------- source


def test_source_returns_requested_lines(analyzed: TestClient) -> None:
    body = analyzed.get(
        "/api/source", params={"file": "app/services.py", "start": 6, "end": 7}
    ).json()

    assert body["lines"] == [
        "def create_user(name: str) -> User:",
        '    """Create and persist a user."""',
    ]
    assert (body["start_line"], body["end_line"], body["total_lines"]) == (6, 7, 13)


def test_source_is_capped(client: TestClient, make_project: ProjectFactory) -> None:
    project = make_project({"big.py": "\n".join(f"x{i} = {i}" for i in range(1000)) + "\n"})
    client.post("/api/analysis", json={"project_path": str(project)})
    wait_until_finished(client)

    body = client.get("/api/source", params={"file": "big.py", "start": 10, "end": 5000}).json()

    assert len(body["lines"]) == 400
    assert (body["start_line"], body["end_line"]) == (10, 409)
    past_end = client.get("/api/source", params={"file": "big.py", "start": 5000}).json()
    assert past_end["lines"] == []


@pytest.mark.parametrize(
    "file", ["../outside.py", "/etc/passwd", "app/../../outside.py", "notes.txt", "missing.py"]
)
def test_source_only_serves_analyzed_files(analyzed: TestClient, tmp_path: Path, file: str) -> None:
    (tmp_path / "outside.py").write_text("SECRET = 1\n")

    response = analyzed.get("/api/source", params={"file": file})

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "unknown_file"
    assert "SECRET" not in response.text


def test_source_of_a_deleted_file(analyzed: TestClient) -> None:
    root = Path(analyzed.get("/api/summary").json()["path"])
    (root / "main.py").unlink()

    response = analyzed.get("/api/source", params={"file": "main.py"})

    assert response.json()["error"]["code"] == "unreadable_file"


# ------------------------------------------------------------------ transport


def test_requests_with_a_foreign_host_header_are_refused(analyzed: TestClient) -> None:
    response = analyzed.get("/api/summary", headers={"host": "evil.example"})

    assert response.status_code == 400


def test_cors_allows_only_configured_origins(client: TestClient) -> None:
    allowed = client.get("/api/health", headers={"origin": "http://localhost:5173"})
    denied = client.get("/api/health", headers={"origin": "http://evil.example"})

    assert allowed.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "access-control-allow-origin" not in denied.headers


def test_large_responses_are_gzipped(client: TestClient, make_project: ProjectFactory) -> None:
    project = make_project({"m.py": "\n".join(f"def function_{i}(): ...\n" for i in range(200))})
    client.post("/api/analysis", json={"project_path": str(project)})
    wait_until_finished(client)

    response = client.get("/api/elements", headers={"accept-encoding": "gzip"})

    assert response.headers["content-encoding"] == "gzip"
    assert response.json()["total"] == 201


def test_openapi_schema_documents_every_endpoint(client: TestClient) -> None:
    paths = client.get("/openapi.json").json()["paths"]

    assert set(paths) == {
        "/api/health",
        "/api/analysis",
        "/api/analysis/cancel",
        "/api/summary",
        "/api/tree",
        "/api/elements",
        "/api/element",
        "/api/usages",
        "/api/search",
        "/api/graph",
        "/api/issues",
        "/api/cycles",
        "/api/patterns",
        "/api/source",
    }


def test_the_whole_project_dump_endpoints_are_gone(client: TestClient) -> None:
    assert client.get("/api/data").status_code == 404
    assert client.post("/api/analyze", json={"project_path": "/tmp"}).status_code == 404


def test_root_without_a_frontend_build_points_at_the_docs(client: TestClient) -> None:
    assert client.get("/").json()["docs"] == "/docs"


def test_built_frontend_is_served_with_client_side_routing(
    settings: Settings, tmp_path: Path
) -> None:
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<html>app</html>")
    (dist / "assets" / "app.js").write_text("console.log(1)")
    (tmp_path / "secret.txt").write_text("secret")
    app = create_app(settings.model_copy(update={"static_dir": dist}))

    with TestClient(app, base_url="http://localhost") as client:
        assert client.get("/").text == "<html>app</html>"
        assert client.get("/assets/app.js").text == "console.log(1)"
        assert client.get("/explore/some/route").text == "<html>app</html>"
        assert client.get("/%2e%2e/secret.txt").text == "<html>app</html>"
        assert client.get("/api/health").json()["status"] == "ok"
        assert client.get("/api/nope").status_code == 404


# ---------------------------------------------------------- cross-origin guard


def test_foreign_origin_cannot_change_state(client: TestClient) -> None:
    """A form on another site must not be able to cancel or reset an analysis."""
    evil = {"Origin": "https://evil.example"}

    for method, path in (("POST", "/api/analysis/cancel"), ("DELETE", "/api/analysis")):
        response = client.request(method, path, headers=evil)
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "forbidden_origin"
    assert (
        client.request("POST", "/api/analysis/cancel", headers={"Origin": "null"}).status_code
        == 403
    )
    # Reading is unaffected; CORS already stops foreign pages seeing the body.
    assert client.get("/api/health", headers=evil).status_code == 200


def test_own_and_configured_origins_may_change_state(client: TestClient) -> None:
    same_origin = {"Origin": "http://localhost"}
    dev_server = {"Origin": "http://localhost:5173"}

    assert client.post("/api/analysis/cancel", headers=same_origin).status_code == 200
    assert client.post("/api/analysis/cancel", headers=dev_server).status_code == 200
    assert client.post("/api/analysis/cancel").status_code == 200  # no Origin: CLI clients
