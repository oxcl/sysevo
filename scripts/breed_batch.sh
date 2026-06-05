#!/usr/bin/env bash
set -e

GENERATION="$1"
MODE="${2:-}"

if [ -z "$GENERATION" ] || [ -z "$MODE" ]; then
    echo "Usage:"
    echo "  ./scripts/breed_batch.sh <generation> <pairs_file>"
    echo "  ./scripts/breed_batch.sh <generation> --interactive"
    exit 1
fi

exec python3 "$(dirname "$0")/breed_batch.py" "$GENERATION" "$MODE" "$@"
