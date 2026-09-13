"""
Title: bookkeeper-guard
Purpose: PreToolUse hook on Edit / Write / MultiEdit / NotebookEdit. When the main chat is running on
         Fable and the target is one of the bookkeeping docs or a test file, it refuses the edit and
         tells the session to hand the job to the `bookkeeper` helper (Sonnet 5 high) instead.
Used for: keeping the expensive model on decisions and the cheap one on typing, without relying on the
          session remembering a rule late in a long transcript.
Solves: instructions drift; a refused tool call does not. Plan 33 measured the model tier as the cost
        lever, and Fable writing roadmap rows is the tier spent on the cheapest work there is.
Does not: fire inside a helper (the payload carries an agent id and the helper's own transcript), on any
          other model, on plans, memory, scratch files or ordinary source edits, or when
          BONSAI_BOOKKEEPER_GUARD=off is set for the session.
"""
import json
import os
import re
import sys

GUARDED_DOCS = {
    "docs/roadmap.md",
    "docs/testing.md",
    "docs/testing-manual.md",
    "CHANGELOG.md",
}
TEST_FILE = re.compile(r"(^|/)(src/.*\.test\.(ts|tsx)|tests/.*\.py)$")


def last_model(transcript_path):
    """Model of the newest assistant turn in the transcript the hook was handed."""
    model = None
    try:
        with open(transcript_path, encoding="utf-8", errors="replace") as fh:
            for line in fh:
                if '"assistant"' not in line:
                    continue
                try:
                    rec = json.loads(line)
                except ValueError:
                    continue
                if rec.get("type") != "assistant":
                    continue
                m = (rec.get("message") or {}).get("model")
                if m and m != "<synthetic>":
                    model = m
    except OSError:
        pass
    return model or ""


def repo_relative(path, payload):
    root = os.environ.get("CLAUDE_PROJECT_DIR") or payload.get("cwd") or os.getcwd()
    try:
        rel = os.path.relpath(os.path.abspath(path), os.path.abspath(root))
    except ValueError:  # different drive on Windows
        return None
    rel = rel.replace("\\", "/")
    if rel.startswith("../"):
        return None  # outside the repo: memory, scratchpad, user settings
    return rel


def guarded(rel):
    if rel in GUARDED_DOCS:
        return "the roadmap, testing docs or changelog"
    if TEST_FILE.search(rel):
        return "a test file"
    return None


def deny(reason):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }))


def main():
    if os.environ.get("BONSAI_BOOKKEEPER_GUARD", "").lower() in ("off", "0", "false"):
        return
    try:
        payload = json.load(sys.stdin)
    except ValueError:
        return
    if payload.get("agent_id") or payload.get("agent_type"):
        return  # a helper is doing the typing; that is the point
    model = last_model(payload.get("transcript_path") or "")
    if "fable" not in model.lower():
        return
    tool_input = payload.get("tool_input") or {}
    path = tool_input.get("file_path") or tool_input.get("notebook_path")
    if not path:
        return
    rel = repo_relative(path, payload)
    if not rel:
        return
    what = guarded(rel)
    if not what:
        return
    deny(
        f"This chat is running on Fable, and {rel} is {what}. That typing belongs to the bookkeeper "
        "helper (Sonnet 5 high), not to the expensive model. Spawn the `bookkeeper` agent with the "
        "absolute checkout path and a brief that says, for each change, what a person will notice and "
        "what each row should read; it edits, runs the gates and reports back. Batch every edit from "
        "this landing into that one brief. If this is a one-off the maintainer has asked you to make "
        "yourself, say so and ask them to set BONSAI_BOOKKEEPER_GUARD=off for the session."
    )


if __name__ == "__main__":
    main()
