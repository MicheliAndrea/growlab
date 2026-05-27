-- name: GetSensorReading :one
SELECT * FROM sensor_readings WHERE id = $1 AND recorded_at = $2;

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

-- name: ListDeviceHeartbeats :many
SELECT *
FROM device_heartbeats
WHERE device_id = $1
  AND observed_at >= $2
  AND observed_at < $3
ORDER BY observed_at DESC
LIMIT $4;
