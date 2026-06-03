package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	Env                         string
	APIAddr                     string
	PublicAPIURL                string
	PublicWebURL                string
	ShutdownTimeout             time.Duration
	PostgresDSN                 string
	RedisAddr                   string
	RedisPassword               string
	RedisDB                     int
	BuildVersion                string
	BuildCommit                 string
	BuildDate                   string
	AllowedCORSOrigins          []string
	ImageStoragePath            string
	ImageUploadMaxBytes         int64
	FirmwareStoragePath         string
	FirmwareUploadMaxBytes      int64
	ShellyTimeout               time.Duration
	RulesSchedulerEnabled       bool
	RulesSchedulerTick          time.Duration
	RulesSchedulerBatchLimit    int
	FeatureIrrigationManual     bool
	FeatureIrrigationAutomation bool
}

func Load() Config {
	return Config{
		Env:                         env("GROWLAB_ENV", "development"),
		APIAddr:                     env("GROWLAB_API_ADDR", ":8080"),
		PublicAPIURL:                env("GROWLAB_PUBLIC_API_URL", "http://localhost:8080"),
		PublicWebURL:                env("GROWLAB_PUBLIC_WEB_URL", "http://localhost:3000"),
		ShutdownTimeout:             envDuration("GROWLAB_SHUTDOWN_TIMEOUT", 10*time.Second),
		PostgresDSN:                 postgresDSN(),
		RedisAddr:                   env("GROWLAB_REDIS_ADDR", ""),
		RedisPassword:               env("GROWLAB_REDIS_PASSWORD", ""),
		RedisDB:                     envInt("GROWLAB_REDIS_DB", 0),
		BuildVersion:                env("GROWLAB_BUILD_VERSION", "dev"),
		BuildCommit:                 env("GROWLAB_BUILD_COMMIT", "unknown"),
		BuildDate:                   env("GROWLAB_BUILD_DATE", "unknown"),
		AllowedCORSOrigins:          envList("GROWLAB_CORS_ORIGINS", []string{"http://localhost:3000", "http://127.0.0.1:3000"}),
		ImageStoragePath:            env("GROWLAB_IMAGE_STORAGE_PATH", "./storage/images"),
		ImageUploadMaxBytes:         envInt64("GROWLAB_IMAGE_UPLOAD_MAX_BYTES", 15*1024*1024),
		FirmwareStoragePath:         env("GROWLAB_FIRMWARE_STORAGE_PATH", "./storage/firmware"),
		FirmwareUploadMaxBytes:      envInt64("GROWLAB_FIRMWARE_UPLOAD_MAX_BYTES", 32*1024*1024),
		ShellyTimeout:               envDuration("GROWLAB_SHELLY_TIMEOUT", 3*time.Second),
		RulesSchedulerEnabled:       envBool("GROWLAB_RULES_SCHEDULER_ENABLED", false),
		RulesSchedulerTick:          envDuration("GROWLAB_RULES_SCHEDULER_TICK", 30*time.Second),
		RulesSchedulerBatchLimit:    envInt("GROWLAB_RULES_SCHEDULER_BATCH_LIMIT", 25),
		FeatureIrrigationManual:     envBool("GROWLAB_FEATURE_IRRIGATION_MANUAL", false),
		FeatureIrrigationAutomation: envBool("GROWLAB_FEATURE_IRRIGATION_AUTOMATION", false),
	}
}

func env(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func envInt(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func envInt64(key string, fallback int64) int64 {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return fallback
	}
	return parsed
}

func envBool(key string, fallback bool) bool {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
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

func envList(key string, fallback []string) []string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	var out []string
	for _, item := range splitComma(value) {
		if item != "" {
			out = append(out, item)
		}
	}
	if len(out) == 0 {
		return fallback
	}
	return out
}

func splitComma(value string) []string {
	var items []string
	start := 0
	for i, ch := range value {
		if ch == ',' {
			items = append(items, trimSpace(value[start:i]))
			start = i + 1
		}
	}
	items = append(items, trimSpace(value[start:]))
	return items
}

func trimSpace(value string) string {
	start := 0
	end := len(value)
	for start < end && (value[start] == ' ' || value[start] == '\t' || value[start] == '\n') {
		start++
	}
	for end > start && (value[end-1] == ' ' || value[end-1] == '\t' || value[end-1] == '\n') {
		end--
	}
	return value[start:end]
}

func postgresDSN() string {
	if dsn := os.Getenv("DB_DSN"); dsn != "" {
		return dsn
	}
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		env("GROWLAB_DB_HOST", "db-host"),
		env("GROWLAB_DB_PORT", "5432"),
		env("GROWLAB_DB_USER", "growlab"),
		env("GROWLAB_DB_PASSWORD", "change-me"),
		env("GROWLAB_DB_NAME", "growlab"),
		env("GROWLAB_DB_SSLMODE", "disable"),
	)
}
