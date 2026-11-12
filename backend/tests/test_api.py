"""API behaviour tests (ported from the former root-level ``test_*.py`` scripts)."""

from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from tests.conftest import ProjectFactory


def test_root_reports_api_name(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Python Code Analyzer API"}


def test_analyze_returns_statistics(client: TestClient, sample_project: Path) -> None:
    response = client.post("/api/analyze", json={"project_path": str(sample_project)})

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    stats = body["data"]
    assert stats["project_name"] == "project"
    assert stats["total_files"] == 5
    assert stats["modules_count"] == 5
    assert stats["classes_count"] == 4
    assert stats["total_lines"] > 0


def test_data_is_empty_before_analysis(client: TestClient) -> None:
    response = client.get("/api/data")
    assert response.status_code == 200
    assert response.json()["data"] == {"has_data": False}


def test_data_contains_elements_after_analysis(client: TestClient, sample_project: Path) -> None:
    client.post("/api/analyze", json={"project_path": str(sample_project)})

    response = client.get("/api/data")

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["has_data"] is True
    assert {m["name"] for m in data["modules"]} == {
        "main",
        "utils",
        "models",
        "__init__",
        "user_service",
    }
    assert {c["name"] for c in data["classes"]} == {
        "Application",
        "User",
        "Product",
        "UserService",
    }
    assert "helper_function" in {f["name"] for f in data["functions"]}
    assert data["dependency_graph"]["metrics"]["node_count"] > 0


def test_reset_clears_the_session(client: TestClient, sample_project: Path) -> None:
    client.post("/api/analyze", json={"project_path": str(sample_project)})

    response = client.post("/api/reset")

    assert response.status_code == 200
    assert response.json()["data"] == {"session_cleared": True}
    assert client.get("/api/data").json()["data"] == {"has_data": False}


def test_analyze_rejects_missing_path(client: TestClient, tmp_path: Path) -> None:
    response = client.post("/api/analyze", json={"project_path": str(tmp_path / "missing")})
    assert response.status_code == 400


def test_analyze_rejects_empty_path(client: TestClient) -> None:
    response = client.post("/api/analyze", json={"project_path": ""})
    assert response.status_code == 400


def test_analyze_rejects_file_path(client: TestClient, tmp_path: Path) -> None:
    file_path = tmp_path / "single.py"
    file_path.write_text("x = 1\n", encoding="utf-8")
    response = client.post("/api/analyze", json={"project_path": str(file_path)})
    assert response.status_code == 400


def test_empty_project_is_analyzed_without_error(
    client: TestClient, make_project: ProjectFactory
) -> None:
    project = make_project({})
    response = client.post("/api/analyze", json={"project_path": str(project)})
    assert response.status_code == 200
    assert response.json()["data"]["total_files"] == 0


def test_files_with_syntax_errors_are_skipped(
    client: TestClient, make_project: ProjectFactory
) -> None:
    project = make_project(
        {
            "good.py": "def ok() -> int:\n    return 1\n",
            "bad.py": "def broken(:\n    pass\n",
        }
    )

    response = client.post("/api/analyze", json={"project_path": str(project)})

    assert response.status_code == 200
    data = client.get("/api/data").json()["data"]
    assert [f["name"] for f in data["functions"]] == ["ok"]


def test_search_finds_elements_by_name(client: TestClient, sample_project: Path) -> None:
    client.post("/api/analyze", json={"project_path": str(sample_project)})

    response = client.get("/api/search", params={"q": "helper", "element_type": "function"})

    assert response.status_code == 200
    data = response.json()["data"]
    assert [r["element"]["name"] for r in data["results"]] == ["helper_function"]
    assert data["results"][0]["match_type"] == "name"
    assert data["pagination"]["total_results"] == 1


def test_search_without_analysis_reports_no_data(client: TestClient) -> None:
    response = client.get("/api/search", params={"q": "anything"})
    assert response.json()["data"] == {"has_data": False, "results": []}


def test_analyze_error_explains_the_problem(client: TestClient, tmp_path: Path) -> None:
    response = client.post("/api/analyze", json={"project_path": str(tmp_path / "missing")})
    assert "does not exist" in response.json()["detail"]


def test_architecture_reports_import_cycles(
    client: TestClient, make_project: ProjectFactory
) -> None:
    project = make_project(
        {
            "a.py": "import b\n",
            "b.py": "import a\n",
            "c.py": "import a\n",
        }
    )
    client.post("/api/analyze", json={"project_path": str(project)})

    data = client.get("/api/architecture").json()["data"]

    assert data["circular_dependencies"] == [["module:a.py", "module:b.py"]]
    assert data["dependency_graph"]["metrics"]["edge_count"] == 3


def test_search_rejects_out_of_range_pagination(client: TestClient) -> None:
    assert client.get("/api/search", params={"q": "x", "page": 0}).status_code == 422
    assert client.get("/api/search", params={"q": "x", "page_size": 100000}).status_code == 422


def test_search_pages_do_not_overlap_and_flag_truncation(
    client: TestClient, make_project: ProjectFactory
) -> None:
    source = "\n".join(f"def handler_{i:02d}() -> None: ...\n" for i in range(25))
    project = make_project({"handlers.py": source})
    client.post("/api/analyze", json={"project_path": str(project)})

    def names(**params: int) -> list[str]:
        body = client.get(
            "/api/search", params={"q": "handler_", "element_type": "function", **params}
        ).json()["data"]
        return [r["element"]["name"] for r in body["results"]]

    first, second, third = (names(page=p, page_size=10) for p in (1, 2, 3))
    assert len(first) == len(second) == 10
    assert len(third) == 5
    assert len({*first, *second, *third}) == 25

    capped = client.get(
        "/api/search", params={"q": "handler_", "element_type": "function", "max_results": 7}
    ).json()["data"]
    assert capped["truncated"] is True
    assert capped["pagination"]["total_results"] == 7
