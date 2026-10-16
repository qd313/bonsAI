"""
Title: spawn-line
Purpose: PreToolUse hook on Agent and Workflow calls. Once a session has spent too much of its
         five-hour usage window, this stops any new agent or workflow from starting, so a burst of
         lanes cannot blow through the budget before anyone notices.
Used for: phase 0 of the refactor-round-two plan (see docs/audit/maintainer-decisions-locked.md),
          which asked for a hard stop instead of a rule a long session has to keep remembering.
          Weighted by model and token kind in plan 86 (clean-up round three, step 0 item 8).
Solves: nothing found on this machine already reports the same percentage the usage screen shows.
        So this hook adds up the session transcripts itself: every assistant message in the last
        five hours, from every transcript including helpers' own (they sit one level down, under
        <project>/<session>/subagents/), turned into one cost figure. The unit is LIST-PRICE
        DOLLARS: tokens times the published price of that model and that kind of token (input,
        output, cache write, cache read). A cheap model token therefore counts for far less than
        an expensive one, and a cache read for far less than an output token. The figure is divided
        by a budget in the same unit, set once with `--calibrate`.
Does not: read the real usage-screen figure (no local source for it exists); block anything except
          Agent/Workflow calls; ever deny when the budget is uncalibrated; ever raise -- any internal
          error allows the call through, same as every hook in this folder.
Commands: --status              print the current figure and the line
          --calibrate <percent> give the five-hour percentage the usage screen shows right now and
                                get back the budget value to set (see calibrate_text)
Seam: BONSAI_PROJECTS_DIR points the hook at another transcript folder (tests use this).
"""
import datetime
import json
import os
import re
import sys
import time

DEFAULT_LINE = 75.0
UNIT = "list-price dollars"
UNIT_SHORT = "$"

# Prices in US dollars per million tokens: (input, output, cache write 5 min, cache read).
# Source: the claude-api skill's model table, cached 2026-10-06, read 2026-10-16. Cache writes are
# 1.25 times input, except where noted a 1-hour write is billed at 2 times input (handled in code).
# Cache reads: the skill lists them for Opus 5.5 ($0.20), Sonnet 5.5 ($0.20) and Fable 5.1 ($0.25);
# the other rows use 0.1 times input, the usual rate, because the skill does not list them.
# Haiku 5.5 is listed at $0.50 / $2.50 for prompts over 100K tokens; that tier is not modelled.
# Keys are matched as substrings of the transcript's model id, longest key first, so
# "claude-opus-5-5" finds "opus-5-5" before "opus-5". No match, or no model at all, counts as
# FALLBACK_PRICES (Opus 5, the careful side).
FALLBACK_PRICES = (5.00, 25.00, 6.25, 0.50)
PRICES = {
    "fable-5": (10.00, 50.00, 12.50, 0.25),
    "mythos-5": (10.00, 50.00, 12.50, 0.25),
    "opus-5-5": (4.00, 20.00, 5.00, 0.20),
    "opus-5": (5.00, 25.00, 6.25, 0.50),
    "opus-4": (5.00, 25.00, 6.25, 0.50),
    "sonnet-5-5": (2.00, 10.00, 2.50, 0.20),
    "sonnet-5": (2.00, 10.00, 2.50, 0.20),
    "sonnet-4": (3.00, 15.00, 3.75, 0.30),
    "haiku-5-5": (0.10, 0.50, 0.125, 0.01),
    "haiku-4": (1.00, 5.00, 1.25, 0.10),
}
_PRICE_KEYS = sorted(PRICES, key=len, reverse=True)

WINDOW = datetime.timedelta(hours=5)
# Hooks time out at 10 seconds. Stop reading at 5 and report a lower bound instead of guessing.
TIME_BUDGET_SECONDS = 5.0


def prices_for(model):
    if isinstance(model, str):
        low = model.lower()
        for key in _PRICE_KEYS:
            if key in low:
                return PRICES[key]
    return FALLBACK_PRICES


def message_cost(model, usage):
    """Cost in list-price dollars of one usage record for the given model."""
    p_in, p_out, p_write, p_read = prices_for(model)

    def num(name):
        val = usage.get(name)
        return val if isinstance(val, (int, float)) and not isinstance(val, bool) else 0

    write_total = num("cache_creation_input_tokens")
    write_1h = 0
    detail = usage.get("cache_creation")
    if isinstance(detail, dict):
        one_hour = detail.get("ephemeral_1h_input_tokens")
        if isinstance(one_hour, (int, float)) and not isinstance(one_hour, bool):
            write_1h = min(max(one_hour, 0), write_total)
    write_5m = write_total - write_1h
    return (
        num("input_tokens") * p_in
        + num("output_tokens") * p_out
        + write_5m * p_write
        + write_1h * p_in * 2.0
        + num("cache_read_input_tokens") * p_read
    ) / 1_000_000.0


def _parse_timestamp(raw):
    try:
        return datetime.datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def projects_root():
    return os.environ.get("BONSAI_PROJECTS_DIR") or os.path.join(os.path.expanduser("~"), ".claude", "projects")


def _transcripts_in_window(root, cutoff_epoch):
    """Every .jsonl under root, at any depth (helpers' transcripts sit in <session>/subagents/),
    whose last write is inside the window, newest first. A file last written before the window
    cannot hold a record inside it. Returns None if the root is missing."""
    if not os.path.isdir(root):
        return None
    found = []
    for folder, _dirs, names in os.walk(root):
        for name in names:
            if not name.endswith(".jsonl"):
                continue
            path = os.path.join(folder, name)
            try:
                mtime = os.path.getmtime(path)
            except OSError:
                continue
            if mtime >= cutoff_epoch:
                found.append((mtime, path))
    found.sort(reverse=True)
    return [path for _mtime, path in found]


_TS_RE = re.compile(rb'"timestamp":"([^"]+)"')


def five_hour_total():
    """Best-effort cost, in list-price dollars, of every distinct assistant message in the last five
    hours across every transcript this user has. Returns (total, complete) or None when no
    transcript folder exists. complete is False when time ran out, so the figure is a lower bound."""
    now = datetime.datetime.now(datetime.timezone.utc)
    cutoff = now - WINDOW
    cutoff_str = cutoff.strftime("%Y-%m-%dT%H:%M:%S")
    files = _transcripts_in_window(projects_root(), time.time() - WINDOW.total_seconds())
    if files is None:
        return None
    started = time.monotonic()
    complete = True
    # One streamed reply is written as several records with the same message id. Keep the largest
    # cost seen for each id so it counts once and a partial early snapshot cannot undercount.
    best = {}

    for path in files:
        if time.monotonic() - started > TIME_BUDGET_SECONDS:
            complete = False
            break
        try:
            with open(path, "rb") as fh:
                for count, line in enumerate(fh):
                    if count % 512 == 0 and time.monotonic() - started > TIME_BUDGET_SECONDS:
                        complete = False
                        break
                    # Cheap skips before any JSON work: most lines carry no usage block, and most
                    # lines in a big old file sit before the window.
                    if b'"usage"' not in line:
                        continue
                    m = _TS_RE.search(line)
                    if m:
                        raw_ts = m.group(1).decode("ascii", "replace")
                        if raw_ts.endswith("Z") and raw_ts[:19] < cutoff_str:
                            continue
                    try:
                        rec = json.loads(line)
                    except ValueError:
                        continue
                    if not isinstance(rec, dict):
                        continue
                    when = _parse_timestamp(rec.get("timestamp") or "")
                    if when is None or when < cutoff:
                        continue
                    message = rec.get("message")
                    if not isinstance(message, dict):
                        continue
                    usage = message.get("usage")
                    if not isinstance(usage, dict):
                        continue
                    key = message.get("id") or (path, rec.get("uuid"))
                    cost = message_cost(message.get("model"), usage)
                    if cost > best.get(key, -1.0):
                        best[key] = cost
        except OSError:
            continue

    return sum(best.values()), complete


def budget():
    """(value, note). value is None, with a plain-words note, when uncalibrated."""
    raw = os.environ.get("BONSAI_FIVE_HOUR_TOKENS")
    if not raw:
        return None, "the five-hour budget is unknown and needs calibrating once against the usage screen"
    try:
        value = float(raw)
    except ValueError:
        return None, "BONSAI_FIVE_HOUR_TOKENS is not a number, so the budget needs calibrating once against the usage screen"
    if value <= 0:
        return None, "BONSAI_FIVE_HOUR_TOKENS is not a positive number, so the budget needs calibrating once against the usage screen"
    return value, None


def figure():
    """(percent_used, note, complete). percent_used is None, with a plain-words note, when the
    budget hasn't been calibrated or nothing could be read -- callers must treat None as
    "unknown", never as zero. complete is False when the figure is only a lower bound."""
    denom, note = budget()
    if denom is None:
        return None, note, True
    got = five_hour_total()
    if got is None:
        return None, "no session transcripts were found to add up, so the figure is unknown", True
    total, complete = got
    return (total / denom) * 100.0, None, complete


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
    pct, note, complete = figure()
    line = spawn_line()
    if pct is None:
        return (
            f"Usage figure: unknown ({note}). Nothing is blocked until it is calibrated. Once known, "
            f"new agents would stop starting at {line:.0f} percent of the five-hour window. "
            f"The unit is {UNIT}: tokens weighted by model and by kind of token."
        )
    bound = " (a lower bound: reading ran out of time before every transcript was counted)" if not complete else ""
    return (
        f"Usage figure: about {pct:.0f} percent of the five-hour window used{bound}. "
        f"The line is {line:.0f} percent. Unit: {UNIT}."
    )


def calibrate_text(percent_raw):
    try:
        percent = float(percent_raw)
    except (TypeError, ValueError):
        return "Calibrate needs the percentage the usage screen shows, for example: --calibrate 10"
    if percent <= 0 or percent > 100:
        return "Calibrate needs a percentage above 0 and up to 100, taken from the usage screen right now."
    got = five_hour_total()
    if got is None:
        return "No session transcripts were found, so there is nothing to calibrate against."
    total, complete = got
    if total <= 0:
        return "Nothing was spent in the last five hours, so there is nothing to calibrate against."
    value = total / (percent / 100.0)
    shown = f"{value:.4g}"
    lines = [
        f"Last five hours counted: {UNIT_SHORT}{total:.2f} ({UNIT}), which the usage screen calls {percent:g} percent.",
        f"Set BONSAI_FIVE_HOUR_TOKENS to {shown} (the full five-hour budget in {UNIT}).",
        "Where: the env block of .claude/settings.local.json (not tracked), for example "
        f'"env": {{ "BONSAI_FIVE_HOUR_TOKENS": "{shown}" }}, then start a new session.',
    ]
    if not complete:
        lines.append(
            "Warning: reading ran out of time, so the count is a lower bound and the budget above "
            "is too small. Run this again."
        )
    if percent < 5:
        lines.append("Note: a reading under 5 percent is coarse; a reading nearer 30 or more is more accurate.")
    return "\n".join(lines)


def main():
    if "--calibrate" in sys.argv:
        idx = sys.argv.index("--calibrate")
        print(calibrate_text(sys.argv[idx + 1] if idx + 1 < len(sys.argv) else None))
        return
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
    pct, note, complete = figure()
    if pct is None:
        # Unknown must never deny. Say so once, quietly, and let the call through.
        print(f"Spawn line: usage figure is unknown ({note}); allowing.", file=sys.stderr)
        return
    line = spawn_line()
    if pct >= line:
        # Past the line even as a lower bound, so the decision stands whether or not it is complete.
        deny(
            f"This session has used about {pct:.0f} percent of its five-hour usage window"
            f"{'' if complete else ' (at least; the count ran out of time)'}, past the "
            f"{line:.0f} percent line. No new agent or workflow can start until the window resets, "
            "the maintainer raises the line, or BONSAI_SPAWN_LINE is changed for the session."
        )
    elif not complete:
        print(
            f"Spawn line: about {pct:.0f} percent, but only a lower bound (reading ran out of time); allowing.",
            file=sys.stderr,
        )


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Fail open: a broken hook must never be the reason a tool call is blocked.
        sys.exit(0)
