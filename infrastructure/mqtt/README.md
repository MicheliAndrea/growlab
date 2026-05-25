# MQTT

GrowLab uses EMQX as the MQTT broker. For local app development, run EMQX on
`app-01` and point local API/worker containers to `app-01:1883`.

## Start EMQX on app-01

```bash
docker compose \
  --env-file infrastructure/docker/.env.app-01-infra \
  -f infrastructure/docker/docker-compose.app-01-infra.yml \
  up -d growlab-emqx
```

The dashboard is available at:

```text
http://app-01:18083
```

On first login EMQX uses `admin` / `public` and then forces a password change.

## MQTT authentication

In EMQX Dashboard:

1. Open `Access Control` -> `Authentication`.
2. Create a `Password-Based` authenticator.
3. Use `Built-in Database` as backend.
4. Use `username` as UserID Type.
5. Create the MQTT user configured in GrowLab, normally `growlab`.

Use the same password in:

```env
GROWLAB_MQTT_USERNAME=growlab
GROWLAB_MQTT_PASSWORD=<same-password>
```

MQTT topics are documented in `docs/08_MQTT_DESIGN.md`.
