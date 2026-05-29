#!/bin/bash
# Local dev environment: Hugo (live-reload preview) + PocketBase (auth + the
# recipes editor API). Ctrl-C stops both.
#
#   Hugo:       http://localhost:1313/
#   Editor:     http://localhost:1313/editor/
#   PocketBase: http://127.0.0.1:8090/  (admin UI at /_/)
set -e
cd "$(dirname "$0")/.."          # repo root

REPO="$PWD"
PB_PORT=8090
PB_DATA="$REPO/cms/pb_data"
PB_HOOKS="$REPO/cms/pb_hooks"
DEV_EMAIL="a@b.c"
DEV_PASS="asdfasdfasdf"

# Point the hook at the local repo; hugo server handles rebuilds (so the
# rebuild trigger is a no-op) and we don't want dev edits creating commits.
export RECIPES_SRC="$REPO"
export RECIPES_CONTENT="$REPO/content"
export RECIPES_REBUILD="true"
export RECIPES_NO_COMMIT=1

mkdir -p "$PB_DATA"

# Ensure a dev superuser exists so you can log in to /editor/.
pocketbase superuser upsert "$DEV_EMAIL" "$DEV_PASS" --dir "$PB_DATA" >/dev/null 2>&1 \
  || pocketbase superuser create "$DEV_EMAIL" "$DEV_PASS" --dir "$PB_DATA" >/dev/null 2>&1 \
  || true

# Stop both children together (and reap them) on Ctrl-C or exit.
pids=()
cleanup() {
    trap - EXIT INT TERM
    kill "${pids[@]}" 2>/dev/null || true
    wait "${pids[@]}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

pocketbase serve --http="127.0.0.1:$PB_PORT" --dir="$PB_DATA" --hooksDir="$PB_HOOKS" &
pids+=($!)

echo
echo "  Editor:     http://localhost:1313/editor/   (login: $DEV_EMAIL / $DEV_PASS)"
echo "  PocketBase: http://127.0.0.1:$PB_PORT/  (admin UI at /_/)"
echo

hugo server &
pids+=($!)

wait
