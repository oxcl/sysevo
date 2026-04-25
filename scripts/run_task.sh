#!/usr/bin/env bash
set -e

GENERATION="$1"
TASK="$2"

if [ -z "$GENERATION" ]; then
    echo "define the first argument for generation"
    exit 1
fi

if [ -z "$TASK" ]; then
    echo "define the second argument for task"
    exit 1;
fi

eval $(./scripts/get_config.sh)

COMMANDS=();

for SYSTEM_PROMPT_FILE in prompts/generation_$GENERATION/*.md; do 
    AGENT="$(basename "$SYSTEM_PROMPT_FILE" .md)"
    COMMANDS+=("./scripts/run.sh $GENERATION $AGENT $TASK")
done

export CMD0="${COMMANDS[0]}"
export CMD1="${COMMANDS[1]}"
export CMD2="${COMMANDS[2]}"
export CMD3="${COMMANDS[3]}"
export CMD4="${COMMANDS[4]}"
export CMD5="${COMMANDS[5]}"
export CMD6="${COMMANDS[6]}"
export CMD7="${COMMANDS[7]}"
export CMD8="${COMMANDS[8]}"
export CMD9="${COMMANDS[9]}"
export CMD10="${COMMANDS[10]}"
export CMD11="${COMMANDS[11]}"
export CMD12="${COMMANDS[12]}"
export CMD13="${COMMANDS[13]}"
export CMD14="${COMMANDS[14]}"
export CMD15="${COMMANDS[15]}"
export CMD16="${COMMANDS[16]}"


exec zellij --layout ./scripts/layout_$CONCURRENCY.kdl