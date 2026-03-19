package domain

type CommandRepository interface {
	Create(Transaction) error
}

type QueryRepository interface {
	FindByID(TransactionID) (Transaction, error)
}