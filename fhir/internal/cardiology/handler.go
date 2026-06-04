package cardiology

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
)

// Handler holds the dependencies for all cardiology HTTP handlers.
type Handler struct {
	store *Store
	sim   *Simulator
}

// NewHandler creates a Handler wired to the given Store and Simulator.
func NewHandler(store *Store, sim *Simulator) *Handler {
	return &Handler{store: store, sim: sim}
}

// ─── Routing ─────────────────────────────────────────────────────────────────

// Mount registers all cardiology routes onto r.
func (h *Handler) Mount(r chi.Router) {
	// Visits
	r.Post("/visits", h.createVisit)
	r.Get("/visits", h.listVisits)
	r.Get("/visits/{encounterId}", h.getVisit)
	r.Post("/visits/{encounterId}/transition", h.transitionVisit)
	r.Get("/visits/{encounterId}/events", h.getVisitEvents)
	r.Get("/visits/{encounterId}/transitions", h.validTransitions)

	// Queues
	r.Get("/queues", h.listQueues)
	r.Get("/queues/{name}", h.getQueue)
	r.Post("/queues/{name}/items/{id}/claim", h.claimQueueItem)
	r.Post("/queues/{name}/items/{id}/complete", h.completeQueueItem)

	// Rooms
	r.Get("/rooms", h.getRooms)

	// Dashboard
	r.Get("/dashboard", h.getDashboard)

	// Simulation
	r.Post("/simulate/seed", h.simulateSeed)
	r.Post("/simulate/advance", h.simulateAdvance)
	r.Delete("/simulate/reset", h.simulateReset)
}

// ─── Visit handlers ───────────────────────────────────────────────────────────

// POST /cardiology/visits
func (h *Handler) createVisit(w http.ResponseWriter, r *http.Request) {
	var req CreateVisitRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.PatientID == "" {
		writeErr(w, http.StatusBadRequest, "patientId is required")
		return
	}
	if req.VisitType == "" {
		req.VisitType = VisitNewPatient
	}

	visit, err := h.store.CreateVisit(r.Context(), req)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, visit)
}

// GET /cardiology/visits?state=...
func (h *Handler) listVisits(w http.ResponseWriter, r *http.Request) {
	state := r.URL.Query().Get("state")
	visits, err := h.store.ListVisits(r.Context(), state)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, visits)
}

// GET /cardiology/visits/{encounterId}
func (h *Handler) getVisit(w http.ResponseWriter, r *http.Request) {
	enc := chi.URLParam(r, "encounterId")
	visit, err := h.store.GetVisit(r.Context(), enc)
	if err != nil {
		writeErr(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, visit)
}

// POST /cardiology/visits/{encounterId}/transition
// Body: TransitionRequest
func (h *Handler) transitionVisit(w http.ResponseWriter, r *http.Request) {
	enc := chi.URLParam(r, "encounterId")

	var req TransitionRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Event == "" {
		writeErr(w, http.StatusBadRequest, "event is required")
		return
	}
	if req.ActorRole == "" {
		req.ActorRole = RoleSystem
	}

	visit, err := h.store.GetVisit(r.Context(), enc)
	if err != nil {
		writeErr(w, http.StatusNotFound, err.Error())
		return
	}

	t, err := LookupTransition(visit.CurrentState, req.Event)
	if err != nil {
		writeErr(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	if !IsRoleAllowed(t, req.ActorRole) {
		writeErr(w, http.StatusForbidden,
			fmt.Sprintf("role %s cannot fire event %s from state %s",
				req.ActorRole, req.Event, visit.CurrentState))
		return
	}

	updated, err := h.store.ApplyTransition(r.Context(), enc, t, req)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

// GET /cardiology/visits/{encounterId}/events
func (h *Handler) getVisitEvents(w http.ResponseWriter, r *http.Request) {
	enc := chi.URLParam(r, "encounterId")
	events, err := h.store.GetEvents(r.Context(), enc)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, events)
}

// GET /cardiology/visits/{encounterId}/transitions
// Shows which events can be fired from the current state.
func (h *Handler) validTransitions(w http.ResponseWriter, r *http.Request) {
	enc := chi.URLParam(r, "encounterId")
	visit, err := h.store.GetVisit(r.Context(), enc)
	if err != nil {
		writeErr(w, http.StatusNotFound, err.Error())
		return
	}
	available := ValidTransitionsFrom(visit.CurrentState)
	type out struct {
		Event        EventType   `json:"event"`
		ToState      VisitState  `json:"toState"`
		AllowedRoles []ActorRole `json:"allowedRoles"`
	}
	var resp []out
	for _, t := range available {
		resp = append(resp, out{t.Event, t.To, t.AllowedRoles})
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"currentState":     visit.CurrentState,
		"validTransitions": resp,
	})
}

// ─── Queue handlers ───────────────────────────────────────────────────────────

// GET /cardiology/queues
func (h *Handler) listQueues(w http.ResponseWriter, r *http.Request) {
	sums, err := h.store.QueueSummaries(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, sums)
}

// GET /cardiology/queues/{name}?status=PENDING
func (h *Handler) getQueue(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	status := r.URL.Query().Get("status")
	items, err := h.store.GetQueueItems(r.Context(), name, status)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, items)
}

// POST /cardiology/queues/{name}/items/{id}/claim
func (h *Handler) claimQueueItem(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req ClaimRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.AssignedToID == "" {
		writeErr(w, http.StatusBadRequest, "assignedToId is required")
		return
	}
	if err := h.store.ClaimQueueItem(r.Context(), id, req.AssignedToID); err != nil {
		writeErr(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// POST /cardiology/queues/{name}/items/{id}/complete
func (h *Handler) completeQueueItem(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req CompleteRequest
	_ = json.NewDecoder(r.Body).Decode(&req) // optional body
	if err := h.store.CompleteQueueItem(r.Context(), id); err != nil {
		writeErr(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ─── Room handlers ────────────────────────────────────────────────────────────

// GET /cardiology/rooms
func (h *Handler) getRooms(w http.ResponseWriter, r *http.Request) {
	rooms, err := h.store.GetRooms(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, rooms)
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

// GET /cardiology/dashboard
func (h *Handler) getDashboard(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	counts, total, err := h.store.VisitStateCounts(ctx)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	queues, err := h.store.QueueSummaries(ctx)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	rooms, err := h.store.GetRooms(ctx)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	recent, err := h.store.RecentEvents(ctx, 20)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, Dashboard{
		TotalVisitsToday: total,
		VisitsByState:    counts,
		Queues:           queues,
		Rooms:            rooms,
		RecentEvents:     recent,
	})
}

// ─── Simulation handlers ──────────────────────────────────────────────────────

// POST /cardiology/simulate/seed
func (h *Handler) simulateSeed(w http.ResponseWriter, r *http.Request) {
	result, err := h.sim.SeedPractice(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, result)
}

// POST /cardiology/simulate/advance
// Advances every in-progress visit by one step using SYSTEM actor.
func (h *Handler) simulateAdvance(w http.ResponseWriter, r *http.Request) {
	advanced, err := h.sim.AdvanceAll(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"advanced": advanced,
	})
}

// DELETE /cardiology/simulate/reset
func (h *Handler) simulateReset(w http.ResponseWriter, r *http.Request) {
	if err := h.store.ResetSimulation(r.Context()); err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func decodeJSON(w http.ResponseWriter, r *http.Request, v interface{}) bool {
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return false
	}
	return true
}
