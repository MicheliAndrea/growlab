package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"

	"growlab/apps/api/internal/repositories"
	"growlab/apps/api/internal/shelly"
)

var ErrIrrigationDisabled = errors.New("irrigation disabled")

type DomainService struct {
	repo         *repositories.Repository
	shelly       *shelly.Client
	publicAPIURL string
	irrigation   IrrigationSafetyConfig
}

type IrrigationSafetyConfig struct {
	ManualFlagConfigured     bool
	AutomationFlagConfigured bool
}

func NewDomainService(repo *repositories.Repository, shellyClient *shelly.Client, publicAPIURL string, irrigation IrrigationSafetyConfig) *DomainService {
	return &DomainService{
		repo:         repo,
		shelly:       shellyClient,
		publicAPIURL: strings.TrimRight(publicAPIURL, "/"),
		irrigation:   irrigation,
	}
}

func (s *DomainService) ListZones(ctx context.Context) ([]repositories.Record, error) {
	return s.repo.Query(ctx, `SELECT * FROM zones ORDER BY name`)
}

func (s *DomainService) GetZone(ctx context.Context, id string) (repositories.Record, error) {
	return s.repo.QueryOne(ctx, `SELECT * FROM zones WHERE id = $1::uuid`, id)
}

func (s *DomainService) CreateZone(ctx context.Context, body map[string]any) (repositories.Record, error) {
	return s.repo.QueryOne(ctx, `
INSERT INTO zones (grow_area_id, name, slug, description, environment_type, metadata)
VALUES ($1::uuid, $2, $3, $4, COALESCE($5, 'indoor'), $6::jsonb)
RETURNING *`,
		stringField(body, "growAreaId"),
		stringField(body, "name"),
		stringField(body, "slug"),
		nullableString(body, "description"),
		nullableString(body, "environmentType"),
		jsonField(body, "metadata"),
	)
}

func (s *DomainService) UpdateZone(ctx context.Context, id string, body map[string]any) (repositories.Record, error) {
	return s.repo.QueryOne(ctx, `
UPDATE zones
SET grow_area_id = $2::uuid,
    name = $3,
    slug = $4,
    description = $5,
    environment_type = COALESCE($6, environment_type),
    metadata = $7::jsonb
WHERE id = $1::uuid
RETURNING *`,
		id,
		stringField(body, "growAreaId"),
		stringField(body, "name"),
		stringField(body, "slug"),
		nullableString(body, "description"),
		nullableString(body, "environmentType"),
		jsonField(body, "metadata"),
	)
}

func (s *DomainService) DeleteZone(ctx context.Context, id string) error {
	tag, err := s.repo.Exec(ctx, `DELETE FROM zones WHERE id = $1::uuid`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return repositories.ErrNotFound
	}
	return nil
}

func (s *DomainService) ListZoneProfiles(ctx context.Context, zoneID string) ([]repositories.Record, error) {
	return s.repo.Query(ctx, `SELECT * FROM zone_profiles WHERE zone_id = $1::uuid ORDER BY is_active DESC, name`, zoneID)
}

func (s *DomainService) CreateZoneProfile(ctx context.Context, zoneID string, body map[string]any) (repositories.Record, error) {
	return s.repo.QueryOne(ctx, `
INSERT INTO zone_profiles (zone_id, name, is_active, target_config, metadata)
VALUES ($1::uuid, $2, $3, $4::jsonb, $5::jsonb)
RETURNING *`,
		zoneID,
		stringField(body, "name"),
		boolField(body, "isActive", false),
		jsonField(body, "targetConfig"),
		jsonField(body, "metadata"),
	)
}

func (s *DomainService) ListPlants(ctx context.Context, zoneID string) ([]repositories.Record, error) {
	if zoneID != "" {
		return s.repo.Query(ctx, `SELECT * FROM plants WHERE zone_id = $1::uuid ORDER BY name`, zoneID)
	}
	return s.repo.Query(ctx, `SELECT * FROM plants ORDER BY name`)
}

func (s *DomainService) GetPlant(ctx context.Context, id string) (repositories.Record, error) {
	return s.repo.QueryOne(ctx, `SELECT * FROM plants WHERE id = $1::uuid`, id)
}

func (s *DomainService) CreatePlant(ctx context.Context, body map[string]any) (repositories.Record, error) {
	return s.repo.QueryOne(ctx, `
WITH created AS (
INSERT INTO plants (zone_id, species_id, name, code, current_health_status, planted_at, acquired_at, metadata)
VALUES ($1::uuid, $2::uuid, $3, $4, COALESCE($5, 'healthy'), $6::date, $7::date, $8::jsonb)
RETURNING *
),
history AS (
INSERT INTO plant_status_history (plant_id, health_status, source, notes, metadata)
SELECT id, current_health_status, 'manual', 'initial status', '{}'::jsonb
FROM created
RETURNING id
)
SELECT * FROM created`,
		nullableString(body, "zoneId"),
		nullableString(body, "speciesId"),
		stringField(body, "name"),
		nullableString(body, "code"),
		nullableString(body, "currentHealthStatus"),
		nullableString(body, "plantedAt"),
		nullableString(body, "acquiredAt"),
		jsonField(body, "metadata"),
	)
}

func (s *DomainService) UpdatePlant(ctx context.Context, id string, body map[string]any) (repositories.Record, error) {
	return s.repo.QueryOne(ctx, `
WITH previous AS (
SELECT id, current_health_status
FROM plants
WHERE id = $1::uuid
),
updated AS (
UPDATE plants
SET zone_id = $2::uuid,
    species_id = $3::uuid,
    name = $4,
    code = $5,
    current_health_status = COALESCE($6, current_health_status),
    planted_at = $7::date,
    acquired_at = $8::date,
    metadata = $9::jsonb
WHERE id = $1::uuid
RETURNING *
),
history AS (
INSERT INTO plant_status_history (plant_id, health_status, source, notes, metadata)
SELECT updated.id,
       updated.current_health_status,
       'manual',
       'status updated from API',
       jsonb_build_object('previousHealthStatus', previous.current_health_status)
FROM updated
JOIN previous ON previous.id = updated.id
WHERE updated.current_health_status IS DISTINCT FROM previous.current_health_status
RETURNING id
)
SELECT * FROM updated`,
		id,
		nullableString(body, "zoneId"),
		nullableString(body, "speciesId"),
		stringField(body, "name"),
		nullableString(body, "code"),
		nullableString(body, "currentHealthStatus"),
		nullableString(body, "plantedAt"),
		nullableString(body, "acquiredAt"),
		jsonField(body, "metadata"),
	)
}

func (s *DomainService) DeletePlant(ctx context.Context, id string) error {
	tag, err := s.repo.Exec(ctx, `DELETE FROM plants WHERE id = $1::uuid`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return repositories.ErrNotFound
	}
	return nil
}

func (s *DomainService) GetPlantTimeline(ctx context.Context, id string) ([]repositories.Record, error) {
	return s.repo.Query(ctx, `
SELECT id, 'event' AS type, event_type AS title, notes AS description, occurred_at, metadata
FROM plant_events
WHERE plant_id = $1::uuid
UNION ALL
SELECT id, 'image' AS type, COALESCE(original_filename, 'image') AS title, growth_stage AS description, uploaded_at AS occurred_at, metadata
FROM plant_images
WHERE plant_id = $1::uuid
UNION ALL
SELECT id, 'task' AS type, title, description, COALESCE(due_at, created_at) AS occurred_at, metadata
FROM plant_tasks
WHERE plant_id = $1::uuid
UNION ALL
SELECT id, 'health_status' AS type, health_status AS title, notes AS description, changed_at AS occurred_at, metadata
FROM plant_status_history
WHERE plant_id = $1::uuid
ORDER BY occurred_at DESC`,
		id,
	)
}

func (s *DomainService) ListPlantEvents(ctx context.Context, plantID string) ([]repositories.Record, error) {
	return s.repo.Query(ctx, `SELECT * FROM plant_events WHERE plant_id = $1::uuid ORDER BY occurred_at DESC`, plantID)
}

func (s *DomainService) CreatePlantEvent(ctx context.Context, plantID string, body map[string]any) (repositories.Record, error) {
	return s.repo.QueryOne(ctx, `
INSERT INTO plant_events (plant_id, event_type, occurred_at, notes, metadata)
VALUES ($1::uuid, $2, COALESCE($3::timestamptz, now()), $4, $5::jsonb)
RETURNING *`,
		plantID,
		stringField(body, "eventType"),
		nullableString(body, "occurredAt"),
		nullableString(body, "notes"),
		jsonField(body, "metadata"),
	)
}

func (s *DomainService) ListPlantImages(ctx context.Context, plantID string) ([]repositories.Record, error) {
	return s.repo.Query(ctx, `
SELECT plant_images.*,
       COALESCE(jsonb_agg(plant_image_tags.tag ORDER BY plant_image_tags.tag)
         FILTER (WHERE plant_image_tags.tag IS NOT NULL), '[]'::jsonb) AS tags
FROM plant_images
LEFT JOIN plant_image_tags ON plant_image_tags.plant_image_id = plant_images.id
WHERE plant_images.plant_id = $1::uuid
GROUP BY plant_images.id
ORDER BY plant_images.uploaded_at DESC`,
		plantID,
	)
}

func (s *DomainService) GetPlantImage(ctx context.Context, id string) (repositories.Record, error) {
	return s.repo.QueryOne(ctx, `
SELECT plant_images.*,
       COALESCE(jsonb_agg(plant_image_tags.tag ORDER BY plant_image_tags.tag)
         FILTER (WHERE plant_image_tags.tag IS NOT NULL), '[]'::jsonb) AS tags
FROM plant_images
LEFT JOIN plant_image_tags ON plant_image_tags.plant_image_id = plant_images.id
WHERE plant_images.id = $1::uuid
GROUP BY plant_images.id`,
		id,
	)
}

func (s *DomainService) CreatePlantImageMetadata(ctx context.Context, plantID string, body map[string]any) (repositories.Record, error) {
	return s.repo.QueryOne(ctx, `
WITH created AS (
INSERT INTO plant_images (plant_id, zone_id, storage_path, original_filename, content_type, size_bytes, checksum_sha256, captured_at, growth_stage, growth_tracking, metadata)
VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8::timestamptz, $9, $10::jsonb, $11::jsonb)
RETURNING *
),
tag_rows AS (
INSERT INTO plant_image_tags (plant_image_id, tag)
SELECT created.id, tag.value
FROM created, jsonb_array_elements_text($12::jsonb) AS tag(value)
ON CONFLICT DO NOTHING
RETURNING tag
)
SELECT created.*,
       COALESCE((SELECT jsonb_agg(tag ORDER BY tag) FROM tag_rows), '[]'::jsonb) AS tags
FROM created`,
		plantID,
		nullableString(body, "zoneId"),
		stringFieldDefault(body, "storagePath", "/data/images/pending"),
		nullableString(body, "originalFilename"),
		nullableString(body, "contentType"),
		nullableNumber(body, "sizeBytes"),
		nullableString(body, "checksumSha256"),
		nullableString(body, "capturedAt"),
		nullableString(body, "growthStage"),
		jsonField(body, "growthTracking"),
		jsonField(body, "metadata"),
		jsonArrayField(body, "tags"),
	)
}

func (s *DomainService) ListPlantTasks(ctx context.Context, plantID string) ([]repositories.Record, error) {
	return s.repo.Query(ctx, `SELECT * FROM plant_tasks WHERE plant_id = $1::uuid ORDER BY status, due_at NULLS LAST, created_at DESC`, plantID)
}

func (s *DomainService) CreatePlantTask(ctx context.Context, plantID string, body map[string]any) (repositories.Record, error) {
	return s.repo.QueryOne(ctx, `
INSERT INTO plant_tasks (plant_id, title, description, due_at, recurrence_config, metadata)
VALUES ($1::uuid, $2, $3, $4::timestamptz, $5::jsonb, $6::jsonb)
RETURNING *`,
		plantID,
		stringField(body, "title"),
		nullableString(body, "description"),
		nullableString(body, "dueAt"),
		jsonField(body, "recurrenceConfig"),
		jsonField(body, "metadata"),
	)
}

func (s *DomainService) ListSystemEvents(ctx context.Context) ([]repositories.Record, error) {
	return s.repo.Query(ctx, `SELECT * FROM system_events ORDER BY occurred_at DESC LIMIT 100`)
}

func (s *DomainService) CreateSystemEvent(ctx context.Context, body map[string]any) (repositories.Record, error) {
	return s.repo.QueryOne(ctx, `
INSERT INTO system_events (event_type, severity, source, zone_id, plant_id, device_id, alert_id, message, metadata, occurred_at)
VALUES ($1, COALESCE($2, 'info'), $3, $4::uuid, $5::uuid, $6::uuid, $7::uuid, $8, $9::jsonb, COALESCE($10::timestamptz, now()))
RETURNING *`,
		stringField(body, "eventType"),
		nullableString(body, "severity"),
		stringField(body, "source"),
		nullableString(body, "zoneId"),
		nullableString(body, "plantId"),
		nullableString(body, "deviceId"),
		nullableString(body, "alertId"),
		stringField(body, "message"),
		jsonField(body, "metadata"),
		nullableString(body, "occurredAt"),
	)
}

func (s *DomainService) ListSystemAlerts(ctx context.Context, status string) ([]repositories.Record, error) {
	if status != "" {
		return s.repo.Query(ctx, `SELECT * FROM system_alerts WHERE status = $1 ORDER BY raised_at DESC LIMIT 100`, status)
	}
	return s.repo.Query(ctx, `SELECT * FROM system_alerts ORDER BY raised_at DESC LIMIT 100`)
}

func (s *DomainService) CreateSystemAlert(ctx context.Context, body map[string]any) (repositories.Record, error) {
	return s.repo.QueryOne(ctx, `
INSERT INTO system_alerts (severity, source, title, message, status, metadata)
VALUES ($1, $2, $3, $4, 'active', $5::jsonb)
RETURNING *`,
		stringField(body, "severity"),
		stringField(body, "source"),
		stringField(body, "title"),
		stringField(body, "message"),
		jsonField(body, "metadata"),
	)
}

func (s *DomainService) UpdateSystemAlertStatus(ctx context.Context, id string, status string, body map[string]any) (repositories.Record, error) {
	changedBy := nullableString(body, "changedBy")
	return s.repo.QueryOne(ctx, `
UPDATE system_alerts
SET status = $2,
    acknowledged_by = CASE WHEN $2 = 'acknowledged' THEN $3 ELSE acknowledged_by END,
    acknowledged_at = CASE WHEN $2 = 'acknowledged' THEN now() ELSE acknowledged_at END,
    resolved_by = CASE WHEN $2 = 'resolved' THEN $3 ELSE resolved_by END,
    resolved_at = CASE WHEN $2 = 'resolved' THEN now() ELSE resolved_at END,
    updated_at = now()
WHERE id = $1::uuid
RETURNING *`,
		id,
		status,
		changedBy,
	)
}

func (s *DomainService) ListDevices(ctx context.Context) ([]repositories.Record, error) {
	return s.repo.Query(ctx, `SELECT * FROM devices ORDER BY name`)
}

func (s *DomainService) GetDevice(ctx context.Context, id string) (repositories.Record, error) {
	return s.repo.QueryOne(ctx, `SELECT * FROM devices WHERE id = $1::uuid`, id)
}

func (s *DomainService) ListDeviceCapabilities(ctx context.Context, deviceID string) ([]repositories.Record, error) {
	return s.repo.Query(ctx, `SELECT * FROM device_capabilities WHERE device_id = $1::uuid ORDER BY capability_type, capability_key`, deviceID)
}

func (s *DomainService) GetDeviceProvisioning(ctx context.Context, deviceID string) (repositories.Record, error) {
	return s.repo.QueryOne(ctx, `
SELECT id, device_id, status, provisioning_config, expires_at, claimed_at, metadata, created_at, updated_at
FROM device_provisioning_configs
WHERE device_id = $1::uuid
ORDER BY created_at DESC
LIMIT 1`,
		deviceID,
	)
}

func (s *DomainService) ListSensorCalibrations(ctx context.Context, sensorID string) ([]repositories.Record, error) {
	return s.repo.Query(ctx, `SELECT * FROM sensor_calibrations WHERE sensor_id = $1::uuid ORDER BY created_at DESC`, sensorID)
}

func (s *DomainService) CreateSensorCalibration(ctx context.Context, sensorID string, body map[string]any) (repositories.Record, error) {
	return s.repo.QueryOne(ctx, `
INSERT INTO sensor_calibrations (sensor_id, method, status, calibration_data, raw_points, notes, metadata)
VALUES ($1::uuid, COALESCE($2, 'linear'), COALESCE($3, 'draft'), $4::jsonb, $5::jsonb, $6, $7::jsonb)
RETURNING *`,
		sensorID,
		nullableString(body, "method"),
		nullableString(body, "status"),
		jsonField(body, "calibrationData"),
		jsonField(body, "rawPoints"),
		nullableString(body, "notes"),
		jsonField(body, "metadata"),
	)
}

func (s *DomainService) ListLightingSystems(ctx context.Context) ([]repositories.Record, error) {
	return s.repo.Query(ctx, `SELECT * FROM lighting_systems ORDER BY name`)
}

func (s *DomainService) GetLightingState(ctx context.Context, id string) (repositories.Record, error) {
	system, err := s.repo.QueryOne(ctx, `SELECT * FROM lighting_systems WHERE id = $1::uuid`, id)
	if err != nil {
		return nil, err
	}
	state, err := s.shellyState(ctx, system)
	if err != nil {
		_ = s.logLightingEvent(ctx, id, "state_failed", nil, "api", map[string]any{"error": err.Error()})
		return nil, err
	}
	return lightingStateRecord(system, state), nil
}

func (s *DomainService) ListLightingEvents(ctx context.Context, id string) ([]repositories.Record, error) {
	return s.repo.Query(ctx, `
SELECT *
FROM lighting_events
WHERE lighting_system_id = $1::uuid
ORDER BY occurred_at DESC
LIMIT 100`, id)
}

func (s *DomainService) ListLightingProfiles(ctx context.Context, zoneID string) ([]repositories.Record, error) {
	if zoneID != "" {
		return s.repo.Query(ctx, lightingProfileSelect+` WHERE lp.zone_id = $1::uuid ORDER BY lp.is_default DESC, lp.name`, zoneID)
	}
	return s.repo.Query(ctx, lightingProfileSelect+` ORDER BY lp.name`)
}

func (s *DomainService) CreateLightingProfile(ctx context.Context, body map[string]any) (repositories.Record, error) {
	return s.repo.QueryOne(ctx, `
WITH created AS (
INSERT INTO lighting_profiles (zone_id, lighting_system_id, name, enabled, is_default, timezone, metadata)
VALUES ($1::uuid, $2::uuid, $3, $4, $5, COALESCE($6, 'UTC'), $7::jsonb)
RETURNING *
),
step_rows AS (
INSERT INTO lighting_profile_steps (
  lighting_profile_id,
  step_order,
  at_time,
  action,
  brightness_percent,
  transition_seconds,
  metadata
)
SELECT
  created.id,
  (step.value->>'stepOrder')::integer,
  (step.value->>'atTime')::time,
  step.value->>'action',
  NULLIF(step.value->>'brightnessPercent', '')::integer,
  NULLIF(step.value->>'transitionSeconds', '')::integer,
  COALESCE(step.value->'metadata', '{}'::jsonb)
FROM created, jsonb_array_elements($8::jsonb) AS step(value)
RETURNING *
)
SELECT created.*,
       COALESCE((
         SELECT jsonb_agg(jsonb_build_object(
           'id', step_rows.id,
           'lightingProfileId', step_rows.lighting_profile_id,
           'stepOrder', step_rows.step_order,
           'atTime', step_rows.at_time,
           'action', step_rows.action,
           'brightnessPercent', step_rows.brightness_percent,
           'transitionSeconds', step_rows.transition_seconds,
           'metadata', step_rows.metadata,
           'createdAt', step_rows.created_at
         ) ORDER BY step_rows.step_order)
         FROM step_rows
       ), '[]'::jsonb) AS steps
FROM created`,
		stringField(body, "zoneId"),
		nullableString(body, "lightingSystemId"),
		stringField(body, "name"),
		boolField(body, "enabled", true),
		boolField(body, "isDefault", false),
		nullableString(body, "timezone"),
		jsonField(body, "metadata"),
		jsonArrayField(body, "steps"),
	)
}

func (s *DomainService) LightingCommand(ctx context.Context, id string, action string, body map[string]any) (repositories.Record, error) {
	system, err := s.repo.QueryOne(ctx, `SELECT * FROM lighting_systems WHERE id = $1::uuid`, id)
	if err != nil {
		return nil, err
	}
	endpoint, err := s.shellyEndpoint(system)
	if err != nil {
		_ = s.logLightingEvent(ctx, id, action+"_failed", nullableNumber(body, "brightnessPercent"), "api", map[string]any{"error": err.Error()})
		return nil, err
	}

	var state shelly.State
	switch action {
	case "on":
		state, err = s.shelly.TurnOn(ctx, endpoint)
	case "off":
		state, err = s.shelly.TurnOff(ctx, endpoint)
	case "brightness":
		state, err = s.shelly.SetBrightness(ctx, endpoint, intNumber(body, "brightnessPercent"))
	default:
		err = fmt.Errorf("unsupported lighting action %q", action)
	}
	if err != nil {
		_ = s.logLightingEvent(ctx, id, action+"_failed", nullableNumber(body, "brightnessPercent"), "api", map[string]any{"error": err.Error()})
		return nil, err
	}

	eventType := action
	if action == "brightness" {
		eventType = "brightness_changed"
	}
	metadata := map[string]any{
		"provider":          system["provider"],
		"state":             map[string]any{"isOn": state.IsOn, "brightnessPercent": state.BrightnessPercent, "source": state.Source},
		"requestedMetadata": body["metadata"],
	}
	if err := s.logLightingEvent(ctx, id, eventType, state.BrightnessPercent, "api", metadata); err != nil {
		return nil, err
	}
	return repositories.Record{
		"lightingSystemId":  id,
		"accepted":          true,
		"state":             map[string]any{"lightingSystemId": id, "isOn": state.IsOn, "brightnessPercent": state.BrightnessPercent, "source": state.Source, "provider": system["provider"], "endpointUrl": system["endpointUrl"]},
		"brightnessPercent": state.BrightnessPercent,
	}, nil
}

func (s *DomainService) shellyState(ctx context.Context, system repositories.Record) (shelly.State, error) {
	endpoint, err := s.shellyEndpoint(system)
	if err != nil {
		return shelly.State{}, err
	}
	return s.shelly.GetState(ctx, endpoint)
}

func (s *DomainService) shellyEndpoint(system repositories.Record) (string, error) {
	if s.shelly == nil {
		return "", fmt.Errorf("shelly client is not configured")
	}
	if provider, _ := system["provider"].(string); provider != "" && provider != "shelly" {
		return "", fmt.Errorf("lighting provider %q is not supported by Shelly client", provider)
	}
	if enabled, ok := system["enabled"].(bool); ok && !enabled {
		return "", fmt.Errorf("lighting system is disabled")
	}
	endpoint := endpointURL(system)
	if endpoint == "" {
		return "", fmt.Errorf("lighting system endpoint_url is required")
	}
	return endpoint, nil
}

func (s *DomainService) logLightingEvent(ctx context.Context, id string, eventType string, brightnessPercent any, source string, metadata map[string]any) error {
	_, err := s.repo.Exec(ctx, `
INSERT INTO lighting_events (lighting_system_id, event_type, brightness_percent, source, metadata)
VALUES ($1::uuid, $2, $3, $4, $5::jsonb)`,
		id,
		eventType,
		brightnessPercent,
		source,
		mustJSON(metadata),
	)
	return err
}

func lightingStateRecord(system repositories.Record, state shelly.State) repositories.Record {
	return repositories.Record{
		"lightingSystemId":  system["id"],
		"isOn":              state.IsOn,
		"brightnessPercent": state.BrightnessPercent,
		"source":            state.Source,
		"provider":          system["provider"],
		"endpointUrl":       system["endpointUrl"],
		"updatedAt":         system["updatedAt"],
	}
}

func endpointURL(system repositories.Record) string {
	endpoint, _ := system["endpointUrl"].(string)
	return endpoint
}

func intNumber(body map[string]any, key string) int {
	switch typed := nullableNumber(body, key).(type) {
	case int:
		return typed
	case int64:
		return int(typed)
	case float64:
		return int(typed)
	case string:
		parsed, _ := json.Number(typed).Int64()
		return int(parsed)
	default:
		return 0
	}
}

func (s *DomainService) ListFirmwareVersions(ctx context.Context) ([]repositories.Record, error) {
	return s.repo.Query(ctx, `SELECT * FROM firmware_versions ORDER BY created_at DESC`)
}

func (s *DomainService) GetFirmwareVersion(ctx context.Context, id string) (repositories.Record, error) {
	return s.repo.QueryOne(ctx, `SELECT * FROM firmware_versions WHERE id = $1::uuid`, id)
}

func (s *DomainService) CreateFirmwareVersion(ctx context.Context, body map[string]any) (repositories.Record, error) {
	return s.repo.QueryOne(ctx, `
INSERT INTO firmware_versions (device_type, version, channel_id, storage_path, checksum_sha256, size_bytes, metadata)
VALUES ($1, $2, COALESCE($3::uuid, '00000000-0000-0000-0000-000000000103'::uuid), $4, $5, $6, $7::jsonb)
RETURNING *`,
		stringField(body, "deviceType"),
		stringField(body, "version"),
		nullableString(body, "channelId"),
		stringField(body, "storagePath"),
		nullableString(body, "checksumSha256"),
		nullableNumber(body, "sizeBytes"),
		jsonField(body, "metadata"),
	)
}

func (s *DomainService) ListFirmwareChannels(ctx context.Context) ([]repositories.Record, error) {
	return s.repo.Query(ctx, `SELECT * FROM firmware_channels ORDER BY name`)
}

func (s *DomainService) ListOtaJobs(ctx context.Context, deviceID string) ([]repositories.Record, error) {
	return s.repo.Query(ctx, `
SELECT ota_jobs.*
FROM ota_jobs
WHERE device_id = $1::uuid
ORDER BY requested_at DESC`,
		deviceID,
	)
}

func (s *DomainService) CreateOtaJob(ctx context.Context, deviceID string, body map[string]any) (repositories.Record, error) {
	return s.repo.QueryOne(ctx, `
WITH device_record AS (
  SELECT id, device_uid, device_type
  FROM devices
  WHERE id = $1::uuid
),
firmware_record AS (
  SELECT id, device_type, version, checksum_sha256, size_bytes
  FROM firmware_versions
  WHERE id = $2::uuid
),
created AS (
  INSERT INTO ota_jobs (device_id, firmware_version_id, metadata)
  SELECT device_record.id, firmware_record.id, $3::jsonb
  FROM device_record, firmware_record
  RETURNING *
),
prepared AS (
  SELECT
    created.id,
    created.metadata ||
      jsonb_build_object(
        'dispatchMode', 'manual',
        'manualDispatchRequired', true,
        'mqttCommand', jsonb_build_object(
          'topic', 'growlab/devices/' || device_record.device_uid || '/ota/command',
          'payload', jsonb_build_object(
            'action', 'ota_update',
            'jobId', created.id::text,
            'firmwareVersionId', firmware_record.id::text,
            'version', firmware_record.version,
            'deviceType', firmware_record.device_type,
            'downloadUrl', $4 || '/api/firmware/' || firmware_record.id::text || '/file',
            'checksumSha256', firmware_record.checksum_sha256,
            'sizeBytes', firmware_record.size_bytes,
            'requestedAt', created.requested_at
          )
        )
      ) AS metadata
  FROM created, device_record, firmware_record
),
updated AS (
  UPDATE ota_jobs
  SET metadata = prepared.metadata,
      updated_at = now()
  FROM prepared
  WHERE ota_jobs.id = prepared.id
  RETURNING ota_jobs.*
)
SELECT * FROM updated`,
		deviceID,
		stringField(body, "firmwareVersionId"),
		jsonField(body, "metadata"),
		s.publicAPIURL,
	)
}

func (s *DomainService) CreateOtaDryRun(ctx context.Context, deviceID string, body map[string]any) (repositories.Record, error) {
	return s.repo.QueryOne(ctx, `
WITH device_record AS (
  SELECT id, device_type, firmware_version
  FROM devices
  WHERE id = $1::uuid
),
firmware_record AS (
  SELECT id, device_type, version, checksum_sha256
  FROM firmware_versions
  WHERE id = $2::uuid
),
report AS (
  SELECT
    CASE WHEN device_record.device_type = firmware_record.device_type THEN 'passed' ELSE 'failed' END AS status,
    jsonb_build_object(
      'checks', jsonb_build_array(
        jsonb_build_object('name', 'device_selected', 'passed', true),
        jsonb_build_object('name', 'firmware_selected', 'passed', true),
        jsonb_build_object('name', 'device_type_matches', 'passed', device_record.device_type = firmware_record.device_type, 'deviceType', device_record.device_type, 'firmwareDeviceType', firmware_record.device_type),
        jsonb_build_object('name', 'manual_confirmation_required', 'passed', false)
      ),
      'currentFirmwareVersion', device_record.firmware_version,
      'targetFirmwareVersion', firmware_record.version,
      'checksumSha256', firmware_record.checksum_sha256
    ) AS compatibility_report
  FROM device_record, firmware_record
)
INSERT INTO ota_dry_runs (device_id, firmware_version_id, status, completed_at, compatibility_report, metadata)
SELECT $1::uuid, $2::uuid, report.status, now(), report.compatibility_report, $3::jsonb
FROM report
RETURNING *`,
		deviceID,
		stringField(body, "firmwareVersionId"),
		jsonField(body, "metadata"),
	)
}

func (s *DomainService) ListIrrigationSystems(ctx context.Context) ([]repositories.Record, error) {
	return s.repo.Query(ctx, `
SELECT
  id,
  zone_id,
  name,
  provider,
  false AS enabled,
  false AS automation_enabled,
  config,
  metadata ||
    jsonb_build_object(
      'safeMode', true,
      'manualRunEnabled', false,
      'automationEnabled', false,
      'manualFlagConfigured', $1::boolean,
      'automationFlagConfigured', $2::boolean,
      'disabledReason', 'IRRIGATION_DISABLED'
    ) AS metadata,
  created_at,
  updated_at
FROM irrigation_systems
ORDER BY name`,
		s.irrigation.ManualFlagConfigured,
		s.irrigation.AutomationFlagConfigured,
	)
}

func (s *DomainService) GetIrrigationSafety(context.Context) (repositories.Record, error) {
	return repositories.Record{
		"code":                      "IRRIGATION_DISABLED",
		"safeMode":                  true,
		"manualRunEnabled":          false,
		"automationEnabled":         false,
		"manualFlagConfigured":      s.irrigation.ManualFlagConfigured,
		"automationFlagConfigured":  s.irrigation.AutomationFlagConfigured,
		"manualRunResponseStatus":   409,
		"manualRunResponseCode":     "IRRIGATION_DISABLED",
		"pumpCommandsEnabled":       false,
		"automationCommandsEnabled": false,
	}, nil
}

func (s *DomainService) RunIrrigationManual(context.Context, string) error {
	return ErrIrrigationDisabled
}

func (s *DomainService) ListPlantWiki(ctx context.Context, table string) ([]repositories.Record, error) {
	switch table {
	case "families":
		return s.repo.Query(ctx, `SELECT * FROM plant_families ORDER BY scientific_name`)
	case "categories":
		return s.repo.Query(ctx, `SELECT * FROM plant_categories ORDER BY name`)
	case "species":
		return s.repo.Query(ctx, `SELECT * FROM plant_species ORDER BY scientific_name, cultivar`)
	default:
		return nil, fmt.Errorf("unknown wiki table: %s", table)
	}
}

const lightingProfileSelect = `
SELECT lp.*,
       COALESCE((
         SELECT jsonb_agg(jsonb_build_object(
           'id', lps.id,
           'lightingProfileId', lps.lighting_profile_id,
           'stepOrder', lps.step_order,
           'atTime', lps.at_time,
           'action', lps.action,
           'brightnessPercent', lps.brightness_percent,
           'transitionSeconds', lps.transition_seconds,
           'metadata', lps.metadata,
           'createdAt', lps.created_at
         ) ORDER BY lps.step_order)
         FROM lighting_profile_steps lps
         WHERE lps.lighting_profile_id = lp.id
       ), '[]'::jsonb) AS steps
FROM lighting_profiles lp`

func stringField(body map[string]any, key string) string {
	value, _ := body[key].(string)
	return value
}

func stringFieldDefault(body map[string]any, key string, fallback string) string {
	value := stringField(body, key)
	if value == "" {
		return fallback
	}
	return value
}

func nullableString(body map[string]any, key string) any {
	value, ok := body[key]
	if !ok || value == nil {
		return nil
	}
	text, ok := value.(string)
	if !ok || text == "" {
		return nil
	}
	return text
}

func nullableNumber(body map[string]any, key string) any {
	value, ok := body[key]
	if !ok {
		return nil
	}
	switch typed := value.(type) {
	case float64:
		if typed == math.Trunc(typed) {
			return int64(typed)
		}
		return typed
	case int:
		return typed
	case int64:
		return typed
	case json.Number:
		return typed.String()
	default:
		return nil
	}
}

func boolField(body map[string]any, key string, fallback bool) bool {
	value, ok := body[key]
	if !ok {
		return fallback
	}
	typed, ok := value.(bool)
	if !ok {
		return fallback
	}
	return typed
}

func jsonArrayField(body map[string]any, key string) []byte {
	value, ok := body[key]
	if !ok || value == nil {
		return []byte("[]")
	}
	switch typed := value.(type) {
	case []any:
		return mustJSON(typed)
	case []string:
		return mustJSON(typed)
	default:
		return []byte("[]")
	}
}

func jsonField(body map[string]any, key string) []byte {
	value, ok := body[key]
	if !ok || value == nil {
		return []byte("{}")
	}
	return mustJSON(value)
}

func mustJSON(value any) []byte {
	data, err := json.Marshal(value)
	if err != nil {
		return []byte("{}")
	}
	return data
}
