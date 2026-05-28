package metrics

import (
	"time"

	"github.com/prometheus/client_golang/prometheus"
)

type BuildInfo struct {
	Version string
	Commit  string
	Date    string
}

type Metrics struct {
	Registry          *prometheus.Registry
	MQTTMessages      *prometheus.CounterVec
	MQTTProcessErrors *prometheus.CounterVec
	ProcessDuration   *prometheus.HistogramVec
}

func New(build BuildInfo) *Metrics {
	registry := prometheus.NewRegistry()

	messages := prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "growlab_worker_mqtt_messages_total",
			Help: "Total MQTT messages handled by GrowLab worker.",
		},
		[]string{"topic", "result"},
	)

	errors := prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "growlab_worker_mqtt_errors_total",
			Help: "Total MQTT processing errors by type.",
		},
		[]string{"type"},
	)

	duration := prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "growlab_worker_mqtt_processing_duration_seconds",
			Help:    "MQTT message processing duration in seconds.",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"topic"},
	)

	buildInfo := prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "growlab_worker_build_info",
			Help: "Build information for GrowLab worker.",
		},
		[]string{"version", "commit", "date"},
	)
	buildInfo.WithLabelValues(build.Version, build.Commit, build.Date).Set(1)

	registry.MustRegister(messages, errors, duration, buildInfo)

	return &Metrics{
		Registry:          registry,
		MQTTMessages:      messages,
		MQTTProcessErrors: errors,
		ProcessDuration:   duration,
	}
}

func (m *Metrics) ObserveMessage(topic string, startedAt time.Time, err error) {
	result := "ok"
	if err != nil {
		result = "error"
	}
	m.MQTTMessages.WithLabelValues(topic, result).Inc()
	m.ProcessDuration.WithLabelValues(topic).Observe(time.Since(startedAt).Seconds())
}

func (m *Metrics) ObserveError(kind string) {
	m.MQTTProcessErrors.WithLabelValues(kind).Inc()
}
