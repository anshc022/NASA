import asyncio
from backend.app.nasa_client import NASAClient

async def main():
    client = NASAClient()
    try:
        data = await client.fetch_daily_power_data(lat=28.6, lon=77.2, start="20240101", end="20240105")
        print("OK", list(data.keys()))
    except Exception as e:
        print("ERR", type(e).__name__, str(e))
    finally:
        await client.close()

if __name__ == "__main__":
    asyncio.run(main())
