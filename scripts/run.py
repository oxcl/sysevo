#!/usr/bin/env python3
"""Run a single agent on a task using LangChain."""

import argparse
import shutil
import sys
from pathlib import Path

from agent import create_coding_agent, run_agent, load_config


ROOT = Path(__file__).resolve().parent.parent


def run(generation: str, agent_name: str, task: str):
    # Validate prompt file
    prompt_file = ROOT / "prompts" / f"generation_{generation}" / f"{agent_name}.md"
    if not prompt_file.exists():
        print(
            f"Error: Prompt for '{agent_name}' in generation {generation} not found. "
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
    model = config["model"]

    # Clean and create project directory
    project_dir = ROOT / "run" / f"generation_{generation}" / agent_name
    if project_dir.exists():
        shutil.rmtree(project_dir)
    project_dir.mkdir(parents=True)

    # Copy task file
    shutil.copy2(task_file, project_dir / "task.md")

    # Read system prompt and task
    system_prompt = prompt_file.read_text()
    task_content = (project_dir / "task.md").read_text()

    # Create agent
    print(f"[{agent_name}] Creating agent with model={model}...")
    agent = create_coding_agent(system_prompt, config)

    # Run agent from the project directory
    import os
    os.chdir(project_dir)

    user_message = f"Implement the following task. Work in the current directory.\n\n{task_content}"
    print(f"[{agent_name}] Running agent...")

    try:
        response = run_agent(agent, user_message)
        print(f"[{agent_name}] Done.")
        if response:
            # Save response to a log file
            (project_dir / "agent_response.md").write_text(response)
    except Exception as e:
        print(f"[{agent_name}] Error: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Run a single agent on a task")
    parser.add_argument("generation", help="Generation name (e.g., '0')")
    parser.add_argument("agent", help="Agent name (prompt filename without .md)")
    parser.add_argument("task", help="Task name (without .md)")
    args = parser.parse_args()

    run(args.generation, args.agent, args.task)


if __name__ == "__main__":
    main()
