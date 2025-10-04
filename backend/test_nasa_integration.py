import asyncio
import httpx
from backend.app.nasa_client import NASAClient

async def test_nasa_client():
    print("Testing NASA POWER API client...")
    client = NASAClient()
    
    try:
        # Test with Delhi coordinates
        data = await client.fetch_daily_power_data(
            lat=28.6, 
            lon=77.2, 
            start="20240101", 
            end="20240105"
        )
        print(f"✅ SUCCESS: Fetched {len(data)} parameters")
        for param, values in data.items():
            print(f"  {param}: {len(values)} days of data")
        
        # Test data transformation
        from backend.app.nasa_client import to_daily_series
        daily = to_daily_series(data)
        print(f"✅ SUCCESS: Transformed to {len(daily)} daily records")
        
    except Exception as e:
        print(f"❌ ERROR: {type(e).__name__}: {e}")
    finally:
        await client.close()

async def test_direct_api():
    print("\nTesting direct NASA POWER API call...")
    
    async with httpx.AsyncClient(timeout=30.0, trust_env=False) as client:
        try:
            response = await client.get(
                "https://power.larc.nasa.gov/api/temporal/daily/point",
                params={
                    "parameters": "T2M,RH2M,PRECTOT,SZA,WS2M",
                    "community": "AG",
                    "longitude": 77.2,
                    "latitude": 28.6,
                    "start": "20240101",
                    "end": "20240105",
                    "format": "JSON"
                }
            )
            print(f"✅ SUCCESS: Status {response.status_code}")
            data = response.json()
            if "properties" in data and "parameter" in data["properties"]:
                params = data["properties"]["parameter"]
                print(f"✅ SUCCESS: Got {len(params)} parameters")
            else:
                print(f"⚠️  WARNING: Unexpected response format")
                
        except Exception as e:
            print(f"❌ ERROR: {type(e).__name__}: {e}")

if __name__ == "__main__":
    asyncio.run(test_nasa_client())
    asyncio.run(test_direct_api())