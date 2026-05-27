package repository

import (
	"context"
	"errors"
	"testing"
)

func TestRepositoryRequiresQueries(t *testing.T) {
	repo := New(nil)

	_, err := repo.ListSystemEvents(context.Background(), 10)
	if !errors.Is(err, ErrNoQueries) {
		t.Fatalf("expected ErrNoQueries, got %v", err)
	}
}
