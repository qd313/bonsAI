"""Title: The rest of the starter set: the speech models and the plain words that report the whole run

Purpose: The starter set is more than the answer model. A first setup downloads three kinds of thing:
the answer model (gemma4:e2b-it-qat), the note-search model (nomic-embed-text, both through Ollama), and
the two speech models the microphone reads from (tiny.en and base.en, through the voice engine's own
download, not Ollama). This file runs the Ollama half one tag at a time (a model already there is not
downloaded again; one failing leaves the next going ahead), runs the speech download it is handed, and
writes the plain sentences that say what was downloaded, what was already there, and which piece failed.

Used for: run_local_setup (local_ollama_setup_service.py) for the "tier1_essentials" profile only.

Solves: Keeps the starter set's downloads reported in one place, in words a person reads on the AI
models tab, and keeps that logic out of the 1000-line Ollama setup file.

Does not: Download the speech models (starter_speech_models.py does, so this file, which the Ollama setup
file imports, never imports the voice download that imports the Ollama setup file back), pull anything itself,
or check the microphone permission: downloading a file is not listening, so the sentence only says when the
microphone is still off.
"""

from __future__ import annotations

import asyncio
from typing import Any, Callable, Optional

from backend.ollama.ollama_routing import tag_in_names

STARTER_SPEECH_MODELS: tuple[str, ...] = ("tiny.en", "base.en")


def split_present_tags(tags: list[str], installed: list[str]) -> tuple[list[str], list[str]]:
    """(to download, already installed) for the starter set's Ollama tags, in the order given."""
    to_pull: list[str] = []
    present: list[str] = []
    for tag in tags:
        (present if tag_in_names(tag, installed) else to_pull).append(tag)
    return to_pull, present


def pull_starter_tags(
    tags: list[str],
    installed: list[str],
    pull_one: Callable[[str], tuple[bool, str]],
    log: Callable[[str], None],
    cancelled: Callable[[], bool],
    on_step: Callable[[int, int, str], None],
) -> tuple[list[str], list[str], dict[str, str]]:
    """Download the starter set's Ollama tags one at a time (blocking).

    Returns (downloaded, already installed, {tag: short reason} for the ones that failed). A tag already on
    the Deck is reported as present and is not downloaded a second time. A tag that fails never stops the
    next one (the other pieces of the set still go ahead); only a cancel does.
    """
    to_pull, present = split_present_tags(tags, installed)
    for tag in present:
        log(f"[bonsAI] {tag} is already installed, so it is not downloaded again.")
    pulled: list[str] = []
    failures: dict[str, str] = {}
    for i, tag in enumerate(to_pull):
        if cancelled():
            raise RuntimeError("Cancelled.")
        on_step(i + 1, len(to_pull), tag)
        ok, err = pull_one(tag)
        if cancelled():
            raise RuntimeError("Cancelled.")
        if ok:
            pulled.append(tag)
        else:
            failures[tag] = short_reason(err)
            log(f"[bonsAI] {tag} did not download: {failures[tag]}")
    return pulled, present, failures


async def run_starter_downloads(
    state: dict[str, Any],
    tags: list[str],
    list_installed: Callable[[], list[str]],
    pull_one: Callable[[str], tuple[bool, str]],
    log: Callable[[str], None],
    cancelled: Callable[[], bool],
    speech_download: Optional[Callable[[Callable[[str], None], Callable[[str], None], Any], dict[str, str]]],
    cancel_event: Any,
) -> dict[str, Any]:
    """The starter set's downloads: the Ollama tags, then (if handed in) the speech models.

    Returns the outcome for `apply_starter_outcome`. Only a cancel stops the run early (it raises).
    """
    installed = await asyncio.to_thread(list_installed)

    def on_step(n: int, total: int, tag: str) -> None:
        state.update(pull_step=n, total_pull_steps=total, current_tag=tag, progress_text="")

    pulled, present, pull_failures = await asyncio.to_thread(
        lambda: pull_starter_tags(tags, installed, pull_one, log, cancelled, on_step)
    )
    speech_failures: Optional[dict[str, str]] = None
    if speech_download is not None:
        state["current_tag"] = ""
        speech_failures = await asyncio.to_thread(
            lambda: speech_download(log, lambda text: state.update(progress_text=text), cancel_event)
        )
        if cancelled():
            raise RuntimeError("Cancelled.")
    return {"pulled": pulled, "present": present, "pull_failures": pull_failures, "speech_failures": speech_failures}


def apply_starter_outcome(state: dict[str, Any], outcome: dict[str, Any], microphone_enabled: bool) -> None:
    """Add the starter set's closing sentences to the run's status; a piece that failed makes the run "failed"."""
    good, bad = starter_summary(microphone_enabled=microphone_enabled, **outcome)
    state["result_line"] = f"{state.get('result_line', '')} {good}".strip()
    if bad:
        state.update(phase="failed", stage="failed", error=f"{bad} {good}".strip())


def short_reason(text: str) -> str:
    first = (text or "").strip().splitlines()[0] if (text or "").strip() else ""
    return (first or "the download failed")[:160]


def _join(names: list[str]) -> str:
    if len(names) <= 1:
        return "".join(names)
    return ", ".join(names[:-1]) + " and " + names[-1]


def starter_summary(
    *,
    pulled: list[str],
    present: list[str],
    pull_failures: dict[str, str],
    speech_failures: Optional[dict[str, str]],
    microphone_enabled: bool,
) -> tuple[str, str]:
    """(what went well, what failed) as plain sentences; the second is empty when nothing failed.

    `speech_failures` is None when the speech models were not attempted (a cancelled run).
    """
    good: list[str] = []
    if pulled:
        good.append(f"Downloaded {_join(pulled)}.")
    if present:
        good.append(f"{_join(present)} {'was' if len(present) == 1 else 'were'} already installed.")
    if speech_failures is not None:
        ok = [m for m in STARTER_SPEECH_MODELS if m not in speech_failures]
        if ok:
            good.append(f"Speech models ready: {_join(ok)}.")
            if not microphone_enabled:
                good.append("Turn on Voice input (microphone) in the Permissions tab to use them.")
    bad: list[str] = []
    for tag, why in pull_failures.items():
        bad.append(f"{tag} did not download ({why}).")
    for model_id, why in (speech_failures or {}).items():
        bad.append(f"The {model_id} speech model did not download ({why}).")
    return " ".join(good), (" ".join(bad) + " The rest went ahead; press Install the starter set again to retry." if bad else "")
