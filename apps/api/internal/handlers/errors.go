package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type ErrorResponse struct {
	Code    string         `json:"code"`
	Message string         `json:"message"`
	Details map[string]any `json:"details,omitempty"`
}

func JSONError(c *gin.Context, status int, code string, message string) {
	c.JSON(status, ErrorResponse{
		Code:    code,
		Message: message,
	})
}

func NotFound(c *gin.Context) {
	JSONError(c, http.StatusNotFound, "NOT_FOUND", "resource not found")
}
