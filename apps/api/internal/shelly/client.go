package shelly

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type Client struct {
	httpClient *http.Client
}

type State struct {
	IsOn              bool   `json:"isOn"`
	BrightnessPercent int    `json:"brightnessPercent"`
	Source            string `json:"source,omitempty"`
	Raw               any    `json:"raw,omitempty"`
}

func NewClient(timeout time.Duration) *Client {
	if timeout <= 0 {
		timeout = 3 * time.Second
	}
	return &Client{
		httpClient: &http.Client{Timeout: timeout},
	}
}

func (c *Client) GetState(ctx context.Context, endpoint string) (State, error) {
	var payload map[string]any
	if err := c.do(ctx, endpoint, nil, &payload); err != nil {
		return State{}, err
	}

	return parseState(payload), nil
}

func (c *Client) TurnOn(ctx context.Context, endpoint string) (State, error) {
	return c.command(ctx, endpoint, url.Values{"turn": []string{"on"}})
}

func (c *Client) TurnOff(ctx context.Context, endpoint string) (State, error) {
	return c.command(ctx, endpoint, url.Values{"turn": []string{"off"}})
}

func (c *Client) SetBrightness(ctx context.Context, endpoint string, brightnessPercent int) (State, error) {
	if brightnessPercent < 0 || brightnessPercent > 100 {
		return State{}, fmt.Errorf("brightness percent must be between 0 and 100")
	}

	return c.command(ctx, endpoint, url.Values{
		"turn":       []string{"on"},
		"brightness": []string{strconv.Itoa(brightnessPercent)},
	})
}

func (c *Client) command(ctx context.Context, endpoint string, params url.Values) (State, error) {
	var payload map[string]any
	if err := c.do(ctx, endpoint, params, &payload); err != nil {
		return State{}, err
	}

	return parseState(payload), nil
}

func (c *Client) do(ctx context.Context, endpoint string, params url.Values, out any) error {
	requestURL, err := shellyURL(endpoint, params)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("shelly returned status %d", resp.StatusCode)
	}

	return json.NewDecoder(resp.Body).Decode(out)
}

func shellyURL(endpoint string, params url.Values) (string, error) {
	endpoint = strings.TrimSpace(endpoint)
	if endpoint == "" {
		return "", fmt.Errorf("shelly endpoint URL is required")
	}

	parsed, err := url.Parse(endpoint)
	if err != nil {
		return "", err
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return "", fmt.Errorf("shelly endpoint must use http or https")
	}
	if !strings.HasSuffix(parsed.Path, "/light/0") {
		parsed.Path = strings.TrimRight(parsed.Path, "/") + "/light/0"
	}
	query := parsed.Query()
	for key, values := range params {
		for _, value := range values {
			query.Set(key, value)
		}
	}
	parsed.RawQuery = query.Encode()

	return parsed.String(), nil
}

func parseState(payload map[string]any) State {
	state := State{Raw: payload}
	if value, ok := payload["ison"].(bool); ok {
		state.IsOn = value
	}
	if value, ok := payload["is_on"].(bool); ok {
		state.IsOn = value
	}
	if value, ok := payload["brightness"]; ok {
		state.BrightnessPercent = numericPercent(value)
	}
	if value, ok := payload["source"].(string); ok {
		state.Source = value
	}
	return state
}

func numericPercent(value any) int {
	switch typed := value.(type) {
	case float64:
		return int(typed)
	case int:
		return typed
	case json.Number:
		parsed, _ := typed.Int64()
		return int(parsed)
	default:
		return 0
	}
}
