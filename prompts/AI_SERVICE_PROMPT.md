# Prompt Codex — AI Service

Implementa `apps/ai-service` in Python FastAPI.

Endpoint:

- `GET /health`;
- `GET /models`;
- `POST /analyze-plant-image`.

Usa Ollama via HTTP.

Default model:

- `qwen2.5vl:7b`.

Fallback:

- `qwen2.5vl:3b`.

Output deve essere JSON validato con:

- healthStatus;
- confidence;
- observations;
- possibleIssues;
- suggestions;
- requiresHumanReview;
- rawResponse.
