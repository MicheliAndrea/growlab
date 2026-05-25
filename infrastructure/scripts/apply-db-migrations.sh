#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

export PGPASSWORD="${GROWLAB_DB_PASSWORD:-change-me}"

psql \
  --host "${GROWLAB_DB_HOST:-pg-01}" \
  --port "${GROWLAB_DB_PORT:-5432}" \
  --username "${GROWLAB_DB_USER:-growlab}" \
  --dbname "${GROWLAB_DB_NAME:-growlab}" \
  --file "${ROOT_DIR}/database/migrations/001_initial_schema.sql"
