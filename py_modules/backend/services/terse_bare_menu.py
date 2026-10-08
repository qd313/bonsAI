"""Title: Reading a choice menu the AI wrote as bare JSON

Purpose: In Terse mode (Speed answers in three lines) the AI is asked to end every answer with a
menu of choices, written as a fenced block. The small model on the Deck sometimes writes the menu
as a plain JSON object with no fence (three answers in ten on 2026-10-08), and the plugin used to
show that JSON as text inside the answer. This file finds such a menu at the end of the answer,
turns it into the same choice buttons a fenced menu gives, and takes it out of the text.

Used for: Terse Speed replies only. The Ask path calls `split_trailing_bare_branch_menu()` on the
finished reply and `hide_bare_branch_menu()` on the text shown while the answer is still arriving.
Strategy and Expert replies, and every reply with Terse off, never come through here.

Solves: raw JSON in the middle of an answer, and the missing buttons that went with it.

Does not: Handle a menu in the proper fence, a ```json fence or the bracket form (the fence readers
in strategy_guide_parse own those), or talk to the AI.

How it works:
 1. `_bare_menu_start()` looks for an object that opens with `{"question":` or `{"options":`,
    sits after whitespace (or at the very start), and is not inside a code block (an odd number of
    ``` marks before it means it is).
 2. `split_trailing_bare_branch_menu()` reads the object whole. If anything but blanks follows it,
    or it is whole JSON without both a question and an options list, it is not this menu and the
    text comes back exactly as it went in. If it is not whole JSON (cut off, a trailing comma),
    the tolerant reader in strategy_guide_parse gets one try.
 3. The result goes through the same checks as a fenced menu (a question, at least two real
    options, no placeholder dots). A menu that fails them is still cut out, with no buttons, so the
    player never reads raw JSON.
 4. `hide_bare_branch_menu()` is the live-text version: it also hides the first characters of the
    object (`{"que`) before the key has fully arrived.

Gotchas:
 - A menu-shaped object inside a ```json fence is read by the fence readers in strategy_guide_parse
   (as it was before this file existed), not here.
 - The cut text never ends up empty on its own: the caller supplies the "Choose where you are
   stuck below." line when an answer was nothing but a menu.
"""

from __future__ import annotations

import json
import re
from typing import Any

from backend.services.strategy_guide_parse import (
    _QUESTION_KEYS,
    _normalize_branch_payload,
    _parse_strategy_json_blob,
)

_BARE_MENU_OPEN_RE = re.compile(r'(?:^|(?<=\s))\{\s*"(?:question|options)"\s*:')
_BARE_MENU_PREFIXES = ('{"question":', '{"options":')


def _inside_open_code_block(text_before: str) -> bool:
    return text_before.count("```") % 2 == 1


def _bare_menu_start(text: str) -> int:
    """Where a bare menu object starts in the text, or -1 when there is none to consider."""
    for m in _BARE_MENU_OPEN_RE.finditer(text):
        if _inside_open_code_block(text[: m.start()]):
            continue
        return m.start()
    return -1


def split_trailing_bare_branch_menu(raw_text: str) -> tuple[str, dict[str, Any] | None]:
    """
    Take a trailing bare-JSON choice menu off a Terse Speed reply.

    Returns (text_without_the_menu, payload). The payload is the shape a fenced menu gives, or None
    when the object is there but unusable (one option, placeholder dots, cut off beyond repair):
    then the menu is still taken out so the player never reads raw JSON. When no menu-shaped object
    ends the text -- none at all, JSON with other keys, one inside a code block, or one followed by
    more prose -- the text comes back exactly as it went in.
    """
    text = raw_text or ""
    start = _bare_menu_start(text)
    if start < 0:
        return text, None
    blob = text[start:]
    try:
        data, end = json.JSONDecoder(strict=False).raw_decode(blob)
    except ValueError:
        # It opened like a menu and is not whole JSON (cut off, a trailing comma): the tolerant
        # reader gets one try, and the text goes either way.
        return text[:start].rstrip(), _normalize_branch_payload(_parse_strategy_json_blob(blob))
    if blob[end:].strip():
        return text, None  # more words follow the object: not a trailing menu
    if not isinstance(data, dict) or "options" not in data or not any(k in data for k in _QUESTION_KEYS):
        return text, None  # whole JSON, but not this menu
    return text[:start].rstrip(), _normalize_branch_payload(data)


def hide_bare_branch_menu(text: str) -> str:
    """Live view of a Terse Speed reply: cut a bare menu, even one still being written."""
    raw = text or ""
    head, _payload = split_trailing_bare_branch_menu(raw)
    if head != raw:
        return head
    # The first characters of the object arrive before its key does; do not let `{"que` flash.
    brace = raw.rfind("{")
    if brace >= 0 and (brace == 0 or raw[brace - 1].isspace()):
        tail = "".join(raw[brace:].split())
        if any(p.startswith(tail) for p in _BARE_MENU_PREFIXES) and not _inside_open_code_block(raw[:brace]):
            return raw[:brace].rstrip()
    return raw
