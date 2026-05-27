-- name: GetLightingSystem :one
SELECT * FROM lighting_systems WHERE id = $1;

-- name: ListLightingSystemsByZone :many
SELECT * FROM lighting_systems WHERE zone_id = $1 ORDER BY name;

-- name: ListLightingSchedules :many
SELECT * FROM lighting_schedules WHERE lighting_system_id = $1 ORDER BY starts_at;

-- name: GetFirmwareVersion :one
SELECT * FROM firmware_versions WHERE id = $1;

-- name: ListFirmwareVersionsByDeviceType :many
SELECT * FROM firmware_versions WHERE device_type = $1 ORDER BY created_at DESC;

-- name: GetOtaJob :one
SELECT * FROM ota_jobs WHERE id = $1;

-- name: ListOtaJobsByDevice :many
SELECT * FROM ota_jobs WHERE device_id = $1 ORDER BY requested_at DESC;

-- name: GetIrrigationSystem :one
SELECT * FROM irrigation_systems WHERE id = $1;

-- name: ListIrrigationSystemsByZone :many
SELECT * FROM irrigation_systems WHERE zone_id = $1 ORDER BY name;

-- name: ListOpenSystemAlerts :many
SELECT * FROM system_alerts WHERE status = 'open' ORDER BY raised_at DESC;
