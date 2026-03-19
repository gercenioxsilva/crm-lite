package infrastructure

import (
	"context"

	"github.com/jackc/pgx/v5"
	"tupi-fintech/internal/transactions/domain"
)

type PgxIface interface {
	Exec(ctx context.Context, sql string, arguments ...any) (pgx.CommandTag, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

type PgCommandRepository struct{ db PgxIface }

type PgQueryRepository struct{ db PgxIface }

func NewCommandRepository(db PgxIface) *PgCommandRepository { return &PgCommandRepository{db: db} }
func NewQueryRepository(db PgxIface) *PgQueryRepository { return &PgQueryRepository{db: db} }

func (r *PgCommandRepository) Create(ctx context.Context, tx domain.Transaction) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO transactions (id, account_id, amount, currency, created_at, status, reason)
		 VALUES ($1::uuid,$2,$3,$4,$5,$6,$7)`,
		string(tx.ID), tx.AccountID, tx.Amount, tx.Currency, tx.CreatedAt, tx.Status, tx.Reason,
	)
	return err
}

func (r *PgQueryRepository) FindByID(ctx context.Context, id domain.TransactionID) (domain.Transaction, error) {
	var t domain.Transaction
	row := r.db.QueryRow(ctx,
		`SELECT id::text, account_id, amount, currency, created_at, status, reason FROM transactions WHERE id = $1::uuid`, string(id),
	)
	if err := row.Scan(&t.ID, &t.AccountID, &t.Amount, &t.Currency, &t.CreatedAt, &t.Status, &t.Reason); err != nil {
		if err == pgx.ErrNoRows { return domain.Transaction{}, domain.ErrNotFound }
		return domain.Transaction{}, err
	}
	return t, nil
}