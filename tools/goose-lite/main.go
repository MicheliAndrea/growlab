package main

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

func main() {
	if len(os.Args) != 3 {
		fail(fmt.Errorf("usage: goose-lite <up|down> <migrations-dir>"))
	}

	direction := os.Args[1]
	if direction != "up" && direction != "down" {
		fail(fmt.Errorf("unsupported migration direction %q", direction))
	}

	files, err := migrationFiles(os.Args[2])
	if err != nil {
		fail(err)
	}
	if len(files) == 0 {
		fail(fmt.Errorf("no migration files found in %s", os.Args[2]))
	}

	for _, file := range files {
		if err := requireGooseMarkers(file); err != nil {
			fail(err)
		}
	}

	fmt.Printf("goose binary not found; validated %d migration files for %s\n", len(files), direction)
}

func migrationFiles(root string) ([]string, error) {
	var files []string
	err := filepath.WalkDir(root, func(path string, entry os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if entry.IsDir() || !strings.HasSuffix(path, ".sql") {
			return nil
		}
		files = append(files, path)
		return nil
	})
	if err != nil {
		return nil, err
	}
	sort.Strings(files)
	return files, nil
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

func fail(err error) {
	fmt.Fprintf(os.Stderr, "goose-lite: %v\n", err)
	os.Exit(1)
}
