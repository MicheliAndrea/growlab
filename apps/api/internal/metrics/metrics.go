package metrics

import (
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
)

type BuildInfo struct {
	Version string
	Commit  string
	Date    string
}

type Metrics struct {
	Registry        *prometheus.Registry
	RequestCount    *prometheus.CounterVec
	RequestDuration *prometheus.HistogramVec
	ErrorCount      *prometheus.CounterVec
}

func New(build BuildInfo) *Metrics {
	registry := prometheus.NewRegistry()

	requestCount := prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "growlab_api_requests_total",
			Help: "Total HTTP requests handled by GrowLab API.",
		},
		[]string{"method", "path", "status"},
	)

	requestDuration := prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "growlab_api_request_duration_seconds",
			Help:    "HTTP request duration in seconds.",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path", "status"},
	)

	errorCount := prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "growlab_api_errors_total",
			Help: "Total HTTP requests returning 5xx responses.",
		},
		[]string{"method", "path", "status"},
	)

	buildInfo := prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "growlab_api_build_info",
			Help: "Build information for GrowLab API.",
		},
		[]string{"version", "commit", "date"},
	)
	buildInfo.WithLabelValues(build.Version, build.Commit, build.Date).Set(1)

	registry.MustRegister(requestCount, requestDuration, errorCount, buildInfo)

	return &Metrics{
		Registry:        registry,
		RequestCount:    requestCount,
		RequestDuration: requestDuration,
		ErrorCount:      errorCount,
	}
}

func (m *Metrics) ObserveRequest(method, path string, status int, duration time.Duration) {
	statusLabel := strconv.Itoa(status)
	m.RequestCount.WithLabelValues(method, path, statusLabel).Inc()
	m.RequestDuration.WithLabelValues(method, path, statusLabel).Observe(duration.Seconds())
	if status >= 500 {
		m.ErrorCount.WithLabelValues(method, path, statusLabel).Inc()
	}
}
