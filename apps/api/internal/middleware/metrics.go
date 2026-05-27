package middleware

import (
	"time"

	"github.com/gin-gonic/gin"

	apimetrics "growlab/apps/api/internal/metrics"
)

func Metrics(metrics *apimetrics.Metrics) gin.HandlerFunc {
	return func(c *gin.Context) {
		startedAt := time.Now()

		c.Next()

		path := c.FullPath()
		if path == "" {
			path = c.Request.URL.Path
		}

		metrics.ObserveRequest(c.Request.Method, path, c.Writer.Status(), time.Since(startedAt))
	}
}
