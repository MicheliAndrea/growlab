using System.Text.Json;
using GrowLab.Contracts;
using GrowLab.Domain;

namespace GrowLab.Infrastructure;

internal static class DtoMappers
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static ZoneDto ToDto(this Zone zone) =>
        new(zone.Id, zone.GrowAreaId, zone.Name, zone.Description, zone.Position, zone.TargetTemperatureMin,
            zone.TargetTemperatureMax, zone.TargetHumidityMin, zone.TargetHumidityMax);

    public static PlantDto ToDto(this Plant plant) =>
        new(plant.Id, plant.ZoneId, plant.SpeciesId, plant.Nickname, plant.Status.ToString().ToLowerInvariant(),
            plant.Notes, plant.AcquiredAt, plant.PlantedAt);

    public static PlantEventDto ToDto(this PlantEvent item) =>
        new(item.Id, item.PlantId, item.ZoneId, item.EventType.ToString().ToLowerInvariant(), item.Title,
            item.Description, item.OccurredAt);

    public static PlantImageDto ToDto(this PlantImage image) =>
        new(image.Id, image.PlantId, image.ZoneId, image.FilePath, image.FileName, image.MimeType, image.FileSize,
            image.AnalysisStatus.ToString().ToLowerInvariant(), image.UploadedAt);

    public static PlantSpeciesDto ToDto(this PlantSpecies species) =>
        new(species.Id, species.FamilyId, species.CategoryId, species.ScientificName, species.CommonName,
            species.Description, species.LightRequirements, species.WaterRequirements, species.HumidityRequirements,
            species.TemperatureRequirements, species.SubstrateNotes, species.CommonIssues);

    public static AiAnalysisDto ToDto(this AiAnalysis item) =>
        new(item.Id, item.ImageId, item.PlantId, item.ModelName, item.PromptVersion,
            item.HealthStatus.ToString().ToLowerInvariant(), item.Confidence,
            JsonSerializer.Deserialize<IReadOnlyList<string>>(item.ObservationsJson, JsonOptions) ?? [],
            JsonSerializer.Deserialize<IReadOnlyList<string>>(item.SuggestionsJson, JsonOptions) ?? [],
            item.CreatedAt);

    public static DeviceDto ToDto(this Device device) =>
        new(device.Id, device.DeviceUid, device.Name, device.DeviceType, device.ZoneId, device.FirmwareVersion,
            device.ConfigVersion, device.Status.ToString().ToLowerInvariant(), device.LastSeenAt);

    public static LightingSystemDto ToDto(this LightingSystem light) =>
        new(light.Id, light.ZoneId, light.Name, light.Provider, light.DeviceHost, light.Enabled, light.IsOn, light.Brightness);

    public static LightingEventDto ToDto(this LightingEvent item) =>
        new(item.Id, item.LightingSystemId, item.ZoneId, item.EventType.ToString().ToLowerInvariant(), item.Brightness,
            item.IsOn, item.Source, item.OccurredAt);

    public static FirmwareVersionDto ToDto(this FirmwareVersion item) =>
        new(item.Id, item.Version, item.Channel, item.FilePath, item.Checksum, item.TargetDeviceType, item.CreatedAt);

    public static OtaJobDto ToDto(this OtaJob item) =>
        new(item.Id, item.DeviceId, item.FirmwareVersionId, item.Status.ToString().ToLowerInvariant(), item.RequestedAt,
            item.StartedAt, item.CompletedAt, item.ErrorMessage);

    public static IrrigationSystemDto ToDto(this IrrigationSystem item) =>
        new(item.Id, item.ZoneId, item.Name, item.Enabled, item.ManualControlEnabled, item.AutomationEnabled,
            item.MaxRuntimeSeconds, item.CooldownMinutes);

    public static string ToJson<T>(T value) => JsonSerializer.Serialize(value, JsonOptions);
}
