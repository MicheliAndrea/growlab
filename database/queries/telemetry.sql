-- name: GetSensorReading :one
SELECT * FROM sensor_readings WHERE id = $1 AND recorded_at = $2;

-- name: CreateSensorReading :one
INSERT INTO sensor_readings (
  sensor_id,
  recorded_at,
  value_double,
  metadata
) VALUES (
  $1, $2, $3, $4
)
RETURNING *;

-- name: ListSensorReadings :many
SELECT *
FROM sensor_readings
WHERE sensor_id = $1
  AND recorded_at >= $2
  AND recorded_at < $3
ORDER BY recorded_at DESC
LIMIT $4;

-- name: GetDeviceHeartbeat :one
SELECT * FROM device_heartbeats WHERE id = $1 AND observed_at = $2;

-- name: CreateDeviceHeartbeat :one
INSERT INTO device_heartbeats (
  device_id,
  observed_at,
  status,
  ip_address,
  rssi_dbm,
  uptime_seconds,
  firmware_version,
  metadata
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8
)
RETURNING *;

-- name: ListDeviceHeartbeats :many
SELECT *
FROM device_heartbeats
WHERE device_id = $1
  AND observed_at >= $2
  AND observed_at < $3
ORDER BY observed_at DESC
LIMIT $4;

-- name: GetSensorByDeviceUIDAndKey :one
SELECT s.*
FROM sensors s
JOIN devices d ON d.id = s.device_id
WHERE d.device_uid = $1
  AND s.sensor_key = $2
  AND s.enabled = true;

-- name: TouchDeviceLastSeen :exec
UPDATE devices
SET
  last_seen_at = $2,
  status = COALESCE($3, status),
  firmware_version = COALESCE($4, firmware_version),
  updated_at = now()
WHERE id = $1;

-- name: TouchDeviceLastSeenByUID :exec
UPDATE devices
SET
  last_seen_at = $2,
  status = COALESCE($3, status),
  firmware_version = COALESCE($4, firmware_version),
  updated_at = now()
WHERE device_uid = $1;

-- name: UpdateOtaJobStatus :exec
UPDATE ota_jobs
SET
  status = $3,
  started_at = CASE WHEN $3 IN ('running', 'in_progress') AND started_at IS NULL THEN $4 ELSE started_at END,
  completed_at = CASE WHEN $3 IN ('completed', 'failed', 'cancelled') THEN $4 ELSE completed_at END,
  error_message = $5,
  metadata = metadata || $6,
  updated_at = now()
WHERE id = $1
  AND device_id = $2;
