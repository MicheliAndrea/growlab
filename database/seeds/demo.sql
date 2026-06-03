BEGIN;

DELETE FROM automation_rule_evaluations WHERE evaluation_context->>'seed' = 'demo';
DELETE FROM ota_dry_runs WHERE metadata->>'seed' = 'demo';
DELETE FROM sensor_readings WHERE metadata->>'seed' = 'demo';
DELETE FROM device_heartbeats WHERE metadata->>'seed' = 'demo';

INSERT INTO grow_areas (id, name, slug, description, metadata)
VALUES (
  '00000000-0000-0000-0000-000000010001',
  'Demo Grow Area',
  'demo-grow-area',
  'Sample grow area loaded by database/seeds/demo.sql.',
  '{"seed":"demo"}'
)
ON CONFLICT (slug) DO UPDATE
SET description = EXCLUDED.description,
    metadata = EXCLUDED.metadata;

INSERT INTO zones (id, grow_area_id, name, slug, description, environment_type, metadata)
VALUES
  (
    '00000000-0000-0000-0000-000000010101',
    '00000000-0000-0000-0000-000000010001',
    'Vegetative Rack',
    'vegetative-rack',
    'Demo zone for young plants and leafy growth.',
    'indoor',
    '{"seed":"demo","layout":{"version":1,"items":[]}}'
  ),
  (
    '00000000-0000-0000-0000-000000010102',
    '00000000-0000-0000-0000-000000010001',
    'Flowering Bench',
    'flowering-bench',
    'Demo zone for bloom and fruiting plants.',
    'indoor',
    '{"seed":"demo"}'
  )
ON CONFLICT (grow_area_id, slug) DO UPDATE
SET description = EXCLUDED.description,
    environment_type = EXCLUDED.environment_type,
    metadata = EXCLUDED.metadata;

INSERT INTO plant_families (id, common_name, scientific_name, metadata)
VALUES
  ('00000000-0000-0000-0000-000000010201', 'Nightshade', 'Solanaceae', '{"seed":"demo"}'),
  ('00000000-0000-0000-0000-000000010202', 'Mint', 'Lamiaceae', '{"seed":"demo"}')
ON CONFLICT (scientific_name) DO UPDATE
SET common_name = EXCLUDED.common_name,
    metadata = EXCLUDED.metadata;

INSERT INTO plant_categories (id, name, slug, description, metadata)
VALUES
  ('00000000-0000-0000-0000-000000010211', 'Vegetables', 'vegetables', 'Edible fruiting and leafy plants.', '{"seed":"demo"}'),
  ('00000000-0000-0000-0000-000000010212', 'Herbs', 'herbs', 'Culinary and aromatic plants.', '{"seed":"demo"}')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    metadata = EXCLUDED.metadata;

INSERT INTO plant_species (id, family_id, category_id, common_name, scientific_name, cultivar, metadata)
VALUES
  (
    '00000000-0000-0000-0000-000000010221',
    '00000000-0000-0000-0000-000000010201',
    '00000000-0000-0000-0000-000000010211',
    'Tomato',
    'Solanum lycopersicum',
    'Demo Cherry',
    '{"seed":"demo"}'
  ),
  (
    '00000000-0000-0000-0000-000000010222',
    '00000000-0000-0000-0000-000000010202',
    '00000000-0000-0000-0000-000000010212',
    'Basil',
    'Ocimum basilicum',
    'Demo Genovese',
    '{"seed":"demo"}'
  )
ON CONFLICT (scientific_name, cultivar) DO UPDATE
SET common_name = EXCLUDED.common_name,
    family_id = EXCLUDED.family_id,
    category_id = EXCLUDED.category_id,
    metadata = EXCLUDED.metadata;

INSERT INTO plants (id, zone_id, species_id, name, code, status, current_health_status, planted_at, metadata)
VALUES
  (
    '00000000-0000-0000-0000-000000010301',
    '00000000-0000-0000-0000-000000010101',
    '00000000-0000-0000-0000-000000010221',
    'Demo Cherry Tomato',
    'DEMO-TOMATO-01',
    'active',
    'watch',
    CURRENT_DATE - 35,
    '{"seed":"demo","notes":"Demo tomato used for dashboard data."}'
  ),
  (
    '00000000-0000-0000-0000-000000010302',
    '00000000-0000-0000-0000-000000010102',
    '00000000-0000-0000-0000-000000010222',
    'Demo Basil',
    'DEMO-BASIL-01',
    'active',
    'healthy',
    CURRENT_DATE - 18,
    '{"seed":"demo","notes":"Demo basil used for checklist and image metadata."}'
  )
ON CONFLICT (code) DO UPDATE
SET zone_id = EXCLUDED.zone_id,
    species_id = EXCLUDED.species_id,
    name = EXCLUDED.name,
    status = EXCLUDED.status,
    current_health_status = EXCLUDED.current_health_status,
    planted_at = EXCLUDED.planted_at,
    metadata = EXCLUDED.metadata;

INSERT INTO plant_status_history (id, plant_id, health_status, changed_at, source, notes, metadata)
VALUES
  (
    '00000000-0000-0000-0000-000000010311',
    '00000000-0000-0000-0000-000000010301',
    'watch',
    now() - interval '2 days',
    'manual',
    'Lower leaves need inspection.',
    '{"seed":"demo"}'
  ),
  (
    '00000000-0000-0000-0000-000000010312',
    '00000000-0000-0000-0000-000000010302',
    'healthy',
    now() - interval '1 day',
    'manual',
    'Compact growth and good color.',
    '{"seed":"demo"}'
  )
ON CONFLICT (id) DO UPDATE
SET health_status = EXCLUDED.health_status,
    changed_at = EXCLUDED.changed_at,
    notes = EXCLUDED.notes,
    metadata = EXCLUDED.metadata;

INSERT INTO plant_events (id, plant_id, event_type, occurred_at, notes, metadata)
VALUES
  (
    '00000000-0000-0000-0000-000000010321',
    '00000000-0000-0000-0000-000000010301',
    'inspection',
    now() - interval '6 hours',
    'Checked stem support and substrate moisture.',
    '{"seed":"demo"}'
  ),
  (
    '00000000-0000-0000-0000-000000010322',
    '00000000-0000-0000-0000-000000010302',
    'pruning',
    now() - interval '1 day',
    'Removed two damaged leaves.',
    '{"seed":"demo"}'
  )
ON CONFLICT (id) DO UPDATE
SET occurred_at = EXCLUDED.occurred_at,
    notes = EXCLUDED.notes,
    metadata = EXCLUDED.metadata;

INSERT INTO plant_tasks (id, plant_id, title, description, status, due_at, recurrence_config, metadata)
VALUES
  (
    '00000000-0000-0000-0000-000000010331',
    '00000000-0000-0000-0000-000000010301',
    'Inspect lower leaves',
    'Look for stress signs and update plant health status manually.',
    'todo',
    now() + interval '12 hours',
    '{"interval":"weekly"}',
    '{"seed":"demo"}'
  ),
  (
    '00000000-0000-0000-0000-000000010332',
    '00000000-0000-0000-0000-000000010302',
    'Harvest basil tops',
    'Pinch top growth to encourage branching.',
    'done',
    now() - interval '8 hours',
    '{"interval":"weekly"}',
    '{"seed":"demo"}'
  )
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    due_at = EXCLUDED.due_at,
    recurrence_config = EXCLUDED.recurrence_config,
    metadata = EXCLUDED.metadata;

INSERT INTO plant_images (
  id,
  plant_id,
  zone_id,
  storage_path,
  original_filename,
  content_type,
  size_bytes,
  checksum_sha256,
  captured_at,
  growth_stage,
  growth_tracking,
  metadata
)
VALUES
  (
    '00000000-0000-0000-0000-000000010341',
    '00000000-0000-0000-0000-000000010301',
    '00000000-0000-0000-0000-000000010101',
    'demo/tomato-week-05.jpg',
    'tomato-week-05.jpg',
    'image/jpeg',
    128000,
    'demo-checksum-tomato',
    now() - interval '4 hours',
    'vegetative',
    '{"heightCm":42,"leafCount":38}',
    '{"seed":"demo","fileMissing":true}'
  ),
  (
    '00000000-0000-0000-0000-000000010342',
    '00000000-0000-0000-0000-000000010302',
    '00000000-0000-0000-0000-000000010102',
    'demo/basil-week-03.jpg',
    'basil-week-03.jpg',
    'image/jpeg',
    96000,
    'demo-checksum-basil',
    now() - interval '1 day',
    'vegetative',
    '{"heightCm":24,"leafCount":44}',
    '{"seed":"demo","fileMissing":true}'
  )
ON CONFLICT (id) DO UPDATE
SET zone_id = EXCLUDED.zone_id,
    storage_path = EXCLUDED.storage_path,
    original_filename = EXCLUDED.original_filename,
    content_type = EXCLUDED.content_type,
    size_bytes = EXCLUDED.size_bytes,
    checksum_sha256 = EXCLUDED.checksum_sha256,
    captured_at = EXCLUDED.captured_at,
    growth_stage = EXCLUDED.growth_stage,
    growth_tracking = EXCLUDED.growth_tracking,
    metadata = EXCLUDED.metadata;

INSERT INTO plant_image_tags (plant_image_id, tag, source, metadata)
VALUES
  ('00000000-0000-0000-0000-000000010341', 'weekly', 'manual', '{"seed":"demo"}'),
  ('00000000-0000-0000-0000-000000010341', 'canopy', 'manual', '{"seed":"demo"}'),
  ('00000000-0000-0000-0000-000000010342', 'weekly', 'manual', '{"seed":"demo"}'),
  ('00000000-0000-0000-0000-000000010342', 'herb', 'manual', '{"seed":"demo"}')
ON CONFLICT (plant_image_id, tag) DO UPDATE
SET source = EXCLUDED.source,
    metadata = EXCLUDED.metadata;

INSERT INTO devices (id, zone_id, device_uid, name, device_type, status, firmware_version, firmware_channel_id, config, metadata, last_seen_at)
VALUES
  (
    '00000000-0000-0000-0000-000000010401',
    '00000000-0000-0000-0000-000000010101',
    'demo-esp32-rack-01',
    'Demo ESP32 Rack Controller',
    'esp32-growlab',
    'online',
    '0.3.0-demo',
    '00000000-0000-0000-0000-000000000103',
    '{"sampleRateSeconds":60}',
    '{"seed":"demo"}',
    now() - interval '2 minutes'
  ),
  (
    '00000000-0000-0000-0000-000000010402',
    '00000000-0000-0000-0000-000000010102',
    'demo-esp32-bench-01',
    'Demo ESP32 Bench Controller',
    'esp32-growlab',
    'online',
    '0.3.0-demo',
    '00000000-0000-0000-0000-000000000103',
    '{"sampleRateSeconds":60}',
    '{"seed":"demo"}',
    now() - interval '4 minutes'
  )
ON CONFLICT (device_uid) DO UPDATE
SET zone_id = EXCLUDED.zone_id,
    name = EXCLUDED.name,
    status = EXCLUDED.status,
    firmware_version = EXCLUDED.firmware_version,
    firmware_channel_id = EXCLUDED.firmware_channel_id,
    config = EXCLUDED.config,
    metadata = EXCLUDED.metadata,
    last_seen_at = EXCLUDED.last_seen_at;

INSERT INTO device_modules (id, device_id, module_key, module_type, enabled, config, metadata)
VALUES
  (
    '00000000-0000-0000-0000-000000010411',
    '00000000-0000-0000-0000-000000010401',
    'env-board',
    'sensor-board',
    true,
    '{"bus":"i2c"}',
    '{"seed":"demo"}'
  ),
  (
    '00000000-0000-0000-0000-000000010412',
    '00000000-0000-0000-0000-000000010402',
    'env-board',
    'sensor-board',
    true,
    '{"bus":"i2c"}',
    '{"seed":"demo"}'
  )
ON CONFLICT (device_id, module_key) DO UPDATE
SET enabled = EXCLUDED.enabled,
    config = EXCLUDED.config,
    metadata = EXCLUDED.metadata;

INSERT INTO sensors (id, device_id, module_id, sensor_key, sensor_type, unit, enabled, calibration, metadata)
VALUES
  (
    '00000000-0000-0000-0000-000000010421',
    '00000000-0000-0000-0000-000000010401',
    '00000000-0000-0000-0000-000000010411',
    'air_temperature',
    'temperature',
    'C',
    true,
    '{"offset":0.1}',
    '{"seed":"demo"}'
  ),
  (
    '00000000-0000-0000-0000-000000010422',
    '00000000-0000-0000-0000-000000010401',
    '00000000-0000-0000-0000-000000010411',
    'relative_humidity',
    'humidity',
    '%',
    true,
    '{"offset":-1.2}',
    '{"seed":"demo"}'
  ),
  (
    '00000000-0000-0000-0000-000000010423',
    '00000000-0000-0000-0000-000000010402',
    '00000000-0000-0000-0000-000000010412',
    'soil_moisture',
    'moisture',
    '%',
    true,
    '{"slope":1.0}',
    '{"seed":"demo"}'
  )
ON CONFLICT (device_id, sensor_key) DO UPDATE
SET sensor_type = EXCLUDED.sensor_type,
    unit = EXCLUDED.unit,
    enabled = EXCLUDED.enabled,
    calibration = EXCLUDED.calibration,
    metadata = EXCLUDED.metadata;

INSERT INTO sensor_readings (id, sensor_id, recorded_at, value_double, metadata)
VALUES
  ('00000000-0000-0000-0000-000000010431', '00000000-0000-0000-0000-000000010421', now() - interval '45 minutes', 23.4, '{"seed":"demo"}'),
  ('00000000-0000-0000-0000-000000010432', '00000000-0000-0000-0000-000000010421', now() - interval '30 minutes', 23.8, '{"seed":"demo"}'),
  ('00000000-0000-0000-0000-000000010433', '00000000-0000-0000-0000-000000010421', now() - interval '15 minutes', 24.1, '{"seed":"demo"}'),
  ('00000000-0000-0000-0000-000000010434', '00000000-0000-0000-0000-000000010422', now() - interval '45 minutes', 61.5, '{"seed":"demo"}'),
  ('00000000-0000-0000-0000-000000010435', '00000000-0000-0000-0000-000000010422', now() - interval '15 minutes', 59.7, '{"seed":"demo"}'),
  ('00000000-0000-0000-0000-000000010436', '00000000-0000-0000-0000-000000010423', now() - interval '30 minutes', 42.0, '{"seed":"demo"}'),
  ('00000000-0000-0000-0000-000000010437', '00000000-0000-0000-0000-000000010423', now() - interval '10 minutes', 39.8, '{"seed":"demo"}');

INSERT INTO device_heartbeats (id, device_id, observed_at, status, ip_address, rssi_dbm, uptime_seconds, firmware_version, metadata)
VALUES
  (
    '00000000-0000-0000-0000-000000010441',
    '00000000-0000-0000-0000-000000010401',
    now() - interval '2 minutes',
    'online',
    '192.0.2.41',
    -58,
    86400,
    '0.3.0-demo',
    '{"seed":"demo"}'
  ),
  (
    '00000000-0000-0000-0000-000000010442',
    '00000000-0000-0000-0000-000000010402',
    now() - interval '4 minutes',
    'online',
    '192.0.2.42',
    -64,
    42100,
    '0.3.0-demo',
    '{"seed":"demo"}'
  );

INSERT INTO device_capabilities (id, device_id, capability_key, capability_type, enabled, config, metadata)
VALUES
  (
    '00000000-0000-0000-0000-000000010451',
    '00000000-0000-0000-0000-000000010401',
    'telemetry.publish',
    'connectivity',
    true,
    '{"topic":"growlab/devices/demo-esp32-rack-01/telemetry"}',
    '{"seed":"demo"}'
  ),
  (
    '00000000-0000-0000-0000-000000010452',
    '00000000-0000-0000-0000-000000010401',
    'ota.status',
    'firmware',
    true,
    '{"topic":"growlab/devices/demo-esp32-rack-01/ota/status"}',
    '{"seed":"demo"}'
  )
ON CONFLICT (device_id, capability_key) DO UPDATE
SET capability_type = EXCLUDED.capability_type,
    enabled = EXCLUDED.enabled,
    config = EXCLUDED.config,
    metadata = EXCLUDED.metadata;

INSERT INTO sensor_calibrations (id, sensor_id, method, status, calibration_data, raw_points, notes, confirmed_at, metadata)
VALUES
  (
    '00000000-0000-0000-0000-000000010461',
    '00000000-0000-0000-0000-000000010421',
    'manual-offset',
    'confirmed',
    '{"offset":0.1}',
    '[{"raw":23.3,"reference":23.4}]',
    'Demo confirmed calibration.',
    now() - interval '1 day',
    '{"seed":"demo"}'
  ),
  (
    '00000000-0000-0000-0000-000000010462',
    '00000000-0000-0000-0000-000000010423',
    'manual-two-point',
    'draft',
    '{"slope":1.0}',
    '[{"raw":40,"reference":42}]',
    'Demo draft calibration.',
    NULL,
    '{"seed":"demo"}'
  )
ON CONFLICT (id) DO UPDATE
SET method = EXCLUDED.method,
    status = EXCLUDED.status,
    calibration_data = EXCLUDED.calibration_data,
    raw_points = EXCLUDED.raw_points,
    notes = EXCLUDED.notes,
    confirmed_at = EXCLUDED.confirmed_at,
    metadata = EXCLUDED.metadata;

INSERT INTO zone_profiles (id, zone_id, name, is_active, target_config, metadata)
VALUES
  (
    '00000000-0000-0000-0000-000000010501',
    '00000000-0000-0000-0000-000000010101',
    'Vegetative target',
    true,
    '{"temperatureC":{"min":21,"max":26},"humidityPct":{"min":55,"max":70},"soilMoisturePct":{"min":35,"max":55}}',
    '{"seed":"demo"}'
  ),
  (
    '00000000-0000-0000-0000-000000010502',
    '00000000-0000-0000-0000-000000010102',
    'Flowering target',
    true,
    '{"temperatureC":{"min":20,"max":25},"humidityPct":{"min":45,"max":60},"soilMoisturePct":{"min":30,"max":50}}',
    '{"seed":"demo"}'
  )
ON CONFLICT (zone_id, name) DO UPDATE
SET is_active = EXCLUDED.is_active,
    target_config = EXCLUDED.target_config,
    metadata = EXCLUDED.metadata;

INSERT INTO lighting_systems (id, zone_id, name, provider, endpoint_url, enabled, config, metadata)
VALUES
  (
    '00000000-0000-0000-0000-000000010601',
    '00000000-0000-0000-0000-000000010101',
    'Demo Rack Light',
    'shelly',
    'http://192.0.2.61',
    false,
    '{"channel":0}',
    '{"seed":"demo","disabledReason":"demo endpoint"}'
  )
ON CONFLICT (id) DO UPDATE
SET zone_id = EXCLUDED.zone_id,
    name = EXCLUDED.name,
    endpoint_url = EXCLUDED.endpoint_url,
    enabled = EXCLUDED.enabled,
    config = EXCLUDED.config,
    metadata = EXCLUDED.metadata;

INSERT INTO lighting_profiles (id, zone_id, lighting_system_id, name, enabled, is_default, timezone, metadata)
VALUES (
  '00000000-0000-0000-0000-000000010611',
  '00000000-0000-0000-0000-000000010101',
  '00000000-0000-0000-0000-000000010601',
  'Demo 16 hour day',
  true,
  true,
  'UTC',
  '{"seed":"demo"}'
)
ON CONFLICT (zone_id, name) DO UPDATE
SET lighting_system_id = EXCLUDED.lighting_system_id,
    enabled = EXCLUDED.enabled,
    is_default = EXCLUDED.is_default,
    timezone = EXCLUDED.timezone,
    metadata = EXCLUDED.metadata;

INSERT INTO lighting_profile_steps (id, lighting_profile_id, step_order, at_time, action, brightness_percent, transition_seconds, metadata)
VALUES
  (
    '00000000-0000-0000-0000-000000010621',
    '00000000-0000-0000-0000-000000010611',
    1,
    '06:00',
    'brightness',
    70,
    900,
    '{"seed":"demo"}'
  ),
  (
    '00000000-0000-0000-0000-000000010622',
    '00000000-0000-0000-0000-000000010611',
    2,
    '22:00',
    'off',
    NULL,
    300,
    '{"seed":"demo"}'
  )
ON CONFLICT (lighting_profile_id, step_order) DO UPDATE
SET at_time = EXCLUDED.at_time,
    action = EXCLUDED.action,
    brightness_percent = EXCLUDED.brightness_percent,
    transition_seconds = EXCLUDED.transition_seconds,
    metadata = EXCLUDED.metadata;

INSERT INTO system_alerts (id, severity, source, title, message, status, raised_at, metadata)
VALUES (
  '00000000-0000-0000-0000-000000010701',
  'warning',
  'demo-seed',
  'Demo humidity drift',
  'Humidity is trending below the vegetative target range.',
  'active',
  now() - interval '25 minutes',
  '{"seed":"demo"}'
)
ON CONFLICT (id) DO UPDATE
SET severity = EXCLUDED.severity,
    source = EXCLUDED.source,
    title = EXCLUDED.title,
    message = EXCLUDED.message,
    status = EXCLUDED.status,
    raised_at = EXCLUDED.raised_at,
    metadata = EXCLUDED.metadata;

INSERT INTO system_events (id, event_type, severity, source, zone_id, plant_id, device_id, alert_id, message, metadata, occurred_at)
VALUES
  (
    '00000000-0000-0000-0000-000000010711',
    'demo_seed_loaded',
    'info',
    'demo-seed',
    NULL,
    NULL,
    NULL,
    NULL,
    'Demo seed data loaded.',
    '{"seed":"demo"}',
    now() - interval '30 minutes'
  ),
  (
    '00000000-0000-0000-0000-000000010712',
    'humidity_low',
    'warning',
    'demo-seed',
    '00000000-0000-0000-0000-000000010101',
    '00000000-0000-0000-0000-000000010301',
    '00000000-0000-0000-0000-000000010401',
    '00000000-0000-0000-0000-000000010701',
    'Humidity drift detected in demo vegetative rack.',
    '{"seed":"demo"}',
    now() - interval '20 minutes'
  )
ON CONFLICT (id) DO UPDATE
SET event_type = EXCLUDED.event_type,
    severity = EXCLUDED.severity,
    source = EXCLUDED.source,
    zone_id = EXCLUDED.zone_id,
    plant_id = EXCLUDED.plant_id,
    device_id = EXCLUDED.device_id,
    alert_id = EXCLUDED.alert_id,
    message = EXCLUDED.message,
    metadata = EXCLUDED.metadata,
    occurred_at = EXCLUDED.occurred_at;

INSERT INTO firmware_versions (id, device_type, version, channel_id, storage_path, checksum_sha256, size_bytes, metadata)
VALUES (
  '00000000-0000-0000-0000-000000010801',
  'esp32-growlab',
  '0.3.0-demo',
  '00000000-0000-0000-0000-000000000103',
  'demo/esp32-growlab-0.3.0-demo.bin',
  'demo-firmware-checksum',
  524288,
  '{"seed":"demo","fileMissing":true}'
)
ON CONFLICT (device_type, version) DO UPDATE
SET channel_id = EXCLUDED.channel_id,
    storage_path = EXCLUDED.storage_path,
    checksum_sha256 = EXCLUDED.checksum_sha256,
    size_bytes = EXCLUDED.size_bytes,
    metadata = EXCLUDED.metadata;

INSERT INTO ota_dry_runs (id, device_id, firmware_version_id, status, completed_at, compatibility_report, metadata)
VALUES (
  '00000000-0000-0000-0000-000000010811',
  '00000000-0000-0000-0000-000000010401',
  '00000000-0000-0000-0000-000000010801',
  'passed',
  now() - interval '10 minutes',
  '{"checks":[{"name":"device_type_matches","passed":true},{"name":"manual_confirmation_required","passed":false}]}',
  '{"seed":"demo"}'
)
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    completed_at = EXCLUDED.completed_at,
    compatibility_report = EXCLUDED.compatibility_report,
    metadata = EXCLUDED.metadata;

INSERT INTO device_provisioning_configs (
  id,
  device_id,
  status,
  token_hash,
  provisioning_config,
  expires_at,
  metadata
)
VALUES (
  '00000000-0000-0000-0000-000000010901',
  '00000000-0000-0000-0000-000000010402',
  'pending',
  'demo-token-hash-not-a-real-token',
  '{"wifiProfile":"lab","mqttClientId":"demo-esp32-bench-01"}',
  now() + interval '7 days',
  '{"seed":"demo","token":"not-stored"}'
)
ON CONFLICT (token_hash) DO UPDATE
SET device_id = EXCLUDED.device_id,
    status = EXCLUDED.status,
    provisioning_config = EXCLUDED.provisioning_config,
    expires_at = EXCLUDED.expires_at,
    metadata = EXCLUDED.metadata;

INSERT INTO automation_rules (id, name, slug, description, enabled, severity, condition_config, action_config, metadata)
VALUES (
  '00000000-0000-0000-0000-000000011001',
  'Demo humidity watch',
  'demo-humidity-watch',
  'Manual rule example for dry-run evaluation.',
  true,
  'warning',
  '{"fact":"humidity.value","operator":"lt","value":50}',
  '{"actions":[{"type":"create_alert","title":"Humidity below demo target","message":"Review the vegetative rack manually."}]}',
  '{"seed":"demo"}'
)
ON CONFLICT (slug) DO UPDATE
SET description = EXCLUDED.description,
    enabled = EXCLUDED.enabled,
    severity = EXCLUDED.severity,
    condition_config = EXCLUDED.condition_config,
    action_config = EXCLUDED.action_config,
    metadata = EXCLUDED.metadata;

INSERT INTO irrigation_systems (id, zone_id, name, provider, enabled, automation_enabled, config, metadata)
VALUES (
  '00000000-0000-0000-0000-000000011101',
  '00000000-0000-0000-0000-000000010101',
  'Demo Irrigation Placeholder',
  'manual-disabled',
  false,
  false,
  '{}',
  '{"seed":"demo","disabledReason":"IRRIGATION_DISABLED"}'
)
ON CONFLICT (id) DO UPDATE
SET zone_id = EXCLUDED.zone_id,
    name = EXCLUDED.name,
    provider = EXCLUDED.provider,
    enabled = false,
    automation_enabled = false,
    config = EXCLUDED.config,
    metadata = EXCLUDED.metadata;

COMMIT;
