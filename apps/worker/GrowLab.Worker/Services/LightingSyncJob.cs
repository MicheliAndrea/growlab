namespace GrowLab.Worker.Services;

public sealed class LightingSyncJob(ILogger<LightingSyncJob> logger, IConfiguration configuration)
{
    public ValueTask SyncAsync(CancellationToken cancellationToken)
    {
        var shellyEnabled = TryBool("GROWLAB_FEATURE_SHELLY_LIGHTING", "Features:ShellyLighting", defaultValue: true);
        logger.LogDebug("Lighting sync idle; enabled={ShellyEnabled}. Shelly polling is pending.", shellyEnabled);
        return ValueTask.CompletedTask;
    }

    private bool TryBool(string envKey, string configKey, bool defaultValue) =>
        bool.TryParse(configuration[envKey], out var envValue)
            ? envValue
            : bool.TryParse(configuration[configKey], out var configValue) ? configValue : defaultValue;
}
