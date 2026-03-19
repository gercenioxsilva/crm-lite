package application

import (
	"context"
	"time"

	"github.com/google/uuid"
	"tupi-fintech/internal/transactions/domain"
)

type CommandService struct {
	repo domain.CommandRepository
	auth Authorizer
}

func NewCommandService(repo domain.CommandRepository, auth Authorizer) *CommandService {
	return &CommandService{repo: repo, auth: auth}
}

func (s *CommandService) Create(ctx context.Context, input domain.Transaction) (domain.Transaction, error) {
	if input.ID == "" { input.ID = domain.TransactionID(uuid.NewString()) }
	if input.CreatedAt.IsZero() { input.CreatedAt = time.Now().UTC() }
	if verr := validate(input); verr != nil { return domain.Transaction{}, verr }
	res, err := s.auth.Authorize(ctx, input)
	if err != nil { return domain.Transaction{}, err }
	if res.Approved { input.Status = "authorized" } else { input.Status = "declined"; input.Reason = res.Reason }
	if err := s.repo.Create(input); err != nil { return domain.Transaction{}, err }
	return input, nil
}