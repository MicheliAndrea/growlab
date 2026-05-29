# Security Policy

## Supported Scope

GrowLab is designed for LAN/VPN deployment.

The current MVP does not implement authentication and must not be exposed directly to the public internet.

## Reporting a Vulnerability

If the project is hosted on GitHub, use GitHub Security Advisories when available. Otherwise, open a private communication channel with the maintainers before publishing details.

Please include:

- affected component;
- reproduction steps;
- impact;
- suggested mitigation, if known.

## Security Boundaries

Expected deployment assumptions:

- API and web UI are reachable only from trusted LAN/VPN clients.
- Redis has no published host port.
- Ollama has no published host port and is disabled by default.
- MQTT is LAN/VPN scoped.
- CORS is restricted to configured frontend origins.
- `.env` files are not committed.

## Safety-Critical Features

The following must remain disabled until separately designed and reviewed:

- irrigation automation;
- pump control;
- AI-driven actions;
- rules engine execution;
- automatic lighting or OTA decisions based on AI output.

Current irrigation manual-run endpoints must keep returning `IRRIGATION_DISABLED`.

## Secrets

Never commit:

- real database passwords;
- MQTT passwords;
- Grafana credentials;
- private hostnames if they identify a private environment;
- backups containing `.env` files.
