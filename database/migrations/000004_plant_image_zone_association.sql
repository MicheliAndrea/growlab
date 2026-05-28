-- +goose Up
ALTER TABLE plant_images
  ADD COLUMN zone_id uuid REFERENCES zones(id) ON DELETE SET NULL;

UPDATE plant_images
SET zone_id = plants.zone_id
FROM plants
WHERE plant_images.plant_id = plants.id;

CREATE INDEX plant_images_zone_uploaded_idx ON plant_images(zone_id, uploaded_at DESC);

-- +goose Down
DROP INDEX IF EXISTS plant_images_zone_uploaded_idx;

ALTER TABLE plant_images
  DROP COLUMN IF EXISTS zone_id;
