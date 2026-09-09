#!/usr/bin/env bash
set -euo pipefail

trim_whitespace() {
  local value=$1
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

is_valid_host() {
  [[ $1 =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ ]]
}

is_valid_user() {
  [[ $1 =~ ^[A-Za-z0-9_][A-Za-z0-9._-]*$ ]]
}

if [[ ${1:-} == "--self-test" ]]; then
  [[ $(trim_whitespace $'  203.0.113.10\r\n') == "203.0.113.10" ]]
  is_valid_host "vps.example.com"
  ! is_valid_host $'vps.example.com\r'
  ! is_valid_host "https://vps.example.com"
  is_valid_user "deploy-user"
  printf 'prepare-ssh-target self-test passed\n'
  exit 0
fi

vps_host=$(trim_whitespace "${VPS_HOST_RAW:-}")
vps_user=$(trim_whitespace "${VPS_USER_RAW:-}")

if ! is_valid_host "$vps_host"; then
  echo "::error::VPS_HOST must contain only a hostname or IPv4 address (no protocol, port, path, or internal whitespace)."
  exit 1
fi

if ! is_valid_user "$vps_user"; then
  echo "::error::VPS_USER is empty or contains invalid characters."
  exit 1
fi

{
  printf 'VPS_HOST=%s\n' "$vps_host"
  printf 'VPS_USER=%s\n' "$vps_user"
} >> "$GITHUB_ENV"
