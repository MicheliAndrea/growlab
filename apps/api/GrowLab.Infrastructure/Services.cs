using System.Net.Http.Json;
using System.Text.Json;
using GrowLab.Application;
using GrowLab.Contracts;
using GrowLab.Domain;

namespace GrowLab.Infrastructure;

public sealed class FeatureFlagService(FeatureFlagsDto flags) : IFeatureFlagService
{
    public FeatureFlagsDto Current { get; } = flags;
}

public sealed class ZoneService(InMemoryGrowLabStore store) : IZoneService
{
    public IReadOnlyList<ZoneDto> GetAll() => store.Zones.Select(Map).ToList();

    public ZoneDto? Get(Guid id) => store.Zones.FirstOrDefault(zone => zone.Id == id) is { } zone ? Map(zone) : null;

    public ZoneDto Create(UpsertZoneRequest request)
    {
        var zone = new Zone();
        Apply(zone, request);
        store.Zones.Add(zone);
        return Map(zone);
    }

    public ZoneDto? Update(Guid id, UpsertZoneRequest request)
    {
        var zone = store.Zones.FirstOrDefault(item => item.Id == id);
        if (zone is null)
        {
            return null;
        }

        Apply(zone, request);
        zone.UpdatedAt = DateTimeOffset.UtcNow;
        return Map(zone);
    }

    public bool Delete(Guid id)
    {
        var zone = store.Zones.FirstOrDefault(item => item.Id == id);
        return zone is not null && store.Zones.Remove(zone);
    }

    private static void Apply(Zone zone, UpsertZoneRequest request)
    {
        zone.Name = request.Name.Trim();
        zone.Description = request.Description;
        zone.Position = request.Position;
        zone.GrowAreaId = request.GrowAreaId;
        zone.TargetTemperatureMin = request.TargetTemperatureMin;
        zone.TargetTemperatureMax = request.TargetTemperatureMax;
        zone.TargetHumidityMin = request.TargetHumidityMin;
        zone.TargetHumidityMax = request.TargetHumidityMax;
    }

    private static ZoneDto Map(Zone zone) =>
        new(zone.Id, zone.GrowAreaId, zone.Name, zone.Description, zone.Position, zone.TargetTemperatureMin,
            zone.TargetTemperatureMax, zone.TargetHumidityMin, zone.TargetHumidityMax);
}

public sealed class PlantService(InMemoryGrowLabStore store) : IPlantService
{
    public IReadOnlyList<PlantDto> GetAll() => store.Plants.Select(Map).ToList();

    public PlantDto? Get(Guid id) => store.Plants.FirstOrDefault(plant => plant.Id == id) is { } plant ? Map(plant) : null;

    public PlantDto Create(UpsertPlantRequest request)
    {
        var plant = new Plant();
        Apply(plant, request);
        store.Plants.Add(plant);
        store.PlantEvents.Add(new PlantEvent
        {
            PlantId = plant.Id,
            ZoneId = plant.ZoneId,
            EventType = PlantEventType.ManualObservation,
            Title = "Plant created",
            Description = "Plant record created from API."
        });
        return Map(plant);
    }

    public PlantDto? Update(Guid id, UpsertPlantRequest request)
    {
        var plant = store.Plants.FirstOrDefault(item => item.Id == id);
        if (plant is null)
        {
            return null;
        }

        Apply(plant, request);
        plant.UpdatedAt = DateTimeOffset.UtcNow;
        return Map(plant);
    }

    public bool Delete(Guid id)
    {
        var plant = store.Plants.FirstOrDefault(item => item.Id == id);
        return plant is not null && store.Plants.Remove(plant);
    }

    public IReadOnlyList<PlantEventDto> GetTimeline(Guid id) =>
        store.PlantEvents
            .Where(item => item.PlantId == id)
            .OrderByDescending(item => item.OccurredAt)
            .Select(Map)
            .ToList();

    public IReadOnlyList<PlantImageDto> GetImages(Guid id) =>
        store.PlantImages
            .Where(item => item.PlantId == id)
            .OrderByDescending(item => item.UploadedAt)
            .Select(Map)
            .ToList();

    private static void Apply(Plant plant, UpsertPlantRequest request)
    {
        plant.Nickname = request.Nickname.Trim();
        plant.ZoneId = request.ZoneId;
        plant.SpeciesId = request.SpeciesId;
        plant.Notes = request.Notes;
        plant.AcquiredAt = request.AcquiredAt;
        plant.PlantedAt = request.PlantedAt;
        if (!string.IsNullOrWhiteSpace(request.Status) &&
            Enum.TryParse<PlantStatus>(request.Status, ignoreCase: true, out var status))
        {
            plant.Status = status;
        }
    }

    private static PlantDto Map(Plant plant) =>
        new(plant.Id, plant.ZoneId, plant.SpeciesId, plant.Nickname, plant.Status.ToString().ToLowerInvariant(),
            plant.Notes, plant.AcquiredAt, plant.PlantedAt);

    private static PlantEventDto Map(PlantEvent item) =>
        new(item.Id, item.PlantId, item.ZoneId, item.EventType.ToString().ToLowerInvariant(), item.Title,
            item.Description, item.OccurredAt);

    private static PlantImageDto Map(PlantImage image) =>
        new(image.Id, image.PlantId, image.ZoneId, image.FilePath, image.FileName, image.MimeType, image.FileSize,
            image.AnalysisStatus.ToString().ToLowerInvariant(), image.UploadedAt);
}

public sealed class WikiService(InMemoryGrowLabStore store) : IWikiService
{
    public IReadOnlyList<PlantFamilyDto> GetFamilies() =>
        store.Families.Select(item => new PlantFamilyDto(item.Id, item.Name, item.Description)).ToList();

    public IReadOnlyList<PlantCategoryDto> GetCategories() =>
        store.Categories.Select(item => new PlantCategoryDto(item.Id, item.Name, item.Description)).ToList();

    public IReadOnlyList<PlantSpeciesDto> GetSpecies() => store.Species.Select(Map).ToList();

    public PlantSpeciesDto CreateSpecies(UpsertSpeciesRequest request)
    {
        var species = new PlantSpecies();
        Apply(species, request);
        store.Species.Add(species);
        return Map(species);
    }

    public PlantSpeciesDto? UpdateSpecies(Guid id, UpsertSpeciesRequest request)
    {
        var species = store.Species.FirstOrDefault(item => item.Id == id);
        if (species is null)
        {
            return null;
        }

        Apply(species, request);
        return Map(species);
    }

    private static void Apply(PlantSpecies species, UpsertSpeciesRequest request)
    {
        species.FamilyId = request.FamilyId;
        species.CategoryId = request.CategoryId;
        species.ScientificName = request.ScientificName.Trim();
        species.CommonName = request.CommonName;
        species.Description = request.Description;
        species.LightRequirements = request.LightRequirements;
        species.WaterRequirements = request.WaterRequirements;
        species.HumidityRequirements = request.HumidityRequirements;
        species.TemperatureRequirements = request.TemperatureRequirements;
        species.SubstrateNotes = request.SubstrateNotes;
        species.CommonIssues = request.CommonIssues;
    }

    private static PlantSpeciesDto Map(PlantSpecies species) =>
        new(species.Id, species.FamilyId, species.CategoryId, species.ScientificName, species.CommonName,
            species.Description, species.LightRequirements, species.WaterRequirements, species.HumidityRequirements,
            species.TemperatureRequirements, species.SubstrateNotes, species.CommonIssues);
}

public sealed class ImageService(InMemoryGrowLabStore store, string storagePath, string aiServiceUrl) : IImageService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public PlantImageDto? Get(Guid imageId) =>
        store.PlantImages.FirstOrDefault(image => image.Id == imageId) is { } image ? Map(image) : null;

    public async Task<PlantImageDto> SaveAsync(ImageUpload upload, CancellationToken cancellationToken)
    {
        var image = new PlantImage
        {
            PlantId = upload.PlantId,
            ZoneId = upload.ZoneId,
            FileName = Path.GetFileName(upload.FileName),
            MimeType = upload.MimeType,
            FileSize = upload.FileSize
        };

        var plantDirectory = Path.Combine(storagePath, upload.PlantId.ToString("N"));
        Directory.CreateDirectory(plantDirectory);
        var extension = Path.GetExtension(image.FileName);
        var storedName = $"{image.Id:N}{extension}";
        var filePath = Path.Combine(plantDirectory, storedName);

        await using (var target = File.Create(filePath))
        {
            await upload.Content.CopyToAsync(target, cancellationToken);
        }

        image.FilePath = filePath;
        store.PlantImages.Add(image);
        store.PlantEvents.Add(new PlantEvent
        {
            PlantId = upload.PlantId,
            ZoneId = upload.ZoneId,
            EventType = PlantEventType.ImageUploaded,
            Title = "Image uploaded",
            Description = image.FileName
        });

        return Map(image);
    }

    public async Task<AiAnalysisDto?> AnalyzeAsync(Guid imageId, CancellationToken cancellationToken)
    {
        var image = store.PlantImages.FirstOrDefault(item => item.Id == imageId);
        if (image is null)
        {
            return null;
        }

        var plant = store.Plants.FirstOrDefault(item => item.Id == image.PlantId);
        var zone = image.ZoneId is { } zoneId ? store.Zones.FirstOrDefault(item => item.Id == zoneId) : null;
        var species = plant?.SpeciesId is { } speciesId ? store.Species.FirstOrDefault(item => item.Id == speciesId) : null;

        try
        {
            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(90) };
            var payload = new
            {
                imagePath = image.FilePath,
                plantContext = new
                {
                    species = species?.ScientificName,
                    zone = zone?.Name,
                    notes = plant?.Notes
                }
            };

            var response = await client.PostAsJsonAsync($"{aiServiceUrl.TrimEnd('/')}/analyze-plant-image", payload, cancellationToken);
            response.EnsureSuccessStatusCode();
            var ai = await response.Content.ReadFromJsonAsync<AiServiceResponse>(JsonOptions, cancellationToken);
            var analysis = CreateAnalysis(image, ai, response: JsonSerializer.Serialize(ai, JsonOptions));
            image.AnalysisStatus = AiAnalysisStatus.Completed;
            store.AiAnalyses.Add(analysis);
            AddAnalysisEvent(image, analysis);
            return Map(analysis);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            var failed = CreateAnalysis(image, new AiServiceResponse
            {
                HealthStatus = "unknown",
                Confidence = 0,
                Observations = ["AI service unavailable or returned invalid JSON."],
                Suggestions = ["Review the image manually and retry analysis when Ollama is healthy."]
            }, JsonSerializer.Serialize(new { error = ex.Message }, JsonOptions));
            image.AnalysisStatus = AiAnalysisStatus.Failed;
            store.AiAnalyses.Add(failed);
            return Map(failed);
        }
    }

    public AiAnalysisDto? GetAnalysis(Guid imageId) =>
        store.AiAnalyses
            .Where(item => item.ImageId == imageId)
            .OrderByDescending(item => item.CreatedAt)
            .Select(Map)
            .FirstOrDefault();

    private void AddAnalysisEvent(PlantImage image, AiAnalysis analysis)
    {
        store.PlantEvents.Add(new PlantEvent
        {
            PlantId = image.PlantId,
            ZoneId = image.ZoneId,
            EventType = PlantEventType.AiAnalysisCompleted,
            Title = $"AI analysis: {analysis.HealthStatus.ToString().ToLowerInvariant()}",
            Description = $"Confidence {analysis.Confidence:0.00}"
        });
    }

    private static AiAnalysis CreateAnalysis(PlantImage image, AiServiceResponse? ai, string response)
    {
        var healthStatus = Enum.TryParse<AiHealthStatus>(ai?.HealthStatus, ignoreCase: true, out var parsed)
            ? parsed
            : AiHealthStatus.Unknown;
        return new AiAnalysis
        {
            ImageId = image.Id,
            PlantId = image.PlantId,
            ModelName = ai?.ModelName ?? "configured-ai-service",
            HealthStatus = healthStatus,
            Confidence = ai?.Confidence ?? 0,
            ObservationsJson = JsonSerializer.Serialize(ai?.Observations ?? [], JsonOptions),
            SuggestionsJson = JsonSerializer.Serialize(ai?.Suggestions ?? [], JsonOptions),
            RawResponseJson = response
        };
    }

    private static PlantImageDto Map(PlantImage image) =>
        new(image.Id, image.PlantId, image.ZoneId, image.FilePath, image.FileName, image.MimeType, image.FileSize,
            image.AnalysisStatus.ToString().ToLowerInvariant(), image.UploadedAt);

    private static AiAnalysisDto Map(AiAnalysis item) =>
        new(item.Id, item.ImageId, item.PlantId, item.ModelName, item.PromptVersion,
            item.HealthStatus.ToString().ToLowerInvariant(), item.Confidence,
            JsonSerializer.Deserialize<IReadOnlyList<string>>(item.ObservationsJson, JsonOptions) ?? [],
            JsonSerializer.Deserialize<IReadOnlyList<string>>(item.SuggestionsJson, JsonOptions) ?? [],
            item.CreatedAt);

    private sealed class AiServiceResponse
    {
        public string? HealthStatus { get; init; }
        public decimal Confidence { get; init; }
        public List<string> Observations { get; init; } = [];
        public List<string> Suggestions { get; init; } = [];
        public string? ModelName { get; init; }
    }
}

public sealed class DeviceService(InMemoryGrowLabStore store) : IDeviceService
{
    public IReadOnlyList<DeviceDto> GetAll() => store.Devices.Select(Map).ToList();

    public DeviceDto? Get(Guid id) => store.Devices.FirstOrDefault(device => device.Id == id) is { } device ? Map(device) : null;

    public DeviceDto Create(UpsertDeviceRequest request)
    {
        var device = new Device();
        Apply(device, request);
        store.Devices.Add(device);
        return Map(device);
    }

    public DeviceDto? Update(Guid id, UpsertDeviceRequest request)
    {
        var device = store.Devices.FirstOrDefault(item => item.Id == id);
        if (device is null)
        {
            return null;
        }

        Apply(device, request);
        device.UpdatedAt = DateTimeOffset.UtcNow;
        return Map(device);
    }

    public DeviceDto? GetStatus(Guid id) => Get(id);

    public IReadOnlyList<SensorReadingDto> GetTelemetry(Guid id) =>
        store.SensorReadings
            .Where(item => item.DeviceId == id)
            .OrderByDescending(item => item.Time)
            .Take(200)
            .Select(item => new SensorReadingDto(item.Time, item.SensorId, item.DeviceId, item.ZoneId, item.Value, item.Unit))
            .ToList();

    public bool ApplyConfig(Guid id, object config)
    {
        var device = store.Devices.FirstOrDefault(item => item.Id == id);
        if (device is null)
        {
            return false;
        }

        device.ConfigVersion += 1;
        device.UpdatedAt = DateTimeOffset.UtcNow;
        return true;
    }

    private static void Apply(Device device, UpsertDeviceRequest request)
    {
        device.DeviceUid = request.DeviceUid.Trim();
        device.Name = request.Name.Trim();
        device.DeviceType = string.IsNullOrWhiteSpace(request.DeviceType) ? "esp32" : request.DeviceType.Trim();
        device.ZoneId = request.ZoneId;
        device.FirmwareVersion = request.FirmwareVersion;
    }

    private static DeviceDto Map(Device device) =>
        new(device.Id, device.DeviceUid, device.Name, device.DeviceType, device.ZoneId, device.FirmwareVersion,
            device.ConfigVersion, device.Status.ToString().ToLowerInvariant(), device.LastSeenAt);
}

public sealed class LightingService(InMemoryGrowLabStore store) : ILightingService
{
    public IReadOnlyList<LightingSystemDto> GetByZone(Guid zoneId) =>
        store.LightingSystems.Where(item => item.ZoneId == zoneId).Select(Map).ToList();

    public async Task<LightingStateDto?> TurnOnAsync(Guid id, CancellationToken cancellationToken)
    {
        var light = store.LightingSystems.FirstOrDefault(item => item.Id == id);
        if (light is null)
        {
            return null;
        }

        await TryShellyCommandAsync(light, "/light/0?turn=on", cancellationToken);
        light.IsOn = true;
        if (light.Brightness == 0)
        {
            light.Brightness = 60;
        }

        AddEvent(light, LightingEventType.On);
        return State(light);
    }

    public async Task<LightingStateDto?> TurnOffAsync(Guid id, CancellationToken cancellationToken)
    {
        var light = store.LightingSystems.FirstOrDefault(item => item.Id == id);
        if (light is null)
        {
            return null;
        }

        await TryShellyCommandAsync(light, "/light/0?turn=off", cancellationToken);
        light.IsOn = false;
        AddEvent(light, LightingEventType.Off);
        return State(light);
    }

    public async Task<LightingStateDto?> SetBrightnessAsync(Guid id, int brightness, CancellationToken cancellationToken)
    {
        var light = store.LightingSystems.FirstOrDefault(item => item.Id == id);
        if (light is null)
        {
            return null;
        }

        var clamped = Math.Clamp(brightness, 0, 100);
        await TryShellyCommandAsync(light, $"/light/0?brightness={clamped}", cancellationToken);
        light.Brightness = clamped;
        light.IsOn = clamped > 0 || light.IsOn;
        AddEvent(light, LightingEventType.BrightnessChanged);
        return State(light);
    }

    public IReadOnlyList<LightingEventDto> GetEvents(Guid id) =>
        store.LightingEvents
            .Where(item => item.LightingSystemId == id)
            .OrderByDescending(item => item.OccurredAt)
            .Select(Map)
            .ToList();

    private async Task TryShellyCommandAsync(LightingSystem light, string path, CancellationToken cancellationToken)
    {
        if (!light.Enabled || string.IsNullOrWhiteSpace(light.DeviceHost))
        {
            return;
        }

        try
        {
            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
            using var response = await client.GetAsync($"http://{light.DeviceHost}{path}", cancellationToken);
            response.EnsureSuccessStatusCode();
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            store.LightingEvents.Add(new LightingEvent
            {
                LightingSystemId = light.Id,
                ZoneId = light.ZoneId,
                EventType = LightingEventType.Error,
                Brightness = light.Brightness,
                IsOn = light.IsOn,
                MetadataJson = JsonSerializer.Serialize(new { error = ex.Message })
            });
        }
    }

    private void AddEvent(LightingSystem light, LightingEventType type) =>
        store.LightingEvents.Add(new LightingEvent
        {
            LightingSystemId = light.Id,
            ZoneId = light.ZoneId,
            EventType = type,
            Brightness = light.Brightness,
            IsOn = light.IsOn
        });

    private static LightingStateDto State(LightingSystem light) => new(light.Id, light.IsOn, light.Brightness, DateTimeOffset.UtcNow);

    private static LightingSystemDto Map(LightingSystem light) =>
        new(light.Id, light.ZoneId, light.Name, light.Provider, light.DeviceHost, light.Enabled, light.IsOn, light.Brightness);

    private static LightingEventDto Map(LightingEvent item) =>
        new(item.Id, item.LightingSystemId, item.ZoneId, item.EventType.ToString().ToLowerInvariant(), item.Brightness,
            item.IsOn, item.Source, item.OccurredAt);
}

public sealed class FirmwareService(InMemoryGrowLabStore store) : IFirmwareService
{
    public IReadOnlyList<FirmwareVersionDto> GetFirmware() =>
        store.FirmwareVersions.OrderByDescending(item => item.CreatedAt).Select(Map).ToList();

    public FirmwareVersionDto CreateFirmware(CreateFirmwareVersionRequest request)
    {
        var firmware = new FirmwareVersion
        {
            Version = request.Version,
            Channel = request.Channel,
            FilePath = request.FilePath,
            Checksum = request.Checksum,
            TargetDeviceType = request.TargetDeviceType
        };
        store.FirmwareVersions.Add(firmware);
        return Map(firmware);
    }

    public OtaJobDto? CreateOtaJob(Guid deviceId, CreateOtaJobRequest request)
    {
        if (store.Devices.All(item => item.Id != deviceId) ||
            store.FirmwareVersions.All(item => item.Id != request.FirmwareVersionId))
        {
            return null;
        }

        var job = new OtaJob { DeviceId = deviceId, FirmwareVersionId = request.FirmwareVersionId };
        store.OtaJobs.Add(job);
        return Map(job);
    }

    public OtaJobDto? GetOtaJob(Guid id) =>
        store.OtaJobs.FirstOrDefault(item => item.Id == id) is { } job ? Map(job) : null;

    private static FirmwareVersionDto Map(FirmwareVersion item) =>
        new(item.Id, item.Version, item.Channel, item.FilePath, item.Checksum, item.TargetDeviceType, item.CreatedAt);

    private static OtaJobDto Map(OtaJob item) =>
        new(item.Id, item.DeviceId, item.FirmwareVersionId, item.Status.ToString().ToLowerInvariant(), item.RequestedAt,
            item.StartedAt, item.CompletedAt, item.ErrorMessage);
}

public sealed class IrrigationService(InMemoryGrowLabStore store, IFeatureFlagService featureFlags) : IIrrigationService
{
    public IReadOnlyList<IrrigationSystemDto> GetByZone(Guid zoneId) =>
        store.IrrigationSystems.Where(item => item.ZoneId == zoneId).Select(Map).ToList();

    public ApiError? ValidateManualRun(Guid id, ManualIrrigationRequest request)
    {
        var system = store.IrrigationSystems.FirstOrDefault(item => item.Id == id);
        if (system is null)
        {
            return new ApiError("IRRIGATION_NOT_FOUND", "Irrigation system was not found.");
        }

        if (!featureFlags.Current.IrrigationManualControl || !system.ManualControlEnabled)
        {
            return Disabled();
        }

        if (request.DurationSeconds <= 0 || request.DurationSeconds > system.MaxRuntimeSeconds)
        {
            return new ApiError("IRRIGATION_INVALID_DURATION", $"Duration must be between 1 and {system.MaxRuntimeSeconds} seconds.");
        }

        return new ApiError("IRRIGATION_NOT_IMPLEMENTED", "Manual irrigation is intentionally not wired to actuators in this MVP.");
    }

    public ApiError? ValidateStop(Guid id)
    {
        if (store.IrrigationSystems.All(item => item.Id != id))
        {
            return new ApiError("IRRIGATION_NOT_FOUND", "Irrigation system was not found.");
        }

        if (!featureFlags.Current.IrrigationManualControl)
        {
            return Disabled();
        }

        return new ApiError("IRRIGATION_NOT_IMPLEMENTED", "Stop command placeholder exists, but no pump control is active in this MVP.");
    }

    private static ApiError Disabled() =>
        new("IRRIGATION_DISABLED", "Irrigation control is disabled by feature flag.");

    private static IrrigationSystemDto Map(IrrigationSystem item) =>
        new(item.Id, item.ZoneId, item.Name, item.Enabled, item.ManualControlEnabled, item.AutomationEnabled,
            item.MaxRuntimeSeconds, item.CooldownMinutes);
}
