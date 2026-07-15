package handler

import (
"encoding/json"
"net/http"
"strings"

"github.com/go-chi/chi/v5"
)

func writeJSON(w http.ResponseWriter, status int, v any) {
w.Header().Set("Content-Type", "application/json")
w.WriteHeader(status)
_ = json.NewEncoder(w).Encode(v)
}

// extractID pulls {id} from the chi URL param or the last path segment.
func extractID(r *http.Request) string {
if id := chi.URLParam(r, "id"); id != "" {
return id
}
parts := strings.Split(strings.TrimSuffix(r.URL.Path, "/"), "/")
if len(parts) > 0 {
return parts[len(parts)-1]
}
return ""
}