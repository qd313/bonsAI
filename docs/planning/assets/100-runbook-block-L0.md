# Plan 100, Deck block L0: the smoke pass with Show details, plan 98's owed looks, and the owed rows

For a fresh deck-driver helper, at minute zero of the session, on the build already on the Deck (no deploy). Read the
newest plan 98 handover in the workshop's `planning/assets/` folder first (`98-handover-KS.md` if block KS ran, else
`98-handover-KR.md`): the last known state of the Deck, the test chat, the settings backup. The rules of your helper
file apply in full. Evidence files go to `C:\Users\still\Documents\bonsAI-workshop\test-evidence\plan100-<ROW>.json`
(never overwrite; `-try2` if the name exists), screenshots beside them with the same stem. **Save a screenshot of every
look this runbook names**; the maintainer judges them from the checks page and will not go to the Deck to see them.
Crop nothing. Every Deck command is exactly `ssh deck@192.168.86.52 '<command>'`. Scratch files go in the session's
scratch folder named in your task. Stop at once if the rig's lease is held by another chat, if focus moves without your
press, or if anything asks for a password. About sixteen checks; if your memory runs low, write the handover and stop,
naming the rows left.

**Questions** go in with the send-question script, never by pressing A on the question box:
`ssh deck@192.168.86.52 'python3 - --text "the exact question"' < scripts/deck_send_ask.py`, check it printed VERIFIED
with the whole sentence, then walk to Ask and press A there as its own step. A question with an apostrophe cannot
survive the quotes: reword it. Every question below is worded once and never repeated word for word (the answer cache
would serve it back). Wait for the answer to finish (the reply row appears) before any read. **Before every question,
read the chat's name: it must be "test".**

**Page reads** go through the debugging port the way `scripts/probe_deck_ui_look.py` does. **The log's attach line** for
a question is read with `deck_readPluginLog` right after the answer finishes: the one plain line saying which notes
reached the model and which footer line, if any, was added; copy it whole into the evidence. **The saved chat** lives in
`~/homebrew/settings/bonsAI/chats/`; copy the last 600 characters of the newest answer into the evidence whenever a
check is about what the AI wrote (key names only from any settings file; never its values, except `rag_corpus_version`,
`rag_corpus_path`, `spoiler_tier` and `ask_mode`).

## L0.0: setup (row P100-L0-SETUP, one file)

1. `deck_status`: the stop switch must be off and no other chat's lease held. If either, stop and report.
2. `deck_holdAwake` with `ttlMinutes: 480`; write the `expiresAt` into the evidence and the handover.
3. Which screen is live: the page's window size (the Deck's own is about 854 x 766 for the panel page; the monitor
   1920 x 1080). Record it in every evidence file as `screen`.
4. The build on the Deck: `sha256sum ~/homebrew/plugins/bonsAI/dist/index.js | cut -c1-12`. Block L0 runs on it.
5. Back up the settings: `tar -czf /home/deck/p100-settings-backup.tgz -C ~/homebrew/settings bonsAI` (print the size).
6. **The library's state, before anything changes it:** `rag_corpus_version` and `rag_corpus_path`, the library's file
   dates (`ls -l --time-style=full-iso <path>/`), the seed folder's version
   (`python3 -c "import json;print(json.load(open('/home/deck/homebrew/settings/bonsAI/seed-knowledge-base/corpus-manifest.json'))['version'])"`),
   and the published version
   (`curl -sL https://huggingface.co/datasets/qd313/bonsai-knowledge-base/resolve/main/corpus-manifest.json | python3 -c "import json,sys;print(json.load(sys.stdin)['version'])"`).
   Write all four into the handover: block LR puts the library back exactly here.
7. Ollama's state: `curl -s 127.0.0.1:11434/api/tags` (names and sizes only), `curl -s 127.0.0.1:11434/api/ps`,
   `free -m`, `df -h /home`. The model list at the end must match.
8. The games on the Recent Games row (read the row's tiles): name them; Doom 64: Retribution and Deep Rock Galactic:
   Survivor are expected (plan 100 call 10).
9. The test chat: open the plugin (it may fail once after a reload; a second failure is worth reporting), read the chat's
   name on the Main tab. It must be "test". If it is not there, make a new empty chat, name it "test" in the handover,
   and never use another.
10. Read `ask_mode` and `spoiler_tier` (expect default). The mode chip reads Strategy for every question below unless a
    check says otherwise; read it before each question. The parental lock must be off.

## L0.1: the knowledge-base smoke pass, with Show details this time (row KB-SMOKE-02/04, the Show details half)

Nothing running, Strategy mode. Question: "In Hollow Knight, how do I beat the Mantis Lords" (the boss is named, so no
cover is expected; the same question passed twice on 2026-10-24 without Show details being opened, which is the half
still owed). **Pass when:** the answer finishes; a "From the notes" block appears naming a Hollow Knight note; **walk to
Show details (read focus) → A → the notes chip: it names at least one note, screenshot (`-details.png`)**; the log's
attach line names the same note(s); no "No close match" line. B back out. Record the block's title, the notes named in
Show details and in the attach line, and that they agree.

## L0.2: each glossary word underlined once (row P98-GLOSSARY-FIRST-01, plan 98 block KS.2)

Nothing running, Strategy mode. Ask exactly: `In Hollow Knight, what does the Mothwing Cloak do and how do charms work`
(the 2026-10-24 question; a cached answer coming back word for word is fine and makes the comparison exact).
1. When the answer has finished, screenshot it with the start of the answer in view (`-answer.png`). Read the answer's
   text and every underlined word (the glossary chips): list each chip's word in order.
2. Press Down from the question box, one press at a time, reading focus after each, until focus leaves the answer. List
   every stop. Screenshot the first chip with the ring on it (`-ring.png`).
3. **Pass when** no word is underlined twice in the answer (count "charm" and "charms" as one word), and the Down walk
   stops only on underlined words that are actually drawn. The 2026-10-24 answer had 11 underlines for 5 words; write
   the count you see. If the AI writes a different answer with no repeated library word, ask once more with different
   wording (`Hollow Knight: explain charms, notches and the bench`); after two tries without a repeat, UNCLEAR with what
   it wrote.

## L0.3: the spoiler row's ring (row P98-SPOILER-FOCUS-01, plan 98 block KS.3)

Settings tab → Story spoilers → open the section. Do not change the setting.
1. Ring on "Hide spoilers until I tap": screenshot (`-switch.png`).
2. Down once. Read focus and the focused element's box against the visible area. Screenshot (`-down.png`).
   **Pass when** focus is on **Default** and a ring is visible on it.
3. Left once: focus on Hide more, ring visible, screenshot (`-left.png`). Right twice: Hide less, ring visible,
   screenshot (`-right.png`). Left once (back to Default).
4. Down once: focus leaves to Suggestion chips. Up once: **pass when** focus lands on Default again, screenshot
   (`-up.png`).
5. A on Default (already the picked value), then read `spoiler_tier`: still `default`.

## L0.4: the thumbs-down pictures (row P98-DEMOTE-01-pictures, plan 98 block KS.4)

Nothing running, Strategy mode. Ask: `In Deep Rock Galactic Survivor, how do I beat the glyphid dreadnought`.
1. When the answer is done, walk to "Not really" (read focus) → A. Screenshot the reason choices (`-reasons.png`).
2. Walk to "Wrong tip" → A. If "Which note was it?" appears, screenshot it (`-which.png`), then pick the first note.
3. Screenshot the result: "Marked not helpful", Undo, and the gold line naming the note (`-marked.png`).
4. Open Show details → the notes chip: is the marked note tagged "ranked lower by you"? Screenshot (`-tag.png`). B out.
5. Walk to Undo (read focus) → A. Screenshot (`-undone.png`). Open Show details again: **record** whether the tag is
   still there (plan 100 lane U expects it to stay today; block L2 checks it is gone after U lands). Then
   `ls -l ~/homebrew/settings/bonsAI/rag_demote.json` and its content: no entry should remain for that note (record
   what it holds; if a stray entry is left, say so, do not edit it).

## L0.5: two route questions, read for a "cheat" section (row P100-ROUTE-CHEAT-COUNT, a reading)

Nothing running, Strategy mode. Two questions, differently worded: "In Hollow Knight how do I get to the first boss
from the start" and "Hollow Knight: what is the way to the False Knight for a new player". For each, when the answer
finishes, read the whole answer in the saved chat: does any section suggest cheats, exploits, emulator tricks or
fast-travel glitches? Copy the heading of any such section. Record the route's step count and whether any step carries
a "Needs:" line (none expected before lane P lands). **Verdict MEASURED** with the count of cheat sections out of two.

## L0.6: the junk phrases in a fresh chat with the game running (row P98-JUNK-PHRASES-try2)

1. **Unload the Deck's AI first:** read the loaded model's name from `/api/ps`, then
   `curl -s 127.0.0.1:11434/api/generate -d "{\"model\": \"<that name>\", \"keep_alive\": 0}"`, and confirm `/api/ps`
   is empty. Record `free -m`.
2. Launch Deep Rock Galactic: Survivor with `deck_launchGame` (go to the start of the Recent Games row first). Wait
   until its window has been in front for 30 seconds. Close and reopen Quick Access; the Context line must name the
   game. Never reload the plugin with the game running.
3. Make a **new empty chat** for this check (New chat; if the Deck is at ten chats it asks which to delete: stop and
   record COULD NOT RUN rather than deleting one). Strategy mode.
4. Ask "how do I deal with the praetorian" and let it finish (the previous-question memory now holds a boss).
5. Ask "thank you very much". Record: the attach line (notes attached, or none), whether a notes block was drawn,
   whether the answer repeats the praetorian advice (read the saved chat's last 600 characters), and the answer's
   length in words. **Pass for this half when** nothing attached and the answer is a short reply, not the boss answer.
6. Ask "what time is it". The same fields. **Pass when** nothing attached and no block.
7. Ask "how do I beat it". Record whether the answer is about the praetorian (expected: yes, a follow-up).
8. Write one file with three halves, each with its own verdict line. Then switch back to the chat "test".

## L0.7: the hidden spoiler box on a game known only by name (row STRAT-SPOIL-NAME-01)

Still with the game unloaded path in mind: exit Deep Rock Galactic: Survivor with `deck_exitGame`; confirm over SSH that
its process is gone (`pgrep -fl -i "survivor\|drg"` reads empty); record `free -m`. Only if Doom 64: Retribution is on
the Recent Games row and `deck_launchGame` recognises its tile; otherwise COULD NOT RUN, naming the games on the row
and what the launch tool said (the maintainer's hand launch is the fallback: if the game is already running when you
read the Deck, use it as it is). Unload the AI as in L0.6 step 1. Launch it, wait 30 s, reopen Quick Access, read the
Context line (the game's name). Strategy mode, masking on, streaming on (read Settings → Story spoilers and the
streaming switch; change nothing). Question: "how do I beat the mother demon" (names the boss). Read the answer every
250 ms from the Ask press: **pass when** any spoiler box the model draws renders as plain text from the first streamed
word, with no "Spoiler hidden until complete…" chip and no tap-to-show block at any read; then ask "what weapon works
best against the big guys" and confirm the first answer stays plain once it is history; then reopen the chat from the
chat slot list and confirm it is still plain. Exit the game; confirm the process is gone.

## L0.8: the four stale saved walks, re-saved (row P98-K1-REPLAYS)

Nothing running. For each walk, put the Deck in the walk's own start state first, then re-save it with `deck_saveCheck`
under the same name, then replay **that one walk by name** (a replay call with no names replays all of them, which once
ran 25 minutes and changed a setting):
1. `P86-GLOSSARY-WALK`: a Hollow Knight answer with glossary words on screen (L0.2's answer is fine), the ring on the
   question box.
2. `P86-DEVELOPER-WALK`: Developer tab open, every section folded as the tab opens.
3. `plan70-KB-FOCUS-01-v2` and `plan70-KB-UPDATE-row-walk`: Ollama tab, the Knowledge base section open, the ring on
   the Update row.
**Pass when** each re-saved walk replays with no differences. Record each walk's stop count before and after.

## L0.9: the widest chip labels, the maintainer's eye (row PHASE4-CHIPS-01)

Main tab, nothing running, a chat with few turns so the chip row shows (make a new empty chat if the chip row is hidden
in "test"; say so). Screenshot the chip row three times, 20 seconds apart (`-chips-1.png` to `-3.png`), and for each
read every visible chip's label and its box. **Verdict MEASURED**: the screenshots go to the checks page for the
maintainer's eye (plan 100 call 8); record the widest label and whether its text ran past its chip (long labels scroll
inside a clipped box by design, so the text range is not a failure on its own). Switch back to "test".

## L0.10: handover (`100-handover-L0.md` in the scratch folder, then the session copies it)

The build on the Deck; when the keep-awake runs out; the settings backup path; the test chat's name and any new chat you
made; **the library's state before L0 (version, place, file dates, the seed's and the published versions)**; every
setting you changed and whether it is back; the games on the Recent Games row as you saw them; which rows passed, failed,
were unclear or could not run, with the screenshot names; the Deck's screen and tab as you leave it; anything that
surprised you.
