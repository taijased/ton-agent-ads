#!/usr/bin/env bash

set -euo pipefail

ENV_FILE="${1:-/opt/ton-agent-ads/shared/.env}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Env file not found: ${ENV_FILE}" >&2
  exit 1
fi

read_env() {
  local key="$1"
  local line

  line="$(grep -E "^${key}=" "${ENV_FILE}" | tail -n 1 || true)"
  if [[ -z "${line}" ]]; then
    echo "Missing ${key} in ${ENV_FILE}" >&2
    exit 1
  fi

  printf '%s' "${line#*=}"
}

sql_escape() {
  printf '%s' "$1" | sed "s/'/''/g"
}

POSTGRES_USER_VALUE="$(read_env POSTGRES_USER)"
POSTGRES_PASSWORD_VALUE="$(read_env POSTGRES_PASSWORD)"
POSTGRES_DB_VALUE="$(read_env POSTGRES_DB)"

ESCAPED_USER="$(sql_escape "${POSTGRES_USER_VALUE}")"
ESCAPED_PASSWORD="$(sql_escape "${POSTGRES_PASSWORD_VALUE}")"
ESCAPED_DB="$(sql_escape "${POSTGRES_DB_VALUE}")"

sudo systemctl enable --now postgresql

sudo -u postgres psql postgres <<SQL
DO \
\$do\$\
DECLARE
  role_name text := '${ESCAPED_USER}';
  role_password text := '${ESCAPED_PASSWORD}';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = role_name
  ) THEN
    EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', role_name, role_password);
  ELSE
    EXECUTE format('ALTER ROLE %I WITH LOGIN PASSWORD %L', role_name, role_password);
  END IF;
END
\$do\$;
SQL

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = '${ESCAPED_DB}'" | grep -q 1; then
  sudo -u postgres createdb -O "${POSTGRES_USER_VALUE}" "${POSTGRES_DB_VALUE}"
fi

cat <<EOF
PostgreSQL role and database are ready.

Suggested DATABASE_URL:
postgresql://${POSTGRES_USER_VALUE}:${POSTGRES_PASSWORD_VALUE}@127.0.0.1:5432/${POSTGRES_DB_VALUE}
EOF
