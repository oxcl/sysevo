#!/usr/bin/env python3
"""Read config.json and output configuration values."""

import argparse
import json
import sys
from pathlib import Path


CONFIG_FILE = Path("./config.json")
REQUIRED_KEYS = ("model", "concurrency")


def load_config(config_path: Path = CONFIG_FILE) -> dict:
    if not config_path.exists():
        print(f"Error: Config file {config_path} not found", file=sys.stderr)
        sys.exit(1)

    with open(config_path) as f:
        config = json.load(f)

    for key in REQUIRED_KEYS:
        if key not in config:
            print(f"Error: Missing required key '{key}' in {config_path}", file=sys.stderr)
            sys.exit(1)

    return config


def main():
    parser = argparse.ArgumentParser(description="Read project configuration")
    parser.add_argument(
        "--format",
        choices=["export", "json", "dict"],
        default="export",
        help="Output format (default: export)",
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=CONFIG_FILE,
        help="Path to config file (default: ./config.json)",
    )
    args = parser.parse_args()

    config = load_config(args.config)

    if args.format == "export":
        print(f'export MODEL="{config["model"]}"')
        print(f'export CONCURRENCY="{config["concurrency"]}"')
    elif args.format == "json":
        print(json.dumps(config, indent=2))
    elif args.format == "dict":
        print(repr(config))


if __name__ == "__main__":
    main()
