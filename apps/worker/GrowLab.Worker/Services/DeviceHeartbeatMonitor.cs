namespace GrowLab.Worker.Services;

public sealed class DeviceHeartbeatMonitor(ILogger<DeviceHeartbeatMonitor> logger)
{
    public ValueTask MarkOfflineDevicesAsync(CancellationToken cancellationToken)
    {
        logger.LogDebug("Heartbeat monitor idle; offline detection will run after persistent device state is wired.");
        return ValueTask.CompletedTask;
    }
}
