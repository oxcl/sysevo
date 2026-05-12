#!/usr/bin/env bash
set -e

# breed_batch.sh — Breed multiple pairs of prompts from a file or interactively.
#
# Usage:
#   ./scripts/breed_batch.sh <generation> <pairs_file>
#   ./scripts/breed_batch.sh <generation> --interactive
#
# Pairs file format (one pair per line):
#   parent_a,parent_b[,child_name]
#
# Example pairs file:
#   baseline,flamboyent
#   tdd,simplicity,tdd-simplicity
#   personality,life-at-stake,aggressive-persona
#   todoist,project-manager,structured-pm
#
# Interactive mode prompts for each pair.

GENERATION="$1"
MODE="$2"

if [ -z "$GENERATION" ]; then
    echo "Usage:"
    echo "  ./scripts/breed_batch.sh <generation> <pairs_file>"
    echo "  ./scripts/breed_batch.sh <generation> --interactive"
    exit 1
fi

SOURCE_GEN="generation_$GENERATION"
TARGET_GEN="generation_$((GENERATION + 1))"

echo "=== Batch Breeder ==="
echo "Source: prompts/$SOURCE_GEN/"
echo "Target: prompts/$TARGET_GEN/"
echo ""

# List available prompts
echo "Available prompts in $SOURCE_GEN:"
for f in ./prompts/$SOURCE_GEN/*.md; do
    name=$(basename "$f" .md)
    echo "  - $name"
done
echo ""

BRED_COUNT=0
FAIL_COUNT=0

breed_pair() {
    local parent_a="$1"
    local parent_b="$2"
    local child_name="${3:-}"

    echo "--- Breeding: $parent_a + $parent_b ---"
    if ./scripts/breed.sh "$GENERATION" "$parent_a" "$parent_b" "$child_name"; then
        BRED_COUNT=$((BRED_COUNT + 1))
    else
        echo "  Failed to breed $parent_a + $parent_b"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    echo ""
}

if [ "$MODE" = "--interactive" ]; then
    echo "Interactive mode. Enter pairs as: parent_a parent_b [child_name]"
    echo "Type 'quit' to exit."
    echo ""

    while true; do
        read -p "Pair> " -r input
        if [ "$input" = "quit" ] || [ "$input" = "exit" ]; then
            break
        fi
        if [ -z "$input" ]; then
            continue
        fi

        # Parse input: parent_a parent_b [child_name]
        read -ra PARTS <<< "$input"
        parent_a="${PARTS[0]}"
        parent_b="${PARTS[1]}"
        child_name="${PARTS[2]:-}"

        if [ -z "$parent_a" ] || [ -z "$parent_b" ]; then
            echo "  Usage: parent_a parent_b [child_name]"
            continue
        fi

        breed_pair "$parent_a" "$parent_b" "$child_name"
    done

elif [ -f "$MODE" ]; then
    # Read from pairs file
    echo "Reading pairs from: $MODE"
    echo ""

    while IFS= read -r line || [ -n "$line" ]; do
        # Skip empty lines and comments
        [[ -z "$line" || "$line" =~ ^# ]] && continue

        # Parse CSV: parent_a,parent_b[,child_name]
        IFS=',' read -ra PARTS <<< "$line"
        parent_a=$(echo "${PARTS[0]}" | xargs)  # trim whitespace
        parent_b=$(echo "${PARTS[1]}" | xargs)
        child_name="${PARTS[2]:-}"
        if [ -n "$child_name" ]; then
            child_name=$(echo "$child_name" | xargs)
        fi

        if [ -n "$parent_a" ] && [ -n "$parent_b" ]; then
            breed_pair "$parent_a" "$parent_b" "$child_name"
        fi
    done < "$MODE"

else
    echo "Error: Second argument must be --interactive or a pairs file path."
    echo "Usage:"
    echo "  ./scripts/breed_batch.sh <generation> <pairs_file>"
    echo "  ./scripts/breed_batch.sh <generation> --interactive"
    exit 1
fi

echo "=== Done ==="
echo "Bred: $BRED_COUNT | Failed: $FAIL_COUNT"
echo "New prompts in: prompts/$TARGET_GEN/"
