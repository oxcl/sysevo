# Sysevo — System Prompt Evolution Framework

**An empirical framework for benchmarking and evolving AI coding agent system prompts using context engineering, prompt breeding, and parallel evaluation.**

Developed in partnership with [Eurasia International University of Armenia](https://eua.am/) as part of applied research in AI agent orchestration and LLM prompt optimization.

---

## Overview

Sysevo is a Python-based framework that systematically benchmarks AI coding agents across different **system prompt strategies** — then evolves better prompts through an LLM-driven breeding process inspired by genetic algorithms.

The core insight: **system prompts are the most impactful lever in context engineering**, yet most teams optimize them through intuition and trial-and-error. Sysevo replaces that with empirical, reproducible experimentation.

Built with [LangChain](https://python.langchain.com/) and [LangGraph](https://python.langchain.com/docs/langgraph), Sysevo runs the same coding task against multiple system prompt variants in parallel, then compares outputs to determine which prompting strategies produce superior code.

---

## Key Concepts

| Concept | Description |
|---------|-------------|
| **System Prompting** | Structured system prompts that define agent persona, workflow, constraints, and quality standards |
| **Context Engineering** | Designing the full context window — system prompt + tools + task description — to maximize agent performance |
| **Prompt Breeding** | LLM-driven crossover and mutation of two parent prompts into a new child prompt, combining complementary strategies |
| **Generational Evolution** | Iterative refinement across generations — best-performing prompts survive, underperformers are retired |
| **Parallel Benchmarking** | Running all prompt variants simultaneously against identical tasks for controlled comparison |

---

## Architecture

```
sysevo/
├── prompts/                # System prompt variants, organized by generation
│   ├── generation_0/       # Initial seed prompts (12 strategies)
│   ├── generation_1/       # First-generation bred prompts
│   ├── generation_2/       # Second-generation refinements
│   ├── generation_3/       # Third-generation refinements
│   ├── breeder.md          # Meta-prompt for the LLM breeder agent
│   └── breeding_pairs.txt  # Curated parent pairings for batch breeding
├── tasks/                  # Coding tasks used as evaluation benchmarks
├── scripts/                # Orchestration layer
│   ├── agent.py            # LangChain agent setup, tools, model loading
│   ├── run.py              # Single agent execution
│   ├── run_task.py         # Parallel execution of all agents on a task
│   ├── breed.py            # Single prompt breeding via LLM
│   └── breed_batch.py      # Batch breeding with interactive mode
├── run/                    # Agent outputs, organized by generation and agent
├── config.json             # Model provider and concurrency settings
└── requirements.txt        # Python dependencies
```

---

## Tech Stack

- **Language:** Python 3.10+
- **Agent Framework:** LangChain + LangGraph
- **Supported LLM Providers:** OpenAI (GPT-4o), Anthropic (Claude), Google (Gemini) — extensible to any LangChain-compatible provider
- **Parallelization:** Python `ProcessPoolExecutor` with configurable concurrency
- **Tools:** File system tools (bash, read, write, edit, list) — agents operate in a full coding environment

---

## Prompt Strategies

Sysevo benchmarks 12 distinct system prompt strategies, each encoding a different approach to agent behavior:

| Strategy | Approach |
|----------|----------|
| `baseline` | Minimal instructions — "you are an expert developer" |
| `tdd` | Test-driven development enforced — tests before implementation |
| `todoist` | Task management via `plan.md` — structured step-by-step execution |
| `flamboyent` | Excellence-driven — "make the user wow your work" |
| `life-at-stake` | High-stakes framing — failure has consequences |
| `threatened` | Extreme pressure — mistakes hurt people you care about |
| `prove-yourself` | Competitive framing — prove you're better than other agents |
| `simplicity` | Minimalist philosophy — "the best code is the code you don't write" |
| `project-manager` | Full PM workflow — PRD → task breakdown → execution |
| `prototypist` | Rapid iteration — build small prototypes, evolve toward the solution |
| `clean-after-yourself` | Code quality focused — mandatory review and cleanup cycles |
| `personality` | Senior engineer persona — pragmatic, rigorous, systematic |

---

## Breeding & Evolution

The breeding mechanism uses an LLM to combine two parent system prompts into a novel child prompt:

```bash
# Breed two prompts into a new one
./scripts/breed.sh 0 tdd simplicity tdd-simplicity

# Batch breed from curated pairs
python3 ./scripts/breed_batch.py 0 ./prompts/breeding_pairs.txt

# Interactive breeding
python3 ./scripts/breed_batch.py 0 --interactive
```

The breeder agent applies strategies like hybridization, amplification, inversion, extraction, and novel mutation — producing prompts that are genuinely new, not just concatenations of their parents.

---

## Running Benchmarks

```bash
# Run all 12 agents against a task in parallel
./scripts/run_task.sh 0 002-chess

# Run a single agent
./scripts/run.sh 0 baseline 002-chess
```

Outputs appear in `run/generation_<n>/<agent-name>/` as complete project directories with full source code.

---

## Configuration

```json
{
    "model": "openai:gpt-4o",
    "concurrency": 12
}
```

Supports any LangChain-compatible model string: `"openai:gpt-4o"`, `"anthropic:claude-sonnet-4-6"`, `"google_genai:gemini-2.5-flash"`.

---

## Installation

```bash
pip install -r requirements.txt
```

Set provider API keys as environment variables (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`).

---

## Research Context

This project was developed as part of a collaboration with **Eurasia International University of Armenia**, investigating systematic approaches to LLM prompt optimization and AI agent orchestration. The framework demonstrates that prompt engineering can be treated as an empirical, evolutionary process rather than a manual craft — with direct applications in:

- **AI agent development** — optimizing system prompts for coding assistants
- **LLM evaluation** — controlled benchmarking of prompt effectiveness
- **Context engineering research** — understanding how prompt structure influences agent behavior
- **MLOps for prompts** — version-controlled, reproducible prompt management

---

## License

MIT
