"""Title: A hidden-block mark with nothing between the label and the closing backticks

Purpose: A small model sometimes writes "```bonsai-spoiler```" (the label between two sets of
backticks) as both the opening and the closing mark of a hidden block. Read as ordinary fences that
is an empty block, twice, and the sentence between the two stays in plain view. This turns each such
mark into what it stands for: outside a hidden block it opens one, inside it closes it, each on its
own line. The screen does the same in src/utils/expandOneLineSpoilerFences.ts (plan 78).
Used for: strategy_spoiler_policy.move_midline_fence_openers_to_line_start (the live and finished
spoiler coverers) and chat_memory_service.strip_fenced_blocks (the chat's memory and its summary).
Solves: The Deck (Speed mode, Hades) saved a reply whose marks were written this way; the page drew
no cover, and a saved summary or the next question's memory would have carried the sentence along.
Does not: touch an ordinary block, a longer fence mark, or any other kind of fence. Text with no such
mark comes back byte for byte unchanged.
"""

from __future__ import annotations

import re

# One token per backtick run that matters when telling whether a line is inside a hidden block: the
# empty-label mark, an ordinary opener, or a bare fence mark. The last line may end in a mark still
# being typed (one or two closing backticks so far).
_TOKEN_RE = re.compile(
    r"(?<!`)```bonsai-spoiler[ \t]*```(?!`)|(?<!`)```bonsai-spoiler|(?<!`)```(?!`)"
)
_TOKEN_STREAMING_RE = re.compile(
    r"(?<!`)```bonsai-spoiler[ \t]*(?:```(?!`)|`{1,2}$)|(?<!`)```bonsai-spoiler|(?<!`)```(?!`)"
)
_EMPTY_LABEL_RE = re.compile(r"^```bonsai-spoiler[ \t]*`{1,3}$")
_BARE_CLOSER_LINE_RE = re.compile(r"^[ \t>]*```[ \t]*$")
# What may stand before a mark on its own line: indent, quote marks, list markers.
_LINE_START_ONLY_RE = re.compile(r"^[ \t>]*(?:(?:[-*+]|\d+[.)])[ \t]+[ \t>]*)*$")
_QUICK_RE = re.compile(r"```bonsai-spoiler[ \t]*`")


def repair_empty_label_marks(text: str) -> str:
    """Turn each "```bonsai-spoiler```" mark into an opener or a closer on its own line."""
    if not _QUICK_RE.search(text):
        return text
    inside = False
    lines = text.split("\n")
    last = len(lines) - 1
    repaired: list[str] = []
    for index, line in enumerate(lines):
        if "`" not in line:
            repaired.append(line)
            continue
        out = ""
        pos = 0
        opened_here = False
        for m in (_TOKEN_STREAMING_RE if index == last else _TOKEN_RE).finditer(line):
            token = m.group(0)
            if _EMPTY_LABEL_RE.match(token):
                before = out + line[pos : m.start()]
                tail = before[before.rfind("\n") + 1 :]
                mark = "```" if inside else "```bonsai-spoiler"
                inside = not inside
                out = before + ("" if _LINE_START_ONLY_RE.match(tail) else "\n") + mark
                if line[m.end() :].strip():
                    out += "\n"
                pos = m.end()
            elif token == "```bonsai-spoiler":
                if not inside:
                    inside = opened_here = True
            elif inside and (opened_here or _BARE_CLOSER_LINE_RE.match(line)):
                inside = False
        repaired.append(out + line[pos:])
    return "\n".join(repaired)
