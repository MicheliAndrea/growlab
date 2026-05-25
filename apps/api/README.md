# GrowLab API

.NET 10 API solution projects:

- `GrowLab.Api`: Minimal API endpoints and composition root
- `GrowLab.Application`: service interfaces
- `GrowLab.Domain`: domain entities and enums
- `GrowLab.Infrastructure`: in-memory MVP implementations and external-service boundaries

PostgreSQL persistence is implemented with EF Core/Npgsql and `GrowLabDbContext`. In local `Development`, `appsettings.Development.json` uses `Persistence=Memory` so the app can run without `pg-01`. Docker Compose sets `GROWLAB_PERSISTENCE=Postgres`.

The canonical database schema lives in `database/migrations/001_initial_schema.sql`.

Run:

```bash
dotnet run --project apps/api/GrowLab.Api/GrowLab.Api.csproj
```

Build in this sandbox with:

```bash
dotnet build apps/api/GrowLab.Api/GrowLab.Api.csproj /m:1
```

Apply the initial database schema:

```bash
GROWLAB_DB_PASSWORD=change-me ./infrastructure/scripts/apply-db-migrations.sh
```
