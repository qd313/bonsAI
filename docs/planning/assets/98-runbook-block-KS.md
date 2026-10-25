# Plan 98 follow-up, block KS (Sunday 25 October): two fixes and the missing pictures

For a fresh deck-driver helper. The session has already deployed today's build with `scripts/build.ps1` (it also
uploaded a seed library built today). Every Deck command is exactly `ssh deck@192.168.86.52 '<command>'`. Never print
the settings file's values, only key names, except `rag_corpus_version`, `rag_corpus_path`, `spoiler_tier` and
`ask_mode`. Never type a PIN or password. Never reload the plugin with a game running. Evidence goes to
`C:\Users\still\Documents\bonsAI-workshop\test-evidence\` as `plan98-<ROW>.json`, never overwriting (add `-try2`).

**New rule for this block: save a screenshot of every look this runbook names**, beside its evidence file with the
same stem plus a short suffix (`plan98-P98-SPOILER-FOCUS-01-down.png`). The maintainer judges these from the checks
page and will not go to the Deck to see them. Crop nothing; the session crops.

Test chat: "In Hollow Knight, how do I beat the Mantis Lords" (chat 1 of 2). Ask test questions only there.

## KS.0: setup (row P98-KS-SETUP)

1. `deck_status`: no lease held by anyone else. Take the keep-awake lock (`ttlMinutes: 120`).
2. Over SSH: no game running (`ps` for `steamapps/common` or `reaper SteamLaunch`), and `free -m`.
3. `deck_snapshotSettings` (the session restores from it if anything goes wrong). Read and record `ask_mode`,
   `spoiler_tier`, `rag_corpus_version`, `rag_corpus_path` (expect 2026.10.17 at `/home/deck/.bonsai/rag`).
4. Read which screen is live (the page's window size) and write it down. Open the plugin (the first open after a
   deploy may fail once).

## KS.1: install the test library (row P98-KS-LIBRARY)

Developer tab → walk to "Install seed knowledge base" (read focus before A) → A. Wait up to 60 s for the status to
settle. **Pass when** `rag_corpus_version` reads 2026.10.25.

## KS.2: each glossary word underlined once (row P98-GLOSSARY-FIRST-01)

1. In the test chat, Strategy mode (the mode chip on the question box; note the mode you found), ask exactly:
   `In Hollow Knight, what does the Mothwing Cloak do and how do charms work`. This is Saturday's question; a cached
   answer coming back word for word is fine and makes the comparison exact.
2. When the answer has finished, screenshot it with the start of the answer in view (`-answer.png`). Read the
   answer's text and every underlined word (the glossary chips): list each chip's word in order.
3. Press Down from the question box, one press at a time, reading focus after each, until focus leaves the answer.
   List every stop. Screenshot the first chip with the ring on it (`-ring.png`).
4. **Pass when** no word is underlined twice in the answer (count "charm" and "charms" as one word), and the Down
   walk stops only on underlined words that are actually drawn. Saturday's answer had 11 underlines for 5 words;
   write the count you see. If the AI writes a different answer with no repeated library word, ask once more with
   different wording (`Hollow Knight: explain charms, notches and the bench`); after two tries without a repeat,
   UNCLEAR with what it wrote.

## KS.3: the spoiler row's ring (row P98-SPOILER-FOCUS-01)

Settings tab → Story spoilers (Strategy mode) → open the section. Do not change the setting.
1. Ring on "Hide spoilers until I tap": screenshot (`-switch.png`).
2. Down once. Read focus and the focused element's box against the visible area. Screenshot (`-down.png`).
   **Pass when** focus is on **Default** and a ring is visible on it.
3. Left once: focus on Hide more, ring visible, screenshot (`-left.png`). Right twice: Hide less, ring visible,
   screenshot (`-right.png`). Left once (back to Default).
4. Down once: focus leaves to Suggestion chips. Up once: **pass when** focus lands on Default again, screenshot
   (`-up.png`).
5. A on Default (already the picked value), then read `spoiler_tier`: still `default`.

## KS.4: the thumbs-down pictures (row P98-DEMOTE-01-pictures)

No game running. In the test chat, Strategy mode, ask:
`In Deep Rock Galactic Survivor, how do I beat the glyphid dreadnought`.
1. When the answer is done, walk to "Not really" (read focus) → A. Screenshot the reason choices (`-reasons.png`).
2. Walk to "Wrong tip" → A. If "Which note was it?" appears, screenshot it (`-which.png`), then pick the first note.
3. Screenshot the result: "Marked not helpful", Undo, and the gold line naming the note (`-marked.png`).
4. Walk to Undo (read focus) → A. Screenshot (`-undone.png`). Then `ls -l ~/homebrew/settings/bonsAI/rag_demote.json`:
   no entry should remain for that note (record what it holds; if a stray entry is left, say so, do not edit it).

## KS.5: put the Deck back (row P98-KS-RESTORE)

1. The library back to the published 2026.10.17 in the same place, as Saturday's block KR.3 did
   (`docs/planning/assets/98-runbook-block-KR.md`): Update or Download the knowledge library, and when it asks where,
   pick the home folder's `.bonsai/rag` (the "on the Deck" choice). **Pass when** `rag_corpus_version` reads
   2026.10.17 and `rag_corpus_path` reads `/home/deck/.bonsai/rag`.
2. The mode chip back to what KS.2 found. `spoiler_tier` still `default`. If `rag_demote.json` did not exist at the
   start and exists now with nothing in it, say so; do not delete it yourself.
3. Unload the AI models (`curl` with `keep_alive: 0`, as KR did), close Quick Access with B, release the keep-awake
   lock. Today's build stays on the Deck.

## Handover

Write `98-handover-KS.md` in the scratch folder named in your task: build on the Deck, library installed and where,
settings changed and whether back, the test chat's name, each check's verdict and its screenshot names.
