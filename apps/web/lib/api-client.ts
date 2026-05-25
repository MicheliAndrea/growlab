export type Zone = {
  id: string;
  name: string;
  description?: string | null;
  position?: string | null;
};

export type Plant = {
  id: string;
  zoneId?: string | null;
  speciesId?: string | null;
  nickname: string;
  status: string;
  notes?: string | null;
};

export type Device = {
  id: string;
  deviceUid: string;
  name: string;
  deviceType: string;
  zoneId?: string | null;
  firmwareVersion?: string | null;
  status: string;
  lastSeenAt?: string | null;
};

export type LightingSystem = {
  id: string;
  zoneId: string;
  name: string;
  provider: string;
  deviceHost: string;
  enabled: boolean;
  isOn: boolean;
  brightness: number;
};

export type FeatureFlags = {
  auth: boolean;
  irrigationManualControl: boolean;
  irrigationAutomation: boolean;
  aiSuggestions: boolean;
  aiCanExecuteActions: boolean;
  otaUpdates: boolean;
  shellyLighting: boolean;
  mqttDeviceProvisioning: boolean;
};

const apiBaseUrl =
  process.env.GROWLAB_WEB_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, { cache: "no-store" });
    if (!response.ok) {
      return fallback;
    }
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export async function getHealth() {
  return fetchJson<{ service: string; status: string; features: FeatureFlags }>("/health", {
    service: "growlab-api",
    status: "offline",
    features: {
      auth: false,
      irrigationManualControl: false,
      irrigationAutomation: false,
      aiSuggestions: true,
      aiCanExecuteActions: false,
      otaUpdates: true,
      shellyLighting: true,
      mqttDeviceProvisioning: true
    }
  });
}

export async function getZones() {
  return fetchJson<Zone[]>("/api/zones", []);
}

export async function getPlants() {
  return fetchJson<Plant[]>("/api/plants", []);
}

export async function getDevices() {
  return fetchJson<Device[]>("/api/devices", []);
}

export async function getLighting(zoneId: string) {
  return fetchJson<LightingSystem[]>(`/api/zones/${zoneId}/lighting`, []);
}
