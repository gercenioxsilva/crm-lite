package db

import (
	"context"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Config struct { URL string }

func ConfigFromEnv() Config {
	url := Getenv("DATABASE_URL")
	if url == "" {
		url = "postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable"
	}
	return Config{URL: url}
}

func Open(ctx context.Context, cfg Config) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, cfg.URL)
	if err != nil { return nil, err }
	if err := pool.Ping(ctx); err != nil { pool.Close(); return nil, err }
	if err := migrate(ctx, pool); err != nil { pool.Close(); return nil, err }
	return pool, nil
}

func Getenv(k string) string { return os.Getenv(k) }

func migrate(ctx context.Context, pool *pgxpool.Pool) error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS transactions (
			id text PRIMARY KEY,
			account_id text NOT NULL,
			amount BIGINT NOT NULL CHECK (amount > 0),
			currency text NOT NULL,
			created_at timestamptz NOT NULL DEFAULT now(),
			status text NOT NULL CHECK (status IN ('authorized','declined')),
			reason text
		)`,
		`CREATE INDEX IF NOT EXISTS idx_transactions_account_created ON transactions(account_id, created_at DESC)`,
	}
	for _, s := range stmts {
		if _, err := pool.Exec(ctx, s); err != nil {
			log.Println("migration error:", err)
			return err
		}
	}
	return nil
}