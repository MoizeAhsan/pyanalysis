"""
API routes for Python Code Analyzer
"""

from typing import Dict, Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models import current_session

router = APIRouter()


class AnalyzeRequest(BaseModel):
    """Request model for project analysis."""

    project_path: str


class AnalyzeResponse(BaseModel):
    """Response model for API endpoints."""

    success: bool
    message: str
    data: Dict[str, Any] = {}


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_project(request: AnalyzeRequest) -> AnalyzeResponse:
    """Analyze a Python project and return results"""
    try:
        # TODO: Implement actual analysis logic
        return AnalyzeResponse(
            success=True,
            message=f"Analysis started for project: {request.project_path}",
            data={"project_path": request.project_path},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/reset", response_model=AnalyzeResponse)
async def reset_analysis() -> AnalyzeResponse:
    """Clear current analysis and reset to clean state"""
    try:
        current_session.reset()
        return AnalyzeResponse(
            success=True, message="Analysis session reset successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/data", response_model=AnalyzeResponse)
async def get_analysis_data() -> AnalyzeResponse:
    """Get all analysis results for current session"""
    try:
        data = {
            "project_info": current_session.project_info,
            "modules": list(current_session.modules.values()),
            "classes": list(current_session.classes.values()),
            "functions": list(current_session.functions.values()),
            "dependency_graph": current_session.dependency_graph,
            "architectural_patterns": current_session.architectural_patterns,
        }

        return AnalyzeResponse(
            success=True, message="Analysis data retrieved successfully", data=data
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
