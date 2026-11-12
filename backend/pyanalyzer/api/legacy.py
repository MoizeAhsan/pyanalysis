"""Original (v1) endpoints, kept as thin adapters over the new analysis core.

These return whole-project payloads and exist only until the frontend has
moved to the paginated API; they are then removed. The v1 search endpoint is
already gone: ``/api/search`` is served by the v2 API.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from pyanalyzer.analysis.pipeline import AnalysisResult, analyze_project
from pyanalyzer.api.analysis import build_options
from pyanalyzer.api.dependencies import ManagerDep, SettingsDep, StoreDep
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
def analyze(request: AnalyzeRequest, store: StoreDep, settings: SettingsDep) -> AnalyzeResponse:
    """Analyze a project synchronously and store the result."""
    try:
        result = analyze_project(request.project_path, build_options(settings))
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
def reset(manager: ManagerDep) -> AnalyzeResponse:
    """Discard the current analysis."""
    manager.reset()
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
