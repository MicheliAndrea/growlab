# GrowLab AI Service

FastAPI wrapper around local Ollama vision models.

Endpoints:

- `GET /health`
- `GET /models`
- `POST /analyze-plant-image`

The service validates the returned JSON and keeps AI advisory only. It does not execute commands or mutate device state.
