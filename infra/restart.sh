#!/bin/bash
# Works from any directory: paths are resolved relative to this script.
# Usage: restart.sh [--no-cache]
#   Rebuilds with the layer cache by default. --no-cache forces a clean rebuild,
#   which reinstalls torch and the models' dependencies (slow, large download).
set -e
NO_CACHE=()
for arg in "$@"; do
    case "$arg" in
        --no-cache) NO_CACHE=(--no-cache) ;;
        -h|--help) sed -n 2,5p "$0"; exit 0 ;;
        *) echo "unknown option: $arg" >&2; exit 2 ;;
    esac
done
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

if [ ! -f "$ROOT_DIR/.env" ]; then
    echo "No .env found. Create it first: cp .env.example .env" >&2
    exit 1
fi

COMPOSE=(docker compose --env-file "$ROOT_DIR/.env" -f "$SCRIPT_DIR/docker-compose.yml")

echo "Stopping containers..."
"${COMPOSE[@]}" down

echo "Rebuilding images..."
"${COMPOSE[@]}" build "${NO_CACHE[@]}"

echo "Starting services..."
"${COMPOSE[@]}" up -d

echo ""
echo "Waiting for services to start (30s)..."
sleep 30

echo ""
echo "Checking health..."
bash "$SCRIPT_DIR/check-health.sh"

echo ""
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:8011/docs"
