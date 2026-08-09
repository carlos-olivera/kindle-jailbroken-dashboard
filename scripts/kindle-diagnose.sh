#!/bin/sh
# Diagnóstico rápido de conectividad Kindle desde la Mac, sin Node.
# Uso: scripts/kindle-diagnose.sh [host]
# Lee KINDLE_HOST / KINDLE_SSH_KEY / KINDLE_SSH_PORT de .env si existe.

set -eu

if [ -f .env ]; then
  # shellcheck disable=SC2046
  export $(grep -E '^(KINDLE_HOST|KINDLE_SSH_KEY|KINDLE_SSH_PORT|FBINK_PATH)=' .env | xargs)
fi

HOST="${1:-${KINDLE_HOST:-192.168.1.50}}"
PORT="${KINDLE_SSH_PORT:-22}"
KEY="${KINDLE_SSH_KEY:-$HOME/.ssh/kindle_pw4_ed25519}"
KEY=$(eval echo "$KEY")
FBINK="${FBINK_PATH:-/mnt/us/libkh/bin/fbink}"

echo "== 1. TCP puerto $PORT en $HOST (el ping ICMP puede fallar aunque SSH funcione) =="
if nc -z -G 5 "$HOST" "$PORT" 2>/dev/null; then
  echo "   puerto $PORT abierto"
else
  echo "   puerto $PORT NO responde. ¿Kindle dormido? ¿IP cambió? ¿aislamiento de clientes Wi-Fi?"
  exit 1
fi

SSH_OPTS="-i $KEY -p $PORT -o BatchMode=yes -o IdentitiesOnly=yes -o ConnectTimeout=10 -o UserKnownHostsFile=.data/known_hosts -o StrictHostKeyChecking=accept-new -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa"
mkdir -p .data

echo "== 2. SSH con clave pública =="
# shellcheck disable=SC2086
ssh $SSH_OPTS "root@$HOST" -- uname -a

echo "== 3. FBInk =="
# shellcheck disable=SC2086
ssh $SSH_OPTS "root@$HOST" -- "$FBINK" -e || true

echo "== OK: SSH y FBInk responden =="
