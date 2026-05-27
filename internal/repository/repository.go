package repository

import (
	"context"
	"errors"
	"time"
)

var ErrNoQueries = errors.New("repository queries not configured")

type JSON map[string]any

type SystemEvent struct {
	ID         string
	EventType  string
	Severity   string
	Source     string
	Message    string
	Metadata   JSON
	OccurredAt time.Time
	CreatedAt  time.Time
}

type CreateSystemEventParams struct {
	EventType  string
	Severity   string
	Source     string
	ZoneID     *string
	PlantID    *string
	DeviceID   *string
	AlertID    *string
	Message    string
	Metadata   JSON
	OccurredAt time.Time
}

type SystemAlert struct {
	ID             string
	Severity       string
	Source         string
	Title          string
	Message        string
	Status         string
	AcknowledgedBy *string
	ResolvedBy     *string
	Metadata       JSON
	RaisedAt       time.Time
	UpdatedAt      time.Time
}

type CreateSystemAlertParams struct {
	Severity string
	Source   string
	Title    string
	Message  string
	Metadata JSON
}

type ListSystemAlertsParams struct {
	Status string
	Limit  int32
}

type UpdateSystemAlertStatusParams struct {
	ID        string
	Status    string
	ChangedBy *string
}

type ZoneProfile struct {
	ID           string
	ZoneID       string
	Name         string
	IsActive     bool
	TargetConfig JSON
	Metadata     JSON
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type CreateZoneProfileParams struct {
	ZoneID       string
	Name         string
	IsActive     bool
	TargetConfig JSON
	Metadata     JSON
}

type PlantTask struct {
	ID          string
	PlantID     string
	Title       string
	Description *string
	Status      string
	DueAt       *time.Time
	CompletedAt *time.Time
	Metadata    JSON
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type CreatePlantTaskParams struct {
	PlantID          string
	Title            string
	Description      *string
	DueAt            *time.Time
	RecurrenceConfig JSON
	Metadata         JSON
}

type DeviceCapability struct {
	ID             string
	DeviceID       string
	CapabilityKey  string
	CapabilityType string
	Enabled        bool
	Config         JSON
	Metadata       JSON
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type CreateDeviceCapabilityParams struct {
	DeviceID       string
	CapabilityKey  string
	CapabilityType string
	Enabled        bool
	Config         JSON
	Metadata       JSON
}

type SensorCalibration struct {
	ID              string
	SensorID        string
	Method          string
	Status          string
	CalibrationData JSON
	RawPoints       JSON
	Notes           *string
	Metadata        JSON
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type CreateSensorCalibrationParams struct {
	SensorID        string
	Method          string
	Status          string
	CalibrationData JSON
	RawPoints       JSON
	Notes           *string
	Metadata        JSON
}

type LightingProfile struct {
	ID               string
	ZoneID           string
	LightingSystemID *string
	Name             string
	Enabled          bool
	IsDefault        bool
	Timezone         string
	Metadata         JSON
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type CreateLightingProfileParams struct {
	ZoneID           string
	LightingSystemID *string
	Name             string
	Enabled          bool
	IsDefault        bool
	Timezone         string
	Metadata         JSON
}

type LightingProfileStep struct {
	ID                string
	LightingProfileID string
	StepOrder         int32
	AtTime            string
	Action            string
	BrightnessPercent *int32
	TransitionSeconds *int32
	Metadata          JSON
	CreatedAt         time.Time
}

type CreateLightingProfileStepParams struct {
	LightingProfileID string
	StepOrder         int32
	AtTime            string
	Action            string
	BrightnessPercent *int32
	TransitionSeconds *int32
	Metadata          JSON
}

type FeatureQueries interface {
	CreateSystemEvent(context.Context, CreateSystemEventParams) (SystemEvent, error)
	ListSystemEvents(context.Context, int32) ([]SystemEvent, error)
	CreateSystemAlert(context.Context, CreateSystemAlertParams) (SystemAlert, error)
	ListSystemAlerts(context.Context, ListSystemAlertsParams) ([]SystemAlert, error)
	UpdateSystemAlertStatus(context.Context, UpdateSystemAlertStatusParams) (SystemAlert, error)
	CreateZoneProfile(context.Context, CreateZoneProfileParams) (ZoneProfile, error)
	ListZoneProfiles(context.Context, string) ([]ZoneProfile, error)
	CreatePlantTask(context.Context, CreatePlantTaskParams) (PlantTask, error)
	ListPlantTasks(context.Context, string) ([]PlantTask, error)
	CreateDeviceCapability(context.Context, CreateDeviceCapabilityParams) (DeviceCapability, error)
	ListDeviceCapabilities(context.Context, string) ([]DeviceCapability, error)
	CreateSensorCalibration(context.Context, CreateSensorCalibrationParams) (SensorCalibration, error)
	ListSensorCalibrations(context.Context, string) ([]SensorCalibration, error)
	CreateLightingProfile(context.Context, CreateLightingProfileParams) (LightingProfile, error)
	ListLightingProfiles(context.Context, string) ([]LightingProfile, error)
	CreateLightingProfileStep(context.Context, CreateLightingProfileStepParams) (LightingProfileStep, error)
	ListLightingProfileSteps(context.Context, string) ([]LightingProfileStep, error)
}

type Repository struct {
	queries FeatureQueries
}

func New(queries FeatureQueries) *Repository {
	return &Repository{queries: queries}
}

func (r *Repository) q() (FeatureQueries, error) {
	if r == nil || r.queries == nil {
		return nil, ErrNoQueries
	}
	return r.queries, nil
}

func (r *Repository) CreateSystemEvent(ctx context.Context, arg CreateSystemEventParams) (SystemEvent, error) {
	q, err := r.q()
	if err != nil {
		return SystemEvent{}, err
	}
	return q.CreateSystemEvent(ctx, arg)
}

func (r *Repository) ListSystemEvents(ctx context.Context, limit int32) ([]SystemEvent, error) {
	q, err := r.q()
	if err != nil {
		return nil, err
	}
	return q.ListSystemEvents(ctx, limit)
}

func (r *Repository) CreateSystemAlert(ctx context.Context, arg CreateSystemAlertParams) (SystemAlert, error) {
	q, err := r.q()
	if err != nil {
		return SystemAlert{}, err
	}
	return q.CreateSystemAlert(ctx, arg)
}

func (r *Repository) ListSystemAlerts(ctx context.Context, arg ListSystemAlertsParams) ([]SystemAlert, error) {
	q, err := r.q()
	if err != nil {
		return nil, err
	}
	return q.ListSystemAlerts(ctx, arg)
}

func (r *Repository) UpdateSystemAlertStatus(ctx context.Context, arg UpdateSystemAlertStatusParams) (SystemAlert, error) {
	q, err := r.q()
	if err != nil {
		return SystemAlert{}, err
	}
	return q.UpdateSystemAlertStatus(ctx, arg)
}

func (r *Repository) CreateZoneProfile(ctx context.Context, arg CreateZoneProfileParams) (ZoneProfile, error) {
	q, err := r.q()
	if err != nil {
		return ZoneProfile{}, err
	}
	return q.CreateZoneProfile(ctx, arg)
}

func (r *Repository) ListZoneProfiles(ctx context.Context, zoneID string) ([]ZoneProfile, error) {
	q, err := r.q()
	if err != nil {
		return nil, err
	}
	return q.ListZoneProfiles(ctx, zoneID)
}

func (r *Repository) CreatePlantTask(ctx context.Context, arg CreatePlantTaskParams) (PlantTask, error) {
	q, err := r.q()
	if err != nil {
		return PlantTask{}, err
	}
	return q.CreatePlantTask(ctx, arg)
}

func (r *Repository) ListPlantTasks(ctx context.Context, plantID string) ([]PlantTask, error) {
	q, err := r.q()
	if err != nil {
		return nil, err
	}
	return q.ListPlantTasks(ctx, plantID)
}

func (r *Repository) CreateDeviceCapability(ctx context.Context, arg CreateDeviceCapabilityParams) (DeviceCapability, error) {
	q, err := r.q()
	if err != nil {
		return DeviceCapability{}, err
	}
	return q.CreateDeviceCapability(ctx, arg)
}

func (r *Repository) ListDeviceCapabilities(ctx context.Context, deviceID string) ([]DeviceCapability, error) {
	q, err := r.q()
	if err != nil {
		return nil, err
	}
	return q.ListDeviceCapabilities(ctx, deviceID)
}

func (r *Repository) CreateSensorCalibration(ctx context.Context, arg CreateSensorCalibrationParams) (SensorCalibration, error) {
	q, err := r.q()
	if err != nil {
		return SensorCalibration{}, err
	}
	return q.CreateSensorCalibration(ctx, arg)
}

func (r *Repository) ListSensorCalibrations(ctx context.Context, sensorID string) ([]SensorCalibration, error) {
	q, err := r.q()
	if err != nil {
		return nil, err
	}
	return q.ListSensorCalibrations(ctx, sensorID)
}

func (r *Repository) CreateLightingProfile(ctx context.Context, arg CreateLightingProfileParams) (LightingProfile, error) {
	q, err := r.q()
	if err != nil {
		return LightingProfile{}, err
	}
	return q.CreateLightingProfile(ctx, arg)
}

func (r *Repository) ListLightingProfiles(ctx context.Context, zoneID string) ([]LightingProfile, error) {
	q, err := r.q()
	if err != nil {
		return nil, err
	}
	return q.ListLightingProfiles(ctx, zoneID)
}

func (r *Repository) CreateLightingProfileStep(ctx context.Context, arg CreateLightingProfileStepParams) (LightingProfileStep, error) {
	q, err := r.q()
	if err != nil {
		return LightingProfileStep{}, err
	}
	return q.CreateLightingProfileStep(ctx, arg)
}

func (r *Repository) ListLightingProfileSteps(ctx context.Context, profileID string) ([]LightingProfileStep, error) {
	q, err := r.q()
	if err != nil {
		return nil, err
	}
	return q.ListLightingProfileSteps(ctx, profileID)
}
