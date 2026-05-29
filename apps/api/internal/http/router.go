package httpapi

import (
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"growlab/apps/api/internal/config"
	"growlab/apps/api/internal/handlers"
	"growlab/apps/api/internal/metrics"
	"growlab/apps/api/internal/middleware"
)

type RouterOptions struct {
	Config        config.Config
	Metrics       *metrics.Metrics
	DomainHandler *handlers.DomainHandler
}

func NewRouter(opts RouterOptions) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(cors.New(cors.Config{
		AllowOrigins:     opts.Config.AllowedCORSOrigins,
		AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
		MaxAge:           12 * time.Hour,
	}))

	if opts.Metrics != nil {
		router.Use(middleware.Metrics(opts.Metrics))
		router.GET("/metrics", gin.WrapH(promhttp.HandlerFor(opts.Metrics.Registry, promhttp.HandlerOpts{})))
	}

	health := handlers.NewHealthHandler("growlab-api")
	router.GET("/api/health", health.Get)

	if opts.DomainHandler != nil {
		registerDomainRoutes(router, opts.DomainHandler)
	}

	router.NoRoute(handlers.NotFound)

	return router
}

func registerDomainRoutes(router *gin.Engine, domain *handlers.DomainHandler) {
	router.GET("/api/zones", domain.ListZones)
	router.POST("/api/zones", domain.CreateZone)
	router.GET("/api/zones/:id", domain.GetZone)
	router.PUT("/api/zones/:id", domain.UpdateZone)
	router.DELETE("/api/zones/:id", domain.DeleteZone)
	router.GET("/api/zones/:id/profiles", domain.ListZoneProfiles)
	router.POST("/api/zones/:id/profiles", domain.CreateZoneProfile)

	router.GET("/api/plants", domain.ListPlants)
	router.POST("/api/plants", domain.CreatePlant)
	router.GET("/api/plants/:id", domain.GetPlant)
	router.PUT("/api/plants/:id", domain.UpdatePlant)
	router.DELETE("/api/plants/:id", domain.DeletePlant)
	router.GET("/api/plants/:id/timeline", domain.GetPlantTimeline)
	router.GET("/api/plants/:id/events", domain.ListPlantEvents)
	router.POST("/api/plants/:id/events", domain.CreatePlantEvent)
	router.GET("/api/plants/:id/images", domain.ListPlantImages)
	router.POST("/api/plants/:id/images", domain.CreatePlantImage)
	router.GET("/api/images/:id/file", domain.ServePlantImage)
	router.GET("/api/plants/:id/tasks", domain.ListPlantTasks)
	router.POST("/api/plants/:id/tasks", domain.CreatePlantTask)

	router.GET("/api/wiki/plant-families", domain.ListPlantFamilies)
	router.GET("/api/wiki/plant-categories", domain.ListPlantCategories)
	router.GET("/api/wiki/plant-species", domain.ListPlantSpecies)

	router.GET("/api/system/events", domain.ListSystemEvents)
	router.POST("/api/system/events", domain.CreateSystemEvent)
	router.GET("/api/system/alerts", domain.ListSystemAlerts)
	router.POST("/api/system/alerts", domain.CreateSystemAlert)
	router.POST("/api/system/alerts/:id/acknowledge", domain.AcknowledgeSystemAlert)
	router.POST("/api/system/alerts/:id/resolve", domain.ResolveSystemAlert)

	router.GET("/api/devices", domain.ListDevices)
	router.GET("/api/devices/:id", domain.GetDevice)
	router.GET("/api/devices/:id/capabilities", domain.ListDeviceCapabilities)
	router.GET("/api/devices/:id/provisioning", domain.GetDeviceProvisioning)
	router.POST("/api/devices/:id/provisioning", domain.CreateDeviceProvisioning)
	router.POST("/api/provisioning/claim", domain.ClaimDeviceProvisioning)
	router.GET("/api/sensors/:id/calibrations", domain.ListSensorCalibrations)
	router.POST("/api/sensors/:id/calibrations", domain.CreateSensorCalibration)

	router.GET("/api/lighting", domain.ListLightingSystems)
	router.GET("/api/lighting/profiles", domain.ListLightingProfiles)
	router.POST("/api/lighting/profiles", domain.CreateLightingProfile)
	router.GET("/api/lighting/:id/state", domain.GetLightingState)
	router.GET("/api/lighting/:id/events", domain.ListLightingEvents)
	router.POST("/api/lighting/:id/on", domain.TurnLightingOn)
	router.POST("/api/lighting/:id/off", domain.TurnLightingOff)
	router.POST("/api/lighting/:id/brightness", domain.SetLightingBrightness)

	router.GET("/api/firmware", domain.ListFirmwareVersions)
	router.POST("/api/firmware", domain.CreateFirmwareVersion)
	router.GET("/api/firmware/:id/file", domain.ServeFirmwareFile)
	router.GET("/api/firmware/channels", domain.ListFirmwareChannels)
	router.GET("/api/devices/:id/ota", domain.ListOtaJobs)
	router.POST("/api/devices/:id/ota", domain.CreateOtaJob)
	router.POST("/api/devices/:id/ota/dry-run", domain.CreateOtaDryRun)

	router.GET("/api/irrigation", domain.ListIrrigationSystems)
	router.GET("/api/irrigation/safety", domain.GetIrrigationSafety)
	router.POST("/api/irrigation/:id/manual-run", domain.RunIrrigationManual)
}
