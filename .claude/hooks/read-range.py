"""
Title: read-range
Purpose: PreToolUse hook on Read. A reminder, never a refusal -- when the file being read is over
         600 lines and no offset/limit was given, it allows the read and attaches a short note
         suggesting a range or a search instead.
Used for: nudging a session away from reading a whole large file into context when it only needed a
          part of it, per CLAUDE.md's "read a file in full only when modifying it or when its logic
          is non-obvious" rule.
Solves: the rule living only in CLAUDE.md, which a long session can lose track of.
Does not: block anything -- it always allows. It says nothing for a file at or under 600 lines, a
          file read with an offset or a limit already set, or a file it cannot open or count. It
          never raises -- any internal error allows the read through, same as every hook in this
          folder.
"""
import json
import sys

LINE_LIMIT = 600


def count_lines(path):
    count = 0
    with open(path, "rb") as fh:
        for _ in fh:
            count += 1
    return count


def remind(reason):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "allow",
            "permissionDecisionReason": reason,
        }
    }))


def main():
    try:
        payload = json.load(sys.stdin)
    except ValueError:
        return
    if (payload.get("tool_name") or "") != "Read":
        return
    tool_input = payload.get("tool_input") or {}
    if tool_input.get("offset") or tool_input.get("limit"):
        return  # a range was already asked for
    path = tool_input.get("file_path")
    if not path:
        return
    try:
        lines = count_lines(path)
    except OSError:
        return
    if lines <= LINE_LIMIT:
        return
    remind(
        f"This file is {lines} lines. Consider reading a line range, or searching it with Grep first, "
        "instead of reading the whole thing."
    )


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Fail open: a broken hook must never be the reason a tool call is blocked.
        sys.exit(0)
