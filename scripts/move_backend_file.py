#!/usr/bin/env python3
"""Title: Back-end file mover

Purpose: Move a Python file inside py_modules/backend/ to another folder (or give it
another name) and fix everything that pointed at the old place, in one go and by
machine, so the move commit holds nothing but the move. It runs `git mv`, creates
the `__init__.py` a new folder needs, then rewrites (a) every import that reaches
the file -- `from backend.x.y import a`, `import backend.x.y as z`, a name inside
`from backend.x import y, other` (that line is split so the names that stay keep
their line), parenthesised multi-line forms, and relative imports -- (b) every
dotted string that names the module, such as the target of `patch("...")` or
`sys.modules["..."]`, and (c) every written mention of the old place in explanations:
the full repo path, the shorter `backend/x/y.py` and `x/y.py` forms, the dotted name,
and Markdown links, which are redone relative to the page that holds them.
Used for: Step 4 of plan 86, which splits py_modules/backend/services/ into a few
folders, one area per commit. Run `python scripts/move_backend_file.py --dry-run ...`
first and read the planned edits; then run it again without `--dry-run`.
Solves: Moving a file by hand means finding every place that names it, and a place
missed only fails later (an import error on the Deck, or a patch that quietly stops
patching). Moving code and changing code must never share a commit; this tool changes
paths and nothing else, so a reviewer, or a checker, can tell a move commit is only a move.
Does not: Edit anything written by a generator (packages/bonsai-mcp/knowledge/architecture/*.json,
docs/code-map.md, src/types/rpcMethods.ts), recorded history (docs/archive, docs/test-evidence,
docs/planning, docs/audit, CHANGELOG.md, the checks/ recordings) or any file it has no reason to
touch. It does not follow a module name that code builds at run time (a name glued together
from pieces), nor a path assembled from parts; it prints a "check by hand" list for those,
and for scripts that list or walk the old folder. It never commits and never pushes.

How it works:
  1. `parse_moves` turns the command line (and `--map FILE`, one `from<TAB>to` per line)
     into `Move` records; `validate` refuses, before touching anything, when a source is not
     tracked, a target exists, two moves collide, or a new folder would hide a module.
  2. `plan` reads every tracked text file once and collects `Edit` spans per file:
     `import_edits` (found with the `ast` module so multi-line forms are exact), `link_edits`,
     `path_edits`, `dotted_edits` and, only for a rename, `bare_edits`. A span from an import
     or a link wins over a plain text match on the same characters.
  3. Every edited `.py` file is parsed again; a result that does not parse aborts the run.
  4. `--dry-run` prints each changed file as a unified diff and stops. Otherwise `apply`
     runs `git mv`, writes the new `__init__.py` files (staged by name), and writes the edits.
  5. `scan_warnings` prints what the tool cannot fix for you.

Gotchas: Edits are written back as raw bytes, so a file's line endings survive. Edited files are
left unstaged (pass `--stage` to stage exactly the ones changed); `git mv` stages the renames
itself. An import line that holds a comment between its names, or shares a line with another
statement, is refused rather than guessed at.
"""

from __future__ import annotations

import argparse
import ast
import difflib
import io
import os
import posixpath
import re
import subprocess
import sys
import tokenize
import urllib.parse
from dataclasses import dataclass, field

REPO_ROOT_DEFAULT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BACKEND_DIR = "py_modules/backend"

# Recorded history and generated output stay exactly as written.
SKIP_PREFIXES = (
    "docs/archive/",
    "docs/test-evidence/",
    "docs/planning/",
    "docs/audit/",
    "checks/",
    "packages/bonsai-mcp/knowledge/architecture/",
    "node_modules/",
)
SKIP_FILES = {
    "CHANGELOG.md",
    "docs/code-map.md",
    "src/types/rpcMethods.ts",
    # This tool and its test hold made-up example names, not references.
    "scripts/move_backend_file.py",
    "tests/test_move_backend_file.py",
}
# The generated architecture folder also holds two hand-kept pages; only its .json files are
# generated, so the pages are not skipped (see _is_skipped).
GENERATED_ARCH_PREFIX = "packages/bonsai-mcp/knowledge/architecture/"
MAX_TEXT_BYTES = 3_000_000
LINE_LIMIT = 100


class MoveError(Exception):
    """A refusal: the message says what to change; nothing has been touched."""


@dataclass(frozen=True)
class Move:
    src: str  # repo-relative, posix
    dst: str

    @property
    def old_mod(self) -> str:
        return path_to_module(self.src)

    @property
    def new_mod(self) -> str:
        return path_to_module(self.dst)


@dataclass
class Edit:
    start: int
    end: int
    text: str
    prio: int  # lower wins an overlap: 0 import, 1 link, 2 plain text


@dataclass
class Plan:
    moves: list[Move]
    new_texts: dict[str, str] = field(default_factory=dict)  # path AFTER the move -> new text
    old_texts: dict[str, str] = field(default_factory=dict)  # same key -> text before
    old_paths: dict[str, str] = field(default_factory=dict)  # same key -> path before the move
    new_inits: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    skipped_mentions: dict[str, int] = field(default_factory=dict)


# ---------------------------------------------------------------- small helpers


def path_to_module(path: str) -> str:
    """`py_modules/backend/services/foo.py` -> `backend.services.foo`."""
    rel = path[len("py_modules/") :] if path.startswith("py_modules/") else path
    return rel[:-3].replace("/", ".")


def run_git(repo: str, *args: str, check: bool = True) -> str:
    proc = subprocess.run(
        ["git", "-C", repo, *args],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if check and proc.returncode != 0:
        raise MoveError(f"git {' '.join(args)} failed: {proc.stderr.strip() or proc.stdout.strip()}")
    return proc.stdout


def tracked_files(repo: str) -> list[str]:
    out = run_git(repo, "ls-files", "-z")
    return [p for p in out.split("\0") if p]


def _is_skipped(path: str) -> bool:
    if path in SKIP_FILES:
        return True
    if path.startswith(GENERATED_ARCH_PREFIX):
        return path.endswith(".json")
    return path.startswith(SKIP_PREFIXES)


def line_starts(text: str) -> list[int]:
    starts = [0]
    for m in re.finditer(r"\r\n|\n|\r", text):
        starts.append(m.end())
    return starts


def eol_of(text: str) -> str:
    return "\r\n" if "\r\n" in text else "\n"


# ---------------------------------------------------------------- command line -> moves


def parse_moves(pairs: list[str], map_file: str | None, repo: str) -> list[tuple[str, str]]:
    raw: list[tuple[str, str]] = []
    if map_file:
        try:
            with open(map_file, encoding="utf-8") as fh:
                for n, line in enumerate(fh, 1):
                    line = line.rstrip("\r\n")
                    if not line.strip() or line.lstrip().startswith("#"):
                        continue
                    cols = line.split("\t")
                    if len(cols) != 2 or not cols[0].strip() or not cols[1].strip():
                        raise MoveError(f"{map_file}:{n}: expected two tab-separated columns")
                    raw.append((cols[0].strip(), cols[1].strip()))
        except OSError as exc:
            raise MoveError(f"cannot read --map file: {exc}")
    if len(pairs) % 2:
        raise MoveError("moves come in pairs: <from> <to> [<from> <to> ...]")
    for i in range(0, len(pairs), 2):
        raw.append((pairs[i], pairs[i + 1]))
    if not raw:
        raise MoveError("nothing to move: give <from> <to> pairs or --map FILE")
    return raw


def _norm(p: str) -> str:
    return posixpath.normpath(p.replace("\\", "/"))


def resolve_moves(raw: list[tuple[str, str]], tracked: set[str], repo: str) -> list[Move]:
    moves: list[Move] = []
    for src_raw, dst_raw in raw:
        src = _norm(src_raw)
        if not src.endswith(".py") or not src.startswith(BACKEND_DIR + "/"):
            raise MoveError(f"{src_raw}: a source must be a .py file under {BACKEND_DIR}/")
        if src not in tracked:
            raise MoveError(f"{src}: not tracked by git (or does not exist)")
        if posixpath.basename(src) == "__init__.py":
            raise MoveError(f"{src}: package __init__.py files are not moved by this tool")
        dst_norm = _norm(dst_raw)
        is_folder = (
            dst_raw.replace("\\", "/").endswith("/")
            or not dst_norm.endswith(".py")
            or os.path.isdir(os.path.join(repo, dst_norm))
        )
        dst = posixpath.join(dst_norm, posixpath.basename(src)) if is_folder else dst_norm
        if not dst.startswith(BACKEND_DIR + "/"):
            raise MoveError(f"{dst_raw}: a target must be under {BACKEND_DIR}/")
        if dst == src:
            raise MoveError(f"{src}: source and target are the same")
        moves.append(Move(src, dst))
    return moves


def validate(moves: list[Move], tracked: set[str], repo: str) -> list[str]:
    """Refuse bad batches. Returns the `__init__.py` files that must be created."""
    srcs: dict[str, Move] = {}
    dsts: dict[str, Move] = {}
    for mv in moves:
        if mv.src.lower() in srcs:
            raise MoveError(f"{mv.src}: listed twice")
        srcs[mv.src.lower()] = mv
        if mv.dst.lower() in dsts:
            raise MoveError(f"{mv.dst}: two moves land on the same target")
        dsts[mv.dst.lower()] = mv
    lowered_tracked = {p.lower() for p in tracked}
    for mv in moves:
        if mv.dst.lower() in lowered_tracked or os.path.exists(os.path.join(repo, mv.dst)):
            raise MoveError(f"{mv.dst}: target already exists")
        if mv.dst.lower() in srcs:
            raise MoveError(f"{mv.dst}: is also a source in this batch; do it in two runs")
    inits: list[str] = []
    for mv in moves:
        parts = mv.dst.split("/")[:-1]  # directory components, starting py_modules/backend
        for depth in range(3, len(parts) + 1):  # below py_modules/backend
            folder = "/".join(parts[:depth])
            if f"{folder}.py".lower() in lowered_tracked:
                raise MoveError(f"{folder}.py exists; a folder of the same name would hide it")
            init = f"{folder}/__init__.py"
            if init.lower() not in lowered_tracked and init not in inits:
                inits.append(init)
    return inits


# ---------------------------------------------------------------- the edit finders


class Rewriter:
    """Holds the move tables and finds the edits for one file at a time."""

    def __init__(self, moves: list[Move], tracked: set[str]):
        self.moves = moves
        self.tracked = tracked
        self.dirs = {posixpath.dirname(p) for p in tracked}
        for d in list(self.dirs):
            while d:
                d = posixpath.dirname(d)
                self.dirs.add(d)
        self.by_src = {m.src: m.dst for m in moves}
        self.mod_map = {m.old_mod: m.new_mod for m in moves}
        self.base_names = {posixpath.basename(m.src)[:-3] for m in moves}
        self._build_regexes()

    # -- regexes -------------------------------------------------------------

    def _build_regexes(self) -> None:
        mods = sorted(self.mod_map, key=len, reverse=True)
        self.dotted_re = re.compile(
            r"(?<![\w.])((?:py_modules\.)?)(" + "|".join(re.escape(m) for m in mods) + r")(?!\w)"
        )
        self.path_forms: dict[str, str] = {}
        self.bare_forms: dict[str, str] = {}
        for mv in self.moves:
            old = mv.src.split("/")
            new = mv.dst.split("/")
            for i in range(len(old) - 1):  # keep at least folder + file name
                suffix = old[i:]
                if new and suffix[0] in new:
                    new_suffix = new[new.index(suffix[0]) :]
                else:
                    new_suffix = new[-len(suffix) :] if len(suffix) <= len(new) else new
                self.path_forms["/".join(suffix)] = "/".join(new_suffix)
            if old[-1] != new[-1]:
                self.bare_forms[old[-1]] = new[-1]
        full = [p for p in self.path_forms if p.startswith("py_modules/")]
        short = [p for p in self.path_forms if not p.startswith("py_modules/")]
        self.path_full_re = self._alt_re(full, r"(?<![\w.-])")
        self.path_short_re = self._alt_re(short, r"(?<![\w./-])")
        self.bare_re = self._alt_re(list(self.bare_forms), r"(?<![\w./\\-])")

    @staticmethod
    def _alt_re(items: list[str], lookbehind: str):
        if not items:
            return None
        items = sorted(items, key=len, reverse=True)
        return re.compile(lookbehind + "(" + "|".join(re.escape(i) for i in items) + r")(?!\w)")

    # -- one file ------------------------------------------------------------

    def names_old_place(self, text: str) -> bool:
        """True when the text still mentions a moved file by path or dotted name."""
        return any(
            r is not None and r.search(text)
            for r in (self.path_full_re, self.path_short_re, self.dotted_re)
        )

    def needs_scan(self, path: str, data: bytes) -> bool:
        if path in self.by_src:
            return True
        return any(name.encode() in data for name in self.base_names)

    def edits_for(self, path: str, text: str) -> list[Edit]:
        edits: list[Edit] = []
        if path.endswith(".py"):
            edits += self.import_edits(path, text)
        edits += self.link_edits(path, text)
        for regex, table in (
            (self.path_full_re, self.path_forms),
            (self.path_short_re, self.path_forms),
            (self.bare_re, self.bare_forms),
        ):
            if regex is None:
                continue
            for m in regex.finditer(text):
                new = table[m.group(1)]
                if new != m.group(1):
                    edits.append(Edit(m.start(1), m.end(1), new, 2))
        for m in self.dotted_re.finditer(text):
            new = self.mod_map[m.group(2)]
            if new != m.group(2):
                edits.append(Edit(m.start(2), m.end(2), new, 2))
        return self._resolve_overlaps(edits)

    @staticmethod
    def _resolve_overlaps(edits: list[Edit]) -> list[Edit]:
        high = sorted((e for e in edits if e.prio < 2), key=lambda e: e.start)
        kept = list(high)
        for e in edits:
            if e.prio < 2:
                continue
            if any(h.start < e.end and e.start < h.end for h in high):
                continue
            kept.append(e)
        kept.sort(key=lambda e: e.start)
        return kept

    # -- Markdown links --------------------------------------------------------

    _LINK_RES = (
        re.compile(r"\]\(\s*<?([^)\s>]+)"),
        re.compile(r"(?m)^[ ]{0,3}\[[^\]\n]+\]:[ \t]*<?(\S+)"),
    )

    def link_edits(self, path: str, text: str) -> list[Edit]:
        edits: list[Edit] = []
        new_dir = posixpath.dirname(self.by_src.get(path, path))
        old_dir = posixpath.dirname(path)
        for regex in self._LINK_RES:
            for m in regex.finditer(text):
                target = m.group(1)
                if re.match(r"[A-Za-z][A-Za-z0-9+.-]*:", target) or target.startswith(("#", "/")):
                    continue
                m_split = re.match(r"([^#?]*)(.*)", target)
                body, tail = m_split.group(1), m_split.group(2)
                if not body:
                    continue
                decoded = urllib.parse.unquote(body)
                resolved = posixpath.normpath(posixpath.join(old_dir, decoded))
                if resolved.startswith(".."):
                    continue
                is_file = resolved in self.tracked
                if not is_file and resolved not in self.dirs:
                    continue
                new_target = self.by_src.get(resolved, resolved)
                rel = posixpath.relpath(new_target, new_dir or ".")
                if rel == posixpath.normpath(decoded):
                    continue
                if decoded.endswith("/") and not rel.endswith("/"):
                    rel += "/"
                if decoded.startswith("./") and not rel.startswith("."):
                    rel = "./" + rel
                edits.append(Edit(m.start(1), m.start(1) + len(body), rel, 1))
        return edits

    # -- Python imports ----------------------------------------------------------

    def _file_pkg(self, path: str) -> list[str] | None:
        if not path.startswith("py_modules/"):
            return None
        return posixpath.dirname(path)[len("py_modules/") :].split("/")

    def import_edits(self, path: str, text: str) -> list[Edit]:
        try:
            tree = ast.parse(text)
        except (SyntaxError, ValueError):
            return []
        old_pkg = self._file_pkg(path)
        new_pkg = self._file_pkg(self.by_src.get(path, path))
        starts = line_starts(text)
        edits: list[Edit] = []
        for node in ast.walk(tree):
            if not isinstance(node, ast.ImportFrom):
                continue
            if node.level > 0 and old_pkg is None:
                continue
            e = self._import_from_edit(path, text, starts, node, old_pkg, new_pkg)
            if e is not None:
                edits.append(e)
        return edits

    @staticmethod
    def _offset(text: str, starts: list[int], lineno: int, col_bytes: int) -> int:
        line_start = starts[lineno - 1]
        line_end = starts[lineno] if lineno < len(starts) else len(text)
        line = text[line_start:line_end]
        return line_start + len(line.encode("utf-8")[:col_bytes].decode("utf-8", errors="ignore"))

    def _import_from_edit(self, path, text, starts, node, old_pkg, new_pkg) -> Edit | None:
        prefix = ""
        if node.level:
            hops = node.level - 1
            if hops > len(old_pkg) - 1:
                return None
            base_parts = old_pkg[: len(old_pkg) - hops] + (node.module.split(".") if node.module else [])
        else:
            parts = (node.module or "").split(".")
            if parts[0] == "py_modules":
                prefix, parts = "py_modules.", parts[1:]
            base_parts = parts
        if not base_parts or base_parts[0] != "backend":
            return None
        base_mod = ".".join(base_parts)
        module_moved = base_mod in self.mod_map
        moved_children = [
            a for a in node.names if a.name != "*" and f"{base_mod}.{a.name}" in self.mod_map
        ]
        file_moved = path in self.by_src
        if not module_moved and not moved_children and not (node.level and file_moved):
            return None
        if not node.level and not moved_children:
            return None  # `from backend.x.y import a`: the dotted-name pass handles it

        start = self._offset(text, starts, node.lineno, node.col_offset)
        end = self._offset(text, starts, node.end_lineno, node.end_col_offset)
        line_start = starts[node.lineno - 1]
        indent = text[line_start:start]
        if indent.strip():
            raise MoveError(f"{path}:{node.lineno}: import shares a line with other code; edit by hand")
        m_eol = re.compile(r"[^\r\n]*").match(text, end)
        trailing = m_eol.group(0)
        if trailing.strip() and not trailing.strip().startswith("#"):
            raise MoveError(f"{path}:{node.end_lineno}: import shares a line with other code; edit by hand")
        line_end = m_eol.end()
        segment = text[start:end]

        def module_text(target_parts: list[str]) -> str:
            if node.level:
                return _relative_module(new_pkg, target_parts)
            return prefix + ".".join(target_parts)

        if not moved_children:
            new_parts = self.mod_map[base_mod].split(".") if module_moved else base_parts
            m = re.match(r"(from\s+)(\.*[\w.]*)(\s+import\b)", segment)
            if not m:
                raise MoveError(f"{path}:{node.lineno}: unusual import layout; edit by hand")
            new_head = module_text(new_parts)
            if new_head == m.group(2):
                return None
            return Edit(start + m.start(2), start + m.end(2), new_head, 0)

        if _has_comment(segment):
            raise MoveError(f"{path}:{node.lineno}: a comment sits inside this import; edit by hand")
        # Group the names by where they will live; names that do not move keep their place.
        groups: dict[str, list[str]] = {}
        order: list[str] = []
        for a in node.names:
            if a.name != "*" and f"{base_mod}.{a.name}" in self.mod_map:
                new_mod = self.mod_map[f"{base_mod}.{a.name}"]
                parent, new_name = new_mod.rsplit(".", 1)
                local = a.asname or a.name
                item = new_name if local == new_name else f"{new_name} as {local}"
                key = module_text(parent.split("."))
            else:
                item = a.name + (f" as {a.asname}" if a.asname else "")
                key = module_text(base_parts)
            if key not in groups:
                groups[key] = []
                order.append(key)
            groups[key].append(item)
        stay_key = module_text(base_parts)
        if stay_key in order:  # the names that stay keep the first line
            order.remove(stay_key)
            order.insert(0, stay_key)
        multi = node.end_lineno > node.lineno
        eol = eol_of(text)
        comment = trailing.strip()
        rendered = [
            _render_from(key, groups[key], indent, multi, eol, comment) for key in order
        ]
        return Edit(start, line_end, (eol + indent).join(rendered), 0)


def _relative_module(file_pkg: list[str], target: list[str]) -> str:
    common = 0
    while common < len(file_pkg) and common < len(target) and file_pkg[common] == target[common]:
        common += 1
    level = len(file_pkg) - common + 1
    return "." * level + ".".join(target[common:])


def _has_comment(segment: str) -> bool:
    try:
        for tok in tokenize.generate_tokens(io.StringIO(segment).readline):
            if tok.type == tokenize.COMMENT:
                return True
    except (tokenize.TokenError, IndentationError):
        return True
    return False


def _render_from(module: str, items: list[str], indent: str, multi: bool, eol: str, comment: str) -> str:
    tail = f"  {comment}" if comment else ""
    one = f"from {module} import {', '.join(items)}"
    if not multi and len(indent) + len(one) + len(tail) <= LINE_LIMIT:
        return one + tail
    body = "".join(f"{indent}    {item},{eol}" for item in items)
    return f"from {module} import ({eol}{body}{indent}){tail}"


# ---------------------------------------------------------------- the whole plan


def read_text(repo: str, path: str) -> tuple[bytes, str] | None:
    full = os.path.join(repo, path)
    try:
        if os.path.getsize(full) > MAX_TEXT_BYTES:
            return None
        with open(full, "rb") as fh:
            data = fh.read()
    except OSError:
        return None
    if b"\0" in data[:8000]:
        return None
    try:
        return data, data.decode("utf-8")
    except UnicodeDecodeError:
        return None


def apply_edits(text: str, edits: list[Edit]) -> str:
    for e in sorted(edits, key=lambda e: e.start, reverse=True):
        text = text[: e.start] + e.text + text[e.end :]
    return text


def init_text(folder: str, purpose: str | None) -> str:
    dotted = path_to_module(folder + "/x.py").rsplit(".", 1)[0]
    name = folder.rsplit("/", 1)[-1].replace("_", " ")
    why = purpose or (
        "Keeps one group of the plugin's back-end files together in their own folder, so the "
        "folder they came from stays small enough to read. Say here which jobs this group covers."
    )
    return (
        f'"""Title: {name.capitalize()} package\n\n'
        f"Purpose: {why}\n"
        f"Used for: Python's import system, which needs this file to treat the folder as a package\n"
        f"that code can import from as `{dotted}`.\n"
        f"Solves: Without it the folder's files could not be imported by name from main.py or the tests.\n"
        f"Does not: Hold any code of its own; each job lives in the file named for it.\n"
        f'"""\n'
    )


def plan(repo: str, moves: list[Move], tracked_list: list[str], inits: list[str], purpose: str | None) -> Plan:
    tracked = set(tracked_list)
    rw = Rewriter(moves, tracked)
    result = Plan(moves=moves, new_inits=inits)
    for path in tracked_list:
        if _is_skipped(path):
            # History and generated output stay as written; just count what still names the place.
            loaded = read_text(repo, path)
            if loaded and rw.needs_scan(path, loaded[0]) and rw.names_old_place(loaded[1]):
                top = path.split("/")[0]
                result.skipped_mentions[top] = result.skipped_mentions.get(top, 0) + 1
            continue
        loaded = read_text(repo, path)
        if loaded is None:
            continue
        data, text = loaded
        if not rw.needs_scan(path, data):
            continue
        edits = rw.edits_for(path, text)
        if not edits:
            continue
        new_text = apply_edits(text, edits)
        new_path = rw.by_src.get(path, path)
        if path.endswith(".py"):
            try:
                ast.parse(new_text)
            except SyntaxError as exc:
                raise MoveError(f"{path}: the edited file would not parse ({exc}); nothing changed")
        result.new_texts[new_path] = new_text
        result.old_texts[new_path] = text
        result.old_paths[new_path] = path
    # a moved file with no text edits still has to be in the report as moved
    for mv in moves:
        result.old_paths.setdefault(mv.dst, mv.src)
    for init in inits:
        folder = init.rsplit("/", 1)[0]
        result.new_texts[init] = init_text(folder, purpose)
        result.old_texts[init] = ""
    scan_warnings(repo, rw, result, tracked_list)
    return result


# ---------------------------------------------------------------- what it cannot fix


_DYNAMIC_RE = re.compile(r"(import_module|__import__)\(\s*(?![\"'])")
_SPEC_RE = re.compile(r"spec_from_file_location\(")
_WALK_EXT = (".py", ".sh", ".ps1", ".mjs", ".js", ".ts", ".yml", ".yaml", ".toml", ".cfg")


def _scan_this(path: str) -> bool:
    """Code and config that could list or walk a folder; not prose, not data."""
    if path in ("plugin.json", "package.json"):
        return True
    return path.endswith(_WALK_EXT)


def scan_warnings(repo: str, rw: Rewriter, result: Plan, tracked_list: list[str]) -> None:
    w = result.warnings
    src_dirs = sorted({posixpath.dirname(m.src) for m in rw.moves})
    for mv in rw.moves:
        loaded = read_text(repo, mv.src)
        if loaded and "__file__" in loaded[1]:
            depth_changed = mv.src.count("/") != mv.dst.count("/")
            w.append(
                f"{mv.dst}: uses __file__"
                + (" and its folder depth changed, so a path built from it may now point elsewhere" if depth_changed else "")
                + "; check by hand"
            )
    parts = src_dirs[0].split("/")[-2:] if src_dirs else []
    parts_re = (
        re.compile(rf"[\"']{re.escape(parts[0])}[\"']\s*,\s*[\"']{re.escape(parts[1])}[\"']")
        if len(parts) == 2
        else None
    )
    dir_res = [
        (d, re.compile(re.escape(d) + r"(?:/\*|/?[\"'`\s)\]]|/?$)")) for d in src_dirs
    ]
    quoted_res = [
        (n, re.compile(rf"[\"']{re.escape(n)}[\"']")) for n in sorted(rw.base_names)
    ]
    for path in tracked_list:
        if _is_skipped(path) or not _scan_this(path):
            continue
        loaded = read_text(repo, path)
        if loaded is None:
            continue
        text = result.new_texts.get(rw.by_src.get(path, path), loaded[1])
        all_lines = text.splitlines()
        for n, line in enumerate(all_lines, 1):
            for d, dre in dir_res:
                if dre.search(line):
                    w.append(f"{path}:{n}: names the old folder {d} as a whole (lists or walks it); check by hand")
            if parts_re and parts_re.search(line):
                w.append(f"{path}:{n}: builds the old folder path from parts; check by hand")
            if path.endswith(".py"):
                near = " ".join(all_lines[n - 1 : n + 3])
                if _DYNAMIC_RE.search(line):
                    w.append(f"{path}:{n}: imports a module by a name built at run time; check by hand")
                elif _SPEC_RE.search(line) and re.search(r"services|py_modules|backend", near):
                    w.append(f"{path}:{n}: loads a back-end file by a path built at run time; check by hand")
            for name, qre in quoted_res:
                if qre.search(line):
                    w.append(f"{path}:{n}: quotes the bare name \"{name}\"; check it is not the moved module")
    # de-duplicate, keep order
    seen = set()
    result.warnings = [x for x in w if not (x in seen or seen.add(x))]


# ---------------------------------------------------------------- doing it


def apply(repo: str, result: Plan, stage: bool) -> None:
    done: list[Move] = []
    created: list[str] = []
    try:
        for mv in result.moves:
            os.makedirs(os.path.join(repo, posixpath.dirname(mv.dst)), exist_ok=True)
            run_git(repo, "mv", mv.src, mv.dst)
            done.append(mv)
        for init in result.new_inits:
            with open(os.path.join(repo, init), "w", encoding="utf-8", newline="\n") as fh:
                fh.write(result.new_texts[init])
            created.append(init)
            run_git(repo, "add", "--", init)
    except (MoveError, OSError) as exc:
        for init in created:
            run_git(repo, "rm", "-f", "-q", "--", init, check=False)
        for mv in reversed(done):
            run_git(repo, "mv", mv.dst, mv.src, check=False)
        raise MoveError(f"could not move files ({exc}); put everything back")
    changed = []
    for new_path, new_text in result.new_texts.items():
        if new_path in result.new_inits:
            continue
        # the text was decoded without newline translation, so writing it back keeps CRLF files CRLF
        with open(os.path.join(repo, new_path), "wb") as fh:
            fh.write(new_text.encode("utf-8"))
        changed.append(new_path)
    if stage and changed:
        run_git(repo, "add", "--", *changed)


def show_diffs(result: Plan) -> int:
    count = 0
    for new_path in sorted(result.new_texts):
        old_text = result.old_texts[new_path]
        new_text = result.new_texts[new_path]
        old_path = result.old_paths.get(new_path, new_path)
        diff = list(
            difflib.unified_diff(
                old_text.splitlines(), new_text.splitlines(),
                fromfile=f"a/{old_path}", tofile=f"b/{new_path}", n=0, lineterm="",
            )
        )
        if new_path in result.new_inits:
            print(f"+ new file {new_path}")
            continue
        for line in diff:
            print(line)
            if line.startswith("+") and not line.startswith("+++"):
                count += 1
    return count


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description="Move back-end Python files and fix every import and mention of them.",
    )
    ap.add_argument("paths", nargs="*", metavar="PATH", help="<from> <to> [<from> <to> ...]")
    ap.add_argument("--map", dest="map_file", help="file of tab-separated <from><TAB><to> lines")
    ap.add_argument("--dry-run", action="store_true", help="print every planned edit; change nothing")
    ap.add_argument("--stage", action="store_true", help="also `git add` the edited files (by name)")
    ap.add_argument("--package-purpose", help="the Purpose line for any new __init__.py")
    ap.add_argument("--repo", default=REPO_ROOT_DEFAULT, help=argparse.SUPPRESS)
    args = ap.parse_args(argv)
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")
    repo = os.path.abspath(args.repo)
    try:
        raw = parse_moves(args.paths, args.map_file, repo)
        tracked_list = tracked_files(repo)
        tracked = set(tracked_list)
        moves = resolve_moves(raw, tracked, repo)
        inits = validate(moves, tracked, repo)
        result = plan(repo, moves, tracked_list, inits, args.package_purpose)
        for mv in moves:
            print(f"move {mv.src} -> {mv.dst}")
        edited = [p for p in result.new_texts if p not in result.new_inits]
        if args.dry_run:
            show_diffs(result)
        else:
            apply(repo, result, args.stage)
        print(f"\n{'would change' if args.dry_run else 'changed'}: {len(moves)} moved, "
              f"{len(edited)} files edited, {len(result.new_inits)} new __init__.py")
        if result.skipped_mentions:
            where = ", ".join(f"{k} ({v})" for k, v in sorted(result.skipped_mentions.items()))
            print(f"left as written (history or generated output still names the old place): {where}")
        if result.warnings:
            print("\ncheck by hand:")
            for line in result.warnings:
                print(f"  {line}")
        if not args.dry_run and edited and not args.stage:
            print("\nstage the edits by name: git add -- " + " ".join(sorted(edited)))
        return 0
    except MoveError as exc:
        print(f"refused: {exc}", file=sys.stderr)
        print("nothing was changed.", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
