package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("resource not found")

type Record map[string]any

type Repository struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) Query(ctx context.Context, sql string, args ...any) ([]Record, error) {
	rows, err := r.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanRecords(rows)
}

func (r *Repository) QueryOne(ctx context.Context, sql string, args ...any) (Record, error) {
	rows, err := r.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	records, err := scanRecords(rows)
	if err != nil {
		return nil, err
	}
	if len(records) == 0 {
		return nil, ErrNotFound
	}
	return records[0], nil
}

func (r *Repository) Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error) {
	return r.pool.Exec(ctx, sql, args...)
}

func scanRecords(rows pgx.Rows) ([]Record, error) {
	fields := rows.FieldDescriptions()
	records := []Record{}

	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			return nil, err
		}

		record := make(Record, len(fields))
		for i, field := range fields {
			record[snakeToCamel(string(field.Name))] = normalizeValue(values[i])
		}
		records = append(records, record)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return records, nil
}

func normalizeValue(value any) any {
	switch typed := value.(type) {
	case nil:
		return nil
	case pgtype.UUID:
		if !typed.Valid {
			return nil
		}
		return formatUUID(typed.Bytes)
	case [16]byte:
		return formatUUID(typed)
	case pgtype.Text:
		if !typed.Valid {
			return nil
		}
		return typed.String
	case pgtype.Bool:
		if !typed.Valid {
			return nil
		}
		return typed.Bool
	case pgtype.Int4:
		if !typed.Valid {
			return nil
		}
		return typed.Int32
	case pgtype.Int8:
		if !typed.Valid {
			return nil
		}
		return typed.Int64
	case pgtype.Float4:
		if !typed.Valid {
			return nil
		}
		return typed.Float32
	case pgtype.Float8:
		if !typed.Valid {
			return nil
		}
		return typed.Float64
	case pgtype.Date:
		if !typed.Valid {
			return nil
		}
		return typed.Time.Format("2006-01-02")
	case pgtype.Timestamptz:
		if !typed.Valid {
			return nil
		}
		return typed.Time.UTC().Format(time.RFC3339Nano)
	case time.Time:
		return typed.UTC().Format(time.RFC3339Nano)
	case []byte:
		var decoded any
		if json.Valid(typed) && json.Unmarshal(typed, &decoded) == nil {
			return decoded
		}
		return string(typed)
	default:
		return typed
	}
}

func formatUUID(bytes [16]byte) string {
	return fmt.Sprintf("%x-%x-%x-%x-%x", bytes[0:4], bytes[4:6], bytes[6:8], bytes[8:10], bytes[10:16])
}

func snakeToCamel(value string) string {
	var builder strings.Builder
	upperNext := false
	for i, ch := range value {
		if ch == '_' {
			upperNext = true
			continue
		}
		if upperNext {
			builder.WriteString(strings.ToUpper(string(ch)))
			upperNext = false
			continue
		}
		if i == 0 {
			builder.WriteString(strings.ToLower(string(ch)))
			continue
		}
		builder.WriteRune(ch)
	}
	return builder.String()
}
