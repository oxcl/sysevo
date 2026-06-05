#!/usr/bin/env bash
set -e

GENERATION="$1"
AGENT="$2"
TASK="$3"

if [ -z "$GENERATION" ] || [ -z "$AGENT" ] || [ -z "$TASK" ]; then
    echo "Usage: ./scripts/run.sh <generation> <agent> <task>"
    exit 1
fi

exec python3 "$(dirname "$0")/run.py" "$GENERATION" "$AGENT" "$TASK"
