-- +goose Up
ALTER TABLE system_alerts
  ALTER COLUMN status SET DEFAULT 'active';

UPDATE system_alerts
SET status = 'active'
WHERE status = 'open';

ALTER TABLE system_alerts
  ADD COLUMN acknowledged_by text,
  ADD COLUMN resolved_by text,
  ADD CONSTRAINT system_alerts_status_check CHECK (status IN ('active', 'acknowledged', 'resolved'));

CREATE TABLE system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  source text NOT NULL,
  zone_id uuid REFERENCES zones(id) ON DELETE SET NULL,
  plant_id uuid REFERENCES plants(id) ON DELETE SET NULL,
  device_id uuid REFERENCES devices(id) ON DELETE SET NULL,
  alert_id uuid REFERENCES system_alerts(id) ON DELETE SET NULL,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT system_events_severity_check CHECK (severity IN ('info', 'warning', 'error', 'critical'))
);

CREATE TABLE zone_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  target_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT zone_profiles_zone_name_key UNIQUE (zone_id, name)
);

ALTER TABLE plants
  ADD COLUMN current_health_status text NOT NULL DEFAULT 'healthy',
  ADD CONSTRAINT plants_health_status_check CHECK (current_health_status IN ('healthy', 'watch', 'stressed', 'critical', 'dormant', 'dead'));

CREATE TABLE plant_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  health_status text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'manual',
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plant_status_history_health_check CHECK (health_status IN ('healthy', 'watch', 'stressed', 'critical', 'dormant', 'dead'))
);

CREATE TABLE plant_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo',
  due_at timestamptz,
  completed_at timestamptz,
  recurrence_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plant_tasks_status_check CHECK (status IN ('todo', 'done', 'skipped', 'cancelled'))
);

CREATE TABLE device_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  capability_key text NOT NULL,
  capability_type text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT device_capabilities_device_key_key UNIQUE (device_id, capability_key),
  CONSTRAINT device_capabilities_type_check CHECK (capability_type IN ('sensor', 'actuator', 'connectivity', 'firmware', 'config'))
);

CREATE TABLE sensor_calibrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id uuid NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  method text NOT NULL DEFAULT 'linear',
  status text NOT NULL DEFAULT 'draft',
  calibration_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_points jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  confirmed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sensor_calibrations_status_check CHECK (status IN ('draft', 'confirmed', 'retired'))
);

CREATE TABLE lighting_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  lighting_system_id uuid REFERENCES lighting_systems(id) ON DELETE SET NULL,
  name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  timezone text NOT NULL DEFAULT 'UTC',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lighting_profiles_zone_name_key UNIQUE (zone_id, name)
);

CREATE TABLE lighting_profile_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lighting_profile_id uuid NOT NULL REFERENCES lighting_profiles(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  at_time time NOT NULL,
  action text NOT NULL,
  brightness_percent integer CHECK (brightness_percent IS NULL OR brightness_percent BETWEEN 0 AND 100),
  transition_seconds integer CHECK (transition_seconds IS NULL OR transition_seconds >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lighting_profile_steps_order_key UNIQUE (lighting_profile_id, step_order),
  CONSTRAINT lighting_profile_steps_action_check CHECK (action IN ('on', 'off', 'brightness'))
);

CREATE TABLE device_provisioning_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES devices(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  token_hash text NOT NULL,
  provisioning_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz,
  claimed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT device_provisioning_configs_token_hash_key UNIQUE (token_hash),
  CONSTRAINT device_provisioning_configs_status_check CHECK (status IN ('pending', 'claimed', 'expired', 'revoked'))
);

CREATE TABLE firmware_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT firmware_channels_name_key UNIQUE (name),
  CONSTRAINT firmware_channels_name_check CHECK (name IN ('dev', 'beta', 'stable'))
);

INSERT INTO firmware_channels (id, name, description, is_default)
VALUES
  ('00000000-0000-0000-0000-000000000101', 'dev', 'Development firmware channel', false),
  ('00000000-0000-0000-0000-000000000102', 'beta', 'Beta firmware channel', false),
  ('00000000-0000-0000-0000-000000000103', 'stable', 'Stable firmware channel', true);

ALTER TABLE devices
  ADD COLUMN firmware_channel_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000103' REFERENCES firmware_channels(id) ON DELETE RESTRICT;

ALTER TABLE firmware_versions
  ADD COLUMN channel_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000103' REFERENCES firmware_channels(id) ON DELETE RESTRICT;

CREATE TABLE ota_dry_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  firmware_version_id uuid REFERENCES firmware_versions(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  compatibility_report jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ota_dry_runs_status_check CHECK (status IN ('pending', 'passed', 'failed', 'cancelled'))
);

ALTER TABLE plant_images
  ADD COLUMN growth_stage text,
  ADD COLUMN growth_tracking jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE plant_image_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_image_id uuid NOT NULL REFERENCES plant_images(id) ON DELETE CASCADE,
  tag text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plant_image_tags_image_tag_key UNIQUE (plant_image_id, tag)
);

CREATE INDEX system_alerts_status_idx ON system_alerts(status, raised_at DESC);
CREATE INDEX system_events_occurred_idx ON system_events(occurred_at DESC);
CREATE INDEX system_events_zone_idx ON system_events(zone_id, occurred_at DESC);
CREATE INDEX system_events_plant_idx ON system_events(plant_id, occurred_at DESC);
CREATE INDEX system_events_device_idx ON system_events(device_id, occurred_at DESC);
CREATE INDEX zone_profiles_zone_idx ON zone_profiles(zone_id);
CREATE UNIQUE INDEX zone_profiles_one_active_idx ON zone_profiles(zone_id) WHERE is_active;
CREATE INDEX plant_status_history_plant_changed_idx ON plant_status_history(plant_id, changed_at DESC);
CREATE INDEX plant_tasks_plant_status_idx ON plant_tasks(plant_id, status, due_at);
CREATE INDEX device_capabilities_device_idx ON device_capabilities(device_id);
CREATE INDEX sensor_calibrations_sensor_created_idx ON sensor_calibrations(sensor_id, created_at DESC);
CREATE INDEX lighting_profiles_zone_idx ON lighting_profiles(zone_id);
CREATE UNIQUE INDEX lighting_profiles_one_default_idx ON lighting_profiles(zone_id) WHERE is_default;
CREATE INDEX lighting_profile_steps_profile_idx ON lighting_profile_steps(lighting_profile_id, step_order);
CREATE INDEX device_provisioning_configs_status_idx ON device_provisioning_configs(status, expires_at);
CREATE INDEX devices_firmware_channel_idx ON devices(firmware_channel_id);
CREATE INDEX firmware_versions_channel_idx ON firmware_versions(channel_id);
CREATE INDEX ota_dry_runs_device_requested_idx ON ota_dry_runs(device_id, requested_at DESC);
CREATE INDEX plant_image_tags_image_idx ON plant_image_tags(plant_image_id);

CREATE TRIGGER zone_profiles_set_updated_at BEFORE UPDATE ON zone_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER plant_tasks_set_updated_at BEFORE UPDATE ON plant_tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER device_capabilities_set_updated_at BEFORE UPDATE ON device_capabilities FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER sensor_calibrations_set_updated_at BEFORE UPDATE ON sensor_calibrations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER lighting_profiles_set_updated_at BEFORE UPDATE ON lighting_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER device_provisioning_configs_set_updated_at BEFORE UPDATE ON device_provisioning_configs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- +goose Down
DROP TABLE IF EXISTS plant_image_tags;

ALTER TABLE plant_images
  DROP COLUMN IF EXISTS growth_tracking,
  DROP COLUMN IF EXISTS growth_stage;

DROP TABLE IF EXISTS ota_dry_runs;

ALTER TABLE firmware_versions
  DROP COLUMN IF EXISTS channel_id;

ALTER TABLE devices
  DROP COLUMN IF EXISTS firmware_channel_id;

DROP TABLE IF EXISTS firmware_channels;
DROP TABLE IF EXISTS device_provisioning_configs;
DROP TABLE IF EXISTS lighting_profile_steps;
DROP TABLE IF EXISTS lighting_profiles;
DROP TABLE IF EXISTS sensor_calibrations;
DROP TABLE IF EXISTS device_capabilities;
DROP TABLE IF EXISTS plant_tasks;
DROP TABLE IF EXISTS plant_status_history;

ALTER TABLE plants
  DROP CONSTRAINT IF EXISTS plants_health_status_check,
  DROP COLUMN IF EXISTS current_health_status;

DROP TABLE IF EXISTS zone_profiles;
DROP TABLE IF EXISTS system_events;

ALTER TABLE system_alerts
  DROP CONSTRAINT IF EXISTS system_alerts_status_check,
  DROP COLUMN IF EXISTS resolved_by,
  DROP COLUMN IF EXISTS acknowledged_by;

UPDATE system_alerts
SET status = 'open'
WHERE status = 'active';

ALTER TABLE system_alerts
  ALTER COLUMN status SET DEFAULT 'open';
