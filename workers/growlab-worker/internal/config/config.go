package config

import (
	"fmt"
	"os"
	"time"
)

type Config struct {
	Env             string
	MetricsAddr     string
	ShutdownTimeout time.Duration
	PostgresDSN     string
	MQTTBroker      string
	MQTTClientID    string
	MQTTUsername    string
	MQTTPassword    string
	BuildVersion    string
	BuildCommit     string
	BuildDate       string
}

func Load() Config {
	return Config{
		Env:             env("GROWLAB_ENV", "development"),
		MetricsAddr:     env("GROWLAB_WORKER_METRICS_ADDR", ":9091"),
		ShutdownTimeout: envDuration("GROWLAB_SHUTDOWN_TIMEOUT", 10*time.Second),
		PostgresDSN:     postgresDSN(),
		MQTTBroker:      env("GROWLAB_MQTT_BROKER", "tcp://localhost:1883"),
		MQTTClientID:    env("GROWLAB_MQTT_CLIENT_ID", "growlab-worker"),
		MQTTUsername:    env("GROWLAB_MQTT_USERNAME", ""),
		MQTTPassword:    env("GROWLAB_MQTT_PASSWORD", ""),
		BuildVersion:    env("GROWLAB_BUILD_VERSION", "dev"),
		BuildCommit:     env("GROWLAB_BUILD_COMMIT", "unknown"),
		BuildDate:       env("GROWLAB_BUILD_DATE", "unknown"),
	}
}

func env(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func envDuration(key string, fallback time.Duration) time.Duration {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func postgresDSN() string {
	if dsn := os.Getenv("DB_DSN"); dsn != "" {
		return dsn
	}
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		env("GROWLAB_DB_HOST", "pg-01"),
		env("GROWLAB_DB_PORT", "5432"),
		env("GROWLAB_DB_USER", "growlab"),
		env("GROWLAB_DB_PASSWORD", "change-me"),
		env("GROWLAB_DB_NAME", "growlab"),
		env("GROWLAB_DB_SSLMODE", "disable"),
	)
}
