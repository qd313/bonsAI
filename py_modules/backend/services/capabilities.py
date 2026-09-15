"""Title: The five permissions the user grants, and the one question "am I allowed to"

Purpose: The plugin can do five things that a person would want to be asked about
first: write files to the Desktop, look through the Steam screenshot and video
library, read Steam's own logs, talk to Steam's servers over the internet with the
user's key, and switch the microphone on. Each one is a switch in the Permission
Center, off until it is turned on. This file holds the list of the five, decides
what a saved settings file means when it says something odd, and answers the single
question every piece of code asks before doing one of those five things: am I
allowed to.

Used for: the Permission Center screen, which shows and sets the five switches; the
check at the top of every piece of code that does one of those five things; and
settings files written before the switches existed, which need a sensible answer
rather than an empty one.

Solves: without one shared list and one shared answer, "is the microphone allowed"
would be decided slightly differently in each place that asks, and a permission
added later would be enforced in some places and not others.

Does not: stop anything happening. Nothing here blocks a file write or opens a
microphone. It only answers yes or no, and the code that asked has to respect the
answer. A caller that forgets to ask is not caught by anything in this file.

How the answer is decided, in order -- the first "no" wins:

    is the Kids lock on this session?  -- yes --> NO
                 |
                 no
                 v
    is this one of the five names?     -- no  --> NO
                 |
                yes
                 v
    does the saved file have a         -- no  --> NO
    permissions block at all?
                 |
                yes
                 v
    is this one set to exactly true?   -- no  --> NO
                 |
                yes
                 v
                YES

Gotchas:
  - **The Kids lock is not a saved setting.** It mirrors Steam's own parental lock
    for the length of one session; the screen pushes it in and it is never written
    to disk. It is checked before the name is, so a permission added to the list in
    future is denied by it automatically, without anyone remembering to wire it up.
  - **Almost nothing counts as yes.** The string "true", the word "yes", and
    anything else all read as off. A settings file that has been hand-edited or
    half-written fails closed, not open. The one exception is the number 1, which
    the tidy-up step accepts and turns into a real yes; the direct check does not
    accept it. So a permissions block that has never been through the tidy-up and
    holds a 1 reads as off, and the same block after tidying reads as on. Nothing
    writes a 1 today -- this is only worth knowing before adding a second way in.
  - **Old settings files get three of the five, not all five.** A settings file from
    before the switches existed is treated as having granted what the plugin was
    already doing at the time: writing files, reading the screenshot library, and
    reading Steam's logs. Two are deliberately left off even so -- talking to
    Steam's servers, because that spends the user's own key on traffic they never
    agreed to, and the microphone, because it is a microphone.
"""

from typing import Any

# Fixed keys persisted under settings["capabilities"]; keep in sync with frontend BonsaiSettings.
CAPABILITY_KEYS = (
    "filesystem_write",
    "media_library_access",
    "steam_logs_read",
    "steam_web_api",
    "microphone_access",
)

# Session Kids master lock (Steam parental). Not persisted — frontend pushes via RPC.
# Checked first in capability_enabled so every key (including future Web) denies while active.
_kids_lock_active: bool = False


def set_kids_lock_active(active: bool) -> None:
    """Set the session Kids lock flag (does not rewrite stored capabilities)."""
    global _kids_lock_active
    _kids_lock_active = bool(active)


def kids_lock_active() -> bool:
    """True when Steam parental lock is active this session."""
    return _kids_lock_active


def sanitize_capabilities(value: Any) -> dict[str, bool]:
    """Normalize capabilities to a full dict; missing keys default to False."""
    raw = value if isinstance(value, dict) else {}
    out: dict[str, bool] = {}
    for key in CAPABILITY_KEYS:
        v = raw.get(key)
        if isinstance(v, bool):
            out[key] = v
        else:
            out[key] = v is True or v == 1
    return out


def legacy_grandfather_capabilities() -> dict[str, bool]:
    """All-on defaults for settings files created before the capabilities block existed."""
    out = {k: True for k in CAPABILITY_KEYS}
    # Outbound Steam Web API uses the user's key; do not auto-enable for legacy installs.
    out["steam_web_api"] = False
    # Microphone capture is opt-in even for legacy installs.
    out["microphone_access"] = False
    return out


def capability_enabled(settings: dict, key: str) -> bool:
    """True when settings explicitly enable a capability (unknown keys are denied).

    Kids lock denies every key in CAPABILITY_KEYS while active — including any future
    Web capability that joins the tuple — without mutating sanitize_capabilities output.
    """
    if _kids_lock_active:
        return False
    if key not in CAPABILITY_KEYS:
        return False
    caps = settings.get("capabilities")
    if not isinstance(caps, dict):
        return False
    return caps.get(key) is True
