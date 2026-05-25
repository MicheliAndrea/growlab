namespace GrowLab.Contracts;

public sealed record ApiError(string Error, string Message);

public sealed record FeatureFlagsDto(
    bool Auth,
    bool IrrigationManualControl,
    bool IrrigationAutomation,
    bool AiSuggestions,
    bool AiCanExecuteActions,
    bool OtaUpdates,
    bool ShellyLighting,
    bool MqttDeviceProvisioning);

public sealed record ZoneDto(
    Guid Id,
    Guid? GrowAreaId,
    string Name,
    string? Description,
    string? Position,
    decimal? TargetTemperatureMin,
    decimal? TargetTemperatureMax,
    decimal? TargetHumidityMin,
    decimal? TargetHumidityMax);

public sealed record UpsertZoneRequest(
    string Name,
    string? Description,
    string? Position,
    Guid? GrowAreaId,
    decimal? TargetTemperatureMin,
    decimal? TargetTemperatureMax,
    decimal? TargetHumidityMin,
    decimal? TargetHumidityMax);

public sealed record PlantDto(
    Guid Id,
    Guid? ZoneId,
    Guid? SpeciesId,
    string Nickname,
    string Status,
    string? Notes,
    DateOnly? AcquiredAt,
    DateOnly? PlantedAt);

public sealed record UpsertPlantRequest(
    string Nickname,
    Guid? ZoneId,
    Guid? SpeciesId,
    string? Status,
    string? Notes,
    DateOnly? AcquiredAt,
    DateOnly? PlantedAt);

public sealed record PlantFamilyDto(Guid Id, string Name, string? Description);
public sealed record PlantCategoryDto(Guid Id, string Name, string? Description);

public sealed record PlantSpeciesDto(
    Guid Id,
    Guid? FamilyId,
    Guid? CategoryId,
    string ScientificName,
    string? CommonName,
    string? Description,
    string? LightRequirements,
    string? WaterRequirements,
    string? HumidityRequirements,
    string? TemperatureRequirements,
    string? SubstrateNotes,
    string? CommonIssues);

public sealed record UpsertSpeciesRequest(
    Guid? FamilyId,
    Guid? CategoryId,
    string ScientificName,
    string? CommonName,
    string? Description,
    string? LightRequirements,
    string? WaterRequirements,
    string? HumidityRequirements,
    string? TemperatureRequirements,
    string? SubstrateNotes,
    string? CommonIssues);

public sealed record PlantEventDto(
    Guid Id,
    Guid PlantId,
    Guid? ZoneId,
    string EventType,
    string Title,
    string? Description,
    DateTimeOffset OccurredAt);

public sealed record PlantImageDto(
    Guid Id,
    Guid PlantId,
    Guid? ZoneId,
    string FilePath,
    string FileName,
    string MimeType,
    long FileSize,
    string AnalysisStatus,
    DateTimeOffset UploadedAt);

public sealed record AiAnalysisDto(
    Guid Id,
    Guid ImageId,
    Guid PlantId,
    string ModelName,
    string PromptVersion,
    string HealthStatus,
    decimal Confidence,
    IReadOnlyList<string> Observations,
    IReadOnlyList<string> Suggestions,
    DateTimeOffset CreatedAt);

public sealed record DeviceDto(
    Guid Id,
    string DeviceUid,
    string Name,
    string DeviceType,
    Guid? ZoneId,
    string? FirmwareVersion,
    int ConfigVersion,
    string Status,
    DateTimeOffset? LastSeenAt);

public sealed record UpsertDeviceRequest(
    string DeviceUid,
    string Name,
    string? DeviceType,
    Guid? ZoneId,
    string? FirmwareVersion);

public sealed record SensorReadingDto(
    DateTimeOffset Time,
    Guid SensorId,
    Guid DeviceId,
    Guid? ZoneId,
    decimal Value,
    string Unit);

public sealed record LightingSystemDto(
    Guid Id,
    Guid ZoneId,
    string Name,
    string Provider,
    string DeviceHost,
    bool Enabled,
    bool IsOn,
    int Brightness);

public sealed record LightingStateDto(Guid Id, bool IsOn, int Brightness, DateTimeOffset SyncedAt);
public sealed record BrightnessRequest(int Brightness);

public sealed record LightingEventDto(
    Guid Id,
    Guid LightingSystemId,
    Guid ZoneId,
    string EventType,
    int? Brightness,
    bool? IsOn,
    string Source,
    DateTimeOffset OccurredAt);

public sealed record FirmwareVersionDto(
    Guid Id,
    string Version,
    string Channel,
    string FilePath,
    string Checksum,
    string TargetDeviceType,
    DateTimeOffset CreatedAt);

public sealed record CreateFirmwareVersionRequest(
    string Version,
    string Channel,
    string FilePath,
    string Checksum,
    string TargetDeviceType);

public sealed record OtaJobDto(
    Guid Id,
    Guid DeviceId,
    Guid FirmwareVersionId,
    string Status,
    DateTimeOffset RequestedAt,
    DateTimeOffset? StartedAt,
    DateTimeOffset? CompletedAt,
    string? ErrorMessage);

public sealed record CreateOtaJobRequest(Guid FirmwareVersionId);

public sealed record IrrigationSystemDto(
    Guid Id,
    Guid ZoneId,
    string Name,
    bool Enabled,
    bool ManualControlEnabled,
    bool AutomationEnabled,
    int MaxRuntimeSeconds,
    int CooldownMinutes);

public sealed record ManualIrrigationRequest(int DurationSeconds);

public sealed record TelemetryPayload(
    string DeviceId,
    DateTimeOffset Timestamp,
    IReadOnlyList<TelemetryReadingPayload> Readings,
    int? WifiRssi,
    long? UptimeSeconds);

public sealed record TelemetryReadingPayload(string SensorType, decimal Value, string Unit);

public sealed record HeartbeatPayload(
    string DeviceId,
    DateTimeOffset Timestamp,
    string FirmwareVersion,
    int ConfigVersion,
    int? FreeHeap,
    int? WifiRssi,
    string? IpAddress);

public sealed record CommandPayload(string CommandId, string Type, DateTimeOffset CreatedAt, object Payload);

public sealed record OtaCommandPayload(string JobId, string FirmwareVersion, string Url, string Checksum);
