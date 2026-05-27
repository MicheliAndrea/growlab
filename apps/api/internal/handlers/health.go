package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type HealthHandler struct {
	service string
}

func NewHealthHandler(service string) HealthHandler {
	return HealthHandler{service: service}
}

func (h HealthHandler) Get(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"service": h.service,
		"time":    time.Now().UTC().Format(time.RFC3339),
	})
}
