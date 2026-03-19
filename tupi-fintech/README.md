# Tupi Fintech API

- Padrão: Vertical Slice + DDD (domain/application/infrastructure) por contexto (`internal/transactions`).
- Storage: PostgreSQL via `pgx` (sem JSON files).
- DI: construtores simples baseados em interfaces para `Repository` e `Authorizer`.

## Rodar com Docker

```bash
# na raiz do monorepo (crm-lite)
docker compose -f docker-compose.tupi.yml up --build
```

- API: `http://localhost:8080/healthz` e `POST /transactions`.
- DB: Postgres 16 com volume `pg_data`.

## Dev local (sem Docker)

```bash
cd tupi-fintech
cp .env.sample .env
go run ./cmd/api
```

## Estrutura

- `cmd/api/main.go`: boot HTTP + DB + migrations idempotentes.
- `internal/platform/db`: pool Postgres e migrações mínimas.
- `internal/platform/http`: server HTTP e endpoints.
- `internal/transactions`:
  - `domain`: entidades e interfaces (`Repository`).
  - `application`: casos de uso (`Service`).
  - `infrastructure`: `PostgresRepository`.

## Próximos passos

- Substituir `staticAuthorizer` por integração real.
- Adicionar validação e IDs (`uuid`).
- Expandir migrações com chaves/índices conforme necessidade.
## Endpoints
- POST /transactions: cria transação (gera `id` se ausente). Valida `account_id`, `amount>0`, `currency` em {BRL,USD,EUR}. Pode retornar 400 com `{"error":"validation failed","fields":{...}}`.
- GET /transactions/{id}: retorna transação por id (404 se não existir).

## Autorizador
- Implementação `SimpleAuthorizer` (limite `MaxAmount` em centavos). Ajuste o limite conforme sua regra de negócio.