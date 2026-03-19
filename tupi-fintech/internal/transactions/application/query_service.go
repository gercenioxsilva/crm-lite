package application

import (
	"context"
	"tupi-fintech/internal/transactions/domain"
)

type QueryService struct { repo domain.QueryRepository }

func NewQueryService(repo domain.QueryRepository) *QueryService { return &QueryService{repo: repo} }

func (s *QueryService) Get(ctx context.Context, id domain.TransactionID) (domain.Transaction, error) {
	return s.repo.FindByID(id)
}