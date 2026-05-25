# 11 — AI Image Analysis

## Obiettivo

Analizzare immagini di piante caricate manualmente dalla web app tramite AI locale.

## Stack

- Ollama;
- modello consigliato: `qwen2.5vl:7b`;
- fallback: `qwen2.5vl:3b`;
- servizio wrapper: Python FastAPI.

## Flusso

```text
User uploads image
        |
        v
Web App
        |
        v
.NET API
        |
        v
Docker image volume
        |
        v
AI Service
        |
        v
Ollama
        |
        v
JSON result
        |
        v
Database + Plant Timeline
```

## Principi

- AI solo consultiva.
- Nessuna automazione comandata dall’AI.
- Ogni analisi deve includere confidence.
- Ogni output deve essere validato.
- Salvare raw response per debug.
- Salvare prompt version.

## Endpoint AI Service

```http
POST /analyze-plant-image
GET /health
GET /models
```

Payload:

```json
{
  "imagePath": "/data/images/plant-uuid/image.jpg",
  "plantContext": {
    "species": "Monstera deliciosa",
    "zone": "Zona A",
    "notes": "Substrato minerale"
  },
  "model": "qwen2.5vl:7b"
}
```

Risposta attesa:

```json
{
  "healthStatus": "healthy|warning|critical|unknown",
  "confidence": 0.75,
  "observations": [
    "Foglie generalmente verdi",
    "Possibile lieve ingiallimento su bordo foglia"
  ],
  "possibleIssues": [
    {
      "issue": "stress idrico",
      "confidence": 0.42
    }
  ],
  "suggestions": [
    "Verificare umidità substrato",
    "Confrontare con foto precedente"
  ],
  "requiresHumanReview": true
}
```

## Prompt AI

Il prompt deve chiedere:

- osservazioni visive;
- stato generale;
- eventuali anomalie;
- possibili cause;
- suggerimenti pratici;
- livello di confidenza;
- avvertenza se immagine non sufficiente.

## Error handling

- Timeout modello.
- Immagine troppo grande.
- Output non JSON.
- Confidence troppo bassa.
- Ollama non disponibile.

## Future improvements

- confronto tra immagini;
- segmentazione foglie;
- analisi colore con OpenCV;
- classificatore custom;
- embedding immagini;
- ricerca storico visivo.
