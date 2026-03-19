package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Pools struct {
	Write *pgxpool.Pool
	Read  *pgxpool.Pool
}

func (p Pools) Close(ctx context.Context) {
	if p.Write != nil {
		p.Write.Close()
	}
	if p.Read != nil && p.Read != p.Write {
		p.Read.Close()
	}
}

// OpenPools abre pool de escrita (DATABASE_URL) e, se definido, pool de leitura (READ_DATABASE_URL).
// Se READ_DATABASE_URL estiver vazio, o pool de leitura referencia o de escrita.
func OpenPools(ctx context.Context) (Pools, error) {
	writeURL := Getenv("DATABASE_URL")
	if writeURL == "" {
		writeURL = "postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable"
	}
	write, err := pgxpool.New(ctx, writeURL)
	if err != nil { return Pools{}, err }
	if err := write.Ping(ctx); err != nil { write.Close(); return Pools{}, err }
	// migra apenas no primário
	if err := migrate(ctx, write); err != nil { write.Close(); return Pools{}, err }

	readURL := Getenv("READ_DATABASE_URL")
	if readURL == "" {
		return Pools{Write: write, Read: write}, nil
	}
	read, err := pgxpool.New(ctx, readURL)
	if err != nil { write.Close(); return Pools{}, err }
	if err := read.Ping(ctx); err != nil { read.Close(); write.Close(); return Pools{}, err }
	return Pools{Write: write, Read: read}, nil
}