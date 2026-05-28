-- +goose Up
ALTER TABLE devices
  ADD COLUMN last_seen_at timestamptz;

CREATE INDEX devices_last_seen_idx ON devices(last_seen_at DESC);

-- +goose Down
DROP INDEX IF EXISTS devices_last_seen_idx;

ALTER TABLE devices
  DROP COLUMN IF EXISTS last_seen_at;
