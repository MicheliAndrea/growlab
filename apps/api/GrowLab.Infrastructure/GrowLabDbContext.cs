using System.Text;
using GrowLab.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace GrowLab.Infrastructure;

public sealed class GrowLabDbContext(DbContextOptions<GrowLabDbContext> options) : DbContext(options)
{
    public DbSet<GrowArea> GrowAreas => Set<GrowArea>();
    public DbSet<Zone> Zones => Set<Zone>();
    public DbSet<Plant> Plants => Set<Plant>();
    public DbSet<PlantFamily> PlantFamilies => Set<PlantFamily>();
    public DbSet<PlantCategory> PlantCategories => Set<PlantCategory>();
    public DbSet<PlantSpecies> PlantSpecies => Set<PlantSpecies>();
    public DbSet<PlantEvent> PlantEvents => Set<PlantEvent>();
    public DbSet<PlantImage> PlantImages => Set<PlantImage>();
    public DbSet<AiAnalysis> AiAnalyses => Set<AiAnalysis>();
    public DbSet<Device> Devices => Set<Device>();
    public DbSet<DeviceModule> DeviceModules => Set<DeviceModule>();
    public DbSet<Sensor> Sensors => Set<Sensor>();
    public DbSet<SensorReading> SensorReadings => Set<SensorReading>();
    public DbSet<DeviceHeartbeat> DeviceHeartbeats => Set<DeviceHeartbeat>();
    public DbSet<LightingSystem> LightingSystems => Set<LightingSystem>();
    public DbSet<LightingEvent> LightingEvents => Set<LightingEvent>();
    public DbSet<LightingSchedule> LightingSchedules => Set<LightingSchedule>();
    public DbSet<FirmwareVersion> FirmwareVersions => Set<FirmwareVersion>();
    public DbSet<OtaJob> OtaJobs => Set<OtaJob>();
    public DbSet<IrrigationSystem> IrrigationSystems => Set<IrrigationSystem>();
    public DbSet<IrrigationEvent> IrrigationEvents => Set<IrrigationEvent>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<GrowArea>().ToTable("grow_areas");
        modelBuilder.Entity<Zone>().ToTable("zones");
        modelBuilder.Entity<Plant>().ToTable("plants");
        modelBuilder.Entity<PlantFamily>().ToTable("plant_families");
        modelBuilder.Entity<PlantCategory>().ToTable("plant_categories");
        modelBuilder.Entity<PlantSpecies>().ToTable("plant_species");
        modelBuilder.Entity<PlantEvent>().ToTable("plant_events");
        modelBuilder.Entity<PlantImage>().ToTable("plant_images");
        modelBuilder.Entity<AiAnalysis>().ToTable("plant_ai_analyses");
        modelBuilder.Entity<Device>().ToTable("devices");
        modelBuilder.Entity<DeviceModule>().ToTable("device_modules");
        modelBuilder.Entity<Sensor>().ToTable("sensors");
        modelBuilder.Entity<SensorReading>().ToTable("sensor_readings");
        modelBuilder.Entity<DeviceHeartbeat>().ToTable("device_heartbeats");
        modelBuilder.Entity<LightingSystem>().ToTable("lighting_systems");
        modelBuilder.Entity<LightingEvent>().ToTable("lighting_events");
        modelBuilder.Entity<LightingSchedule>().ToTable("lighting_schedules");
        modelBuilder.Entity<FirmwareVersion>().ToTable("firmware_versions");
        modelBuilder.Entity<OtaJob>().ToTable("ota_jobs");
        modelBuilder.Entity<IrrigationSystem>().ToTable("irrigation_systems");
        modelBuilder.Entity<IrrigationEvent>().ToTable("irrigation_events");
        modelBuilder.Entity<SystemSetting>().ToTable("system_settings");

        modelBuilder.Entity<SensorReading>().HasKey(item => new { item.Time, item.SensorId });
        modelBuilder.Entity<DeviceHeartbeat>().HasKey(item => new { item.Time, item.DeviceId });

        modelBuilder.Entity<Plant>().Property(item => item.Status).HasConversion<string>();
        modelBuilder.Entity<PlantEvent>().Property(item => item.EventType).HasConversion<string>();
        modelBuilder.Entity<PlantImage>().Property(item => item.AnalysisStatus).HasConversion<string>();
        modelBuilder.Entity<AiAnalysis>().Property(item => item.HealthStatus).HasConversion<string>();
        modelBuilder.Entity<Device>().Property(item => item.Status).HasConversion<string>();
        modelBuilder.Entity<LightingEvent>().Property(item => item.EventType).HasConversion<string>();
        modelBuilder.Entity<OtaJob>().Property(item => item.Status).HasConversion<string>();

        modelBuilder.Entity<PlantEvent>().Property(item => item.MetadataJson).HasColumnType("jsonb");
        modelBuilder.Entity<AiAnalysis>().Property(item => item.ObservationsJson).HasColumnType("jsonb");
        modelBuilder.Entity<AiAnalysis>().Property(item => item.SuggestionsJson).HasColumnType("jsonb");
        modelBuilder.Entity<AiAnalysis>().Property(item => item.RawResponseJson).HasColumnType("jsonb");
        modelBuilder.Entity<DeviceModule>().Property(item => item.ConfigJson).HasColumnType("jsonb");
        modelBuilder.Entity<Sensor>().Property(item => item.CalibrationJson).HasColumnType("jsonb");
        modelBuilder.Entity<SensorReading>().Property(item => item.MetadataJson).HasColumnType("jsonb");
        modelBuilder.Entity<LightingSystem>().Property(item => item.ConfigJson).HasColumnType("jsonb");
        modelBuilder.Entity<LightingEvent>().Property(item => item.MetadataJson).HasColumnType("jsonb");
        modelBuilder.Entity<LightingSchedule>().Property(item => item.DaysOfWeekJson).HasColumnType("jsonb");
        modelBuilder.Entity<IrrigationSystem>().Property(item => item.ConfigJson).HasColumnType("jsonb");
        modelBuilder.Entity<IrrigationEvent>().Property(item => item.MetadataJson).HasColumnType("jsonb");
        modelBuilder.Entity<SystemSetting>().Property(item => item.ValueJson).HasColumnType("jsonb");

        modelBuilder.Entity<Device>().HasIndex(item => item.DeviceUid).IsUnique();
        modelBuilder.Entity<Plant>().HasIndex(item => item.ZoneId);
        modelBuilder.Entity<PlantEvent>().HasIndex(item => new { item.PlantId, item.OccurredAt });
        modelBuilder.Entity<PlantImage>().HasIndex(item => new { item.PlantId, item.UploadedAt });
        modelBuilder.Entity<SensorReading>().HasIndex(item => new { item.SensorId, item.Time });
        modelBuilder.Entity<SensorReading>().HasIndex(item => new { item.ZoneId, item.Time });
        modelBuilder.Entity<DeviceHeartbeat>().HasIndex(item => new { item.DeviceId, item.Time });

        ApplySnakeCaseColumnNames(modelBuilder);
    }

    private static void ApplySnakeCaseColumnNames(ModelBuilder modelBuilder)
    {
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entity.GetProperties())
            {
                property.SetColumnName(ToSnakeCase(property.Name));
            }

            foreach (var key in entity.GetKeys())
            {
                key.SetName(ToSnakeCase(key.GetName() ?? $"pk_{entity.GetTableName()}"));
            }

            foreach (var index in entity.GetIndexes())
            {
                index.SetDatabaseName(ToSnakeCase(index.GetDatabaseName() ?? $"ix_{entity.GetTableName()}"));
            }
        }
    }

    private static string ToSnakeCase(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return value;
        }

        var builder = new StringBuilder(value.Length + 8);
        for (var index = 0; index < value.Length; index++)
        {
            var current = value[index];
            if (char.IsUpper(current) && index > 0)
            {
                builder.Append('_');
            }
            builder.Append(char.ToLowerInvariant(current));
        }

        return builder.ToString();
    }
}
