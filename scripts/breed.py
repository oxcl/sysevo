#!/usr/bin/env python3
"""Breed two system prompts into a new one using LangChain."""

import argparse
import sys
from pathlib import Path

from agent import llm_complete, load_config


ROOT = Path(__file__).resolve().parent.parent


def breed(generation: str, parent_a: str, parent_b: str, child_name: str | None = None):
    """Breed two prompts and return (child_name, child_prompt_content)."""
    source_gen = f"generation_{generation}"
    target_gen = f"generation_{int(generation) + 1}"

    parent_a_file = ROOT / "prompts" / source_gen / f"{parent_a}.md"
    parent_b_file = ROOT / "prompts" / source_gen / f"{parent_b}.md"
    breeder_prompt = ROOT / "prompts" / "breeder.md"

    # Validate inputs
    if not parent_a_file.exists():
        print(f"Error: Parent A not found: {parent_a_file}", file=sys.stderr)
        sys.exit(1)

    if not parent_b_file.exists():
        print(f"Error: Parent B not found: {parent_b_file}", file=sys.stderr)
        sys.exit(1)

    if not breeder_prompt.exists():
        print(f"Error: Breeder prompt not found: {breeder_prompt}", file=sys.stderr)
        sys.exit(1)

    # Auto-generate child name
    if not child_name:
        child_name = f"{parent_a}x{parent_b}"

    # Load config
    config = load_config()
    model = config["model"]

    # Read parent prompts
    parent_a_content = parent_a_file.read_text()
    parent_b_content = parent_b_file.read_text()
    breeder_content = breeder_prompt.read_text()

    # Build the breeding message
    breeding_message = (
        f"Breed these two system prompts into a new one.\n\n"
        f"=== PARENT A: {parent_a} ===\n"
        f"{parent_a_content}\n\n"
        f"=== PARENT B: {parent_b} ===\n"
        f"{parent_b_content}\n\n"
        f"Create the child system prompt now."
    )

    print(f"Breeding: {parent_a} + {parent_b} → {child_name}")
    print(f"Source: {source_gen} | Target: {target_gen}")
    print(f"Model: {model}")
    print()

    # Run the LLM
    try:
        child_prompt = llm_complete(breeder_content, breeding_message, config)
    except Exception as e:
        print(f"Error: LLM call failed: {e}", file=sys.stderr)
        sys.exit(1)

    if not child_prompt or not child_prompt.strip():
        print("Error: LLM returned empty response.", file=sys.stderr)
        sys.exit(1)

    # Strip markdown code fences if present
    lines = child_prompt.split("\n")
    if lines and lines[0].strip().startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip().startswith("```"):
        lines = lines[:-1]
    child_prompt = "\n".join(lines)

    return child_name, child_prompt.strip()


def main():
    parser = argparse.ArgumentParser(description="Breed two system prompts into a new one")
    parser.add_argument("generation", help="Source generation (e.g., '0')")
    parser.add_argument("parent_a", help="First parent prompt name (without .md)")
    parser.add_argument("parent_b", help="Second parent prompt name (without .md)")
    parser.add_argument("child_name", nargs="?", default=None, help="Child prompt name (auto-generated if omitted)")
    parser.add_argument("--force", action="store_true", help="Overwrite existing child prompt")
    args = parser.parse_args()

    target_gen = f"generation_{int(args.generation) + 1}"
    child_name = args.child_name or f"{args.parent_a}x{args.parent_b}"
    target_file = ROOT / "prompts" / target_gen / f"{child_name}.md"

    if target_file.exists() and not args.force:
        response = input(f"Warning: {target_file} already exists. Overwrite? [y/N] ")
        if response.lower() != "y":
            print("Aborted.")
            sys.exit(0)

    # Breed
    name, content = breed(args.generation, args.parent_a, args.parent_b, args.child_name)

    # Save
    target_dir = ROOT / "prompts" / target_gen
    target_dir.mkdir(parents=True, exist_ok=True)
    target_file.write_text(content + "\n")

    print(f"\nChild prompt created: {target_file}")
    print(f"Parent A: {args.parent_a}")
    print(f"Parent B: {args.parent_b}")
    print(f"\nPreview (first 5 lines):")
    for line in content.split("\n")[:5]:
        print(f"  {line}")
    print("  ...")


if __name__ == "__main__":
    main()
