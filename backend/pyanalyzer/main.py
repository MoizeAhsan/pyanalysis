"""
Python Code Analyzer - Main FastAPI Application
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from pyanalyzer.api.routes import router

app = FastAPI(
    title="Python Code Analyzer",
    description="Visual exploration tool for Python projects",
    version="1.0.0",
)

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev server
        "http://127.0.0.1:3000",  # Alternative localhost
        "http://localhost:5173",  # Vite dev server default port
        "http://127.0.0.1:5173",  # Alternative localhost for Vite
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="/api")


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint that returns API information."""
    return {"message": "Python Code Analyzer API"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
