#!/usr/bin/env python3
"""Shared LangChain agent setup: tools, model loading, and agent creation."""

import json
import os
import subprocess
import sys
from pathlib import Path

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import tool


ROOT = Path(__file__).resolve().parent.parent


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------

@tool
def bash(command: str) -> str:
    """Execute a bash command and return stdout + stderr.

    Use this for running shell commands, installing packages, compiling code,
    running tests, or any other terminal operation.
    """
    result = subprocess.run(
        command, shell=True, capture_output=True, text=True, timeout=120
    )
    output = result.stdout
    if result.stderr:
        output += "\n[STDERR]\n" + result.stderr
    return output.strip() or "(no output)"


@tool
def read_file(path: str) -> str:
    """Read the contents of a file at the given path.

    Use this to examine code, configs, or any text file.
    """
    p = Path(path)
    if not p.exists():
        return f"ERROR: File not found: {path}"
    return p.read_text()


@tool
def write_file(path: str, content: str) -> str:
    """Write content to a file, creating it or overwriting entirely.

    Use this to create new files or rewrite existing ones.
    """
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content)
    return f"Successfully wrote {len(content)} chars to {path}"


@tool
def edit_file(path: str, old_text: str, new_text: str) -> str:
    """Replace old_text with new_text in a file. Only first occurrence is replaced.

    Use this for targeted edits to existing files.
    """
    p = Path(path)
    if not p.exists():
        return f"ERROR: File not found: {path}"
    content = p.read_text()
    if old_text not in content:
        return f"ERROR: old_text not found in {path}"
    content = content.replace(old_text, new_text, 1)
    p.write_text(content)
    return f"Successfully edited {path}"


@tool
def list_files(directory: str = ".") -> str:
    """List files and directories at the given path.

    Returns a tree-like listing of files.
    """
    result = subprocess.run(
        ["find", directory, "-maxdepth", "3", "-not", "-path", "*/.git/*",
         "-not", "-path", "*/node_modules/*", "-not", "-path", "*/__pycache__/*"],
        capture_output=True, text=True, timeout=10
    )
    return result.stdout.strip() or "(empty)"


CODING_TOOLS = [bash, read_file, write_file, edit_file, list_files]


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

def load_config() -> dict:
    config_path = ROOT / "config.json"
    if not config_path.exists():
        print(f"Error: Config file {config_path} not found", file=sys.stderr)
        sys.exit(1)

    with open(config_path) as f:
        config = json.load(f)

    for key in ("model", "concurrency"):
        if key not in config:
            print(f"Error: Missing required key '{key}' in {config_path}", file=sys.stderr)
            sys.exit(1)

    return config


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------

def get_model(config: dict | None = None, temperature: float = 0):
    """Create a LangChain chat model from config.

    Config should have a "model" key in "provider:model" format,
    e.g. "openai:gpt-4o" or "anthropic:claude-sonnet-4-6".

    Alternatively, the model string can be a bare model name if the
    provider package is installed and the corresponding env var is set.
    """
    if config is None:
        config = load_config()

    model_string = config["model"]

    # Lazy import so only the needed provider is required
    provider, _, model_name = model_string.partition(":")
    if not model_name:
        # No provider prefix — default to openai
        provider, model_name = "openai", model_string

    if provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model=model_name, temperature=temperature)
    elif provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model=model_name, temperature=temperature)
    elif provider == "google_genai":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(model=model_name, temperature=temperature)
    else:
        # Try openai as fallback (works for openrouter, together, etc.)
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model=model_name, temperature=temperature, base_url=None)


# ---------------------------------------------------------------------------
# Agent
# ---------------------------------------------------------------------------

def create_coding_agent(system_prompt: str, config: dict | None = None):
    """Create a coding agent with file system tools.

    Args:
        system_prompt: The system prompt text (content of a .md prompt file).
        config: Optional config dict. Loaded from config.json if None.

    Returns:
        A compiled LangGraph agent that can be invoked with messages.
    """
    from langchain.agents import create_agent

    if config is None:
        config = load_config()

    model = get_model(config, temperature=0)

    return create_agent(
        model=model,
        tools=CODING_TOOLS,
        system_prompt=system_prompt,
    )


def run_agent(agent, user_message: str) -> str:
    """Run the agent with a user message and return the final response text."""
    result = agent.invoke({
        "messages": [HumanMessage(content=user_message)]
    })
    return result["messages"][-1].content


def llm_complete(system_prompt: str, user_message: str, config: dict | None = None) -> str:
    """Simple LLM completion (no tools) with a system prompt.

    Used by the breeder to generate child prompts.
    """
    model = get_model(config, temperature=0.7)

    response = model.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_message),
    ])
    return response.content
