package mqtt

import (
	"context"
	"errors"
	"log/slog"
	"time"

	paho "github.com/eclipse/paho.mqtt.golang"

	"growlab/workers/growlab-worker/internal/metrics"
	"growlab/workers/growlab-worker/internal/processor"
)

type Config struct {
	Broker   string
	ClientID string
	Username string
	Password string
}

type Client struct {
	client    paho.Client
	metrics   *metrics.Metrics
	processor *processor.Processor
	logger    *slog.Logger
}

func New(cfg Config, processor *processor.Processor, metrics *metrics.Metrics, logger *slog.Logger) *Client {
	client := &Client{
		metrics:   metrics,
		processor: processor,
		logger:    logger,
	}

	opts := paho.NewClientOptions().
		AddBroker(cfg.Broker).
		SetClientID(cfg.ClientID).
		SetCleanSession(false).
		SetResumeSubs(true).
		SetAutoReconnect(true).
		SetConnectRetry(true).
		SetOrderMatters(false).
		SetDefaultPublishHandler(client.handleMessage).
		SetConnectionLostHandler(func(_ paho.Client, err error) {
			logger.Warn("mqtt connection lost", "error", err)
		}).
		SetOnConnectHandler(func(c paho.Client) {
			logger.Info("mqtt connected")
		})

	if cfg.Username != "" {
		opts.SetUsername(cfg.Username)
	}
	if cfg.Password != "" {
		opts.SetPassword(cfg.Password)
	}

	client.client = paho.NewClient(opts)
	return client
}

func (c *Client) Connect(ctx context.Context) error {
	if err := waitToken(ctx, c.client.Connect()); err != nil {
		return err
	}

	for _, topic := range topics() {
		if err := waitToken(ctx, c.client.Subscribe(topic, 1, c.handleMessage)); err != nil {
			return err
		}
		c.logger.Info("mqtt subscribed", "topic", topic)
	}

	return nil
}

func (c *Client) Disconnect(quiesce time.Duration) {
	if c.client == nil || !c.client.IsConnected() {
		return
	}
	c.client.Disconnect(uint(quiesce.Milliseconds()))
}

func (c *Client) handleMessage(_ paho.Client, msg paho.Message) {
	startedAt := time.Now()
	topic := msg.Topic()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err := c.processor.Process(ctx, topic, msg.Payload())
	c.metrics.ObserveMessage(metricTopic(topic), startedAt, err)
	if err != nil {
		c.metrics.ObserveError(errorKind(err))
		c.logger.Warn("mqtt message rejected", "topic", topic, "error", err)
		return
	}

	c.logger.Debug("mqtt message processed", "topic", topic)
}

func topics() []string {
	return []string{
		"growlab/devices/+/telemetry",
		"growlab/devices/+/heartbeat",
		"growlab/devices/+/status",
		"growlab/devices/+/ota/status",
	}
}

func waitToken(ctx context.Context, token paho.Token) error {
	done := make(chan struct{})
	go func() {
		token.Wait()
		close(done)
	}()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-done:
		if err := token.Error(); err != nil {
			return err
		}
		return nil
	}
}

func metricTopic(topic string) string {
	parsed, err := parseMetricTopic(topic)
	if err != nil {
		return "unknown"
	}
	return parsed
}

func parseMetricTopic(topic string) (string, error) {
	switch {
	case matchTopicSuffix(topic, "/telemetry"):
		return "growlab/devices/+/telemetry", nil
	case matchTopicSuffix(topic, "/heartbeat"):
		return "growlab/devices/+/heartbeat", nil
	case matchTopicSuffix(topic, "/status") && !matchTopicSuffix(topic, "/ota/status"):
		return "growlab/devices/+/status", nil
	case matchTopicSuffix(topic, "/ota/status"):
		return "growlab/devices/+/ota/status", nil
	default:
		return "", processor.ErrInvalidTopic
	}
}

func matchTopicSuffix(topic string, suffix string) bool {
	if len(topic) < len(suffix) {
		return false
	}
	return topic[len(topic)-len(suffix):] == suffix
}

func errorKind(err error) string {
	switch {
	case errors.Is(err, processor.ErrInvalidPayload):
		return "invalid_payload"
	case errors.Is(err, processor.ErrInvalidTopic):
		return "invalid_topic"
	default:
		return "processing"
	}
}
