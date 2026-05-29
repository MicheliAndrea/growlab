# Architecture Decisions

## Decisioni confermate

| Area                     | Decisione                                                    |
| ------------------------ | ------------------------------------------------------------ |
| Monorepo                 | Sì                                                           |
| Backend API              | Go + Gin                                                     |
| Worker                   | Go separato                                                  |
| Frontend                 | Next.js App Router                                           |
| UI                       | shadcn/ui + TailwindCSS                                      |
| Frontend hybrid          | Server Components + Client Components; WASM solo predisposto |
| API                      | REST + OpenAPI                                               |
| Generated client         | Orval                                                        |
| Frontend package manager | pnpm                                                         |
| Database                 | PostgreSQL + TimescaleDB su db-host                          |
| DB access                | pgx + sqlc                                                   |
| Migrazioni               | goose                                                        |
| Deploy app               | app-host Docker Compose                                      |
| Monitoring               | Repo homelab separata su monitoring-host                     |
| Logs                     | Loki + Grafana Alloy                                         |
| Metrics                  | Prometheus + Grafana                                         |
| VM monitoring            | No nel primo setup                                           |
| API/Worker metrics       | Sì, endpoint /metrics                                        |
| IoT                      | EMQX + ESP32                                                 |
| Shelly                   | Shelly Dimmer 2 HTTP API locale                              |
| Storage immagini         | Volume Docker dedicato                                       |
| Auth                     | No MVP, solo LAN/VPN                                         |
| AI                       | Futura, non implementata ora                                 |
| Realtime MVP             | Polling con TanStack Query                                   |
| Notifiche MVP            | Solo web                                                     |
| Irrigazione              | Predisposta, disabilitata                                    |
