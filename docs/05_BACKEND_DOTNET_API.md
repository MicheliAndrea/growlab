# 05 — Backend .NET 10 API

## Obiettivo

Definire la Web API principale di GrowLab.

## Stack

- .NET 10;
- ASP.NET Core Web API;
- EF Core;
- PostgreSQL provider;
- OpenAPI;
- FluentValidation o validazione equivalente;
- Serilog consigliato.

## Architettura consigliata

```text
apps/api/
├── GrowLab.Api
├── GrowLab.Application
├── GrowLab.Domain
├── GrowLab.Infrastructure
└── GrowLab.Contracts
```

## Responsabilità

La API deve gestire:

- CRUD piante;
- CRUD zone;
- CRUD wiki botanica;
- gestione dispositivi;
- gestione sensori;
- gestione immagini;
- analisi AI;
- controllo Shelly Dimmer 2;
- configurazioni;
- firmware;
- OTA jobs;
- feature flags;
- modulo irrigazione predisposto.

## Endpoint principali

### Health

```http
GET /health
GET /health/db
GET /health/redis
GET /health/mqtt
```

### Zones

```http
GET /api/zones
POST /api/zones
GET /api/zones/{id}
PUT /api/zones/{id}
DELETE /api/zones/{id}
```

### Plants

```http
GET /api/plants
POST /api/plants
GET /api/plants/{id}
PUT /api/plants/{id}
DELETE /api/plants/{id}
GET /api/plants/{id}/timeline
GET /api/plants/{id}/images
```

### Plant Wiki

```http
GET /api/wiki/families
GET /api/wiki/categories
GET /api/wiki/species
POST /api/wiki/species
PUT /api/wiki/species/{id}
```

### Images

```http
POST /api/plants/{plantId}/images
GET /api/images/{imageId}
POST /api/images/{imageId}/analyze
GET /api/images/{imageId}/analysis
```

### Devices

```http
GET /api/devices
POST /api/devices
GET /api/devices/{id}
PUT /api/devices/{id}
GET /api/devices/{id}/status
GET /api/devices/{id}/telemetry
POST /api/devices/{id}/config
```

### Lighting

```http
GET /api/zones/{zoneId}/lighting
POST /api/lighting/{id}/turn-on
POST /api/lighting/{id}/turn-off
POST /api/lighting/{id}/brightness
GET /api/lighting/{id}/events
POST /api/lighting/{id}/schedules
```

### Firmware / OTA

```http
GET /api/firmware
POST /api/firmware
POST /api/devices/{deviceId}/ota
GET /api/ota-jobs/{id}
```

### Irrigation

Inizialmente disabilitata.

```http
GET /api/zones/{zoneId}/irrigation
POST /api/irrigation/{id}/manual-run
POST /api/irrigation/{id}/stop
```

Questi endpoint devono controllare i feature flag e rispondere con errore controllato se disabilitati.

## Feature flags

La API deve leggere i feature flags da configurazione.

Esempio:

```json
{
  "Features": {
    "Auth": false,
    "IrrigationManualControl": false,
    "IrrigationAutomation": false,
    "AiSuggestions": true,
    "AiCanExecuteActions": false,
    "OtaUpdates": true,
    "ShellyLighting": true
  }
}
```

## Servizi applicativi

Codex deve creare servizi come:

- `PlantService`;
- `ZoneService`;
- `ImageService`;
- `AiAnalysisService`;
- `DeviceService`;
- `LightingService`;
- `ShellyDimmer2Service`;
- `FirmwareService`;
- `OtaService`;
- `IrrigationService`.

## Regole importanti

- L’API non deve salvare immagini nel DB.
- L’API non deve fidarsi dell’AI per azioni operative.
- Ogni comando fisico deve essere loggato.
- Irrigazione bloccata se feature flag disabilitato.
- Nessun endpoint pubblico esposto su internet.
