"""Title: Fitting a question into the room a model was loaded with

Purpose: Before a question goes out, this works out whether it (plus the reply budget) will
actually fit inside the context window the model was loaded with, and if not, shrinks the
visible reply -- never the thinking budget -- so the prompt does not lose its own start on the
wire. Ollama does not trim overflow gently; it drops the start of the prompt, which is exactly
the identity, rules and cards a person never sees go missing.

Used for: `clamp_num_predict_to_window()` is called before every streamed request. The smaller
helpers around it (`estimate_prompt_tokens`, `prompt_window_warning`, `ollama_base_from_chat_url`)
are the pieces that decision is built from, and are exported on their own so each can be tested
without a network.

Solves: A prompt that overflows the window used to fail silently -- a confident answer with
nothing behind it. Shrinking the visible reply share by a known amount is a worse-but-honest
outcome instead.

Does not: Decide the actual window size for a model on a real server -- that is
`resolve_window_tokens` / `known_window_tokens` in token_accounting_service. This file only
does the arithmetic once a window size is known.
"""

from typing import Optional

from backend.services.token_accounting_service import (
    FALLBACK_WINDOW_TOKENS,
    estimate_tokens_from_chars,
    tokens_that_survive_overflow,
)

# Decision D46 (2026-09-01). Measured on the Deck: Ollama loads gemma4:e2b-it-qat with
# context_length 4096 and nothing here sets num_ctx. A prompt that does not fit is not rejected;
# Ollama keeps the *end* and drops the *start*, which is the identity block, the rules and the
# cards, and the user sees a confident answer with nothing behind it.
#
# Re-measured on the Deck 2026-09-20 on Ollama 0.34.1, and both halves are now worse than this
# comment said. The 4,096 is only this server's default -- the model itself advertises 131,072,
# and loading it with 16,384 cost 0.59 GB of memory and NOTHING in speed, with a game running.
# And overflow is a cliff, not a slope: 4,220 tokens into a 4,096-token window delivered 2,051,
# and so did 19,620. One token too many costs about half of everything sent.
#
# So the window is no longer assumed here. ``resolve_window_tokens`` asks the server what the
# model is really loaded with; this name is kept only as the fallback for a server that cannot
# be asked. See backend/services/token_accounting_service.py.
ASSUMED_CONTEXT_WINDOW_TOKENS = FALLBACK_WINDOW_TOKENS


def ollama_base_from_chat_url(chat_url: str) -> str:
    """Turn ``http://host:port/api/chat`` back into ``http://host:port``.

    The streaming call is handed a finished chat address, but asking how much room a model was
    loaded with is a different endpoint on the same server. Anything that is not the expected
    shape comes back unchanged, and the caller falls back to the assumed window.
    """
    base = str(chat_url or "").strip()
    suffix = "/api/chat"
    if base.endswith(suffix):
        return base[: -len(suffix)]
    return base


def estimate_prompt_tokens(messages: list, model_name: str = "") -> int:
    """Rough token count for the text of a chat request; images are not counted.

    The characters-per-token figure is learned from the real counts Ollama returns after every
    reply (``note_real_counts``), because the fixed 3.5 this used to divide by made the plugin's
    own prompts look about a quarter bigger than they are -- measured 4.30 to 4.48 characters
    per token across the three Ask modes on the Deck, 2026-09-20. Over-counting is not free:
    it is taken straight out of the visible reply by ``clamp_num_predict_to_window`` below.
    """
    chars = 0
    for m in messages or []:
        if isinstance(m, dict):
            chars += len(str(m.get("content") or ""))
    return estimate_tokens_from_chars(chars, model_name)


def prompt_window_warning(
    messages: list,
    num_predict: int,
    *,
    window_tokens: int = ASSUMED_CONTEXT_WINDOW_TOKENS,
    model_name: str = "",
) -> Optional[str]:
    """One-line warning when prompt + reply budget would not fit the window, else None."""
    est = estimate_prompt_tokens(messages, model_name)
    need = est + int(num_predict or 0)
    if need <= window_tokens:
        return None
    survives = tokens_that_survive_overflow(window_tokens)
    return (
        f"ask_ollama: prompt ~{est} tokens + num_predict {int(num_predict or 0)} = {need} exceeds the "
        f"{window_tokens}-token window by ~{need - window_tokens}; Ollama does NOT trim to the edge -- "
        f"measured on the Deck 2026-09-20, about {survives} tokens survive however far over this goes, "
        "and the part lost is the START (identity, rules, cards). Trim what is attached (D46)."
    )


# D46 follow-up (2026-09-06): the warning above told the log the truth and left the Ask
# unchanged, so the prompt still lost its start on the wire. Once the prompt itself is slimmed
# and the knowledge-base block moved late, most overflow left is exactly the visible reply
# budget stacked on top of a thinking budget (Strategy + thinking medium runs ~2,800 prompt
# tokens against a 2,112 reply budget in a 4,096 window). Shrinking the visible half instead of
# sending the request unchanged means the reply is short rather than the prompt losing its
# identity, rules and cards. The thinking budget is never touched -- a user who turned thinking
# on asked for that reasoning headroom specifically.
MIN_VISIBLE_NUM_PREDICT = 600


def clamp_num_predict_to_window(
    messages: list,
    visible_num_predict: int,
    thinking_budget: int,
    *,
    window_tokens: int = ASSUMED_CONTEXT_WINDOW_TOKENS,
    floor_visible: int = MIN_VISIBLE_NUM_PREDICT,
    model_name: str = "",
) -> int:
    """Wire ``num_predict`` (visible + thinking) shrunk so the prompt fits, thinking left whole.

    Returns ``visible_num_predict + thinking_budget`` unchanged when it already fits. Otherwise
    takes the overflow out of the visible share only, down to ``floor_visible`` -- past that
    point the floor is sent anyway (a short reply beats a prompt that loses its start), and the
    caller's own ``prompt_window_warning`` still fires on the result.
    """
    est = estimate_prompt_tokens(messages, model_name)
    total = int(visible_num_predict) + int(thinking_budget)
    if est + total <= window_tokens:
        return total
    room_for_visible = window_tokens - est - int(thinking_budget)
    new_visible = max(int(floor_visible), room_for_visible)
    return new_visible + int(thinking_budget)
