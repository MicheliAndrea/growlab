package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"growlab/apps/api/internal/config"
	"growlab/apps/api/internal/database"
	httpapi "growlab/apps/api/internal/http"
	"growlab/apps/api/internal/metrics"
)

func main() {
	cfg := config.Load()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	dbCtx, dbCancel := context.WithTimeout(ctx, 10*time.Second)
	defer dbCancel()

	postgresPool, err := database.OpenPostgres(dbCtx, cfg.PostgresDSN)
	if err != nil {
		logger.Error("postgres connection failed", "error", err)
		os.Exit(1)
	}
	defer postgresPool.Close()

	redisClient, err := database.OpenRedis(ctx, database.RedisConfig{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})
	if err != nil {
		logger.Warn("redis unavailable; continuing without cache", "error", err)
	} else if redisClient != nil {
		defer func() {
			if err := redisClient.Close(); err != nil {
				logger.Warn("redis close failed", "error", err)
			}
		}()
	}

	apiMetrics := metrics.New(metrics.BuildInfo{
		Version: cfg.BuildVersion,
		Commit:  cfg.BuildCommit,
		Date:    cfg.BuildDate,
	})

	router := httpapi.NewRouter(httpapi.RouterOptions{
		Config:  cfg,
		Metrics: apiMetrics,
	})

	server := &http.Server{
		Addr:              cfg.APIAddr,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	serverErrors := make(chan error, 1)
	go func() {
		logger.Info("starting GrowLab API", "addr", cfg.APIAddr, "env", cfg.Env)
		serverErrors <- server.ListenAndServe()
	}()

	select {
	case <-ctx.Done():
		logger.Info("shutdown signal received")
	case err := <-serverErrors:
		if !errors.Is(err, http.ErrServerClosed) {
			logger.Error("api server failed", "error", err)
			os.Exit(1)
		}
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("graceful shutdown failed", "error", err)
		os.Exit(1)
	}

	logger.Info("GrowLab API stopped")
}
