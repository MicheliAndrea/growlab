using System.Net.Http.Json;
using System.Text.Json;
using GrowLab.Application;
using GrowLab.Contracts;
using GrowLab.Domain;
using Microsoft.EntityFrameworkCore;

namespace GrowLab.Infrastructure;

public sealed class EfZoneService(GrowLabDbContext db) : IZoneService
{
    public IReadOnlyList<ZoneDto> GetAll() => db.Zones.AsNoTracking().OrderBy(item => item.Name).Select(item => item.ToDto()).ToList();

    public ZoneDto? Get(Guid id) => db.Zones.AsNoTracking().FirstOrDefault(item => item.Id == id)?.ToDto();

    public ZoneDto Create(UpsertZoneRequest request)
    {
        var zone = new Zone();
        Apply(zone, request);
        db.Zones.Add(zone);
        db.SaveChanges();
        return zone.ToDto();
    }

    public ZoneDto? Update(Guid id, UpsertZoneRequest request)
    {
        var zone = db.Zones.FirstOrDefault(item => item.Id == id);
        if (zone is null)
        {
            return null;
        }

        Apply(zone, request);
        zone.UpdatedAt = DateTimeOffset.UtcNow;
        db.SaveChanges();
        return zone.ToDto();
    }

    public bool Delete(Guid id)
    {
        var zone = db.Zones.FirstOrDefault(item => item.Id == id);
        if (zone is null)
        {
            return false;
        }

        db.Zones.Remove(zone);
        db.SaveChanges();
        return true;
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
}

public sealed class EfPlantService(GrowLabDbContext db) : IPlantService
{
    public IReadOnlyList<PlantDto> GetAll() =>
        db.Plants.AsNoTracking().OrderBy(item => item.Nickname).Select(item => item.ToDto()).ToList();

    public PlantDto? Get(Guid id) => db.Plants.AsNoTracking().FirstOrDefault(item => item.Id == id)?.ToDto();

    public PlantDto Create(UpsertPlantRequest request)
    {
        var plant = new Plant();
        Apply(plant, request);
        db.Plants.Add(plant);
        db.PlantEvents.Add(new PlantEvent
        {
            PlantId = plant.Id,
            ZoneId = plant.ZoneId,
            EventType = PlantEventType.ManualObservation,
            Title = "Plant created",
            Description = "Plant record created from API."
        });
        db.SaveChanges();
        return plant.ToDto();
    }

    public PlantDto? Update(Guid id, UpsertPlantRequest request)
    {
        var plant = db.Plants.FirstOrDefault(item => item.Id == id);
        if (plant is null)
        {
            return null;
        }

        Apply(plant, request);
        plant.UpdatedAt = DateTimeOffset.UtcNow;
        db.SaveChanges();
        return plant.ToDto();
    }

    public bool Delete(Guid id)
    {
        var plant = db.Plants.FirstOrDefault(item => item.Id == id);
        if (plant is null)
        {
            return false;
        }

        db.Plants.Remove(plant);
        db.SaveChanges();
        return true;
    }

    public IReadOnlyList<PlantEventDto> GetTimeline(Guid id) =>
        db.PlantEvents.AsNoTracking()
            .Where(item => item.PlantId == id)
            .OrderByDescending(item => item.OccurredAt)
            .Select(item => item.ToDto())
            .ToList();

    public IReadOnlyList<PlantImageDto> GetImages(Guid id) =>
        db.PlantImages.AsNoTracking()
            .Where(item => item.PlantId == id)
            .OrderByDescending(item => item.UploadedAt)
            .Select(item => item.ToDto())
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
}

public sealed class EfWikiService(GrowLabDbContext db) : IWikiService
{
    public IReadOnlyList<PlantFamilyDto> GetFamilies() =>
        db.PlantFamilies.AsNoTracking().OrderBy(item => item.Name)
            .Select(item => new PlantFamilyDto(item.Id, item.Name, item.Description)).ToList();

    public IReadOnlyList<PlantCategoryDto> GetCategories() =>
        db.PlantCategories.AsNoTracking().OrderBy(item => item.Name)
            .Select(item => new PlantCategoryDto(item.Id, item.Name, item.Description)).ToList();

    public IReadOnlyList<PlantSpeciesDto> GetSpecies() =>
        db.PlantSpecies.AsNoTracking().OrderBy(item => item.ScientificName).Select(item => item.ToDto()).ToList();

    public PlantSpeciesDto CreateSpecies(UpsertSpeciesRequest request)
    {
        var species = new PlantSpecies();
        Apply(species, request);
        db.PlantSpecies.Add(species);
        db.SaveChanges();
        return species.ToDto();
    }

    public PlantSpeciesDto? UpdateSpecies(Guid id, UpsertSpeciesRequest request)
    {
        var species = db.PlantSpecies.FirstOrDefault(item => item.Id == id);
        if (species is null)
        {
            return null;
        }

        Apply(species, request);
        db.SaveChanges();
        return species.ToDto();
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
}

public sealed class EfImageService(GrowLabDbContext db, string storagePath, string aiServiceUrl) : IImageService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public PlantImageDto? Get(Guid imageId) => db.PlantImages.AsNoTracking().FirstOrDefault(item => item.Id == imageId)?.ToDto();

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
        var filePath = Path.Combine(plantDirectory, $"{image.Id:N}{extension}");

        await using (var target = File.Create(filePath))
        {
            await upload.Content.CopyToAsync(target, cancellationToken);
        }

        image.FilePath = filePath;
        db.PlantImages.Add(image);
        db.PlantEvents.Add(new PlantEvent
        {
            PlantId = upload.PlantId,
            ZoneId = upload.ZoneId,
            EventType = PlantEventType.ImageUploaded,
            Title = "Image uploaded",
            Description = image.FileName
        });
        await db.SaveChangesAsync(cancellationToken);
        return image.ToDto();
    }

    public async Task<AiAnalysisDto?> AnalyzeAsync(Guid imageId, CancellationToken cancellationToken)
    {
        var image = db.PlantImages.FirstOrDefault(item => item.Id == imageId);
        if (image is null)
        {
            return null;
        }

        var plant = image.PlantId != Guid.Empty ? db.Plants.AsNoTracking().FirstOrDefault(item => item.Id == image.PlantId) : null;
        var zone = image.ZoneId is { } zoneId ? db.Zones.AsNoTracking().FirstOrDefault(item => item.Id == zoneId) : null;
        var species = plant?.SpeciesId is { } speciesId ? db.PlantSpecies.AsNoTracking().FirstOrDefault(item => item.Id == speciesId) : null;

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
            var analysis = CreateAnalysis(image, ai, JsonSerializer.Serialize(ai, JsonOptions));
            image.AnalysisStatus = AiAnalysisStatus.Completed;
            db.AiAnalyses.Add(analysis);
            AddAnalysisEvent(image, analysis);
            await db.SaveChangesAsync(cancellationToken);
            return analysis.ToDto();
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
            db.AiAnalyses.Add(failed);
            await db.SaveChangesAsync(cancellationToken);
            return failed.ToDto();
        }
    }

    public AiAnalysisDto? GetAnalysis(Guid imageId) =>
        db.AiAnalyses.AsNoTracking()
            .Where(item => item.ImageId == imageId)
            .OrderByDescending(item => item.CreatedAt)
            .Select(item => item.ToDto())
            .FirstOrDefault();

    private void AddAnalysisEvent(PlantImage image, AiAnalysis analysis) =>
        db.PlantEvents.Add(new PlantEvent
        {
            PlantId = image.PlantId,
            ZoneId = image.ZoneId,
            EventType = PlantEventType.AiAnalysisCompleted,
            Title = $"AI analysis: {analysis.HealthStatus.ToString().ToLowerInvariant()}",
            Description = $"Confidence {analysis.Confidence:0.00}"
        });

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
            ObservationsJson = DtoMappers.ToJson(ai?.Observations ?? []),
            SuggestionsJson = DtoMappers.ToJson(ai?.Suggestions ?? []),
            RawResponseJson = response
        };
    }

    private sealed class AiServiceResponse
    {
        public string? HealthStatus { get; init; }
        public decimal Confidence { get; init; }
        public List<string> Observations { get; init; } = [];
        public List<string> Suggestions { get; init; } = [];
        public string? ModelName { get; init; }
    }
}

public sealed class EfDeviceService(GrowLabDbContext db) : IDeviceService
{
    public IReadOnlyList<DeviceDto> GetAll() => db.Devices.AsNoTracking().OrderBy(item => item.Name).Select(item => item.ToDto()).ToList();
    public DeviceDto? Get(Guid id) => db.Devices.AsNoTracking().FirstOrDefault(item => item.Id == id)?.ToDto();

    public DeviceDto Create(UpsertDeviceRequest request)
    {
        var device = new Device();
        Apply(device, request);
        db.Devices.Add(device);
        db.SaveChanges();
        return device.ToDto();
    }

    public DeviceDto? Update(Guid id, UpsertDeviceRequest request)
    {
        var device = db.Devices.FirstOrDefault(item => item.Id == id);
        if (device is null)
        {
            return null;
        }

        Apply(device, request);
        device.UpdatedAt = DateTimeOffset.UtcNow;
        db.SaveChanges();
        return device.ToDto();
    }

    public DeviceDto? GetStatus(Guid id) => Get(id);

    public IReadOnlyList<SensorReadingDto> GetTelemetry(Guid id) =>
        db.SensorReadings.AsNoTracking()
            .Where(item => item.DeviceId == id)
            .OrderByDescending(item => item.Time)
            .Take(200)
            .Select(item => new SensorReadingDto(item.Time, item.SensorId, item.DeviceId, item.ZoneId, item.Value, item.Unit))
            .ToList();

    public bool ApplyConfig(Guid id, object config)
    {
        var device = db.Devices.FirstOrDefault(item => item.Id == id);
        if (device is null)
        {
            return false;
        }

        device.ConfigVersion += 1;
        device.UpdatedAt = DateTimeOffset.UtcNow;
        db.SaveChanges();
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
}

public sealed class EfLightingService(GrowLabDbContext db) : ILightingService
{
    public IReadOnlyList<LightingSystemDto> GetByZone(Guid zoneId) =>
        db.LightingSystems.AsNoTracking().Where(item => item.ZoneId == zoneId).OrderBy(item => item.Name).Select(item => item.ToDto()).ToList();

    public async Task<LightingStateDto?> TurnOnAsync(Guid id, CancellationToken cancellationToken)
    {
        var light = db.LightingSystems.FirstOrDefault(item => item.Id == id);
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
        await db.SaveChangesAsync(cancellationToken);
        return new LightingStateDto(light.Id, light.IsOn, light.Brightness, DateTimeOffset.UtcNow);
    }

    public async Task<LightingStateDto?> TurnOffAsync(Guid id, CancellationToken cancellationToken)
    {
        var light = db.LightingSystems.FirstOrDefault(item => item.Id == id);
        if (light is null)
        {
            return null;
        }

        await TryShellyCommandAsync(light, "/light/0?turn=off", cancellationToken);
        light.IsOn = false;
        AddEvent(light, LightingEventType.Off);
        await db.SaveChangesAsync(cancellationToken);
        return new LightingStateDto(light.Id, light.IsOn, light.Brightness, DateTimeOffset.UtcNow);
    }

    public async Task<LightingStateDto?> SetBrightnessAsync(Guid id, int brightness, CancellationToken cancellationToken)
    {
        var light = db.LightingSystems.FirstOrDefault(item => item.Id == id);
        if (light is null)
        {
            return null;
        }

        var clamped = Math.Clamp(brightness, 0, 100);
        await TryShellyCommandAsync(light, $"/light/0?brightness={clamped}", cancellationToken);
        light.Brightness = clamped;
        light.IsOn = clamped > 0 || light.IsOn;
        AddEvent(light, LightingEventType.BrightnessChanged);
        await db.SaveChangesAsync(cancellationToken);
        return new LightingStateDto(light.Id, light.IsOn, light.Brightness, DateTimeOffset.UtcNow);
    }

    public IReadOnlyList<LightingEventDto> GetEvents(Guid id) =>
        db.LightingEvents.AsNoTracking()
            .Where(item => item.LightingSystemId == id)
            .OrderByDescending(item => item.OccurredAt)
            .Select(item => item.ToDto())
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
            db.LightingEvents.Add(new LightingEvent
            {
                LightingSystemId = light.Id,
                ZoneId = light.ZoneId,
                EventType = LightingEventType.Error,
                Brightness = light.Brightness,
                IsOn = light.IsOn,
                MetadataJson = DtoMappers.ToJson(new { error = ex.Message })
            });
        }
    }

    private void AddEvent(LightingSystem light, LightingEventType type) =>
        db.LightingEvents.Add(new LightingEvent
        {
            LightingSystemId = light.Id,
            ZoneId = light.ZoneId,
            EventType = type,
            Brightness = light.Brightness,
            IsOn = light.IsOn
        });
}

public sealed class EfFirmwareService(GrowLabDbContext db) : IFirmwareService
{
    public IReadOnlyList<FirmwareVersionDto> GetFirmware() =>
        db.FirmwareVersions.AsNoTracking().OrderByDescending(item => item.CreatedAt).Select(item => item.ToDto()).ToList();

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
        db.FirmwareVersions.Add(firmware);
        db.SaveChanges();
        return firmware.ToDto();
    }

    public OtaJobDto? CreateOtaJob(Guid deviceId, CreateOtaJobRequest request)
    {
        if (!db.Devices.Any(item => item.Id == deviceId) ||
            !db.FirmwareVersions.Any(item => item.Id == request.FirmwareVersionId))
        {
            return null;
        }

        var job = new OtaJob { DeviceId = deviceId, FirmwareVersionId = request.FirmwareVersionId };
        db.OtaJobs.Add(job);
        db.SaveChanges();
        return job.ToDto();
    }

    public OtaJobDto? GetOtaJob(Guid id) => db.OtaJobs.AsNoTracking().FirstOrDefault(item => item.Id == id)?.ToDto();
}

public sealed class EfIrrigationService(GrowLabDbContext db, IFeatureFlagService featureFlags) : IIrrigationService
{
    public IReadOnlyList<IrrigationSystemDto> GetByZone(Guid zoneId) =>
        db.IrrigationSystems.AsNoTracking().Where(item => item.ZoneId == zoneId).OrderBy(item => item.Name).Select(item => item.ToDto()).ToList();

    public ApiError? ValidateManualRun(Guid id, ManualIrrigationRequest request)
    {
        var system = db.IrrigationSystems.AsNoTracking().FirstOrDefault(item => item.Id == id);
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
        if (!db.IrrigationSystems.AsNoTracking().Any(item => item.Id == id))
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
}
