package server

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// RedactedRequestLogger logs the matched route template rather than RequestURI
// or URL.String(). The latter can contain patient identifiers, call IDs, or
// other sensitive query values once authenticated control-plane routes exist.
func RedactedRequestLogger(logger *slog.Logger) func(http.Handler) http.Handler {
	if logger == nil {
		logger = slog.Default()
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
			started := time.Now()
			wrapped := middleware.NewWrapResponseWriter(w, request.ProtoMajor)
			next.ServeHTTP(wrapped, request)
			route := "unmatched"
			if routeContext := chi.RouteContext(request.Context()); routeContext != nil && routeContext.RoutePattern() != "" {
				route = routeContext.RoutePattern()
			}
			logger.Info("http request completed",
				"method", request.Method,
				"route", route,
				"status", wrapped.Status(),
				"bytes", wrapped.BytesWritten(),
				"durationMs", time.Since(started).Milliseconds(),
				"requestID", middleware.GetReqID(request.Context()),
			)
		})
	}
}
