#!/usr/bin/env python3
"""Batch breed multiple prompt pairs from a file."""

import argparse
import sys
from pathlib import Path

from breed import breed, load_config


ROOT = Path(__file__).resolve().parent.parent


def parse_pairs_file(pairs_file: Path) -> list[dict]:
    """Parse a pairs file into a list of breeding pairs."""
    pairs = []

    with open(pairs_file) as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()

            # Skip empty lines and comments
            if not line or line.startswith("#"):
                continue

            parts = [p.strip() for p in line.split(",")]

            if len(parts) < 2:
                print(f"Warning: Line {line_num} has fewer than 2 parts, skipping: {line}")
                continue

            pair = {
                "parent_a": parts[0],
                "parent_b": parts[1],
                "child_name": parts[2] if len(parts) > 2 else None,
            }
            pairs.append(pair)

    return pairs


def interactive_mode(generation: str):
    """Interactive breeding mode."""
    print("Interactive mode. Enter pairs as: parent_a parent_b [child_name]")
    print("Type 'quit' to exit.\n")

    # List available prompts
    source_gen = f"generation_{generation}"
    prompts_dir = ROOT / "prompts" / source_gen
    if prompts_dir.exists():
        print("Available prompts:")
        for f in sorted(prompts_dir.glob("*.md")):
            print(f"  - {f.stem}")
        print()

    while True:
        try:
            user_input = input("Pair> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break

        if user_input in ("quit", "exit", "q"):
            break

        if not user_input:
            continue

        parts = user_input.split()
        if len(parts) < 2:
            print("  Usage: parent_a parent_b [child_name]")
            continue

        parent_a = parts[0]
        parent_b = parts[1]
        child_name = parts[2] if len(parts) > 2 else None

        try:
            name, content = breed(generation, parent_a, parent_b, child_name)
            target_gen = f"generation_{int(generation) + 1}"
            target_dir = ROOT / "prompts" / target_gen
            target_dir.mkdir(parents=True, exist_ok=True)
            target_file = target_dir / f"{name}.md"

            if target_file.exists():
                response = input(f"  {target_file} exists. Overwrite? [y/N] ")
                if response.lower() != "y":
                    print("  Skipped.")
                    continue

            target_file.write_text(content + "\n")
            print(f"  Created: {target_file}\n")
        except SystemExit:
            print("  Failed to breed this pair.\n")


def batch_mode(generation: str, pairs_file: Path, force: bool = False):
    """Batch breeding from a file."""
    pairs = parse_pairs_file(pairs_file)
    target_gen = f"generation_{int(generation) + 1}"

    print(f"=== Batch Breeder ===")
    print(f"Source: prompts/generation_{generation}/")
    print(f"Target: prompts/{target_gen}/")
    print(f"Pairs: {len(pairs)}")
    print()

    bred_count = 0
    failed_count = 0

    for i, pair in enumerate(pairs, 1):
        parent_a = pair["parent_a"]
        parent_b = pair["parent_b"]
        child_name = pair["child_name"]

        print(f"[{i}/{len(pairs)}] Breeding: {parent_a} + {parent_b}")

        try:
            name, content = breed(generation, parent_a, parent_b, child_name)

            target_dir = ROOT / "prompts" / target_gen
            target_dir.mkdir(parents=True, exist_ok=True)
            target_file = target_dir / f"{name}.md"

            if target_file.exists() and not force:
                response = input(f"  {target_file} exists. Overwrite? [y/N] ")
                if response.lower() != "y":
                    print("  Skipped.")
                    continue

            target_file.write_text(content + "\n")
            print(f"  Created: {target_file}\n")
            bred_count += 1

        except SystemExit:
            print(f"  Failed to breed {parent_a} + {parent_b}\n")
            failed_count += 1

    print(f"=== Done ===")
    print(f"Bred: {bred_count} | Failed: {failed_count}")
    print(f"New prompts in: prompts/{target_gen}/")


def main():
    parser = argparse.ArgumentParser(description="Batch breed system prompts")
    parser.add_argument("generation", help="Source generation (e.g., '0')")
    parser.add_argument("pairs_source", help="Pairs file path or --interactive")
    parser.add_argument("--force", action="store_true", help="Overwrite existing prompts")
    args = parser.parse_args()

    if args.pairs_source == "--interactive":
        interactive_mode(args.generation)
    else:
        pairs_file = Path(args.pairs_source)
        if not pairs_file.exists():
            print(f"Error: Pairs file not found: {pairs_file}", file=sys.stderr)
            sys.exit(1)
        batch_mode(args.generation, pairs_file, args.force)


if __name__ == "__main__":
    main()
