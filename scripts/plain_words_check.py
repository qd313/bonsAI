#!/usr/bin/env python3
"""Title: Plain-words header report

Purpose: List the app files whose header is written for somebody who already
knows this code. Every file in the project carries a header with the right
labels; this finds the ones where the labels are filled in with terms of art
instead of an explanation, and prints the everyday wording to use instead. It
exists to find work and to measure whether that work got done, not to judge any
one sentence.
Used for: `python scripts/plain_words_check.py` for a readable list, `--json`
for a machine list, `--file <path>` to check one file while rewriting it.
Solves: "Which headers still need rewriting" had no answer but reading all 311
of them, and a sweep with no list is a sweep that misses files.
Does not: Fail a run, block a commit, or appear in the numbers list. See the
gotcha below -- that is a deliberate choice, not an oversight.

How it works:
  1. `collect_app_files()` and `extract_header_text()` are imported from the
     header checker rather than rewritten, so the set of files scanned here is
     exactly the set the real gate checks. Two definitions of "app file" would
     drift apart within a phase.
  2. `word_hits()` matches whole words only, against `JARGON`, which groups
     spellings of the same idea together so "normalise", "normalized" and
     "normalisation" count once for a file rather than three times.
  3. Each group carries a plain-words suggestion in `SUGGESTIONS`. The point of
     the report is the suggestion; the count is only how the sweep is tracked.

Gotchas:
  - **This deliberately never fails a run.** The obvious next step is to add
    the count to the numbers list so it can only improve. It is not there on
    purpose. A word list cannot tell "surfaces the error to the player" from
    "the RPC surface", and it cannot tell a word that is genuinely this
    product's own vocabulary from lazy writing. During the phase that explained
    every file, a number that could not tell good writing from bad -- the file
    size count, which counted the explanations themselves -- made four separate
    workers write worse in order to satisfy it, and nobody noticed for a day.
    A word-list gate is the same shape of mistake: the cheapest way to pass it
    is to reach for a thesaurus, not to explain anything. The maintainer can
    overrule this; until then it reports and a person decides.
  - A file with no header at all does not appear here. That is the header
    checker's job and it is a real gate; a file cannot be missing from both.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from check_headers import (  # noqa: E402 -- needs the path line above
    collect_app_files,
    extract_header_text,
)

# Grouped by idea, not by spelling: every spelling of one idea counts once for
# a file. British and American spellings both appear in this repo's headers.
JARGON = {
    "rpc": ["rpc"],
    "persist": ["persist", "persists", "persisted", "persisting", "persistence", "persistent"],
    "normalise": ["normalise", "normalises", "normalised", "normalize", "normalizes",
                  "normalized", "normalizing", "normalisation", "normalization",
                  "normalizer", "normalizers", "normaliser", "normalisers"],
    "orchestrate": ["orchestrate", "orchestrates", "orchestrated", "orchestrating",
                    "orchestration", "orchestrator"],
    "registry": ["registry", "registries"],
    "payload": ["payload", "payloads"],
    "snapshot": ["snapshot", "snapshots", "snapshotting"],
    "surface": ["surface", "surfaces"],
    "serialise": ["serialise", "serialize", "serialized", "serialisation", "serialization",
                  "deserialise", "deserialize", "deserialized"],
    "hydrate": ["hydrate", "hydrates", "hydrated", "rehydrate", "hydration"],
    "lifecycle": ["lifecycle", "lifecycles"],
    "abstraction": ["abstraction", "abstractions"],
    "facade": ["facade", "singleton", "factory", "middleware"],
    "idempotent": ["idempotent", "idempotency", "idempotence"],
    "dispatch": ["dispatch", "dispatches", "dispatched", "dispatching", "dispatcher"],
    "mutate": ["mutate", "mutates", "mutated", "mutation", "mutations"],
    "memoize": ["memoise", "memoize", "memoised", "memoized", "memoization"],
    "debounce": ["debounce", "debounced", "debouncing", "throttle", "throttled", "throttling"],
    "invoke": ["invoke", "invokes", "invoked", "invoking", "invocation"],
    "instantiate": ["instantiate", "instantiates", "instantiated", "instantiation"],
    "encapsulate": ["encapsulate", "encapsulates", "encapsulated", "encapsulation"],
    "delegate": ["delegate", "delegates", "delegated", "delegation"],
    "coerce": ["coerce", "coerces", "coerced", "coercion"],
    "sanitise": ["sanitise", "sanitises", "sanitised", "sanitize", "sanitizes", "sanitized",
                 "sanitisation", "sanitization"],
    "schema": ["schema", "schemas", "schemata"],
    "boundary": ["boundary", "boundaries", "seam", "seams"],
    "contract": ["contract", "contracts"],
    "gate": ["gate", "gates", "gated", "gating"],
    "capability": ["capability", "capabilities"],
    "primitive": ["primitive", "primitives"],
    "reducer": ["reducer", "reducers", "selector", "selectors"],
    "emit": ["emitter", "emitters", "subscriber", "subscribers", "pubsub"],
    "traversal": ["traversal", "traverse", "traverses", "recursive", "recursion"],
    "shim": ["shim", "shims", "polyfill", "polyfills", "wrapper", "wrappers"],
    "pipeline": ["pipeline", "pipelines"],
    "provider": ["provider", "providers", "consumer", "consumers"],
    "state-machine": ["state machine", "finite state"],
    "ttl": ["ttl", "eviction", "evict", "invalidation", "invalidate", "invalidates"],
    "marshal": ["marshal", "marshals", "unmarshal"],
    "predicate": ["predicate", "predicates"],
    "atomic": ["atomic", "atomically", "atomicity"],
    "canonical": ["canonical", "canonicalise", "canonicalize", "canonicalised"],
    "bootstrap": ["bootstrap", "bootstraps", "bootstrapped", "bootstrapping"],
    "teardown": ["teardown", "tear-down", "tears down"],
    "introspect": ["introspect", "introspection"],
    "heuristic": ["heuristic", "heuristics"],
    "agnostic": ["agnostic"],
    "semantics": ["semantics"],
}

# What to write instead. These are the wordings agreed during the sweep, so six
# workers rewriting different files land on the same vocabulary rather than
# inventing a synonym each.
SUGGESTIONS = {
    "rpc": "name the two sides: \"the screen asks the back end\" / \"a question the screen can ask\"",
    "persist": "\"save\" / \"saved to disk\" / \"remembered between openings\"",
    "normalise": "\"tidy up\" / \"put into one shape\" / \"fill in anything missing\"",
    "orchestrate": "\"run in order\" / \"does the steps of\" -- or name the steps",
    "registry": "\"the one list of\" / \"where every X is written down once\"",
    "payload": "\"the message\" / \"what gets sent\" / name the thing being sent",
    "snapshot": "\"a copy taken at that moment\" / \"what the settings looked like then\"",
    "surface": "as a noun: \"the list of questions the screen can ask\"; "
               "as a verb: \"show\" / \"put on screen\"",
    "serialise": "\"turn into text to save\" / \"read back from the saved text\"",
    "hydrate": "\"fill in from what was saved\" / \"load back\"",
    "lifecycle": "name the moments: \"when it starts and when it stops\"",
    "abstraction": "say what it hides: \"one way to do X so callers do not each have to\"",
    "facade": "\"one front door to\" / \"the only copy\" / \"makes one of\"",
    "idempotent": "\"running it twice does the same as running it once\"",
    "dispatch": "\"send\" / \"hand to\" / \"start\"",
    "mutate": "\"change\" / \"changes the value in place\"",
    "memoize": "\"works it out once and remembers the answer\"",
    "debounce": "\"waits until typing stops\" / \"at most once every N\"",
    "invoke": "\"call\" / \"run\"",
    "instantiate": "\"make\" / \"create\"",
    "encapsulate": "\"keeps X to itself\" / \"nothing outside needs to know\"",
    "delegate": "\"hands off to\" / \"lets X do it\"",
    "coerce": "\"turn into\" / \"force to a number\" / \"accepts either and makes it a\"",
    "sanitise": "\"check and clean\" / \"drop anything that is not allowed\"",
    "schema": "\"the shape of\" / \"the list of fields and what each one holds\"",
    "boundary": "\"the line between the screen and the back end\" / \"where X stops and Y starts\"",
    "contract": "\"the promise\" / \"what both sides agreed\" / \"the shape both sides expect\"",
    "gate": "\"only lets it through when\" / \"blocks unless\" / \"asks permission first\"",
    "capability": "\"permission\" -- this product calls them permissions on screen",
    "primitive": "\"building block\" / \"the smallest piece\"",
    "reducer": "\"works out the new state from the old one and what happened\"",
    "emit": "\"tells whoever is listening\" / \"sends out\"",
    "traversal": "\"walks through\" / \"goes through every\"",
    "shim": "\"stands in for\" / \"a thin layer over\" -- or name what it wraps",
    "pipeline": "\"the steps in order\" -- or number them",
    "provider": "\"supplies\" / \"where X comes from\" / \"whoever uses it\"",
    "state-machine": "\"it is in one of these states, and moves between them like this\"",
    "ttl": "\"how long before it is asked again\" / \"thrown away after\"",
    "marshal": "\"pack into\" / \"unpack from\"",
    "predicate": "\"a yes/no test\" / \"the rule that decides\"",
    "atomic": "\"all of it happens or none of it does\"",
    "canonical": "\"the one true\" / \"the agreed spelling\" / \"the single version everything uses\"",
    "bootstrap": "\"the first setup\" / \"what runs before anything else\"",
    "teardown": "\"clean-up\" / \"what runs when it closes\"",
    "introspect": "\"looks at itself\" / \"reads its own\"",
    "heuristic": "\"a rule of thumb\" / \"a good guess, not a guarantee\"",
    "agnostic": "\"does not care which\" / \"works with any\"",
    "semantics": "\"what it means\" / \"the meaning of\"",
}

_WORD_RES = {
    group: [(w, re.compile(r"\b" + re.escape(w) + r"\b")) for w in words]
    for group, words in JARGON.items()
}


def word_hits(text: str) -> dict:
    """Groups of terms of art present in one header, each with the exact
    spellings found, so the report can quote the word back to the reader."""
    lower = text.lower()
    hits = {}
    for group, pairs in _WORD_RES.items():
        found = [w for w, rx in pairs if rx.search(lower)]
        if found:
            hits[group] = sorted(set(found))
    return hits


def scan(only: str | None = None) -> dict:
    """Walk every app file, read its header, and collect the ones using terms of
    art. Returns the whole report; `only` narrows it to a single path."""
    files = collect_app_files()
    if only:
        only_posix = only.replace(os.sep, "/")
        files = [f for f in files if f == only_posix]

    rows = []
    for rel in files:
        abs_path = os.path.join(REPO_ROOT, rel)
        try:
            with open(abs_path, "r", encoding="utf-8") as fh:
                lines = fh.readlines()
        except OSError:
            continue
        header = extract_header_text(rel, lines)
        if not header.strip():
            continue
        hits = word_hits(header)
        if not hits:
            continue
        rows.append({
            "file": rel,
            "groups": sorted(hits.keys()),
            "words": sorted({w for ws in hits.values() for w in ws}),
            "n_groups": len(hits),
        })

    rows.sort(key=lambda r: (-r["n_groups"], r["file"]))

    counts: dict = {}
    for row in rows:
        for group in row["groups"]:
            counts[group] = counts.get(group, 0) + 1

    return {
        "app_files_scanned": len(files),
        "files_using_terms_of_art": len(rows),
        "by_word": dict(sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))),
        "rows": rows,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Title: Plain-words header report",
    )
    parser.add_argument("--json", action="store_true", help="print one JSON object")
    parser.add_argument("--file", help="check a single file instead of all of them")
    args = parser.parse_args()

    report = scan(args.file)

    if args.json:
        print(json.dumps(report, indent=2))
        return 0

    for row in report["rows"]:
        print(f"{row['file']}")
        for group in row["groups"]:
            found = ", ".join(w for w in row["words"] if w in JARGON[group])
            print(f"    {found}  ->  {SUGGESTIONS.get(group, '')}")
        print()

    print(f"{report['files_using_terms_of_art']} of {report['app_files_scanned']} "
          f"app files have a header using terms of art.")
    print("This never fails a run. See the gotcha at the top of this file for why.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
