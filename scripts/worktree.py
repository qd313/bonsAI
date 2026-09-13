#!/usr/bin/env python3
"""Title: worktree

Purpose: make and prune copies of the bonsAI repo (git worktrees) used as separate lanes for parallel
         agent sessions, and show the ones that already exist wherever they live on this machine.
Used for: plan 51 (refactor round two), phase 0 -- lanes need their own copy of the repo so they can
          edit and run gates without stepping on each other's working tree.
Solves: this machine already has git worktrees scattered across four different folders
        (.claude/worktrees, .cursor/worktrees, Documents/BonsAI-lanes, Documents/bonsai-worktrees),
        several sitting at a detached head on an old commit with no branch name to check against.
        `git worktree list` is the one place that knows about all of them regardless of where they
        live, so this script reads from that instead of guessing at folder locations.
Does not: touch the Steam Deck; run `git push`; delete anything without the maintainer's typed
          confirmation (or --yes); know about a worktree that was never registered with
          `git worktree add` (a bare copied folder, for instance) -- git itself does not know about
          those either.

Commands:
  worktree.py create <name> [--base experimental]   make a new worktree + branch refactor/<name>
  worktree.py list [--against experimental]          show every worktree, wherever it lives
  worktree.py prune [--dry-run] [--yes] [--against experimental]
                                                      remove worktrees that are merged, clean, and
                                                      untouched for 24 hours
"""
import argparse
import datetime
import json
import os
import platform
import shutil
import stat
import subprocess
import sys
from pathlib import Path

DEFAULT_BASE = "experimental"
UNTOUCHED_HOURS = 24
BASE_FILE = ".base"


class GitError(RuntimeError):
    pass


def run(args, cwd=None, check=True):
    result = subprocess.run(
        args, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace"
    )
    if check and result.returncode != 0:
        raise GitError(f"{' '.join(args)} failed: {result.stderr.strip() or result.stdout.strip()}")
    return result


def git(*args, cwd=None, check=True):
    return run(["git", *args], cwd=cwd, check=check)


def repo_root():
    """The main checkout's working-tree root, found from wherever this script happens to run --
    a plain checkout or any linked worktree all share the same common git dir."""
    common = git("rev-parse", "--path-format=absolute", "--git-common-dir").stdout.strip()
    return Path(common).parent


def branch_tip(root, ref):
    return git("rev-parse", ref, cwd=root).stdout.strip()


def is_ancestor(root, commit, ref):
    result = git("merge-base", "--is-ancestor", commit, ref, cwd=root, check=False)
    return result.returncode == 0


def commits_behind(root, since_commit, ref):
    result = git("rev-list", "--count", f"{since_commit}..{ref}", cwd=root, check=False)
    if result.returncode != 0:
        return None
    text = result.stdout.strip()
    return int(text) if text.isdigit() else None


# ---------------------------------------------------------------------------
# create
# ---------------------------------------------------------------------------

def cmd_create(args):
    root = repo_root()
    if not git("show-ref", "--verify", "--quiet", f"refs/heads/{args.base}", cwd=root, check=False).returncode == 0:
        print(f"Base branch '{args.base}' was not found locally.", file=sys.stderr)
        return 1

    base_sha = branch_tip(root, args.base)
    branch = f"refactor/{args.name}"
    dest = root / ".claude" / "worktrees" / args.name

    if dest.exists():
        print(f"{dest} already exists.", file=sys.stderr)
        return 1
    if git("show-ref", "--verify", "--quiet", f"refs/heads/{branch}", cwd=root, check=False).returncode == 0:
        print(f"Branch '{branch}' already exists.", file=sys.stderr)
        return 1

    dest.parent.mkdir(parents=True, exist_ok=True)
    print(f"Creating {dest} on new branch {branch}, from {args.base} at {base_sha[:9]}...")
    git("worktree", "add", "-b", branch, str(dest), base_sha, cwd=root)

    (dest / BASE_FILE).write_text(base_sha + "\n", encoding="utf-8")

    installed = _install_dependencies(dest, root)
    print(installed)
    print(f"Done. {dest} is ready on {branch}.")
    return 0


def _install_dependencies(dest, root):
    # Never run an install inside a copy that lives under the main checkout. This repo
    # declares itself a pnpm workspace rooted at the repo, so pnpm run from a copy at
    # .claude/worktrees/<name> walks up, finds that root, and manages the MAIN checkout's
    # node_modules as well as the copy's. Measured 2026-09-13: three copies made this way
    # left the main checkout's node_modules/.bin completely empty, so vitest and rollup
    # vanished and the whole test suite failed with "not recognized as a command" -- and
    # pnpm then reported "already up to date", so it could not repair itself either. The
    # link costs nothing and cannot do that.
    try:
        inside_repo = Path(dest).resolve().is_relative_to(Path(root).resolve())
    except AttributeError:  # Python < 3.9
        inside_repo = str(Path(dest).resolve()).startswith(str(Path(root).resolve()))
    if inside_repo:
        return _link_node_modules(
            dest, root,
            why="this copy sits inside the main checkout, so an install here would damage it",
        )

    pnpm = shutil.which("pnpm") or shutil.which("pnpm.cmd")
    if pnpm:
        result = subprocess.run(
            [pnpm, "install", "--offline", "--frozen-lockfile"],
            cwd=str(dest), capture_output=True, text=True,
        )
        if result.returncode == 0:
            return "Dependencies: `pnpm install --offline --frozen-lockfile` succeeded."
        detail = (result.stderr or result.stdout).strip().splitlines()[-1:] or [""]
        print(f"pnpm install --offline failed ({detail[0]}); falling back to a node_modules junction.")
    else:
        print("pnpm was not found on PATH; falling back to a node_modules junction.")
    return _link_node_modules(dest, root)


def _is_link(path):
    """True for anything that points somewhere else, junctions included.

    `os.path.islink` is not enough on Windows. Measured 2026-09-13 on a real junction: it
    reports False, and so does `os.path.ismount`; only the reparse-point flag on the entry
    itself says yes. Getting this wrong is what let a recursive delete walk through a
    junction and empty the main checkout's node_modules.
    """
    if os.path.islink(path):
        return True
    try:
        attrs = getattr(os.lstat(path), "st_file_attributes", 0)
    except OSError:
        return False
    return bool(attrs & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0))


def _strip_links(path):
    """Remove every link inside a folder, leaving real files alone.

    Must run BEFORE `git worktree remove`. Measured 2026-09-13: git deletes the worktree
    folder itself, walks straight through the node_modules junction while doing it, and
    empties the MAIN checkout's node_modules -- then fails with "Directory not empty" and
    leaves the copy half-removed. By the time any cleanup of ours runs, the damage is done.
    """
    removed = 0
    for dirpath, dirnames, filenames in os.walk(path, topdown=True):
        for name in list(dirnames):
            full = os.path.join(dirpath, name)
            if _is_link(full):
                try:
                    os.rmdir(full)
                    removed += 1
                except OSError:
                    try:
                        os.unlink(full)
                        removed += 1
                    except OSError:
                        pass
                dirnames.remove(name)
        for name in filenames:
            full = os.path.join(dirpath, name)
            if _is_link(full):
                try:
                    os.unlink(full)
                    removed += 1
                except OSError:
                    pass
    return removed


def _remove_tree_safely(path):
    """Delete a folder without ever following a link out of it.

    This matters more than it sounds. A copy of the repo usually has its node_modules as a
    Windows junction pointing at the main checkout's. Windows treats a junction as a
    directory, so anything that deletes recursively -- shutil.rmtree, `rm -r`, Explorer --
    walks straight through it and empties the MAIN checkout instead of removing the link.
    Measured 2026-09-13: it wiped the main node_modules twice, and the second time the test
    suite failed with "vitest is not recognized" while node_modules still looked present.
    So: strip every link first, each one removed as a link, then delete what is genuinely
    left.
    """
    for dirpath, dirnames, filenames in os.walk(path, topdown=True):
        for name in list(dirnames):
            full = os.path.join(dirpath, name)
            if _is_link(full):
                try:
                    os.rmdir(full)      # a junction or directory symlink: removes the link only
                except OSError:
                    try:
                        os.unlink(full)
                    except OSError:
                        pass
                dirnames.remove(name)
        for name in filenames:
            full = os.path.join(dirpath, name)
            if _is_link(full):
                try:
                    os.unlink(full)
                except OSError:
                    pass
    shutil.rmtree(path, ignore_errors=True)


def _link_node_modules(dest, root, why="pnpm install --offline failed"):
    src = root / "node_modules"
    link = dest / "node_modules"
    if not src.exists():
        return (
            "Dependencies: neither pnpm install nor a node_modules junction worked -- the main "
            f"checkout has no node_modules at {src}."
        )
    if link.exists():
        if link.is_dir() and not link.is_symlink():
            _remove_tree_safely(link)
        else:
            try:
                link.unlink()
            except OSError:
                pass
    try:
        if platform.system() == "Windows":
            result = subprocess.run(
                ["cmd", "/c", "mklink", "/J", str(link), str(src)],
                capture_output=True, text=True,
            )
            if result.returncode != 0:
                raise OSError(result.stderr.strip() or result.stdout.strip())
        else:
            os.symlink(src, link, target_is_directory=True)
    except OSError as exc:
        return f"Dependencies: {why}, and the node_modules link could not be made either ({exc})."
    kind = "junction" if platform.system() == "Windows" else "symlink"
    return f"Dependencies: {why}; made a node_modules {kind} to the main checkout instead."


# ---------------------------------------------------------------------------
# list / shared worktree inspection
# ---------------------------------------------------------------------------

def porcelain_worktrees(root):
    """Every worktree git knows about for this repo, wherever it lives on disk."""
    text = git("worktree", "list", "--porcelain", cwd=root).stdout
    entries = []
    current = {}
    for line in text.splitlines():
        if not line.strip():
            if current:
                entries.append(current)
                current = {}
            continue
        if " " in line:
            key, _, value = line.partition(" ")
        else:
            key, value = line, ""
        if key == "worktree":
            current = {"path": value}
        elif key == "HEAD":
            current["head"] = value
        elif key == "branch":
            current["branch"] = value.replace("refs/heads/", "", 1)
        elif key == "detached":
            current["branch"] = None
        elif key in ("bare", "locked", "prunable"):
            current[key] = value or True
    if current:
        entries.append(current)
    return entries


def read_base(path):
    base_file = Path(path) / BASE_FILE
    try:
        return base_file.read_text(encoding="utf-8").strip() or None
    except OSError:
        return None


def is_clean(path):
    result = run(["git", "status", "--porcelain"], cwd=path, check=False)
    if result.returncode != 0:
        return None, []
    dirty_files = [line[3:] for line in result.stdout.splitlines() if line.strip()]
    # `.base` is this tool's own note of which commit the copy started from. It is untracked
    # by design, so counting it as a change meant every copy this tool made looked dirty for
    # ever and could never be pruned -- the tool blocking itself.
    dirty_files = [f for f in dirty_files if f.strip().strip('"') != BASE_FILE]
    return (len(dirty_files) == 0), dirty_files


def last_touched(root, path, head_sha, dirty_files):
    """Newest of: the checked-out commit's date, or the mtime of any file git already told us is
    changed. Bounded by the size of the change, not the size of the tree."""
    when = None
    result = run(["git", "log", "-1", "--format=%cI", head_sha], cwd=root, check=False)
    if result.returncode == 0 and result.stdout.strip():
        try:
            when = datetime.datetime.fromisoformat(result.stdout.strip())
        except ValueError:
            when = None
    for rel in dirty_files:
        candidate = Path(path) / rel
        try:
            mtime = datetime.datetime.fromtimestamp(candidate.stat().st_mtime, tz=datetime.timezone.utc)
        except OSError:
            continue
        if when is None or mtime > when:
            when = mtime
    return when


def describe(root, against_tip, entry):
    path = entry["path"]
    branch = entry.get("branch")
    head = entry.get("head", "")
    base = read_base(path)
    exists = Path(path).exists()

    row = {
        "path": path,
        "branch": branch or "(detached)",
        "head": head[:9] if head else "",
        "base": base[:9] if base else "unknown",
        "behind": None,
        "clean": None,
        "last_touched": "unknown",
        "merged": None,
    }

    if not exists:
        row["clean"] = "missing"
        return row

    since = base or head
    if since:
        row["behind"] = commits_behind(root, since, against_tip)

    clean, dirty_files = is_clean(path)
    row["clean"] = clean
    when = last_touched(root, path, head, dirty_files or [])
    if when is not None:
        delta = datetime.datetime.now(datetime.timezone.utc) - when
        row["last_touched"] = _format_delta(delta)
        row["_last_touched_dt"] = when

    if head:
        row["merged"] = is_ancestor(root, head, against_tip)

    return row


def _format_delta(delta):
    hours = delta.total_seconds() / 3600
    if hours < 1:
        return f"{int(delta.total_seconds() / 60)}m ago"
    if hours < 48:
        return f"{hours:.1f}h ago"
    return f"{hours / 24:.1f}d ago"


def cmd_list(args):
    root = repo_root()
    against = branch_tip(root, args.against)
    rows = [describe(root, args.against, e) for e in porcelain_worktrees(root)]

    if args.json:
        print(json.dumps(rows, indent=2, default=str))
        return 0

    print(f"Worktrees for this repo (against {args.against} at {against[:9]}):\n")
    for row in rows:
        clean = {"missing": "missing"}.get(row["clean"], "clean" if row["clean"] else "dirty")
        behind = "?" if row["behind"] is None else str(row["behind"])
        print(
            f"  {row['path']}\n"
            f"      branch={row['branch']}  base={row['base']}  behind={behind}  "
            f"clean={clean}  last touched={row['last_touched']}"
        )
    return 0


# ---------------------------------------------------------------------------
# prune
# ---------------------------------------------------------------------------

def cmd_prune(args):
    root = repo_root()
    against = branch_tip(root, args.against)
    rows = [describe(root, args.against, e) for e in porcelain_worktrees(root)]
    # The 24-hour default protects a copy someone is still using. A landing session clearing
    # away the lanes it just merged itself does not need that protection and would otherwise
    # have to wait a day to tidy up, so it can lower the bar deliberately.
    min_age = UNTOUCHED_HOURS if args.min_age_hours is None else args.min_age_hours

    candidates = []
    for row in rows:
        if str(Path(row["path"]).resolve()) == str(root.resolve()):
            continue  # never the main checkout
        if row["clean"] != True:  # noqa: E712 - True/False/None/"missing" all matter here
            continue
        if not row.get("merged"):
            continue
        when = row.get("_last_touched_dt")
        if when is None:
            continue
        age_hours = (datetime.datetime.now(datetime.timezone.utc) - when).total_seconds() / 3600
        if age_hours < min_age:
            continue
        candidates.append(row)

    if not candidates:
        print(f"Nothing to prune: no worktree is merged, clean, and untouched for {min_age:g} hours.")
        return 0

    print(f"Would remove {len(candidates)} worktree(s) (merged into {args.against}, clean, untouched {min_age:g}h+):")
    for row in candidates:
        print(f"  {row['path']}  branch={row['branch']}  base={row['base']}  last touched={row['last_touched']}")

    if args.dry_run:
        print("\n--dry-run: nothing removed.")
        return 0

    if not args.yes:
        answer = input("\nType 'yes' to remove these worktrees and their merged branches: ").strip()
        if answer.lower() != "yes":
            print("Not confirmed; nothing removed.")
            return 0

    for row in candidates:
        path = row["path"]
        branch = row["branch"]
        print(f"Removing {path} ...")
        # Clear our own note first. Git refuses to remove a worktree holding untracked
        # files, and `.base` -- which this tool wrote itself when it made the copy -- is
        # exactly such a file, so without this the tool can never remove its own copies.
        # Deliberately not `--force`: everything else untracked is somebody's work, and git
        # refusing is the right answer then.
        try:
            (Path(path) / BASE_FILE).unlink()
        except OSError:
            pass
        _strip_links(path)
        result = run(["git", "worktree", "remove", path], cwd=root, check=False)
        if result.returncode != 0:
            # "Directory not empty" means git dropped its registration but could not delete
            # the folder, because an installed node_modules sits inside it. Git leaves the
            # copy half-removed at that point, so finish the job rather than leaving a
            # folder nothing knows about. Only when git has already let go of it: if the
            # registration survived, the refusal was about real work and must stand.
            still_registered = any(
                str(Path(e["path"]).resolve()) == str(Path(path).resolve())
                for e in porcelain_worktrees(root)
            )
            if still_registered:
                print(f"  failed: {result.stderr.strip()}")
                continue
            _remove_tree_safely(path)
            run(["git", "worktree", "prune"], cwd=root, check=False)
            if Path(path).exists():
                print(f"  git let go of it but the folder could not be deleted: {path}")
                continue
            print("  (removed the leftover folder git could not delete)")
        if branch and branch != "(detached)":
            branch_result = run(["git", "branch", "-d", branch], cwd=root, check=False)
            if branch_result.returncode != 0:
                print(f"  worktree removed, but branch {branch} could not be deleted: {branch_result.stderr.strip()}")
    return 0


# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Create, list and prune bonsAI repo worktrees.")
    sub = parser.add_subparsers(dest="command", required=True)

    p_create = sub.add_parser("create", help="make a new worktree + branch")
    p_create.add_argument("name")
    p_create.add_argument("--base", default=DEFAULT_BASE)
    p_create.set_defaults(func=cmd_create)

    p_list = sub.add_parser("list", help="show every worktree")
    p_list.add_argument("--against", default=DEFAULT_BASE)
    p_list.add_argument("--json", action="store_true")
    p_list.set_defaults(func=cmd_list)

    p_prune = sub.add_parser("prune", help="remove merged, clean, stale worktrees")
    p_prune.add_argument("--against", default=DEFAULT_BASE)
    p_prune.add_argument("--dry-run", action="store_true")
    p_prune.add_argument("--yes", action="store_true")
    p_prune.add_argument(
        "--min-age-hours",
        type=float,
        default=None,
        help=f"how long a copy must have sat untouched before it can go (default {UNTOUCHED_HOURS})",
    )
    p_prune.set_defaults(func=cmd_prune)

    args = parser.parse_args()
    try:
        return args.func(args)
    except GitError as exc:
        print(f"git error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
