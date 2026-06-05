#!/usr/bin/env bash
set -e

GENERATION="$1"
PARENT_A="$2"
PARENT_B="$3"
CHILD_NAME="${4:-}"

if [ -z "$GENERATION" ] || [ -z "$PARENT_A" ] || [ -z "$PARENT_B" ]; then
    echo "Usage: ./scripts/breed.sh <generation> <parent_a> <parent_b> [child_name]"
    exit 1
fi

ARGS=("$GENERATION" "$PARENT_A" "$PARENT_B")
[ -n "$CHILD_NAME" ] && ARGS+=("$CHILD_NAME")

exec python3 "$(dirname "$0")/breed.py" "${ARGS[@]}"
