package automation

import (
	"context"
	"log/slog"
	"time"

	"growlab/apps/api/internal/services"
)

type Scheduler struct {
	service *services.DomainService
	tick    time.Duration
	limit   int
	logger  *slog.Logger
	running chan struct{}
}

type SchedulerOptions struct {
	Service *services.DomainService
	Tick    time.Duration
	Limit   int
	Logger  *slog.Logger
}

func NewScheduler(options SchedulerOptions) *Scheduler {
	tick := options.Tick
	if tick <= 0 {
		tick = 30 * time.Second
	}
	limit := options.Limit
	if limit <= 0 {
		limit = 25
	}
	logger := options.Logger
	if logger == nil {
		logger = slog.Default()
	}

	return &Scheduler{
		service: options.Service,
		tick:    tick,
		limit:   limit,
		logger:  logger,
		running: make(chan struct{}, 1),
	}
}

func (s *Scheduler) Start(ctx context.Context) {
	if s.service == nil {
		s.logger.Warn("rules scheduler disabled: missing domain service")
		return
	}

	s.logger.Info("rules scheduler started", "tick", s.tick.String(), "limit", s.limit)
	s.runOnce(ctx)

	ticker := time.NewTicker(s.tick)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			s.logger.Info("rules scheduler stopped")
			return
		case <-ticker.C:
			s.runOnce(ctx)
		}
	}
}

func (s *Scheduler) runOnce(ctx context.Context) {
	select {
	case s.running <- struct{}{}:
		defer func() { <-s.running }()
	default:
		s.logger.Warn("rules scheduler tick skipped: previous run still active")
		return
	}

	results, err := s.service.RunScheduledAutomationRules(ctx, s.limit)
	if err != nil {
		s.logger.Error("rules scheduler run failed", "error", err)
		return
	}
	if len(results) == 0 {
		s.logger.Debug("rules scheduler run completed", "rules", 0)
		return
	}
	s.logger.Info("rules scheduler run completed", "rules", len(results))
}
