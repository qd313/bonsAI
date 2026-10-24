"""
Title: no-push
Purpose: PreToolUse hook on Bash. Refuses any command that would run `git push`, unless the
         maintainer has explicitly turned pushing on for the session.
Used for: keeping a lane or an unattended session from ever pushing to the remote, which every lane
          brief in this repo already says not to do -- this makes it true even if a brief is missed
          or a prompt talks an agent into it.
Solves: the easy ways round a naive string search for "git push": a leading environment assignment
        (`FOO=bar git push`), `git -C <dir> push`, `git -c name=value push`, and a push hidden partway
        through a chain of commands joined by `;`, `&&` or `||`.
Does not: block `git push` when BONSAI_ALLOW_PUSH=1 is set for the session; understand every possible
          shell trick (a command run through an interpreter it does not parse, e.g. `sh -c "git push"`
          or `python -c "..."`, is not unwrapped); ever raise -- any internal error allows the command
          through, same as every hook in this folder.
"""
import json
import re
import shlex
import sys
import os

CHAIN_TOKENS = {";", "&&", "||"}
ENV_ASSIGNMENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=")
GIT_OPTS_WITH_ARG = {"-C", "-c", "--work-tree", "--git-dir", "--namespace", "--exec-path", "--exec-path="}


def tokenize(command):
    """Split a shell command into tokens, treating ';', '&&' and '||' as their own tokens.
    Falls back to a plain whitespace split if the command is not valid shell syntax (e.g. an
    unmatched quote) -- better to over-check a weird command than to silently miss a push in it."""
    try:
        lexer = shlex.shlex(command, posix=True, punctuation_chars=";()<>|&")
        lexer.whitespace_split = True
        return list(lexer)
    except ValueError:
        return command.split()


def split_segments(tokens):
    segments = []
    current = []
    for tok in tokens:
        if tok in CHAIN_TOKENS:
            if current:
                segments.append(current)
            current = []
        else:
            current.append(tok)
    if current:
        segments.append(current)
    return segments


def segment_pushes(tokens):
    i, n = 0, len(tokens)
    while i < n and ENV_ASSIGNMENT.match(tokens[i]):
        i += 1
    if i >= n or tokens[i] != "git":
        return False
    i += 1
    while i < n:
        tok = tokens[i]
        if tok in GIT_OPTS_WITH_ARG:
            i += 2
            continue
        if tok.startswith("--") and "=" in tok:
            i += 1
            continue
        if tok.startswith("-"):
            i += 1
            continue
        break
    return i < n and tokens[i] == "push"


def command_pushes(command):
    tokens = tokenize(command)
    for segment in split_segments(tokens):
        if segment_pushes(segment):
            return True
    return False


def deny(command):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": (
                "Pushes are turned off for this session unless the maintainer asks for one. This "
                f"command looks like it would run `git push`: {command!r}. Set BONSAI_ALLOW_PUSH=1 "
                "for the session if the maintainer has explicitly asked for a push."
            ),
        }
    }))


def main():
    if os.environ.get("BONSAI_ALLOW_PUSH") == "1":
        return
    try:
        payload = json.load(sys.stdin)
    except ValueError:
        return
    if (payload.get("tool_name") or "") != "Bash":
        return
    command = (payload.get("tool_input") or {}).get("command") or ""
    if not command:
        return
    if command_pushes(command):
        deny(command)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Fail open: a broken hook must never be the reason a tool call is blocked.
        sys.exit(0)
