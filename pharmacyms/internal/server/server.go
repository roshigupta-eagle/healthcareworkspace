package server

import (
"context"
"net/http"
"time"

"github.com/go-chi/chi/v5"
"github.com/go-chi/chi/v5/middleware"

"healthcareworkspace/pharmacyms/internal/config"
"healthcareworkspace/pharmacyms/internal/db"
"healthcareworkspace/pharmacyms/internal/handler"
"healthcareworkspace/pharmacyms/internal/store"
)

// New builds the PharmacyMS router. EPIC-API-02 + EPIC-CLIN-01.
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

r.Use(func(next http.Handler) http.Handler {
return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
w.Header().Set("Access-Control-Allow-Origin", cfg.AllowedOrigin)
w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
if req.Method == http.MethodOptions { w.WriteHeader(http.StatusNoContent); return }
next.ServeHTTP(w, req)
})
})

r.Get("/health", handler.Health)

// DUR engine is always available (no DB required)
dur := handler.NewDURHandler()
r.Route("/api/v1/dur", func(r chi.Router) {
r.Post("/check", dur.Check)
})

if cfg.DatabaseURL != "" {
pool, err := db.Connect(context.Background(), cfg.DatabaseURL)
if err == nil {
st := store.New(pool)
meds    := handler.NewMedicationsHandler(st)
rxs     := handler.NewPrescriptionsHandler(st)
dispenses := handler.NewDispensesHandler(st)

r.Route("/api/v1", func(r chi.Router) {
r.Route("/medications", func(r chi.Router) {
r.Get("/", meds.List) // ?q=search
})
r.Route("/prescriptions", func(r chi.Router) {
r.Get("/", rxs.List)   // ?patient=&status=
r.Post("/", rxs.Create)
r.Patch("/{id}/status", rxs.UpdateStatus)
})
r.Route("/dispenses", func(r chi.Router) {
r.Get("/", dispenses.ListByPrescription)  // ?prescription=UUID
r.Post("/", dispenses.Create)
})
})
}
}

return r
}