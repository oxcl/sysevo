#!/usr/bin/env python3
"""Run all agents in a generation against a task, in parallel."""

import argparse
import json
import os
import subprocess
import sys
from concurrent.futures import ProcessPoolExecutor, as_completed
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


def get_agents(generation: str) -> list[str]:
    """Find all agent prompt files and return their names."""
    prompts_dir = ROOT / "prompts" / f"generation_{generation}"
    if not prompts_dir.exists():
        print(f"Error: Prompts directory {prompts_dir} not found", file=sys.stderr)
        sys.exit(1)

    agents = []
    for prompt_file in sorted(prompts_dir.glob("*.md")):
        agents.append(prompt_file.stem)

    if not agents:
        print(f"Error: No agent prompts found in {prompts_dir}", file=sys.stderr)
        sys.exit(1)

    return agents


def run_single_agent(generation: str, agent: str, task: str) -> tuple[str, int]:
    """Run a single agent and return (agent_name, exit_code)."""
    run_script = ROOT / "scripts" / "run.py"
    cmd = [sys.executable, str(run_script), generation, agent, task]

    try:
        result = subprocess.run(
            cmd,
            cwd=str(ROOT),
            capture_output=True,
            text=True,
        )

        prefix = f"[{agent}]"
        if result.stdout:
            for line in result.stdout.splitlines():
                print(f"{prefix} {line}", flush=True)
        if result.stderr:
            for line in result.stderr.splitlines():
                print(f"{prefix} {line}", file=sys.stderr, flush=True)

        return agent, result.returncode
    except Exception as e:
        print(f"[{agent}] Error: {e}", file=sys.stderr, flush=True)
        return agent, 1


def run_parallel(generation: str, task: str, concurrency: int):
    """Run all agents in parallel using ProcessPoolExecutor."""
    agents = get_agents(generation)
    max_workers = min(concurrency, len(agents))

    print(f"Running {len(agents)} agents with concurrency={max_workers}")
    print(f"Generation: {generation}, Task: {task}")
    print("-" * 60)

    results = []
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(run_single_agent, generation, agent, task): agent
            for agent in agents
        }

        for future in as_completed(futures):
            agent, returncode = future.result()
            status = "OK" if returncode == 0 else f"FAILED (exit {returncode})"
            results.append((agent, returncode))
            print(f"  {agent}: {status}", flush=True)

    print("-" * 60)
    failed = [(a, c) for a, c in results if c != 0]
    passed = len(results) - len(failed)
    print(f"Results: {passed}/{len(results)} succeeded")
    if failed:
        print("Failed agents:")
        for agent, code in failed:
            print(f"  - {agent} (exit {code})")
        sys.exit(1)


def run_zellij(generation: str, task: str, concurrency: int):
    """Run all agents via Zellij with tiled layout (legacy mode)."""
    agents = get_agents(generation)
    run_script = ROOT / "scripts" / "run.py"

    # Build commands for each agent
    commands = [
        f"{sys.executable} {run_script} {generation} {agent} {task}"
        for agent in agents
    ]

    # Pad to at least 17 slots (CMD0..CMD16, matching original script)
    while len(commands) < 17:
        commands.append("echo 'no agent'")

    # Set CMD0..CMD16 environment variables
    env = os.environ.copy()
    for i, cmd in enumerate(commands[:17]):
        env[f"CMD{i}"] = cmd

    # Find the layout file
    layout_file = ROOT / "scripts" / f"layout_{concurrency}.kdl"
    if not layout_file.exists():
        print(f"Error: Layout file {layout_file} not found", file=sys.stderr)
        sys.exit(1)

    print(f"Launching Zellij with {len(agents)} agents...")
    print(f"Layout: {layout_file}")

    result = subprocess.run(
        ["zellij", "--layout", str(layout_file)],
        cwd=str(ROOT),
        env=env,
    )
    if result.returncode != 0:
        print(f"Error: Zellij failed with exit code {result.returncode}", file=sys.stderr)
        sys.exit(result.returncode)


def main():
    parser = argparse.ArgumentParser(
        description="Run all agents in a generation against a task"
    )
    parser.add_argument("generation", help="Generation name (e.g., '0')")
    parser.add_argument("task", help="Task name without extension (e.g., '002-chess')")
    parser.add_argument(
        "--zellij",
        action="store_true",
        help="Use Zellij for parallel execution (legacy mode)",
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=None,
        help="Override concurrency from config.json",
    )
    args = parser.parse_args()

    config = load_config()
    concurrency = args.concurrency or config["concurrency"]

    if args.zellij:
        run_zellij(args.generation, args.task, concurrency)
    else:
        run_parallel(args.generation, args.task, concurrency)


if __name__ == "__main__":
    main()
