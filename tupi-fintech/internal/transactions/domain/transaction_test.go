package domain

import "testing"

func TestValidationError(t *testing.T) {
	err := ValidationError{Fields: map[string]string{"amount": "must be > 0"}}
	if err.Error() == "" { t.Fatal("expected error message") }
}