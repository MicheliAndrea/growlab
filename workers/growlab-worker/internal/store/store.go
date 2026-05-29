package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("resource not found")

type Store struct {
	pool *pgxpool.Pool
}

type Heartbeat struct {
	DeviceID        string
	ObservedAt      time.Time
	Status          string
	IPAddress       *string
	RSSIDBm         *int32
	UptimeSeconds   *int64
	FirmwareVersion *string
	Metadata        []byte
}

type DeviceTouch struct {
	DeviceID        string
	DeviceUID       string
	SeenAt          time.Time
	Status          *string
	FirmwareVersion *string
}

type OTAStatus struct {
	DeviceID     string
	JobID        string
	Status       string
	ObservedAt   time.Time
	ErrorMessage *string
	Metadata     []byte
}

type SystemEvent struct {
	EventType  string
	Severity   string
	Source     string
	DeviceID   *string
	ZoneID     *string
	PlantID    *string
	Message    string
	Metadata   []byte
	OccurredAt time.Time
}

func New(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) DeviceIDByUID(ctx context.Context, deviceUID string) (string, error) {
	var id string
	err := s.pool.QueryRow(ctx, `SELECT id::text FROM devices WHERE device_uid = $1`, deviceUID).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return id, err
}

func (s *Store) SensorIDByDeviceUIDAndKey(ctx context.Context, deviceUID string, sensorKey string) (string, error) {
	var id string
	err := s.pool.QueryRow(ctx, `
SELECT s.id::text
FROM sensors s
JOIN devices d ON d.id = s.device_id
WHERE d.device_uid = $1
  AND s.sensor_key = $2
  AND s.enabled = true`,
		deviceUID,
		sensorKey,
	).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return id, err
}

func (s *Store) InsertSensorReading(ctx context.Context, sensorID string, recordedAt time.Time, value float64, metadata []byte) error {
	_, err := s.pool.Exec(ctx, `
INSERT INTO sensor_readings (sensor_id, recorded_at, value_double, metadata)
VALUES ($1::uuid, $2, $3, $4::jsonb)`,
		sensorID,
		recordedAt,
		value,
		metadata,
	)
	return err
}

func (s *Store) InsertDeviceHeartbeat(ctx context.Context, heartbeat Heartbeat) error {
	_, err := s.pool.Exec(ctx, `
INSERT INTO device_heartbeats (
  device_id,
  observed_at,
  status,
  ip_address,
  rssi_dbm,
  uptime_seconds,
  firmware_version,
  metadata
)
VALUES ($1::uuid, $2, $3, $4::inet, $5, $6, $7, $8::jsonb)`,
		heartbeat.DeviceID,
		heartbeat.ObservedAt,
		heartbeat.Status,
		nullableString(heartbeat.IPAddress),
		nullableInt32(heartbeat.RSSIDBm),
		nullableInt64(heartbeat.UptimeSeconds),
		nullableString(heartbeat.FirmwareVersion),
		heartbeat.Metadata,
	)
	return err
}

func (s *Store) TouchDevice(ctx context.Context, touch DeviceTouch) error {
	if touch.DeviceID != "" {
		return s.touchDeviceByID(ctx, touch)
	}
	return s.touchDeviceByUID(ctx, touch)
}

func (s *Store) touchDeviceByID(ctx context.Context, touch DeviceTouch) error {
	tag, err := s.pool.Exec(ctx, `
UPDATE devices
SET
  last_seen_at = $2,
  status = COALESCE($3, status),
  firmware_version = COALESCE($4, firmware_version),
  updated_at = now()
WHERE id = $1::uuid`,
		touch.DeviceID,
		touch.SeenAt,
		nullableString(touch.Status),
		nullableString(touch.FirmwareVersion),
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) touchDeviceByUID(ctx context.Context, touch DeviceTouch) error {
	tag, err := s.pool.Exec(ctx, `
UPDATE devices
SET
  last_seen_at = $2,
  status = COALESCE($3, status),
  firmware_version = COALESCE($4, firmware_version),
  updated_at = now()
WHERE device_uid = $1`,
		touch.DeviceUID,
		touch.SeenAt,
		nullableString(touch.Status),
		nullableString(touch.FirmwareVersion),
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) DeviceStatusByID(ctx context.Context, deviceID string) (string, error) {
	var status string
	err := s.pool.QueryRow(ctx, `SELECT COALESCE(status, '') FROM devices WHERE id = $1::uuid`, deviceID).Scan(&status)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return status, err
}

func (s *Store) OTAJobStatus(ctx context.Context, jobID string) (string, error) {
	var status string
	err := s.pool.QueryRow(ctx, `SELECT COALESCE(status, '') FROM ota_jobs WHERE id = $1::uuid`, jobID).Scan(&status)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return status, err
}

func (s *Store) InsertSystemEvent(ctx context.Context, event SystemEvent) error {
	metadata := event.Metadata
	if len(metadata) == 0 {
		metadata = []byte("{}")
	}
	severity := event.Severity
	if severity == "" {
		severity = "info"
	}
	source := event.Source
	if source == "" {
		source = "worker"
	}
	occurredAt := event.OccurredAt
	if occurredAt.IsZero() {
		occurredAt = time.Now().UTC()
	}
	_, err := s.pool.Exec(ctx, `
INSERT INTO system_events (event_type, severity, source, zone_id, plant_id, device_id, message, metadata, occurred_at)
VALUES ($1, $2, $3, $4::uuid, $5::uuid, $6::uuid, $7, $8::jsonb, $9)`,
		event.EventType,
		severity,
		source,
		nullableString(event.ZoneID),
		nullableString(event.PlantID),
		nullableString(event.DeviceID),
		event.Message,
		metadata,
		occurredAt,
	)
	return err
}

func (s *Store) UpdateOTAStatus(ctx context.Context, status OTAStatus) error {
	tag, err := s.pool.Exec(ctx, `
UPDATE ota_jobs
SET
  status = $3,
  started_at = CASE WHEN $3 IN ('running', 'in_progress') AND started_at IS NULL THEN $4 ELSE started_at END,
  completed_at = CASE WHEN $3 IN ('completed', 'failed', 'cancelled') THEN $4 ELSE completed_at END,
  error_message = $5,
  metadata = metadata || $6::jsonb,
  updated_at = now()
WHERE id = $1::uuid
  AND device_id = $2::uuid`,
		status.JobID,
		status.DeviceID,
		status.Status,
		status.ObservedAt,
		nullableString(status.ErrorMessage),
		status.Metadata,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func nullableString(value *string) any {
	if value == nil {
		return nil
	}
	return *value
}

func nullableInt32(value *int32) any {
	if value == nil {
		return nil
	}
	return *value
}

func nullableInt64(value *int64) any {
	if value == nil {
		return nil
	}
	return *value
}
