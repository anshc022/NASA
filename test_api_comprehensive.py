import asyncio
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from backend.app.main import app
from fastapi.testclient import TestClient

def test_endpoints():
    print("=== Testing Backend API Endpoints ===\n")
    
    client = TestClient(app)
    
    # Test 1: Root endpoint
    print("1. Testing root endpoint (/)")
    try:
        response = client.get("/")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        print("   ✅ PASS\n")
    except Exception as e:
        print(f"   ❌ FAIL: {e}\n")
    
    # Test 2: Farm data endpoint with valid params
    print("2. Testing farm-data endpoint with valid parameters")
    try:
        response = client.get("/farm-data", params={
            "lat": 28.6,
            "lon": 77.2,
            "start": "20240101",
            "end": "20240105"
        })
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Location: {data.get('location')}")
            print(f"   Period: {data.get('period')}")
            print(f"   Parameters: {len(data.get('parameters', {}))} parameters")
            print(f"   Daily records: {len(data.get('daily', []))} days")
            print(f"   Recommendation: {data.get('recommendation', {}).get('summary', 'N/A')}")
            print("   ✅ PASS\n")
        else:
            print(f"   Response: {response.json()}")
            print("   ❌ FAIL\n")
    except Exception as e:
        print(f"   ❌ FAIL: {e}\n")
    
    # Test 3: Farm data with invalid date range
    print("3. Testing farm-data endpoint with invalid date range")
    try:
        response = client.get("/farm-data", params={
            "lat": 28.6,
            "lon": 77.2,
            "start": "20240105",
            "end": "20240101"
        })
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        if response.status_code == 400:
            print("   ✅ PASS\n")
        else:
            print("   ❌ FAIL: Expected 400 status\n")
    except Exception as e:
        print(f"   ❌ FAIL: {e}\n")
    
    # Test 4: Farm data with invalid coordinates
    print("4. Testing farm-data endpoint with invalid coordinates")
    try:
        response = client.get("/farm-data", params={
            "lat": 100,  # Invalid latitude
            "lon": 77.2,
            "start": "20240101",
            "end": "20240105"
        })
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        if response.status_code == 422:
            print("   ✅ PASS\n")
        else:
            print("   ❌ FAIL: Expected 422 status\n")
    except Exception as e:
        print(f"   ❌ FAIL: {e}\n")

if __name__ == "__main__":
    test_endpoints()