# GrowLab Security Baseline

## MVP Boundary

- No authentication is implemented in the MVP.
- Access must be limited to LAN/VPN.
- Do not expose GrowLab services directly to the public internet.

## Network Exposure

Application compose binds public-facing ports through `GROWLAB_LAN_BIND`:

- Web: `3000`
- API: `8080`
- Worker metrics: `9091`
- MQTT: `1883`
- EMQX dashboard: `18083`

Defaults bind to `127.0.0.1`.

Redis and Ollama have no published ports.

## AI / Ollama Guardrail

Ollama is present only as a disabled future dependency:

- Compose service `growlab-ollama` is behind profile `ai`.
- No host ports are published.
- `GROWLAB_FEATURE_AI=false` by default.
- No API or frontend AI workflow is enabled in the MVP.

## CORS

Set `GROWLAB_CORS_ORIGINS` to the exact web origins allowed to call the API.

Example:

```env
GROWLAB_CORS_ORIGINS=http://app-host:3000,http://localhost:3000
```

## Secrets

- `.env` files are ignored by git.
- Use example env files only as templates.
- Do not commit real database, MQTT, EMQX or Grafana passwords.
- Backups may include `.env`; store backups as sensitive material.

## Feature Flags

Keep these disabled unless a later step explicitly changes the design:

```env
GROWLAB_FEATURE_AUTH=false
GROWLAB_FEATURE_AI=false
GROWLAB_FEATURE_IRRIGATION_MANUAL=false
GROWLAB_FEATURE_IRRIGATION_AUTOMATION=false
```

## Verification

```bash
make security-check
```

The check validates local guardrails such as ignored env files, LAN-bound ports,
Redis/Ollama non-exposure and CORS env wiring.
