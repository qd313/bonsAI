"""Title: Which build of the plugin is installed

Purpose: Reads the plugin's main script file (dist/index.js) once, when the
back end starts, and keeps two facts about it: the first 12 characters of its
sha256 fingerprint and the time the file was last changed. The About tab shows
the fingerprint next to the version number so a tester can tell two builds
with the same version apart.
Used for: the get_build_info call that the About tab makes.
Solves: "Version 0.5.0" being the only thing on screen, with no way to tell
which build is on the Deck. The fingerprint is the same one the Deck drivers
record by running sha256sum on that file, so the two can be compared.
Does not: change anything on disk, or notice a file replaced after the back
end started (a reload of the plugin starts it again).
"""

from __future__ import annotations

import hashlib
import os
from typing import Dict, Optional

UNKNOWN = "unknown"
_cache: Optional[Dict[str, object]] = None


def read_build_info(plugin_root: str) -> Dict[str, object]:
    """In: the plugin folder. Out: {"build": 12 hex chars or "unknown", "modified": seconds or None}.

    Can go wrong: nothing; an unreadable or missing file gives "unknown".
    """
    path = os.path.join(plugin_root, "dist", "index.js")
    try:
        with open(path, "rb") as handle:
            digest = hashlib.sha256(handle.read()).hexdigest()[:12]
        return {"build": digest, "modified": os.path.getmtime(path)}
    except OSError:
        return {"build": UNKNOWN, "modified": None}


def get_build_info_cached(plugin_root: str) -> Dict[str, object]:
    """Same as read_build_info, but reads the file only the first time."""
    global _cache
    if _cache is None:
        _cache = read_build_info(plugin_root)
    return dict(_cache)
