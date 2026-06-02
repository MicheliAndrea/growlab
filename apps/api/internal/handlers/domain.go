package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"growlab/apps/api/internal/repositories"
	"growlab/apps/api/internal/services"
)

type DomainHandler struct {
	service                *services.DomainService
	imageStoragePath       string
	imageUploadMaxBytes    int64
	firmwareStoragePath    string
	firmwareUploadMaxBytes int64
}

type DomainHandlerOptions struct {
	ImageStoragePath       string
	ImageUploadMaxBytes    int64
	FirmwareStoragePath    string
	FirmwareUploadMaxBytes int64
}

func NewDomainHandler(service *services.DomainService, opts DomainHandlerOptions) *DomainHandler {
	imageStoragePath := opts.ImageStoragePath
	if imageStoragePath == "" {
		imageStoragePath = "./storage/images"
	}
	imageUploadMaxBytes := opts.ImageUploadMaxBytes
	if imageUploadMaxBytes <= 0 {
		imageUploadMaxBytes = 15 * 1024 * 1024
	}
	firmwareStoragePath := opts.FirmwareStoragePath
	if firmwareStoragePath == "" {
		firmwareStoragePath = "./storage/firmware"
	}
	firmwareUploadMaxBytes := opts.FirmwareUploadMaxBytes
	if firmwareUploadMaxBytes <= 0 {
		firmwareUploadMaxBytes = 32 * 1024 * 1024
	}
	return &DomainHandler{
		service:                service,
		imageStoragePath:       imageStoragePath,
		imageUploadMaxBytes:    imageUploadMaxBytes,
		firmwareStoragePath:    firmwareStoragePath,
		firmwareUploadMaxBytes: firmwareUploadMaxBytes,
	}
}

func (h *DomainHandler) ListZones(c *gin.Context) {
	result, err := h.service.ListZones(c.Request.Context())
	respond(c, result, err)
}

func (h *DomainHandler) GetZone(c *gin.Context) {
	result, err := h.service.GetZone(c.Request.Context(), c.Param("id"))
	respondOne(c, result, err)
}

func (h *DomainHandler) CreateZone(c *gin.Context) {
	body, ok := bindJSONMap(c)
	if !ok {
		return
	}
	result, err := h.service.CreateZone(c.Request.Context(), body)
	respondCreated(c, result, err)
}

func (h *DomainHandler) UpdateZone(c *gin.Context) {
	body, ok := bindJSONMap(c)
	if !ok {
		return
	}
	result, err := h.service.UpdateZone(c.Request.Context(), c.Param("id"), body)
	respondOne(c, result, err)
}

func (h *DomainHandler) DeleteZone(c *gin.Context) {
	respondNoContent(c, h.service.DeleteZone(c.Request.Context(), c.Param("id")))
}

func (h *DomainHandler) ListZoneProfiles(c *gin.Context) {
	result, err := h.service.ListZoneProfiles(c.Request.Context(), c.Param("id"))
	respond(c, result, err)
}

func (h *DomainHandler) CreateZoneProfile(c *gin.Context) {
	body, ok := bindJSONMap(c)
	if !ok {
		return
	}
	result, err := h.service.CreateZoneProfile(c.Request.Context(), c.Param("id"), body)
	respondCreated(c, result, err)
}

func (h *DomainHandler) ActivateZoneProfile(c *gin.Context) {
	result, err := h.service.ActivateZoneProfile(c.Request.Context(), c.Param("id"), c.Param("profileId"))
	respondOne(c, result, err)
}

func (h *DomainHandler) ListPlants(c *gin.Context) {
	result, err := h.service.ListPlants(c.Request.Context(), c.Query("zoneId"))
	respond(c, result, err)
}

func (h *DomainHandler) GetPlant(c *gin.Context) {
	result, err := h.service.GetPlant(c.Request.Context(), c.Param("id"))
	respondOne(c, result, err)
}

func (h *DomainHandler) CreatePlant(c *gin.Context) {
	body, ok := bindJSONMap(c)
	if !ok {
		return
	}
	result, err := h.service.CreatePlant(c.Request.Context(), body)
	respondCreated(c, result, err)
}

func (h *DomainHandler) UpdatePlant(c *gin.Context) {
	body, ok := bindJSONMap(c)
	if !ok {
		return
	}
	result, err := h.service.UpdatePlant(c.Request.Context(), c.Param("id"), body)
	respondOne(c, result, err)
}

func (h *DomainHandler) DeletePlant(c *gin.Context) {
	respondNoContent(c, h.service.DeletePlant(c.Request.Context(), c.Param("id")))
}

func (h *DomainHandler) GetPlantTimeline(c *gin.Context) {
	result, err := h.service.GetPlantTimeline(c.Request.Context(), c.Param("id"))
	respond(c, result, err)
}

func (h *DomainHandler) ListPlantImages(c *gin.Context) {
	result, err := h.service.ListPlantImages(c.Request.Context(), c.Param("id"))
	respond(c, result, err)
}

func (h *DomainHandler) ListPlantEvents(c *gin.Context) {
	result, err := h.service.ListPlantEvents(c.Request.Context(), c.Param("id"))
	respond(c, result, err)
}

func (h *DomainHandler) CreatePlantEvent(c *gin.Context) {
	body, ok := bindJSONMap(c)
	if !ok {
		return
	}
	result, err := h.service.CreatePlantEvent(c.Request.Context(), c.Param("id"), body)
	respondCreated(c, result, err)
}

func (h *DomainHandler) CreatePlantImage(c *gin.Context) {
	body, savedPath, ok := h.bindPlantImageUpload(c)
	if !ok {
		return
	}
	result, err := h.service.CreatePlantImageMetadata(c.Request.Context(), c.Param("id"), body)
	if err != nil && savedPath != "" {
		_ = os.Remove(savedPath)
	}
	respondCreated(c, result, err)
}

func (h *DomainHandler) ServePlantImage(c *gin.Context) {
	image, err := h.service.GetPlantImage(c.Request.Context(), c.Param("id"))
	if err != nil {
		writeError(c, err)
		return
	}

	storagePath, ok := image["storagePath"].(string)
	if !ok || storagePath == "" {
		JSONError(c, http.StatusNotFound, "NOT_FOUND", "image file not found")
		return
	}

	fullPath, ok := h.safeImagePath(storagePath)
	if !ok {
		JSONError(c, http.StatusNotFound, "NOT_FOUND", "image file not found")
		return
	}

	contentType, _ := image["contentType"].(string)
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	c.Header("Content-Type", contentType)
	c.File(fullPath)
}

func (h *DomainHandler) UpdatePlantImage(c *gin.Context) {
	body, ok := bindJSONMap(c)
	if !ok {
		return
	}
	result, err := h.service.UpdatePlantImageMetadata(c.Request.Context(), c.Param("id"), body)
	respondOne(c, result, err)
}

func (h *DomainHandler) ListPlantTasks(c *gin.Context) {
	result, err := h.service.ListPlantTasks(c.Request.Context(), c.Param("id"))
	respond(c, result, err)
}

func (h *DomainHandler) CreatePlantTask(c *gin.Context) {
	body, ok := bindJSONMap(c)
	if !ok {
		return
	}
	result, err := h.service.CreatePlantTask(c.Request.Context(), c.Param("id"), body)
	respondCreated(c, result, err)
}

func (h *DomainHandler) UpdatePlantTask(c *gin.Context) {
	body, ok := bindJSONMap(c)
	if !ok {
		return
	}
	result, err := h.service.UpdatePlantTask(c.Request.Context(), c.Param("id"), c.Param("taskId"), body)
	respondOne(c, result, err)
}

func (h *DomainHandler) ListSystemEvents(c *gin.Context) {
	result, err := h.service.ListSystemEvents(c.Request.Context())
	respond(c, result, err)
}

func (h *DomainHandler) CreateSystemEvent(c *gin.Context) {
	body, ok := bindJSONMap(c)
	if !ok {
		return
	}
	result, err := h.service.CreateSystemEvent(c.Request.Context(), body)
	respondCreated(c, result, err)
}

func (h *DomainHandler) ListSystemAlerts(c *gin.Context) {
	result, err := h.service.ListSystemAlerts(c.Request.Context(), c.Query("status"))
	respond(c, result, err)
}

func (h *DomainHandler) CreateSystemAlert(c *gin.Context) {
	body, ok := bindJSONMap(c)
	if !ok {
		return
	}
	result, err := h.service.CreateSystemAlert(c.Request.Context(), body)
	respondCreated(c, result, err)
}

func (h *DomainHandler) AcknowledgeSystemAlert(c *gin.Context) {
	body, ok := bindOptionalJSONMap(c)
	if !ok {
		return
	}
	result, err := h.service.UpdateSystemAlertStatus(c.Request.Context(), c.Param("id"), "acknowledged", body)
	respondOne(c, result, err)
}

func (h *DomainHandler) ResolveSystemAlert(c *gin.Context) {
	body, ok := bindOptionalJSONMap(c)
	if !ok {
		return
	}
	result, err := h.service.UpdateSystemAlertStatus(c.Request.Context(), c.Param("id"), "resolved", body)
	respondOne(c, result, err)
}

func (h *DomainHandler) ListAutomationRules(c *gin.Context) {
	result, err := h.service.ListAutomationRules(c.Request.Context())
	respond(c, result, err)
}

func (h *DomainHandler) CreateAutomationRule(c *gin.Context) {
	body, ok := bindJSONMap(c)
	if !ok {
		return
	}
	result, err := h.service.CreateAutomationRule(c.Request.Context(), body)
	respondCreated(c, result, err)
}

func (h *DomainHandler) ListAutomationRuleEvaluations(c *gin.Context) {
	result, err := h.service.ListAutomationRuleEvaluations(c.Request.Context(), c.Param("id"))
	respond(c, result, err)
}

func (h *DomainHandler) EvaluateAutomationRule(c *gin.Context) {
	body, ok := bindOptionalJSONMap(c)
	if !ok {
		return
	}
	result, err := h.service.EvaluateAutomationRule(c.Request.Context(), c.Param("id"), body)
	respondCreated(c, result, err)
}

func (h *DomainHandler) ListDevices(c *gin.Context) {
	result, err := h.service.ListDevices(c.Request.Context())
	respond(c, result, err)
}

func (h *DomainHandler) GetDevice(c *gin.Context) {
	result, err := h.service.GetDevice(c.Request.Context(), c.Param("id"))
	respondOne(c, result, err)
}

func (h *DomainHandler) ListDeviceCapabilities(c *gin.Context) {
	result, err := h.service.ListDeviceCapabilities(c.Request.Context(), c.Param("id"))
	respond(c, result, err)
}

func (h *DomainHandler) CreateDeviceCapability(c *gin.Context) {
	body, ok := bindJSONMap(c)
	if !ok {
		return
	}
	result, err := h.service.CreateDeviceCapability(c.Request.Context(), c.Param("id"), body)
	respondCreated(c, result, err)
}

func (h *DomainHandler) UpdateDeviceCapability(c *gin.Context) {
	body, ok := bindJSONMap(c)
	if !ok {
		return
	}
	result, err := h.service.UpdateDeviceCapability(c.Request.Context(), c.Param("id"), c.Param("capabilityId"), body)
	respondOne(c, result, err)
}

func (h *DomainHandler) GetDeviceProvisioning(c *gin.Context) {
	result, err := h.service.GetDeviceProvisioning(c.Request.Context(), c.Param("id"))
	respondOne(c, result, err)
}

func (h *DomainHandler) CreateDeviceProvisioning(c *gin.Context) {
	body, ok := bindJSONMap(c)
	if !ok {
		return
	}
	result, err := h.service.CreateDeviceProvisioning(c.Request.Context(), c.Param("id"), body)
	respondCreated(c, result, err)
}

func (h *DomainHandler) UpdateDeviceProvisioning(c *gin.Context) {
	body, ok := bindJSONMap(c)
	if !ok {
		return
	}
	result, err := h.service.UpdateDeviceProvisioning(c.Request.Context(), c.Param("id"), c.Param("provisioningId"), body)
	respondOne(c, result, err)
}

func (h *DomainHandler) ClaimDeviceProvisioning(c *gin.Context) {
	body, ok := bindJSONMap(c)
	if !ok {
		return
	}
	token, _ := body["token"].(string)
	if token == "" {
		JSONError(c, http.StatusBadRequest, "INVALID_REQUEST", "token is required")
		return
	}
	result, err := h.service.ClaimDeviceProvisioning(c.Request.Context(), token)
	respondOne(c, result, err)
}

func (h *DomainHandler) ListSensorCalibrations(c *gin.Context) {
	result, err := h.service.ListSensorCalibrations(c.Request.Context(), c.Param("id"))
	respond(c, result, err)
}

func (h *DomainHandler) ListLatestSensorReadings(c *gin.Context) {
	result, err := h.service.ListLatestSensorReadings(c.Request.Context(), c.Query("zoneId"))
	respond(c, result, err)
}

func (h *DomainHandler) ListSensorReadings(c *gin.Context) {
	result, err := h.service.ListSensorReadings(c.Request.Context(), c.Param("id"), c.Query("hours"), c.Query("limit"))
	respond(c, result, err)
}

func (h *DomainHandler) CreateSensorCalibration(c *gin.Context) {
	body, ok := bindJSONMap(c)
	if !ok {
		return
	}
	result, err := h.service.CreateSensorCalibration(c.Request.Context(), c.Param("id"), body)
	respondCreated(c, result, err)
}

func (h *DomainHandler) UpdateSensorCalibration(c *gin.Context) {
	body, ok := bindJSONMap(c)
	if !ok {
		return
	}
	result, err := h.service.UpdateSensorCalibration(c.Request.Context(), c.Param("id"), c.Param("calibrationId"), body)
	respondOne(c, result, err)
}

func (h *DomainHandler) ListLightingSystems(c *gin.Context) {
	result, err := h.service.ListLightingSystems(c.Request.Context())
	respond(c, result, err)
}

func (h *DomainHandler) ListLightingProfiles(c *gin.Context) {
	result, err := h.service.ListLightingProfiles(c.Request.Context(), c.Query("zoneId"))
	respond(c, result, err)
}

func (h *DomainHandler) CreateLightingProfile(c *gin.Context) {
	body, ok := bindJSONMap(c)
	if !ok {
		return
	}
	result, err := h.service.CreateLightingProfile(c.Request.Context(), body)
	respondCreated(c, result, err)
}

func (h *DomainHandler) ActivateLightingProfileDefault(c *gin.Context) {
	result, err := h.service.ActivateLightingProfileDefault(c.Request.Context(), c.Param("id"))
	respondOne(c, result, err)
}

func (h *DomainHandler) GetLightingState(c *gin.Context) {
	result, err := h.service.GetLightingState(c.Request.Context(), c.Param("id"))
	respondOne(c, result, err)
}

func (h *DomainHandler) ListLightingEvents(c *gin.Context) {
	result, err := h.service.ListLightingEvents(c.Request.Context(), c.Param("id"))
	respond(c, result, err)
}

func (h *DomainHandler) TurnLightingOn(c *gin.Context) {
	result, err := h.service.LightingCommand(c.Request.Context(), c.Param("id"), "on", map[string]any{})
	respondOne(c, result, err)
}

func (h *DomainHandler) TurnLightingOff(c *gin.Context) {
	result, err := h.service.LightingCommand(c.Request.Context(), c.Param("id"), "off", map[string]any{})
	respondOne(c, result, err)
}

func (h *DomainHandler) SetLightingBrightness(c *gin.Context) {
	body, ok := bindJSONMap(c)
	if !ok {
		return
	}
	result, err := h.service.LightingCommand(c.Request.Context(), c.Param("id"), "brightness", body)
	respondOne(c, result, err)
}

func (h *DomainHandler) ListFirmwareVersions(c *gin.Context) {
	result, err := h.service.ListFirmwareVersions(c.Request.Context())
	respond(c, result, err)
}

func (h *DomainHandler) CreateFirmwareVersion(c *gin.Context) {
	if c.ContentType() == "multipart/form-data" {
		body, savedPath, ok := h.bindFirmwareUpload(c)
		if !ok {
			return
		}
		result, err := h.service.CreateFirmwareVersion(c.Request.Context(), body)
		if err != nil && savedPath != "" {
			_ = os.Remove(savedPath)
		}
		respondCreated(c, result, err)
		return
	}

	body, ok := bindJSONMap(c)
	if !ok {
		return
	}
	result, err := h.service.CreateFirmwareVersion(c.Request.Context(), body)
	respondCreated(c, result, err)
}

func (h *DomainHandler) ServeFirmwareFile(c *gin.Context) {
	firmware, err := h.service.GetFirmwareVersion(c.Request.Context(), c.Param("id"))
	if err != nil {
		writeError(c, err)
		return
	}

	storagePath, ok := firmware["storagePath"].(string)
	if !ok || storagePath == "" {
		JSONError(c, http.StatusNotFound, "NOT_FOUND", "firmware file not found")
		return
	}

	fullPath, ok := h.safeFirmwarePath(storagePath)
	if !ok {
		JSONError(c, http.StatusNotFound, "NOT_FOUND", "firmware file not found")
		return
	}

	contentType := "application/octet-stream"
	if metadata, ok := firmware["metadata"].(map[string]any); ok {
		if value, ok := metadata["contentType"].(string); ok && value != "" {
			contentType = value
		}
	}
	c.Header("Content-Type", contentType)
	c.File(fullPath)
}

func (h *DomainHandler) ListFirmwareChannels(c *gin.Context) {
	result, err := h.service.ListFirmwareChannels(c.Request.Context())
	respond(c, result, err)
}

func (h *DomainHandler) SetFirmwareChannelDefault(c *gin.Context) {
	result, err := h.service.SetFirmwareChannelDefault(c.Request.Context(), c.Param("id"))
	respondOne(c, result, err)
}

func (h *DomainHandler) ListOtaJobs(c *gin.Context) {
	result, err := h.service.ListOtaJobs(c.Request.Context(), c.Param("id"))
	respond(c, result, err)
}

func (h *DomainHandler) CreateOtaJob(c *gin.Context) {
	body, ok := bindJSONMap(c)
	if !ok {
		return
	}
	result, err := h.service.CreateOtaJob(c.Request.Context(), c.Param("id"), body)
	respondWithStatus(c, http.StatusAccepted, result, err)
}

func (h *DomainHandler) CreateOtaDryRun(c *gin.Context) {
	body, ok := bindJSONMap(c)
	if !ok {
		return
	}
	result, err := h.service.CreateOtaDryRun(c.Request.Context(), c.Param("id"), body)
	respondOne(c, result, err)
}

func (h *DomainHandler) ListIrrigationSystems(c *gin.Context) {
	result, err := h.service.ListIrrigationSystems(c.Request.Context())
	respond(c, result, err)
}

func (h *DomainHandler) GetIrrigationSafety(c *gin.Context) {
	result, err := h.service.GetIrrigationSafety(c.Request.Context())
	respondOne(c, result, err)
}

func (h *DomainHandler) RunIrrigationManual(c *gin.Context) {
	if err := h.service.RunIrrigationManual(c.Request.Context(), c.Param("id")); err != nil {
		if errors.Is(err, services.ErrIrrigationDisabled) {
			JSONError(c, http.StatusConflict, "IRRIGATION_DISABLED", "manual irrigation is disabled")
			return
		}
		JSONError(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *DomainHandler) ListPlantFamilies(c *gin.Context) {
	result, err := h.service.ListPlantWiki(c.Request.Context(), "families")
	respond(c, result, err)
}

func (h *DomainHandler) ListPlantCategories(c *gin.Context) {
	result, err := h.service.ListPlantWiki(c.Request.Context(), "categories")
	respond(c, result, err)
}

func (h *DomainHandler) ListPlantSpecies(c *gin.Context) {
	result, err := h.service.ListPlantWiki(c.Request.Context(), "species")
	respond(c, result, err)
}

func bindJSONMap(c *gin.Context) (map[string]any, bool) {
	body := map[string]any{}
	if err := c.ShouldBindJSON(&body); err != nil {
		JSONError(c, http.StatusBadRequest, "BAD_REQUEST", "invalid JSON body")
		return nil, false
	}
	return body, true
}

func bindOptionalJSONMap(c *gin.Context) (map[string]any, bool) {
	if c.Request.Body == nil || c.Request.ContentLength == 0 {
		return map[string]any{}, true
	}
	body := map[string]any{}
	if err := c.ShouldBindJSON(&body); err != nil {
		if errors.Is(err, io.EOF) {
			return map[string]any{}, true
		}
		JSONError(c, http.StatusBadRequest, "BAD_REQUEST", "invalid JSON body")
		return nil, false
	}
	return body, true
}

func formTags(c *gin.Context) []string {
	tags := c.PostFormArray("tags")
	if len(tags) == 0 {
		rawTags := c.PostForm("tags")
		if rawTags == "" {
			return nil
		}
		var parsed []string
		if err := json.Unmarshal([]byte(rawTags), &parsed); err == nil {
			tags = parsed
		} else {
			tags = strings.Split(rawTags, ",")
		}
	}

	clean := make([]string, 0, len(tags))
	for _, tag := range tags {
		tag = strings.TrimSpace(tag)
		if tag != "" {
			clean = append(clean, tag)
		}
	}
	return clean
}

func (h *DomainHandler) bindPlantImageUpload(c *gin.Context) (map[string]any, string, bool) {
	if c.ContentType() != "multipart/form-data" {
		JSONError(c, http.StatusBadRequest, "BAD_REQUEST", "image upload requires multipart form data")
		return nil, "", false
	}

	file, err := c.FormFile("file")
	if err != nil {
		JSONError(c, http.StatusBadRequest, "BAD_REQUEST", "missing image file")
		return nil, "", false
	}
	if file.Size <= 0 {
		JSONError(c, http.StatusBadRequest, "BAD_REQUEST", "empty image file")
		return nil, "", false
	}
	if file.Size > h.imageUploadMaxBytes {
		JSONError(c, http.StatusBadRequest, "BAD_REQUEST", "image file too large")
		return nil, "", false
	}

	plant, err := h.service.GetPlant(c.Request.Context(), c.Param("id"))
	if err != nil {
		writeError(c, err)
		return nil, "", false
	}

	src, err := file.Open()
	if err != nil {
		JSONError(c, http.StatusBadRequest, "BAD_REQUEST", "unable to read image file")
		return nil, "", false
	}
	defer src.Close()

	data, err := io.ReadAll(io.LimitReader(src, h.imageUploadMaxBytes+1))
	if err != nil {
		JSONError(c, http.StatusBadRequest, "BAD_REQUEST", "unable to read image file")
		return nil, "", false
	}
	if int64(len(data)) > h.imageUploadMaxBytes {
		JSONError(c, http.StatusBadRequest, "BAD_REQUEST", "image file too large")
		return nil, "", false
	}

	contentType := http.DetectContentType(data)
	extension, ok := imageExtension(contentType)
	if !ok {
		JSONError(c, http.StatusBadRequest, "BAD_REQUEST", "unsupported image content type")
		return nil, "", false
	}

	sum := sha256.Sum256(data)
	checksum := hex.EncodeToString(sum[:])
	relativePath := filepath.Join("plants", c.Param("id"), fmt.Sprintf("%d-%s%s", time.Now().UTC().UnixNano(), checksum[:16], extension))
	fullPath, ok := h.safeImagePath(relativePath)
	if !ok {
		JSONError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "invalid image storage path")
		return nil, "", false
	}
	if err := os.MkdirAll(filepath.Dir(fullPath), 0o755); err != nil {
		JSONError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "unable to prepare image storage")
		return nil, "", false
	}
	if err := os.WriteFile(fullPath, data, 0o644); err != nil {
		JSONError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "unable to store image file")
		return nil, "", false
	}

	body := map[string]any{
		"storagePath":      relativePath,
		"originalFilename": file.Filename,
		"contentType":      contentType,
		"sizeBytes":        int64(len(data)),
		"checksumSha256":   checksum,
		"zoneId":           plant["zoneId"],
	}
	for _, key := range []string{"capturedAt", "growthStage"} {
		if value := c.PostForm(key); value != "" {
			body[key] = value
		}
	}
	if tags := formTags(c); len(tags) > 0 {
		body["tags"] = tags
	}
	if rawMetadata := c.PostForm("metadata"); rawMetadata != "" {
		var metadata map[string]any
		if err := json.Unmarshal([]byte(rawMetadata), &metadata); err != nil {
			_ = os.Remove(fullPath)
			JSONError(c, http.StatusBadRequest, "BAD_REQUEST", "invalid metadata JSON")
			return nil, "", false
		}
		body["metadata"] = metadata
	}
	return body, fullPath, true
}

func (h *DomainHandler) safeImagePath(storagePath string) (string, bool) {
	if filepath.IsAbs(storagePath) {
		return "", false
	}

	root, err := filepath.Abs(h.imageStoragePath)
	if err != nil {
		return "", false
	}
	fullPath := filepath.Join(root, filepath.Clean(storagePath))
	if fullPath != root && !strings.HasPrefix(fullPath, root+string(os.PathSeparator)) {
		return "", false
	}
	return fullPath, true
}

func imageExtension(contentType string) (string, bool) {
	switch contentType {
	case "image/jpeg":
		return ".jpg", true
	case "image/png":
		return ".png", true
	case "image/webp":
		return ".webp", true
	default:
		return "", false
	}
}

func (h *DomainHandler) bindFirmwareUpload(c *gin.Context) (map[string]any, string, bool) {
	file, err := c.FormFile("file")
	if err != nil {
		JSONError(c, http.StatusBadRequest, "BAD_REQUEST", "missing firmware file")
		return nil, "", false
	}
	if file.Size <= 0 {
		JSONError(c, http.StatusBadRequest, "BAD_REQUEST", "empty firmware file")
		return nil, "", false
	}
	if file.Size > h.firmwareUploadMaxBytes {
		JSONError(c, http.StatusBadRequest, "BAD_REQUEST", "firmware file too large")
		return nil, "", false
	}

	deviceType := strings.TrimSpace(c.PostForm("deviceType"))
	version := strings.TrimSpace(c.PostForm("version"))
	if deviceType == "" || version == "" {
		JSONError(c, http.StatusBadRequest, "BAD_REQUEST", "deviceType and version are required")
		return nil, "", false
	}

	src, err := file.Open()
	if err != nil {
		JSONError(c, http.StatusBadRequest, "BAD_REQUEST", "unable to read firmware file")
		return nil, "", false
	}
	defer src.Close()

	data, err := io.ReadAll(io.LimitReader(src, h.firmwareUploadMaxBytes+1))
	if err != nil {
		JSONError(c, http.StatusBadRequest, "BAD_REQUEST", "unable to read firmware file")
		return nil, "", false
	}
	if int64(len(data)) > h.firmwareUploadMaxBytes {
		JSONError(c, http.StatusBadRequest, "BAD_REQUEST", "firmware file too large")
		return nil, "", false
	}

	sum := sha256.Sum256(data)
	checksum := hex.EncodeToString(sum[:])
	contentType := file.Header.Get("Content-Type")
	if contentType == "" {
		contentType = http.DetectContentType(data)
	}
	extension := firmwareExtension(file.Filename)
	relativePath := filepath.Join(
		firmwarePathSegment(deviceType),
		firmwarePathSegment(version),
		fmt.Sprintf("%d-%s%s", time.Now().UTC().UnixNano(), checksum[:16], extension),
	)
	fullPath, ok := h.safeFirmwarePath(relativePath)
	if !ok {
		JSONError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "invalid firmware storage path")
		return nil, "", false
	}
	if err := os.MkdirAll(filepath.Dir(fullPath), 0o755); err != nil {
		JSONError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "unable to prepare firmware storage")
		return nil, "", false
	}
	if err := os.WriteFile(fullPath, data, 0o644); err != nil {
		JSONError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "unable to store firmware file")
		return nil, "", false
	}

	metadata := map[string]any{
		"originalFilename": file.Filename,
		"contentType":      contentType,
		"uploadedAt":       time.Now().UTC().Format(time.RFC3339Nano),
	}
	if rawMetadata := c.PostForm("metadata"); rawMetadata != "" {
		var parsed map[string]any
		if err := json.Unmarshal([]byte(rawMetadata), &parsed); err != nil {
			_ = os.Remove(fullPath)
			JSONError(c, http.StatusBadRequest, "BAD_REQUEST", "invalid metadata JSON")
			return nil, "", false
		}
		for key, value := range parsed {
			metadata[key] = value
		}
	}

	body := map[string]any{
		"deviceType":     deviceType,
		"version":        version,
		"storagePath":    relativePath,
		"checksumSha256": checksum,
		"sizeBytes":      int64(len(data)),
		"metadata":       metadata,
	}
	if channelID := strings.TrimSpace(c.PostForm("channelId")); channelID != "" {
		body["channelId"] = channelID
	}
	return body, fullPath, true
}

func (h *DomainHandler) safeFirmwarePath(storagePath string) (string, bool) {
	if filepath.IsAbs(storagePath) {
		return "", false
	}

	root, err := filepath.Abs(h.firmwareStoragePath)
	if err != nil {
		return "", false
	}
	fullPath := filepath.Join(root, filepath.Clean(storagePath))
	if fullPath != root && !strings.HasPrefix(fullPath, root+string(os.PathSeparator)) {
		return "", false
	}
	return fullPath, true
}

func firmwareExtension(filename string) string {
	switch strings.ToLower(filepath.Ext(filename)) {
	case ".bin", ".img", ".hex", ".uf2":
		return strings.ToLower(filepath.Ext(filename))
	default:
		return ".bin"
	}
}

func firmwarePathSegment(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))
	var builder strings.Builder
	for _, ch := range value {
		switch {
		case ch >= 'a' && ch <= 'z':
			builder.WriteRune(ch)
		case ch >= '0' && ch <= '9':
			builder.WriteRune(ch)
		case ch == '.', ch == '_', ch == '-':
			builder.WriteRune(ch)
		default:
			builder.WriteRune('-')
		}
	}
	clean := strings.Trim(builder.String(), ".-_")
	if clean == "" {
		return "unknown"
	}
	return clean
}

func respond(c *gin.Context, result []repositories.Record, err error) {
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func respondOne(c *gin.Context, result repositories.Record, err error) {
	respondWithStatus(c, http.StatusOK, result, err)
}

func respondCreated(c *gin.Context, result repositories.Record, err error) {
	respondWithStatus(c, http.StatusCreated, result, err)
}

func respondWithStatus(c *gin.Context, status int, result repositories.Record, err error) {
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(status, result)
}

func respondNoContent(c *gin.Context, err error) {
	if err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func writeError(c *gin.Context, err error) {
	if errors.Is(err, repositories.ErrNotFound) {
		JSONError(c, http.StatusNotFound, "NOT_FOUND", "resource not found")
		return
	}
	JSONError(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
}
