-- name: GetPlant :one
SELECT * FROM plants WHERE id = $1;

-- name: ListPlantsByZone :many
SELECT * FROM plants WHERE zone_id = $1 ORDER BY name;

-- name: ListPlantEvents :many
SELECT * FROM plant_events WHERE plant_id = $1 ORDER BY occurred_at DESC;

-- name: CreatePlantEvent :one
INSERT INTO plant_events (plant_id, event_type, occurred_at, notes, metadata)
VALUES ($1, $2, COALESCE($3::timestamptz, now()), $4, $5)
RETURNING *;

-- name: ListPlantImages :many
SELECT * FROM plant_images WHERE plant_id = $1 ORDER BY uploaded_at DESC;

-- name: GetPlantImage :one
SELECT * FROM plant_images WHERE id = $1;
