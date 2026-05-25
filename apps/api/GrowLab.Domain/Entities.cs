namespace GrowLab.Domain;

public abstract class Entity
{
    public Guid Id { get; init; } = Guid.NewGuid();
}

public sealed class GrowArea : Entity
{
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class Zone : Entity
{
    public Guid? GrowAreaId { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string? Position { get; set; }
    public decimal? TargetTemperatureMin { get; set; }
    public decimal? TargetTemperatureMax { get; set; }
    public decimal? TargetHumidityMin { get; set; }
    public decimal? TargetHumidityMax { get; set; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class Plant : Entity
{
    public Guid? ZoneId { get; set; }
    public Guid? SpeciesId { get; set; }
    public string Nickname { get; set; } = "";
    public DateOnly? AcquiredAt { get; set; }
    public DateOnly? PlantedAt { get; set; }
    public PlantStatus Status { get; set; } = PlantStatus.Active;
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public enum PlantStatus
{
    Active,
    Dormant,
    Archived,
    Dead
}

public sealed class PlantFamily : Entity
{
    public string Name { get; set; } = "";
    public string? Description { get; set; }
}

public sealed class PlantCategory : Entity
{
    public string Name { get; set; } = "";
    public string? Description { get; set; }
}

public sealed class PlantSpecies : Entity
{
    public Guid? FamilyId { get; set; }
    public Guid? CategoryId { get; set; }
    public string ScientificName { get; set; } = "";
    public string? CommonName { get; set; }
    public string? Description { get; set; }
    public string? LightRequirements { get; set; }
    public string? WaterRequirements { get; set; }
    public string? HumidityRequirements { get; set; }
    public string? TemperatureRequirements { get; set; }
    public string? SubstrateNotes { get; set; }
    public string? CommonIssues { get; set; }
}

public sealed class PlantEvent : Entity
{
    public Guid PlantId { get; set; }
    public Guid? ZoneId { get; set; }
    public PlantEventType EventType { get; set; } = PlantEventType.Note;
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public string? MetadataJson { get; set; }
    public DateTimeOffset OccurredAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
}

public enum PlantEventType
{
    Note,
    ImageUploaded,
    AiAnalysisCompleted,
    Irrigation,
    LightingChange,
    SensorAlert,
    Repotting,
    Pruning,
    Treatment,
    FirmwareEvent,
    ManualObservation
}

public sealed class PlantImage : Entity
{
    public Guid PlantId { get; set; }
    public Guid? ZoneId { get; set; }
    public string FilePath { get; set; } = "";
    public string FileName { get; set; } = "";
    public string MimeType { get; set; } = "";
    public long FileSize { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    public DateTimeOffset UploadedAt { get; init; } = DateTimeOffset.UtcNow;
    public AiAnalysisStatus AnalysisStatus { get; set; } = AiAnalysisStatus.Pending;
}

public enum AiAnalysisStatus
{
    Pending,
    Completed,
    Failed
}

public sealed class AiAnalysis : Entity
{
    public Guid ImageId { get; set; }
    public Guid PlantId { get; set; }
    public string ModelName { get; set; } = "";
    public string PromptVersion { get; set; } = "plant-image-v1";
    public AiHealthStatus HealthStatus { get; set; } = AiHealthStatus.Unknown;
    public decimal Confidence { get; set; }
    public string ObservationsJson { get; set; } = "[]";
    public string SuggestionsJson { get; set; } = "[]";
    public string RawResponseJson { get; set; } = "{}";
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
}

public enum AiHealthStatus
{
    Healthy,
    Warning,
    Critical,
    Unknown
}

public sealed class Device : Entity
{
    public string DeviceUid { get; set; } = "";
    public string Name { get; set; } = "";
    public string DeviceType { get; set; } = "esp32";
    public Guid? ZoneId { get; set; }
    public string? FirmwareVersion { get; set; }
    public int ConfigVersion { get; set; } = 1;
    public DeviceStatus Status { get; set; } = DeviceStatus.Offline;
    public DateTimeOffset? LastSeenAt { get; set; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public enum DeviceStatus
{
    Online,
    Offline,
    Unknown
}

public sealed class DeviceModule : Entity
{
    public Guid DeviceId { get; set; }
    public string ModuleType { get; set; } = "";
    public bool Enabled { get; set; }
    public string ConfigJson { get; set; } = "{}";
}

public sealed class Sensor : Entity
{
    public Guid DeviceId { get; set; }
    public Guid? ZoneId { get; set; }
    public string SensorType { get; set; } = "";
    public string Name { get; set; } = "";
    public string Unit { get; set; } = "";
    public string CalibrationJson { get; set; } = "{}";
    public bool Enabled { get; set; } = true;
}

public sealed class SensorReading
{
    public DateTimeOffset Time { get; set; } = DateTimeOffset.UtcNow;
    public Guid SensorId { get; set; }
    public Guid DeviceId { get; set; }
    public Guid? ZoneId { get; set; }
    public decimal Value { get; set; }
    public string Unit { get; set; } = "";
    public string MetadataJson { get; set; } = "{}";
}

public sealed class DeviceHeartbeat
{
    public DateTimeOffset Time { get; set; } = DateTimeOffset.UtcNow;
    public Guid DeviceId { get; set; }
    public int? WifiRssi { get; set; }
    public int? FreeHeap { get; set; }
    public long? UptimeSeconds { get; set; }
    public string? FirmwareVersion { get; set; }
    public string? IpAddress { get; set; }
    public string Status { get; set; } = "online";
}

public sealed class LightingSystem : Entity
{
    public Guid ZoneId { get; set; }
    public string Name { get; set; } = "";
    public string Provider { get; set; } = "shelly_dimmer_2";
    public string DeviceHost { get; set; } = "";
    public string DeviceType { get; set; } = "shelly_dimmer_2";
    public bool Enabled { get; set; } = true;
    public string ConfigJson { get; set; } = "{}";
    public bool IsOn { get; set; }
    public int Brightness { get; set; }
}

public sealed class LightingEvent : Entity
{
    public Guid LightingSystemId { get; set; }
    public Guid ZoneId { get; set; }
    public LightingEventType EventType { get; set; }
    public int? Brightness { get; set; }
    public bool? IsOn { get; set; }
    public string Source { get; set; } = "api";
    public DateTimeOffset OccurredAt { get; set; } = DateTimeOffset.UtcNow;
    public string MetadataJson { get; set; } = "{}";
}

public enum LightingEventType
{
    On,
    Off,
    BrightnessChanged,
    SyncStatus,
    ScheduleApplied,
    ManualOverride,
    Error
}

public sealed class LightingSchedule : Entity
{
    public Guid LightingSystemId { get; set; }
    public Guid ZoneId { get; set; }
    public string Name { get; set; } = "";
    public bool Enabled { get; set; } = true;
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public int Brightness { get; set; }
    public int FadeInMinutes { get; set; }
    public int FadeOutMinutes { get; set; }
    public string DaysOfWeekJson { get; set; } = "[]";
}

public sealed class FirmwareVersion : Entity
{
    public string Version { get; set; } = "";
    public string Channel { get; set; } = "dev";
    public string FilePath { get; set; } = "";
    public string Checksum { get; set; } = "";
    public string TargetDeviceType { get; set; } = "esp32";
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
}

public sealed class OtaJob : Entity
{
    public Guid DeviceId { get; set; }
    public Guid FirmwareVersionId { get; set; }
    public OtaJobStatus Status { get; set; } = OtaJobStatus.Pending;
    public DateTimeOffset RequestedAt { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public string? ErrorMessage { get; set; }
}

public enum OtaJobStatus
{
    Pending,
    Sent,
    Downloading,
    Installing,
    Rebooting,
    Completed,
    Failed,
    Cancelled
}

public sealed class IrrigationSystem : Entity
{
    public Guid ZoneId { get; set; }
    public string Name { get; set; } = "";
    public Guid? DeviceId { get; set; }
    public bool Enabled { get; set; }
    public bool ManualControlEnabled { get; set; }
    public bool AutomationEnabled { get; set; }
    public int MaxRuntimeSeconds { get; set; } = 30;
    public int CooldownMinutes { get; set; } = 60;
    public string ConfigJson { get; set; } = "{}";
}

public sealed class IrrigationEvent : Entity
{
    public Guid IrrigationSystemId { get; set; }
    public Guid ZoneId { get; set; }
    public string EventType { get; set; } = "";
    public int? DurationSeconds { get; set; }
    public string Source { get; set; } = "api";
    public DateTimeOffset OccurredAt { get; set; } = DateTimeOffset.UtcNow;
    public string MetadataJson { get; set; } = "{}";
}

public sealed class SystemSetting : Entity
{
    public string Key { get; set; } = "";
    public string ValueJson { get; set; } = "{}";
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
