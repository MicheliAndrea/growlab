using System.Text.Json;
using GrowLab.Contracts;

namespace GrowLab.Worker.Services;

public sealed class TelemetryProcessor(ILogger<TelemetryProcessor> logger)
{
    public ValueTask FlushAsync(CancellationToken cancellationToken)
    {
        logger.LogDebug("Telemetry processor idle; MQTT payload persistence is pending database wiring.");
        return ValueTask.CompletedTask;
    }

    public TelemetryPayload? TryParseTelemetry(string payload)
    {
        try
        {
            return JsonSerializer.Deserialize<TelemetryPayload>(payload, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "Invalid telemetry payload moved to dead-letter log");
            return null;
        }
    }
}
