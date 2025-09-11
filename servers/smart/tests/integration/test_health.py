"""Integration tests for health endpoints."""

import pytest
from fastapi import status


@pytest.mark.integration
class TestHealthEndpoints:
    """Test health check endpoints."""

    def test_health_check(self, client):
        """Test main health check endpoint."""
        response = client.get("/api/v1/health/")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "smart-server"
        assert data["version"] == "1.0.0"
        assert "timestamp" in data

    def test_liveness_probe(self, client):
        """Test Kubernetes liveness probe."""
        response = client.get("/api/v1/health/live")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["status"] == "alive"

    def test_readiness_probe(self, client):
        """Test Kubernetes readiness probe."""
        response = client.get("/api/v1/health/ready")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["status"] == "ready"

    @pytest.mark.asyncio
    async def test_health_check_async(self, async_client):
        """Test health check with async client."""
        response = await async_client.get("/api/v1/health/")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["status"] == "healthy"