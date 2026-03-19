package db

import (
	"context"
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