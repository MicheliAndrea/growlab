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

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"growlab/workers/growlab-worker/internal/config"
	"growlab/workers/growlab-worker/internal/metrics"
	workermqtt "growlab/workers/growlab-worker/internal/mqtt"
	"growlab/workers/growlab-worker/internal/processor"
	"growlab/workers/growlab-worker/internal/store"
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

	pool, err := pgxpool.New(dbCtx, cfg.PostgresDSN)
	if err != nil {
		logger.Error("postgres pool init failed", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err := pool.Ping(dbCtx); err != nil {
		logger.Error("postgres ping failed", "error", err)
		os.Exit(1)
	}

	workerMetrics := metrics.New(metrics.BuildInfo{
		Version: cfg.BuildVersion,
		Commit:  cfg.BuildCommit,
		Date:    cfg.BuildDate,
	})

	metricsServer := &http.Server{
		Addr:              cfg.MetricsAddr,
		Handler:           promhttp.HandlerFor(workerMetrics.Registry, promhttp.HandlerOpts{}),
		ReadHeaderTimeout: 5 * time.Second,
	}

	serverErrors := make(chan error, 1)
	go func() {
		logger.Info("starting GrowLab worker metrics", "addr", cfg.MetricsAddr)
		serverErrors <- metricsServer.ListenAndServe()
	}()

	messageProcessor := processor.New(store.New(pool))
	mqttClient := workermqtt.New(workermqtt.Config{
		Broker:   cfg.MQTTBroker,
		ClientID: cfg.MQTTClientID,
		Username: cfg.MQTTUsername,
		Password: cfg.MQTTPassword,
	}, messageProcessor, workerMetrics, logger)

	mqttCtx, mqttCancel := context.WithTimeout(ctx, 15*time.Second)
	defer mqttCancel()
	if err := mqttClient.Connect(mqttCtx); err != nil {
		logger.Error("mqtt connect failed", "error", err)
		os.Exit(1)
	}

	logger.Info("GrowLab MQTT worker started", "broker", cfg.MQTTBroker, "env", cfg.Env)

	select {
	case <-ctx.Done():
		logger.Info("shutdown signal received")
	case err := <-serverErrors:
		if !errors.Is(err, http.ErrServerClosed) {
			logger.Error("metrics server failed", "error", err)
			os.Exit(1)
		}
	}

	mqttClient.Disconnect(cfg.ShutdownTimeout)

	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()
	if err := metricsServer.Shutdown(shutdownCtx); err != nil {
		logger.Error("metrics shutdown failed", "error", err)
		os.Exit(1)
	}

	logger.Info("GrowLab MQTT worker stopped")
}
