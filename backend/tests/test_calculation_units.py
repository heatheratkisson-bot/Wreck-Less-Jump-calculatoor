import pytest
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_metric_calculation_converts_bike_and_rider_weight_to_pounds(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/calculate-jump",
            json={
                "ramp_height": 2,
                "ramp_angle": 30,
                "gap_distance": 15,
                "bike_weight": 100,
                "rider_weight": 75,
                "landing_height": 0,
                "unit_system": "metric",
            },
        )

    assert response.status_code == 200, response.text
    result = response.json()
    assert result["total_weight_lbs"] == pytest.approx(175 * 2.20462, abs=0.01)
    assert result["total_weight_kg"] == pytest.approx(175, abs=0.01)
