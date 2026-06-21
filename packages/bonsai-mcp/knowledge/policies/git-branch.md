---
id: git-branch
title: Git and remote branches
tags: [git, alwaysApply]
alwaysApply: true
description: Branch policy, push rules, and Bugbot guidance
---

## Git & remote branches

- NEVER run `git push`, `git push -u`, or `gh` commands that publish branches/commits unless the user explicitly asks to push in the current message.
- NEVER create or push branches under `cursor/` (e.g. `cursor/critical-bug-*`). Investigation and bugfix work stays on the user's current branch (`experimental`, `features`, `main`, or a named feature branch) until the user approves push.
- Prefer local commits; open a PR only when the user requests it.
- Release tags (`git push origin vX.Y.Z`) are allowed only when the user explicitly requests a release push (see `docs/development.md`).
- Cloud Agents / Bugbot Autofix can still push `cursor/*` via the GitHub App — disable Autofix at [cursor.com/dashboard/bugbot](https://cursor.com/dashboard/bugbot) if unwanted; see `.cursor/BUGBOT.md`.
