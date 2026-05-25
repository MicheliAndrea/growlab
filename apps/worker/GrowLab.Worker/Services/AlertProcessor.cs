namespace GrowLab.Worker.Services;

public sealed class AlertProcessor(ILogger<AlertProcessor> logger, IConfiguration configuration)
{
    public ValueTask ProcessAsync(CancellationToken cancellationToken)
    {
        var aiCanExecute = TryBool("GROWLAB_FEATURE_AI_CAN_EXECUTE_ACTIONS", "Features:AiCanExecuteActions", defaultValue: false);
        var irrigationAutomation = TryBool("GROWLAB_FEATURE_IRRIGATION_AUTOMATION", "Features:IrrigationAutomation", defaultValue: false);

        if (aiCanExecute || irrigationAutomation)
        {
            logger.LogWarning("Unsafe automation flags should remain disabled in the MVP: aiCanExecute={AiCanExecute}, irrigationAutomation={IrrigationAutomation}",
                aiCanExecute,
                irrigationAutomation);
        }

        return ValueTask.CompletedTask;
    }

    private bool TryBool(string envKey, string configKey, bool defaultValue) =>
        bool.TryParse(configuration[envKey], out var envValue)
            ? envValue
            : bool.TryParse(configuration[configKey], out var configValue) ? configValue : defaultValue;
}
