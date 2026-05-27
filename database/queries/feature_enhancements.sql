-- name: CreateSystemEvent :one
INSERT INTO system_events (
  event_type,
  severity,
  source,
  zone_id,
  plant_id,
  device_id,
  alert_id,
  message,
  metadata,
  occurred_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
)
RETURNING *;

-- name: ListSystemEvents :many
SELECT *
FROM system_events
ORDER BY occurred_at DESC
LIMIT $1;

-- name: CreateSystemAlert :one
INSERT INTO system_alerts (
  severity,
  source,
  title,
  message,
  status,
  metadata
) VALUES (
  $1, $2, $3, $4, 'active', $5
)
RETURNING *;

-- name: ListSystemAlerts :many
SELECT *
FROM system_alerts
WHERE status = $1
ORDER BY raised_at DESC
LIMIT $2;

-- name: UpdateSystemAlertStatus :one
UPDATE system_alerts
SET
  status = $2,
  acknowledged_by = CASE WHEN $2 = 'acknowledged' THEN $3 ELSE acknowledged_by END,
  acknowledged_at = CASE WHEN $2 = 'acknowledged' THEN now() ELSE acknowledged_at END,
  resolved_by = CASE WHEN $2 = 'resolved' THEN $3 ELSE resolved_by END,
  resolved_at = CASE WHEN $2 = 'resolved' THEN now() ELSE resolved_at END,
  updated_at = now()
WHERE id = $1
RETURNING *;

-- name: CreateZoneProfile :one
INSERT INTO zone_profiles (
  zone_id,
  name,
  is_active,
  target_config,
  metadata
) VALUES (
  $1, $2, $3, $4, $5
)
RETURNING *;

-- name: ListZoneProfiles :many
SELECT *
FROM zone_profiles
WHERE zone_id = $1
ORDER BY is_active DESC, name;

-- name: CreatePlantTask :one
INSERT INTO plant_tasks (
  plant_id,
  title,
  description,
  status,
  due_at,
  recurrence_config,
  metadata
) VALUES (
  $1, $2, $3, 'todo', $4, $5, $6
)
RETURNING *;

-- name: ListPlantTasks :many
SELECT *
FROM plant_tasks
WHERE plant_id = $1
ORDER BY status, due_at NULLS LAST, created_at DESC;

-- name: CreateDeviceCapability :one
INSERT INTO device_capabilities (
  device_id,
  capability_key,
  capability_type,
  enabled,
  config,
  metadata
) VALUES (
  $1, $2, $3, $4, $5, $6
)
RETURNING *;

-- name: ListDeviceCapabilities :many
SELECT *
FROM device_capabilities
WHERE device_id = $1
ORDER BY capability_type, capability_key;

-- name: CreateSensorCalibration :one
INSERT INTO sensor_calibrations (
  sensor_id,
  method,
  status,
  calibration_data,
  raw_points,
  notes,
  metadata
) VALUES (
  $1, $2, $3, $4, $5, $6, $7
)
RETURNING *;

-- name: ListSensorCalibrations :many
SELECT *
FROM sensor_calibrations
WHERE sensor_id = $1
ORDER BY created_at DESC;

-- name: CreateLightingProfile :one
INSERT INTO lighting_profiles (
  zone_id,
  lighting_system_id,
  name,
  enabled,
  is_default,
  timezone,
  metadata
) VALUES (
  $1, $2, $3, $4, $5, $6, $7
)
RETURNING *;

-- name: ListLightingProfiles :many
SELECT *
FROM lighting_profiles
WHERE zone_id = $1
ORDER BY is_default DESC, name;

-- name: CreateLightingProfileStep :one
INSERT INTO lighting_profile_steps (
  lighting_profile_id,
  step_order,
  at_time,
  action,
  brightness_percent,
  transition_seconds,
  metadata
) VALUES (
  $1, $2, $3, $4, $5, $6, $7
)
RETURNING *;

-- name: ListLightingProfileSteps :many
SELECT *
FROM lighting_profile_steps
WHERE lighting_profile_id = $1
ORDER BY step_order;
