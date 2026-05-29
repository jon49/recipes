#!/bin/sh
# Rebuild the static recipe site from the canonical repo.
#
# Called by the PocketBase save hook ($os.cmd). On the first call it re-execs
# itself detached (setsid) so the HTTP request returns immediately, then the
# detached copy does the real work under flock so overlapping saves coalesce
# instead of running Hugo concurrently.

SRC="/var/www/recipes.jnyman.com/src"
DEST="/var/www/recipes.jnyman.com/wwwroot"
LOCK="/tmp/recipes-rebuild.lock"

if [ "$1" != "--run" ]; then
    setsid "$0" --run >/dev/null 2>&1 </dev/null &
    exit 0
fi

exec 9>"$LOCK"
flock 9
hugo --source "$SRC" --destination "$DEST" --gc --minify
