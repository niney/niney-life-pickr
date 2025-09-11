"""Pytest configuration and fixtures."""

import asyncio
from typing import AsyncGenerator, Generator

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient

from src.app import app


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def client() -> TestClient:
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Create an async test client for the FastAPI app."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture
def mock_ml_model(mocker):
    """Mock ML model for testing."""
    mock = mocker.MagicMock()
    mock.predict.return_value = [{"result": "mocked"}]
    mock.confidence_scores = [0.95]
    return mock


@pytest.fixture
def sample_recommendation_request():
    """Sample recommendation request data."""
    return {
        "user_id": "test_user_123",
        "category": "food",
        "context": {"location": "Seoul", "time": "dinner"},
        "limit": 5,
    }


@pytest.fixture
def sample_prediction_request():
    """Sample prediction request data."""
    return {
        "data": [{"feature1": 1.0, "feature2": 2.0}],
        "model_name": "default",
        "confidence_threshold": 0.5,
    }