package processor

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"net/netip"
	"strings"
	"time"

	"growlab/workers/growlab-worker/internal/store"
)

var (
	ErrInvalidTopic   = errors.New("invalid mqtt topic")
	ErrInvalidPayload = errors.New("invalid mqtt payload")
)

type Processor struct {
	store  *store.Store
	now    func() time.Time
	logger *slog.Logger
}

type telemetryPayload struct {
	RecordedAt string             `json:"recordedAt"`
	SensorKey  string             `json:"sensorKey"`
	Value      *float64           `json:"value"`
	Unit       string             `json:"unit"`
	Readings   []telemetryReading `json:"readings"`
	Values     map[string]float64 `json:"values"`
	Metadata   map[string]any     `json:"metadata"`
}

type telemetryReading struct {
	SensorKey  string         `json:"sensorKey"`
	Value      *float64       `json:"value"`
	Unit       string         `json:"unit"`
	RecordedAt string         `json:"recordedAt"`
	Metadata   map[string]any `json:"metadata"`
}

type heartbeatPayload struct {
	ObservedAt      string         `json:"observedAt"`
	Status          string         `json:"status"`
	IPAddress       string         `json:"ipAddress"`
	RSSIDBm         *int32         `json:"rssiDbm"`
	UptimeSeconds   *int64         `json:"uptimeSeconds"`
	FirmwareVersion string         `json:"firmwareVersion"`
	Metadata        map[string]any `json:"metadata"`
}

type statusPayload struct {
	ObservedAt      string         `json:"observedAt"`
	Status          string         `json:"status"`
	FirmwareVersion string         `json:"firmwareVersion"`
	Metadata        map[string]any `json:"metadata"`
}

type otaStatusPayload struct {
	ObservedAt    string         `json:"observedAt"`
	JobID         string         `json:"jobId"`
	Status        string         `json:"status"`
	ErrorMessage  string         `json:"errorMessage"`
	Metadata      map[string]any `json:"metadata"`
	FirmwareID    string         `json:"firmwareVersionId"`
	DeviceVersion string         `json:"deviceFirmwareVersion"`
}

func New(s *store.Store, logger *slog.Logger) *Processor {
	if logger == nil {
		logger = slog.Default()
	}
	return &Processor{
		store:  s,
		now:    time.Now,
		logger: logger,
	}
}

func (p *Processor) EmitSystemEvent(ctx context.Context, event store.SystemEvent) {
	if event.OccurredAt.IsZero() {
		event.OccurredAt = p.now().UTC()
	}
	if event.Source == "" {
		event.Source = "worker"
	}
	if err := p.store.InsertSystemEvent(ctx, event); err != nil {
		p.logger.Warn("system event insert failed", "eventType", event.EventType, "error", err)
	}
}

func (p *Processor) Process(ctx context.Context, topic string, payload []byte) error {
	parsed, err := parseTopic(topic)
	if err != nil {
		return err
	}

	switch parsed.kind {
	case "telemetry":
		return p.processTelemetry(ctx, parsed.deviceUID, payload)
	case "heartbeat":
		return p.processHeartbeat(ctx, parsed.deviceUID, payload)
	case "status":
		return p.processStatus(ctx, parsed.deviceUID, payload)
	case "ota/status":
		return p.processOTAStatus(ctx, parsed.deviceUID, payload)
	default:
		return fmt.Errorf("%w: unsupported topic kind %q", ErrInvalidTopic, parsed.kind)
	}
}

func (p *Processor) processTelemetry(ctx context.Context, deviceUID string, payload []byte) error {
	var msg telemetryPayload
	if err := json.Unmarshal(payload, &msg); err != nil {
		p.emitPayloadError(ctx, deviceUID, "telemetry", err)
		return fmt.Errorf("%w: telemetry JSON: %v", ErrInvalidPayload, err)
	}

	readings := normalizeReadings(msg)
	if len(readings) == 0 {
		return fmt.Errorf("%w: telemetry contains no readings", ErrInvalidPayload)
	}

	var firstErr error
	saved := 0
	for _, reading := range readings {
		if reading.SensorKey == "" || reading.Value == nil || math.IsNaN(*reading.Value) || math.IsInf(*reading.Value, 0) {
			firstErr = keepFirst(firstErr, fmt.Errorf("%w: invalid telemetry reading", ErrInvalidPayload))
			continue
		}

		sensorID, err := p.store.SensorIDByDeviceUIDAndKey(ctx, deviceUID, reading.SensorKey)
		if err != nil {
			firstErr = keepFirst(firstErr, fmt.Errorf("sensor %q: %w", reading.SensorKey, err))
			continue
		}

		recordedAt := p.parseTime(firstNonEmpty(reading.RecordedAt, msg.RecordedAt))
		metadata := mergeMetadata(msg.Metadata, reading.Metadata)
		if reading.Unit != "" {
			metadata["unit"] = reading.Unit
		}

		if err := p.store.InsertSensorReading(ctx, sensorID, recordedAt, *reading.Value, mustJSON(metadata)); err != nil {
			firstErr = keepFirst(firstErr, err)
			continue
		}
		saved++
	}

	if saved > 0 {
		_ = p.store.TouchDevice(ctx, store.DeviceTouch{
			DeviceUID: deviceUID,
			SeenAt:    p.parseTime(msg.RecordedAt),
		})
	}
	if firstErr != nil {
		return firstErr
	}
	return nil
}

func (p *Processor) processHeartbeat(ctx context.Context, deviceUID string, payload []byte) error {
	var msg heartbeatPayload
	if err := json.Unmarshal(payload, &msg); err != nil {
		p.emitPayloadError(ctx, deviceUID, "heartbeat", err)
		return fmt.Errorf("%w: heartbeat JSON: %v", ErrInvalidPayload, err)
	}

	deviceID, err := p.store.DeviceIDByUID(ctx, deviceUID)
	if err != nil {
		return err
	}

	observedAt := p.parseTime(msg.ObservedAt)
	status := firstNonEmpty(msg.Status, "online")
	var ipAddress *string
	if msg.IPAddress != "" {
		if _, err := netip.ParseAddr(msg.IPAddress); err != nil {
			p.emitPayloadError(ctx, deviceUID, "heartbeat", fmt.Errorf("invalid ipAddress %q", msg.IPAddress))
			return fmt.Errorf("%w: invalid ipAddress", ErrInvalidPayload)
		}
		ipAddress = &msg.IPAddress
	}

	previousStatus, _ := p.store.DeviceStatusByID(ctx, deviceID)

	firmwareVersion := stringPtr(msg.FirmwareVersion)
	if err := p.store.InsertDeviceHeartbeat(ctx, store.Heartbeat{
		DeviceID:        deviceID,
		ObservedAt:      observedAt,
		Status:          status,
		IPAddress:       ipAddress,
		RSSIDBm:         msg.RSSIDBm,
		UptimeSeconds:   msg.UptimeSeconds,
		FirmwareVersion: firmwareVersion,
		Metadata:        mustJSON(msg.Metadata),
	}); err != nil {
		return err
	}

	if err := p.store.TouchDevice(ctx, store.DeviceTouch{
		DeviceID:        deviceID,
		SeenAt:          observedAt,
		Status:          &status,
		FirmwareVersion: firmwareVersion,
	}); err != nil {
		return err
	}

	p.emitDeviceStatusTransition(ctx, deviceID, deviceUID, previousStatus, status, observedAt)
	return nil
}

func (p *Processor) processStatus(ctx context.Context, deviceUID string, payload []byte) error {
	var msg statusPayload
	if err := json.Unmarshal(payload, &msg); err != nil {
		p.emitPayloadError(ctx, deviceUID, "status", err)
		return fmt.Errorf("%w: status JSON: %v", ErrInvalidPayload, err)
	}
	if msg.Status == "" {
		return fmt.Errorf("%w: status is required", ErrInvalidPayload)
	}

	deviceID, err := p.store.DeviceIDByUID(ctx, deviceUID)
	if err != nil {
		return err
	}
	previousStatus, _ := p.store.DeviceStatusByID(ctx, deviceID)

	observedAt := p.parseTime(msg.ObservedAt)
	if err := p.store.TouchDevice(ctx, store.DeviceTouch{
		DeviceID:        deviceID,
		SeenAt:          observedAt,
		Status:          &msg.Status,
		FirmwareVersion: stringPtr(msg.FirmwareVersion),
	}); err != nil {
		return err
	}

	p.emitDeviceStatusTransition(ctx, deviceID, deviceUID, previousStatus, msg.Status, observedAt)
	return nil
}

func (p *Processor) processOTAStatus(ctx context.Context, deviceUID string, payload []byte) error {
	var msg otaStatusPayload
	if err := json.Unmarshal(payload, &msg); err != nil {
		p.emitPayloadError(ctx, deviceUID, "ota_status", err)
		return fmt.Errorf("%w: ota status JSON: %v", ErrInvalidPayload, err)
	}
	if msg.JobID == "" || msg.Status == "" {
		return fmt.Errorf("%w: jobId and status are required", ErrInvalidPayload)
	}

	deviceID, err := p.store.DeviceIDByUID(ctx, deviceUID)
	if err != nil {
		return err
	}

	previousJobStatus, _ := p.store.OTAJobStatus(ctx, msg.JobID)

	metadata := mergeMetadata(msg.Metadata, map[string]any{})
	if msg.FirmwareID != "" {
		metadata["firmwareVersionId"] = msg.FirmwareID
	}
	if msg.DeviceVersion != "" {
		metadata["deviceFirmwareVersion"] = msg.DeviceVersion
	}

	observedAt := p.parseTime(msg.ObservedAt)
	if err := p.store.UpdateOTAStatus(ctx, store.OTAStatus{
		DeviceID:     deviceID,
		JobID:        msg.JobID,
		Status:       msg.Status,
		ObservedAt:   observedAt,
		ErrorMessage: stringPtr(msg.ErrorMessage),
		Metadata:     mustJSON(metadata),
	}); err != nil {
		return err
	}

	if err := p.store.TouchDevice(ctx, store.DeviceTouch{
		DeviceID: deviceID,
		SeenAt:   observedAt,
	}); err != nil {
		return err
	}

	p.emitOTAStatusTransition(ctx, deviceID, deviceUID, msg.JobID, previousJobStatus, msg.Status, msg.ErrorMessage, observedAt)
	return nil
}

func (p *Processor) emitDeviceStatusTransition(ctx context.Context, deviceID string, deviceUID string, previous string, current string, observedAt time.Time) {
	if previous == current {
		return
	}
	devID := deviceID
	meta := map[string]any{
		"deviceUid":      deviceUID,
		"previousStatus": previous,
		"currentStatus":  current,
	}
	switch {
	case current == "offline":
		p.EmitSystemEvent(ctx, store.SystemEvent{
			EventType:  "device_offline",
			Severity:   "warning",
			Source:     "worker",
			DeviceID:   &devID,
			Message:    fmt.Sprintf("device %s reported offline", deviceUID),
			Metadata:   mustJSON(meta),
			OccurredAt: observedAt,
		})
	case (previous == "" || previous == "offline" || previous == "unknown") && current == "online":
		p.EmitSystemEvent(ctx, store.SystemEvent{
			EventType:  "device_online",
			Severity:   "info",
			Source:     "worker",
			DeviceID:   &devID,
			Message:    fmt.Sprintf("device %s reported online", deviceUID),
			Metadata:   mustJSON(meta),
			OccurredAt: observedAt,
		})
	default:
		p.EmitSystemEvent(ctx, store.SystemEvent{
			EventType:  "device_status_changed",
			Severity:   "info",
			Source:     "worker",
			DeviceID:   &devID,
			Message:    fmt.Sprintf("device %s status %s -> %s", deviceUID, previous, current),
			Metadata:   mustJSON(meta),
			OccurredAt: observedAt,
		})
	}
}

func (p *Processor) emitOTAStatusTransition(ctx context.Context, deviceID string, deviceUID string, jobID string, previous string, current string, errorMessage string, observedAt time.Time) {
	if previous == current {
		return
	}
	devID := deviceID
	meta := map[string]any{
		"deviceUid":      deviceUID,
		"jobId":          jobID,
		"previousStatus": previous,
		"currentStatus":  current,
	}
	if errorMessage != "" {
		meta["errorMessage"] = errorMessage
	}
	switch current {
	case "failed":
		p.EmitSystemEvent(ctx, store.SystemEvent{
			EventType:  "ota_failed",
			Severity:   "error",
			Source:     "worker",
			DeviceID:   &devID,
			Message:    fmt.Sprintf("ota job %s failed on device %s", jobID, deviceUID),
			Metadata:   mustJSON(meta),
			OccurredAt: observedAt,
		})
	case "completed":
		p.EmitSystemEvent(ctx, store.SystemEvent{
			EventType:  "ota_completed",
			Severity:   "info",
			Source:     "worker",
			DeviceID:   &devID,
			Message:    fmt.Sprintf("ota job %s completed on device %s", jobID, deviceUID),
			Metadata:   mustJSON(meta),
			OccurredAt: observedAt,
		})
	case "running", "in_progress":
		p.EmitSystemEvent(ctx, store.SystemEvent{
			EventType:  "ota_running",
			Severity:   "info",
			Source:     "worker",
			DeviceID:   &devID,
			Message:    fmt.Sprintf("ota job %s running on device %s", jobID, deviceUID),
			Metadata:   mustJSON(meta),
			OccurredAt: observedAt,
		})
	case "cancelled":
		p.EmitSystemEvent(ctx, store.SystemEvent{
			EventType:  "ota_cancelled",
			Severity:   "warning",
			Source:     "worker",
			DeviceID:   &devID,
			Message:    fmt.Sprintf("ota job %s cancelled on device %s", jobID, deviceUID),
			Metadata:   mustJSON(meta),
			OccurredAt: observedAt,
		})
	}
}

func (p *Processor) emitPayloadError(ctx context.Context, deviceUID string, kind string, parseErr error) {
	deviceID, err := p.store.DeviceIDByUID(ctx, deviceUID)
	var devicePtr *string
	if err == nil && deviceID != "" {
		devicePtr = &deviceID
	}
	p.EmitSystemEvent(ctx, store.SystemEvent{
		EventType: "payload_invalid",
		Severity:  "warning",
		Source:    "worker",
		DeviceID:  devicePtr,
		Message:   fmt.Sprintf("invalid %s payload from device %s", kind, deviceUID),
		Metadata: mustJSON(map[string]any{
			"deviceUid": deviceUID,
			"kind":      kind,
			"error":     parseErr.Error(),
		}),
	})
}

type parsedTopic struct {
	deviceUID string
	kind      string
}

func parseTopic(topic string) (parsedTopic, error) {
	parts := strings.Split(topic, "/")
	if len(parts) < 4 || parts[0] != "growlab" || parts[1] != "devices" || parts[2] == "" {
		return parsedTopic{}, ErrInvalidTopic
	}
	if len(parts) == 4 {
		return parsedTopic{deviceUID: parts[2], kind: parts[3]}, nil
	}
	if len(parts) == 5 && parts[3] == "ota" && parts[4] == "status" {
		return parsedTopic{deviceUID: parts[2], kind: "ota/status"}, nil
	}
	return parsedTopic{}, ErrInvalidTopic
}

func normalizeReadings(msg telemetryPayload) []telemetryReading {
	readings := append([]telemetryReading{}, msg.Readings...)
	if msg.SensorKey != "" && msg.Value != nil {
		readings = append(readings, telemetryReading{
			SensorKey: msg.SensorKey,
			Value:     msg.Value,
			Unit:      msg.Unit,
		})
	}
	for key, value := range msg.Values {
		copied := value
		readings = append(readings, telemetryReading{
			SensorKey: key,
			Value:     &copied,
		})
	}
	return readings
}

func (p *Processor) parseTime(value string) time.Time {
	if value == "" {
		return p.now().UTC()
	}
	parsed, err := time.Parse(time.RFC3339Nano, value)
	if err != nil {
		return p.now().UTC()
	}
	return parsed.UTC()
}

func mergeMetadata(base map[string]any, extra map[string]any) map[string]any {
	out := map[string]any{}
	for key, value := range base {
		out[key] = value
	}
	for key, value := range extra {
		out[key] = value
	}
	return out
}

func mustJSON(value any) []byte {
	if value == nil {
		return []byte("{}")
	}
	data, err := json.Marshal(value)
	if err != nil {
		return []byte("{}")
	}
	return data
}

func keepFirst(current error, next error) error {
	if current != nil {
		return current
	}
	return next
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func stringPtr(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}
