"""Integration tests for recommendation endpoints."""

import pytest
from fastapi import status


@pytest.mark.integration
class TestRecommendationEndpoints:
    """Test recommendation API endpoints."""

    def test_get_recommendations(self, client, sample_recommendation_request):
        """Test getting recommendations."""
        response = client.post(
            "/api/v1/recommendations/",
            json=sample_recommendation_request,
        )
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["user_id"] == sample_recommendation_request["user_id"]
        assert data["category"] == sample_recommendation_request["category"]
        assert "recommendations" in data
        assert isinstance(data["recommendations"], list)
        assert len(data["recommendations"]) <= sample_recommendation_request["limit"]
        assert "total_count" in data

    def test_get_recommendations_food_category(self, client):
        """Test getting food recommendations."""
        request_data = {
            "category": "food",
            "limit": 3,
        }
        response = client.post("/api/v1/recommendations/", json=request_data)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["category"] == "food"
        assert len(data["recommendations"]) > 0
        
        # Check recommendation structure
        recommendation = data["recommendations"][0]
        assert "id" in recommendation
        assert "name" in recommendation
        assert "category" in recommendation
        assert "score" in recommendation
        assert recommendation["category"] == "food"

    def test_get_recommendations_place_category(self, client):
        """Test getting place recommendations."""
        request_data = {
            "category": "place",
            "limit": 5,
        }
        response = client.post("/api/v1/recommendations/", json=request_data)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["category"] == "place"
        recommendations = data["recommendations"]
        assert all(r["category"] == "place" for r in recommendations)

    def test_get_recommendations_activity_category(self, client):
        """Test getting activity recommendations."""
        request_data = {
            "category": "activity",
            "limit": 10,
        }
        response = client.post("/api/v1/recommendations/", json=request_data)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["category"] == "activity"

    def test_get_categories(self, client):
        """Test getting available categories."""
        response = client.get("/api/v1/recommendations/categories")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "categories" in data
        assert isinstance(data["categories"], list)
        assert "food" in data["categories"]
        assert "place" in data["categories"]
        assert "activity" in data["categories"]

    def test_get_trending(self, client):
        """Test getting trending recommendations."""
        response = client.get("/api/v1/recommendations/trending")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "trending" in data
        assert isinstance(data["trending"], list)
        assert "updated_at" in data

    def test_get_trending_with_category_filter(self, client):
        """Test getting trending recommendations with category filter."""
        response = client.get(
            "/api/v1/recommendations/trending",
            params={"category": "food", "limit": 5},
        )
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        trending_items = data["trending"]
        assert len(trending_items) <= 5
        assert all(item["category"] == "food" for item in trending_items)

    @pytest.mark.asyncio
    async def test_get_recommendations_async(
        self, async_client, sample_recommendation_request
    ):
        """Test getting recommendations with async client."""
        response = await async_client.post(
            "/api/v1/recommendations/",
            json=sample_recommendation_request,
        )
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["user_id"] == sample_recommendation_request["user_id"]