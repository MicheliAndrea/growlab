using GrowLab.Application;
using GrowLab.Contracts;
using GrowLab.Infrastructure;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("lan-dev", policy =>
        policy.AllowAnyHeader()
            .AllowAnyMethod()
            .WithOrigins(
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://app-01:3000"));
});

var flags = LoadFeatureFlags(builder.Configuration);
var imageStoragePath = builder.Configuration["GROWLAB_IMAGE_STORAGE_PATH"] ?? "/data/images";
var aiServiceUrl = builder.Configuration["GROWLAB_AI_SERVICE_URL"] ?? "http://growlab-ai:8000";

builder.Services.AddSingleton<IFeatureFlagService>(new FeatureFlagService(flags));

var persistenceMode = builder.Configuration["GROWLAB_PERSISTENCE"] ?? builder.Configuration["Persistence"] ?? "Postgres";
if (string.Equals(persistenceMode, "Memory", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddSingleton(new InMemoryGrowLabStore());
    builder.Services.AddSingleton<IZoneService, ZoneService>();
    builder.Services.AddSingleton<IPlantService, PlantService>();
    builder.Services.AddSingleton<IWikiService, WikiService>();
    builder.Services.AddSingleton<IDeviceService, DeviceService>();
    builder.Services.AddSingleton<ILightingService, LightingService>();
    builder.Services.AddSingleton<IFirmwareService, FirmwareService>();
    builder.Services.AddSingleton<IIrrigationService, IrrigationService>();
    builder.Services.AddSingleton<IImageService>(services =>
        new ImageService(services.GetRequiredService<InMemoryGrowLabStore>(), imageStoragePath, aiServiceUrl));
}
else
{
    builder.Services.AddDbContext<GrowLabDbContext>(options =>
        options.UseNpgsql(PostgresConnection.BuildConnectionString(builder.Configuration)));
    builder.Services.AddScoped<IZoneService, EfZoneService>();
    builder.Services.AddScoped<IPlantService, EfPlantService>();
    builder.Services.AddScoped<IWikiService, EfWikiService>();
    builder.Services.AddScoped<IDeviceService, EfDeviceService>();
    builder.Services.AddScoped<ILightingService, EfLightingService>();
    builder.Services.AddScoped<IFirmwareService, EfFirmwareService>();
    builder.Services.AddScoped<IIrrigationService, EfIrrigationService>();
    builder.Services.AddScoped<IImageService>(services =>
        new EfImageService(services.GetRequiredService<GrowLabDbContext>(), imageStoragePath, aiServiceUrl));
}

var app = builder.Build();

app.UseCors("lan-dev");

app.MapGet("/", () => Results.Redirect("/health"));

app.MapGet("/health", (IFeatureFlagService featureFlags) => Results.Ok(new
{
    service = "growlab-api",
    status = "healthy",
    utc = DateTimeOffset.UtcNow,
    features = featureFlags.Current
}));

app.MapGet("/health/db", async (IConfiguration config, IServiceProvider services, CancellationToken cancellationToken) =>
{
    var mode = config["GROWLAB_PERSISTENCE"] ?? config["Persistence"] ?? "Postgres";
    if (string.Equals(mode, "Memory", StringComparison.OrdinalIgnoreCase))
    {
        return Results.Ok(new { status = "memory", mode });
    }

    try
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GrowLabDbContext>();
        var canConnect = await db.Database.CanConnectAsync(cancellationToken);
        return Results.Ok(new
        {
            status = canConnect ? "healthy" : "unreachable",
            mode,
            host = config["GROWLAB_DB_HOST"] ?? "pg-01",
            port = config["GROWLAB_DB_PORT"] ?? "5432",
            database = config["GROWLAB_DB_NAME"] ?? "growlab"
        });
    }
    catch (Exception ex)
    {
        return Results.Json(new
        {
            status = "unhealthy",
            mode,
            host = config["GROWLAB_DB_HOST"] ?? "pg-01",
            database = config["GROWLAB_DB_NAME"] ?? "growlab",
            error = ex.Message
        }, statusCode: StatusCodes.Status503ServiceUnavailable);
    }
});

app.MapGet("/health/redis", (IConfiguration config) => Results.Ok(new
{
    status = "configured",
    connection = config["GROWLAB_REDIS_CONNECTION"] ?? "growlab-redis:6379"
}));

app.MapGet("/health/mqtt", (IConfiguration config) => Results.Ok(new
{
    status = "configured",
    host = config["GROWLAB_MQTT_HOST"] ?? "growlab-emqx",
    port = config["GROWLAB_MQTT_PORT"] ?? "1883"
}));

var api = app.MapGroup("/api");

var zones = api.MapGroup("/zones");
zones.MapGet("/", (IZoneService service) => service.GetAll());
zones.MapPost("/", (UpsertZoneRequest request, IZoneService service) =>
{
    var zone = service.Create(request);
    return Results.Created($"/api/zones/{zone.Id}", zone);
});
zones.MapGet("/{id:guid}", (Guid id, IZoneService service) => service.Get(id) is { } zone ? Results.Ok(zone) : Results.NotFound());
zones.MapPut("/{id:guid}", (Guid id, UpsertZoneRequest request, IZoneService service) => service.Update(id, request) is { } zone ? Results.Ok(zone) : Results.NotFound());
zones.MapDelete("/{id:guid}", (Guid id, IZoneService service) => service.Delete(id) ? Results.NoContent() : Results.NotFound());
zones.MapGet("/{zoneId:guid}/lighting", (Guid zoneId, ILightingService service) => service.GetByZone(zoneId));
zones.MapGet("/{zoneId:guid}/irrigation", (Guid zoneId, IIrrigationService service) => service.GetByZone(zoneId));

var plants = api.MapGroup("/plants");
plants.MapGet("/", (IPlantService service) => service.GetAll());
plants.MapPost("/", (UpsertPlantRequest request, IPlantService service) =>
{
    var plant = service.Create(request);
    return Results.Created($"/api/plants/{plant.Id}", plant);
});
plants.MapGet("/{id:guid}", (Guid id, IPlantService service) => service.Get(id) is { } plant ? Results.Ok(plant) : Results.NotFound());
plants.MapPut("/{id:guid}", (Guid id, UpsertPlantRequest request, IPlantService service) => service.Update(id, request) is { } plant ? Results.Ok(plant) : Results.NotFound());
plants.MapDelete("/{id:guid}", (Guid id, IPlantService service) => service.Delete(id) ? Results.NoContent() : Results.NotFound());
plants.MapGet("/{id:guid}/timeline", (Guid id, IPlantService service) => service.GetTimeline(id));
plants.MapGet("/{id:guid}/images", (Guid id, IPlantService service) => service.GetImages(id));
plants.MapPost("/{plantId:guid}/images", async (Guid plantId, HttpRequest request, IImageService service, CancellationToken cancellationToken) =>
{
    if (!request.HasFormContentType)
    {
        return Results.BadRequest(new ApiError("INVALID_FORM", "Use multipart/form-data with a file field."));
    }

    var form = await request.ReadFormAsync(cancellationToken);
    var file = form.Files["file"] ?? form.Files.FirstOrDefault();
    if (file is null || file.Length == 0)
    {
        return Results.BadRequest(new ApiError("IMAGE_REQUIRED", "A non-empty image file is required."));
    }

    var zoneId = Guid.TryParse(form["zoneId"], out var parsedZoneId) ? parsedZoneId : (Guid?)null;
    await using var stream = file.OpenReadStream();
    var image = await service.SaveAsync(new ImageUpload(plantId, zoneId, file.FileName, file.ContentType, file.Length, stream), cancellationToken);
    return Results.Created($"/api/images/{image.Id}", image);
}).DisableAntiforgery();

var wiki = api.MapGroup("/wiki");
wiki.MapGet("/families", (IWikiService service) => service.GetFamilies());
wiki.MapGet("/categories", (IWikiService service) => service.GetCategories());
wiki.MapGet("/species", (IWikiService service) => service.GetSpecies());
wiki.MapPost("/species", (UpsertSpeciesRequest request, IWikiService service) =>
{
    var species = service.CreateSpecies(request);
    return Results.Created($"/api/wiki/species/{species.Id}", species);
});
wiki.MapPut("/species/{id:guid}", (Guid id, UpsertSpeciesRequest request, IWikiService service) => service.UpdateSpecies(id, request) is { } species ? Results.Ok(species) : Results.NotFound());

var images = api.MapGroup("/images");
images.MapGet("/{imageId:guid}", (Guid imageId, IImageService service) => service.Get(imageId) is { } image ? Results.Ok(image) : Results.NotFound());
images.MapPost("/{imageId:guid}/analyze", async (Guid imageId, IImageService service, CancellationToken cancellationToken) =>
    await service.AnalyzeAsync(imageId, cancellationToken) is { } analysis ? Results.Ok(analysis) : Results.NotFound());
images.MapGet("/{imageId:guid}/analysis", (Guid imageId, IImageService service) => service.GetAnalysis(imageId) is { } analysis ? Results.Ok(analysis) : Results.NotFound());

var devices = api.MapGroup("/devices");
devices.MapGet("/", (IDeviceService service) => service.GetAll());
devices.MapPost("/", (UpsertDeviceRequest request, IDeviceService service) =>
{
    var device = service.Create(request);
    return Results.Created($"/api/devices/{device.Id}", device);
});
devices.MapGet("/{id:guid}", (Guid id, IDeviceService service) => service.Get(id) is { } device ? Results.Ok(device) : Results.NotFound());
devices.MapPut("/{id:guid}", (Guid id, UpsertDeviceRequest request, IDeviceService service) => service.Update(id, request) is { } device ? Results.Ok(device) : Results.NotFound());
devices.MapGet("/{id:guid}/status", (Guid id, IDeviceService service) => service.GetStatus(id) is { } device ? Results.Ok(device) : Results.NotFound());
devices.MapGet("/{id:guid}/telemetry", (Guid id, IDeviceService service) => service.GetTelemetry(id));
devices.MapPost("/{id:guid}/config", (Guid id, object config, IDeviceService service) => service.ApplyConfig(id, config) ? Results.Accepted() : Results.NotFound());
devices.MapPost("/{deviceId:guid}/ota", (Guid deviceId, CreateOtaJobRequest request, IFirmwareService service, IFeatureFlagService flagsService) =>
{
    if (!flagsService.Current.OtaUpdates)
    {
        return Results.Json(new ApiError("OTA_DISABLED", "OTA updates are disabled by feature flag."), statusCode: StatusCodes.Status423Locked);
    }

    return service.CreateOtaJob(deviceId, request) is { } job ? Results.Accepted($"/api/ota-jobs/{job.Id}", job) : Results.NotFound();
});

var lighting = api.MapGroup("/lighting");
lighting.MapPost("/{id:guid}/turn-on", async (Guid id, ILightingService service, IFeatureFlagService flagsService, CancellationToken cancellationToken) =>
{
    if (!flagsService.Current.ShellyLighting)
    {
        return Results.Json(new ApiError("LIGHTING_DISABLED", "Shelly lighting is disabled by feature flag."), statusCode: StatusCodes.Status423Locked);
    }

    return await service.TurnOnAsync(id, cancellationToken) is { } state ? Results.Ok(state) : Results.NotFound();
});
lighting.MapPost("/{id:guid}/turn-off", async (Guid id, ILightingService service, IFeatureFlagService flagsService, CancellationToken cancellationToken) =>
{
    if (!flagsService.Current.ShellyLighting)
    {
        return Results.Json(new ApiError("LIGHTING_DISABLED", "Shelly lighting is disabled by feature flag."), statusCode: StatusCodes.Status423Locked);
    }

    return await service.TurnOffAsync(id, cancellationToken) is { } state ? Results.Ok(state) : Results.NotFound();
});
lighting.MapPost("/{id:guid}/brightness", async (Guid id, BrightnessRequest request, ILightingService service, IFeatureFlagService flagsService, CancellationToken cancellationToken) =>
{
    if (!flagsService.Current.ShellyLighting)
    {
        return Results.Json(new ApiError("LIGHTING_DISABLED", "Shelly lighting is disabled by feature flag."), statusCode: StatusCodes.Status423Locked);
    }

    return await service.SetBrightnessAsync(id, request.Brightness, cancellationToken) is { } state ? Results.Ok(state) : Results.NotFound();
});
lighting.MapGet("/{id:guid}/events", (Guid id, ILightingService service) => service.GetEvents(id));
lighting.MapPost("/{id:guid}/schedules", () => Results.Accepted(null, new { status = "placeholder", message = "Lighting schedules are reserved for the Worker scheduler." }));

var firmware = api.MapGroup("/firmware");
firmware.MapGet("/", (IFirmwareService service) => service.GetFirmware());
firmware.MapPost("/", (CreateFirmwareVersionRequest request, IFirmwareService service, IFeatureFlagService flagsService) =>
{
    if (!flagsService.Current.OtaUpdates)
    {
        return Results.Json(new ApiError("OTA_DISABLED", "OTA updates are disabled by feature flag."), statusCode: StatusCodes.Status423Locked);
    }

    var item = service.CreateFirmware(request);
    return Results.Created($"/api/firmware/{item.Id}", item);
});
firmware.MapGet("/{id:guid}/download", () => Results.Json(new ApiError("FIRMWARE_DOWNLOAD_PLACEHOLDER", "Firmware file download is reserved for the OTA storage implementation."), statusCode: StatusCodes.Status501NotImplemented));

api.MapGet("/ota-jobs/{id:guid}", (Guid id, IFirmwareService service) => service.GetOtaJob(id) is { } job ? Results.Ok(job) : Results.NotFound());

var irrigation = api.MapGroup("/irrigation");
irrigation.MapPost("/{id:guid}/manual-run", (Guid id, ManualIrrigationRequest request, IIrrigationService service) =>
{
    var error = service.ValidateManualRun(id, request);
    return Results.Json(error, statusCode: error?.Error == "IRRIGATION_NOT_FOUND" ? StatusCodes.Status404NotFound : StatusCodes.Status423Locked);
});
irrigation.MapPost("/{id:guid}/stop", (Guid id, IIrrigationService service) =>
{
    var error = service.ValidateStop(id);
    return Results.Json(error, statusCode: error?.Error == "IRRIGATION_NOT_FOUND" ? StatusCodes.Status404NotFound : StatusCodes.Status423Locked);
});

app.Run();

static FeatureFlagsDto LoadFeatureFlags(IConfiguration config) =>
    new(
        Auth: Bool(config, "GROWLAB_FEATURE_AUTH", "Features:Auth", false),
        IrrigationManualControl: Bool(config, "GROWLAB_FEATURE_IRRIGATION_MANUAL", "Features:IrrigationManualControl", false),
        IrrigationAutomation: Bool(config, "GROWLAB_FEATURE_IRRIGATION_AUTOMATION", "Features:IrrigationAutomation", false),
        AiSuggestions: Bool(config, "GROWLAB_FEATURE_AI_SUGGESTIONS", "Features:AiSuggestions", true),
        AiCanExecuteActions: Bool(config, "GROWLAB_FEATURE_AI_CAN_EXECUTE_ACTIONS", "Features:AiCanExecuteActions", false),
        OtaUpdates: Bool(config, "GROWLAB_FEATURE_OTA_UPDATES", "Features:OtaUpdates", true),
        ShellyLighting: Bool(config, "GROWLAB_FEATURE_SHELLY_LIGHTING", "Features:ShellyLighting", true),
        MqttDeviceProvisioning: Bool(config, "GROWLAB_FEATURE_MQTT_DEVICE_PROVISIONING", "Features:MqttDeviceProvisioning", true));

static bool Bool(IConfiguration config, string envKey, string configKey, bool defaultValue) =>
    bool.TryParse(config[envKey], out var envValue)
        ? envValue
        : bool.TryParse(config[configKey], out var configValue) ? configValue : defaultValue;
