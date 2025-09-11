"""Integration tests for ML endpoints."""

import pytest
from fastapi import status


@pytest.mark.integration
class TestMLEndpoints:
    """Test ML API endpoints."""

    def test_predict(self, client, sample_prediction_request):
        """Test making predictions."""
        response = client.post(
            "/api/v1/ml/predict",
            json=sample_prediction_request,
        )
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "predictions" in data
        assert isinstance(data["predictions"], list)
        assert len(data["predictions"]) == len(sample_prediction_request["data"])
        assert data["model_name"] == sample_prediction_request["model_name"]
        assert "confidence_scores" in data
        assert "processing_time_ms" in data

    def test_list_models(self, client):
        """Test listing available models."""
        response = client.get("/api/v1/ml/models")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "models" in data
        assert isinstance(data["models"], list)
        assert len(data["models"]) > 0
        
        # Check model structure
        model = data["models"][0]
        assert "name" in model
        assert "version" in model
        assert "type" in model
        assert "status" in model

    def test_get_model_info(self, client):
        """Test getting specific model information."""
        response = client.get("/api/v1/ml/models/default")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["name"] == "default"
        assert "version" in data
        assert "type" in data
        assert "status" in data
        assert "metrics" in data

    def test_get_model_info_recommendation(self, client):
        """Test getting recommendation model information."""
        response = client.get("/api/v1/ml/models/recommendation")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["name"] == "recommendation"
        assert data["type"] == "recommendation"
        assert "metrics" in data
        assert "map" in data["metrics"]
        assert "ndcg" in data["metrics"]

    def test_get_nonexistent_model(self, client):
        """Test getting non-existent model returns 404."""
        response = client.get("/api/v1/ml/models/nonexistent")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        
        data = response.json()
        assert "detail" in data
        assert "nonexistent" in data["detail"]

    def test_predict_with_multiple_data_points(self, client):
        """Test prediction with multiple data points."""
        request_data = {
            "data": [
                {"feature1": 1.0, "feature2": 2.0},
                {"feature1": 3.0, "feature2": 4.0},
                {"feature1": 5.0, "feature2": 6.0},
            ],
            "model_name": "default",
            "confidence_threshold": 0.7,
        }
        response = client.post("/api/v1/ml/predict", json=request_data)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert len(data["predictions"]) == 3
        assert len(data["confidence_scores"]) == 3
        assert all(score > 0 for score in data["confidence_scores"])

    @pytest.mark.asyncio
    async def test_predict_async(self, async_client, sample_prediction_request):
        """Test making predictions with async client."""
        response = await async_client.post(
            "/api/v1/ml/predict",
            json=sample_prediction_request,
        )
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "predictions" in data
        assert data["model_name"] == sample_prediction_request["model_name"]