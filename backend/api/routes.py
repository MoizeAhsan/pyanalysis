"""
API routes for Python Code Analyzer
"""

import logging
from typing import Dict, Any, Optional
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
