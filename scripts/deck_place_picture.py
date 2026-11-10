#!/usr/bin/env python3
"""Title: Place pictures in the Deck's Steam screenshot folder (and take exactly those back)

Purpose: Copy named pictures from the workshop on this PC into the Deck's Steam screenshot folder for one game
    (the folder the plugin's attach screen reads, see resolve_recent_screenshot_paths() in
    py_modules/backend/media/screenshot_media.py), so a picture check no longer depends on a Steam + R1 press
    that saved nothing. Each picture is copied under a name that starts with "bonsai-placed-", and a list of
    exactly what was placed is written beside the pictures on this PC. With --remove it deletes exactly the
    files on that list and nothing else.
Used for: the picture rows of the knowledge-base Deck checks, run from this PC by the driver:
        python scripts/deck_place_picture.py --host deck@<ip> --app <app id> <picture> [<picture> ...]
        python scripts/deck_place_picture.py --host deck@<ip> --app <app id> --remove
    Pictures are named relative to the workshop's screenshots folder (or to --from). Add --user-id <number>
    when the Deck holds more than one Steam account (the script says so and stops, rather than guess).
Solves: Plan 103 (lane T4): a picture check depended on a Steam + R1 press that saved nothing in two tries.
Does not: Run any shell text built from an argument (every argument is checked against a short list of safe
    characters first, and handed over as its own word). Write anywhere on the Deck but one "screenshots"
    folder: any other target is refused, and --target only lets the driver name a different Steam user folder.
    Delete a file this script did not place. Read or print any settings value. Keep or copy a picture into the
    plugin's own repo. Commands it sends over SSH, and no others:
        ssh <host> ls -1 .local/share/Steam/userdata            (only when --user-id and --target are absent)
        ssh <host> mkdir -p -- <the screenshots folder>
        scp <picture> <host>:<the screenshots folder>/bonsai-placed-<name>      (one per picture)
        ssh <host> rm -f -- <each placed file>                  (only with --remove)
"""
import argparse
import json
import os
import re
import shlex
import subprocess
import sys

IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp")  # the four the attach screen reads
PLACED_PREFIX = "bonsai-placed-"
USERDATA = ".local/share/Steam/userdata"  # on the Deck, relative to the home folder ssh starts in
# \Z, not $: "$" also matches just before a trailing newline, which a shell would run as a second command.
SAFE_WORD = re.compile(r"\A[A-Za-z0-9._-]+\Z")
SAFE_PATH = re.compile(r"\A[A-Za-z0-9._/-]+\Z")
SAFE_HOST = re.compile(r"\A[A-Za-z0-9_][A-Za-z0-9._-]*@[A-Za-z0-9][A-Za-z0-9.-]*\Z")
DIGITS = re.compile(r"\A[0-9]+\Z")


class Refusal(Exception):
    """A plain sentence saying why nothing was sent."""


def check_host(host):
    if not isinstance(host, str) or not SAFE_HOST.match(host):
        raise Refusal(f"the host must look like deck@192.168.0.5, not {host!r}")
    return host


def check_digits(value, what):
    if not isinstance(value, str) or not DIGITS.match(value):
        raise Refusal(f"the {what} must be a number, not {value!r}")
    return value


def check_target(target):
    """The Deck folder to write into, or a Refusal: it must be a plain path ending in a screenshots folder."""
    if not isinstance(target, str) or not SAFE_PATH.match(target):
        raise Refusal(f"refusing {target!r}: a folder name may only use letters, digits and . _ - /")
    parts = target.split("/")
    if any(p in ("", ".", "..") for p in parts) or len(parts) < 3:
        raise Refusal(f"refusing {target!r}: it must be a clean path with no '..' and no empty parts")
    if parts[-1] != "screenshots":
        raise Refusal(f"refusing {target!r}: it is not inside a 'screenshots' folder")
    return target


def build_target(user_id, app_id):
    """The folder the attach screen reads for one game, from a Steam user number and the game's number."""
    return check_target(f"{USERDATA}/{check_digits(user_id, 'user id')}/760/remote/{check_digits(app_id, 'app id')}/screenshots")


def pick_user_id(listing):
    """The one numeric Steam user folder in an `ls` listing, or a Refusal when there are none or several."""
    ids = sorted({line.strip() for line in listing.splitlines() if DIGITS.match(line.strip()) and line.strip() != "0"})
    if len(ids) != 1:
        raise Refusal(f"found {len(ids)} Steam user folders on the Deck ({', '.join(ids) or 'none'}): rerun with --user-id <number>")
    return ids[0]


def plan_pictures(from_dir, names):
    """[(name relative to from_dir, name on the Deck)] for each picture, or a Refusal naming the bad one."""
    if not names:
        raise Refusal("name at least one picture")
    plan, seen = [], set()
    for name in names:
        parts = name.split("/")
        if (not SAFE_PATH.match(name) or any(p in ("", ".", "..") for p in parts)
                or not name.lower().endswith(IMAGE_EXTENSIONS)):
            raise Refusal(f"refusing {name!r}: a picture is a plain relative name ending in {', '.join(IMAGE_EXTENSIONS)}")
        if not os.path.isfile(os.path.join(from_dir, *parts)):
            raise Refusal(f"{name!r} is not a file in {from_dir}")
        deck_name = PLACED_PREFIX + parts[-1]
        if deck_name in seen:
            raise Refusal(f"two pictures would both be placed as {deck_name!r}")
        seen.add(deck_name)
        plan.append((name, deck_name))
    return plan


def list_path(from_dir, app_id):
    return os.path.join(from_dir, f"deck-placed-{check_digits(app_id, 'app id')}.json")


def ssh_command(host, remote_command):
    return ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", "--", host, remote_command]


def default_run(argv, cwd=None):
    """Run one command with no shell; the output text, or a Refusal carrying the first words of its error."""
    try:
        done = subprocess.run(argv, cwd=cwd, capture_output=True, text=True, timeout=120)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise Refusal(f"{argv[0]} did not run: {exc}") from exc
    if done.returncode != 0:
        raise Refusal(f"{argv[0]} failed ({done.returncode}): {done.stderr.strip()[:200]}")
    return done.stdout


def place(host, app_id, from_dir, names, user_id=None, target=None, run=default_run):
    """Copy the pictures, write the list of what was placed, and return (that list's path, the files placed)."""
    check_host(host)
    plan = plan_pictures(from_dir, names)
    listing = list_path(from_dir, app_id)
    if os.path.exists(listing):
        raise Refusal(f"{listing} already exists: run with --remove first, so nothing placed earlier is left behind")
    if target is None:
        user_id = user_id or pick_user_id(run(ssh_command(host, f"ls -1 {USERDATA}")))
        target = build_target(user_id, app_id)
    check_target(target)
    placed, failure = [], None
    try:
        run(ssh_command(host, "mkdir -p -- " + shlex.quote(target)))
        for name, deck_name in plan:
            run(["scp", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", "--", name, f"{host}:" + shlex.quote(f"{target}/{deck_name}")], cwd=from_dir)
            placed.append({"from": name, "as": deck_name})
    except Refusal as exc:
        failure = exc
    if placed:
        with open(listing, "w", encoding="utf-8", newline="\n") as fh:
            json.dump({"app": app_id, "host": host, "target": target, "files": placed}, fh, indent=2, sort_keys=True)
            fh.write("\n")
    if failure:
        raise Refusal(f"{failure}; {len(placed)} picture(s) placed before it, listed in {listing}")
    return listing, placed


def remove(host, app_id, from_dir, run=default_run):
    """Delete exactly the files the list names (checked again here) and then the list; return their Deck paths."""
    check_host(host)
    listing = list_path(from_dir, app_id)
    if not os.path.isfile(listing):
        raise Refusal(f"{listing} does not exist: nothing was placed for this game from here")
    with open(listing, encoding="utf-8") as fh:
        data = json.load(fh)
    if data.get("host") != host or data.get("app") != app_id:
        raise Refusal(f"{listing} was made for host {data.get('host')!r} and app {data.get('app')!r}: they must match")
    target = check_target(data.get("target"))
    paths = []
    for entry in data.get("files") or []:
        deck_name = entry.get("as") if isinstance(entry, dict) else None
        if (not isinstance(deck_name, str) or not SAFE_WORD.match(deck_name) or not deck_name.startswith(PLACED_PREFIX)
                or not deck_name.lower().endswith(IMAGE_EXTENSIONS)):
            raise Refusal(f"refusing to delete {deck_name!r}: it is not a picture this script placed")
        paths.append(f"{target}/{deck_name}")
    if paths:
        run(ssh_command(host, "rm -f -- " + " ".join(shlex.quote(p) for p in paths)))
    os.remove(listing)
    return paths


def default_from_dir():
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
    import workshop  # noqa: E402 -- needs the path line above
    return str(workshop.workshop_root() / "screenshots")


def main(argv=None):
    ap = argparse.ArgumentParser(description="Place pictures in the Deck's Steam screenshot folder, or take them back.")
    ap.add_argument("--host", required=True, help="user@address of the Deck, e.g. deck@192.168.0.5")
    ap.add_argument("--app", required=True, help="the game's Steam app id (a number)")
    ap.add_argument("--from", dest="from_dir", help="folder the pictures are named in (default: the workshop's screenshots folder)")
    ap.add_argument("--user-id", help="the Steam user number on the Deck, when there is more than one")
    ap.add_argument("--target", help="a screenshots folder on the Deck, relative to its home folder, instead of the usual one")
    ap.add_argument("--remove", action="store_true", help="delete exactly the pictures placed earlier for this game")
    ap.add_argument("pictures", nargs="*", help="picture names, relative to the pictures folder")
    args = ap.parse_args(argv)
    try:
        from_dir = args.from_dir or default_from_dir()
        if args.remove:
            if args.pictures:
                raise Refusal("--remove takes no picture names: it removes what the list says")
            paths = remove(args.host, args.app, from_dir)
            print(f"removed {len(paths)} file(s) from the Deck:")
        else:
            listing, placed = place(args.host, args.app, from_dir, args.pictures, args.user_id, args.target)
            paths = [p["as"] for p in placed]
            print(f"placed {len(paths)} picture(s); the list is {listing}:")
        for p in paths:
            print("  " + p)
    except Refusal as exc:
        print(f"deck_place_picture: {exc}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
