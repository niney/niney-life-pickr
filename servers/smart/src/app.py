"""FastAPI application configuration."""

from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from src.api import health, ml, recommendations
from src.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Handle application lifespan events."""
    # Startup
    print(f"""
╔════════════════════════════════════════════╗
║   Niney Life Pickr Smart Server           ║
║   Python ML/AI Backend Service             ║
╠════════════════════════════════════════════╣
║   Status: ✅ Running                       ║
║   Port: {settings.PORT}                              
║   Host: {settings.HOST}                              
║   Environment: {settings.ENVIRONMENT}                   
╚════════════════════════════════════════════╝

Server is running at http://{settings.HOST}:{settings.PORT}
API Docs: http://{settings.HOST}:{settings.PORT}/docs
Press Ctrl+C to stop
    """)
    yield
    # Shutdown
    print("\n📦 Shutting down Smart Server...")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Niney Life Pickr Smart Server - ML/AI Backend Service",
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.DOCS_ENABLED else None,
    redoc_url="/redoc" if settings.DOCS_ENABLED else None,
)

# Add middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(ml.router, prefix="/api/ml", tags=["machine-learning"])
app.include_router(
    recommendations.router, prefix="/api/recommendations", tags=["recommendations"]
)


@app.get("/", tags=["root"])
async def root() -> dict[str, Any]:
    """Root endpoint."""
    return {
        "name": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "running",
        "environment": settings.ENVIRONMENT,
        "docs": f"http://{settings.HOST}:{settings.PORT}/docs" if settings.DOCS_ENABLED else None,
    }