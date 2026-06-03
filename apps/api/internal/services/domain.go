package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"net/url"
	"reflect"
	"strconv"
	"strings"

	"growlab/apps/api/internal/repositories"
	"growlab/apps/api/internal/shelly"
)

var ErrIrrigationDisabled = errors.New("irrigation disabled")

type DomainService struct {
	repo         *repositories.Repository
	shelly       *shelly.Client
	publicAPIURL string
	publicWebURL string
	irrigation   IrrigationSafetyConfig
}

type IrrigationSafetyConfig struct {
	ManualFlagConfigured     bool
	AutomationFlagConfigured bool
}

func NewDomainService(repo *repositories.Repository, shellyClient *shelly.Client, publicAPIURL string, publicWebURL string, irrigation IrrigationSafetyConfig) *DomainService {
	return &DomainService{
		repo:         repo,
		shelly:       shellyClient,
		publicAPIURL: strings.TrimRight(publicAPIURL, "/"),
		publicWebURL: strings.TrimRight(publicWebURL, "/"),
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
	if boolField(body, "isActive", false) {
		var record repositories.Record
		err := s.repo.WithTx(ctx, func(repo *repositories.Repository) error {
			if _, err := repo.Exec(ctx, `UPDATE zone_profiles SET is_active = false, updated_at = now() WHERE zone_id = $1::uuid`, zoneID); err != nil {
				return err
			}
			created, err := repo.QueryOne(ctx, `
INSERT INTO zone_profiles (zone_id, name, is_active, target_config, metadata)
VALUES ($1::uuid, $2, true, $3::jsonb, $4::jsonb)
RETURNING *`,
				zoneID,
				stringField(body, "name"),
				jsonField(body, "targetConfig"),
				jsonField(body, "metadata"),
			)
			if err != nil {
				return err
			}
			record = created
			return nil
		})
		return record, err
	}

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

func (s *DomainService) ActivateZoneProfile(ctx context.Context, zoneID string, profileID string) (repositories.Record, error) {
	var record repositories.Record
	err := s.repo.WithTx(ctx, func(repo *repositories.Repository) error {
		if _, err := repo.Exec(ctx, `UPDATE zone_profiles SET is_active = false, updated_at = now() WHERE zone_id = $1::uuid`, zoneID); err != nil {
			return err
		}
		activated, err := repo.QueryOne(ctx, `
UPDATE zone_profiles
SET is_active = true,
    updated_at = now()
WHERE id = $1::uuid
  AND zone_id = $2::uuid
RETURNING *`,
			profileID,
			zoneID,
		)
		if err != nil {
			return err
		}
		record = activated
		return nil
	})
	return record, err
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

func (s *DomainService) UpdatePlantImageMetadata(ctx context.Context, id string, body map[string]any) (repositories.Record, error) {
	return s.repo.QueryOne(ctx, `
WITH updated AS (
  UPDATE plant_images
  SET growth_stage = $2,
      growth_tracking = $3::jsonb,
      metadata = metadata || $4::jsonb
  WHERE id = $1::uuid
  RETURNING *
),
deleted_tags AS (
  DELETE FROM plant_image_tags
  WHERE plant_image_id = (SELECT id FROM updated)
  RETURNING 1
),
inserted_tags AS (
  INSERT INTO plant_image_tags (plant_image_id, tag)
  SELECT updated.id, tag.value
  FROM updated, jsonb_array_elements_text($5::jsonb) AS tag(value)
  ON CONFLICT DO NOTHING
  RETURNING tag
)
SELECT updated.*,
       COALESCE((
         SELECT jsonb_agg(plant_image_tags.tag ORDER BY plant_image_tags.tag)
         FROM plant_image_tags
         WHERE plant_image_tags.plant_image_id = updated.id
       ), '[]'::jsonb) AS tags
FROM updated`,
		id,
		nullableString(body, "growthStage"),
		jsonField(body, "growthTracking"),
		jsonField(body, "metadata"),
		jsonArrayField(body, "tags"),
	)
}

func (s *DomainService) CreatePlantImageMetadata(ctx context.Context, plantID string, body map[string]any) (repositories.Record, error) {
	result, err := s.repo.QueryOne(ctx, `
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
	if err != nil {
		s.emitSystemEvent(ctx, systemEventInput{
			EventType: "image_upload_failed",
			Severity:  "warning",
			Source:    "api",
			PlantID:   plantID,
			Message:   fmt.Sprintf("image upload metadata insert failed for plant %s", plantID),
			Metadata: map[string]any{
				"plantId": plantID,
				"error":   err.Error(),
			},
		})
		return result, err
	}
	imageID, _ := result["id"].(string)
	zoneID, _ := result["zoneId"].(string)
	s.emitSystemEvent(ctx, systemEventInput{
		EventType: "image_uploaded",
		Severity:  "info",
		Source:    "api",
		PlantID:   plantID,
		ZoneID:    zoneID,
		Message:   fmt.Sprintf("plant image %s uploaded for plant %s", imageID, plantID),
		Metadata: map[string]any{
			"plantImageId": imageID,
			"plantId":      plantID,
			"contentType":  result["contentType"],
			"sizeBytes":    result["sizeBytes"],
		},
	})
	return result, nil
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

func (s *DomainService) UpdatePlantTask(ctx context.Context, plantID string, taskID string, body map[string]any) (repositories.Record, error) {
	return s.repo.QueryOne(ctx, `
UPDATE plant_tasks
SET status = $3,
    completed_at = CASE
      WHEN $3 = 'done' THEN COALESCE($4::timestamptz, now())
      WHEN $3 = 'todo' THEN NULL
      ELSE completed_at
    END,
    metadata = metadata || $5::jsonb,
    updated_at = now()
WHERE id = $1::uuid
  AND plant_id = $2::uuid
RETURNING *`,
		taskID,
		plantID,
		stringField(body, "status"),
		nullableString(body, "completedAt"),
		jsonField(body, "metadata"),
	)
}

func (s *DomainService) ListSystemEvents(ctx context.Context) ([]repositories.Record, error) {
	return s.repo.Query(ctx, `SELECT * FROM system_events ORDER BY occurred_at DESC LIMIT 100`)
}

type systemEventInput struct {
	EventType string
	Severity  string
	Source    string
	DeviceID  string
	ZoneID    string
	PlantID   string
	AlertID   string
	Message   string
	Metadata  map[string]any
}

func (s *DomainService) emitSystemEvent(ctx context.Context, ev systemEventInput) {
	severity := ev.Severity
	if severity == "" {
		severity = "info"
	}
	source := ev.Source
	if source == "" {
		source = "api"
	}
	_, err := s.repo.Exec(ctx, `
INSERT INTO system_events (event_type, severity, source, zone_id, plant_id, device_id, alert_id, message, metadata)
VALUES ($1, $2, $3, NULLIF($4, '')::uuid, NULLIF($5, '')::uuid, NULLIF($6, '')::uuid, NULLIF($7, '')::uuid, $8, $9::jsonb)`,
		ev.EventType,
		severity,
		source,
		ev.ZoneID,
		ev.PlantID,
		ev.DeviceID,
		ev.AlertID,
		ev.Message,
		mustJSON(ev.Metadata),
	)
	if err != nil {
		slog.Default().Warn("system event insert failed", "eventType", ev.EventType, "error", err)
	}
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

func (s *DomainService) ListAutomationRules(ctx context.Context) ([]repositories.Record, error) {
	return s.repo.Query(ctx, `SELECT * FROM automation_rules ORDER BY enabled DESC, updated_at DESC, name`)
}

func (s *DomainService) CreateAutomationRule(ctx context.Context, body map[string]any) (repositories.Record, error) {
	name := stringField(body, "name")
	slug := stringField(body, "slug")
	if slug == "" {
		slug = slugify(name)
	}
	return s.repo.QueryOne(ctx, `
INSERT INTO automation_rules (
  name,
  slug,
  description,
  enabled,
  severity,
  condition_config,
  action_config,
  metadata,
  trigger_mode,
  schedule_interval_seconds,
  scheduler_commit,
  cooldown_seconds,
  next_run_at
)
VALUES (
  $1, $2, $3, $4, COALESCE($5, 'warning'), $6::jsonb, $7::jsonb, $8::jsonb,
  COALESCE($9, 'manual'), $10, $11, $12,
  CASE WHEN COALESCE($9, 'manual') = 'scheduled' THEN COALESCE($13::timestamptz, now()) ELSE $13::timestamptz END
)
RETURNING *`,
		name,
		slug,
		nullableString(body, "description"),
		boolField(body, "enabled", true),
		nullableString(body, "severity"),
		jsonField(body, "conditionConfig"),
		jsonField(body, "actionConfig"),
		jsonField(body, "metadata"),
		nullableString(body, "triggerMode"),
		nullableInt(body, "scheduleIntervalSeconds"),
		boolField(body, "schedulerCommit", false),
		intField(body, "cooldownSeconds", 0),
		nullableString(body, "nextRunAt"),
	)
}

func (s *DomainService) ListAutomationRuleEvaluations(ctx context.Context, id string) ([]repositories.Record, error) {
	return s.repo.Query(ctx, `
SELECT *
FROM automation_rule_evaluations
WHERE rule_id = $1::uuid
ORDER BY evaluated_at DESC
LIMIT 50`,
		id,
	)
}

func (s *DomainService) EvaluateAutomationRule(ctx context.Context, id string, body map[string]any) (repositories.Record, error) {
	rule, err := s.repo.QueryOne(ctx, `SELECT * FROM automation_rules WHERE id = $1::uuid`, id)
	if err != nil {
		return nil, err
	}

	return s.evaluateAutomationRuleRecord(ctx, rule, id, objectValue(body["evaluationContext"]), boolField(body, "commit", false), nullableString(body, "evaluatedBy"))
}

func (s *DomainService) RunScheduledAutomationRules(ctx context.Context, limit int) ([]repositories.Record, error) {
	if limit <= 0 {
		limit = 25
	}
	var results []repositories.Record

	err := s.repo.WithTx(ctx, func(txRepo *repositories.Repository) error {
		txService := *s
		txService.repo = txRepo

		evaluationContext, err := txService.BuildAutomationEvaluationContext(ctx)
		if err != nil {
			return err
		}

		rules, err := txRepo.Query(ctx, `
SELECT *
FROM automation_rules
WHERE enabled = true
  AND trigger_mode = 'scheduled'
  AND COALESCE(schedule_interval_seconds, 0) > 0
  AND (next_run_at IS NULL OR next_run_at <= now())
  AND (
    COALESCE(cooldown_seconds, 0) = 0
    OR last_matched_at IS NULL
    OR last_matched_at <= now() - make_interval(secs => cooldown_seconds)
  )
ORDER BY next_run_at NULLS FIRST, updated_at
LIMIT $1
FOR UPDATE SKIP LOCKED`,
			limit,
		)
		if err != nil {
			return err
		}

		for _, rule := range rules {
			ruleID := stringValue(rule["id"])
			commit, _ := rule["schedulerCommit"].(bool)
			evaluation, err := txService.evaluateAutomationRuleRecord(ctx, rule, ruleID, evaluationContext, commit, "rules-scheduler")
			status := "failed"
			schedulerError := any(nil)
			if err != nil {
				schedulerError = err.Error()
				_, updateErr := txRepo.Exec(ctx, `
UPDATE automation_rules
SET last_scheduler_run_at = now(),
    next_run_at = CASE
      WHEN schedule_interval_seconds IS NULL THEN NULL
      ELSE now() + make_interval(secs => schedule_interval_seconds)
    END,
    scheduler_status = 'failed',
    scheduler_error = $2,
    updated_at = now()
WHERE id = $1::uuid`,
					ruleID,
					schedulerError,
				)
				if updateErr != nil {
					return updateErr
				}
				results = append(results, repositories.Record{
					"ruleId": ruleID,
					"status": status,
					"error":  schedulerError,
				})
				continue
			}

			if matched, _ := evaluation["matched"].(bool); matched {
				status = "matched"
			} else {
				status = "not_matched"
			}
			_, err = txRepo.Exec(ctx, `
UPDATE automation_rules
SET last_scheduler_run_at = now(),
    next_run_at = CASE
      WHEN schedule_interval_seconds IS NULL THEN NULL
      ELSE now() + make_interval(secs => schedule_interval_seconds)
    END,
    scheduler_status = $2,
    scheduler_error = NULL,
    updated_at = now()
WHERE id = $1::uuid`,
				ruleID,
				status,
			)
			if err != nil {
				return err
			}
			results = append(results, repositories.Record{
				"ruleId":       ruleID,
				"status":       status,
				"evaluationId": evaluation["id"],
				"matched":      evaluation["matched"],
			})
		}

		return nil
	})

	return results, err
}

func (s *DomainService) BuildAutomationEvaluationContext(ctx context.Context) (map[string]any, error) {
	counts, err := s.repo.QueryOne(ctx, `
SELECT
  (SELECT count(*) FROM devices) AS devices_total,
  (SELECT count(*) FROM devices WHERE status = 'online') AS devices_online,
  (SELECT count(*) FROM devices WHERE status <> 'online') AS devices_offline,
  (SELECT count(*) FROM plants) AS plants_total,
  (SELECT count(*) FROM system_alerts WHERE status = 'active') AS active_alerts,
  (SELECT count(*) FROM zones) AS zones_total`)
	if err != nil {
		return nil, err
	}

	plantHealthRows, err := s.repo.Query(ctx, `
SELECT current_health_status AS status, count(*) AS count
FROM plants
GROUP BY current_health_status`)
	if err != nil {
		return nil, err
	}
	plantHealth := map[string]any{}
	for _, row := range plantHealthRows {
		plantHealth[stringValue(row["status"])] = row["count"]
	}

	latestTelemetryRows, err := s.repo.Query(ctx, `
WITH latest AS (
  SELECT DISTINCT ON (s.sensor_type)
    s.sensor_type,
    s.name AS sensor_name,
    sr.value,
    sr.unit,
    sr.recorded_at,
    z.name AS zone_name
  FROM sensor_readings sr
  JOIN sensors s ON s.id = sr.sensor_id
  LEFT JOIN zones z ON z.id = sr.zone_id
  ORDER BY s.sensor_type, sr.recorded_at DESC
)
SELECT * FROM latest`)
	if err != nil {
		return nil, err
	}
	latestTelemetry := map[string]any{}
	for _, row := range latestTelemetryRows {
		latestTelemetry[stringValue(row["sensorType"])] = map[string]any{
			"sensorName": row["sensorName"],
			"value":      row["value"],
			"unit":       row["unit"],
			"recordedAt": row["recordedAt"],
			"zoneName":   row["zoneName"],
		}
	}

	recentAlerts, err := s.repo.Query(ctx, `
SELECT id, severity, source, title, message, raised_at
FROM system_alerts
WHERE status = 'active'
ORDER BY raised_at DESC
LIMIT 10`)
	if err != nil {
		return nil, err
	}

	return map[string]any{
		"counts": map[string]any{
			"devicesTotal":   counts["devicesTotal"],
			"devicesOnline":  counts["devicesOnline"],
			"devicesOffline": counts["devicesOffline"],
			"plantsTotal":    counts["plantsTotal"],
			"activeAlerts":   counts["activeAlerts"],
			"zonesTotal":     counts["zonesTotal"],
		},
		"plantHealth":     plantHealth,
		"latestTelemetry": latestTelemetry,
		"activeAlerts":    recentAlerts,
	}, nil
}

func (s *DomainService) evaluateAutomationRuleRecord(ctx context.Context, rule repositories.Record, id string, evaluationContext map[string]any, commit bool, evaluatedBy any) (repositories.Record, error) {
	mode := "dry_run"
	if commit {
		mode = "committed"
	}

	enabled, _ := rule["enabled"].(bool)
	matched := false
	result := repositories.Record{
		"matched": false,
		"reason":  "rule_disabled",
	}
	if enabled {
		matched, result = evaluateAutomationCondition(objectValue(rule["conditionConfig"]), evaluationContext)
	}

	actions := s.evaluateAutomationActions(ctx, rule, evaluationContext, matched, commit)
	evaluation, err := s.repo.QueryOne(ctx, `
INSERT INTO automation_rule_evaluations (rule_id, matched, mode, evaluation_context, result, actions, evaluated_by)
VALUES ($1::uuid, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7)
RETURNING *`,
		id,
		matched,
		mode,
		mustJSON(evaluationContext),
		mustJSON(result),
		mustJSON(actions),
		evaluatedBy,
	)
	if err != nil {
		return nil, err
	}

	_, err = s.repo.Exec(ctx, `
UPDATE automation_rules
SET last_evaluated_at = now(),
    last_matched_at = CASE WHEN $2 THEN now() ELSE last_matched_at END,
    updated_at = now()
WHERE id = $1::uuid`,
		id,
		matched,
	)
	if err != nil {
		return nil, err
	}

	return evaluation, nil
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

func (s *DomainService) CreateDeviceCapability(ctx context.Context, deviceID string, body map[string]any) (repositories.Record, error) {
	return s.repo.QueryOne(ctx, `
INSERT INTO device_capabilities (device_id, capability_key, capability_type, enabled, config, metadata)
VALUES ($1::uuid, $2, $3, $4, $5::jsonb, $6::jsonb)
RETURNING *`,
		deviceID,
		stringField(body, "capabilityKey"),
		stringField(body, "capabilityType"),
		boolField(body, "enabled", true),
		jsonField(body, "config"),
		jsonField(body, "metadata"),
	)
}

func (s *DomainService) UpdateDeviceCapability(ctx context.Context, deviceID string, capabilityID string, body map[string]any) (repositories.Record, error) {
	return s.repo.QueryOne(ctx, `
UPDATE device_capabilities
SET enabled = $3,
    metadata = metadata || $4::jsonb,
    updated_at = now()
WHERE id = $1::uuid
  AND device_id = $2::uuid
RETURNING *`,
		capabilityID,
		deviceID,
		boolField(body, "enabled", false),
		jsonField(body, "metadata"),
	)
}

func (s *DomainService) GetDeviceProvisioning(ctx context.Context, deviceID string) (repositories.Record, error) {
	return s.repo.QueryOne(ctx, `
SELECT id, device_id, status, provisioning_config, expires_at, claimed_at, claim_attempts, last_claim_attempt_at, claimed_metadata, metadata, created_at, updated_at
FROM device_provisioning_configs
WHERE device_id = $1::uuid
ORDER BY created_at DESC
LIMIT 1`,
		deviceID,
	)
}

func (s *DomainService) CreateDeviceProvisioning(ctx context.Context, deviceID string, body map[string]any) (repositories.Record, error) {
	token, tokenHash, err := generateProvisioningToken()
	if err != nil {
		return nil, err
	}

	record, err := s.repo.QueryOne(ctx, `
WITH device_record AS (
  SELECT id
  FROM devices
  WHERE id = $1::uuid
),
revoked AS (
  UPDATE device_provisioning_configs
  SET status = 'revoked',
      updated_at = now()
  WHERE device_id = $1::uuid
    AND status = 'pending'
  RETURNING 1
),
created AS (
  INSERT INTO device_provisioning_configs (
    device_id,
    status,
    token_hash,
    provisioning_config,
    expires_at,
    metadata
  )
  SELECT
    device_record.id,
    'pending',
    $2,
    COALESCE($3::jsonb, '{}'::jsonb),
    COALESCE($4::timestamptz, now() + interval '7 days'),
    COALESCE($5::jsonb, '{}'::jsonb)
  FROM device_record
  RETURNING id, device_id, status, provisioning_config, expires_at, claimed_at, claim_attempts, last_claim_attempt_at, claimed_metadata, metadata, created_at, updated_at
)
SELECT * FROM created`,
		deviceID,
		tokenHash,
		jsonField(body, "provisioningConfig"),
		nullableString(body, "expiresAt"),
		jsonField(body, "metadata"),
	)
	if err != nil {
		return nil, err
	}

	record["claimToken"] = token
	if claimURL := s.provisioningClaimURL(token); claimURL != "" {
		record["claimUrl"] = claimURL
	}
	return record, nil
}

func (s *DomainService) UpdateDeviceProvisioning(ctx context.Context, deviceID string, provisioningID string, body map[string]any) (repositories.Record, error) {
	status := stringField(body, "status")
	record, err := s.repo.QueryOne(ctx, `
UPDATE device_provisioning_configs
SET status = $3,
    expires_at = CASE
      WHEN $3 = 'expired' THEN COALESCE($4::timestamptz, now())
      ELSE expires_at
    END,
    metadata = metadata || $5::jsonb,
    updated_at = now()
WHERE id = $1::uuid
  AND device_id = $2::uuid
RETURNING id, device_id, status, provisioning_config, expires_at, claimed_at, claim_attempts, last_claim_attempt_at, claimed_metadata, metadata, created_at, updated_at`,
		provisioningID,
		deviceID,
		status,
		nullableString(body, "expiresAt"),
		jsonField(body, "metadata"),
	)
	if err != nil {
		return nil, err
	}

	eventType := "device_provisioning_updated"
	if status == "revoked" {
		eventType = "device_provisioning_revoked"
	}
	if status == "expired" {
		eventType = "device_provisioning_expired"
	}
	s.emitSystemEvent(ctx, systemEventInput{
		EventType: eventType,
		Severity:  "info",
		Source:    "api",
		DeviceID:  deviceID,
		Message:   fmt.Sprintf("device provisioning %s set to %s", provisioningID, status),
		Metadata: map[string]any{
			"deviceProvisioningConfigId": provisioningID,
			"status":                     status,
		},
	})

	return record, nil
}

func (s *DomainService) PreviewDeviceProvisioningClaim(ctx context.Context, token string) (repositories.Record, error) {
	tokenHash := hashProvisioningToken(token)
	return s.repo.QueryOne(ctx, `
WITH expired AS (
  UPDATE device_provisioning_configs
  SET status = 'expired',
      updated_at = now()
  WHERE token_hash = $1
    AND status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at <= now()
  RETURNING 1
)
SELECT
  dpc.id,
  dpc.device_id,
  d.name AS device_name,
  d.device_uid,
  d.device_type,
  dpc.status,
  dpc.provisioning_config,
  dpc.expires_at,
  dpc.claimed_at,
  dpc.claim_attempts,
  dpc.last_claim_attempt_at,
  dpc.claimed_metadata,
  dpc.metadata,
  dpc.created_at,
  dpc.updated_at
FROM device_provisioning_configs dpc
LEFT JOIN devices d ON d.id = dpc.device_id
WHERE dpc.token_hash = $1
ORDER BY dpc.created_at DESC
LIMIT 1`,
		tokenHash,
	)
}

func (s *DomainService) ClaimDeviceProvisioning(ctx context.Context, token string, body map[string]any) (repositories.Record, error) {
	tokenHash := hashProvisioningToken(token)
	record, err := s.repo.QueryOne(ctx, `
UPDATE device_provisioning_configs
SET status = 'claimed',
    claimed_at = COALESCE(claimed_at, now()),
    claim_attempts = claim_attempts + 1,
    last_claim_attempt_at = now(),
    claimed_metadata = claimed_metadata || $2::jsonb,
    updated_at = now()
WHERE token_hash = $1
  AND status = 'pending'
  AND (expires_at IS NULL OR expires_at > now())
RETURNING id, device_id, status, provisioning_config, expires_at, claimed_at, claim_attempts, last_claim_attempt_at, claimed_metadata, metadata, created_at, updated_at`,
		tokenHash,
		jsonField(body, "claimMetadata"),
	)
	if err != nil {
		return nil, err
	}

	s.emitSystemEvent(ctx, systemEventInput{
		EventType: "device_provisioned",
		Severity:  "info",
		Source:    "api",
		DeviceID:  stringValue(record["deviceId"]),
		Message:   fmt.Sprintf("device provisioning claimed for %s", stringValue(record["deviceId"])),
		Metadata: map[string]any{
			"deviceProvisioningConfigId": record["id"],
		},
	})

	return record, nil
}

func (s *DomainService) ListSensorCalibrations(ctx context.Context, sensorID string) ([]repositories.Record, error) {
	return s.repo.Query(ctx, `SELECT * FROM sensor_calibrations WHERE sensor_id = $1::uuid ORDER BY created_at DESC`, sensorID)
}

func (s *DomainService) ListLatestSensorReadings(ctx context.Context, zoneID string) ([]repositories.Record, error) {
	return s.repo.Query(ctx, `
WITH latest AS (
  SELECT DISTINCT ON (sr.sensor_id)
    sr.id,
    sr.sensor_id,
    s.sensor_key,
    s.sensor_type,
    s.unit,
    d.id AS device_id,
    d.name AS device_name,
    d.device_uid,
    d.zone_id,
    z.name AS zone_name,
    sr.recorded_at,
    sr.value_double,
    sr.metadata,
    sr.created_at
  FROM sensor_readings sr
  JOIN sensors s ON s.id = sr.sensor_id
  JOIN devices d ON d.id = s.device_id
  LEFT JOIN zones z ON z.id = d.zone_id
  WHERE NULLIF($1, '')::uuid IS NULL
     OR d.zone_id = NULLIF($1, '')::uuid
  ORDER BY sr.sensor_id, sr.recorded_at DESC
)
SELECT *
FROM latest
ORDER BY zone_name NULLS LAST, device_name, sensor_key
LIMIT 200`,
		zoneID,
	)
}

func (s *DomainService) ListSensorReadings(ctx context.Context, sensorID string, hoursRaw string, limitRaw string) ([]repositories.Record, error) {
	hours := boundedInt(hoursRaw, 24, 1, 720)
	limit := boundedInt(limitRaw, 120, 1, 500)

	return s.repo.Query(ctx, `
SELECT
  sr.id,
  sr.sensor_id,
  s.sensor_key,
  s.sensor_type,
  s.unit,
  d.id AS device_id,
  d.name AS device_name,
  d.device_uid,
  d.zone_id,
  z.name AS zone_name,
  sr.recorded_at,
  sr.value_double,
  sr.metadata,
  sr.created_at
FROM sensor_readings sr
JOIN sensors s ON s.id = sr.sensor_id
JOIN devices d ON d.id = s.device_id
LEFT JOIN zones z ON z.id = d.zone_id
WHERE sr.sensor_id = $1::uuid
  AND sr.recorded_at >= now() - ($2::int * interval '1 hour')
ORDER BY sr.recorded_at DESC
LIMIT $3::int`,
		sensorID,
		hours,
		limit,
	)
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

func (s *DomainService) UpdateSensorCalibration(ctx context.Context, sensorID string, calibrationID string, body map[string]any) (repositories.Record, error) {
	return s.repo.QueryOne(ctx, `
UPDATE sensor_calibrations
SET status = $3,
    confirmed_at = CASE
      WHEN $3 = 'confirmed' THEN COALESCE($4::timestamptz, now())
      WHEN $3 = 'draft' THEN NULL
      ELSE confirmed_at
    END,
    metadata = metadata || $5::jsonb,
    updated_at = now()
WHERE id = $1::uuid
  AND sensor_id = $2::uuid
RETURNING *`,
		calibrationID,
		sensorID,
		stringField(body, "status"),
		nullableString(body, "confirmedAt"),
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
		s.emitSystemEvent(ctx, systemEventInput{
			EventType: "shelly_unreachable",
			Severity:  "warning",
			Source:    "api",
			Message:   fmt.Sprintf("shelly state fetch failed for lighting %s", id),
			Metadata: map[string]any{
				"lightingSystemId": id,
				"error":            err.Error(),
				"endpointUrl":      system["endpointUrl"],
				"provider":         system["provider"],
			},
		})
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
	if boolField(body, "isDefault", false) {
		var record repositories.Record
		err := s.repo.WithTx(ctx, func(repo *repositories.Repository) error {
			if _, err := repo.Exec(ctx, `UPDATE lighting_profiles SET is_default = false, updated_at = now() WHERE zone_id = $1::uuid`, stringField(body, "zoneId")); err != nil {
				return err
			}
			created, err := createLightingProfileRecord(ctx, repo, body)
			if err != nil {
				return err
			}
			record = created
			return nil
		})
		return record, err
	}

	return createLightingProfileRecord(ctx, s.repo, body)
}

func createLightingProfileRecord(ctx context.Context, repo *repositories.Repository, body map[string]any) (repositories.Record, error) {
	return repo.QueryOne(ctx, `
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

func (s *DomainService) ActivateLightingProfileDefault(ctx context.Context, id string) (repositories.Record, error) {
	var record repositories.Record
	err := s.repo.WithTx(ctx, func(repo *repositories.Repository) error {
		profile, err := repo.QueryOne(ctx, `SELECT zone_id FROM lighting_profiles WHERE id = $1::uuid`, id)
		if err != nil {
			return err
		}
		zoneID := stringValue(profile["zoneId"])
		if _, err := repo.Exec(ctx, `UPDATE lighting_profiles SET is_default = false, updated_at = now() WHERE zone_id = $1::uuid`, zoneID); err != nil {
			return err
		}
		if _, err := repo.Exec(ctx, `UPDATE lighting_profiles SET is_default = true, updated_at = now() WHERE id = $1::uuid`, id); err != nil {
			return err
		}
		activated, err := repo.QueryOne(ctx, lightingProfileSelect+` WHERE lp.id = $1::uuid`, id)
		if err != nil {
			return err
		}
		record = activated
		return nil
	})
	return record, err
}

func (s *DomainService) LightingCommand(ctx context.Context, id string, action string, body map[string]any) (repositories.Record, error) {
	system, err := s.repo.QueryOne(ctx, `SELECT * FROM lighting_systems WHERE id = $1::uuid`, id)
	if err != nil {
		return nil, err
	}
	endpoint, err := s.shellyEndpoint(system)
	if err != nil {
		_ = s.logLightingEvent(ctx, id, action+"_failed", nullableNumber(body, "brightnessPercent"), "api", map[string]any{"error": err.Error()})
		s.emitSystemEvent(ctx, systemEventInput{
			EventType: "lighting_command_failed",
			Severity:  "warning",
			Source:    "api",
			Message:   fmt.Sprintf("lighting %s endpoint resolution failed", id),
			Metadata: map[string]any{
				"lightingSystemId": id,
				"action":           action,
				"error":            err.Error(),
			},
		})
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
		s.emitSystemEvent(ctx, systemEventInput{
			EventType: "shelly_unreachable",
			Severity:  "warning",
			Source:    "api",
			Message:   fmt.Sprintf("shelly command %s failed for lighting %s", action, id),
			Metadata: map[string]any{
				"lightingSystemId": id,
				"action":           action,
				"endpointUrl":      endpoint,
				"error":            err.Error(),
			},
		})
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
	s.emitSystemEvent(ctx, systemEventInput{
		EventType: "lighting_command_applied",
		Severity:  "info",
		Source:    "api",
		Message:   fmt.Sprintf("lighting %s applied %s", id, eventType),
		Metadata: map[string]any{
			"lightingSystemId":  id,
			"action":            eventType,
			"brightnessPercent": state.BrightnessPercent,
			"isOn":              state.IsOn,
		},
	})
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

func boundedInt(value string, fallback int, minValue int, maxValue int) int {
	parsed, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil {
		return fallback
	}
	if parsed < minValue {
		return minValue
	}
	if parsed > maxValue {
		return maxValue
	}
	return parsed
}

func (s *DomainService) evaluateAutomationActions(ctx context.Context, rule repositories.Record, evaluationContext map[string]any, matched bool, commit bool) []map[string]any {
	actionConfig := objectValue(rule["actionConfig"])
	rawActions, _ := actionConfig["actions"].([]any)
	results := make([]map[string]any, 0, len(rawActions))
	if !matched {
		return results
	}

	for index, rawAction := range rawActions {
		action := objectValue(rawAction)
		actionType := stringValue(action["type"])
		result := map[string]any{
			"type":   actionType,
			"index":  index,
			"status": "dry_run",
		}
		if actionType == "" {
			result["status"] = "blocked"
			result["reason"] = "missing_action_type"
			results = append(results, result)
			continue
		}
		if !isSafeRuleAction(actionType) {
			result["status"] = "blocked"
			result["reason"] = "unsafe_action_type"
			results = append(results, result)
			continue
		}
		if !commit {
			results = append(results, result)
			continue
		}

		created, err := s.commitAutomationAction(ctx, rule, action, evaluationContext)
		if err != nil {
			result["status"] = "failed"
			result["error"] = err.Error()
			results = append(results, result)
			continue
		}
		result["status"] = "created"
		for key, value := range created {
			result[key] = value
		}
		results = append(results, result)
	}

	return results
}

func (s *DomainService) commitAutomationAction(ctx context.Context, rule repositories.Record, action map[string]any, evaluationContext map[string]any) (map[string]any, error) {
	actionType := stringValue(action["type"])
	severity := firstNonEmpty(stringValue(action["severity"]), stringValue(rule["severity"]), "warning")
	message := firstNonEmpty(stringValue(action["message"]), fmt.Sprintf("Rule matched: %s", stringValue(rule["name"])))
	metadata := map[string]any{
		"source":            "rules-engine",
		"automationRuleId":  rule["id"],
		"automationRule":    rule["name"],
		"evaluationContext": evaluationContext,
		"action":            action,
	}

	switch actionType {
	case "create_alert":
		title := firstNonEmpty(stringValue(action["title"]), stringValue(rule["name"]), "Rule matched")
		alert, err := s.repo.QueryOne(ctx, `
INSERT INTO system_alerts (severity, source, title, message, status, metadata)
VALUES ($1, 'rules-engine', $2, $3, 'active', $4::jsonb)
RETURNING id`,
			severity,
			title,
			message,
			mustJSON(metadata),
		)
		if err != nil {
			return nil, err
		}
		return map[string]any{"alertId": alert["id"]}, nil
	case "create_system_event":
		eventType := firstNonEmpty(stringValue(action["eventType"]), "rule_matched")
		event, err := s.repo.QueryOne(ctx, `
INSERT INTO system_events (event_type, severity, source, message, metadata)
VALUES ($1, $2, 'rules-engine', $3, $4::jsonb)
RETURNING id`,
			eventType,
			severity,
			message,
			mustJSON(metadata),
		)
		if err != nil {
			return nil, err
		}
		return map[string]any{"eventId": event["id"]}, nil
	case "show_dashboard_suggestion":
		return map[string]any{"suggestion": message}, nil
	default:
		return nil, fmt.Errorf("unsupported action type: %s", actionType)
	}
}

func evaluateAutomationCondition(condition map[string]any, evaluationContext map[string]any) (bool, repositories.Record) {
	if len(condition) == 0 {
		return false, repositories.Record{"matched": false, "reason": "missing_condition"}
	}
	if rawAll, ok := condition["all"].([]any); ok {
		children := make([]any, 0, len(rawAll))
		for _, rawCondition := range rawAll {
			matched, result := evaluateAutomationCondition(objectValue(rawCondition), evaluationContext)
			children = append(children, result)
			if !matched {
				return false, repositories.Record{"matched": false, "operator": "all", "children": children}
			}
		}
		return true, repositories.Record{"matched": true, "operator": "all", "children": children}
	}
	if rawAny, ok := condition["any"].([]any); ok {
		children := make([]any, 0, len(rawAny))
		for _, rawCondition := range rawAny {
			matched, result := evaluateAutomationCondition(objectValue(rawCondition), evaluationContext)
			children = append(children, result)
			if matched {
				return true, repositories.Record{"matched": true, "operator": "any", "children": children}
			}
		}
		return false, repositories.Record{"matched": false, "operator": "any", "children": children}
	}

	fact := stringValue(condition["fact"])
	operator := firstNonEmpty(stringValue(condition["operator"]), "eq")
	expected := condition["value"]
	actual, exists := lookupPath(evaluationContext, fact)
	matched := compareCondition(operator, actual, expected, exists)

	return matched, repositories.Record{
		"matched":  matched,
		"fact":     fact,
		"operator": operator,
		"expected": expected,
		"actual":   actual,
		"exists":   exists,
	}
}

func compareCondition(operator string, actual any, expected any, exists bool) bool {
	switch operator {
	case "exists":
		return exists
	case "not_exists":
		return !exists
	case "eq":
		return valuesEqual(actual, expected)
	case "neq":
		return !valuesEqual(actual, expected)
	case "gt", "gte", "lt", "lte":
		left, leftOK := floatValue(actual)
		right, rightOK := floatValue(expected)
		if !leftOK || !rightOK {
			return false
		}
		switch operator {
		case "gt":
			return left > right
		case "gte":
			return left >= right
		case "lt":
			return left < right
		default:
			return left <= right
		}
	case "contains":
		return containsValue(actual, expected)
	default:
		return false
	}
}

func lookupPath(value map[string]any, path string) (any, bool) {
	if path == "" {
		return nil, false
	}
	var current any = value
	for _, part := range strings.Split(path, ".") {
		object, ok := current.(map[string]any)
		if !ok {
			return nil, false
		}
		current, ok = object[part]
		if !ok {
			return nil, false
		}
	}
	return current, true
}

func valuesEqual(left any, right any) bool {
	leftNumber, leftOK := floatValue(left)
	rightNumber, rightOK := floatValue(right)
	if leftOK && rightOK {
		return leftNumber == rightNumber
	}
	return reflect.DeepEqual(left, right)
}

func containsValue(actual any, expected any) bool {
	expectedText := fmt.Sprint(expected)
	switch typed := actual.(type) {
	case string:
		return strings.Contains(typed, expectedText)
	case []any:
		for _, item := range typed {
			if valuesEqual(item, expected) {
				return true
			}
		}
	}
	return false
}

func floatValue(value any) (float64, bool) {
	switch typed := value.(type) {
	case float64:
		return typed, true
	case float32:
		return float64(typed), true
	case int:
		return float64(typed), true
	case int32:
		return float64(typed), true
	case int64:
		return float64(typed), true
	case json.Number:
		parsed, err := typed.Float64()
		return parsed, err == nil
	default:
		return 0, false
	}
}

func objectValue(value any) map[string]any {
	object, ok := value.(map[string]any)
	if ok && object != nil {
		return object
	}
	return map[string]any{}
}

func isSafeRuleAction(actionType string) bool {
	switch actionType {
	case "create_alert", "create_system_event", "show_dashboard_suggestion":
		return true
	default:
		return false
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func slugify(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	var builder strings.Builder
	previousDash := false
	for _, ch := range value {
		if (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') {
			builder.WriteRune(ch)
			previousDash = false
			continue
		}
		if !previousDash {
			builder.WriteRune('-')
			previousDash = true
		}
	}
	return strings.Trim(builder.String(), "-")
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
VALUES (
  $1,
  $2,
  COALESCE(
    $3::uuid,
    (SELECT id FROM firmware_channels WHERE is_default ORDER BY created_at DESC LIMIT 1),
    '00000000-0000-0000-0000-000000000103'::uuid
  ),
  $4,
  $5,
  $6,
  $7::jsonb
)
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

func (s *DomainService) SetFirmwareChannelDefault(ctx context.Context, id string) (repositories.Record, error) {
	var record repositories.Record
	err := s.repo.WithTx(ctx, func(repo *repositories.Repository) error {
		if _, err := repo.Exec(ctx, `UPDATE firmware_channels SET is_default = false`); err != nil {
			return err
		}
		updated, err := repo.QueryOne(ctx, `
UPDATE firmware_channels
SET is_default = true
WHERE id = $1::uuid
RETURNING *`,
			id,
		)
		if err != nil {
			return err
		}
		record = updated
		return nil
	})
	if err != nil {
		return nil, err
	}

	s.emitSystemEvent(ctx, systemEventInput{
		EventType: "firmware_channel_default_changed",
		Severity:  "info",
		Source:    "api",
		Message:   fmt.Sprintf("firmware channel %s set as default", id),
		Metadata: map[string]any{
			"firmwareChannelId": id,
			"name":              record["name"],
		},
	})

	return record, nil
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
	result, err := s.createOtaJob(ctx, deviceID, body)
	if err == nil && result != nil {
		jobID, _ := result["id"].(string)
		firmwareID, _ := result["firmwareVersionId"].(string)
		s.emitSystemEvent(ctx, systemEventInput{
			EventType: "ota_scheduled",
			Severity:  "info",
			Source:    "api",
			DeviceID:  deviceID,
			Message:   fmt.Sprintf("ota job %s scheduled for device %s", jobID, deviceID),
			Metadata: map[string]any{
				"jobId":             jobID,
				"firmwareVersionId": firmwareID,
				"dispatchMode":      "manual",
			},
		})
	}
	return result, err
}

func (s *DomainService) createOtaJob(ctx context.Context, deviceID string, body map[string]any) (repositories.Record, error) {
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
	result, err := s.createOtaDryRun(ctx, deviceID, body)
	if err == nil && result != nil {
		status, _ := result["status"].(string)
		dryRunID, _ := result["id"].(string)
		firmwareID, _ := result["firmwareVersionId"].(string)
		severity := "info"
		eventType := "ota_dry_run_passed"
		if status == "failed" {
			severity = "warning"
			eventType = "ota_dry_run_failed"
		}
		s.emitSystemEvent(ctx, systemEventInput{
			EventType: eventType,
			Severity:  severity,
			Source:    "api",
			DeviceID:  deviceID,
			Message:   fmt.Sprintf("ota dry-run %s %s for device %s", dryRunID, status, deviceID),
			Metadata: map[string]any{
				"dryRunId":          dryRunID,
				"firmwareVersionId": firmwareID,
				"status":            status,
			},
		})
	}
	return result, err
}

func (s *DomainService) createOtaDryRun(ctx context.Context, deviceID string, body map[string]any) (repositories.Record, error) {
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

func (s *DomainService) provisioningClaimURL(token string) string {
	if token == "" {
		return ""
	}
	encoded := url.QueryEscape(token)
	if s.publicWebURL != "" {
		return s.publicWebURL + "/provisioning/claim?token=" + encoded
	}
	if s.publicAPIURL != "" {
		return s.publicAPIURL + "/api/provisioning/claim?token=" + encoded
	}
	return "/provisioning/claim?token=" + encoded
}

func generateProvisioningToken() (string, string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", "", err
	}
	token := base64.RawURLEncoding.EncodeToString(raw)
	return token, hashProvisioningToken(token), nil
}

func hashProvisioningToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return fmt.Sprintf("%x", sum[:])
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

func nullableInt(body map[string]any, key string) any {
	value, ok := body[key]
	if !ok || value == nil {
		return nil
	}
	switch typed := value.(type) {
	case float64:
		if typed == math.Trunc(typed) {
			return int(typed)
		}
	case int:
		return typed
	case int64:
		return typed
	case json.Number:
		parsed, err := typed.Int64()
		if err == nil {
			return parsed
		}
	}
	return nil
}

func intField(body map[string]any, key string, fallback int) int {
	value := nullableInt(body, key)
	if value == nil {
		return fallback
	}
	switch typed := value.(type) {
	case int:
		return typed
	case int64:
		return int(typed)
	}
	return fallback
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

func stringValue(value any) string {
	if value == nil {
		return ""
	}
	text, _ := value.(string)
	return text
}

func mustJSON(value any) []byte {
	data, err := json.Marshal(value)
	if err != nil {
		return []byte("{}")
	}
	return data
}
