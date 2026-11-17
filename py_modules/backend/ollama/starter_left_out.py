"""Title: The pieces of the starter set, which of them a person left out, and how far each got

Purpose: The first-time setup (plan 105, lane D3) shows the starter set as five pieces, each with a tick box:
Ollama, the answer model, the note-search model, the speech models and the voice engine. Ollama and the answer
model are always ticked; the note-search model can be unticked, and the speech models and the voice engine can
be unticked together (Voice input needs both). This file reads that choice from the start call, takes the
left-out note-search model out of the pull list, keeps a small record of how far each piece got while the run
goes (waiting, done, failed or left out), and writes the plain sentence that says what was left out.

Used for: start_local_ollama_setup (ollama_local_setup_rpc.py, which reads the choice and keeps it in the
reload note), run_local_setup (local_ollama_setup_service.py) and run_starter_downloads (starter_set_extras.py).

Solves: A piece the person left out must never be downloaded behind their back, including when a plugin reload
starts the run again by itself; and a run that is stopped part way must be able to say what it kept.

Does not: Check any permission, download anything, or decide what the screen shows (the screen reads
`starter_pieces` from the run's status and writes its own words).
"""

from __future__ import annotations

from typing import Any

from backend.ollama.ollama_routing import STARTER_NOTE_SEARCH_TAG, tag_in_names

# What the start call may ask to leave out. Ollama and the answer model never: without them nothing answers.
LEAVE_OUT_PIECES: tuple[str, ...] = ("note_search", "voice")

# Every piece of the starter set, in the order the run reaches them.
STARTER_PIECES: tuple[str, ...] = ("ollama", "answer", "note_search", "speech", "voice")

# One sentence per left-out choice: what was left out, and where it is offered again.
_LEFT_OUT_SENTENCES = {
    "note_search": ("the note-search model", "The knowledge base offers it when you use it."),
    "voice": ("the speech models and the voice engine", "Voice input offers them the first time you use it."),
}


def parse_leave_out(raw: Any) -> tuple[str, ...]:
    """The pieces asked to be left out, in a fixed order; anything that is not a known piece is ignored."""
    if not isinstance(raw, (list, tuple)):
        return ()
    asked = {item for item in raw if isinstance(item, str)}
    return tuple(piece for piece in LEAVE_OUT_PIECES if piece in asked)


def drop_left_out_tags(tags: list[str], leave_out: tuple[str, ...]) -> list[str]:
    """The starter set's Ollama tags without the note-search model when it was left out."""
    if "note_search" not in leave_out:
        return list(tags)
    return [tag for tag in tags if not tag_in_names(tag, [STARTER_NOTE_SEARCH_TAG])]


def starter_pieces_at_start(leave_out: tuple[str, ...]) -> dict[str, str]:
    """Every piece waiting, except the ones left out."""
    pieces = {piece: "waiting" for piece in STARTER_PIECES}
    if "note_search" in leave_out:
        pieces["note_search"] = "left_out"
    if "voice" in leave_out:
        pieces["speech"] = pieces["voice"] = "left_out"
    return pieces


def mark_piece(state: dict[str, Any], piece: str, status: str) -> None:
    """Record how far one piece got, on a run that keeps the record; a left-out piece stays left out."""
    pieces = state.get("starter_pieces")
    if isinstance(pieces, dict) and piece in pieces and pieces[piece] != "left_out":
        pieces[piece] = status


def piece_for_tag(tag: str) -> str:
    """Which piece an Ollama tag of the starter set is."""
    return "note_search" if tag_in_names(tag, [STARTER_NOTE_SEARCH_TAG]) else "answer"


def left_out_sentence(leave_out: tuple[str, ...] | list[str]) -> str:
    """'Left out, as you chose: …' and where each is offered again; empty when nothing was left out."""
    chosen = [piece for piece in LEAVE_OUT_PIECES if piece in leave_out]
    if not chosen:
        return ""
    names = [_LEFT_OUT_SENTENCES[piece][0] for piece in chosen]
    joined = names[0] if len(names) == 1 else f"{names[0]}, {names[1]}"
    offers = " ".join(_LEFT_OUT_SENTENCES[piece][1] for piece in chosen)
    return f"Left out, as you chose: {joined}. {offers}"
