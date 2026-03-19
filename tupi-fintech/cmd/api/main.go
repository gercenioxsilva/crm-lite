package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"tupi-fintech/internal/platform/db"
	apihttp "tupi-fintech/internal/platform/http"
)

func main() {
	ctx := context.Background()

	cfg := apihttp.ConfigFromEnv()
	pools, err := db.OpenPools(ctx)
	if err != nil {
		log.Fatalf("db open: %v", err)
	}
	defer pools.Close(ctx)

	h := apihttp.NewServer(pools, cfg)
	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           h,
		ReadHeaderTimeout: 10 * time.Second,
	}

	log.Printf("API listening on :%s", cfg.Port)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Println("server error:", err)
		os.Exit(1)
	}
}