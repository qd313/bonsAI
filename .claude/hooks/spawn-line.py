"""
Title: spawn-line
Purpose: PreToolUse hook on Agent and Workflow calls. Once a session has spent too much of its
         five-hour usage window, this stops any new agent or workflow from starting, so a burst of
         lanes cannot blow through the budget before anyone notices.
Used for: phase 0 of the refactor-round-two plan (see docs/audit/maintainer-decisions-locked.md),
          which asked for a hard stop instead of a rule a long session has to keep remembering.
Solves: nothing found on this machine already reports the same percentage the usage screen shows.
        Checked before writing this: no state or cache file under the user's Claude folder names
        usage or a limit, no usage-reading tool (e.g. ccusage) is on PATH or installed globally, and
        the `claude` command line has no usage/status subcommand reachable from a plain shell. So this
        hook falls back to adding up token counts from the session's own transcripts, divided by a
        budget the maintainer supplies once. `--status` prints the same figure for a human to check.
Does not: read the real usage-screen figure (no local source for it exists); block anything except
          Agent/Workflow calls; ever deny when the budget is uncalibrated; ever raise -- any internal
          error allows the call through, same as every hook in this folder.
"""
import datetime
import glob
import json
import os
import sys
import time

DEFAULT_LINE = 75.0
# The plain token-count fields Anthropic's API reports per message. Nested breakdowns
# (output_tokens_details, cache_creation, iterations, ...) restate these numbers, not add to them.
USAGE_FIELDS = ("input_tokens", "output_tokens", "cache_creation_input_tokens", "cache_read_input_tokens")
WINDOW = datetime.timedelta(hours=5)
TIME_BUDGET_SECONDS = 1.5  # stay well under the 2-second hook limit even on a slow disk


def _parse_timestamp(raw):
    try:
        return datetime.datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def five_hour_total():
    """Best-effort sum of token usage across every distinct assistant message, in the last five
    hours, across every project transcript this user has. Returns None if nothing could be read."""
    root = os.path.join(os.path.expanduser("~"), ".claude", "projects")
    pattern = os.path.join(root, "*", "*.jsonl")
    now = datetime.datetime.now(datetime.timezone.utc)
    cutoff = now - WINDOW
    cutoff_epoch = time.time() - WINDOW.total_seconds()
    started = time.monotonic()

    seen_ids = set()
    total = 0
    found_any_file = False

    for path in glob.glob(pattern):
        # A file whose last write is older than the window cannot contain any record inside the
        # window, since nothing newer could have been appended after that write. Skip it unread --
        # this is what keeps a 500MB transcript folder from being a 2-second problem.
        try:
            if os.path.getmtime(path) < cutoff_epoch:
                continue
        except OSError:
            continue
        found_any_file = True
        if time.monotonic() - started > TIME_BUDGET_SECONDS:
            break
        try:
            with open(path, encoding="utf-8", errors="replace") as fh:
                for line in fh:
                    if time.monotonic() - started > TIME_BUDGET_SECONDS:
                        break
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        rec = json.loads(line)
                    except ValueError:
                        continue
                    when = _parse_timestamp(rec.get("timestamp") or "")
                    if when is None or when < cutoff:
                        continue
                    message = rec.get("message") or {}
                    usage = message.get("usage")
                    if not usage:
                        continue
                    key = message.get("id") or (path, rec.get("uuid"))
                    if key in seen_ids:
                        continue
                    seen_ids.add(key)
                    for field in USAGE_FIELDS:
                        val = usage.get(field)
                        if isinstance(val, (int, float)):
                            total += val
        except OSError:
            continue

    if not found_any_file:
        return None
    return total


def figure():
    """(percent_used, note). percent_used is None, with a plain-words note, when the budget hasn't
    been calibrated yet -- callers must treat None as "unknown", never as zero."""
    denom_raw = os.environ.get("BONSAI_FIVE_HOUR_TOKENS")
    if not denom_raw:
        return None, "the five-hour token budget is unknown and needs calibrating once against the usage screen"
    try:
        denom = float(denom_raw)
    except ValueError:
        return None, "BONSAI_FIVE_HOUR_TOKENS is not a number, so the budget needs calibrating once against the usage screen"
    if denom <= 0:
        return None, "BONSAI_FIVE_HOUR_TOKENS is not a positive number, so the budget needs calibrating once against the usage screen"
    total = five_hour_total()
    if total is None:
        return None, "no session transcripts were found to add up, so the figure is unknown"
    return (total / denom) * 100.0, None


def spawn_line():
    raw = os.environ.get("BONSAI_SPAWN_LINE")
    if raw:
        try:
            return float(raw)
        except ValueError:
            pass
    return DEFAULT_LINE


def deny(reason):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }))


def status_text():
    pct, note = figure()
    line = spawn_line()
    if pct is None:
        return (
            f"Usage figure: unknown ({note}). Nothing is blocked until it is calibrated. Once known, "
            f"new agents would stop starting at {line:.0f} percent of the five-hour window."
        )
    return f"Usage figure: about {pct:.0f} percent of the five-hour window used. The line is {line:.0f} percent."


def main():
    if "--status" in sys.argv:
        print(status_text())
        return
    try:
        payload = json.load(sys.stdin)
    except ValueError:
        return
    tool_name = payload.get("tool_name") or ""
    if tool_name not in ("Agent", "Workflow"):
        return
    pct, note = figure()
    if pct is None:
        # Unknown must never deny. Say so once, quietly, and let the call through.
        print(f"Spawn line: usage figure is unknown ({note}); allowing.", file=sys.stderr)
        return
    line = spawn_line()
    if pct >= line:
        deny(
            f"This session has used about {pct:.0f} percent of its five-hour usage window, past the "
            f"{line:.0f} percent line. No new agent or workflow can start until the window resets, "
            "the maintainer raises the line, or BONSAI_SPAWN_LINE is changed for the session."
        )


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Fail open: a broken hook must never be the reason a tool call is blocked.
        sys.exit(0)
