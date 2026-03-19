package http

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"tupi-fintech/internal/platform/db"
	"tupi-fintech/internal/transactions/application"
	"tupi-fintech/internal/transactions/domain"
	"tupi-fintech/internal/transactions/infrastructure"
)

type Config struct { Port string }

func ConfigFromEnv() Config { return Config{Port: getenv("PORT", "8080")} }

func NewServer(pools db.Pools, _ Config) http.Handler {
	repoCmd := infrastructure.NewCommandRepository(pools.Write)
	repoQry := infrastructure.NewQueryRepository(pools.Read)
	auth := infrastructure.SimpleAuthorizer{MaxAmount: 1_000_000}
	cmd := application.NewCommandService(repoCmd, auth)
	qry := application.NewQueryService(repoQry)

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })

	mux.HandleFunc("/transactions", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost { w.WriteHeader(http.StatusMethodNotAllowed); return }
		var in struct {
			ID        string `json:"id"`
			AccountID string `json:"account_id"`
			Amount    int64  `json:"amount"`
			Currency  string `json:"currency"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"}); return
		}
		out, err := cmd.Create(r.Context(), domain.Transaction{ID: domain.TransactionID(in.ID), AccountID: in.AccountID, Amount: in.Amount, Currency: in.Currency})
		if err != nil {
			if verr, ok := err.(domain.ValidationError); ok { writeJSON(w, http.StatusBadRequest, map[string]any{"error": verr.Error(), "fields": verr.Fields}); return }
			log.Println("create tx:", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"}); return
		}
		w.Header().Set("X-Data-Source", "write")
		writeJSON(w, http.StatusOK, out)
	})

	mux.HandleFunc("/transactions/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet { w.WriteHeader(http.StatusMethodNotAllowed); return }
		id := strings.TrimPrefix(r.URL.Path, "/transactions/")
		if id == "" { writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing id"}); return }
		strong := r.URL.Query().Get("consistency") == "strong"
		var (
			used string
			res  domain.Transaction
			err  error
		)
		if strong {
			q := application.NewQueryService(infrastructure.NewQueryRepository(pools.Write))
			res, err = q.Get(r.Context(), domain.TransactionID(id))
			used = "write"
		} else {
			res, err = qry.Get(r.Context(), domain.TransactionID(id))
			used = "read"
		}
		if err != nil {
			if err == domain.ErrNotFound { writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"}); return }
			log.Println("get tx:", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"}); return
		}
		w.Header().Set("X-Data-Source", used)
		writeJSON(w, http.StatusOK, res)
	})

	return mux
}

func getenv(key, def string) string { if v := db.Getenv(key); v != "" { return v }; return def }

func writeJSON(w http.ResponseWriter, status int, v any) { w.Header().Set("Content-Type", "application/json"); w.WriteHeader(status); _ = json.NewEncoder(w).Encode(v) }