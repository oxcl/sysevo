#!/usr/bin/env bash
set -e

GENERATION="$1"
TASK="$2"

if [ -z "$GENERATION" ] || [ -z "$TASK" ]; then
    echo "Usage: ./scripts/run_task.sh <generation> <task>"
    exit 1
fi

exec python3 "$(dirname "$0")/run_task.py" "$GENERATION" "$TASK" "$@"
