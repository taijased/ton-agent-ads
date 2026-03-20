#!/usr/bin/env bash

set -euo pipefail

APP_ROOT="/opt/ton-agent-ads"
APP_USER="${SUDO_USER:-$(whoami)}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

install_docker() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    return
  fi

  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg

  . /etc/os-release
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
}

sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

install_docker

require_command docker

sudo systemctl enable docker
sudo systemctl start docker
sudo mkdir -p "${APP_ROOT}/releases" "${APP_ROOT}/shared"
sudo chown -R "${APP_USER}:${APP_USER}" "${APP_ROOT}"

cat <<'EOF'
VM bootstrap complete.

Next steps:
1. Add runtime GitHub Secrets.
2. Run the GitHub Actions deploy workflow.
EOF
