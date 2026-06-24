#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-5173}"
HOST="${HOST:-127.0.0.1}"

cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "node is required to start Vibe Learner."
  exit 1
fi

echo "Starting Vibe Learner with Codex survey API..."
echo "URL: http://${HOST}:${PORT}/"
echo "Press Ctrl+C to stop."

HOST="$HOST" PORT="$PORT" node server.mjs
