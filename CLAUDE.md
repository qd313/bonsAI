# CLAUDE.md

Claude Code's own orientation. Facts only; if this disagrees with the code, the code is right.

Everything about the project itself lives in [AGENTS.md](AGENTS.md), the one guide for people and
any AI tool, and the traps already hit are in
[docs/lessons-learned.md](docs/lessons-learned.md). Read both. This file holds only what is
specific to Claude Code: its hooks and its agents.

## Writing to the maintainer

**Everything written to the maintainer is in simple, plain language** — see AGENTS.md for the full
rule. On Claude Code it is also enforced mechanically: `.claude/hooks/model-routing-check.py` runs
on every prompt and every subagent start and repeats the rule, because a line in a doc alone was
not enough for a long session to remember it (the maintainer has asked five times).

## Hooks

`.claude/settings.json` wires five hooks under `.claude/hooks/`, all Python. None of them ever
raises — an internal error lets the action through rather than blocking it:

| Hook | Fires on | Does |
|---|---|---|
| `model-routing-check.py` | Every prompt; every subagent start | Injects the plain-language rule, and on an implementation-shaped prompt, the model/effort routing table from AGENTS.md, 'Which model does which work' |
| `bookkeeper-guard.py` | Edit/Write/MultiEdit/NotebookEdit | Refuses a Fable-model edit to the roadmap files (including `docs/roadmap-kb.md` and `docs/roadmap-shelved.md`), testing docs, changelog or a test file; points the session at the `bookkeeper` helper instead. Off via `BONSAI_BOOKKEEPER_GUARD=off` |
| `no-push.py` | Bash | Refuses any `git push` unless `BONSAI_ALLOW_PUSH=1` is set for the session |
| `read-range.py` | Read | Reminder only, never a block: suggests an offset/limit when reading a file over 600 lines whole |
| `spawn-line.py` | Agent/Workflow | Stops new lanes once five hours cost too much, weighed by model |

## Agents

`.claude/agents/` holds this repo's Claude agents. Three are five-line wrappers around a tool-neutral
persona document, so the guidance reads the same for a person, for Claude, or for another tool:

| Agent | Wrapper | Full body |
|---|---|---|
| `foss-advocate` | `.claude/agents/foss-advocate.md` | [docs/agents/foss-advocate.md](docs/agents/foss-advocate.md) |
| `security-auditor` | `.claude/agents/security-auditor.md` | [docs/agents/security-auditor.md](docs/agents/security-auditor.md) |
| `advisor` | `.claude/agents/advisor.md` | [docs/agents/advisor.md](docs/agents/advisor.md) |

The helpers in AGENTS.md, 'Which model does which work' (`bookkeeper`, the `*-lane` agents,
`deck-driver`) are files there too; front matter sets model and effort.

## Commands and long sessions

Commands are in [AGENTS.md § Commands](AGENTS.md#commands); there are no Claude-only slash
commands. The desktop app keeps this PC awake during a session; the VS Code extension does not, so
there, start `python scripts/keep_awake.py --hours 8` at the start of a long one.
