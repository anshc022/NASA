from contextlib import asynccontextmanager
from typing import Dict

import pytest
from fastapi.testclient import TestClient

from backend.app import ai as ai_module
from backend.app.config import get_settings
from backend.app.main import app, get_nasa_client


@pytest.fixture(autouse=True)
def disable_ai(monkeypatch):
	monkeypatch.setenv("FASALSEVA_AI_PROVIDER", "")
	get_settings.cache_clear()
	monkeypatch.setattr(ai_module.AIAdvisor, "_is_ai_enabled", lambda self: False)
	yield
	get_settings.cache_clear()


@pytest.fixture
def api_client() -> TestClient:
	return TestClient(app)


def test_root_endpoint(api_client: TestClient):
	response = api_client.get("/")
	assert response.status_code == 200
	body = response.json()
	assert "message" in body
	assert "nasa_parameters" in body


def test_farm_data_endpoint_success(api_client: TestClient):
	payload: Dict[str, Dict[str, float]] = {
		"T2M": {"20240101": 28.5, "20240102": 30.1},
		"PRECTOT": {"20240101": 1.2, "20240102": 0.5},
		"RH2M": {"20240101": 45.0, "20240102": 50.0},
		"SZA": {"20240101": 60.0},
		"WS2M": {"20240101": 3.5},
	}

	class StubClient:
		async def fetch_daily_power_data(self, *, lat, lon, start, end):
			return payload

		async def close(self):
			return None

	async def override_client():
		yield StubClient()

	app.dependency_overrides[get_nasa_client] = override_client

	response = api_client.get(
		"/farm-data",
		params={
			"lat": 28.6,
			"lon": 77.2,
			"start": "20240101",
			"end": "20240102",
		},
	)

	app.dependency_overrides.pop(get_nasa_client, None)

	assert response.status_code == 200, response.json()
	body = response.json()
	assert body["location"] == {"lat": 28.6, "lon": 77.2}
	assert body["period"] == {"start": "20240101", "end": "20240102"}
	assert body["crop_type"] is None
	assert len(body["daily"]) == 2
	assert body["recommendation"]["summary"]


def test_farm_data_invalid_date_range(api_client: TestClient):
	response = api_client.get(
		"/farm-data",
		params={
			"lat": 28.6,
			"lon": 77.2,
			"start": "20240102",
			"end": "20240101",
		},
	)
	assert response.status_code == 400
