-- +goose Up
WITH selected AS (
  SELECT id
  FROM firmware_channels
  ORDER BY
    CASE
      WHEN name = 'stable' THEN 0
      WHEN is_default THEN 1
      ELSE 2
    END,
    created_at,
    id
  LIMIT 1
)
UPDATE firmware_channels
SET is_default = firmware_channels.id = selected.id
FROM selected;

CREATE UNIQUE INDEX firmware_channels_one_default_idx ON firmware_channels(is_default) WHERE is_default;

-- +goose Down
DROP INDEX IF EXISTS firmware_channels_one_default_idx;
