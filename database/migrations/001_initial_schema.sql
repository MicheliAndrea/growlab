CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS grow_areas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plant_families (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text
);

CREATE TABLE IF NOT EXISTS plant_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text
);

CREATE TABLE IF NOT EXISTS plant_species (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid REFERENCES plant_families(id),
    category_id uuid REFERENCES plant_categories(id),
    scientific_name text NOT NULL,
    common_name text,
    description text,
    light_requirements text,
    water_requirements text,
    humidity_requirements text,
    temperature_requirements text,
    substrate_notes text,
    common_issues text
);

CREATE TABLE IF NOT EXISTS zones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    grow_area_id uuid REFERENCES grow_areas(id),
    name text NOT NULL,
    description text,
    position text,
    target_temperature_min numeric(5,2),
    target_temperature_max numeric(5,2),
    target_humidity_min numeric(5,2),
    target_humidity_max numeric(5,2),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id uuid REFERENCES zones(id),
    species_id uuid REFERENCES plant_species(id),
    nickname text NOT NULL,
    acquired_at date,
    planted_at date,
    status text NOT NULL DEFAULT 'active',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plant_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id uuid NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    zone_id uuid REFERENCES zones(id),
    event_type text NOT NULL,
    title text NOT NULL,
    description text,
    metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plant_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id uuid NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    zone_id uuid REFERENCES zones(id),
    file_path text NOT NULL,
    file_name text NOT NULL,
    mime_type text NOT NULL,
    file_size bigint NOT NULL,
    width integer,
    height integer,
    uploaded_at timestamptz NOT NULL DEFAULT now(),
    analysis_status text NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS plant_ai_analyses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    image_id uuid NOT NULL REFERENCES plant_images(id) ON DELETE CASCADE,
    plant_id uuid NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    model_name text NOT NULL,
    prompt_version text NOT NULL,
    health_status text NOT NULL,
    confidence numeric(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    observations_json jsonb NOT NULL DEFAULT '[]'::jsonb,
    suggestions_json jsonb NOT NULL DEFAULT '[]'::jsonb,
    raw_response_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS devices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    device_uid text NOT NULL UNIQUE,
    name text NOT NULL,
    device_type text NOT NULL DEFAULT 'esp32',
    zone_id uuid REFERENCES zones(id),
    firmware_version text,
    config_version integer NOT NULL DEFAULT 1,
    status text NOT NULL DEFAULT 'offline',
    last_seen_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS device_modules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    module_type text NOT NULL,
    enabled boolean NOT NULL DEFAULT false,
    config_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS sensors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    zone_id uuid REFERENCES zones(id),
    sensor_type text NOT NULL,
    name text NOT NULL,
    unit text NOT NULL,
    calibration_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    enabled boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS sensor_readings (
    time timestamptz NOT NULL,
    sensor_id uuid NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    zone_id uuid REFERENCES zones(id),
    value numeric NOT NULL,
    unit text NOT NULL,
    metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS device_heartbeats (
    time timestamptz NOT NULL,
    device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    wifi_rssi integer,
    free_heap integer,
    uptime_seconds bigint,
    firmware_version text,
    ip_address inet,
    status text NOT NULL
);

CREATE TABLE IF NOT EXISTS lighting_systems (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    name text NOT NULL,
    provider text NOT NULL DEFAULT 'shelly_dimmer_2',
    device_host text NOT NULL,
    device_type text NOT NULL DEFAULT 'shelly_dimmer_2',
    enabled boolean NOT NULL DEFAULT true,
    is_on boolean NOT NULL DEFAULT false,
    brightness integer NOT NULL DEFAULT 0 CHECK (brightness BETWEEN 0 AND 100),
    config_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS lighting_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lighting_system_id uuid NOT NULL REFERENCES lighting_systems(id) ON DELETE CASCADE,
    zone_id uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    brightness integer CHECK (brightness BETWEEN 0 AND 100),
    is_on boolean,
    source text NOT NULL DEFAULT 'api',
    occurred_at timestamptz NOT NULL DEFAULT now(),
    metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS lighting_schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lighting_system_id uuid NOT NULL REFERENCES lighting_systems(id) ON DELETE CASCADE,
    zone_id uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    name text NOT NULL,
    enabled boolean NOT NULL DEFAULT true,
    start_time time NOT NULL,
    end_time time NOT NULL,
    brightness integer NOT NULL CHECK (brightness BETWEEN 0 AND 100),
    fade_in_minutes integer NOT NULL DEFAULT 0,
    fade_out_minutes integer NOT NULL DEFAULT 0,
    days_of_week_json jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS firmware_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    version text NOT NULL,
    channel text NOT NULL CHECK (channel IN ('dev', 'beta', 'stable')),
    file_path text NOT NULL,
    checksum text NOT NULL,
    target_device_type text NOT NULL DEFAULT 'esp32',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ota_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    firmware_version_id uuid NOT NULL REFERENCES firmware_versions(id),
    status text NOT NULL DEFAULT 'pending',
    requested_at timestamptz NOT NULL DEFAULT now(),
    started_at timestamptz,
    completed_at timestamptz,
    error_message text
);

CREATE TABLE IF NOT EXISTS irrigation_systems (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    name text NOT NULL,
    device_id uuid REFERENCES devices(id),
    enabled boolean NOT NULL DEFAULT false,
    manual_control_enabled boolean NOT NULL DEFAULT false,
    automation_enabled boolean NOT NULL DEFAULT false,
    max_runtime_seconds integer NOT NULL DEFAULT 30,
    cooldown_minutes integer NOT NULL DEFAULT 60,
    config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    CHECK (enabled = false OR max_runtime_seconds > 0)
);

CREATE TABLE IF NOT EXISTS irrigation_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    irrigation_system_id uuid NOT NULL REFERENCES irrigation_systems(id) ON DELETE CASCADE,
    zone_id uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    duration_seconds integer,
    source text NOT NULL DEFAULT 'api',
    occurred_at timestamptz NOT NULL DEFAULT now(),
    metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS system_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL UNIQUE,
    value_json jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

SELECT create_hypertable('sensor_readings', 'time', if_not_exists => TRUE);
SELECT create_hypertable('device_heartbeats', 'time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_plants_zone_id ON plants(zone_id);
CREATE INDEX IF NOT EXISTS idx_plant_events_plant_occurred ON plant_events(plant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_time ON sensor_readings(sensor_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_zone_time ON sensor_readings(zone_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_device_heartbeats_device_time ON device_heartbeats(device_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_devices_device_uid ON devices(device_uid);
CREATE INDEX IF NOT EXISTS idx_plant_images_plant_uploaded ON plant_images(plant_id, uploaded_at DESC);

INSERT INTO system_settings (key, value_json)
VALUES (
    'features',
    '{
      "auth": false,
      "irrigationManualControl": false,
      "irrigationAutomation": false,
      "aiSuggestions": true,
      "aiCanExecuteActions": false,
      "otaUpdates": true,
      "shellyLighting": true,
      "mqttDeviceProvisioning": true
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
