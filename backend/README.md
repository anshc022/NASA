# Fasal Seva – NASA Farm Navigator Backend

FastAPI service that delivers NASA POWER climate data enriched with AI-guided farming insights for the Space Apps 2025 challenge.

## Features

- `/` – Welcome endpoint exposing configured NASA parameters and AI provider.
- `/farm-data` – Fetches daily NASA POWER data for a location and returns:
  - raw parameter values
  - aggregated daily series for charting
  - heuristic or AI-generated farming recommendation
- Local-first LLM insights through Ollama using the Gemma 3.1B family.

## Quickstart

```powershell
# create and activate a virtual environment
python -m venv .venv
.\.venv\Scripts\activate

# install dependencies
pip install -r backend/requirements.txt

# pull the Gemma 3.1B model once (approx. 3 GB download)
ollama pull gemma:3.1b

# run FastAPI with uvicorn (uses Ollama by default)
uvicorn app.main:app --reload --app-dir backend

# optional: disable AI and fall back to heuristics only
Remove-Item Env:FASALSEVA_AI_PROVIDER
uvicorn app.main:app --reload --app-dir backend
```

> If Ollama is not running or the model is missing, the service automatically falls back to heuristic recommendations.

## Running Tests

```powershell
.\.venv\Scripts\activate
pytest backend/tests
```

## Environment Variables

| Name | Description | Default |
| --- | --- | --- |
| `FASALSEVA_NASA_BASE_URL` | Override NASA POWER endpoint | `https://power.larc.nasa.gov/api/temporal/daily/point` |
| `FASALSEVA_NASA_PARAMETERS` | Comma separated POWER parameters | `T2M,RH2M,PRECTOT,SZA,WS2M` |
| `FASALSEVA_NASA_COMMUNITY` | NASA community | `AG` |
| `FASALSEVA_AI_PROVIDER` | Set to `ollama` to enable LLM guidance; unset for heuristics only | `ollama` |
| `FASALSEVA_OLLAMA_BASE_URL` | URL to the Ollama server | `http://localhost:11434` |
| `FASALSEVA_OLLAMA_MODEL` | Ollama model tag to load | `gemma:3.1b` |

## Notes

- All outbound HTTP calls are non-blocking using `httpx.AsyncClient`.
- Ollama is preferred for on-device AI; if the service is unavailable the backend gracefully falls back to heuristics.
- AI integration is optional; heuristics always provide a baseline recommendation.
- Tests use `respx` to mock NASA POWER responses, so they run offline.
