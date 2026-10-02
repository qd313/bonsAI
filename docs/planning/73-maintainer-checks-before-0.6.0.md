# 73 — Your checks before 0.6.0 ships

Written 2026-09-27, at the end of the release bug session ([plan 72](72-release-bug-session.md)). The
maintainer asked: "Write this to a separate plan for me the maintainer to do before we ship 0.6". This is
that plan. It is part of the re-launch, [plan 71](71-merge-experimental-into-main.md).

**Status: waiting on the maintainer. None of the four checks has been done yet.**

These are the four checks the test robot could not do. Each one says why it is yours, how long it takes,
the steps, what a pass looks like, and what to do if it fails. If a check fails, tell any session "check N
failed" and what you saw. It is then treated as a new bug and checked against the release line (plan 71 §
5), the same as every other bug.

**When.** Do checks 1 to 3 early in the week, so there is still time to fix anything before the last call
on **Friday 2 October**. Do check 4 after the last fixes have landed and before the README is finished,
so the README describes what you actually saw.

| # | Check | About how long | When |
|---|---|---|---|
| 1 | Clear while an answer is arriving | 5 minutes | Early in the week |
| 2 | A question spoken into the real microphone | 10 minutes, more if the voice engine needs downloading | Early in the week |
| 3 | The parental lock, seen locked | 10 minutes | Early in the week |
| 4 | A first install, the way a new player gets it | About 45 minutes, most of it downloads | After the last fixes, before the README |

---

## Check 1 — Clear while an answer is arriving

**What was fixed.** Pressing Clear while an answer was still arriving used to lose that answer: the chat
kept your question and nothing under it. Now it keeps the part of the answer that had arrived, the same
as pressing Stop does.

**Why it is yours.** The robot needs about 20 button presses to reach the Clear button. Every time it
tried, the answer finished first. With the touch screen it is three taps.

**Steps**

1. Open one of your saved chats. Use an existing chat, not a new one: a new chat pushes out the oldest of
   your eight saved chats.
2. Ask something that gets a long answer, for example "Give me a full beginner's guide to this game".
3. As soon as words start to appear, go to the **Settings** tab (the touch screen is quickest), scroll to
   the bottom, press **Clear cache…**, then **Clear**.
4. The screen goes blank. That is expected.
5. Open the same chat again from the chat row.

**Pass:** the chat ends with your question and the part of the answer that had arrived. If nothing had
arrived yet, it ends with "Request cancelled."

**Fail:** the chat ends on your question with nothing under it.

---

## Check 2 — A question spoken into the real microphone

**Why it is yours.** The robot cannot speak. Its voice tests fed in recorded sound, so the Deck's own
microphone has not been tried since the recent changes.

**Steps**

1. **Permissions** tab: turn on **Voice input (microphone)**.
2. **Settings → Voice input:** if the voice engine is not installed, choose **tiny.en** and press
   **Install voice engine**. This is a download, so bonsAI asks first.
3. **Main** tab: press the microphone button and say a question out loud, for example "How do I beat the
   first boss?" Press the button again to stop.
4. Press **Ask**.
5. While the answer is arriving, press **Stop**.

**Pass:** your words show up in the question box, close to what you said. The answer comes back. The
microphone turns off when you stop it and does not come back on by itself. After Stop in step 5, the
highlight ring is on the question box, not on the microphone button.

**Fail:** no words appear, the words are badly wrong, or the microphone stays on or turns on by itself.

---

## Check 3 — The parental lock, seen locked

**What it should do.** When Steam's parental controls are locked, bonsAI turns off its riskier
permissions (the microphone, saving files, screenshots and game logs, the Steam ban lookup) and greys the
switches out. Asking questions still works. When Steam is unlocked again, the switches go back to how you
had them.

**Why it is yours.** Locking parental controls changes your Steam account's settings and needs a PIN.
A session is not allowed to do either.

**Before you start:** pick a PIN and write it down. Look at the **Permissions** tab and note which
switches are on, so you can see them come back later.

**Steps**

1. In the Deck's Steam settings, open **Family** (parental controls), set a PIN, and lock it.
2. Open bonsAI and go to the **Permissions** tab.
3. Move up and down the tab with the D-pad, then leave it.
4. Try the microphone button, then ask a normal question.
5. Unlock parental controls in Steam with your PIN, and go back to the **Permissions** tab.
6. Turn parental controls off again if you do not want to keep them.

**Pass:** in step 2, a yellow **Parental controls active** banner shows and every switch is grey and off.
In step 3, the D-pad moves through the tab and back out, with nowhere it gets stuck. In step 4, the
microphone refuses and the question still gets an answer. In step 5, the switches are back to how they
were before, without you touching them.

**Fail:** no banner, a switch still on or pressable while locked, the D-pad stuck, or the switches not
coming back after unlocking.

---

## Check 4 — A first install, the way a new player gets it

**Why it is yours.** This is the re-launch's first impression. The robot can check that things load and
answer; only a person can judge whether it makes sense to someone who has never seen bonsAI.

**When.** After the last fixes have landed (the last call is Friday 2 October), and before the README is
finished.

**First, ask a session to** (a few minutes, over the network):

- build the release zip and copy it onto the Deck;
- move bonsAI's saved folders aside, so you start clean. Aside, not deleted: your chats and settings
  come back afterwards.
- **Your choice:** keep Ollama and its models (quicker), or move them aside too. Moving them aside is the
  real path a new player takes, and it downloads a model of about 3 GB. **The session's suggestion is to
  move them aside**, because the first ten minutes (installing, setup, the first answer, the library
  download) are on the release line.

**Steps**

1. In Decky, uninstall bonsAI.
2. In Decky's settings, under **Developer**, install the plugin from the zip file the session put on the
   Deck.
3. Open bonsAI and follow what it shows you, as if you had never seen it. Get to a first answer about a
   game you are playing.

**Look for, and note anything that feels wrong or confusing, in your own words:**

- The first-run messages are true and make sense.
- You can get to a first answer without reading the README.
- Nothing downloads without asking first, and the highlight ring starts on **Not now**.
- The knowledge library downloads, and a question about a game uses it.
- There is no Developer tab, no test chips, and nothing half-built showing.
- The first time, the chip row is one wide help chip. Open the quick start from it and close it (try both
  **Cancel** and **Got it** if you can): the help chip is gone and the suggestion chips are back, and they
  stay after the panel is closed and reopened. (Added 2026-10-01: this was broken until plan 78's fix, and
  the robot could not show the fix on a Deck that had already seen the quick start.)
- The plugin's folder on the Deck holds a `NOTICE` file, a `data` folder and `dist/THIRD-PARTY-LICENSES.txt`,
  and nothing from the game notes.
- Typing "mic" into the question box's setting search finds the Voice settings.
- Each setting's starting value looks right for someone new. (Plan 71 asks a session to prepare a list of
  every setting and its starting value; go down it here.)

**Afterwards:** ask the session to put your folders back (chats, settings, and models if they were moved).

**Pass:** you reach a first answer without help, and nothing on the list above looks wrong. Anything
you noted becomes either a fix or a line in the README.

---

## Not on this list, and why

- **The summary card after "Sum up".** Decided 2026-09-27: it stays as it is for 0.6.0. The card shows
  up on screen by itself, and one press of Down reaches it.
- **Who owns each AI character.** Not needed for 0.6.0. The characters are text only: the picker shows a
  name and a letter, with no pictures and no voices. The same characters have been in every public
  release since 0.4.9. The check stays on the roadmap as the step that must happen before any character
  is given a spoken voice.
- **Pushing main, and one last install as a player on release day.** These are already yours, in plan 71
  (release day).

---

## Results

Fill in as you go, or tell a session and it fills this in.

| # | Check | Date | Pass or fail | What you saw |
|---|---|---|---|---|
| 1 | Clear while an answer is arriving | 2026-10-02 | Pass | The part of the answer that had arrived was kept. It ended inside a spoiler cover, and that cover opens to "undefined": a new bug, on the roadmap. Screenshot `screenshots/DeckCapture_20261002_003908_game.png`. |
| 2 | A question spoken into the real microphone | 2026-10-02 | Partly | "Sort of works": the words arrive, but stretches are sometimes written twice. A new bug, on the roadmap. Stop stopped the answer, but the X on the Ask bar would not clear the question afterwards: a second new bug, on the roadmap. Not reported: where the ring landed after Stop. Screenshot `screenshots/DeckCapture_20261002_004142_game.png`. |
| 3 | The parental lock, seen locked | | | |
| 4 | A first install, the way a new player gets it | | | |
