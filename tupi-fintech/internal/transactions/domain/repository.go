package domain

import "context"

type CommandRepository interface {
	Create(ctx context.Context, t Transaction) error
}

type QueryRepository interface {
	FindByID(ctx context.Context, id TransactionID) (Transaction, error)
}