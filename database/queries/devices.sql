-- name: GetDevice :one
SELECT * FROM devices WHERE id = $1;

-- name: GetDeviceByUID :one
SELECT * FROM devices WHERE device_uid = $1;

-- name: ListDevicesByZone :many
SELECT * FROM devices WHERE zone_id = $1 ORDER BY name;

-- name: GetDeviceModule :one
SELECT * FROM device_modules WHERE id = $1;

-- name: ListDeviceModules :many
SELECT * FROM device_modules WHERE device_id = $1 ORDER BY module_key;

-- name: GetSensor :one
SELECT * FROM sensors WHERE id = $1;

-- name: ListSensorsByDevice :many
SELECT * FROM sensors WHERE device_id = $1 ORDER BY sensor_key;
