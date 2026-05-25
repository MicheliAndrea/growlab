using Microsoft.Extensions.Configuration;
using Npgsql;

namespace GrowLab.Infrastructure;

public static class PostgresConnection
{
    public static string BuildConnectionString(IConfiguration configuration)
    {
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = configuration["GROWLAB_DB_HOST"] ?? "pg-01",
            Port = int.TryParse(configuration["GROWLAB_DB_PORT"], out var port) ? port : 5432,
            Database = configuration["GROWLAB_DB_NAME"] ?? "growlab",
            Username = configuration["GROWLAB_DB_USER"] ?? "growlab",
            Password = configuration["GROWLAB_DB_PASSWORD"] ?? "change-me",
            IncludeErrorDetail = string.Equals(configuration["ASPNETCORE_ENVIRONMENT"], "Development", StringComparison.OrdinalIgnoreCase),
            Pooling = true
        };

        return builder.ConnectionString;
    }
}
