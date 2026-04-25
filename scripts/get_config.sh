#!/usr/bin/env bash
CONFIG_FILE="./config.json"

if ! [ -f "$CONFIG_FILE" ]; then
    echo "echo Config file $CONFIG_FILE not found"
    echo "exit 1"
fi

echo export CODER_MODEL="$(cat "$CONFIG_FILE" | jq '.coder_model')"
echo export CODER_PROVIDER="$(cat "$CONFIG_FILE" | jq '.coder_provider')"
echo export CONCURRENCY="$(cat "$CONFIG_FILE" | jq '.concurrency')"