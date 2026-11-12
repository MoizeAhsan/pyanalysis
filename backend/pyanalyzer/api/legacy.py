"""Original (v1) endpoints, kept as thin adapters over the new analysis core.

These return whole-project payloads and exist only until the frontend has
moved to the paginated API; they are then removed.
"""

from __future__ import annotations

import logging
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from pyanalyzer.analysis.pipeline import AnalysisResult, analyze_project
from pyanalyzer.api.dependencies import StoreDep
from pyanalyzer.models.core import CodeElement, DependencyGraph, ElementType, SourceLocation
from pyanalyzer.scanner.file_scanner import ProjectPathError

logger = logging.getLogger(__name__)
router = APIRouter(tags=["legacy"])

_NO_DATA = "No analysis data available. Please analyze a project first."


class AnalyzeRequest(BaseModel):
    """Request body for starting an analysis."""

    project_path: str


class AnalyzeResponse(BaseModel):
    """Envelope used by every v1 endpoint."""

    success: bool
    message: str
    data: dict[str, Any] = Field(default_factory=dict)


def _location(location: SourceLocation) -> dict[str, Any]:
    return {
        "file_path": location.file_path,
        "line_number": location.line_number,
        "column_number": location.column_number,
        "end_line": location.end_line,
        "end_column": location.end_column,
    }


def _element(result: AnalysisResult, element: CodeElement) -> dict[str, Any]:
    resolution = result.resolution
    metadata: dict[str, Any] = {"qualified_name": element.qualified_name}
    if element.type is ElementType.CLASS:
        metadata["base_classes"] = element.bases
        metadata["method_count"] = sum(
            resolution.elements[child].type is ElementType.FUNCTION
            for child in resolution.children.get(element.id, ())
        )
    elif element.type is ElementType.FUNCTION:
        metadata["is_async"] = element.is_async
        metadata["is_method"] = element.is_method
        metadata["parameter_count"] = len(element.parameters)
        metadata["complexity"] = element.complexity
    return {
        "id": element.id,
        "name": element.name,
        "type": element.type.value,
        "location": _location(element.location),
        "docstring": element.docstring,
        "parameters": [
            {
                "name": parameter.name,
                "type_hint": parameter.type_hint,
                "default_value": parameter.default_value,
            }
            for parameter in element.parameters
        ],
        "return_type": element.return_type,
        "decorators": element.decorators,
        "dependencies": resolution.dependencies.get(element.id, []),
        "usages": [
            {
                "location": _location(usage.location),
                "context": usage.context,
                "usage_type": usage.usage_type.value,
            }
            for usage in resolution.usages.get(element.id, ())
        ],
        "metadata": metadata,
    }


def _graph(graph: DependencyGraph) -> dict[str, Any]:
    metrics = graph.metrics
    return {
        "nodes": {
            node.id: {
                "id": node.id,
                "name": node.name,
                "type": node.type,
                "metadata": {
                    "file_path": node.file_path,
                    "line_number": 1,
                    "degree": node.in_degree + node.out_degree,
                    "in_degree": node.in_degree,
                    "out_degree": node.out_degree,
                },
            }
            for node in graph.nodes.values()
        },
        "edges": [
            {
                "source": edge.source,
                "target": edge.target,
                "relationship_type": edge.relationship_type,
                "weight": edge.weight,
            }
            for edge in graph.edges
        ],
        "metrics": None
        if metrics is None
        else {
            "node_count": metrics.node_count,
            "edge_count": metrics.edge_count,
            "density": metrics.density,
            "avg_degree": metrics.avg_degree,
        },
    }


def _of_type(result: AnalysisResult, element_type: ElementType) -> list[CodeElement]:
    return [e for e in result.resolution.elements.values() if e.type is element_type]


def _patterns(result: AnalysisResult) -> list[dict[str, Any]]:
    return [
        {
            "name": pattern.name,
            "type": pattern.type.value,
            "confidence": pattern.confidence,
            "elements": pattern.elements,
            "description": pattern.description,
        }
        for pattern in result.patterns
    ]


def _statistics(result: AnalysisResult) -> dict[str, int]:
    return {
        "total_elements": len(result.resolution.elements),
        "modules_count": len(_of_type(result, ElementType.MODULE)),
        "classes_count": len(_of_type(result, ElementType.CLASS)),
        "functions_count": len(_of_type(result, ElementType.FUNCTION)),
        "patterns_count": len(result.patterns),
    }


def _project_info(result: AnalysisResult) -> dict[str, Any]:
    project = result.project
    return {
        "name": project.name,
        "path": project.path,
        "total_files": project.total_files,
        "total_lines": project.total_lines,
        "languages": project.languages,
        "analysis_timestamp": project.analysis_timestamp.isoformat(),
    }


@router.post("/analyze")
def analyze(request: AnalyzeRequest, store: StoreDep) -> AnalyzeResponse:
    """Analyze a project synchronously and store the result."""
    try:
        result = analyze_project(request.project_path)
    except ProjectPathError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=f"Permission denied: {exc}") from exc
    store.set(result)
    logger.info(
        "Analyzed %s: %d files in %.2fs",
        result.project.path,
        result.project.total_files,
        result.duration_seconds,
    )
    statistics = _statistics(result)
    return AnalyzeResponse(
        success=True,
        message=f"Analysis completed successfully for project: {result.project.path}",
        data={
            "project_name": result.project.name,
            "total_files": result.project.total_files,
            "total_lines": result.project.total_lines,
            "modules_count": statistics["modules_count"],
            "classes_count": statistics["classes_count"],
            "functions_count": statistics["functions_count"],
            "total_elements": statistics["total_elements"],
        },
    )


@router.post("/reset")
def reset(store: StoreDep) -> AnalyzeResponse:
    """Discard the current analysis."""
    store.clear()
    return AnalyzeResponse(
        success=True,
        message="Analysis session reset successfully",
        data={"session_cleared": True},
    )


@router.get("/data")
def data(store: StoreDep) -> AnalyzeResponse:
    """Return the whole analysis in one response."""
    result = store.result
    if result is None:
        return AnalyzeResponse(success=True, message=_NO_DATA, data={"has_data": False})
    return AnalyzeResponse(
        success=True,
        message="Analysis data retrieved successfully",
        data={
            "has_data": True,
            "project_info": _project_info(result),
            "modules": [_element(result, e) for e in _of_type(result, ElementType.MODULE)],
            "classes": [_element(result, e) for e in _of_type(result, ElementType.CLASS)],
            "functions": [_element(result, e) for e in _of_type(result, ElementType.FUNCTION)],
            "dependency_graph": _graph(result.module_graph),
            "architectural_patterns": _patterns(result),
            "statistics": _statistics(result),
        },
    )


@router.get("/architecture")
def architecture(store: StoreDep) -> AnalyzeResponse:
    """Return modules, the module graph, patterns, and dependency cycles."""
    result = store.result
    if result is None:
        return AnalyzeResponse(success=True, message=_NO_DATA, data={"has_data": False})
    return AnalyzeResponse(
        success=True,
        message="Architectural data retrieved successfully",
        data={
            "has_data": True,
            "project_info": _project_info(result),
            "modules": [_element(result, e) for e in _of_type(result, ElementType.MODULE)],
            "dependency_graph": _graph(result.module_graph),
            "architectural_patterns": _patterns(result),
            "circular_dependencies": result.cycles,
            "statistics": _statistics(result),
        },
    )


def _match(element: CodeElement, query: str) -> tuple[int, str, str] | None:
    """Rank, match type, and matched text for an element, or ``None``."""
    if query in element.name.lower():
        return 0, "name", element.name
    docstring = element.docstring
    if docstring:
        position = docstring.lower().find(query)
        if position >= 0:
            start = max(0, position - 50)
            end = min(len(docstring), position + len(query) + 50)
            snippet = docstring[start:end]
            if start > 0:
                snippet = "..." + snippet
            if end < len(docstring):
                snippet += "..."
            return 1, "docstring", snippet
    if query in element.location.file_path.lower():
        return 2, "file_path", element.location.file_path
    return None


@router.get("/search")
def search(
    store: StoreDep,
    q: str = "",
    element_type: str | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=200)] = 20,
    max_results: Annotated[int, Query(ge=1, le=5000)] = 100,
) -> AnalyzeResponse:
    """Search elements by name, docstring, or file path."""
    result = store.result
    if result is None:
        return AnalyzeResponse(
            success=True, message=_NO_DATA, data={"has_data": False, "results": []}
        )
    query = q.strip().lower()
    if not query:
        return AnalyzeResponse(
            success=True,
            message="Empty search query",
            data={"has_data": True, "results": [], "query": query, "element_type": element_type},
        )

    wanted = None
    if element_type and element_type.lower() in ElementType:
        wanted = ElementType(element_type.lower())
    matches: list[tuple[int, str, str, str, CodeElement]] = []
    for element in result.resolution.elements.values():
        if wanted is not None and element.type is not wanted:
            continue
        found = _match(element, query)
        if found is not None:
            rank, match_type, text = found
            matches.append((rank, element.name.lower(), match_type, text, element))
    matches.sort(key=lambda match: match[:2])

    truncated = len(matches) > max_results
    matches = matches[:max_results]
    total = len(matches)
    total_pages = (total + page_size - 1) // page_size
    start = (page - 1) * page_size
    shown = matches[start : start + page_size]
    return AnalyzeResponse(
        success=True,
        message=f"Found {total} results for '{query}' (page {page}/{total_pages})",
        data={
            "has_data": True,
            "results": [
                {
                    "element": _element(result, element),
                    "match_type": match_type,
                    "match_text": text,
                }
                for _, _, match_type, text, element in shown
            ],
            "query": query,
            "element_type": element_type,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_results": total,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1,
                "start_index": start + 1 if shown else 0,
                "end_index": start + len(shown),
            },
            "truncated": truncated,
        },
    )
