package server

import (
"context"
"net/http"
"time"

"github.com/go-chi/chi/v5"
"github.com/go-chi/chi/v5/middleware"

"healthcareworkspace/lims/internal/config"
"healthcareworkspace/lims/internal/db"
"healthcareworkspace/lims/internal/handler"
"healthcareworkspace/lims/internal/store"
)

// New constructs the LIMS HTTP router. EPIC-API-01.
func New(cfg *config.Config) http.Handler {
r := chi.NewRouter()

r.Use(middleware.RequestID)
r.Use(middleware.RealIP)
r.Use(middleware.Logger)
r.Use(middleware.Recoverer)
r.Use(middleware.CleanPath)
r.Use(middleware.StripSlashes)
r.Use(middleware.Timeout(30 * time.Second))
r.Use(middleware.Compress(5))

// CORS for EHR frontend
r.Use(func(next http.Handler) http.Handler {
return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
w.Header().Set("Access-Control-Allow-Origin", cfg.AllowedOrigin)
w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
if req.Method == http.MethodOptions {
w.WriteHeader(http.StatusNoContent)
return
}
next.ServeHTTP(w, req)
})
})

r.Get("/health", handler.Health)

// Clinical routes — connect to DB only if DSN is configured
if cfg.DatabaseURL != "" {
pool, err := db.Connect(context.Background(), cfg.DatabaseURL)
if err == nil {
st := store.New(pool)
orders  := handler.NewOrdersHandler(st)
results := handler.NewResultsHandler(st)
tests   := handler.NewTestsHandler(st)

r.Route("/api/v1", func(r chi.Router) {
// Lab test catalogue
r.Get("/tests", tests.List)

// Lab orders
r.Route("/orders", func(r chi.Router) {
r.Get("/", orders.List)
r.Post("/", orders.Create)
r.Route("/{id}", func(r chi.Router) {
r.Patch("/status", orders.UpdateStatus)
r.Get("/results", results.GetByOrder)
})
})

// Lab results
r.Route("/results", func(r chi.Router) {
r.Get("/", results.List)   // ?order=UUID
r.Post("/", results.Create)
})
})
}
}

return r
}