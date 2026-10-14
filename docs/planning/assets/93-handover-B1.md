# Handover, plan 93 block B1 (2026-10-13 ~22:10 Deck time)

- Build on the Deck: unchanged from block A (matches local build; no deploy, no reload this block).
- Screen: the Deck's own, page window 854 x 454.
- Keep-awake: renewed at the start, expires 2026-10-14T09:32:01Z.
- Settings backup: ~/p93-backup/settings.json and ~/p93-backup/chat_slots/ on the Deck (block A).
- AI that answered: the Deck's own (Run AI on this Deck, gemma4:e2b-it-qat). Long answer took about 50 s; short Speed/Terse answers 10 to 35 s. Model still loaded after the block (keep alive 5m); ollama pid 11763; free memory about 11.6 GB.
- Test chat: NEW, made by this driver: "What is the fastest way to earn geo early in Hollow Knight" (chat 1 of 2; the maintainer's chat "How do I balance FPS and battery?" is chat 2, untouched). It holds 6 turns (5 Terse questions + 1 long Expert answer). Its name is the first question.
- Settings changed and put back (confirmed in settings.json): ask_mode speed -> expert -> speed; terse_mode true -> false -> true. reply_verbosity (Reply style slider) left at balanced the whole time (not touched).
- Evidence written (docs/test-evidence): plan93-M11-TERSE-LINES.json (+ -q2.png), plan93-M4-ANSWER-FINISH.json (+ -samples.jsonl, 3025 samples), plan93-M3-CHIPS-NEAR-END.json, plan93-M6-UP-SKIPS-PARAGRAPH.json. No deck_saveCheck (check 5 failed).
- Scratch: probe_b1.py (the sampler), wait_done.sh, write_ev45.py in driverB1.
- Deck state now: plugin open on Main, ring on the Ask row's Attach/mode area (last press was LB from the Ollama tab; ring unread), Reply style section on the Ollama tab left open (fold state only), no game, a model is loaded.
- Quirks: the page keeps the whole transcript at scrollTop 0 while an answer streams, then jumps to the end at the finish. The transcript scroll box is the element with class containing _TabContentsScroll (not .bonsai-chat-transcript). Live answer = a '--live' class on the turn header. The question box is an INPUT with no label: never A on it. Right from the mode chip passes Voice input and Clear before Ask. B on the question box moves the ring to the tab bar (does not close the panel). Reply style section's fold resets when the Ollama tab is re-entered. runSequence output is long; deck_readPage with small expressions is lighter.
