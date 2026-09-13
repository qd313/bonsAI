#!/usr/bin/env python3
"""Title: deck_queue

Purpose: a shared, plain to-do list for Steam Deck checks, so that when several agent sessions are
         each working in their own copy of the repo, only one of them is ever driving the real Deck
         at a time.
Used for: plan 51 (refactor round two), phase 0. Memory note "Deck: one driver at a time" -- other
          sessions may be pressing buttons on the same Deck, and the bridge registry only shows
          reads, so this gives every session a place to queue a check and see whose turn it is.
Solves: two sessions reaching for the Deck at once with no way to see that the other got there first.
Does not: touch the Deck itself, run any of the deck_* probe scripts, or know what a check actually
          involves -- it only tracks rows: who asked for what, whether it is waiting, running or
          done, and the free-text result once it is.

The queue file lives at .decky/deck-queue.json under the MAIN checkout, not under whichever worktree
this script happens to run from -- every lane needs to see the same queue, or it cannot do its job.

Commands:
  deck_queue.py add "<plain-words name of the check>" [--by <name>]
  deck_queue.py list
  deck_queue.py next                       hands out the oldest waiting row, marks it running
  deck_queue.py done <id> [--result "<free text>"]
"""
import argparse
import datetime
import getpass
import json
import subprocess
import sys
from pathlib import Path

QUEUE_RELATIVE_PATH = Path(".decky") / "deck-queue.json"


def repo_root():
    """The main checkout's root, shared by every worktree, so the queue is one queue for everyone."""
    result = subprocess.run(
        ["git", "rev-parse", "--path-format=absolute", "--git-common-dir"],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    if result.returncode != 0:
        # Not inside a git checkout at all -- fall back to this script's own repo-relative guess.
        return Path(__file__).resolve().parent.parent
    return Path(result.stdout.strip()).parent


def queue_path():
    return repo_root() / QUEUE_RELATIVE_PATH


def load(path):
    if not path.exists():
        return {"rows": [], "next_id": 1}
    try:
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, ValueError):
        return {"rows": [], "next_id": 1}
    data.setdefault("rows", [])
    data.setdefault("next_id", (max((r["id"] for r in data["rows"]), default=0) + 1))
    return data


def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2)
        fh.write("\n")
    tmp.replace(path)


def whoami():
    try:
        result = subprocess.run(
            ["git", "config", "user.name"], capture_output=True, text=True, encoding="utf-8"
        )
        name = result.stdout.strip()
        if name:
            return name
    except OSError:
        pass
    try:
        return getpass.getuser()
    except Exception:
        return "unknown"


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")


def cmd_add(args):
    path = queue_path()
    data = load(path)
    row = {
        "id": data["next_id"],
        "name": args.name,
        "added_by": args.by or whoami(),
        "added_at": now_iso(),
        "status": "waiting",
        "result": "",
    }
    data["rows"].append(row)
    data["next_id"] = row["id"] + 1
    save(path, data)
    print(f"Added #{row['id']}: {row['name']} (by {row['added_by']})")
    return 0


def cmd_list(args):
    path = queue_path()
    data = load(path)
    if not data["rows"]:
        print("The queue is empty.")
        return 0
    for row in data["rows"]:
        result_note = f"  result: {row['result']}" if row.get("result") else ""
        print(
            f"#{row['id']:<4} [{row['status']:<7}] {row['name']}  "
            f"(added by {row['added_by']} at {row['added_at']}){result_note}"
        )
    return 0


def cmd_next(args):
    path = queue_path()
    data = load(path)
    running = [r for r in data["rows"] if r["status"] == "running"]
    if running:
        row = running[0]
        print(
            f"Refusing: #{row['id']} ({row['name']}, added by {row['added_by']}) is already running. "
            "Finish it with `done` before asking for the next one."
        )
        return 1
    waiting = [r for r in data["rows"] if r["status"] == "waiting"]
    if not waiting:
        print("Nothing is waiting.")
        return 0
    row = waiting[0]
    row["status"] = "running"
    row["started_at"] = now_iso()
    save(path, data)
    print(f"#{row['id']}: {row['name']} (added by {row['added_by']}) -- now running.")
    return 0


def cmd_done(args):
    path = queue_path()
    data = load(path)
    for row in data["rows"]:
        if row["id"] == args.id:
            if row["status"] != "running":
                print(f"#{row['id']} is not running (status: {row['status']}); marking done anyway.")
            row["status"] = "done"
            row["result"] = args.result or row.get("result", "")
            row["finished_at"] = now_iso()
            save(path, data)
            print(f"#{row['id']} closed.")
            return 0
    print(f"No row #{args.id} in the queue.", file=sys.stderr)
    return 1


def main():
    parser = argparse.ArgumentParser(description="A shared queue for Steam Deck checks.")
    sub = parser.add_subparsers(dest="command", required=True)

    p_add = sub.add_parser("add", help="add a check to the queue")
    p_add.add_argument("name", help="plain-words name of the check")
    p_add.add_argument("--by", default=None, help="who is adding it (default: git user.name)")
    p_add.set_defaults(func=cmd_add)

    p_list = sub.add_parser("list", help="show the queue in order")
    p_list.set_defaults(func=cmd_list)

    p_next = sub.add_parser("next", help="hand out the oldest waiting row")
    p_next.set_defaults(func=cmd_next)

    p_done = sub.add_parser("done", help="close a row")
    p_done.add_argument("id", type=int)
    p_done.add_argument("--result", default="", help="free-text result")
    p_done.set_defaults(func=cmd_done)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
