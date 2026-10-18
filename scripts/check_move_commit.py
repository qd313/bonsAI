#!/usr/bin/env python3
"""Title: Move-commit checker

Purpose: A commit that moves files must change nothing else. This script proves it. It takes
the commit (or a range of commits), asks git which files were renamed, and compares every
changed file before and after with the parts a move is allowed to change blanked out. If
anything is still different, the commit did something besides move code, and the script says
which file and which lines. Step 4 of the clean-up moves hundreds of files, one area per
commit; this is the check that lets a reviewer trust "only paths changed" without reading
every line.
Used for: `python scripts/check_move_commit.py <commit>` or `<a>..<b>` (each commit in the
range is checked on its own), after `node scripts/move_screen_file.mjs` for screen files, or
after a hand move of a back-end file. `--repo <dir>` checks a repository other than the
current folder. Exit 0 means every commit passed, 1 means one did not, 2 means the check
could not run.
Solves: Moving code and changing code in one commit hides the change inside hundreds of
path edits. A rename whose import line quietly pointed at a different module, or whose
function body got one character different, would pass every test that does not cover it.
Does not: Judge whether a move was a good idea, or run any test. It does not follow a Python
module that is named only by a bare file name (a script found through `sys.path`), and it
cannot pair a rename that git itself cannot pair (a tiny file whose lines almost all changed
shows up as a delete plus an add, and fails). The one added file it allows is an `__init__.py`
whose code is empty (a docstring and comments only), the package marker a move into a new
folder needs. Files a generator writes (listed in scripts/move_tools_config.json) are skipped. Merge commits are skipped in a range.

How it works:
1. `git diff-tree` lists the changes of one commit with renames paired (low similarity
   threshold, so a small file with a few edited import lines still pairs). Anything added or
   deleted with no partner, or whose file mode changed, fails at once.
2. For each changed file the old and new text are read (one `git cat-file --batch`).
   Binary files must be byte-identical.
3. In JavaScript/TypeScript text, every relative module path (import, export, `vi.mock`,
   `vi.doMock`, `vi.importActual`, `require`, dynamic `import()`) is found. The old path must
   resolve, in the old tree, to a file that the move table maps to exactly the file the new
   path resolves to in the new tree. Paths that pass are blanked, so a path that now points at
   a different module is NOT blanked and shows up as a difference.
4. In Markdown, relative links get the same test. In Python, the import statements of the old
   and new file are read with `ast` and compared as sets of full module names, with the old
   names run through the move table; passing import statements are blanked.
5. Everywhere, an old or new repo path of a moved file, an old or new Python dotted module name
   of a moved file, the two shorter back-end forms of those repo paths (`backend/...`, and
   `services/...` relative to `py_modules/backend/`), and (for a rename) the old or new base
   file name are blanked.
6. The two blanked texts must be equal. If not, the differing lines are printed.
7. Files the commit did not touch are read too, when their text could name a moved file
   (found with `git grep` for the moved files' names): an importer nobody updated has the same
   text before and after, so a diff cannot see it, yet its path no longer points at anything.
   Each such stale path fails the check. A file that still names an old repo path in plain
   prose is only printed as a note, since history documents keep their old paths on purpose.
"""

from __future__ import annotations

import argparse
import ast
import difflib
import json
import os
import re
import subprocess
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"
BLANK = "\x00"
JS_EXT = (".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs")
MOCK_METHODS = "mock|doMock|unmock|doUnmock|importActual|importMock|requireActual|requireMock"


def load_config() -> dict:
    with open(os.path.join(HERE, "move_tools_config.json"), encoding="utf8") as handle:
        return json.load(handle)


def glob_to_regex(glob: str) -> re.Pattern:
    return re.compile("^" + "[^/]*".join(re.escape(part) for part in glob.split("*")) + "$")


class Repo:
    """Thin wrapper over git for one repository."""

    def __init__(self, root: str) -> None:
        self.root = root
        self._trees: dict[str, frozenset[str]] = {}

    def git(self, *args: str, data: bytes | None = None) -> bytes:
        done = subprocess.run(
            ["git", "-C", self.root, *args], input=data, capture_output=True, check=False
        )
        if done.returncode != 0:
            raise RuntimeError(f"git {' '.join(args)} failed: {done.stderr.decode('utf8', 'replace').strip()}")
        return done.stdout

    def tree(self, rev: str) -> frozenset[str]:
        if rev not in self._trees:
            out = self.git("ls-tree", "-r", "--name-only", "-z", rev)
            self._trees[rev] = frozenset(p for p in out.decode("utf8").split("\0") if p)
        return self._trees[rev]

    def blobs(self, oids: list[str]) -> dict[str, bytes]:
        """Read many blobs with one git process."""
        wanted = sorted(set(oids))
        if not wanted:
            return {}
        out = self.git("cat-file", "--batch", data=("\n".join(wanted) + "\n").encode())
        found: dict[str, bytes] = {}
        pos = 0
        for oid in wanted:
            end = out.index(b"\n", pos)
            header = out[pos:end].decode().split()
            if len(header) != 3 or header[1] != "blob":
                raise RuntimeError(f"could not read blob {oid}: {out[pos:end].decode()}")
            size = int(header[2])
            found[oid] = out[end + 1 : end + 1 + size]
            pos = end + 1 + size + 1
        return found

    def commits(self, spec: str) -> list[str]:
        if ".." in spec:
            out = self.git("rev-list", "--reverse", "--no-merges", spec).decode().split()
            return out
        parents = self.git("rev-list", "--parents", "-n", "1", spec).decode().split()
        if len(parents) > 2:
            raise RuntimeError(f"{spec} is a merge commit; check the commits it brings in instead")
        return [parents[0]]

    def parent_of(self, rev: str) -> str:
        parents = self.git("rev-list", "--parents", "-n", "1", rev).decode().split()
        return parents[1] if len(parents) > 1 else EMPTY_TREE

    def title(self, rev: str) -> str:
        return self.git("log", "-1", "--format=%h %s", rev).decode().strip()


class Change:
    def __init__(self, status: str, old: str, new: str, old_mode: str, new_mode: str, old_oid: str, new_oid: str):
        self.status, self.old, self.new = status, old, new
        self.old_mode, self.new_mode = old_mode, new_mode
        self.old_oid, self.new_oid = old_oid, new_oid


def changes_of(repo: Repo, parent: str, rev: str) -> list[Change]:
    raw = repo.git("diff-tree", "-r", "-z", "--raw", "--no-commit-id", "--find-renames=10%", "-l2000", parent, rev)
    parts = raw.decode("utf8").split("\0")
    out: list[Change] = []
    i = 0
    while i < len(parts) and parts[i]:
        header = parts[i].lstrip(":").split()
        old_mode, new_mode, old_oid, new_oid, status = header[:5]
        if status[0] in "RC":
            out.append(Change(status[0], parts[i + 1], parts[i + 2], old_mode, new_mode, old_oid, new_oid))
            i += 3
        else:
            path = parts[i + 1]
            out.append(Change(status[0], path, path, old_mode, new_mode, old_oid, new_oid))
            i += 2
    return out


# ---------------------------------------------------------------------------------------------
# Module path resolution

def resolve_js(files: frozenset[str], from_file: str, spec: str) -> str | None:
    base = os.path.normpath(os.path.join(os.path.dirname(from_file), spec)).replace(os.sep, "/")
    candidates = [base]
    js = re.search(r"\.(m?js|jsx)$", base)
    if js:
        stem = base[: -len(js.group(0))]
        candidates += [stem + ext for ext in (".ts", ".tsx", ".d.ts")]
    candidates += [base + ext for ext in (".ts", ".tsx", ".d.ts", ".js", ".jsx", ".mjs", ".json")]
    candidates += [f"{base}/index{ext}" for ext in (".ts", ".tsx", ".js")]
    for c in candidates:
        if c in files:
            return c
    return None


def resolve_link(files: frozenset[str], from_file: str, target: str) -> str | None:
    path = os.path.normpath(os.path.join(os.path.dirname(from_file), target)).replace(os.sep, "/")
    if path in files:
        return path
    prefix = path.rstrip("/") + "/"
    if any(f.startswith(prefix) for f in files):
        return path.rstrip("/")
    return None


def _quoted(prefix: str) -> re.Pattern:
    return re.compile(prefix + r"""(?P<q>["'`])(?P<s>(?:(?!(?P=q))[^\n\\])*)(?P=q)""")


JS_SPEC_PATTERNS = [
    _quoted(r"\bfrom\s*"),
    _quoted(r"\bimport\s*"),
    _quoted(r"\b(?:import|require)\s*\(\s*"),
    _quoted(r"\b(?:vi|jest)\s*\.\s*(?:" + MOCK_METHODS + r")\s*(?:<[^;\n]*?>)?\s*\(\s*"),
]
MD_INLINE = re.compile(r"(\]\()([^)\s<>]+)((?:\s+\"[^\"]*\")?\))")
MD_REFDEF = re.compile(r"^(\s*\[[^\]]+\]:\s*)(\S+)", re.M)


def js_specs(text: str) -> list[tuple[int, int, str]]:
    seen: dict[int, tuple[int, int, str]] = {}
    for pattern in JS_SPEC_PATTERNS:
        for m in pattern.finditer(text):
            if m.group("s").startswith("."):
                seen.setdefault(m.start("s"), (m.start("s"), m.end("s"), m.group("s")))
    return [seen[k] for k in sorted(seen)]


def md_links(text: str) -> list[tuple[int, int, str]]:
    found: dict[int, tuple[int, int, str]] = {}
    for m in MD_INLINE.finditer(text):
        found[m.start(2)] = (m.start(2), m.end(2), m.group(2))
    for m in MD_REFDEF.finditer(text):
        found[m.start(2)] = (m.start(2), m.end(2), m.group(2))
    out = []
    for key in sorted(found):
        start, end, target = found[key]
        if re.match(r"[a-zA-Z][a-zA-Z0-9+.-]*:", target) or target.startswith(("#", "/")):
            continue
        out.append((start, end, target))
    return out


# ---------------------------------------------------------------------------------------------
# Python imports

def dotted_name(path: str) -> str | None:
    if not path.endswith(".py"):
        return None
    rel = path[len("py_modules/") :] if path.startswith("py_modules/") else path
    rel = rel[: -len(".py")]
    if rel.endswith("/__init__"):
        rel = rel[: -len("/__init__")]
    return rel.replace("/", ".")


def python_imports(text: str, path: str) -> tuple[list[tuple[int, int]], Counter] | None:
    """Spans of every import statement, plus the set of full module names they import."""
    try:
        tree = ast.parse(text)
    except (SyntaxError, ValueError):
        return None
    lines = text.split("\n")
    starts, total = [], 0
    for line in lines:
        starts.append(total)
        total += len(line) + 1

    def offset(lineno: int, col: int) -> int:
        line = lines[lineno - 1]
        return starts[lineno - 1] + len(line.encode("utf8")[:col].decode("utf8", "ignore"))

    here = (dotted_name(path) or "").split(".")
    package = here if path.endswith("__init__.py") else here[:-1]
    spans, flat = [], Counter()
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            spans.append((offset(node.lineno, node.col_offset), offset(node.end_lineno, node.end_col_offset)))
            if isinstance(node, ast.Import):
                for alias in node.names:
                    flat[("import", alias.name, alias.asname)] += 1
            else:
                keep = len(package) - (node.level - 1) if node.level else 0
                head = package[: max(keep, 0)] if node.level else []
                base = ".".join(head + ([node.module] if node.module else []))
                for alias in node.names:
                    flat[("from", f"{base}.{alias.name}" if base else alias.name, alias.asname)] += 1
    return spans, flat


# ---------------------------------------------------------------------------------------------
# The comparison

class MoveTable:
    def __init__(self, renames: list[tuple[str, str]]) -> None:
        self.files = dict(renames)
        self.paths = sorted({p for pair in renames for p in pair}, key=len, reverse=True)
        self.dotted = {}
        for old, new in renames:
            a, b = dotted_name(old), dotted_name(new)
            if a and b and a != b:
                self.dotted[a] = b
        self.dotted_sorted = sorted(self.dotted, key=len, reverse=True)
        bases = set()
        for old, new in renames:
            if os.path.basename(old) != os.path.basename(new):
                bases.update((os.path.basename(old), os.path.basename(new)))
        self.bases = sorted(bases, key=len, reverse=True)
        # The two shorter written forms of a back-end path (the back-end mover rewrites both).
        shorts = set()
        for p in self.paths:
            if p.startswith("py_modules/backend/"):
                shorts.update((p[len("py_modules/") :], p[len("py_modules/backend/") :]))
        self.short_paths = sorted(shorts, key=len, reverse=True)

    def map_file(self, path: str) -> str:
        return self.files.get(path, path)

    def map_dotted(self, name: str) -> str:
        for old in self.dotted_sorted:
            if name == old or name.startswith(old + "."):
                return self.dotted[old] + name[len(old) :]
        return name

    def blank_regexes(self) -> list[re.Pattern]:
        out = []
        if self.paths:
            out.append(re.compile(r"(?<![\w@-])(?<![\w@-]/)(?:" + "|".join(map(re.escape, self.paths)) + r")(?![\w-])"))
        if self.short_paths:
            out.append(re.compile(r"(?<![\w@-])(?<![\w@-]/)(?:" + "|".join(map(re.escape, self.short_paths)) + r")(?![\w-])"))
        names = list(self.dotted) + list(self.dotted.values())
        if names:
            names.sort(key=len, reverse=True)
            out.append(re.compile(r"(?<![\w.])(?:" + "|".join(map(re.escape, names)) + r")(?!\w)"))
        if self.bases:
            out.append(re.compile(r"(?<![\w@-])(?:" + "|".join(map(re.escape, self.bases)) + r")(?![\w-])"))
        return out


def blank_text(text: str, spans: list[tuple[int, int]]) -> tuple[str, list[int]]:
    """Replace spans with one marker. Also return, per output line, the original line number."""
    merged: list[list[int]] = []
    for start, end in sorted(spans):
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    out, pos, line_no, origin = [], 0, 1, [1]
    for start, end in merged:
        chunk = text[pos:start]
        out.append(chunk)
        for _ in range(chunk.count("\n")):
            line_no += 1
            origin.append(line_no)
        out.append(BLANK)
        line_no += text.count("\n", start, end)
        pos = end
    chunk = text[pos:]
    out.append(chunk)
    for _ in range(chunk.count("\n")):
        line_no += 1
        origin.append(line_no)
    return "".join(out), origin


def pair_checks(old_items, new_items, why_not, new_text):
    """Blank the (old, new) items that agree. For the others, explain why not.

    A pair that disagrees stays unblanked, and is also reported by itself, because an
    unchanged line (a mock path nobody updated) looks identical on both sides and would
    otherwise slip through.
    """
    old_spans, new_spans, reasons = [], [], []
    if len(old_items) != len(new_items):
        return old_spans, new_spans, reasons
    for (os_, oe, otext), (ns, ne, ntext) in zip(old_items, new_items):
        reason = why_not(otext, ntext)
        if reason is None:
            old_spans.append((os_, oe))
            new_spans.append((ns, ne))
        else:
            line = new_text.count(chr(10), 0, ns) + 1
            reasons.append(f'new line {line}: path "{ntext}" {reason}')
    return old_spans, new_spans, reasons


def compare_file(change: Change, old_text: str, new_text: str, table: MoveTable, old_tree, new_tree):
    """Return (problems, old_blanked_lines, new_blanked_lines, old_origin, new_origin)."""
    old_spans: list[tuple[int, int]] = []
    new_spans: list[tuple[int, int]] = []
    notes: list[str] = []
    path_old, path_new = change.old, change.new

    if path_new.endswith(JS_EXT):
        def spec_why_not(otext: str, ntext: str) -> str | None:
            before = resolve_js(old_tree, path_old, otext)
            after = resolve_js(new_tree, path_new, ntext)
            if before is None and after is None:
                # not a real module path (a comment, a fixture): fine as plain text if it did not change
                return None if otext == ntext else "was changed but points at no file"
            expected = table.map_file(before) if before else None
            if after is None:
                return f"points at no file now (it was {before}, which is now {expected})"
            if after != expected:
                return f"points at {after}, but the old path pointed at {before} (now {expected})"
            return None

        a, b, why = pair_checks(js_specs(old_text), js_specs(new_text), spec_why_not, new_text)
        old_spans += a
        new_spans += b
        notes += why
    elif path_new.endswith(".md"):
        def link_why_not(otext: str, ntext: str) -> str | None:
            osplit, nsplit = re.split(r"[#?]", otext, maxsplit=1), re.split(r"[#?]", ntext, maxsplit=1)
            before = resolve_link(old_tree, path_old, osplit[0]) if osplit[0] else None
            after = resolve_link(new_tree, path_new, nsplit[0]) if nsplit[0] else None
            if before is None and after is None:
                return None if otext == ntext else "was changed but points at no file"
            expected = table.map_file(before) if before else None
            if after != expected:
                return f"points at {after}, expected {expected}"
            if otext[len(osplit[0]) :] != ntext[len(nsplit[0]) :]:
                return "has a different anchor"
            return None

        a, b, why = pair_checks(md_links(old_text), md_links(new_text), link_why_not, new_text)
        old_spans += a
        new_spans += b
        notes += why
    elif path_new.endswith(".py"):
        before = python_imports(old_text, path_old)
        after = python_imports(new_text, path_new)
        if before is not None and after is not None:
            mapped = Counter()
            for (kind, name, alias), count in before[1].items():
                mapped[(kind, table.map_dotted(name), alias)] += count
            if mapped == after[1]:
                old_spans += before[0]
                new_spans += after[0]
            else:
                missing = mapped - after[1]
                extra = after[1] - mapped
                notes.append(
                    "the imports are not the same set of modules after the move: "
                    f"expected-but-missing {sorted(missing)[:4]}, new-and-unexpected {sorted(extra)[:4]}"
                )

    for pattern in table.blank_regexes():
        old_spans += [m.span() for m in pattern.finditer(old_text)]
        new_spans += [m.span() for m in pattern.finditer(new_text)]

    old_blank, old_origin = blank_text(old_text, old_spans)
    new_blank, new_origin = blank_text(new_text, new_spans)
    return notes, old_blank, new_blank, old_origin, new_origin


def show_difference(old_blank, new_blank, old_origin, new_origin, old_text, new_text, limit=10) -> list[str]:
    a, b = old_blank.split("\n"), new_blank.split("\n")
    old_lines, new_lines = old_text.split("\n"), new_text.split("\n")
    out: list[str] = []
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if tag == "equal":
            continue
        for i in range(i1, i2):
            n = old_origin[i] if i < len(old_origin) else i + 1
            out.append(f"      - old line {n}: {old_lines[n - 1].strip()[:150] if n - 1 < len(old_lines) else ''}")
        for j in range(j1, j2):
            n = new_origin[j] if j < len(new_origin) else j + 1
            out.append(f"      + new line {n}: {new_lines[n - 1].strip()[:150] if n - 1 < len(new_lines) else ''}")
        if len(out) >= limit * 2:
            out.append("      ... (more differences)")
            break
    return out


def pair_by_base_name(changes: list[Change]) -> list[Change]:
    """Pair a delete with an add that share a file name, when git could not (a tiny file whose
    every line changed has no similarity to its old self). The content test then judges the pair."""
    deleted = [c for c in changes if c.status == "D"]
    added = [c for c in changes if c.status == "A"]
    paired: set[int] = set()
    out = [c for c in changes if c.status not in "AD"]
    for d in deleted:
        name = os.path.basename(d.old)
        same_d = [x for x in deleted if os.path.basename(x.old) == name]
        same_a = [x for x in added if os.path.basename(x.new) == name]
        if len(same_d) == 1 and len(same_a) == 1:
            a = same_a[0]
            out.append(Change("R", d.old, a.new, d.old_mode, a.new_mode, d.old_oid, a.new_oid))
            paired.update((id(d), id(a)))
    out += [c for c in deleted + added if id(c) not in paired]
    return out


def stale_mentions(repo: Repo, rev: str, renames: list[tuple[str, str]], config: dict) -> list[str]:
    """Files that still name an old path after the commit. A warning only: history stays as written."""
    if not renames:
        return []
    import tempfile

    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf8") as handle:
        handle.write(chr(10).join(old for old, _ in renames) + chr(10))
        name = handle.name
    try:
        done = subprocess.run(
            ["git", "-C", repo.root, "grep", "-n", "-I", "-F", "-f", name, rev, "--"],
            capture_output=True, check=False,
        )
    finally:
        os.unlink(name)
    generated = [glob_to_regex(g) for g in config["generated"]]
    notes = []
    for line in done.stdout.decode("utf8", "replace").splitlines():
        parts = line.split(":", 3)
        if len(parts) < 4:
            continue
        path = parts[1]
        if any(path.startswith(h) for h in config["history"]) or any(g.match(path) for g in generated):
            continue
        notes.append(f"{path}:{parts[2]}: still names a moved file's old path: {parts[3].strip()[:120]}")
    return notes


def stale_importers(repo, rev, changes, table, old_tree, new_tree, is_generated, history) -> list[str]:
    """Files the commit did NOT touch that still name a moved file by its old path.

    A diff of changed files cannot see these: an importer nobody updated has the same text before
    and after. It is exactly the quiet failure of a move (a `vi.mock` path that no longer matches
    anything), so every untouched file that could name a moved file is read too.
    """
    if not table.files:
        return []
    stems = set()
    for old in table.files:
        base = os.path.basename(old)
        stem = base.split(".")[0]
        if stem in ("index", "__init__"):
            stem = os.path.basename(os.path.dirname(old)) or stem
        stems.add(stem)
    import tempfile

    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf8") as handle:
        handle.write(chr(10).join(sorted(stems)) + chr(10))
        name = handle.name
    try:
        done = subprocess.run(
            ["git", "-C", repo.root, "grep", "-l", "-I", "-F", "-f", name, rev, "--",
             "*.ts", "*.tsx", "*.js", "*.jsx", "*.mjs", "*.cjs", "*.mts", "*.cts", "*.py", "*.md"],
            capture_output=True, check=False,
        )
    finally:
        os.unlink(name)
    touched = {c.new for c in changes} | {c.old for c in changes}
    candidates = []
    for line in done.stdout.decode("utf8", "replace").splitlines():
        path = line.split(":", 1)[1] if ":" in line else line
        if path in touched or is_generated(path) or path not in old_tree or any(path.startswith(h) for h in history):
            continue
        candidates.append(path)
    blobs = repo.blobs([f"{rev}:{p}" for p in candidates])
    problems: list[str] = []
    for path in candidates:
        try:
            text = blobs[f"{rev}:{path}"].decode("utf8")
        except UnicodeDecodeError:
            continue
        found: list[str] = []
        if path.endswith(JS_EXT):
            for start, _end, spec in js_specs(text):
                before = resolve_js(old_tree, path, spec)
                if before is not None and resolve_js(new_tree, path, spec) != table.map_file(before):
                    line_no = text.count(chr(10), 0, start) + 1
                    found.append(f'line {line_no}: path "{spec}" pointed at {before}, which is now {table.map_file(before)}')
        elif path.endswith(".md"):
            for start, _end, target in md_links(text):
                part = re.split(r"[#?]", target, maxsplit=1)[0]
                before = resolve_link(old_tree, path, part) if part else None
                if before is not None and resolve_link(new_tree, path, part) != table.map_file(before):
                    line_no = text.count(chr(10), 0, start) + 1
                    found.append(f'line {line_no}: link "{target}" pointed at {before}, which is now {table.map_file(before)}')
        elif path.endswith(".py"):
            parsed = python_imports(text, path)
            if parsed is not None:
                for (_kind, name, _alias) in parsed[1]:
                    if table.map_dotted(name) != name:
                        found.append(f"imports {name}, which is now {table.map_dotted(name)}")
        for item in found[:5]:
            problems.append(f"  {path}: not in the commit, but still names a moved file the old way: {item}")
    return problems


def is_code_free_package_marker(path: str, blob: bytes) -> bool:
    """True for an added `__init__.py` that holds no code: nothing but a docstring and comments."""
    if os.path.basename(path) != "__init__.py":
        return False
    try:
        body = ast.parse(blob.decode("utf8")).body
    except (SyntaxError, UnicodeDecodeError, ValueError):
        return False
    return not body or (len(body) == 1 and isinstance(body[0], ast.Expr) and isinstance(body[0].value, ast.Constant) and isinstance(body[0].value.value, str))


def check_commit(repo: Repo, rev: str, config: dict) -> tuple[list[str], list[str]]:
    generated = [glob_to_regex(g) for g in config["generated"]]
    is_generated = lambda p: any(g.match(p) for g in generated)  # noqa: E731
    parent = repo.parent_of(rev)
    all_changes = changes_of(repo, parent, rev)
    problems: list[str] = []

    changes = [c for c in all_changes if not (is_generated(c.old) or is_generated(c.new))]
    changes = pair_by_base_name(changes)
    added = [c for c in changes if c.status == "A" and os.path.basename(c.new) == "__init__.py"]
    if added:
        markers = repo.blobs([c.new_oid for c in added])
        free = {id(c) for c in added if is_code_free_package_marker(c.new, markers[c.new_oid])}
        changes = [c for c in changes if id(c) not in free]
    renames = [(c.old, c.new) for c in changes if c.status == "R" and c.old != c.new]
    for c in changes:
        if c.status == "A":
            problems.append(f"  {c.new}: ADDED with no matching delete (not a move)")
        elif c.status == "D":
            problems.append(f"  {c.old}: DELETED with no matching add (not a move)")
        elif c.status == "C":
            problems.append(f"  {c.new}: COPIED from {c.old} (not a move)")
        elif c.old_mode != c.new_mode:
            problems.append(f"  {c.new}: file mode changed ({c.old_mode} -> {c.new_mode})")
    if problems:
        return problems, []

    table = MoveTable(renames)
    old_tree, new_tree = repo.tree(parent), repo.tree(rev)
    blobs = repo.blobs([c.old_oid for c in changes] + [c.new_oid for c in changes])
    for c in changes:
        old_bytes, new_bytes = blobs[c.old_oid], blobs[c.new_oid]
        label = f"{c.old} -> {c.new}" if c.old != c.new else c.new
        looks_binary = b"\0" in old_bytes or b"\0" in new_bytes
        if looks_binary or (old_bytes == new_bytes and c.old == c.new):
            if old_bytes != new_bytes:
                problems.append(f"  {label}: a binary file changed")
            continue
        try:
            old_text, new_text = old_bytes.decode("utf8"), new_bytes.decode("utf8")
        except UnicodeDecodeError:
            if old_bytes != new_bytes:
                problems.append(f"  {label}: a binary file changed")
            continue
        # A renamed file with identical bytes is still read: its own relative imports may now be wrong.
        notes, old_blank, new_blank, old_origin, new_origin = compare_file(c, old_text, new_text, table, old_tree, new_tree)
        if old_blank != new_blank or notes:
            problems.append(f"  {label}: changed beyond the allowed path edits" if old_blank != new_blank else f"  {label}: a path does not follow the move")
            problems += [f"      {n}" for n in notes]
            problems += show_difference(old_blank, new_blank, old_origin, new_origin, old_text, new_text)
    problems += stale_importers(repo, rev, changes, table, old_tree, new_tree, is_generated, config["history"])
    return problems, stale_mentions(repo, rev, renames, config)


def main() -> int:
    parser = argparse.ArgumentParser(description="Prove a commit only moved files and fixed references to them.")
    parser.add_argument("commit", help="a commit, or a range a..b (each commit in it is checked on its own)")
    parser.add_argument("--repo", default=os.getcwd(), help="repository to check (default: current folder)")
    args = parser.parse_args()
    try:
        repo = Repo(os.path.abspath(args.repo))
        config = load_config()
        revs = repo.commits(args.commit)
        if not revs:
            print(f"check_move_commit: no commits in {args.commit}")
            return 2
        failed = 0
        for rev in revs:
            problems, notes = check_commit(repo, rev, config)
            if problems:
                failed += 1
                print(f"FAIL {repo.title(rev)}")
                print("\n".join(problems))
            else:
                print(f"ok   {repo.title(rev)}")
            for note in notes[:15]:
                print(f"  note: {note}")
            if len(notes) > 15:
                print(f"  note: ... and {len(notes) - 15} more")
        if failed:
            print(f"\n{failed} of {len(revs)} commit(s) did more than move files. Fix, or split the commit.")
            return 1
        return 0
    except (RuntimeError, OSError) as err:
        print(f"check_move_commit: {err}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
