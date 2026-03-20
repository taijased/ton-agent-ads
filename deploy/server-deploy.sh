#!/usr/bin/env bash

set -euo pipefail

RELEASE_DIR="${1:?Usage: server-deploy.sh <release-dir>}"
APP_ROOT="/opt/ton-agent-ads"
CURRENT_LINK="${APP_ROOT}/current"
ENV_FILE="${APP_ROOT}/shared/.env"
COMPOSE_FILE="docker-compose.vm.yml"

compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    sudo docker compose "$@"
    return
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    sudo docker-compose "$@"
    return
  fi

  echo "docker compose or docker-compose is required on the VM" >&2
  exit 1
}

if [[ ! -d "${RELEASE_DIR}" ]]; then
  echo "Release directory not found: ${RELEASE_DIR}" >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing shared env file: ${ENV_FILE}" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required on the VM" >&2
  exit 1
fi

ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"
ln -sfn "${ENV_FILE}" "${CURRENT_LINK}/.env"

cd "${CURRENT_LINK}"
compose_cmd -f "${COMPOSE_FILE}" up -d postgres
compose_cmd -f "${COMPOSE_FILE}" build api bot
compose_cmd -f "${COMPOSE_FILE}" run --rm api pnpm exec prisma migrate deploy --config prisma.config.ts
compose_cmd -f "${COMPOSE_FILE}" up -d api bot
compose_cmd -f "${COMPOSE_FILE}" ps
