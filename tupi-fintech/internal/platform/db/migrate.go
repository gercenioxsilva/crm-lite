package db

import (
	"context"
	"embed"
	"fmt"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed ../../migrations/*.sql
var migrationsFS embed.FS

func migrate(ctx context.Context, pool *pgxpool.Pool) error {
	dirs, err := migrationsFS.ReadDir("../../migrations")
	if err != nil { return err }
	files := make([]string, 0, len(dirs))
	for _, f := range dirs { if !f.IsDir() && strings.HasSuffix(f.Name(), ".sql") { files = append(files, f.Name()) } }
	sort.Strings(files)
	// ensure table exists
	if _, err := pool.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`); err != nil { return err }
	for _, name := range files {
		var exists bool
		if err := pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version=$1)`, name).Scan(&exists); err != nil { return err }
		if exists { continue }
		b, err := migrationsFS.ReadFile("../../migrations/" + name)
		if err != nil { return err }
		if _, err := pool.Exec(ctx, string(b)); err != nil { return fmt.Errorf("apply %s: %w", name, err) }
		if _, err := pool.Exec(ctx, `INSERT INTO schema_migrations(version) VALUES ($1)`, name); err != nil { return err }
	}
	return nil
}