-- +goose Up
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
-- +goose StatementEnd

CREATE TABLE grow_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT grow_areas_slug_key UNIQUE (slug),
  CONSTRAINT grow_areas_name_key UNIQUE (name)
);

CREATE TABLE zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grow_area_id uuid NOT NULL REFERENCES grow_areas(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  environment_type text NOT NULL DEFAULT 'indoor',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT zones_grow_area_slug_key UNIQUE (grow_area_id, slug)
);

CREATE TABLE plant_families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  common_name text,
  scientific_name text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plant_families_scientific_name_key UNIQUE (scientific_name)
);

CREATE TABLE plant_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plant_categories_name_key UNIQUE (name),
  CONSTRAINT plant_categories_slug_key UNIQUE (slug)
);

CREATE TABLE plant_species (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid REFERENCES plant_families(id) ON DELETE SET NULL,
  category_id uuid REFERENCES plant_categories(id) ON DELETE SET NULL,
  common_name text,
  scientific_name text NOT NULL,
  cultivar text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plant_species_scientific_cultivar_key UNIQUE (scientific_name, cultivar)
);

CREATE TABLE plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid REFERENCES zones(id) ON DELETE SET NULL,
  species_id uuid REFERENCES plant_species(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text,
  status text NOT NULL DEFAULT 'active',
  planted_at date,
  acquired_at date,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plants_code_key UNIQUE (code)
);

CREATE TABLE plant_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE plant_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  original_filename text,
  content_type text,
  size_bytes bigint CHECK (size_bytes IS NULL OR size_bytes >= 0),
  checksum_sha256 text,
  captured_at timestamptz,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid REFERENCES zones(id) ON DELETE SET NULL,
  device_uid text NOT NULL,
  name text NOT NULL,
  device_type text NOT NULL,
  status text NOT NULL DEFAULT 'provisioned',
  firmware_version text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT devices_device_uid_key UNIQUE (device_uid)
);

CREATE TABLE device_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  module_type text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT device_modules_device_key_key UNIQUE (device_id, module_key)
);

CREATE TABLE sensors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  module_id uuid REFERENCES device_modules(id) ON DELETE SET NULL,
  sensor_key text NOT NULL,
  sensor_type text NOT NULL,
  unit text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  calibration jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sensors_device_sensor_key_key UNIQUE (device_id, sensor_key)
);

CREATE TABLE sensor_readings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sensor_id uuid NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL,
  value_double double precision NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, recorded_at)
);

SELECT create_hypertable('sensor_readings', 'recorded_at', if_not_exists => TRUE);

CREATE TABLE device_heartbeats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  observed_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'online',
  ip_address inet,
  rssi_dbm integer,
  uptime_seconds bigint CHECK (uptime_seconds IS NULL OR uptime_seconds >= 0),
  firmware_version text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, observed_at)
);

SELECT create_hypertable('device_heartbeats', 'observed_at', if_not_exists => TRUE);

CREATE TABLE lighting_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid REFERENCES zones(id) ON DELETE SET NULL,
  name text NOT NULL,
  provider text NOT NULL DEFAULT 'shelly',
  endpoint_url text,
  enabled boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lighting_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lighting_system_id uuid NOT NULL REFERENCES lighting_systems(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  brightness_percent integer CHECK (brightness_percent IS NULL OR brightness_percent BETWEEN 0 AND 100),
  source text NOT NULL DEFAULT 'system',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lighting_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lighting_system_id uuid NOT NULL REFERENCES lighting_systems(id) ON DELETE CASCADE,
  name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  timezone text NOT NULL DEFAULT 'UTC',
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  brightness_percent integer NOT NULL CHECK (brightness_percent BETWEEN 0 AND 100),
  days_of_week smallint[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6,7]::smallint[],
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lighting_schedules_days_check CHECK (days_of_week <@ ARRAY[1,2,3,4,5,6,7]::smallint[])
);

CREATE TABLE firmware_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_type text NOT NULL,
  version text NOT NULL,
  storage_path text NOT NULL,
  checksum_sha256 text,
  size_bytes bigint CHECK (size_bytes IS NULL OR size_bytes >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT firmware_versions_device_type_version_key UNIQUE (device_type, version)
);

CREATE TABLE ota_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  firmware_version_id uuid NOT NULL REFERENCES firmware_versions(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE irrigation_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid REFERENCES zones(id) ON DELETE SET NULL,
  name text NOT NULL,
  provider text,
  enabled boolean NOT NULL DEFAULT false,
  automation_enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE irrigation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  irrigation_system_id uuid NOT NULL REFERENCES irrigation_systems(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  duration_seconds integer CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  volume_ml numeric CHECK (volume_ml IS NULL OR volume_ml >= 0),
  source text NOT NULL DEFAULT 'system',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL,
  source text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  raised_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX zones_grow_area_id_idx ON zones(grow_area_id);
CREATE INDEX plant_species_family_id_idx ON plant_species(family_id);
CREATE INDEX plant_species_category_id_idx ON plant_species(category_id);
CREATE INDEX plants_zone_id_idx ON plants(zone_id);
CREATE INDEX plants_species_id_idx ON plants(species_id);
CREATE INDEX plant_events_plant_occurred_idx ON plant_events(plant_id, occurred_at DESC);
CREATE INDEX plant_images_plant_uploaded_idx ON plant_images(plant_id, uploaded_at DESC);
CREATE INDEX devices_zone_id_idx ON devices(zone_id);
CREATE INDEX device_modules_device_id_idx ON device_modules(device_id);
CREATE INDEX sensors_device_id_idx ON sensors(device_id);
CREATE INDEX sensor_readings_sensor_recorded_idx ON sensor_readings(sensor_id, recorded_at DESC);
CREATE INDEX device_heartbeats_device_observed_idx ON device_heartbeats(device_id, observed_at DESC);
CREATE INDEX lighting_systems_zone_id_idx ON lighting_systems(zone_id);
CREATE INDEX lighting_events_system_occurred_idx ON lighting_events(lighting_system_id, occurred_at DESC);
CREATE INDEX lighting_schedules_system_id_idx ON lighting_schedules(lighting_system_id);
CREATE INDEX ota_jobs_device_status_idx ON ota_jobs(device_id, status);
CREATE INDEX irrigation_systems_zone_id_idx ON irrigation_systems(zone_id);
CREATE INDEX irrigation_events_system_occurred_idx ON irrigation_events(irrigation_system_id, occurred_at DESC);
CREATE INDEX system_alerts_status_raised_idx ON system_alerts(status, raised_at DESC);

CREATE TRIGGER grow_areas_set_updated_at BEFORE UPDATE ON grow_areas FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER zones_set_updated_at BEFORE UPDATE ON zones FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER plant_families_set_updated_at BEFORE UPDATE ON plant_families FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER plant_categories_set_updated_at BEFORE UPDATE ON plant_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER plant_species_set_updated_at BEFORE UPDATE ON plant_species FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER plants_set_updated_at BEFORE UPDATE ON plants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER devices_set_updated_at BEFORE UPDATE ON devices FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER device_modules_set_updated_at BEFORE UPDATE ON device_modules FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER sensors_set_updated_at BEFORE UPDATE ON sensors FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER lighting_systems_set_updated_at BEFORE UPDATE ON lighting_systems FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER lighting_schedules_set_updated_at BEFORE UPDATE ON lighting_schedules FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER ota_jobs_set_updated_at BEFORE UPDATE ON ota_jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER irrigation_systems_set_updated_at BEFORE UPDATE ON irrigation_systems FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER system_alerts_set_updated_at BEFORE UPDATE ON system_alerts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- +goose Down
DROP TABLE IF EXISTS system_alerts;
DROP TABLE IF EXISTS irrigation_events;
DROP TABLE IF EXISTS irrigation_systems;
DROP TABLE IF EXISTS ota_jobs;
DROP TABLE IF EXISTS firmware_versions;
DROP TABLE IF EXISTS lighting_schedules;
DROP TABLE IF EXISTS lighting_events;
DROP TABLE IF EXISTS lighting_systems;
DROP TABLE IF EXISTS device_heartbeats;
DROP TABLE IF EXISTS sensor_readings;
DROP TABLE IF EXISTS sensors;
DROP TABLE IF EXISTS device_modules;
DROP TABLE IF EXISTS devices;
DROP TABLE IF EXISTS plant_images;
DROP TABLE IF EXISTS plant_events;
DROP TABLE IF EXISTS plants;
DROP TABLE IF EXISTS plant_species;
DROP TABLE IF EXISTS plant_categories;
DROP TABLE IF EXISTS plant_families;
DROP TABLE IF EXISTS zones;
DROP TABLE IF EXISTS grow_areas;
DROP FUNCTION IF EXISTS set_updated_at();
