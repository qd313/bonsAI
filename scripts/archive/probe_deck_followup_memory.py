#!/usr/bin/env python3
"""Did the follow-up memory change what the search found, on this Deck?

Runs the memory the same way game_ai_request does -- remember the subject from the first
question, then augment the follow-up's search words -- and prints what each search attaches,
against the corpus actually installed here. Read-only apart from the embedding calls.
"""
import json
import os
import re
import sys

PLUGIN_DIR = "/home/deck/homebrew/plugins/bonsAI"
SETTINGS_PATH = "/home/deck/homebrew/settings/bonsAI/settings.json"
sys.path.insert(0, PLUGIN_DIR)
sys.path.insert(0, os.path.join(PLUGIN_DIR, "py_modules"))

from backend.services import knowledge_base_service as kb  # noqa: E402
from backend.services import kb_followup_memory as mem  # noqa: E402

HDR = re.compile(r"^\[.*\(trust: [^)]+\)\s*$", re.M)
APP_ID = "2321470"
APP_NAME = "Deep Rock Galactic: Survivor"
FIRST = "how do i beat the glyphid dreadnought"
FOLLOW = "what about its second phase"


def attach(settings, question):
    gate, domain = kb.should_retrieve_knowledge(
        use_local_knowledge_base=True, ask_mode="strategy", question=question,
        app_id=APP_ID, app_name=APP_NAME, text_resolved_title="")
    if not gate:
        return []
    res = kb.retrieve_knowledge_context(
        settings, ask_mode="strategy", question=question, app_id=APP_ID, app_name=APP_NAME,
        shortcut_name="", text_resolved_title="", domain=domain, pc_ip="127.0.0.1")
    return [re.sub(r"^\[.*: (.*?)\].*$", r"\1", h.strip())
            for h in HDR.findall(res.text_block or "")]


def main():
    settings = json.load(open(SETTINGS_PATH, encoding="utf-8"))
    mem.forget()

    print("looks_like_followup(%r) = %s" % (FOLLOW, mem.looks_like_followup(FOLLOW)))
    print()

    first_cards = attach(settings, FIRST)
    print("1) %-38s -> %s" % (FIRST[:38], ", ".join(first_cards)))

    subject = first_cards[0] if first_cards else ""
    mem.remember(app_id=APP_ID, app_name=APP_NAME, text_resolved_title="", subject=subject)
    print("   remembered subject: %r" % subject)
    print()

    plain = attach(settings, FOLLOW)
    print("2) follow-up WITHOUT the memory -> %s" % ", ".join(plain))

    recalled = mem.recall(app_id=APP_ID, app_name=APP_NAME, text_resolved_title="")
    print("   recall() = %r" % recalled)
    augmented = mem.augment_search_words(FOLLOW, remembered_subject=recalled)
    print("   search words become: %r" % augmented)
    with_mem = attach(settings, augmented)
    print("3) follow-up WITH the memory    -> %s" % ", ".join(with_mem))
    print()
    ok = bool(with_mem) and "glyphid dreadnought" in with_mem[0].lower()
    print("right boss first with the memory:", ok)


if __name__ == "__main__":
    raise SystemExit(main())
