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
	Config  config.Config
	Metrics *metrics.Metrics
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
	router.NoRoute(handlers.NotFound)

	return router
}
