"""Deterministic Ask keywords for bonsAI global quick-launch (Guide chord) setup guidance."""

from __future__ import annotations

from typing import Literal, Optional

# Match sanitizer: trim + casefold, plus one optional leading / (e.g. paste from chat)
COMMAND_SHORTCUT_DECK = "bonsai:shortcut-setup-deck"
COMMAND_SHORTCUT_STADIA = "bonsai:shortcut-setup-stadia"

TROUBLESHOOTING_S5 = "docs/troubleshooting.md — **§5. bonsai shortcut setup**"


def normalize_command_input_with_slash(text: str) -> str:
    """Trim, casefold, and strip a single leading slash for paste-friendly matching."""
    s = (text or "").strip().casefold()
    if s.startswith("/"):
        s = s[1:].lstrip()
    return s


def classify_shortcut_setup_command(text: str) -> Optional[Literal["deck", "stadia"]]:
    """Return deck/stadia if ``text`` is a shortcut-setup keyword, else ``None``."""
    key = normalize_command_input_with_slash(text)
    if key == COMMAND_SHORTCUT_DECK.casefold():
        return "deck"
    if key == COMMAND_SHORTCUT_STADIA.casefold():
        return "stadia"
    return None


def response_message_for_shortcut(variant: Literal["deck", "stadia"]) -> str:
    """
    User-visible guidance only. bonsAI does not write Steam Input / VDF files; users build the
    chord in Steam. See TROUBLESHOOTING_S5 in-repo.
    """
    common = (
        f"**bonsAI cannot create Steam Input macros automatically** (no supported API; your controller "
        f"stays under your control). This message skips the model and points you to the full recipe: "
        f"{TROUBLESHOOTING_S5}.\n\n"
        f"**Steps (summary):**\n"
        f"1. Open **Controller** settings (use **Open Controller settings** below if enabled in Permissions).\n"
        f"2. **Guide Button Chord Layout** — **Edit** — pick a trigger.\n"
        f"3. Add commands: **System → Quick Access Menu**, then *D-pad* moves to **Decky**, **A** to open Decky, "
        f"then *D-pad* to **bonsAI**, **A** to open. Use **Add Extra Command**; tune **Fire Start Delay** per step "
        f"({TROUBLESHOOTING_S5}).\n\n"
    )
    if variant == "deck":
        return common + (
            "**Steam Deck (example chord):** Hold **Steam (Guide)** + **R4** (or a back grip) as the trigger, "
            "then the macro chain above. *D-pad* counts and delays depend on your QAM and Decky list order—"
            "they are not universal; tune in the chord settings."
        )
    return common + (
        "**Stadia (or non-Deck) controller:** There is no **R4**; choose a **spare** that does not match in-game "
        "actions (e.g. a back paddle, **Capture**, or a face button you remap in Steam’s controller screen). "
        "The macro shape is the same: **Guide chord** (hold Stadia/Guide + that button), then *System* → *QAM* → "
        "navigate to **Decky** → **bonsAI** with delays as in the doc."
    )
