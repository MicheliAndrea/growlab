#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="${1:-}"

if [[ -z "${BACKUP_DIR}" ]]; then
  printf "Usage: %s /path/to/growlab-backup\n" "$0" >&2
  exit 2
fi

if [[ "${GROWLAB_RESTORE_CONFIRM:-}" != "restore" ]]; then
  printf "Refusing restore. Set GROWLAB_RESTORE_CONFIRM=restore to proceed.\n" >&2
  exit 2
fi

if [[ -f "${ROOT_DIR}/.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "${ROOT_DIR}/.env"
  set +a
fi

DB_DSN="${DB_DSN:-host=${GROWLAB_DB_HOST:-db-host} port=${GROWLAB_DB_PORT:-5432} user=${GROWLAB_DB_USER:-growlab} password=${GROWLAB_DB_PASSWORD:-change-me} dbname=${GROWLAB_DB_NAME:-growlab} sslmode=${GROWLAB_DB_SSLMODE:-require}}"

restore_postgres() {
  local dump="${BACKUP_DIR}/postgres/growlab.dump"
  if [[ ! -f "${dump}" ]]; then
    printf "PostgreSQL dump not found: %s\n" "${dump}" >&2
    return
  fi
  pg_restore --clean --if-exists --no-owner --dbname="${DB_DSN}" "${dump}"
}

restore_volume() {
  local volume_name="$1"
  local archive="${BACKUP_DIR}/volumes/${volume_name}.tgz"
  if [[ ! -f "${archive}" ]]; then
    printf "Volume archive not found: %s\n" "${archive}" >&2
    return
  fi

  docker volume create "${volume_name}" >/dev/null
  docker run --rm \
    -v "${volume_name}:/volume" \
    -v "${BACKUP_DIR}/volumes:/backup:ro" \
    alpine:3.20 \
    sh -c "find /volume -mindepth 1 -maxdepth 1 -exec rm -rf {} + && tar -xzf /backup/${volume_name}.tgz -C /volume"
}

restore_postgres

if command -v docker >/dev/null 2>&1; then
  restore_volume growlab_images
  restore_volume growlab_firmware
else
  printf "docker not found; volume restore skipped\n" >&2
fi

printf "Restore completed from %s\n" "${BACKUP_DIR}"
