package mqtt

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	paho "github.com/eclipse/paho.mqtt.golang"

	"growlab/workers/growlab-worker/internal/metrics"
	"growlab/workers/growlab-worker/internal/processor"
	"growlab/workers/growlab-worker/internal/store"
)

type Config struct {
	Broker   string
	ClientID string
	Username string
	Password string
}

type Client struct {
	client        paho.Client
	metrics       *metrics.Metrics
	processor     *processor.Processor
	logger        *slog.Logger
	broker        string
	clientID      string
	connectedOnce bool
}

func (c *Client) emitLifecycle(eventType string, severity string, message string, extra map[string]any) {
	if c.processor == nil {
		return
	}
	metadata := map[string]any{
		"broker":   c.broker,
		"clientId": c.clientID,
	}
	for k, v := range extra {
		metadata[k] = v
	}
	metaJSON, err := json.Marshal(metadata)
	if err != nil {
		metaJSON = []byte("{}")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	c.processor.EmitSystemEvent(ctx, store.SystemEvent{
		EventType: eventType,
		Severity:  severity,
		Source:    "worker",
		Message:   message,
		Metadata:  metaJSON,
	})
}

func New(cfg Config, processor *processor.Processor, metrics *metrics.Metrics, logger *slog.Logger) *Client {
	client := &Client{
		metrics:   metrics,
		processor: processor,
		logger:    logger,
		broker:    cfg.Broker,
		clientID:  cfg.ClientID,
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
			client.emitLifecycle("worker_mqtt_disconnected", "warning", fmt.Sprintf("mqtt connection lost: %v", err), map[string]any{"error": err.Error()})
		}).
		SetReconnectingHandler(func(_ paho.Client, _ *paho.ClientOptions) {
			logger.Info("mqtt reconnecting")
		}).
		SetOnConnectHandler(func(c paho.Client) {
			if client.connectedOnce {
				logger.Info("mqtt reconnected")
				client.emitLifecycle("worker_mqtt_reconnected", "info", "mqtt connection re-established", nil)
			} else {
				logger.Info("mqtt connected")
				client.emitLifecycle("worker_mqtt_connected", "info", "mqtt connection established", nil)
				client.connectedOnce = true
			}
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
