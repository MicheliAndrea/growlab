package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

var requiredFiles = []string{
	"sqlc.yaml",
	"database/migrations/000001_init_schema.sql",
	"database/migrations/000002_feature_enhancements.sql",
	"database/queries/feature_enhancements.sql",
}

func main() {
	for _, file := range requiredFiles {
		if err := requireFile(file); err != nil {
			fail(err)
		}
	}

	if err := requireGooseMarkers("database/migrations/000001_init_schema.sql"); err != nil {
		fail(err)
	}
	if err := requireGooseMarkers("database/migrations/000002_feature_enhancements.sql"); err != nil {
		fail(err)
	}
	if err := requireQueries("database/queries"); err != nil {
		fail(err)
	}

	fmt.Println("sqlc binary not found; local SQL structure validation passed")
}

func requireFile(path string) error {
	info, err := os.Stat(path)
	if err != nil {
		return err
	}
	if info.IsDir() {
		return fmt.Errorf("%s is a directory", path)
	}
	return nil
}

func requireGooseMarkers(path string) error {
	content, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	text := string(content)
	if !strings.Contains(text, "-- +goose Up") {
		return fmt.Errorf("%s is missing goose Up marker", path)
	}
	if !strings.Contains(text, "-- +goose Down") {
		return fmt.Errorf("%s is missing goose Down marker", path)
	}
	return nil
}

func requireQueries(root string) error {
	var found int
	err := filepath.WalkDir(root, func(path string, entry os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if entry.IsDir() || !strings.HasSuffix(path, ".sql") {
			return nil
		}
		content, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		found += strings.Count(string(content), "-- name:")
		return nil
	})
	if err != nil {
		return err
	}
	if found == 0 {
		return fmt.Errorf("no sqlc query annotations found in %s", root)
	}
	return nil
}

func fail(err error) {
	fmt.Fprintf(os.Stderr, "sqlc-lite: %v\n", err)
	os.Exit(1)
}
