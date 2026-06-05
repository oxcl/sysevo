#!/usr/bin/env bash
CONFIG_FILE="./config.json"

if ! [ -f "$CONFIG_FILE" ]; then
    echo "echo Config file $CONFIG_FILE not found"
    echo "exit 1"
fi

echo export MODEL="$(cat "$CONFIG_FILE" | jq '.model')"
echo export CONCURRENCY="$(cat "$CONFIG_FILE" | jq '.concurrency')"
