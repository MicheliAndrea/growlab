namespace GrowLab.Worker.Services;

public sealed class OtaJobProcessor(ILogger<OtaJobProcessor> logger, IConfiguration configuration)
{
    public ValueTask ProcessPendingAsync(CancellationToken cancellationToken)
    {
        var otaEnabled = TryBool("GROWLAB_FEATURE_OTA_UPDATES", "Features:OtaUpdates", defaultValue: true);
        logger.LogDebug("OTA processor idle; enabled={OtaEnabled}. MQTT command publishing is pending.", otaEnabled);
        return ValueTask.CompletedTask;
    }

    private bool TryBool(string envKey, string configKey, bool defaultValue) =>
        bool.TryParse(configuration[envKey], out var envValue)
            ? envValue
            : bool.TryParse(configuration[configKey], out var configValue) ? configValue : defaultValue;
}
