package domain

import "time"

type TransactionID string

type Transaction struct {
	ID        TransactionID
	AccountID string
	Amount    int64 // cents
	Currency  string
	CreatedAt time.Time
	Status    string // authorized|declined
	Reason    string // optional decline reason
}

type Repository interface {
	Create(tx Transaction) error
	FindByID(id TransactionID) (Transaction, error)
}

var (
	ErrNotFound = Err("not found")
)

type Err string

func (e Err) Error() string { return string(e) }