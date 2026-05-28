#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/infrastructure/docker/docker-compose.yml"

failures=0

require() {
  local description="$1"
  local command="$2"
  if eval "${command}"; then
    printf "ok: %s\n" "${description}"
  else
    printf "fail: %s\n" "${description}" >&2
    failures=$((failures + 1))
  fi
}

require ".env is ignored" "git -C '${ROOT_DIR}' check-ignore -q .env"
require "Redis has no published ports" "! grep -A12 '^  growlab-redis:' '${COMPOSE_FILE}' | grep -q 'ports:'"
require "Ollama has no published ports" "! grep -A12 '^  growlab-ollama:' '${COMPOSE_FILE}' | grep -q 'ports:'"
require "API port uses GROWLAB_LAN_BIND" "grep -Fq '\${GROWLAB_LAN_BIND:-127.0.0.1}:8080:8080' '${COMPOSE_FILE}'"
require "Web port uses GROWLAB_LAN_BIND" "grep -Fq '\${GROWLAB_LAN_BIND:-127.0.0.1}:3000:3000' '${COMPOSE_FILE}'"
require "Worker metrics port uses GROWLAB_LAN_BIND" "grep -Fq '\${GROWLAB_LAN_BIND:-127.0.0.1}:9091:9091' '${COMPOSE_FILE}'"
require "MQTT port uses GROWLAB_LAN_BIND" "grep -Fq '\${GROWLAB_LAN_BIND:-127.0.0.1}:1883:1883' '${COMPOSE_FILE}'"
require "CORS env is wired" "grep -q 'GROWLAB_CORS_ORIGINS' '${COMPOSE_FILE}'"

if [[ "${failures}" -gt 0 ]]; then
  printf "%d security checks failed\n" "${failures}" >&2
  exit 1
fi

printf "security checks passed\n"
