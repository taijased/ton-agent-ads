#!/usr/bin/env bash

set -euo pipefail

APP_ROOT="/opt/ton-agent-ads"
SERVICE_TEMPLATE_DIR="deploy/systemd"
CURRENT_USER="$(whoami)"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

install_node() {
  if command -v node >/dev/null 2>&1; then
    return
  fi

  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
}

sudo apt-get update
sudo apt-get install -y curl ca-certificates gnupg git build-essential nginx postgresql postgresql-contrib

install_node

require_command node
require_command npm

if ! command -v pnpm >/dev/null 2>&1; then
  sudo npm install -g pnpm@10.6.0
fi

sudo mkdir -p "${APP_ROOT}/releases" "${APP_ROOT}/shared"
sudo chown -R "${CURRENT_USER}:${CURRENT_USER}" "${APP_ROOT}"

for template in ton-agent-api.service.template ton-agent-bot.service.template; do
  sed \
    -e "s|__APP_ROOT__|${APP_ROOT}|g" \
    -e "s|__APP_USER__|${CURRENT_USER}|g" \
    "${SERVICE_TEMPLATE_DIR}/${template}" | \
    sudo tee "/etc/systemd/system/${template%.template}" >/dev/null
done

sudo systemctl daemon-reload
sudo systemctl enable postgresql
sudo systemctl enable ton-agent-api.service ton-agent-bot.service

cat <<'EOF'
VM bootstrap complete.

Next steps:
1. Create /opt/ton-agent-ads/shared/.env from .env.example.
2. Run deploy/setup-postgres.sh to provision the local database.
3. Run the GitHub Actions deploy workflow or execute deploy/server-deploy.sh with a release directory.
EOF
