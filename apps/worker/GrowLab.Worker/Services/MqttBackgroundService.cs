namespace GrowLab.Worker.Services;

public sealed class MqttBackgroundService(
    ILogger<MqttBackgroundService> logger,
    IConfiguration configuration,
    TelemetryProcessor telemetryProcessor,
    DeviceHeartbeatMonitor heartbeatMonitor,
    OtaJobProcessor otaJobProcessor,
    LightingSyncJob lightingSyncJob,
    AlertProcessor alertProcessor) : BackgroundService
{
    private static readonly string[] Topics =
    [
        "growlab/devices/+/telemetry",
        "growlab/devices/+/status",
        "growlab/devices/+/heartbeat",
        "growlab/devices/+/ota/status"
    ];

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("GrowLab Worker starting for MQTT host {Host}:{Port}",
            configuration["GROWLAB_MQTT_HOST"] ?? "growlab-emqx",
            configuration["GROWLAB_MQTT_PORT"] ?? "1883");

        foreach (var topic in Topics)
        {
            logger.LogInformation("MQTT subscription planned: {Topic}", topic);
        }

        logger.LogWarning("MQTT client is a placeholder in this scaffold. Add MQTTnet wiring before production telemetry ingest.");

        while (!stoppingToken.IsCancellationRequested)
        {
            await telemetryProcessor.FlushAsync(stoppingToken);
            await heartbeatMonitor.MarkOfflineDevicesAsync(stoppingToken);
            await otaJobProcessor.ProcessPendingAsync(stoppingToken);
            await lightingSyncJob.SyncAsync(stoppingToken);
            await alertProcessor.ProcessAsync(stoppingToken);
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }
}
