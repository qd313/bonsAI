# 69 — Streamed answers scramble into place

Written 2026-09-24 by the planning session, straight after a discovery session with the maintainer the
same day. This is the build plan for the roadmap entry **Streamed answers arrive with the same scramble
as the decode chips**, two stars, tagged reply. The calls from discovery are recorded as
[D119](../audit/maintainer-decisions-locked.md). **Nothing here is built. Nothing starts until the
maintainer says "go".**

**The drawing:** https://claude.ai/artifact/Vr8xPftAhcUK4bQf9AYUo4 — a working mockup at the Deck's true
size. Two panels get the same answer the same way; the left streams as today, the right scrambles. It
plays back what was measured on the Deck: the model's real speed, the text arriving in lumps as it does
today (or smoothly, with the fix below), and the panel's real frame rate with a game running. A copy is
kept in the repo at [assets/69-streamed-answers-scramble.html](assets/69-streamed-answers-scramble.html)
so it survives the link. **The drawing is the design. Open it before writing a brief.**

Read first: [CLAUDE.md](../../CLAUDE.md); [AGENTS.md](../../AGENTS.md), the table under "Which model
does which work"; [docs/lessons-learned.md](../lessons-learned.md); D119; the evidence file
[scramble-stream-timing-2026-09-24.json](../test-evidence/scramble-stream-timing-2026-09-24.json).

**One sentence:** first, stop the plugin holding the model's words back in lumps, so answers flow in
evenly for everyone; then add a Developer tab switch, *Scramble animation*, that makes each newly
arrived stretch of an answer churn through placeholder symbols for a moment before settling into the
real letters, the way a decode chip does — without the panel drawing any fewer frames than it does
today.

---

## 1. What is true right now (measured on the Deck 2026-09-24, checked against the code at 35343f42)

- **The model writes evenly.** Timed piece by piece on the Deck's own model (gemma4 e2b): a new piece
  every 29 ms with nothing running, every 50 ms with Deep Rock Galactic: Survivor running. The longest
  gap in either run was 83 ms. A piece is about 4.4 letters.
- **The plugin holds the words back.** The back end reads the model's output 4 KB at a time and waits
  for each 4 KB to fill before passing any of it on. One piece of output takes about 135 bytes, so
  4 KB is about 30 pieces. With the game running, the panel got a lump of about 115 letters every
  1.5 to 2 seconds, although it asked for new text every 150 ms. **This is the real cause of the
  roadmap's accepted bug "Token streaming reveals text in bursts while a game is running".** The
  earlier guesses (the game starving the model, or the panel's own timers) are both ruled out by the
  two measurements above.
- **The panel already slows while the model works, with a game running.** Measured frame by frame:
  90 frames a second before the question; about 38 while the model was thinking and nothing on screen
  changed; 8 to 40 while answer text was appearing, with single frames as long as 168 ms; 90 again the
  moment the answer finished. The scramble is judged against these numbers, not against a smooth 60.
- **Real speed for a real question:** about 16 pieces a second (about 64 letters a second) for a
  normal bonsAI question with a game running. A short question with a game: 20. No game: 35. The
  plugin's long questions are slower than short ones.
- **Sizes on the Deck's own screen:** the plugin is 300 pixels wide; the answer bubble 267; answer
  text 12 px. The chip row shows one chip (the maintainer's setting).
- **How the chips decode** (the thing being copied): one letter settles every 42 ms; the unsettled
  letters reshuffle every 55 ms; symbols are plain keyboard characters plus narrow Japanese katakana;
  a blinking block marks the edge; all of it is written straight to the page, not redrawn through
  React, because redrawing cost frames on the Deck.
- **How answer text appears today:** the panel smooths whatever has arrived, fast enough to catch up in
  about 0.18 s and never slower than 40 letters a second; a finished code box reveals three times
  faster; when the answer ends, anything left appears at once. There is no switch to turn streaming
  off any more; it is always on.
- **Two files this touches are exactly at their size limits:** the chat transcript and the Ask file
  (the growth check, `scripts/growth_limit.py`, allows them zero new code lines). Plan 68 also needs
  room in both. **This plan adds no code lines to either** — see step 3.

## 2. What gets built now, and what does not

Built:

1. **The hold-up fix.** The plugin passes on whatever the model has written as soon as it arrives.
   Everyone gets it, switch on or off.
2. **A new Animations section on the Developer tab.** The existing *Preset suggestions* picker moves
   into it. Under it, the new *Scramble animation* switch, off by default. While it is on, two more
   rows show: how letters settle, and the colour of scrambled letters. While it is off, they are
   hidden.
3. **The scramble itself**, for the answer text of an answer that is streaming right now.

Not built: turning it on by default; scrambling anything other than a live answer's text (thinking
lines, finished answers, questions, the reply toast, spoken answers); sliders for the settle time or
the tail length (the maintainer wants those narrowed in the mockup first); anything on the Deck's
other screens.

## 3. The build, step by step

Three steps, in order. Each lands on its own, with every check green, and step 1 is proved on the Deck
before step 3 starts.

### Step 1 — the hold-up fix (back end)

- **What changes:** where the back end reads the model's streamed answer, read whatever bytes have
  arrived instead of waiting for a full 4 KB (`resp.read1(...)` in place of `resp.read(...)`, same
  size cap). Nothing else about the stream changes: the 0.1 s parse throttle and the 0.12 s hand-over
  throttle stay, so text reaches the panel at most every 0.12 s.
- **Check first:** the tests that fake a streamed reply may only give their fake a `read` method. Give
  them a `read1` too (or a small shared fake), and add one test that feeds pieces slowly and proves each
  is passed on without waiting for 4 KB. **Break it on purpose once** (put `read` back) and watch that
  test fail, per the lessons file.
- **Stop still works, and a little better:** the loop checks for Stop after every read; shorter reads
  mean it checks more often.
- **Thinking lines also flow evenly** — the same read feeds them. That is a side effect worth a line in
  the changelog, not a problem.
- **Deck proof before step 3** (rows FIX-01 to FIX-03 in section 5). The bar, per D119: the panel's
  frame rate while text appears is no worse than today. **If it is worse, stop** and bring the numbers
  back to the maintainer before step 3; text arriving every 0.12 s instead of every 1.8 s means the
  panel redraws more often, and that trade is theirs to make.

### Step 2 — the settings and the Developer tab

- **Three settings**, in both the Python and the TypeScript settings code, the defaults contract, the
  hostile-inputs contract, and their tests, the same way every other setting is wired:
  - `stream_scramble_enabled` — on or off. Default off.
  - `stream_scramble_style` — `settle` (each letter scrambles for a moment after it arrives, then
    settles; **the default**), `chip` (exactly the chip: one letter every 42 ms, whatever the model is
    doing), or `tail` (always the last few letters scrambled). Anything else becomes `settle`.
  - `stream_scramble_color` — `same` (**the default**), `dim`, `green`, `cyan`. Anything else becomes
    `same`.
- **The Developer tab:** a new section, *Animations*, placed where *Preset suggestions* sits today.
  The *Preset suggestions* row moves into it unchanged. Below it:
  - A switch, **Scramble animation**.
  - While the switch is on: **How letters settle** — three buttons, *Settle after a moment*, *Chip
    pace*, *Fixed tail* — and **Scrambled letter colour** — four buttons, *Same as text*, *Dimmer*,
    *bonsAI green*, *Streaming cyan*. Same button look as the *Preset suggestions* row.
  - While it is off, both rows are gone, not greyed out.
- **The D-pad must survive the rows coming and going.** Turning the switch off while the ring is on
  the switch must leave the ring on the switch; nothing may be left focusable that is no longer drawn.
  This needs a device walk (row DEV-01), not only a test.

### Step 3 — the scramble

**What a person sees** (the mockup's right-hand panel, *Settle after a moment*, same colour):

- New text appears as scrambled symbols where the letters will be. Each scrambles for **300 ms** after
  it arrives, reshuffling every 55 ms, then settles into the real letter. With text flowing evenly,
  that is a short churning stretch following the end of the answer.
- **No blinking block**, neither where letters settle nor at the end (the bubble's usual end cursor is
  hidden while the scramble is on). The cyan glow round the bubble stays.
- **Spaces stay spaces**, so words keep their shape and hop between lines less.
- **Scrambled:** ordinary text, headings, list items, bold. **Never scrambled:** code boxes, hidden
  spoilers, the waiting chips, and the thinking lines above the answer.
- **When the answer finishes**, the last scrambled letters keep settling, faster if there are many,
  and are all real within 0.6 s. Only then does the bubble switch to its finished layout (and show its
  Copy button).
- **Stop** turns every scrambled letter real at once.
- **Closing and reopening the panel mid-answer:** everything already on screen comes back as plain
  text; only text that arrives after that scrambles.
- **Reduced motion** (the system asks for less motion): no scramble at all, whatever the switch says.
- *Chip pace* and *Fixed tail* behave as in the mockup. *Fixed tail* keeps **10** letters scrambled.
  *Chip pace* falls behind any real model (the chip settles about 24 letters a second; the Deck writes
  about 64), so during a long answer most of it stays scrambled until the end — that is what it is,
  and why it is not the default.

**How it is drawn, so it costs no frames** — the one part that decides whether this ships:

- The settled part of the answer goes through the normal streaming markdown path, exactly as today's
  revealed text does. It moves forward at the same rate today's reveal does, just about 0.3 s later,
  so React redraws no more often than it already does.
- The unsettled stretch is **one small span at the end of the last open text section**, whose symbols
  are written straight to the page every 55 ms, not through React — the same trick the decode chips
  use. That span is the only extra work per reshuffle.
- The pure maths — when each letter arrived, where the settle point is for each style, the finishing
  pace, which characters are free to skip (code boxes, spoiler bodies, markdown markers) — lives in
  one new file with its own tests, the way the chips' maths does.
- **No new code lines in the transcript or the Ask file.** The setting reaches the answer bubble
  through a small React context provided on the Main tab (the bubble builder and a new component read
  it), not as a new prop threaded through the transcript. The finishing time (up to 0.6 s after the
  answer ends) is handled inside the bubble's own new component, not by changing when the Ask file
  says the answer ended. If either proves impossible without touching those two files, **make room
  first** by moving an existing block out (as plan 68 section 3c does), in its own commit, and never
  by raising a limit.

**Known rough edges** (accepted in discovery, to watch on the device):

- Markdown markers inside the unsettled stretch (the `**` of bold, the `- ` of a list line) scramble
  like letters until they settle, then turn into formatting. At 300 ms this is a flicker, not a shape.
- A word at the end of a line can still hop to the next line as it settles, because symbols and
  letters differ in width.

## 4. Who builds what

The entry is two stars, so the routing table says Sonnet 5 at high effort straight through, with Opus
at xhigh reviewing anything that touches settings plumbing or focus. Here:

| Step | Who | Why |
|---|---|---|
| 1, the hold-up fix | Sonnet 5 high | Cause known, one read call and its tests. |
| 2, settings and tab | Sonnet 5 high; Opus xhigh reviews | Settings plumbing and a D-pad change. |
| 3, the scramble | Opus xhigh | It changes how the live answer draws, next to the live answer's D-pad stops (the plan 64 stream-walk fixes), and it must not cost frames. |
| Deck rows | Opus xhigh writes and reads; Sonnet high may run rows already written | Per the table. |

Lanes, if used, never edit the roadmap, the testing docs or the changelog.

## 5. Proving it on the Deck

The recorder recipe is Appendix B: one read-only status call every 150 ms from Steam's shared page,
and one frame timer in the panel's own page, both installed with `deck_readPage` and removed after.
**Every frame-rate row uses the same set-up:** Deep Rock Galactic: Survivor running (it is on the Recent
Games shelf, so the launch tool can start it), the plugin reloaded *after* the game started, the Deck's own screen, the same
question, three runs per side. Write down which screen is live before any number.

**"Not worse", per D119:** while answer text is appearing, the usual frame rate (the median frame gap)
is within 10% of the comparison runs, and the longest single frame is no more than 20 ms longer.

| Row | After | What | Passes when |
|---|---|---|---|
| FIX-01 | Step 1 | Text hand-overs with a game running | New text reaches the panel at least every 0.3 s during the answer; no gap over 0.5 s except while the model thinks. (Was 1.5–2 s.) |
| FIX-02 | Step 1 | Panel frames, fix vs today's numbers (evidence file) | "Not worse", above. If not, stop and report (step 1). |
| FIX-03 | Step 1 | The game's own frame rate | Steam's performance overlay on, screenshots during a streamed answer before and after the fix; the game's number is not lower. The maintainer turns the overlay on. |
| DEV-01 | Step 2 | D-pad through Animations | Walk the section down and up with the switch off and on; toggle it with the ring on it; the ring never lands on a hidden row and stays on the switch. |
| SCR-01 | Step 3 | The look | The maintainer watches three answers with the switch on and says yes or no. Every style and colour tried at least once. |
| SCR-02 | Step 3 | Panel frames, switch on vs off | "Not worse", above. If not: halve the reshuffle rate (every 110 ms instead of 55), measure again; if still worse, it does not ship, and the maintainer hears the numbers. |
| SCR-03 | Step 3 | The game's own frame rate, switch on vs off | As FIX-03. |
| SCR-04 | Step 3 | Stop mid-answer | Scrambled letters turn real in the same frame; the stopped line shows. |
| SCR-05 | Step 3 | Close and reopen mid-answer | Earlier text comes back plain; only new text scrambles. |
| SCR-06 | Step 3 | The end of the answer | The last letters settle within 0.6 s, then the Copy button appears; nothing jumps. |
| SCR-07 | Step 3 | Reduced motion | If Steam offers a reduced-motion switch, with it on nothing scrambles. If it does not, this is a desk test only; say so in the row. |
| SCR-08 | Step 3 | D-pad on a live scrambling answer | The plan 64 stream-walk row, run again with the switch on: the ring moves through a streaming answer's stops and none is lost when the answer finishes. |

**Before any of this:** the Deck is shared with other chats — ask for a window, check that no other
chat holds it, hold it awake, and say which minutes are needed. Each streamed question adds a turn to
whichever chat is open; use a chat the maintainer does not mind, or tell them afterwards.

## 6. Risks, and what to know

- **The fix may cost frames even though it looks smoother.** Today the panel redraws in short lumps
  with long rests; after the fix it redraws a little all the time. FIX-02 decides, and the maintainer
  makes the call if it is worse.
- **The finish is the fiddly part.** Today the bubble switches from its streaming layout to its
  finished layout the instant the answer ends. The scramble needs that switch to wait up to 0.6 s for
  the last letters, without touching the Ask file. Build it with the test for "the Copy button appears
  only after the last letter settles" first.
- **A skipped-over code box.** When the settle point reaches a code box or a spoiler, it jumps over the
  whole block at once; the block itself never scrambles. The maths file's tests cover a box that opens
  and closes inside the unsettled stretch.
- **Plan 68 is in flight in the same two full files.** If plan 68's room-making lands first, that is
  fine; this plan still adds nothing to them.
- **The mockup's frame rates are a recording, not the Deck.** It replays measured gaps; only the Deck
  rows decide.

## 7. Out of scope

Default on; a slider for the settle time or tail length; scrambling thinking lines, finished answers,
the reply-ready toast or spoken answers; any change to the decode chips themselves.

## 8. Things to bring to your attention

- **The accepted bursts bug has a cause, and step 1 fixes it.** The roadmap entry said to reopen it only
  if the game's own frame rate suffered; the cause turned out to be the plugin's own 4 KB wait, so
  step 1 fixes it anyway, and FIX-03 finally measures the game's number.
- **An older note put the chat at 412 pixels wide.** On the Deck's own screen today it is 300, the
  bubble 267. The first two mockup versions were drawn at 412; version 4 on is correct.
- **One test question was added to the maintainer's open chat** during the measurement ("good early
  weapon upgrades for the Driller").

## 9. Progress log

- 2026-09-24 — Discovery, the Deck measurement and this plan. Nothing built.
- 2026-09-24 — Step 1 built and landed: the plugin now passes on the model's words as they arrive instead
  of waiting for a full 4 KB (`341841d3`). Small fixes the same day: the question box's blinking cursor
  moved to sit against the first letter instead of a fixed corner (`e7c06738`, probe fix `a8bfe0e7`); the
  "From the notes" credit line now shows only under an answer that actually used the note, instead of
  every answer with a note attached (`45e2dd81`); the question title's overflow check now only measures
  when the title changed, fixing a real slowdown a profile found — it was costing about a third of the
  panel's script time while an answer streamed (`1288c936`, `46fbce4e`); a poll that brings back nothing
  new no longer re-renders the panel (`bd61af8d`); two Deck profiling probes were built and used to find
  these causes (`0af099ae`, `91108fd2`).
- 2026-09-24/25 — Step 2 built: the live thinking box now shows as ordinary wrapping text instead of three
  cut-off lines (`63a0421f`), later made smaller, dimmer and in italics to fit more of it in the same
  space, settling at six lines (`15d46c1f`, `d0dca6db`, `9be07861`). The transcript's scroll-follow moved
  from watching every screen update to one size observer for the whole answer, another real slowdown a
  profile found (`76922d55`). Room was freed in the plugin's settings wiring (`e71655ab`), the four
  scramble settings were added (`8f8273d2`), an old redundant setting was retired (`110bc445`), and the
  new *Animations* section landed on the Developer tab with the *Scramble animation* switch, off by
  default (`bc6ab55c`, `c38ead49`).
- 2026-09-25 — Step 3 built: the scramble itself, drawing a live answer's newest letters as churning
  placeholder symbols that settle into place (`d1ab2929`); the Copy button now waits for the last
  scrambled letter to settle (`b44a5459`); each placeholder symbol is now drawn over its real letter
  instead of replacing it, which stopped a re-wrap that had been keeping the panel busy every single frame
  (`e0fa7f6c`). A returning bug was caught and fixed: the branch menu could still show its own placeholder
  wording with the game's title swapped into it (`3d3c424a`, `4a275fea`).
- 2026-09-25 — The frame-rate investigation. With no game running, the panel was drawing about 19 to 24
  frames a second while an answer streamed in — well under the maintainer's floor of 45. Moving the
  streaming text (and the scramble, when on) onto a steady beat about nine times a second, instead of
  redrawing on every single frame, and holding the answer's glow and the question box's glow steady while
  text arrives instead of redrawing those every frame too, brought that up to 56 to 58 frames a second
  with the scramble off (the default for everyone) and 44 to 50 with it on (`bb8d7e5b`, `aae5add6`). The
  thinking phase held 59 to 60 the whole time, which showed the model sharing the graphics chip was never
  the real limit — every frame the panel changed in was a frame it had to redraw. Recorded in
  `docs/test-evidence/plan69-answer-frame-rate-2026-09-25.json` (`dd1913ea`).
- **What is still owed:** the maintainer's own look at the scramble's style and colour choices (SCR-01);
  the game's own frame rate, with the scramble off and on (SCR-03, FIX-03); closing and reopening the
  panel mid-answer (SCR-05); reduced motion (SCR-07); the text-arrival and frame-rate checks with a game
  actually running (FIX-01, FIX-02); and an on-Deck check of the question box cursor fix (ASK-CARET-01).
  Full rows in `docs/testing.md`.

---

## Appendix A — for the helpers, not for reading (facts at 35343f42)

- The 4 KB read: `py_modules/backend/services/ollama_chat_stream.py`, `OLLAMA_CHAT_READ_CHUNK = 4096`
  (line 45) and `chunk = resp.read(OLLAMA_CHAT_READ_CHUNK)` (line 334). `ollama_service.py` imports the
  constant (line 111). Parse throttle `OLLAMA_DELTA_PARSE_INTERVAL_S = 0.1`; hand-over throttle
  `Plugin.PARTIAL_RESPONSE_FLUSH_INTERVAL_S = 0.12` in `main.py` (line 262, used at 512). The plugin
  runs Decky's embedded Python 3.11, where `HTTPResponse.read1` handles chunked replies.
- The panel's poll: `useBackgroundGameAi.ts`, `BACKGROUND_STREAM_POLL_MS = 150`, method
  `get_background_game_ai_status`.
- The reveal smoothing: `src/hooks/useSmoothStreamReveal.ts` (rate `max(40, backlog / 0.18)`, coast 12
  frames, fence burst ×3 for 45 frames, snap at the end). Called from `useBonsaiAskOrchestration.ts`
  (line ~398), which is at its growth limit.
- The live bubble: `MainTabChatTranscript.tsx` `renderAnswerBubble` (line 871) calls
  `buildAnswerBubbleElement` (`src/utils/buildAnswerBubbleElement.tsx`, 371 code lines, room to grow);
  its streaming branch calls `renderStreamMarkdownStack` (line 255) with `prepareStreamMarkdown`
  (`src/utils/streamMarkdownPrepare.ts`). The end cursor is CSS:
  `[data-bonsai-stream-preview="true"] .bonsai-ai-response-chunk::after` in
  `src/styles/sections/answerBubble.ts`.
- The chips to copy from: `src/features/preset-carousel/presetChipDecodeText.ts` (glyph pool, 42 / 55 /
  450 ms) and `presetDecodeSlots.tsx` (one shared animation frame, `textContent` writes through a ref).
  `prefersReducedMotion()` is in `presetChipShared.ts`.
- A setting wired end to end, to copy: `dev_preload_ask_model` — `settings_service.py`,
  `main.py`, `bonsaiSettingsSchema.ts`, `bonsaiSettingsNormalizers.ts`, `usePluginSettings.ts`,
  `settingsPayload.ts`, `tests/contracts/settings-defaults.json`,
  `tests/contracts/settings-hostile-inputs.json`, `settingsContracts.test.ts`. The chip picker's
  settings and its row: `preset_chip_animation`; `DeveloperTab.tsx` lines ~472–506, inside the
  *Logging & exports* section.
- Growth limits (`scripts/growth_limits.json`): transcript 1104 and Ask file 1061 code lines, both at
  their limit today. `DeveloperTab.tsx` 489, `buildAnswerBubbleElement.tsx` 371 (the general cap is
  800).

## Appendix B — the Deck recorder (read-only; remove after)

In `SharedJSContext`, poll the same status call the panel uses and keep every change:

```js
(() => { const R = window.__scrPoll = { rows: [], started: Date.now(), stop: false };
  const tick = async () => { if (R.stop || Date.now() - R.started > 240000) return;
    const t0 = Date.now();
    const r = await window.DeckyBackend.call('loader/call_plugin_method', 'bonsAI', 'get_background_game_ai_status');
    R.rows.push([t0, Date.now() - t0, r.status, r.streaming ? 1 : 0, (r.partial_response || '').length, (r.response || '').length]);
    R.timer = setTimeout(tick, 150); };
  tick(); return true; })()
```

In the Quick Access page, time every frame and the live bubble's length:

```js
(() => { const R = window.__scrPaint = { rows: [], started: Date.now(), stop: false }; let last = performance.now();
  const f = (now) => { if (R.stop || Date.now() - R.started > 240000) return;
    const el = document.querySelector('[data-bonsai-stream-preview="true"]');
    R.rows.push([Date.now(), now - last, el ? 1 : 0, el ? el.textContent.length : -1]); last = now; requestAnimationFrame(f); };
  requestAnimationFrame(f); return true; })()
```

Read them back boiled down inside the page (changes only; frame gaps grouped per 250 ms), never the raw
rows. Then set `stop`, clear the timer and delete both globals. The call is spread-argument form: the
plugin method's name, then its arguments; passing an arguments array fails with "Python Exception".
