package infrastructure

import (
	"context"

	"tupi-fintech/internal/transactions/application"
	"tupi-fintech/internal/transactions/domain"
)

type SimpleAuthorizer struct {
	MaxAmount int64 // in cents
}

var _ application.Authorizer = (*SimpleAuthorizer)(nil)

func (a SimpleAuthorizer) Authorize(ctx context.Context, tx domain.Transaction) (domain.Authorization, error) {
	if tx.Amount > a.MaxAmount {
		return domain.Authorization{Approved: false, Reason: "amount exceeds limit"}, nil
	}
	return domain.Authorization{Approved: true}, nil
}