-- name: GetGrowArea :one
SELECT * FROM grow_areas WHERE id = $1;

-- name: ListGrowAreas :many
SELECT * FROM grow_areas ORDER BY name;

-- name: GetZone :one
SELECT * FROM zones WHERE id = $1;

-- name: ListZonesByGrowArea :many
SELECT * FROM zones WHERE grow_area_id = $1 ORDER BY name;

-- name: GetPlantFamily :one
SELECT * FROM plant_families WHERE id = $1;

-- name: ListPlantFamilies :many
SELECT * FROM plant_families ORDER BY scientific_name;

-- name: GetPlantCategory :one
SELECT * FROM plant_categories WHERE id = $1;

-- name: ListPlantCategories :many
SELECT * FROM plant_categories ORDER BY name;

-- name: GetPlantSpecies :one
SELECT * FROM plant_species WHERE id = $1;

-- name: ListPlantSpecies :many
SELECT * FROM plant_species ORDER BY scientific_name, cultivar;
