// Package fhirstore provides the FHIR R4 resource persistence layer.
// Resources are stored as raw JSONB in PostgreSQL. Every write is appended
// to fhir_history for full version history.
package fhirstore

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"healthcareworkspace/fhir/internal/tenant"
)

// ErrNotFound is returned when a requested resource does not exist.
var ErrNotFound = errors.New("resource not found")

// ErrGone is returned when a resource exists but has been deleted.
var ErrGone = errors.New("resource has been deleted")

// Resource is an in-memory representation of a stored FHIR resource.
type Resource struct {
	ID           string          `json:"id"`
	ResourceType string          `json:"resourceType"`
	VersionID    int64           `json:"versionId"`
	LastUpdated  time.Time       `json:"lastUpdated"`
	IsDeleted    bool            `json:"isDeleted"`
	Data         json.RawMessage `json:"data"`
}

// Store handles all FHIR resource persistence operations.
type Store struct {
	db *pgxpool.Pool
}

// New creates a new Store backed by the given connection pool.
func New(db *pgxpool.Pool) *Store {
	return &Store{db: db}
}

// Create inserts a new FHIR resource. If the resource JSON contains an "id"
// field it is used as the FHIR logical ID; otherwise a UUID is generated.
// Returns the persisted Resource (with server-assigned meta).
func (s *Store) Create(ctx context.Context, resourceType string, body json.RawMessage) (*Resource, error) {
	tenantID := tenant.FromContext(ctx)
	// Extract or generate FHIR logical ID
	fhirID, err := extractOrGenerateID(body)
	if err != nil {
		return nil, fmt.Errorf("extract fhir id: %w", err)
	}

	// Stamp server-side meta into the resource
	now := time.Now().UTC()
	body, err = stampMeta(body, fhirID, resourceType, 1, now)
	if err != nil {
		return nil, fmt.Errorf("stamp meta: %w", err)
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	const insertResource = `
		INSERT INTO fhir_resources (tenant_id, resource_type, fhir_id, version_id, last_updated, is_deleted, data)
		VALUES ($1, $2, $3, 1, $4, false, $5)
		RETURNING id, version_id, last_updated`

	var (
		rowID     string
		versionID int64
		updated   time.Time
	)
	err = tx.QueryRow(ctx, insertResource, tenantID, resourceType, fhirID, now, body).
		Scan(&rowID, &versionID, &updated)
	if err != nil {
		return nil, fmt.Errorf("insert resource: %w", err)
	}

	if err := appendHistory(ctx, tx, tenantID, resourceType, fhirID, 1, "create", body, now); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}

	return &Resource{
		ID:           rowID,
		ResourceType: resourceType,
		VersionID:    versionID,
		LastUpdated:  updated,
		IsDeleted:    false,
		Data:         body,
	}, nil
}

// Read fetches the current version of a FHIR resource by type + logical ID.
func (s *Store) Read(ctx context.Context, resourceType, fhirID string) (*Resource, error) {
	tenantID := tenant.FromContext(ctx)
	const q = `
		SELECT id, resource_type, fhir_id, version_id, last_updated, is_deleted, data
		FROM   fhir_resources
		WHERE  resource_type = $1 AND fhir_id = $2 AND tenant_id = $3`

	row := s.db.QueryRow(ctx, q, resourceType, fhirID, tenantID)
	r, err := scanResource(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("read resource: %w", err)
	}
	if r.IsDeleted {
		return nil, ErrGone
	}
	return r, nil
}

// ReadVersion fetches a specific historical version from fhir_history.
func (s *Store) ReadVersion(ctx context.Context, resourceType, fhirID string, versionID int64) (*Resource, error) {
	tenantID := tenant.FromContext(ctx)
	const q = `
		SELECT resource_type, fhir_id, version_id, last_updated, operation, data
		FROM   fhir_history
		WHERE  resource_type = $1 AND fhir_id = $2 AND version_id = $3 AND tenant_id = $4`

	var (
		rt, fid, op string
		vid         int64
		updated     time.Time
		data        json.RawMessage
	)
	err := s.db.QueryRow(ctx, q, resourceType, fhirID, versionID, tenantID).
		Scan(&rt, &fid, &vid, &updated, &op, &data)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("read version: %w", err)
	}
	return &Resource{
		ResourceType: rt,
		VersionID:    vid,
		LastUpdated:  updated,
		IsDeleted:    op == "delete",
		Data:         data,
	}, nil
}

// Update replaces a FHIR resource with a new version (optimistic locking via
// version increment). Returns the updated Resource.
func (s *Store) Update(ctx context.Context, resourceType, fhirID string, body json.RawMessage) (*Resource, error) {
	tenantID := tenant.FromContext(ctx)
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	// Lock the current row and get the version
	var currentVersion int64
	err = tx.QueryRow(ctx,
		`SELECT version_id FROM fhir_resources WHERE resource_type=$1 AND fhir_id=$2 AND tenant_id=$3 AND is_deleted=false FOR UPDATE`,
		resourceType, fhirID, tenantID).Scan(&currentVersion)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("lock resource: %w", err)
	}

	newVersion := currentVersion + 1
	now := time.Now().UTC()

	body, err = stampMeta(body, fhirID, resourceType, newVersion, now)
	if err != nil {
		return nil, fmt.Errorf("stamp meta: %w", err)
	}

	const upd = `
		UPDATE fhir_resources
		SET    version_id = $1, last_updated = $2, data = $3
		WHERE  resource_type = $4 AND fhir_id = $5 AND tenant_id = $6
		RETURNING id, version_id, last_updated`

	var rowID string
	var vid int64
	var updated time.Time
	err = tx.QueryRow(ctx, upd, newVersion, now, body, resourceType, fhirID, tenantID).
		Scan(&rowID, &vid, &updated)
	if err != nil {
		return nil, fmt.Errorf("update resource: %w", err)
	}

	if err := appendHistory(ctx, tx, tenantID, resourceType, fhirID, newVersion, "update", body, now); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}

	return &Resource{
		ID:           rowID,
		ResourceType: resourceType,
		VersionID:    vid,
		LastUpdated:  updated,
		IsDeleted:    false,
		Data:         body,
	}, nil
}

// Delete marks a resource as deleted (soft delete) and records a history entry.
func (s *Store) Delete(ctx context.Context, resourceType, fhirID string) error {
	tenantID := tenant.FromContext(ctx)
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	var currentVersion int64
	err = tx.QueryRow(ctx,
		`SELECT version_id FROM fhir_resources WHERE resource_type=$1 AND fhir_id=$2 AND tenant_id=$3 AND is_deleted=false FOR UPDATE`,
		resourceType, fhirID, tenantID).Scan(&currentVersion)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("lock resource: %w", err)
	}

	now := time.Now().UTC()
	newVersion := currentVersion + 1

	_, err = tx.Exec(ctx,
		`UPDATE fhir_resources SET is_deleted=true, version_id=$1, last_updated=$2 WHERE resource_type=$3 AND fhir_id=$4 AND tenant_id=$5`,
		newVersion, now, resourceType, fhirID, tenantID)
	if err != nil {
		return fmt.Errorf("delete resource: %w", err)
	}

	if err := appendHistory(ctx, tx, tenantID, resourceType, fhirID, newVersion, "delete", nil, now); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// History returns all versions of a resource in descending version order.
func (s *Store) History(ctx context.Context, resourceType, fhirID string) ([]*Resource, error) {
	tenantID := tenant.FromContext(ctx)
	const q = `
		SELECT resource_type, fhir_id, version_id, last_updated, operation, data
		FROM   fhir_history
		WHERE  resource_type = $1 AND fhir_id = $2 AND tenant_id = $3
		ORDER  BY version_id DESC`

	rows, err := s.db.Query(ctx, q, resourceType, fhirID, tenantID)
	if err != nil {
		return nil, fmt.Errorf("query history: %w", err)
	}
	defer rows.Close()

	var results []*Resource
	for rows.Next() {
		var rt, fid, op string
		var vid int64
		var updated time.Time
		var data json.RawMessage
		if err := rows.Scan(&rt, &fid, &vid, &updated, &op, &data); err != nil {
			return nil, fmt.Errorf("scan history row: %w", err)
		}
		results = append(results, &Resource{
			ResourceType: rt,
			VersionID:    vid,
			LastUpdated:  updated,
			IsDeleted:    op == "delete",
			Data:         data,
		})
	}
	return results, rows.Err()
}

// ─── helpers ─────────────────────────────────────────────────────────────────

func scanResource(row pgx.Row) (*Resource, error) {
	r := &Resource{}
	var fhirID string
	return r, row.Scan(&r.ID, &r.ResourceType, &fhirID, &r.VersionID, &r.LastUpdated, &r.IsDeleted, &r.Data)
}

func appendHistory(ctx context.Context, tx pgx.Tx, tenantID, resourceType, fhirID string, versionID int64, op string, data json.RawMessage, ts time.Time) error {
	_, err := tx.Exec(ctx,
		`INSERT INTO fhir_history (tenant_id, resource_type, fhir_id, version_id, last_updated, operation, data)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		tenantID, resourceType, fhirID, versionID, ts, op, data)
	if err != nil {
		return fmt.Errorf("append history: %w", err)
	}
	return nil
}

// extractOrGenerateID reads the "id" field from a FHIR JSON body,
// or generates a new UUID if absent.
func extractOrGenerateID(body json.RawMessage) (string, error) {
	var obj map[string]json.RawMessage
	if err := json.Unmarshal(body, &obj); err != nil {
		return "", fmt.Errorf("unmarshal body: %w", err)
	}
	if raw, ok := obj["id"]; ok {
		var id string
		if err := json.Unmarshal(raw, &id); err == nil && id != "" {
			return id, nil
		}
	}
	return uuid.NewString(), nil
}

// stampMeta injects FHIR meta (id, resourceType, meta.versionId, meta.lastUpdated)
// into a raw JSON body, returning the updated bytes.
func stampMeta(body json.RawMessage, fhirID, resourceType string, versionID int64, ts time.Time) (json.RawMessage, error) {
	var obj map[string]interface{}
	if err := json.Unmarshal(body, &obj); err != nil {
		return nil, fmt.Errorf("unmarshal for meta stamp: %w", err)
	}
	obj["id"] = fhirID
	obj["resourceType"] = resourceType
	obj["meta"] = map[string]interface{}{
		"versionId":   fmt.Sprintf("%d", versionID),
		"lastUpdated": ts.Format(time.RFC3339),
	}
	out, err := json.Marshal(obj)
	if err != nil {
		return nil, fmt.Errorf("marshal stamped body: %w", err)
	}
	return out, nil
}
