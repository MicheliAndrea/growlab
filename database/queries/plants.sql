-- name: GetPlant :one
SELECT * FROM plants WHERE id = $1;

-- name: ListPlantsByZone :many
SELECT * FROM plants WHERE zone_id = $1 ORDER BY name;

-- name: ListPlantEvents :many
SELECT * FROM plant_events WHERE plant_id = $1 ORDER BY occurred_at DESC;

-- name: ListPlantImages :many
SELECT * FROM plant_images WHERE plant_id = $1 ORDER BY uploaded_at DESC;
