using GrowLab.Domain;

namespace GrowLab.Infrastructure;

public sealed class InMemoryGrowLabStore
{
    public List<Zone> Zones { get; } = [];
    public List<Plant> Plants { get; } = [];
    public List<PlantFamily> Families { get; } = [];
    public List<PlantCategory> Categories { get; } = [];
    public List<PlantSpecies> Species { get; } = [];
    public List<PlantEvent> PlantEvents { get; } = [];
    public List<PlantImage> PlantImages { get; } = [];
    public List<AiAnalysis> AiAnalyses { get; } = [];
    public List<Device> Devices { get; } = [];
    public List<SensorReading> SensorReadings { get; } = [];
    public List<LightingSystem> LightingSystems { get; } = [];
    public List<LightingEvent> LightingEvents { get; } = [];
    public List<FirmwareVersion> FirmwareVersions { get; } = [];
    public List<OtaJob> OtaJobs { get; } = [];
    public List<IrrigationSystem> IrrigationSystems { get; } = [];

    public InMemoryGrowLabStore()
    {
        var growZone = new Zone
        {
            Name = "Zona A",
            Description = "Zona dimostrativa per MVP",
            Position = "shelf-a",
            TargetTemperatureMin = 20,
            TargetTemperatureMax = 26,
            TargetHumidityMin = 45,
            TargetHumidityMax = 65
        };
        Zones.Add(growZone);

        var family = new PlantFamily { Name = "Araceae", Description = "Famiglia demo per piante tropicali" };
        var category = new PlantCategory { Name = "Aroid", Description = "Categoria demo" };
        Families.Add(family);
        Categories.Add(category);

        var species = new PlantSpecies
        {
            FamilyId = family.Id,
            CategoryId = category.Id,
            ScientificName = "Monstera deliciosa",
            CommonName = "Monstera",
            LightRequirements = "Luce intensa indiretta",
            WaterRequirements = "Lasciare asciugare parzialmente il substrato",
            HumidityRequirements = "Umidita media-alta",
            TemperatureRequirements = "18-28 C",
            SubstrateNotes = "Substrato drenante",
            CommonIssues = "Ingiallimento da eccesso acqua o carenze"
        };
        Species.Add(species);

        var plant = new Plant
        {
            ZoneId = growZone.Id,
            SpeciesId = species.Id,
            Nickname = "Monstera soggiorno",
            Status = PlantStatus.Active,
            Notes = "Record demo sostituibile dai dati reali."
        };
        Plants.Add(plant);
        PlantEvents.Add(new PlantEvent
        {
            PlantId = plant.Id,
            ZoneId = growZone.Id,
            EventType = PlantEventType.ManualObservation,
            Title = "Pianta creata",
            Description = "Evento iniziale demo."
        });

        Devices.Add(new Device
        {
            DeviceUid = "esp32-zone-a-01",
            Name = "Zone A Sensor Node",
            DeviceType = "esp32",
            ZoneId = growZone.Id,
            FirmwareVersion = "0.1.0",
            Status = DeviceStatus.Offline
        });

        LightingSystems.Add(new LightingSystem
        {
            ZoneId = growZone.Id,
            Name = "Grow light Zona A",
            DeviceHost = "192.168.1.50",
            Enabled = false,
            Brightness = 0,
            IsOn = false
        });

        IrrigationSystems.Add(new IrrigationSystem
        {
            ZoneId = growZone.Id,
            Name = "Irrigazione Zona A",
            Enabled = false,
            ManualControlEnabled = false,
            AutomationEnabled = false
        });
    }
}
