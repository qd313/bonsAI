# Plan 31 — The Deck verification round

**Status:** **D57 locked 2026-09-03**, all nine answers recorded in
[maintainer-decisions-locked.md](../audit/maintainer-decisions-locked.md); the round started 2026-09-03
with the rig driving unattended. Progress is written into § 11 as rows close. Written against branch
`experimental` at `3b0e9d7`; the Deck runs that build (§ 2).
**Purpose:** every roadmap [Verify](../roadmap.md#verify) row, sorted by what it needs from the device
and put in a run order, so that "go" is one word and the rig does not re-derive the list mid-session.
**Does not:** change any code. Row wording is quoted from [testing.md](../testing.md) and
[testing-manual.md](../testing-manual.md); where this file and a row disagree, the row wins.

## 1. Why the Deck rows run one at a time

Anything that needs the screen or the buttons is a single serial queue, whoever drives it:

- One device with one focus ring; a second driver moves the ring under the first one's feet.
- The DPS bridge registers CDP tunnels (reads) but not presses, and has no lock, so "nobody is
  looking" does not mean "nobody is pressing" (measured 2026-09-02; the *one driver at a time* note).
- Steam's state is global: the running game, the Ask mode, the animation mode, the frozen chip
  batch, the thinking level. Two rows with different setups cannot overlap.

Subagents do not change that. They can only add two side lanes (§ 3): probes over SSH that never
touch the UI, and desk paperwork.

## 2. What is true on the device today

Read over SSH on 2026-09-02 at 23:42, no button pressed, while another chat was driving.

| Fact | Value | How known |
|---|---|---|
| Build | `main.py` and `dist/index.js` byte-identical to this checkout's build of 19:15, which post-dates the last code commit `cc110fb` (18:53) | `md5sum` both sides |
| Passwordless sudo | works (the screenshot and record scripts need it) | `sudo -n true` |
| Models on the Deck's Ollama | `qwen3.5:4b` (thinking), `qwen2.5:1.5b`, `gemma4:e2b-it-qat`, `nomic-embed-text` | `/api/tags` |
| Ollama runs as | `~/.local/bin/ollama serve`, a user process; where its stdout lands is UNKNOWN | `pgrep` |
| Knowledge base | on; corpus `2026.09.01` on the SD card; hybrid retrieval on | `settings.json` |
| Corpus covers | app ids 220, 550, 620, 377160, 1086940, 1091500, 1145360, 1174180, 1222670, 1547000, 2321470, plus two rows with no app id | `corpus.db` `games` |
| Installed and covered | Half-Life 2, Left 4 Dead 2, Portal 2, Fallout 4, Baldur's Gate 3, Cyberpunk 2077, Hades, The Sims 4, GTA San Andreas DE, Deep Rock Survivor | `steamapps/common` |
| Installed and not covered (for the "uncovered title" rows) | Black Mesa, Brotato, ULTRAKILL, Sable, Hollow Knight, Stardew Valley, Undertale | same |
| Ocarina of Time | Ship of Harkinian, a non-Steam shortcut (`soh.appimage`, shortcut app id `2593781457`); "runs incredible" per the maintainer | `shortcuts.vdf`, D57 #3 |
| Settings that the round will change and restore | `ask_mode` strategy, `ask_think_effort` off, `preset_chip_animation` carousel, `tab_resume_mode` resume_recent, streaming on, character on (Ali G), text try order empty, all five capabilities on | `settings.json` |
| Frozen chips pinned now | 10: five from another session, then the five KB-ANSWER-02 sentences | `settings.json` |
| Voice engine | binaries present under `settings/bonsAI/voice_bin/` | `find` |
| Backups already there | `settings.json.bak-preQA` | `ls` |

## 3. The lanes

- **Lane A — screen and buttons.** Serial. Sessions 1 to 3 below. Every press batch starts with a
  fresh `deck_automationStatus` and stops the moment a foreign tunnel appears; every walk uses
  `deck_runSequence` with focus acquisition on, records step 1's `from`, and checks each landing
  twice: focused (the walk result) and visible (the rect above the dock's top edge, and
  `elementFromPoint` at its centre hits the control — [QA-FREE-PLAY-01](../testing-manual.md)).
- **Lane B — over SSH, no UI.** Runs alongside lane A, except during timing rows (KB-RECALL-01's cost
  half, THINKING-LIVE-01, the STREAM rows, THINK-EFFORT-04's latency), because the probes use the same
  Ollama. § 8.
- **Lane C — desk.** A subagent can flip rows in the testing docs, move roadmap entries and write the
  archive entries while lane A drives (house rule 4: same commit as the pass).

## 4. Frozen chip batches — confirm before pinning (D57 #2)

The standing rule: show the list, get it confirmed, then pin. A batch is 3 to 12 entries; the
carousel is replaced by the batch in order, each chip badged **TEST**, and A fills the Ask field
without submitting. Pin with the panel closed, over SSH into `settings.json` or from Developer →
*Knowledge base (dev QA)*: `load_settings` re-reads the file on every call
([main.py:778](../../main.py), [settings_service.py:490](../../py_modules/backend/services/settings_service.py)),
so the next panel open picks the batch up, and a closed panel cannot save a stale copy over it.

**Batch 1 — Session 1, nothing running (11).** Ask mode per line.

| # | Sentence, verbatim | Row | Mode |
|---|---|---|---|
| 1 | `I'm out of room and want my installs on the memory card instead` | KB-ROUTER-01 (1) | Speed |
| 2 | `the game only responds to the touchpad and ignores the sticks` | KB-ROUTER-01 (2) | Speed |
| 3 | `I can play alone but online kicks me out straight away` | KB-ROUTER-01 (3) | Speed |
| 4 | `my playstation 2 games run at half speed on the handheld` | KB-ROUTER-01 (4) | Speed |
| 5 | `what should I do next` | KB-COVERAGE-NOAPP-01 first half; KB-COVERAGE-01 `KB: off` with the toggle off for one Ask | Speed |
| 6 | `reply with only the word echo` | CLEAR-CACHE-01 | Speed |
| 7 | `in left 4 dead 2, how to beat tank` | KB-ANSWER-02; also KB-ATTRIB-01's date check if the attached card is wiki-sourced (`as of 2025-04-05`) | Strategy |
| 8 | `in half-life 2 the antlions keep coming up out of the sand` | KB-ANSWER-02 | Strategy |
| 9 | `in hades, theseus and asterius keep killing me` | KB-ANSWER-02 | Strategy |
| 10 | `in ocarina of time how do i beat volvagia` | KB-ANSWER-02 | Strategy |
| 11 | `in red dead redemption 2 what happens to arthur at the end` | KB-ANSWER-02 (must fence); THINKING-SPOILER-01; SMOKE-E's tap-to-reveal | Strategy |

Lines 7 to 11 are already pinned as chips 6 to 10; the maintainer confirmed them on 2026-09-02.

**Batch 2 — Session 2, a game running (12).** The game is named per line.

| # | Sentence, verbatim | Row | Game | Mode |
|---|---|---|---|---|
| 1 | `how do i kill the big armoured bug boss` | KB-RECALL-01 | Deep Rock Survivor | Strategy, then Speed |
| 2 | `which character is best for a beginner` | KB-RECALL-01 | Deep Rock Survivor | Strategy, then Speed |
| 3 | `tips for the thorny plant level` | KB-RECALL-01 | Deep Rock Survivor | Strategy, then Speed |
| 4 | `How do I beat Glyphid Dreadnought?` | KB-ASKMODE-01 on screen; DRG-01 if in scope | Deep Rock Survivor | all three |
| 5 | `the slow-motion aiming barely lasts, how do I get more of it` | KB-ROUTER-01, the other direction (strategy cards, not a tip) | any covered game | Strategy |
| 6 | `raphael fight strategy` | STRAT-ENTITY-01 name-first | Baldur's Gate 3 | Strategy |
| 7 | `king dodongo fight` | STRAT-ENTITY-01 name-first | Ocarina of Time (UNKNOWN) | Strategy |
| 8 | `how do I beat king dodongo` | STRAT-ENTITY-01 verb-first comparison | Ocarina of Time (UNKNOWN) | Strategy |
| 9 | `fire boss that flies out of holes` | STRAT-ENTITY-01 safety: no entity named | Ocarina of Time (UNKNOWN) | Strategy |
| 10 | `how to raise a skill fast` | STRAT-ENTITY-01 safety: no entity named | The Sims 4 | Strategy |
| 11 | `best build` | STRAT-ENTITY-01: names nothing | any protect_progression title | Strategy |
| 12 | `im stuck` | STRAT-ENTITY-01: names nothing | any protect_progression title | Strategy |

Not chips: KB-EXPERT-01's pair (`what class should i pick`, `what should i upgrade`) runs through the
retrieval probe in lane B, because the Show details ladder prints no card count.

## 5. Session 1 — nothing running

In this order, so that settings change as few times as possible. Evidence per row in § 9.

1. **Fresh open, SMOKE-A** — open, LB/RB through all six tabs (TAB-MARKER-01), Ollama → Test
   connection, one short Ask with D-pad through the chunks, Show details, two chips side by side.
   Also closes **SHELL-PAYLOAD-01** (each tab renders and responds, one Ask end to end) and the Main-tab
   half of **D11-SHIM-01** (a real Ask against a reachable host).
2. **Tab-bar re-runs** — DOC-SWEEP-01 (Settings Up lands on the bar), CHAT-SLOTS-V3-01 (the walk
   starts at the bar), TAB-SWITCH-01 (RB through the strip with focus deep in a scrolled panel, wrap
   included). **TAB-BAR-09**'s desktop-note opener: `filesystem_write` is already on.
3. **Focus rows, no Ask needed** — ONBUTTONDOWN-AUDIT-01 (keep-alive, reply verbosity and connection
   timeout sliders: record *nothing happens* against *two steps*), THINK-EFFORT-05, TAB-RESUME-FOCUS-01,
   TAB-RESUME-MODE-01 (A / B / C, one close-and-reopen each), TAB-RESUME-01 (resume, and note the
   first-press snap), KIDS-REGRESS-01 (Permissions with no parental controls: no banner, toggles live).
4. **SMOKE-C** and one PERM-JUMP-01 row (a capability off → blocked action → Open Permissions → Back);
   restore the capability. **SMOKE-F** (`bonsai:disable-sanitize`, `bonsai:enable-sanitize`,
   `bonsai:shortcut-setup-deck`, `bonsai:vac-check` with Steam Web API off = **VAC-01**), then
   **VAC-02** (on, empty key).
5. **Preset rows with the batch cleared** — PRESET-KB-SEED-01 (KB on, watch the carousel for 60 s:
   the *Enable local knowledge base* chip must not appear), PRESET-ONE-LINE-01b (Developer → animation
   mode through carousel / fade / static / decode, one swap each; restore carousel). Then pin batch 1
   with the panel closed.
6. **Batch 1, Speed** — chips 1 to 4: Show details reads *Source: shared troubleshooting tips*, and
   the Proton-log permission hint does not appear. Chip 5: `KB: no game running`; KB off, chip 5 again:
   `KB: off`; KB on. Chip 6, **CLEAR-CACHE-01**: one bubble, Settings → Clear cache → Main empty, close
   the QAM, reopen, still empty; the log shows `forget_background_game_ai: stored answer dropped`; count
   chat slots before and after (the orphan half). Mid-generation half: park the ring on Clear cache,
   submit the longest Strategy prompt on `qwen3.5:4b` at Deep from the Ask bar, walk back and clear
   while it writes; if the model still finishes first, record the timing and leave the half open.
7. **Batch 1, Strategy** — chips 7 to 11 (**KB-ANSWER-02**): fence absent on 7 to 10, present on 11,
   branch menu on all five, read from the DOM. Chip 7's Show details: the credit block's date for
   **KB-ATTRIB-01**. Chip 11's fence: A to reveal, and the *Spoilers OK* phrase path (**SMOKE-E**). One
   branch pick on any of these, close, reopen, read the header: `I'm at: …` (**CHAT-HEADER-CAPTION-01**).
   After every Strategy follow-up this session, grep the plugin log for
   `checklist fence present but did NOT parse`; on a hit, read that reply for `{"title"`
   (**STRAT-CHECKLIST-JSON-01**, a watch-for row).
8. **Chat slots with real Asks** — CHAT-SLOTS-V2-03 (LB away mid-Ask, reply lands in the first slot),
   V2-04 (close the QAM mid-Ask, reopen: the pending question is visible; this is also **SMOKE-H**, and
   its two re-checks: the live question stays through to the answer, and no duplicate on the next Ask),
   V3-05a/b, V3-06a/b/c (the toast with the QAM closed), V3-07 (a slot with three archived turns shows
   the *3 earlier* pill), V3-15d (the title changes live from *New chat*).
9. **Streaming and the thinking line** — sample the line text and computed style once a second through
   each Ask. STREAM-01/02 re-run with streaming off, STREAM-04 (Stop keeps the draft, *Stopped* notice),
   STREAM-09 (D-pad through sections while streaming, each landing visible), STREAM-FOLLOW-01 D-pad half,
   STREAM-REVEAL-01 (record with `scripts/record-deck.ps1`; the by-eye verdict is Session 3).
   THINKING-EMOJI-01 (emoji upright, prose italic), THINKING-COPY-01 (one opener in the first 2 s),
   THINKING-LIVE-01 (Expert, a 30 s+ answer: irregular beat, no line held over 15 s), THINKING-SPOILER-01
   (chip 11: blocks, never plain words, never literal markup), THINKING-EMOJI-CLUSTER-01 (troubleshooting
   Asks with a screenshot attached so several prep phases fire), THINKING-SANITIZE-01 (watch-for).
   **QA-FREE-PLAY-01** on the longest reply of the session, at two carousel positions.
10. **Thinking effort and the caps** — route text to `qwen3.5:4b` through *Set text try order*, restore
    after. THINK-EFFORT-04 (Brief / Balanced / Deep: answers arrive, the log's `completed in` grows, no
    reasoning in the reply body; then `gemma4:e2b-it-qat` with thinking on: one *Thinking not supported*
    toast, not two; the 400 body is read from wherever `ollama serve` logs, UNKNOWN until the window).
    SOFT-PREDICT-05 (thinking off on the thinking model: a visible reply). SOFT-PREDICT-01 (Speed, a
    prompt that hits 800 tokens: the cue shows, then is absent from the saved text), SOFT-PREDICT-03
    (poll the DOM, press Stop while the cue shows), SOFT-PREDICT-04 (Strategy, a continue mid-fence: no
    stray JSON), EXPERT-CAP-01 (`soft_continues=` in the log for a long Expert answer).
11. **Voice** — VOICE-REINSTALL-01 (Settings → Voice input: the ready label and *Reinstall voice
    engine*, D-pad to the button; pressing it re-downloads, so read the label and stop). D11-SHIM-01's
    voice start/stop round trip: one press pair.
12. **Measurements** — ASK-WIDTH-01 (`scripts/probe_deck_ask_row_width.py`, character off and on, after
    LB/RB away and back; PNG via `scripts/screenshot-deck.ps1`), BONSAI-ICON-GEOM-01 (PNG of the strip
    icon and Decky's list icon; the pre-fix capture is one of the 2026-08-06/07 files under
    `screenshots/`, which one is UNKNOWN).
13. **Clear all plugin data** — only if D57 #4 is yes, and only as the last step of the last session:
    back up `settings.json`, `chat_slots`, `chat_threads`; clear; **VOICE-CLEAR-01** (Voice input no
    longer claims ready), **TAB-RESUME-01** (next open is Main), **SHELL-PAYLOAD-01** (the Ollama tab
    after the clear); restore the backups.

## 6. Session 2 — games running (D57 #3 decides who launches)

Pin batch 2 first, panel closed.

- **Deep Rock Survivor** (`2321470`, SD card) — chips 1 to 3 in Strategy: Show details reads
  *Keyword + meaning* and the embed time sits in the 800 to 900 ms band; the same three in Speed:
  *Keyword search*, no embed time (**KB-RECALL-01**). Chip 4 in all three modes (**KB-ASKMODE-01** on
  screen; the counts come from lane B). Chip 5 (**KB-ROUTER-01**, the other direction). Create a chat
  while it runs: the game's name above the title, older chats empty (**CHAT-SLOTS-V3-14c**).
- **Black Mesa** (`362890`, not in the corpus) — unload the model over SSH first (`keep_alive` 0),
  then one Ask: *building context*, then *connecting / waking the model*, before any text
  (**THINKING-SLOW-01**). Then batch 1's chip 5 wording typed once with `scripts/deck_send_ask.py`:
  `KB: none for this game`, and it must read differently from `KB: no game running`
  (**KB-COVERAGE-01**, **KB-COVERAGE-NOAPP-01** second half).
- **Half-Life 2** (`220`) — the longest label: both crawl, the *Tip* badge stays pinned, a chip does
  not rotate away before its label has scrolled once; frame sampling with decode on
  (**PRESET-ONE-LINE-04**; the speed-by-eye and reduced-motion halves are Session 3).
- **Baldur's Gate 3** (`1086940`, SD card) — chip 6: Raphael's tactics unfenced, everything else the
  reply touches still fenced; chips 11 and 12 name nothing (**STRAT-ENTITY-01**).
- **The Sims 4** (`1222670`) — chip 10: Show details names no entity.
- **Ocarina of Time** — runs as **Ship of Harkinian**, a non-Steam shortcut (`soh.appimage`,
  shortcut app id `2593781457`), launched by name from the Recent Games shelf. Chips 7 to 9.

## 7. What you need to do in person, and when

Only you clear these. The rig writes what it measured and leaves pictures next to each item, but it
never ticks a box here; you tick it when you have seen the thing yourself and said so in chat.

**When:** after Sessions 1 and 2 are done. The rig says so in chat and sets the panel up for each
item as you reach it. About twenty minutes at the Deck, in this order.

**Why any of this needs a person at all.** The rig drives the Deck through a controller board and
reads the page back as data. That gives it three senses and no more: it knows where the focus ring
is, what the page says, and how big things are in pixels. It cannot see the screen, it has no
fingers, and it cannot type a secret. Every item below fails on one of those three gaps, and each
one says which.

- [ ] **Read the tab names.** Open bonsAI and press Down twice; the thin bar opens into the strip.
  Can you read all six names at that size? The lit dash and name should be gold with Ali G or the
  TF2 Announcer, purple with Shadowheart, green otherwise. Close the QAM and reopen it: the bar names
  the tab you were on. *(TAB-BAR-07)*
  **Why you:** the rig can measure that the text is 11px and gold. It cannot tell you whether 11px
  gold text is *readable* at arm's length on a 7-inch screen. That is a judgement about your eyes,
  and screenshots on this device are broken, so it cannot even show you a picture instead.

- [ ] **Tap the tab bar with a finger.** Tap the thin bar: the strip opens. Tap a tab: it switches and
  the strip closes. Open it again and tap outside it: it closes. *(TAB-BAR-08)*
  **Why you:** the controller board can only send button presses. There is no way for it to produce a
  touch event on the real screen, and faking one in the page would prove nothing — the whole point of
  the row is that the real touch path works.

- [ ] **Drag a streaming reply with a finger.** Ask something long with streaming on. While the answer
  is still arriving, drag the reply up: it must stay where you put it and not jump back down. Drag
  back to the bottom: it follows the new text again. *(STREAM-FOLLOW-01, touch half)*
  **Why you:** same missing finger. The rig will have already checked the D-pad half of this row, so
  all that is left is the drag.

- [ ] **Watch the chip labels crawl.** With Half-Life 2 running and the knowledge base on, watch the
  two preset chips: the long label should crawl slowly and calmly, the *Tip* badge should stay
  still, and a chip should not swap out before its label has scrolled through once. Say whether it
  is too fast, too slow or right; the rig writes the speed back into the code. Then turn on reduced
  motion in Steam's accessibility settings and reopen: no crawl, the label is cut off with "…".
  Turn it back off. *(PRESET-ONE-LINE-04, by eye)*
  **Why you:** the speed setting has no unit Steam documents, so the only way to pick a number is for
  someone to watch it move and say "slower". The rig can confirm the animation is running; it cannot
  have an opinion about how it feels.

- [ ] **Look at the panel edges.** Main tab, character off: the chips, the text box and the Ask bar
  should reach the panel's edges with no gutter, all three lined up. Then character on. The rig's
  measurements and PNG are next to this item. *(ASK-WIDTH-01)*
  **Why you:** the rig measures each row's width in pixels and will report them, but three rows can
  each measure 300px and still look wrong together — a shadow, a border, one row sitting a pixel low.
  Lining up by eye is the actual test.

- [ ] **Look at the tree icon.** The pot should sit centred under the canopy, both in the tab strip
  and in Decky's plugin list. The rig leaves a PNG of each. *(BONSAI-ICON-GEOM-01)*
  **Why you:** the bug was "the pot sits 1px right of the canopy". At that size, whether the fix looks
  centred is a matter of what your eye reads as centred, not what the numbers say.

- [ ] **Read the five spoiler-fence replies.** The rig leaves them in one chat slot. Four should read
  naturally with no hidden block; the Red Dead one should hide its ending behind a block. Does the
  fencing feel right? *(KB-ANSWER-02, feel)*
  **Why you:** the rig already checked the mechanical half — five of five landed correctly on
  2026-09-03. What is left is whether the answers *read* well to a player, which is taste.

- [ ] **Watch a new chat get its title.** Make a new chat with [+], ask anything, stay on it: the row's
  title should change from *New chat* to your question when the answer lands, without closing the
  panel. *(CHAT-SLOTS-V3-15d)*
  **Why you:** the rig can read the title before and after and see it change. What it cannot see is
  the moment in between — whether the row flickers, jumps or redraws in a way that looks broken while
  the text swaps.

- [ ] **Press Update knowledge base with your thumb.** Ollama tab, D-pad to the button, press A with
  your eyes on the toast: does an update start? A bridge press did nothing on 2026-09-02. *(Bugs)*
  **Why you:** this is the odd one out — the rig *did* press it and nothing happened. Either the
  button is broken or the board's press is not landing the way a thumb does. Only a real press can
  tell those two apart, and which one it is decides whether this is a bug at all.

- [ ] **Turn on Family View.** On a spare adult account, set a Family View PIN and lock it. Open
  bonsAI → Permissions: a banner, greyed toggles, and privileged actions refused. Tell the rig it is
  locked; it runs the D-pad row. Unlock: the previous values come back. *(KIDS-LOCK-01, then the rig's
  KIDS-FOCUS-01)*
  **Why you:** Family View is guarded by a PIN that only you know, and setting it up means going
  through Steam's own account screens. The rig must not be the thing that can switch a parental lock
  on and off. Once you have locked it, the rig takes over and walks the rows.

- [ ] **Type your Steam Web API key.** Permissions → Steam ban lookup on; enter the key where the
  plugin asks. Tell the rig; it runs the four cases, you never type again. Remove the key afterwards
  if you like. *(VAC-03 to 06)*
  **Why you:** it is a secret tied to your Steam account. It should be typed by you, into the device,
  and never pass through a chat transcript or a script. After that one step the rig does the rest.

- [ ] **Say "clear it".** The last phase: Clear all plugin data. The rig has already copied your
  settings and chats aside (`settings.json.bak-round31`, `~/bonsai-round31-chats.tgz`); it runs the
  three checks and restores them. It waits for that word.
  **Why you:** it deletes your settings, your chats and the knowledge base in one press. Backups
  exist and the rig will restore them, but a destructive action on your own device is your call to
  make out loud, not the rig's to assume.

Not scheduled, stay open: **KIDS-LOCK-02** (needs a child account) and the **quick-launch macro**
checklist (Steam Input; only if you use the macro).

## 8. Lane B — over SSH, alongside lane A

- **KB-EXPERT-01** and **KB-ASKMODE-01**: `scripts/probe_deck_kb_retrieval.py` with `--pool`, app id
  `2321470`, for `what class should i pick`, `what should i upgrade` and
  `how do i beat the glyphid dreadnought` in each mode; Expert attaches at least as many cards as
  Strategy, Speed fewer, and an off-topic sentence in Speed attaches nothing. The probe's per-mode flag
  is read from its `--help` at run time.
- **KB-RECALL-01**, the card half: the three batch-2 sentences through the same probe before
  Session 2, so the screen run only has to confirm the ladder and the timing.
- **KB-ROUTER-01**, the retrieval half: the four batch-1 sentences with no app id (KB-ROUTER-02 was
  closed this way).
- Never during a timing row (§ 3).

## 9. Evidence and bookkeeping

- Walks: `runs/<ROW>-<what>.json` from `deck_runSequence`, with step 1's `from`. Geometry:
  `deck_readPage`. Pictures: `scripts/screenshot-deck.ps1`; video: `scripts/record-deck.ps1`.
  DPS's own screenshot tool is broken on this install.
- A pass flips the row in [testing.md](../testing.md) or [testing-manual.md](../testing-manual.md) and
  moves the roadmap entry to Done, with the full entry in the archive, in the same commit (roadmap
  house rule 4). Lane C does this while lane A drives.
- A device result that contradicts the code: check the installed bundle first (compare the md5 of
  the Deck's `dist/index.js` against the local build).
- Settings restored at the end from the backup taken at the start (`settings.json.bak-round31`).

## 10. Rows this round cannot close, and why

- **STRAT-CHECKLIST-JSON-01**, **THINKING-SANITIZE-01**: watch-for rows; they close only if the model
  happens to misbehave during the session.
- **KIDS-LOCK-02** (a child account), the **quick-launch macro**, **VAC-03 to 05** (a key): unless
  D57 #9 schedules them.
- **ROUTING-MERGE-01**: unless D57 #5 allows the pull.
- **STRAT-ENTITY-01**'s three Ocarina of Time sentences: only if Ship of Harkinian is on the Recent
  Games shelf, which is where `deck_launchGame` finds a title.
- **ROUTING-MERGE-01**'s model pull: deferred by the rig's judgment (D57 #5); runs only if the Verify
  rows finish with time left.
- **STREAM-11** (bursts with a game running): a Bugs entry that needs a call, not a Verify row.
- The by-eye and touch halves listed in § 7: Session 3 only.

## 11. Progress log, 2026-09-03

Written as rows close; evidence file names are under `runs/`.

- **00:48** Backups taken (`settings.json.bak-round31`, `~/bonsai-round31-chats.tgz`). The panel was
  left open on Ollama by the other chat; closed it with B, B (`round31-close-panel-before-chip-edit`),
  cleared the frozen batch over SSH with the panel closed, reopened with `deck_openPlugin`.
- **Lane B** (`round31-laneB-probes-1.txt`): KB-EXPERT-01 probe half PASS (1 / 3 / 5 cards for both
  questions), KB-ASKMODE-01 count half PASS (1 / 3 / 5, was 1 / 1 / 1), KB-RECALL-01 card half PASS
  (all three sentences attach in Strategy), KB-ROUTER-01 retrieval half PASS (storage, steam_input,
  anticheat, emudeck). Open question for Session 2: the probe reports Speed hits as `hybrid`, which
  Show details labels *Keyword + meaning*, while KB-RECALL-01 expects *Keyword search* in Speed.
- **SMOKE-A, first half:** the panel opens on Main with no crash; RB on the bar cycles Main → Ollama →
  Settings → Permissions → Developer → About → Main (`SMOKE-A-02-tab-cycle-from-the-bar`);
  TAB-MARKER-01's colour half holds — the bar's name reads gold (Ali G) while the ring is deep in the
  Ollama body and the other cells stay grey; Test connection reads `Connected · Ollama v0.32.15 ·
  4 models`, no traceback; two preset chips sit side by side at x 48 and x 200, 148 × 30 each; a
  short Ask from the [+] position (`reply with only the word echo`, Strategy) created a new chat and
  answered `echo` in 11.9 s with one bubble. The first run pressed RB on the slot row instead of the
  bar (switched chats six times; walked back with LB × 7, `CHAT-SLOTS-round31-LB-to-create`), which
  incidentally showed the *14 earlier* pill as a D-pad stop on an old chat (CHAT-SLOTS-V3-07's pill half).
- **Note:** KB-ANSWER-02 was flipped to Verified (Deck) 2026-09-03 by the other session before the
  hand-over (its five Asks are in the plugin log, 23:40 to 23:52), so batch 1 lines 7 to 11 now serve
  only THINKING-SPOILER-01, SMOKE-E and KB-ATTRIB-01's date check. That session also holds uncommitted
  code changes in this checkout; the Deck still runs `3b0e9d7`, checked by md5 before timing rows.
- **SMOKE-A, second half — PASS on this build.** D-pad through the one-chunk reply, then Retry →
  Show details (`SMOKE-A-05-show-details`): the ladder read *Chip 1 of 5 · KB: no game running ·
  Reply style: balanced · Spoiler risk: med · Routed gemma4:e2b-it-qat · Developer details*, with the
  coverage bullet *No game is running, so there is nothing to look up* — which also re-confirms
  KB-COVERAGE-NOAPP-01's first half and CONTEXT-LADDER-01 on a live turn. The walk up from the Ask
  button visited attach → avatar → chip → session strip → Retry → Helpful → answer → header → slot row
  → bar → Decky Back, every stop visible.
- **CLEAR-CACHE-01, main half PASS; two findings.** Settings → *Clear cache…* → *Clear*: the log shows
  `forget_background_game_ai: stored answer dropped (stopped=False)` (01:05:05), Main then shows the
  [+] position with 0 bubbles, 0 turns and no *echo* on screen (`CLEAR-CACHE-01-b-after-modal-back-to-main`).
  **Orphan half, measured:** the saved chat stays — 8 slots on disk before and after, the *reply with
  only the word echo* chat still in the carousel with its two turns; a clear moves the panel to [+] and
  leaves the chat behind, so every clear-and-reask cycle leaves one more chat in the rotation.
  **Finding, modal return:** when the *Clear cache* confirmation closes, the ring lands on Steam's hidden
  *Settings* tab button (0 × 0, offscreen) — a focused-but-not-visible stop the D55 trap did not catch;
  the next Down went to *Adjust UI automatically*, so it is one dead press, not a trap. TAB-BAR-09
  covered three openers; this is a fourth. Close-and-reopen half and the mid-generation half follow.
- **CLEAR-CACHE-01, reopen half PASS.** QAM closed with the real chord and reopened: the panel had
  stayed mounted (Decky keeps it), Main still empty at [+]. Then a true remount — B to the bar, B to
  the Decky list, `deck_openPlugin` — and Main came back on the Main tab (resume) at [+] with 0 bubbles,
  0 turns, no *echo*, 9 dots (`CLEAR-CACHE-01-c-close-panel-for-remount`). Second finding of the same
  class: after the chord reopen the ring sat on Steam's hidden *Main* tab button (offscreen), one dead
  press again. Mid-generation half: deferred to the thinking-model step, where a Deep Ask is long
  enough to walk to *Clear cache…* while it writes.
- **CHAT-SLOTS-V3-01 re-run PASS** (`CHAT-SLOTS-V3-01-rerun-fresh-open-walk`): from a fresh open the
  first Down lands on the bar (openPlugin had already spent a Down on the Decky list, so Decky's
  Back is skipped — TAB-BAR-02's "Back first" holds only for a truly cold ring), Down → slot row →
  preset chip (empty slot) → text field → ask, Down at ask stalls; Up: ask → attach → avatar → chip.
  **Observation, not a Verify row:** Up on a preset chip steps back through the carousel's chip
  history one chip per press (four presses here) before it leaves upward to the slot row
  (`PRESET-ROW-up-from-chips-probe`); every stop was visible, but a user pressing Up to leave the
  chips needs up to five presses. Worth a maintainer look; nothing in PRESET-ONE-LINE-03 forbids it.
- **DOC-SWEEP-01 re-run PASS** (`DOC-SWEEP-01-settings-free-play`): Settings swept down and back
  up, 15 controls in 31 presses, every stop visible, no ghost stop; Up from *Adjust UI automatically*
  lands on the bar, then Decky's Back. **SHELL-PAYLOAD-01, Settings and Permissions halves:** both
  render and every control takes the ring (`SHELL-PAYLOAD-01-permissions-sweep`: four toggles, all
  visible). **KIDS-REGRESS-01 PASS:** with no parental controls the Permissions tab shows no banner
  and its four toggles are live; the API key for the ban lookup lives under Developer → Integrations.
- **SHELL-PAYLOAD-01, Developer half, with one finding** (`SHELL-PAYLOAD-01-developer-sweep`): 13
  controls take the ring; the sweep flagged **the *Clear frozen test chips* button as focused but
  clipped out of view** at the moment of its read, yet a DOM read a few seconds later found the
  button 40 px tall with every ancestor `overflow: visible` — so this is either a read taken
  mid-scroll or a real clip that depends on scroll position. **Re-measured at rest 01:23** (`TAB-RESUME-MODE-01-h-restore-C-and-remeasure-clear-chips-button`, then `deck_readFocus`): the ring
  sits on the button, rect 64 × 635, 268 × 40, inside the pane, the button carries Steam's
  `Disabled` class (no batch pinned), and the oracle still reads it as clipped at every probe point —
  most likely because a disabled button has `pointer-events: none`, so `elementFromPoint` hits its
  parent. The real finding is smaller than "invisible": **a disabled button takes the D-pad ring**, one
  dead stop at the bottom of Developer whenever no batch is pinned. Bugs-list candidate, ★.
- **TAB-RESUME-FOCUS-01 PASS** (`TAB-RESUME-FOCUS-01`): on the D15 row Right walks A → B → C and
  stops at C, Left walks back, Up leaves to *Jump to Steam Input* in Diagnostics, Down re-enters on
  A · Main, a second Down leaves to *App activity logging*; `tab_resume_mode` on disk stayed
  `resume_recent` through all eight presses, so no button acted on a direction press. Note for the
  row's wording: *Jump to Steam Input (running game)* sits between the debug HUD and the D15 row
  even with no game running, so "Down from the HUD reaches the three buttons" takes two presses.
- **TAB-RESUME-MODE-01, A · Main PASS:** A on the button wrote `tab_resume_mode: always_main`; left
  the panel from About (B to the bar, B to the Decky list), reopened with `deck_openPlugin`: the bar
  read *Main* (`TAB-RESUME-MODE-01-a-select-main-and-close`). Back on Developer, the A button was the
  highlighted one, so the choice persisted. **C · 5 min, first half PASS:** selected C, left from
  About, reopened within a minute: the bar read *About* (`TAB-RESUME-MODE-01-c-select-5min-and-close`).
  The five-minute fallback half is run by closing from About (01:15) and waiting more than five
  minutes before the reopen. Correction to the plan's § 2: the setting values are `always_main` = A,
  `resume` = B, `resume_recent` = C, so the maintainer's setting before the round (`resume_recent`)
  is **C**, not B; B is tested next and C is restored at the end.
- **Lane B, second probe file** (`round31-laneB-probes-2.txt`): KB-ROUTER-01's other direction —
  *"the slow-motion aiming barely lasts, how do I get more of it"* with Deep Rock Survivor in context
  attaches strategy cards (Praetorian; Hollow Bough, Praetorian, Upgrades and overclocks in
  Strategy), not a troubleshooting tip; *"raphael fight strategy"* on Baldur's Gate 3 attaches one
  card (Sneak Attack — the corpus has no Raphael card, so the fence check on screen is the whole
  test); *"how to raise a skill fast"* on The Sims 4 attaches *Raising a skill quickly*. Also learned:
  the Deck's `ollama serve` writes stdout and stderr to `/dev/null`, so THINK-EFFORT-04's "capture the
  400 body" half can only use what the plugin log records.
- **TAB-RESUME-MODE-01, C · 5 min second half PASS:** closed from About at 01:15:21, reopened at
  01:20:50 — the bar read *Main*, so the five-minute window fell back to Main as the label promises.
  Back on Developer the C button was the highlighted one. **B · Resume PASS:** selected B (disk:
  `resume`), left from About, reopened at 01:21:49 on *About*
  (`TAB-RESUME-MODE-01-f-select-resume-and-close`). **TAB-RESUME-MODE-01 is complete**; C is being
  restored. TAB-RESUME-01's known gap (first D-pad press after a reopen snaps to the top) is unchanged
  and was never built, per its row. C restored on disk (`resume_recent`) at 01:23.
- **PRESET-KB-SEED-01 PASS:** KB on, batch cleared, carousel mode, Main watched for 65 s straight
  after the chips mounted: nine distinct chips came round and *Enable local knowledge base for better
  game tips* was never one of them (poll log in the transcript; labels: find Ollama on my LAN, 60fps
  settings, quick-launch chord, token streaming, input lag, Open Steam Input config, TDP for menus, get
  past this part, FPS and battery). **PRESET-ONE-LINE-01b, carousel half:** the two-wide window
  slid one chip in from the right at 1, 7, 12, 18, 24, 30, 35 and 41 s — a swap every six seconds —
  then stopped, which matches the 60-second timer that runs from mount.
- **PRESET-ONE-LINE-01b PASS, every mode still moves** (mode set from Developer's *Preset
  animation* buttons by D-pad, watched on Main at 200 to 300 ms samples; `PRESET-ONE-LINE-01b-c/d/e`):
  **fade** — the outgoing chip went 1.0 → 0 over about 1.4 s and its replacement 0 → 1 over about
  0.9 s while the other chip stayed at full opacity; then the other slot did the same; the row never
  had fewer than one visible chip. **static** — four instant swaps in 25 s, opacity always 1, both
  chips always present. **decode** — the new label scrambles in with a caret and resolves left to
  right over about 1.3 s while the other chip stays put; one 200 ms sample caught an empty label at
  the very start of a swap. Carousel restored afterwards. The first attempt pressed RB on the chat-slot
  row and switched chats instead of tabs (`PRESET-ONE-LINE-01b-a-set-fade`, harmless; the panel now
  sits on an older chat until the next walk back to [+]).
- **THINK-EFFORT-05 PASS** (`ONBUTTONDOWN-AUDIT-01-and-THINK-EFFORT-05-b`): Down from the Reply
  style slider lands on the Thinking row at *Off*; Right walks Off → Brief → Balanced → Deep and stops
  at Deep; Left walks back; Down leaves to *Custom timeouts*; Up returns to the Thinking row and a
  second Up to the Reply style slider; no button acted on a direction press.
- **ONBUTTONDOWN-AUDIT-01, sliders — FINDING, the "focus escapes" answer.** Left on the Reply style
  slider stepped the value (Balanced → Caveman) **and** let the ring leave the panel onto Steam's
  Quick Access tab rail (`#quickaccess_tab_999`); the next Right brought the ring back onto the slider
  without stepping it. Left on the keep-alive slider did the same (240m → 120m, ring on the rail,
  Right returned it). So the handler runs but the press is not consumed: one step, then Steam's own
  navigation moves the ring out of the plugin to the left. Of the two outcomes the row was written to
  tell apart, this is the "focus escapes" one. **Right is fine:** Right on the keep-alive slider
  stepped 120m → 240m and Right on the Reply style slider stepped Caveman → Balanced, the ring
  staying put both times (`ONBUTTONDOWN-AUDIT-01-c-right-steps-and-timeout-sliders`). With *Custom
  timeouts* on there is one slider row (*Soft warning: 60s | Hard timeout: 180s*); Left on it also
  sent the ring to the Quick Access rail, and its values did not change. So: **Left = one step and
  the ring leaves the plugin; Right = one step, ring stays** — Steam has nothing to the right of the
  panel, so only Left shows the unconsumed press. Bugs-list entry, ★★ `[focus]`. Reply style is
  back on Balanced, keep-alive back on 240m, Custom timeouts back off (all three confirmed on disk).
- **VAC-01 / SMOKE-F third command PASS:** with *Steam ban lookup* switched off by D-pad on
  Permissions, `bonsai:vac-check` from the [+] position answered at once with the capability
  message (*Steam Web API is off for bonsAI. Enable Permissions → Steam Web API, add your Web API
  key under Developer → Integrations, then run: bonsai:vac-check 7656119…*), an *Open Permissions*
  control under the reply, and no Ollama call in the plugin log (`start_background_game_ai: RPC
  entry` at 01:34:31, nothing after it). **Finding:** the turn header of that command reply reads
  `…` (the live title span holds an ellipsis) and the chat it created is titled *New chat* — the
  live question is blank for a deterministic command reply, the same "…" symptom SMOKE-H's 2026-08-23
  fix addressed for mid-thinking reopens.
- **SMOKE-C / PERM-JUMP-01 FAIL on the first step: *Open Permissions* is not a D-pad stop.** The
  button is on screen (115 × 34 px at y 497, between the reply actions and the session strip, a
  `button.Focusable` with **no `tabindex`**), but Down from Retry or Copy jumps straight to the
  session strip and Right from Copy stops (`PERM-JUMP-01-a-find-open-permissions`,
  `runs/…` walks up and down never listed it). Same shape as the chat-slot row's 2026-08-30 bug:
  a Focusable without a tab stop is a container to Steam. The jump-to-toggle and *Back to …* halves
  cannot be driven until it is reachable; the ban-lookup toggle is switched back on by D-pad.
  Bugs-list entry, ★★ `[focus]` `[perms]`.
- **VAC-02 PASS:** ban lookup on again (disk: `steam_web_api: True`, no key saved), `bonsai:vac-check`
  answered at once with *No Steam Web API key saved. Register a key at Steam Web API (see README),
  paste it under Developer → Integrations → Steam Web API key, save, then try again* — no Ollama call
  (log: `start_background_game_ai: RPC entry` 01:38:33, nothing after). The command replies replace
  each other in the live turn (one turn slot, no *earlier* pill), and the header again reads `…`.
- **Session 1 paused: the Deck went to sleep** (`deck_status` reports `deckReachable: false`, SSH
  times out). Known behaviour after a long pause; no deploy is needed, the maintainer just wakes the
  device. Everything that needs the screen or the buttons stops here. Settings are back as they were
  found — `resume_recent`, carousel, Balanced, 240m, custom timeouts off, all five capabilities on —
  and the frozen chip batch is still empty, so the round resumes cold at § 5 step 6: pin batch 1,
  then the Speed chips.

### Where session 1 stands

| Row | Result |
|---|---|
| SMOKE-A | **PASS** |
| SMOKE-F | third command **PASS** (VAC-01); the two sanitize commands and shortcut-setup owed |
| VAC-01, VAC-02 | **PASS** |
| SMOKE-C, PERM-JUMP-01 | **blocked** — *Open Permissions* is not a D-pad stop |
| CLEAR-CACHE-01 | main, reopen and orphan halves **PASS**; mid-generation half owed |
| CHAT-SLOTS-V3-01, DOC-SWEEP-01 | **PASS** (two of the three re-runs the tab bar asked for) |
| TAB-SWITCH-01 | not started |
| TAB-RESUME-01, -MODE-01, -FOCUS-01 | **PASS** — D15's three modes measured end to end |
| PRESET-KB-SEED-01, PRESET-ONE-LINE-01b | **PASS** |
| THINK-EFFORT-05 | **PASS** |
| ONBUTTONDOWN-AUDIT-01 | **answered: focus escapes** — a bug, not a pass |
| KIDS-REGRESS-01 | **PASS** |
| SHELL-PAYLOAD-01 | five tabs pass; About and the Ollama-tab-after-clear check owed |
| KB-EXPERT-01, KB-ASKMODE-01, KB-RECALL-01, KB-ROUTER-01 | probe halves **PASS** (lane B) |
| Owed in session 1 | batch 1 chips (KB-ROUTER-01 and the two KB-COVERAGE cases on screen), the Strategy chips, the chat-slot rows that need real Asks, the streaming and thinking-line rows, THINK-EFFORT-04, the soft-cap rows, voice, and the ASK-WIDTH / icon measurements |

**Six bugs found so far**, all filed to the roadmap: the ring landing on Steam's hidden tab button
after a modal closes or the QAM reopens; Up on a preset chip walking back through the chip history;
Left on the Ollama sliders stepping the value and then throwing the ring out of the plugin; the
disabled *Clear frozen test chips* button taking the ring; *Open Permissions* not being reachable at
all; and the blank `…` turn header on a deterministic command reply.

### Session 1 resumed, 2026-09-04

The Deck was woken by the maintainer. Deploy first: `main.py` and `dist/index.js` already matched
HEAD, `ollama_service.py` did not (commit `bb377d7`), so `deck_deploy` ran and both service files
now match. Ollama answers on 127.0.0.1:11434, v0.32.15, 4 models, corpus 2026.09.01 installed.

**Screenshots are not broken after all.** `scripts/screenshot-deck.ps1 -Mode game` returns a full
1920x1080 PNG through gamescope's atom path, and `scripts/record-deck.ps1` plus ffmpeg (already on
the maintainer's PC) can measure motion. Section 7's "why you" reasons were rewritten around that:
the eyes items shrink to a confirm-my-finding, the fingers and say-so items are unchanged.

**KB-ROUTER-01 — PASS, all four sentences.** Speed mode, no game running, character voice on.
Every one routed to `compat_tips` with `Source: shared troubleshooting tips`:

| Sentence | Route |
|---|---|
| out of room, installs on the memory card | `compat_tips` |
| play alone but online kicks me out | `compat_tips` |
| only responds to the touchpad | `compat_tips` |
| playstation 2 games at half speed | `compat_tips` (answer names EmuDeck) |

Evidence: `runs/KB-ROUTER-01-q*.json`.

**KB-COVERAGE-01, the `KB: off` half — PASS.** *Use local knowledge base* was turned off on the
Ollama tab by D-pad, one Ask ran, and Show details read `KB: off` with the bullet *Local knowledge
base is disabled in Settings.* and no retrieval bullets. The toggle was turned back on and the
saved value re-read from disk (`use_local_knowledge_base: True`). `KB: no game running` was the
chip on all four routing turns, which is the correct no-app reading.

**New finding — a pinned batch of 11 shows only its first three sentences.**
`applyTempFrozenCarousel` ends in `resolved.slice(0, count)` ([presets.ts:264](../../src/data/presets.ts)),
and `count` is the three seeds the row asks for, so entries 4 to 11 only ever arrive if a chip
rotates out on its own. Right from the last chip does not advance to them. A non-frozen chip is
also on the row throughout (the screenshot chip, then *How can I optimize for battery life?*), so
the batch does not replace the carousel the way the Developer help text says. Workaround used:
re-pin three at a time, then close and reopen the panel.

**Second path proven for verbatim questions.** `scripts/deck_send_ask.py` writes the field over CDP
and prints VERIFIED; the Ask press stays a real button press. Much cheaper than walking the chip
row, and it leaves the on-device path under test.

#### Thinking, streaming and spoilers — 2026-09-04

`qwen3.5:4b` is already installed and reports the `thinking` capability, so **D57 #5's model pull was
not needed**. Forcing it first in `text_model_routing_order` (written with the panel closed) and
setting Thinking to **Deep** on the Ollama tab by D-pad gave a real thinking run.

- **THINK-EFFORT-04 — PASS.** Deep thinking, Strategy mode, the antlions question. 212 s to finish;
  Show details reads `Routed qwen3.5:4b`. All four segments of the Thinking row (Off / Brief /
  Balanced / Deep) took the ring by Left and Right, which re-confirms THINK-EFFORT-05.
- **THINKING-SANITIZE-01 — PASS.** Among 32 sampled phases one came from the model's own reasoning:
  *"Reviewing Antlion vibration hunting mechanics and sand trap safety..."* — the lazy status tag
  survived rather than being scrubbed.
- **THINKING-SLOW-01 — PASS.** The slow-path blurbs appeared in order and then cycled
  ("Taking its time. Local models do that." → "Still going — long answers take a while on a
  handheld." → "Not stuck, just slow silicon. Still writing." → "Still here. This one's a marathon.").
- **THINKING-LIVE-01 — PASS**, the line updated throughout; one writer, no interleaving.
- **Bare emoji:** none of the 32 phases contained an emoji, so the no-bare-emoji rule held. The
  upright-emoji check (THINKING-EMOJI-01) still wants a turn that actually prints one.
- **KB-ATTRIB-01 — the owed capture-date check PASSES.** The same turn's card list printed
  `combineoverwiki.net · CC-BY-SA-4.0 · as of 2026-08-09` over three named cards (Antlions,
  Sandtraps, Pheropod (bugbait)), trust tier `wiki_no_patch`.
- **STREAM-09 — PASS.** The reply's sections are individual D-pad stops: three
  `.bonsai-answer-stop` chunks, each `tabindex="0"`, each taking the ring in turn going Down.
- **STREAM-REVEAL-01 — PASS.** Sampled every ~300 ms from the Ask press: first text on screen at
  5.4 s, then 126 → 142 → 256 → 335 → 404 → 493 → 622 → 747 → 812 → 1025 → 1298 characters. Steady
  growth, no freeze-then-dump.
- **STREAM-FOLLOW-01, the D-pad half — PASS.** `scrollTop` stayed 0 while the answer fitted, then
  tracked the growing `scrollHeight` (84 → 174 → 270 → 516 as height went 789 → 1220), holding a
  constant ~55-85 px above the true bottom, which is the sticky Ask bar's height. The touch-drag
  half stays with the maintainer.
- **THINKING-SPOILER-01 and KB-ANSWER-02 (Red Dead) — PASS.** The ending question fenced:
  *Spoiler — tap to show / Hidden until you reveal (Strategy Guide).*
- **SMOKE-E tap-to-reveal — PASS.** A on the block revealed the hidden text and the label flipped to
  *Spoiler — tap to hide*.

Settings were put back afterwards: `ask_think_effort: off`, `text_model_routing_order: []`,
`use_local_knowledge_base: true`, reply style Balanced, all re-read from disk.

#### Five more defects found today

1. **A pinned batch of eleven only ever shows three chips** (`presets.ts` `applyTempFrozenCarousel`
   ends `resolved.slice(0, count)`), and a non-frozen chip sits on the row beside them.
2. **After a panel remount the ring parks on a zero-size container** ("Ask bonsAI", then "Where AI
   runs" on the Ollama tab) whose rect is 0x0 and which the visibility oracle calls OFFSCREEN — so
   the first thing a person sees is a panel with no visible ring.
3. **An answer stop can sit under the Ask input.** Walking up the Red Dead turn landed on a bubble
   that was only 67% visible, covered by `.bonsai-unified-input-text-box`'s input.
4. **Down does not move the ring off the spoiler block.** Once the ring is on
   `.bonsai-spoiler-reveal-target`, Down reports the press arriving and nothing moving.
5. **Going up skips the answer chunks.** Down walks the reply chunk by chunk; Up jumps from the
   feedback buttons straight past them to the bubble and then the turn header. Same shape as
   ONBUTTONDOWN-AUDIT-01.

Also worth a look, not filed as a defect: a **212 s answer completed although the configured
timeout is 180 s**, so the timeout is not a wall-clock deadline on the whole reply.

#### Soft cap and the branch-pick header — 2026-09-04

- **SOFT-PREDICT-01 — PASS.** Speed mode. A first attempt ("complete Half-Life 2 walkthrough") came
  back at 2,697 characters and never reached the wall, so the prompt was replaced with "a numbered
  list of 60 steam deck tips, each one a full paragraph". That one ran to **10,707 characters**, the
  `Continuing` cue was caught in a 400 ms sampler while the reply streamed, and the finished text
  contains no cue at all. Leaving the tab and coming back showed the saved history still clean.
- **SOFT-PREDICT-03 — PARTIAL, and it found something.** The ring was parked on *Stop generation*
  (which lives in the ask actions row, right of the mode chip, only while a reply is running), a
  poll watched for the cue, and Stop was pressed inside that window. The half the 2026-08-15 fix
  targets **passes**: generation ended, 3,628 characters of partial body were kept, and `Continuing`
  appears nowhere in the kept text. But **the promised "Stopped" notice never appears** — the word
  is absent from the turn, from the panel and from the whole page — and the stopped turn also loses
  its *Helpful / Not really / Retry* buttons, keeping only *Show details* and *Copy*.
- **CHAT-HEADER-CAPTION-01 — PASS.** A Hades Strategy Ask produced a branch picker
  ("A. Dodging Asterius's charge" / "B. Dodging Theseus's spear attacks"). Picking A gave a turn
  headed **"I'm at: Dodging Asterius's charge"**, and after closing the Quick Access Menu and
  reopening it the header still read exactly that — the caption the user saw, not the internal
  prompt. That closes the bug.
- **KB-ANSWER-02, Hades case — unfenced**, as expected for a no-story-spoiler question.

#### Tab switch, About, and the archive pill — 2026-09-04

- **TAB-SWITCH-01 — PASS, measured.** Focus was parked deep in a scrolled Ollama panel, then RB was
  pressed through the whole strip including the About → Main wrap, while a 16 ms sampler recorded
  `scrollLeft`, `scrollWidth` and `clientWidth` for the tab bar and all five of its children.
  **1,453 samples: `scrollLeft` never left 0 and `scrollWidth` never moved** (300 / 12 / 104 / 125 /
  13 / 300 throughout) — no transient inflation to lurch against, so the `overflow: clip` fix holds.
  The "focus parked on the tab icons" half is not runnable: Steam's own tab buttons are not focus
  stops here, which is what D55 routed around.
- **SHELL-PAYLOAD-01 — the About tab passes.** A full sweep found **7 controls, every one visible**,
  no cycles, nothing focused-but-hidden: *Follow system*, *GitHub*, *Built on Ollama!*,
  *Bugs & Feature Requests*, *Support my Steam Sale habit*, the About tab region and the back button
  (`runs/SHELL-PAYLOAD-01-about-sweep.json`). All six tabs now render and take the ring; only the
  Ollama-tab-after-Clear check is left, and that belongs to the final phase.
- **CHAT-SLOTS-V3-07 — PASS.** The **"12 earlier"** pill sat above the newest turn and was a D-pad
  stop; **A** expanded it into 13 header rows, the pill disappeared, and **focus landed on the first
  revealed row**. The "exactly one archived turn shows a header row and no pill" sub-check needs a
  slot with one archived turn and was not run.
- **Chat switching by shoulder button works both ways** from the slot row: RB moved to the *reply
  with only the word echo* slot and LB came back, each time with the right transcript.
- **STRAT-CHECKLIST-JSON-01 — a positive sighting.** The Hades branch-pick reply rendered its
  checklist as real items ("Identify the charge initiation animation", "Initiate a quick sidestep
  maneuver", …), not as raw JSON. That is the good case, not proof the bad case is gone.

**One sighting worth another look.** While the 40-tips Ask was in flight, a focus stop in the
expanded history read **`[Strategy follow-up] I'm at: Dodging Asterius's charge. Ear…`** — the
internal prompt, which is exactly the shape CHAT-HEADER-CAPTION-01 describes. It could not be
reproduced afterwards: with the archive fully expanded all 14 headers are clean and turn 12 reads
the caption *"I'm at: Dodging Asterius's charge"*, and the string appears nowhere in the transcript.
Recorded as transient; the row's reopen check still passes.

#### The chat-slot rows — one pass, one clear failure — 2026-09-04

- **CHAT-SLOTS-V2-03 — PASS on its main claim.** A long Ravenholm Ask was started in slot A, the
  ring was walked up to the slot row and **RB** switched to slot B mid-stream, then **LB** came back.
  The reply landed in **A**: both the question and its 5,749-character answer are in A's transcript.
- **CHAT-SLOTS-V3-05a — FAIL.** Slot B did **not** show only its own content. B's transcript is its
  own two turns (*reply with only the word echo* → *echo*) followed by a **Strategy branch block
  belonging to A's Ravenholm question**: *"Where are you at in … ? A. Just starting in the town area
  / B. Dealing with a tough encounter or trap"*. It is still there after A's reply finished, so this
  is not a mid-stream race — **the Strategy thread block renders in whichever slot is on screen,
  regardless of which slot generated it.** The same shape was visible earlier: while viewing B, a
  *"Dodging Asterius's Charge — Progress is saved for this game…"* block from A's Hades thread was
  showing. Two further parts of the row also fail: B's **ask bar does not read busy** while A is
  streaming (the button still says *ask*, no *Stop generation* control), and the branch question
  renders its game name elided as **"Where are you at in … ?"**.
- **Walking up with the archive expanded skips the chat slot row.** From the first archived header,
  18 Up presses went to the tab bar and then Decky's own back button without the slot row taking the
  ring. Coming back down, two Down presses reached it normally, so the row is reachable — the upward
  path is the broken one. Same family as ONBUTTONDOWN-AUDIT-01.

#### Expert mode, and the by-eye pre-checks — 2026-09-04

- **KB-EXPERT-01 — PASS.** The antlions question was re-asked in **Expert** mode and the reply came
  back grounded: `combineoverwiki.net · CC-BY-SA-4.0 · as of 2026-08-09`, trust tier `wiki_no_patch`,
  over **five** cards — Antlions, Sandtraps, Pheropod (bugbait), **Ravenholm** and **Strider** —
  against Strategy's three on the same sentence earlier the same session. Expert is no longer starved
  of cards, which was the bug.
- **BONSAI-ICON-GEOM-01 — measured, pot centred, both halves.** The icon was cropped out of a
  capture and the lit pixels measured row by row. Tab strip: canopy spans x 9–29 (mid **19.0**),
  stem at 19, pot rim 11–27 (mid **19.0**), pot body 12–26 (mid **19.0**). Decky's plugin list:
  canopy widest 11–27 (mid **19.0**), stem 19, pot rim 12–26 (mid **19.0**), body 13–25 (mid
  **19.0**). No one-pixel offset remains. Crops left at `screenshots/round31-tree-icon-zoom.png`
  and `screenshots/round31-decky-list.png`.
- **TAB-BAR-07, the rig's half — PASS.** With the strip open, all six names render in full — MAIN,
  OLLAMA, SETTINGS, PERMS, DEV, ABOUT — the active one gold (correct for the Ali G character) and
  the rest grey, nothing truncated (`screenshots/round31-tabstrip-names.png`). Whether that is
  comfortable at arm's length is still the maintainer's call.
- **ASK-WIDTH-01, the rig's half — PASS.** The panel measures 300 px (x 48 → 348) and the chat slot
  row, transcript and chip row each span it exactly. The Ask button is 298.4 px (0.8 px inset a
  side) and the inner actions row 294.5 px, which is the input's own padding rather than a gutter.
- **The Show-details chip ladder steps rather than traps.** Down on `.bonsai-chip-ladder` advances
  the ladder (Chip 1 of 6 → Chip 4 of 6 → …) and releases to *Session context* after the sixth, so
  the earlier "Down does nothing" reading was the ladder working. It does scroll partly out of view
  mid-way (measured 67% visible on one step).
- **A latency warning fired on device:** *"65.8s (>60s): prefer GPU for Ollama, not CPU."* The words
  are split across `<strong>` elements, which is why the harness's flattened label list showed it
  with gaps — the string itself is fine.

Mode was put back to **Strategy** afterwards.
