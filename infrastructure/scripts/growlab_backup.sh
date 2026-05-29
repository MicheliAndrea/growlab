#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_ROOT="${GROWLAB_BACKUP_ROOT:-${ROOT_DIR}/backups}"
STAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
BACKUP_DIR="${BACKUP_ROOT}/growlab-${STAMP}"

mkdir -p "${BACKUP_DIR}/postgres" "${BACKUP_DIR}/volumes" "${BACKUP_DIR}/config"

if [[ -f "${ROOT_DIR}/.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "${ROOT_DIR}/.env"
  set +a
fi

DB_DSN="${DB_DSN:-host=${GROWLAB_DB_HOST:-db-host} port=${GROWLAB_DB_PORT:-5432} user=${GROWLAB_DB_USER:-growlab} password=${GROWLAB_DB_PASSWORD:-change-me} dbname=${GROWLAB_DB_NAME:-growlab} sslmode=${GROWLAB_DB_SSLMODE:-require}}"

printf "Creating GrowLab backup in %s\n" "${BACKUP_DIR}"

if command -v pg_dump >/dev/null 2>&1; then
  pg_dump --format=custom --file="${BACKUP_DIR}/postgres/growlab.dump" "${DB_DSN}"
else
  printf "pg_dump not found; PostgreSQL backup skipped\n" >&2
fi

backup_volume() {
  local volume_name="$1"
  local archive_name="$2"

  if docker volume inspect "${volume_name}" >/dev/null 2>&1; then
    docker run --rm \
      -v "${volume_name}:/volume:ro" \
      -v "${BACKUP_DIR}/volumes:/backup" \
      alpine:3.20 \
      tar -czf "/backup/${archive_name}.tgz" -C /volume .
  else
    printf "Docker volume %s not found; skipped\n" "${volume_name}" >&2
  fi
}

if command -v docker >/dev/null 2>&1; then
  backup_volume growlab_images growlab_images
  backup_volume growlab_firmware growlab_firmware
else
  printf "docker not found; volume backups skipped\n" >&2
fi

copy_if_exists() {
  local path="$1"
  local target="$2"
  if [[ -e "${ROOT_DIR}/${path}" ]]; then
    mkdir -p "$(dirname "${BACKUP_DIR}/config/${target}")"
    cp -a "${ROOT_DIR}/${path}" "${BACKUP_DIR}/config/${target}"
  fi
}

copy_if_exists .env app.env
copy_if_exists infrastructure/.env infrastructure.env
copy_if_exists infrastructure/docker/docker-compose.yml docker-compose.yml

if git -C "${ROOT_DIR}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git -C "${ROOT_DIR}" bundle create "${BACKUP_DIR}/config/repository.bundle" --all
  git -C "${ROOT_DIR}" status --short >"${BACKUP_DIR}/config/git-status.txt"
fi

{
  printf "created_at=%s\n" "${STAMP}"
  printf "backup_dir=%s\n" "${BACKUP_DIR}"
  printf "db_host=%s\n" "${GROWLAB_DB_HOST:-db-host}"
  printf "db_name=%s\n" "${GROWLAB_DB_NAME:-growlab}"
} >"${BACKUP_DIR}/MANIFEST.txt"

if command -v sha256sum >/dev/null 2>&1; then
  find "${BACKUP_DIR}" -type f ! -name SHA256SUMS -print0 |
    sort -z |
    xargs -0 sha256sum >"${BACKUP_DIR}/SHA256SUMS"
fi

printf "Backup complete: %s\n" "${BACKUP_DIR}"
