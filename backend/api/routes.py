"""
API routes for Python Code Analyzer
"""

import logging
from typing import Dict, Any, Optional, List
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, validator

from models.core import current_session, CodeElement, DependencyGraph
from analysis_engine.project_analyzer import ProjectAnalyzer

logger = logging.getLogger(__name__)
router = APIRouter()

# Global analyzer instance
analyzer = ProjectAnalyzer()


class AnalyzeRequest(BaseModel):
    """Request model for project analysis."""

    project_path: str

    @validator("project_path")
    def validate_project_path(cls, v):  # pylint: disable=no-self-argument
        """Validate that the project path exists and is accessible"""
        if not v or not v.strip():
            raise ValueError("Project path cannot be empty")

        path = Path(v.strip())
        if not path.exists():
            raise ValueError(f"Project path does not exist: {v}")
        if not path.is_dir():
            raise ValueError(f"Project path must be a directory: {v}")

        return str(path.absolute())


class AnalyzeResponse(BaseModel):
    """Response model for API endpoints."""

    success: bool
    message: str
    data: Dict[str, Any] = {}


def _serialize_code_element(element: CodeElement) -> Dict[str, Any]:
    """Convert CodeElement to serializable dictionary"""
    return {
        "id": element.id,
        "name": element.name,
        "type": element.type.value,
        "location": {
            "file_path": element.location.file_path,
            "line_number": element.location.line_number,
            "column_number": element.location.column_number,
            "end_line": element.location.end_line,
            "end_column": element.location.end_column,
        },
        "docstring": element.docstring,
        "parameters": [
            {
                "name": param.name,
                "type_hint": param.type_hint,
                "default_value": param.default_value,
            }
            for param in element.parameters
        ],
        "return_type": element.return_type,
        "decorators": element.decorators,
        "dependencies": element.dependencies,
        "usages": [
            {
                "location": {
                    "file_path": usage.location.file_path,
                    "line_number": usage.location.line_number,
                    "column_number": usage.location.column_number,
                    "end_line": usage.location.end_line,
                    "end_column": usage.location.end_column,
                },
                "context": usage.context,
                "usage_type": usage.usage_type.value,
            }
            for usage in element.usages
        ],
        "metadata": element.metadata,
    }


def _serialize_dependency_graph(
    graph: Optional[DependencyGraph],
) -> Optional[Dict[str, Any]]:
    """Convert DependencyGraph to serializable dictionary"""
    if not graph:
        return None

    return {
        "nodes": {
            node_id: {
                "id": node.id,
                "name": node.name,
                "type": node.type.value,
                "metadata": node.metadata,
            }
            for node_id, node in graph.nodes.items()
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
        "metrics": {
            "node_count": graph.metrics.node_count,
            "edge_count": graph.metrics.edge_count,
            "density": graph.metrics.density,
            "avg_degree": graph.metrics.avg_degree,
        }
        if graph.metrics
        else None,
    }


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_project(request: AnalyzeRequest) -> AnalyzeResponse:
    """Analyze a Python project and return results"""
    try:
        logger.info("Starting analysis for project: %s", request.project_path)

        # Perform the analysis
        session = analyzer.analyze_project(request.project_path)

        # Get basic statistics for response
        stats = {
            "project_name": session.project_info.name
            if session.project_info
            else "Unknown",
            "total_files": session.project_info.total_files
            if session.project_info
            else 0,
            "total_lines": session.project_info.total_lines
            if session.project_info
            else 0,
            "modules_count": len(session.modules),
            "classes_count": len(session.classes),
            "functions_count": len(session.functions),
            "total_elements": len(session.all_elements),
        }

        logger.info(
            "Analysis completed successfully for project: %s", request.project_path
        )

        return AnalyzeResponse(
            success=True,
            message=f"Analysis completed successfully for project: {request.project_path}",
            data=stats,
        )
    except ValueError as e:
        logger.error("Invalid project path: %s", e)
        raise HTTPException(status_code=400, detail=str(e)) from e
    except PermissionError as e:
        logger.error("Permission denied accessing project: %s", e)
        raise HTTPException(status_code=403, detail=f"Permission denied: {e}") from e
    except Exception as e:
        logger.error("Analysis failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}") from e


@router.post("/reset", response_model=AnalyzeResponse)
async def reset_analysis() -> AnalyzeResponse:
    """Clear current analysis and reset to clean state"""
    try:
        logger.info("Resetting analysis session")
        analyzer.reset_analysis()

        return AnalyzeResponse(
            success=True,
            message="Analysis session reset successfully",
            data={"session_cleared": True},
        )
    except Exception as e:
        logger.error("Failed to reset analysis session: %s", e)
        raise HTTPException(status_code=500, detail=f"Reset failed: {e}") from e


@router.get("/architecture", response_model=AnalyzeResponse)
async def get_architectural_data() -> AnalyzeResponse:
    """Get architectural overview data for current session"""
    try:
        # Check if there's any analysis data
        if not current_session.project_info:
            return AnalyzeResponse(
                success=True,
                message="No analysis data available. Please analyze a project first.",
                data={"has_data": False},
            )

        # Focus on architectural data - modules and their relationships
        architectural_data = {
            "has_data": True,
            "project_info": {
                "name": current_session.project_info.name,
                "path": current_session.project_info.path,
                "total_files": current_session.project_info.total_files,
                "total_lines": current_session.project_info.total_lines,
            },
            "modules": [
                _serialize_code_element(element)
                for element in current_session.modules.values()
            ],
            "dependency_graph": _serialize_dependency_graph(
                current_session.dependency_graph
            ),
            "architectural_patterns": [
                {
                    "name": pattern.name,
                    "type": pattern.type.value,
                    "confidence": pattern.confidence,
                    "elements": pattern.elements,
                    "description": pattern.description,
                }
                for pattern in current_session.architectural_patterns
            ],
            "circular_dependencies": _detect_circular_dependencies(),
            "statistics": {
                "modules_count": len(current_session.modules),
                "classes_count": len(current_session.classes),
                "functions_count": len(current_session.functions),
                "patterns_count": len(current_session.architectural_patterns),
            },
        }

        logger.info(
            "Retrieved architectural data for project: %s",
            current_session.project_info.name,
        )

        return AnalyzeResponse(
            success=True,
            message="Architectural data retrieved successfully",
            data=architectural_data,
        )
    except Exception as e:
        logger.error("Failed to retrieve architectural data: %s", e)
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve architectural data: {e}"
        ) from e


def _search_element(element: CodeElement, query: str) -> Optional[Dict[str, Any]]:
    """Search for query in a single element and return match result if found"""
    # Search in name
    if query in element.name.lower():
        return {
            "element": _serialize_code_element(element),
            "match_type": "name",
            "match_text": element.name
        }

    # Search in docstring
    if element.docstring and query in element.docstring.lower():
        # Find the matching snippet
        docstring_lower = element.docstring.lower()
        start_idx = docstring_lower.find(query)
        snippet_start = max(0, start_idx - 50)
        snippet_end = min(len(element.docstring), start_idx + len(query) + 50)
        snippet = element.docstring[snippet_start:snippet_end]
        if snippet_start > 0:
            snippet = "..." + snippet
        if snippet_end < len(element.docstring):
            snippet = snippet + "..."

        return {
            "element": _serialize_code_element(element),
            "match_type": "docstring",
            "match_text": snippet
        }

    # Search in file path
    if query in element.location.file_path.lower():
        return {
            "element": _serialize_code_element(element),
            "match_type": "file_path",
            "match_text": element.location.file_path
        }

    return None


def _detect_circular_dependencies() -> List[List[str]]:
    """Detect circular dependencies in the current dependency graph"""
    if not current_session.dependency_graph:
        return []

    # Simple cycle detection using DFS
    graph: Dict[str, List[str]] = {}
    for node_id in current_session.dependency_graph.nodes:
        graph[node_id] = []

    for edge in current_session.dependency_graph.edges:
        if edge.source in graph:
            graph[edge.source].append(edge.target)

    visited = set()
    recursion_stack = set()
    cycles = []

    def dfs(node, path):
        if node in recursion_stack:
            # Found a cycle
            cycle_start = path.index(node)
            cycle = path[cycle_start:] + [node]
            cycles.append(cycle)
            return True

        if node in visited:
            return False

        visited.add(node)
        recursion_stack.add(node)
        path.append(node)

        for neighbor in graph.get(node, []):
            if dfs(neighbor, path):
                return True

        recursion_stack.remove(node)
        path.pop()
        return False

    # Check for cycles from each unvisited node
    for node in graph:
        if node not in visited:
            dfs(node, [])

    return cycles


@router.get("/search", response_model=AnalyzeResponse)
async def search_elements(q: str = "", element_type: Optional[str] = None) -> AnalyzeResponse:
    """Search code elements with optional filtering by type"""
    try:
        # Check if there's any analysis data
        if not current_session.project_info:
            return AnalyzeResponse(
                success=True,
                message="No analysis data available. Please analyze a project first.",
                data={"has_data": False, "results": []},
            )

        query = q.strip().lower()
        if not query:
            return AnalyzeResponse(
                success=True,
                message="Empty search query",
                data={
                    "has_data": True,
                    "results": [],
                    "query": query,
                    "element_type": element_type
                },
            )

        # Get all elements to search through
        all_elements = list(current_session.all_elements.values())
        # Filter by element type if specified
        if element_type:
            element_type_lower = element_type.lower()
            if element_type_lower == "module":
                all_elements = list(current_session.modules.values())
            if element_type_lower == "class":
                all_elements = list(current_session.classes.values())
            if element_type_lower == "function":
                all_elements = list(current_session.functions.values())

        # Search through elements
        results = []
        for element in all_elements:
            match_result = _search_element(element, query)
            if match_result:
                results.append(match_result)

        # Sort results by relevance (name matches first, then docstring, then file path)
        def sort_key(result):
            if result["match_type"] == "name":
                return (0, result["element"]["name"].lower())
            if result["match_type"] == "docstring":
                return (1, result["element"]["name"].lower())
            return (2, result["element"]["name"].lower())

        results.sort(key=sort_key)
        # Limit results to prevent overwhelming the UI
        max_results = 100
        if len(results) > max_results:
            results = results[:max_results]

        logger.info(
            "Search completed: query='%s', type='%s', found %d results",
            query, element_type or "all", len(results)
        )

        return AnalyzeResponse(
            success=True,
            message=f"Found {len(results)} results for '{query}'",
            data={
                "has_data": True,
                "results": results,
                "query": query,
                "element_type": element_type,
                "total_results": len(results),
                "truncated": len(results) >= max_results
            },
        )
    except Exception as e:
        logger.error("Search failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Search failed: {e}") from e


@router.get("/data", response_model=AnalyzeResponse)
async def get_analysis_data() -> AnalyzeResponse:
    """Get all analysis results for current session"""
    try:
        # Check if there's any analysis data
        if not current_session.project_info:
            return AnalyzeResponse(
                success=True,
                message="No analysis data available. Please analyze a project first.",
                data={"has_data": False},
            )
        logger.info(
            "Retrieving analysis data for project: %s", current_session.project_info.name
        )
        # Serialize all data for JSON response
        data = {
            "has_data": True,
            "project_info": {
                "name": current_session.project_info.name,
                "path": current_session.project_info.path,
                "total_files": current_session.project_info.total_files,
                "total_lines": current_session.project_info.total_lines,
                "languages": current_session.project_info.languages,
                "analysis_timestamp": current_session.project_info.analysis_timestamp.isoformat(),
            },
            "modules": [
                _serialize_code_element(element)
                for element in current_session.modules.values()
            ],
            "classes": [
                _serialize_code_element(element)
                for element in current_session.classes.values()
            ],
            "functions": [
                _serialize_code_element(element)
                for element in current_session.functions.values()
            ],
            "dependency_graph": _serialize_dependency_graph(
                current_session.dependency_graph
            ),
            "architectural_patterns": [
                {
                    "name": pattern.name,
                    "type": pattern.type.value,
                    "confidence": pattern.confidence,
                    "elements": pattern.elements,
                    "description": pattern.description,
                }
                for pattern in current_session.architectural_patterns
            ],
            "statistics": {
                "total_elements": len(current_session.all_elements),
                "modules_count": len(current_session.modules),
                "classes_count": len(current_session.classes),
                "functions_count": len(current_session.functions),
                "patterns_count": len(current_session.architectural_patterns),
            },
        }

        logger.info(
            "Retrieved analysis data for project: %s", current_session.project_info.name
        )

        return AnalyzeResponse(
            success=True, message="Analysis data retrieved successfully", data=data
        )
    except Exception as e:
        logger.error("Failed to retrieve analysis data: %s", e)
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve data: {e}"
        ) from e
