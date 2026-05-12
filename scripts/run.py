#!/usr/bin/env python3
"""Run a single agent on a task."""

import json
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


def load_config() -> dict:
    config_path = ROOT / "config.json"
    if not config_path.exists():
        print(f"Error: Config file {config_path} not found", file=sys.stderr)
        sys.exit(1)

    with open(config_path) as f:
        config = json.load(f)

    required = ("coder_model", "coder_provider", "concurrency")
    for key in required:
        if key not in config:
            print(f"Error: Missing required key '{key}' in {config_path}", file=sys.stderr)
            sys.exit(1)

    return config


def run(generation: str, agent: str, task: str):
    # Validate prompt file
    prompt_file = ROOT / "prompts" / f"generation_{generation}" / f"{agent}.md"
    if not prompt_file.exists():
        print(
            f"Error: Prompt for '{agent}' in generation {generation} not found. "
            f"Cwd: {ROOT}. Prompt file: '{prompt_file}'",
            file=sys.stderr,
        )
        sys.exit(1)

    # Validate task file
    task_file = ROOT / "tasks" / f"{task}.md"
    if not task_file.exists():
        print(f"Error: Task file {task_file} not found", file=sys.stderr)
        sys.exit(1)

    # Load config
    config = load_config()
    provider = config["coder_provider"]
    model = config["coder_model"]

    # Clean and create project directory
    project_dir = ROOT / "run" / f"generation_{generation}" / agent
    if project_dir.exists():
        shutil.rmtree(project_dir)
    (project_dir / ".pi").mkdir(parents=True)

    # Copy prompt and task files
    shutil.copy2(prompt_file, project_dir / ".pi" / "SYSTEM.md")
    shutil.copy2(task_file, project_dir / "task.md")

    # Run pi CLI
    cmd = [
        "pi",
        "Implement the task",
        f"@task.md",
        "--provider", provider,
        "--model", model,
    ]
    result = subprocess.run(cmd, cwd=project_dir)
    if result.returncode != 0:
        print(f"Error: pi command failed with exit code {result.returncode}", file=sys.stderr)
        sys.exit(result.returncode)


def main():
    if len(sys.argv) != 4:
        print(f"Usage: {sys.argv[0]} <generation> <agent> <task>", file=sys.stderr)
        sys.exit(1)

    generation = sys.argv[1]
    agent = sys.argv[2]
    task = sys.argv[3]

    run(generation, agent, task)


if __name__ == "__main__":
    main()
