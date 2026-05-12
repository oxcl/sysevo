#!/usr/bin/env bash
set -e

# breed.sh — Breeds two system prompts into a new one using an LLM.
#
# Usage:
#   ./scripts/breed.sh <generation> <parent_a> <parent_b> [child_name]
#
# Examples:
#   ./scripts/breed.sh 0 baseline flamboyent
#   ./scripts/breed.sh 0 tdd simplicity tdd-simplicity-hybrid
#   ./scripts/breed.sh 1 personality life-at-stake aggressive-persona
#
# Arguments:
#   generation  - Source generation to read parents from (e.g., 0)
#   parent_a    - Name of first parent prompt (without .md)
#   parent_b    - Name of second parent prompt (without .md)
#   child_name  - (Optional) Name for the child prompt. Auto-generated if omitted.

GENERATION="$1"
PARENT_A="$2"
PARENT_B="$3"
CHILD_NAME="${4:-}"

if [ -z "$GENERATION" ]; then
    echo "Usage: ./scripts/breed.sh <generation> <parent_a> <parent_b> [child_name]"
    echo "  generation  - Source generation (e.g., 0)"
    echo "  parent_a    - First parent prompt name"
    echo "  parent_b    - Second parent prompt name"
    echo "  child_name  - (Optional) Child prompt name"
    exit 1
fi

if [ -z "$PARENT_A" ] || [ -z "$PARENT_B" ]; then
    echo "Error: Both parent_a and parent_b are required."
    echo "Usage: ./scripts/breed.sh <generation> <parent_a> <parent_b> [child_name]"
    exit 1
fi

# Auto-generate child name if not provided
if [ -z "$CHILD_NAME" ]; then
    CHILD_NAME="${PARENT_A}x${PARENT_B}"
fi

SOURCE_GEN="generation_$GENERATION"
TARGET_GEN="generation_$((GENERATION + 1))"

PARENT_A_FILE="./prompts/$SOURCE_GEN/$PARENT_A.md"
PARENT_B_FILE="./prompts/$SOURCE_GEN/$PARENT_B.md"
BREEDER_PROMPT="./prompts/breeder.md"
TARGET_DIR="./prompts/$TARGET_GEN"
TARGET_FILE="$TARGET_DIR/$CHILD_NAME.md"

# Validate inputs
if ! [ -f "$PARENT_A_FILE" ]; then
    echo "Error: Parent A not found: $PARENT_A_FILE"
    exit 1
fi

if ! [ -f "$PARENT_B_FILE" ]; then
    echo "Error: Parent B not found: $PARENT_B_FILE"
    exit 1
fi

if ! [ -f "$BREEDER_PROMPT" ]; then
    echo "Error: Breeder prompt not found: $BREEDER_PROMPT"
    exit 1
fi

if [ -f "$TARGET_FILE" ]; then
    echo "Warning: $TARGET_FILE already exists."
    read -p "Overwrite? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi

# Load config for model/provider
eval $(./scripts/get_config.sh)

# Create target directory
mkdir -p "$TARGET_DIR"

echo "Breeding: $PARENT_A + $PARENT_B → $CHILD_NAME"
echo "Source: $SOURCE_GEN | Target: $TARGET_GEN"
echo "Model: $CODER_MODEL | Provider: $CODER_PROVIDER"
echo ""

# Build the breeding prompt
BREEDING_MESSAGE="Breed these two system prompts into a new one.

=== PARENT A: $PARENT_A ===
$(cat "$PARENT_A_FILE")

=== PARENT B: $PARENT_B ===
$(cat "$PARENT_B_FILE")

Create the child system prompt now."

# Run the LLM to generate the child prompt
echo "Generating child prompt..."

CHILD_PROMPT=$(pi \
    --provider "$CODER_PROVIDER" \
    --model "$CODER_MODEL" \
    --system-prompt "$(cat "$BREEDER_PROMPT")" \
    --print \
    --no-session \
    "$BREEDING_MESSAGE" 2>/dev/null)

if [ -z "$CHILD_PROMPT" ]; then
    echo "Error: LLM returned empty response."
    exit 1
fi

# Strip any markdown code fences the LLM might wrap around the output
# (e.g., ```markdown ... ```)
CLEANED_PROMPT=$(echo "$CHILD_PROMPT" | sed '/^```/d')

# Write the child prompt
echo "$CLEANED_PROMPT" > "$TARGET_FILE"

echo ""
echo "Child prompt created: $TARGET_FILE"
echo "Parent A: $PARENT_A ($PARENT_A_FILE)"
echo "Parent B: $PARENT_B ($PARENT_B_FILE)"
echo ""
echo "Preview (first 5 lines):"
head -5 "$TARGET_FILE"
echo "..."
