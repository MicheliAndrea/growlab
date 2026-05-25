using GrowLab.Contracts;

namespace GrowLab.Application;

public interface IZoneService
{
    IReadOnlyList<ZoneDto> GetAll();
    ZoneDto? Get(Guid id);
    ZoneDto Create(UpsertZoneRequest request);
    ZoneDto? Update(Guid id, UpsertZoneRequest request);
    bool Delete(Guid id);
}

public interface IPlantService
{
    IReadOnlyList<PlantDto> GetAll();
    PlantDto? Get(Guid id);
    PlantDto Create(UpsertPlantRequest request);
    PlantDto? Update(Guid id, UpsertPlantRequest request);
    bool Delete(Guid id);
    IReadOnlyList<PlantEventDto> GetTimeline(Guid id);
    IReadOnlyList<PlantImageDto> GetImages(Guid id);
}

public interface IWikiService
{
    IReadOnlyList<PlantFamilyDto> GetFamilies();
    IReadOnlyList<PlantCategoryDto> GetCategories();
    IReadOnlyList<PlantSpeciesDto> GetSpecies();
    PlantSpeciesDto CreateSpecies(UpsertSpeciesRequest request);
    PlantSpeciesDto? UpdateSpecies(Guid id, UpsertSpeciesRequest request);
}

public sealed record ImageUpload(
    Guid PlantId,
    Guid? ZoneId,
    string FileName,
    string MimeType,
    long FileSize,
    Stream Content);

public interface IImageService
{
    PlantImageDto? Get(Guid imageId);
    Task<PlantImageDto> SaveAsync(ImageUpload upload, CancellationToken cancellationToken);
    Task<AiAnalysisDto?> AnalyzeAsync(Guid imageId, CancellationToken cancellationToken);
    AiAnalysisDto? GetAnalysis(Guid imageId);
}

public interface IDeviceService
{
    IReadOnlyList<DeviceDto> GetAll();
    DeviceDto? Get(Guid id);
    DeviceDto Create(UpsertDeviceRequest request);
    DeviceDto? Update(Guid id, UpsertDeviceRequest request);
    DeviceDto? GetStatus(Guid id);
    IReadOnlyList<SensorReadingDto> GetTelemetry(Guid id);
    bool ApplyConfig(Guid id, object config);
}

public interface ILightingService
{
    IReadOnlyList<LightingSystemDto> GetByZone(Guid zoneId);
    Task<LightingStateDto?> TurnOnAsync(Guid id, CancellationToken cancellationToken);
    Task<LightingStateDto?> TurnOffAsync(Guid id, CancellationToken cancellationToken);
    Task<LightingStateDto?> SetBrightnessAsync(Guid id, int brightness, CancellationToken cancellationToken);
    IReadOnlyList<LightingEventDto> GetEvents(Guid id);
}

public interface IFirmwareService
{
    IReadOnlyList<FirmwareVersionDto> GetFirmware();
    FirmwareVersionDto CreateFirmware(CreateFirmwareVersionRequest request);
    OtaJobDto? CreateOtaJob(Guid deviceId, CreateOtaJobRequest request);
    OtaJobDto? GetOtaJob(Guid id);
}

public interface IIrrigationService
{
    IReadOnlyList<IrrigationSystemDto> GetByZone(Guid zoneId);
    ApiError? ValidateManualRun(Guid id, ManualIrrigationRequest request);
    ApiError? ValidateStop(Guid id);
}

public interface IFeatureFlagService
{
    FeatureFlagsDto Current { get; }
}
