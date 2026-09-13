"""
Title: model-routing-check
Purpose: Prompt-time hook. On every prompt it hands the session the maintainer's plain-language rule,
         and when the prompt reads like the start of a bug fix, feature, refactor or lane session it
         also reports the model and effort in use with the short routing table, asking for a gentle
         one-line heads-up when they do not match. On SubagentStart it hands the lane the same
         plain-language rule so reports come back readable.
Used for: the two things the maintainer otherwise has to type into the first prompt of every session.
Solves: instructions that live in CLAUDE.md or memory get buried under a long system prompt; a line
        injected next to the prompt itself does not. AGENTS.md is never loaded by Claude Code at all.
Does not: block anything, pick a model, or judge the task itself.
"""
import json
import os
import re
import sys

PLAIN = (
    "Plain-language rule (hook; the maintainer has asked for this five times): everything written to the "
    "maintainer, in chat or in any document meant for them, is in simple, plain language. Short sentences. "
    "Lead with what a person using the plugin would notice, or what a number means for a decision, before any "
    "term of art. No internal identifiers (D22, KB-EVAL-02, n=1), no file paths or symbol names inside "
    "sentences, no metric shorthand (top-3, holdout, arm), no industry words where an everyday one exists "
    "(say 'the one running the session', not orchestrator; 'its own copy of the repo', not isolation; 'a test "
    "to find out', not a spike). Measurements are the highest-risk turn: say what changed for a person, then "
    "the number. Code-level detail belongs in commit messages, audit docs and test rows, not in replies."
)

KICKOFF = re.compile(
    r"\b(implement|build (it|this|the|out)|fix(ing)? (it|this|that|the|all|these|those|bug)|go ahead|^go\b"
    r"|start (on|with|the|phase|lane|implement|fix)|let'?s (do|start|begin|fix|implement|tackle|work|knock)"
    r"|work on|tackle|knock out|land (it|this|the)|ship|redo|refactor|redesign|kick ?off|lanes?\b"
    r"|orchestrat|subagents?\b|bug ?fix|next (bug|feature|item)|from (the )?roadmap)",
    re.I,
)

TABLE = (
    "Routing table (AGENTS.md section 3; evidence in docs/planning/33-model-routing.md): "
    "5-6 stars: Fable 5.1 max plans (decisions and lane briefs only), Sonnet 5 high lanes implement, Opus xhigh lands. "
    "3-4 stars: Opus xhigh plans and lands, Sonnet 5 high lanes implement when the cause is known. "
    "1-2 stars: Sonnet 5 high straight through, Opus xhigh reviews only if it touches focus or settings plumbing. "
    "Focus, layout, ui tags: Opus xhigh after a device measurement; never a lane without the measurement. "
    "Pixel polish: a measurement or a human, not a model tier. "
    "Refactor: Opus xhigh plans; Sonnet lanes do mechanical moves (max three lanes); Opus xhigh does behavior-touching steps. "
    "Bug or feature lane session: Opus xhigh orchestrates (Fable only when the same session plans 5-6 star scope); lanes never edit roadmap, testing or changelog rows. "
    "Docs, roadmap bookkeeping, explanations: Sonnet 5 high or Opus medium. "
    "Read-only lookups with a checkable answer: Haiku 4.5 on trial (log every use in plan 33 section 4a, grep-confirm, note if Sonnet had to step in) or Sonnet low. "
    "Deck QA: Opus xhigh writes rows and reads failures; Sonnet high may run rows already written; never Haiku. "
    "Max effort: Opus uses xhigh instead; Fable max only for 5-6 star decision lists or a bug that failed on the device twice. Ultracode only for read-only fan-out with Sonnet or Haiku workers. "
    "Escalate one tier only after the tier below failed on the device twice with a measurement in hand."
)


def last_turn(transcript_path):
    """Model and effort of the newest assistant turn in this session's transcript."""
    model = effort = None
    try:
        with open(transcript_path, encoding="utf-8", errors="replace") as fh:
            for line in fh:
                if '"type":"assistant"' not in line:
                    continue
                try:
                    rec = json.loads(line)
                except ValueError:
                    continue
                m = (rec.get("message") or {}).get("model")
                if m and m != "<synthetic>":
                    model, effort = m, rec.get("effort")
    except OSError:
        pass
    return model, effort


def settings_default():
    """Fallback for the first prompt of a session: the persisted user settings."""
    path = os.path.join(os.path.expanduser("~"), ".claude", "settings.json")
    try:
        with open(path, encoding="utf-8") as fh:
            d = json.load(fh)
        return d.get("model"), d.get("effortLevel")
    except (OSError, ValueError):
        return None, None


def emit(event, text):
    print(json.dumps({"hookSpecificOutput": {"hookEventName": event, "additionalContext": text}}))


def main():
    try:
        payload = json.load(sys.stdin)
    except ValueError:
        return
    event = payload.get("hook_event_name") or "UserPromptSubmit"
    if event == "SubagentStart":
        emit(event, PLAIN + " This applies to the report you return: the person running the session hands it on.")
        return
    prompt = (payload.get("prompt") or "").strip()
    if not prompt or prompt.startswith("<"):
        return
    text = PLAIN
    if KICKOFF.search(prompt):
        model, effort = last_turn(payload.get("transcript_path") or "")
        source = "this session's last turn"
        if not model:
            model, effort = settings_default()
            source = "the user settings default; no turn has run yet, so confirm against your own system prompt"
        text += (
            f" Model routing check: this session is running {model or 'an unknown model'} at effort "
            f"{effort or 'unknown'} (from {source}). The prompt looks like the start of a bug fix, feature, "
            "refactor or lane session. Find the roadmap entry's stars and tag, compare against the table below, "
            "and if this model or effort is outside the recommendation, open your reply with one gentle, plain "
            "sentence saying so and naming the recommended model and effort. Then continue unless the maintainer "
            "says otherwise. If it matches, say nothing about it. " + TABLE
        )
    emit("UserPromptSubmit", text)


if __name__ == "__main__":
    main()
