# Sysevo

**System Prompt Evolution** — a framework for benchmarking AI coding agents across different system prompt strategies.

Sysevo runs the same coding task against multiple system prompt variants in parallel, then compares outputs to understand which prompting strategies produce better code.

## The Problem

System prompts shape how an AI agent approaches a task — its planning style, attention to quality, error handling, and overall output. But prompt engineering is mostly trial and error. There's no systematic way to compare strategies.

Sysevo makes this empirical. Define your prompts, define your tasks, run them all in parallel, and let the results speak.

## How It Works

```
prompts/           → 12 system prompt variants
tasks/             → Coding tasks to evaluate against
scripts/           → Orchestration (parallel execution via Zellij)
run/               → Agent outputs, organized by generation and agent name
config.json        → Model and concurrency settings
```

1. **Define prompts** in `prompts/generation_0/` — each file is a different system prompt strategy
2. **Define tasks** in `tasks/` — markdown files describing what to build
3. **Run** `./scripts/run_task.sh 0 <task-name>` to execute all prompts against a task in parallel
4. **Compare** outputs in `run/generation_0/<agent-name>/`

## Prompt Strategies (Generation 0)

| Prompt | Strategy |
|--------|----------|
| `baseline` | Minimal instructions — just "you are an expert developer" |
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

## Tasks

| Task | Description |
|------|-------------|
| `001-tictactoe` | Simple tic-tac-toe in a single HTML file |
| `002-chess` | Production-ready chess game with AI opponent, Canvas API, and animations |

## Configuration

Edit `config.json`:

```json
{
    "coder_model": "opencode-go@deepseek-v4-flash",
    "coder_provider": "daedalus",
    "concurrency": 12
}
```

- `coder_model` — The model to use for code generation
- `coder_provider` — The provider backend
- `concurrency` — Number of parallel agents (limited by Zellij layout)

## Requirements

- [Zellij](https://github.com/zellij-org/zellij) — terminal multiplexer for parallel execution
- [pi](https://github.com/pi-labs/pi) — AI coding agent CLI
- [jq](https://jqlang.github.io/jq/) — JSON parsing for config

## Usage

```bash
# Run all prompts against a specific task
./scripts/run_task.sh 0 002-chess

# Run a single prompt against a task
./scripts/run.sh 0 baseline 002-chess
```

Outputs appear in `run/generation_<n>/<agent-name>/` as complete project directories.

## Evolution

The framework is designed for iteration across generations:

- **Generation 0** — Initial prompt variants, baseline comparison
- **Generation 1+** — Refined prompts based on what worked, retired strategies that didn't

Each generation can introduce new prompts, retire underperformers, and evolve the best strategies based on empirical results.

## License

MIT
