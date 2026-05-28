import {
  createFirmwareVersion,
  createOtaDryRun,
  createOtaJob,
  getDeviceProvisioning,
  getHealth,
  getIrrigationSafety,
  getLightingState,
  getPlant,
  getPlantTimeline,
  getZone,
  listPlantImages,
  listDeviceCapabilities,
  listDevices,
  listFirmwareChannels,
  listFirmwareVersions,
  listIrrigationSystems,
  listLightingProfiles,
  listLightingSystems,
  listLightingEvents,
  listOtaJobs,
  listPlantCategories,
  listPlantEvents,
  listPlantFamilies,
  listPlantSpecies,
  listPlants,
  listPlantTasks,
  listSystemAlerts,
  listSystemEvents,
  listZones,
  listZoneProfiles,
  type Device,
  type DeviceCapability,
  type DeviceProvisioningConfig,
  type FirmwareChannel,
  type FirmwareUploadRequest,
  type FirmwareVersion,
  type HealthResponse,
  type IrrigationSafetyStatus,
  type IrrigationSystem,
  type LightingEvent,
  type LightingProfile,
  type LightingState,
  type LightingSystem,
  type OtaDryRun,
  type OtaDryRunRequest,
  type OtaJob,
  type OtaJobCreateRequest,
  type Plant,
  type PlantCategory,
  type PlantEvent,
  type PlantFamily,
  type PlantImage,
  type PlantSpecies,
  type PlantTask,
  type PlantTimelineItem,
  type SystemAlert,
  type SystemAlertStatus,
  type SystemEvent,
  type Zone,
  type ZoneProfile,
} from "@/lib/api";

type ApiResponse<TData> = {
  data: TData;
  status: number;
};

function expectData<TData>(
  response: ApiResponse<TData>,
  okStatuses: number[] = [200],
): TData {
  if (!okStatuses.includes(response.status)) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.data;
}

export const queryKeys = {
  health: ["health"] as const,
  zones: ["zones"] as const,
  zone: (zoneId: string) => ["zones", zoneId] as const,
  zoneProfiles: (zoneId: string) => ["zones", zoneId, "profiles"] as const,
  plants: ["plants"] as const,
  plantsByZone: (zoneId: string) => ["plants", "zone", zoneId] as const,
  plant: (plantId: string) => ["plants", plantId] as const,
  plantEvents: (plantId: string) => ["plants", plantId, "events"] as const,
  plantImages: (plantId: string) => ["plants", plantId, "images"] as const,
  plantTasks: (plantId: string) => ["plants", plantId, "tasks"] as const,
  plantTimeline: (plantId: string) => ["plants", plantId, "timeline"] as const,
  plantFamilies: ["plant-wiki", "families"] as const,
  plantCategories: ["plant-wiki", "categories"] as const,
  plantSpecies: ["plant-wiki", "species"] as const,
  devices: ["devices"] as const,
  deviceCapabilities: (deviceId: string) =>
    ["devices", deviceId, "capabilities"] as const,
  deviceProvisioning: (deviceId: string) =>
    ["devices", deviceId, "provisioning"] as const,
  systemAlerts: (status?: SystemAlertStatus) =>
    ["system-alerts", status ?? "all"] as const,
  systemEvents: ["system-events"] as const,
  lightingSystems: ["lighting-systems"] as const,
  lightingState: (lightingSystemId: string) =>
    ["lighting-systems", lightingSystemId, "state"] as const,
  lightingEvents: (lightingSystemId: string) =>
    ["lighting-systems", lightingSystemId, "events"] as const,
  lightingProfiles: (zoneId?: string) =>
    ["lighting-profiles", zoneId ?? "all"] as const,
  firmwareVersions: ["firmware-versions"] as const,
  firmwareChannels: ["firmware-channels"] as const,
  otaJobs: (deviceId: string) => ["devices", deviceId, "ota"] as const,
  irrigationSystems: ["irrigation-systems"] as const,
  irrigationSafety: ["irrigation-safety"] as const,
};

export async function fetchHealth(): Promise<HealthResponse> {
  return expectData(await getHealth());
}

export async function fetchZones(): Promise<Zone[]> {
  return expectData(await listZones());
}

export async function fetchZone(id: string): Promise<Zone> {
  const response = await getZone(id);

  if (response.status !== 200) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.data;
}

export async function fetchZoneProfiles(
  zoneId: string,
): Promise<ZoneProfile[]> {
  return expectData(await listZoneProfiles(zoneId));
}

export async function fetchPlants(): Promise<Plant[]> {
  return expectData(await listPlants());
}

export async function fetchPlantsByZone(zoneId: string): Promise<Plant[]> {
  return expectData(await listPlants({ zoneId }));
}

export async function fetchPlant(id: string): Promise<Plant> {
  const response = await getPlant(id);

  if (response.status !== 200) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.data;
}

export async function fetchPlantEvents(plantId: string): Promise<PlantEvent[]> {
  return expectData(await listPlantEvents(plantId));
}

export async function fetchPlantImages(plantId: string): Promise<PlantImage[]> {
  return expectData(await listPlantImages(plantId));
}

export async function fetchPlantTasks(plantId: string): Promise<PlantTask[]> {
  return expectData(await listPlantTasks(plantId));
}

export async function fetchPlantTimeline(
  plantId: string,
): Promise<PlantTimelineItem[]> {
  return expectData(await getPlantTimeline(plantId));
}

export async function fetchDevices(): Promise<Device[]> {
  return expectData(await listDevices());
}

export async function fetchDeviceCapabilities(
  deviceId: string,
): Promise<DeviceCapability[]> {
  return expectData(await listDeviceCapabilities(deviceId));
}

export async function fetchDeviceProvisioning(
  deviceId: string,
): Promise<DeviceProvisioningConfig | null> {
  const response = await getDeviceProvisioning(deviceId);

  if (response.status === 404) {
    return null;
  }

  return response.data;
}

export async function fetchSystemAlerts(
  status?: SystemAlertStatus,
): Promise<SystemAlert[]> {
  return expectData(await listSystemAlerts(status ? { status } : undefined));
}

export async function fetchSystemEvents(): Promise<SystemEvent[]> {
  return expectData(await listSystemEvents());
}

export async function fetchLightingSystems(): Promise<LightingSystem[]> {
  return expectData(await listLightingSystems());
}

export async function fetchLightingState(id: string): Promise<LightingState> {
  const response = await getLightingState(id);

  if (response.status !== 200) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.data;
}

export async function fetchLightingEvents(
  id: string,
): Promise<LightingEvent[]> {
  return expectData(await listLightingEvents(id));
}

export async function fetchLightingProfiles(
  zoneId?: string,
): Promise<LightingProfile[]> {
  return expectData(
    await listLightingProfiles(zoneId ? { zoneId } : undefined),
  );
}

export async function fetchFirmwareVersions(): Promise<FirmwareVersion[]> {
  return expectData(await listFirmwareVersions());
}

export async function fetchFirmwareChannels(): Promise<FirmwareChannel[]> {
  return expectData(await listFirmwareChannels());
}

export async function uploadFirmwareVersion(
  request: FirmwareUploadRequest,
): Promise<FirmwareVersion> {
  const response = await createFirmwareVersion(request);
  if (response.status !== 201) {
    throw new Error(`API request failed with status ${response.status}`);
  }
  return response.data;
}

export async function fetchOtaJobs(deviceId: string): Promise<OtaJob[]> {
  return expectData(await listOtaJobs(deviceId));
}

export async function fetchIrrigationSystems(): Promise<IrrigationSystem[]> {
  return expectData(await listIrrigationSystems());
}

export async function fetchIrrigationSafety(): Promise<IrrigationSafetyStatus> {
  return expectData(await getIrrigationSafety());
}

export async function createDeviceOtaJob(
  deviceId: string,
  request: OtaJobCreateRequest,
): Promise<OtaJob> {
  const response = await createOtaJob(deviceId, request);
  if (response.status !== 202) {
    throw new Error(`API request failed with status ${response.status}`);
  }
  return response.data;
}

export async function createDeviceOtaDryRun(
  deviceId: string,
  request: OtaDryRunRequest,
): Promise<OtaDryRun> {
  const response = await createOtaDryRun(deviceId, request);
  if (response.status !== 200) {
    throw new Error(`API request failed with status ${response.status}`);
  }
  return response.data;
}

export async function fetchPlantFamilies(): Promise<PlantFamily[]> {
  return expectData(await listPlantFamilies());
}

export async function fetchPlantCategories(): Promise<PlantCategory[]> {
  return expectData(await listPlantCategories());
}

export async function fetchPlantSpecies(): Promise<PlantSpecies[]> {
  return expectData(await listPlantSpecies());
}
