package server

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"

	"healthcareworkspace/fhir/internal/authmw"
	"healthcareworkspace/fhir/internal/cardiology"
	"healthcareworkspace/fhir/internal/config"
	"healthcareworkspace/fhir/internal/fhirhandler"
	"healthcareworkspace/fhir/internal/fhirsearch"
	"healthcareworkspace/fhir/internal/fhirstore"
	"healthcareworkspace/fhir/internal/handler"
	"healthcareworkspace/fhir/internal/labingestion"
)

// New builds and returns the HTTP handler for the FHIR service.
// db may be nil during startup (before the DB is available); FHIR routes
// requiring DB access will return 503 if db is nil.
func New(cfg *config.Config, db *pgxpool.Pool) http.Handler {
	r := chi.NewRouter()

	// ── Middleware stack ──────────────────────────────────────────────
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.CleanPath)
	r.Use(middleware.StripSlashes)
	r.Use(middleware.Timeout(30 * time.Second))
	r.Use(middleware.Compress(5))

	// ── Infrastructure routes ─────────────────────────────────────────
	r.Get("/health", handler.Health)

	// ── FHIR R4 routes ───────────────────────────────────────────────
	r.Route("/fhir/R4", func(r chi.Router) {
		// CapabilityStatement — always available, no auth required
		r.Get("/metadata", fhirhandler.Capabilities)

		// All other FHIR routes require authentication + tenant context
		r.Group(func(r chi.Router) {
			r.Use(authmw.Middleware(cfg.JWTSecret, cfg.Env))

			if db != nil {
				store := fhirstore.New(db)
				searcher := fhirsearch.New(db)
				fh := fhirhandler.New(store, searcher)

				// Resource-level routes
				r.Route("/{resourceType}", func(r chi.Router) {
					r.Get("/", fh.Search)
					r.Post("/", fh.Create)

					r.Route("/{id}", func(r chi.Router) {
						r.Get("/", fh.Read)
						r.Put("/", fh.Update)
						r.Delete("/", fh.Delete)
						r.Get("/_history", fh.History)
						r.Get("/_history/{vid}", fh.VRead)
					})
				})
			}
		})
	})

	// ── Cardiology Practice routes ────────────────────────────────────
	r.Route("/cardiology", func(r chi.Router) {
		r.Use(authmw.Middleware(cfg.JWTSecret, cfg.Env))

		if db != nil {
			cs := cardiology.NewStore(db)
			fs := fhirstore.New(db)
			searcher := fhirsearch.New(db)
			sim := cardiology.NewSimulator(db, cs, fs, searcher)
			ch := cardiology.NewHandler(cs, sim)
			ch.Mount(r)
		}
	})

	// ── Lab Ingestion routes ──────────────────────────────────────────
	r.Route("/lab", func(r chi.Router) {
		r.Use(authmw.Middleware(cfg.JWTSecret, cfg.Env))

		if db != nil {
			fs := fhirstore.New(db)
			searcher := fhirsearch.New(db)
			ls := labingestion.NewStore(db, fs, searcher)
			lh := labingestion.NewHandler(ls)
			lh.Mount(r)
		}
	})

	return r
}
