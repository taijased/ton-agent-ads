#!/usr/bin/env bash

set -euo pipefail

RELEASE_DIR="${1:?Usage: server-deploy.sh <release-dir>}"
APP_ROOT="/opt/ton-agent-ads"
CURRENT_LINK="${APP_ROOT}/current"
ENV_FILE="${APP_ROOT}/shared/.env"

if [[ ! -d "${RELEASE_DIR}" ]]; then
  echo "Release directory not found: ${RELEASE_DIR}" >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing shared env file: ${ENV_FILE}" >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required on the VM" >&2
  exit 1
fi

ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"

cd "${CURRENT_LINK}"
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm build
DOTENV_CONFIG_PATH="${ENV_FILE}" pnpm exec prisma migrate deploy --config prisma.config.ts

sudo systemctl daemon-reload
sudo systemctl restart ton-agent-api.service ton-agent-bot.service
sudo systemctl --no-pager --full status ton-agent-api.service ton-agent-bot.service
