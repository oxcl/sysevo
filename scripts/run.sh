#!/usr/bin/env bash
set -e


GENERATION="$1"
AGENT="$2"
TASK="$3"

if [ -z "$GENERATION" ]; then
    echo "define the first argument for generation"
    exit 1
fi

if [ -z "$AGENT" ]; then
    echo "define the second argument for agent-name"
    exit 1;
fi

if [ -z "$TASK" ]; then
    echo "define the third argument for task"
    exit 1;
fi

SYSTEM_PROMPT_FILE="./prompts/generation_$GENERATION/$AGENT.md"

if ! [ -f "$SYSTEM_PROMPT_FILE" ]; then
    echo "prompt for $AGENT in generation $GENERATION wasn't found! cwd: $(pwd). system_prompt_file: '$SYSTEM_PROMPT_FILE'"
    exit 1
fi

TASK_FILE="tasks/$TASK.md"

if ! [ -f "$TASK_FILE" ]; then
    echo "task file $TASK_FILE wasn't found"
    exit 1
fi

PROJECT_DIR="run/generation_$GENERATION/$AGENT"

rm -rf "$PROJECT_DIR"

mkdir -p "$PROJECT_DIR/.pi"

cp "$SYSTEM_PROMPT_FILE" "$PROJECT_DIR/.pi/SYSTEM.md"
cp "$TASK_FILE" "$PROJECT_DIR/task.md"

eval $(./scripts/get_config.sh)

( cd "$PROJECT_DIR" && exec pi "Implement the task" @task.md --provider "$CODER_PROVIDER" --model "$CODER_MODEL" )