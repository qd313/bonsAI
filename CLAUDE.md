# CLAUDE.md

Claude Code's own orientation. Facts only — if something here disagrees with the code, the code is
right and this file is a bug.

Everything about the project itself — what it is, the layout, entry points, the RPC boundary,
settings, commands, testing on the Deck, conventions, the Decky focus-graph rule, and the refactor
rules — lives in [AGENTS.md](AGENTS.md), the one guide meant for humans and any AI tool. Read that
file for all of it; this one holds only what is specific to running as Claude Code here: its hooks,
its agents, and anything unique to a Claude Code session.

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
| `model-routing-check.py` | Every prompt; every subagent start | Injects the plain-language rule, and on an implementation-shaped prompt, the model/effort routing table from AGENTS.md § 3 |
| `bookkeeper-guard.py` | Edit/Write/MultiEdit/NotebookEdit | Refuses a Fable-model edit to the roadmap, testing docs, changelog or a test file; points the session at the `bookkeeper` helper instead. Off via `BONSAI_BOOKKEEPER_GUARD=off` |
| `no-push.py` | Bash | Refuses any `git push` unless `BONSAI_ALLOW_PUSH=1` is set for the session |
| `read-range.py` | Read | Reminder only, never a block: suggests an offset/limit when reading a file over 600 lines whole |
| `spawn-line.py` | Agent/Workflow | Stops new lanes once a session has spent too much of its usage window |

## Agents

`.claude/agents/` holds this repo's Claude agents. Two are five-line wrappers around a tool-neutral
persona document, so the guidance reads the same whether a human opens the doc, Claude runs the
agent, or another tool calls the matching MCP prompt:

| Agent | Wrapper | Full body |
|---|---|---|
| `foss-advocate` | `.claude/agents/foss-advocate.md` | [docs/agents/foss-advocate.md](docs/agents/foss-advocate.md) |
| `security-auditor` | `.claude/agents/security-auditor.md` | [docs/agents/security-auditor.md](docs/agents/security-auditor.md) |

The lane and helper agents named in AGENTS.md § 3 (`bookkeeper`, `bugfix-lane`, `feature-lane`,
`kb-lane`, and similar) are not files in this repo — see that section for what each one does and
when to use it.

## Commands specific to this session

Everything else — `npm test`, `npm run build`, deploy scripts, and so on — is in
[AGENTS.md § Commands](AGENTS.md#commands) and is not repeated here. There is no
`.claude/commands/` directory in this repo today: no Claude-only slash commands beyond the
built-in ones.
