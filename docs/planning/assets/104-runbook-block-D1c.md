# Plan 104, Deck block D1c: the staged first start, and two pictures to remove

Written 2026-11-16 by the chat running plan 104. Block D1b ran out of working memory before its last row
(P104-FIRST-RUN-01), and left two screenshots on the Deck. This block does only those two things.

For one fresh `deck-driver` helper (Sonnet 5.5 medium). The helper file's rules apply in full, and so does
**everything above the line "# D0a" in `docs/planning/assets/104-runbook-block-D0.md`** (evidence names, the one way to
write a Deck command, what the maintainer allowed, the freeze rules, keeping replies small, unloading the AI): read that
part first. Then read **D1b.5 of `docs/planning/assets/104-runbook-block-D1b.md`** and **the D0 runbook's last section,
"A first start without wiping anything"**: row D1c.2 below is D1b.5, word for word, with one addition. Evidence goes to
`C:\Users\still\Documents\bonsAI-workshop\test-evidence\plan104-<ROW>.json` (never overwrite; `-try2` if taken), a
picture beside every look. Handover: `C:\Users\still\Documents\bonsAI-workshop\planning\assets\104-handover-D1c.md`.
You commit nothing and you do not deploy. **Read the last handover first:**
`C:\Users\still\Documents\bonsAI-workshop\planning\assets\104-handover-D1b.md`.

**Keep your replies small.** Your working memory ran out in the last two blocks because of big tool replies. Never
call `deck_listGames`. Read pages by a small part only. Prefer one `ssh` command that prints a few lines.

**Never press the Ollama tab's Update button. Never press Install Ollama. Never "Clear all data".**

---

## D1c.0: setup (row P104-D1C-SETUP; one evidence file)

As D1.0 steps 1 to 3 and 5 of `104-runbook-block-D1.md`, with a new queue line ("plan 104 block D1c, about 45
minutes"): the build hash must read `bc209b0029d0`; renew the hold for 480 minutes. Write which library is installed
(`rag_corpus_version`, that key only), the mode chip, and that no game is running (`pgrep` for the usual game
processes, as the D0 runbook does).

## D1c.1: remove the two test screenshots (row P104-D1C-PICTURES)

Block D1b's recipe took two screenshots of Deep Rock Galactic: Survivor. The maintainer allowed removing test pictures.
1. List them: `ssh deck@192.168.86.52 'find /home/deck/.local/share/Steam/userdata/23333482/760/remote/2321470/screenshots -name "20261116-0014*" -o -name "20261116-0015*"'`.
2. Remove only `20261116-001424.jpg` and `20261116-001548.png`, and any file with the same name under the
   `thumbnails` folder beside them. Remove each by its full path. Nothing else in that folder.
3. Run the `find` again: it prints nothing. Write both listings into the evidence.

## D1c.2: a first start without wiping anything (row P104-FIRST-RUN-01; D141 call 23)

Follow **D1b.5 steps 1 to 5 exactly**, with this addition to step 2: Steam's performance overlay **was on** before
plan 104's drivers came (block D1b found it on and did not set it). Write its level as you find it, turn it off for this
row, and turn it back to that same level as the **last** part of step 5, after the four checks match. Read it back and
write it in the evidence.

If anything in step 5's checks does not match: stop at once, keep `~/p104-settings.json.bak`, press nothing more, and
write exactly what does not match in the handover.

## D1c.3: hand over

The plugin on Main in the test chat, the mode chip on Strategy, no game, the AI unloaded, the hold kept, Steam on
Home. `deck_releaseMachine`. `python scripts/deck_queue.py done <id> --result "<build; no game; hold until>"`. The
handover: each row's verdict and file; the put-back list with each item's state (all put back, or exactly what is
not); anything the next driver should know.
