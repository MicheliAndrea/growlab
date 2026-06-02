package httpapi

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"growlab/apps/api/internal/config"
	"growlab/apps/api/internal/handlers"
	"growlab/apps/api/internal/metrics"
)

func TestHealthRoute(t *testing.T) {
	router := NewRouter(RouterOptions{
		Config:  config.Load(),
		Metrics: metrics.New(metrics.BuildInfo{Version: "test", Commit: "test", Date: "test"}),
	})

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/health", nil)

	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, recorder.Code)
	}
}

func TestMetricsRoute(t *testing.T) {
	router := NewRouter(RouterOptions{
		Config:  config.Load(),
		Metrics: metrics.New(metrics.BuildInfo{Version: "test", Commit: "test", Date: "test"}),
	})

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/metrics", nil)

	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, recorder.Code)
	}
}

func TestDomainRoutesRegister(t *testing.T) {
	router := NewRouter(RouterOptions{
		Config:        config.Load(),
		DomainHandler: handlers.NewDomainHandler(nil, handlers.DomainHandlerOptions{}),
	})

	routes := router.Routes()
	if len(routes) == 0 {
		t.Fatal("expected registered routes")
	}
}
