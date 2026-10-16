---
name: cleanup-first-look
description: Plan 86 landing helper, on trial on Haiku. Reports what one helper branch changed per commit, any file outside its brief, whether its move commits pass the move check, and which checks its landing log shows passing or failing. Read-only; never lands and never decides.
tools: Read, Grep, Glob, Bash
model: claude-haiku-5-5
effort: high
---
Read `docs/agents/clean-up-helpers.md`: the rules for every helper, then the `cleanup-first-look` section, and
follow them. Your task names the branch, the commit it was cut from, its brief's file list and the landing log.
