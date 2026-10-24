# Plan 97, Deck block C: the owed checks that do not depend on tonight's fixes (no game)

For a fresh deck-driver helper, after block B (read `97-handover-A.md` and `97-handover-B.md` first). Same rules and
file names as block A. Run on the build the session's task names: if it names a new commit, do the deploy step from
plan 96's block D (`96-runbook-block-D.md`, "D0") first and record the new bundle hash; the first open after a deploy
fails once. No game running in this block. Internet downloads must be ON for C3, C6 and C7 (Permissions tab; read the
switch; note the old value).

## C1: Expert against Speed, the second try (row P96-F8-EXPERT)

Why: the first try (before the fix) measured Expert shorter than Speed. The fix gave Expert its own depth rule and
every mode a rule to answer each part of a two-part question. New questions, so the answer cache cannot serve the old
ones. The test chat, the Deck's own AI, no game.

Five two-part Hades questions, each sent once in **Speed** and once in **Expert** (ten answers; the mode chip read
before every send; no apostrophes):

1. "Which boon should I take first in Hades and which weapon suits a new player best"
2. "How do I beat Megaera in Hades and what should I buy from the contractor early"
3. "What does the Mirror of Night do in Hades and which upgrade should come first"
4. "How does the heat system work in Hades and which pact conditions are easiest"
5. "Which keepsake helps most in Elysium in Hades and how do I handle the chariots"

For each answer record: the mode, the character count (from the saved chat file, not the screen), the seconds to the
first word, and whether both parts were answered (read the saved answer; a part is answered when at least one sentence
addresses it). **Pass:** Expert's median length is above Speed's, and both parts are answered in every Expert answer and
in at least four of five Speed answers. Record every number.

## C2: the two saved Ollama walks re-recorded (row P93-B10-CANCEL, the owed half)

List the workshop's `checks/` folder (`C:\Users\still\Documents\bonsAI-workshop\checks\`) and name the two saved Ollama-tab
walks the plan 93 notes mean (their names hold "OLLAMA" and the row ids P93-B10-CANCEL and P93-B12-MODELS-WALK; if in
doubt, list the candidates in the evidence and ask the session in your report rather than guessing). Walk the Ollama
tab top to bottom and back with every section opened, one press at a time, reading focus at each stop (a landing is a
stop; a scroll-only press inside a section being read is expected). Save the passing walk with `deck_saveCheck`, with
`checksDir` set to that folder, under a new name ending `-2026-10-22` (never overwrite). Do the same for the AI models
box walk if the second saved walk is that one. **Pass:** the walk has no dead press and no stop twice, and both saved
files exist.

## C3: the warm-up after the starter set finishes (row P96-F2-COLD-START, the warm-up half)

Why: after an install or the starter set finishes, the AI is loaded once in the background so the first question is not
the one that loads it. A fresh install is release day's; tonight the starter set is run with everything already there.

1. Unload the model (`api/generate` with `keep_alive: 0`, as in block B); `api/ps` empty.
2. Ollama tab → "Where AI runs": press **Update AI & models** (or whatever the one button reads; read its label; this
   is also "Install the starter set" when something is missing). Downloads ON. Note: by design this re-downloads the
   Ollama installer while downloads are on; let it run. Watch the status line until it reads done.
3. From the moment it reads done: `api/ps` every 10 s for up to 90 s. **Pass:** the model is loaded within 90 s with no
   question asked, and the plugin log shows the warm-up line. If the model never loads, record FAIL with the log's last
   lines around "done" (that is a finding for a small lane: the warm-up may not run when everything was skipped).

## C4: the note offer after a screen-only reload (row P93-B6-NOTE-OFFER)

Why: a kept or dismissed offer to keep your question as a note must not come back when only the screen side reloads.
The rig cannot reload only the screen side through its tools; the route to try once is reloading only the Quick Access
page through the debugging port.

1. In the test chat, send a question that earns a note offer (the offer card appears with the answer; if the first does
   not, a second differently worded question). Walk to the card's dismiss (read focus), A. The card goes.
2. Reload only the Quick Access page: through the debugging port, send the page a reload (the `Page.reload` command on
   the Quick Access target; the probe scripts show how to connect). Do not reload the plugin. Wait 10 s. Open the plugin
   if it closed.
3. Read the last answer. **Pass:** no offer card under it. If the page reload cannot be sent, or it reloads the whole
   plugin (the back end's log shows a start), record COULD NOT RUN with what happened; the row then reads "proven by its
   tests only".

## C5: the library switch after a download (row P97-L20-KB-SWITCH)

Why: once, after "Download knowledge base" brought the library back, the "Use local knowledge base" switch read off on
screen while the file said on; a later run did not see it. Two builds decide it.

Read the switch and `grep use_local_knowledge_base ~/homebrew/settings/bonsAI/settings.json` (the key and its value
only) before anything. Ollama tab → Knowledge base → **Remove** (the confirm box: the action is on the left, read focus,
A). When the row reads not installed: **Download**; pick the same storage it had (the first box asks where); let it
finish (about a second). The moment the box closes, read the switch on screen and the file; again at 30 s and at 60 s.
**Pass:** the screen and the file agree at every read. Record the three pairs.

## C6: the install box's words and Cancel, with Ollama moved aside (rows P96-F13-INSTALL-WORDS, P96-F10-CANCEL)

The maintainer's call 2026-10-22 allows this. Plan 94's driver did the same; its evidence
`plan94-P94-INSTALL-OLLAMA.json` names the exact folders it moved (read its `setup` field and do the same). **Stop and
record COULD NOT RUN if `df -h /home` shows under 6 GB free.** Count the models first (`api/tags`).

1. Move Ollama aside the way plan 94 did (the program and its models folder, renamed with a `.p97` suffix, nothing
   deleted). Stop its service if the plugin runs one (read the plugin log for how it starts it). `deck_reloadPlugin`
   (no game). Open the plugin: the Ollama tab now offers **Install Ollama**.
2. **The words (F13, half 1):** A on Install Ollama with downloads ON: the box opens. Read its text. **Pass:** it names
   ollama.com, and its Cancel line says Cancel installs nothing (no "installs Ollama only"). Press **Cancel** (read focus
   first). Record the status line: unchanged.
3. **Cancel on the downloads box (F10):** Permissions → Internet downloads **OFF** (note it). Ollama tab → A on Install
   Ollama: the "Turn on internet downloads?" box. Press **Cancel** (read focus first). **Pass:** the Ollama tab's status
   line is unchanged (not "Failed (check the Internet downloads permission?)") and nothing was installed. Downloads back
   **ON**.
4. **The line goes when the install finishes (F13, half 2):** A on Install Ollama, confirm. Let the install run (the
   download is the Ollama program only; do not press "Install the starter set" afterwards, it would download gigabytes).
   When done: **Pass:** the line "The local AI isn't installed on this Deck yet." is gone and the button reads Update AI
   & models.
5. **Put it back:** stop the fresh Ollama if it runs; remove only the fresh install the step above made (the folders you
   watched it create, nothing with the `.p97` suffix); rename the `.p97` folders back; `deck_reloadPlugin` (no game);
   `api/tags` must list the same models as at the start; the Ollama tab reads as it did. Record the before and after
   counts. If anything in the put-back is unclear, stop and report before deleting anything.

## C7: the Voice input section after the engine installs, with the engine moved aside (row P96-F9-VOICE-REFRESH)

Plan 94's evidence `plan94-P94-VOICE-INSTALL.json` names where the engine lives (under the plugin's settings folder)
and how long the install took (about 77 s). Read its `setup` field.

1. Rename the engine's folder with a `.p97` suffix; `deck_reloadPlugin` (no game); Settings → Voice input must read
   "not installed".
2. Walk to its Install button (read focus), A. Note the clock. Watch the section's words every 5 s and the toasts.
3. **Pass:** within 5 s of the install finishing (the files landed, the toast), the section reads ready, without
   leaving the tab. Record the seconds from the press to "ready".
4. Put it back: remove the fresh engine folder, rename the `.p97` folder back, `deck_reloadPlugin`, the section reads
   ready as before.

## C8: the end of the block

Internet downloads back to what you found. Put back every setting you changed (read the file's key names and compare
with the handover's values). Handover to `docs/planning/assets/97-handover-C.md` with everything the earlier handovers
had, the model count before and after C6, the two saved walk names from C2, and the rows left undone.
