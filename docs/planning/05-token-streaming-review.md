# 05 — Token streaming: architecture review, risks, ship readiness

**Status, corrected 2026-09-24: both phases built, and passed on the Deck.** Phase A (P1–P5) and
Phase B (multi-stop navigation) both landed 2026-08-07 (commit `765de858` records Phase B) and passed on
the Deck 2026-09-04 (the "Token streaming Phase A/B" line in
[archive/roadmap-done-v0.5.0.md](../archive/roadmap-done-v0.5.0.md)). One check is still owed: STREAM-04,
on the streaming row of [testing.md](../testing.md). P6 (§ 5) was never decided; it is now its own
roadmap entry. The bursts this review called R3 were accepted 2026-09-04 and their cause found 2026-09-24;
that work is [plan 69](69-streamed-answers-scramble.md). Until 2026-09-24 this line said Phase B had not
started.
Written 2026-08-03 from static reading of `main.py`, `py_modules/backend/services/`, `src/`.
Every claim is a `file:line` citation or marked **UNKNOWN**.

Feature shipped 2026-07-15 as **Token streaming (experimental)**, Developer tab, default off.

> **Read §4.1 and R3 before trusting §1–§3.** Two load-bearing claims were corrected on 2026-08-07
> against the live tree: the backend never discarded the stopped draft (the frontend did), and the
> reveal was measured *smooth* on Deck rather than chunky. **Every `main.py` line number in §1 is
> ~85–90 lines high** — that file shrank during step 12, and these citations were taken before it.
> The `src/` and `py_modules/` citations spot-check clean.

---

## 1. Architecture as built

### 1.1 The pipeline in prose

**Transport is always streaming; the flag only controls publication.**
`ask_ollama` sends `"stream": True` unconditionally
([ollama_service.py:325](../../py_modules/backend/services/ollama_service.py)) — with the comment that
`stream:true` returns headers promptly while `stream:false` buffers. So there is *no* dual transport.
What the setting gates is one boolean deep in the delta callback.

Flow, front to back:

1. **Settings.** `bonsai_token_streaming_enabled` is a normal plugin setting
   ([bonsaiSettingsSchema.ts:116](../../src/data/bonsaiSettingsSchema.ts),
   [bonsaiSettingsNormalizers.ts:426](../../src/data/bonsaiSettingsNormalizers.ts),
   [settingsPayload.ts:52](../../src/utils/settingsPayload.ts)), surfaced only as a Developer-tab toggle
   ([DeveloperTab.tsx:331](../../src/components/DeveloperTab.tsx)).

2. **Request start.** `start_background_game_ai` bumps `_background_request_seq`, resets the partial
   snapshot, and passes the request id down as `token_stream_request_id`
   ([main.py:2405-2407](../../main.py), [main.py:2207](../../main.py)) →
   `run_game_ai_request` ([game_ai_request.py:73](../../py_modules/backend/services/game_ai_request.py))
   → `execute_ollama_ask` ([ollama_ask_service.py:75](../../py_modules/backend/services/ollama_ask_service.py)).

3. **Delta hook.** `execute_ollama_ask` builds `_on_delta` **whenever `token_stream_request_id` is an int**
   — i.e. for every background Ask — and reads the setting only to pass
   `update_partial=token_streaming` ([ollama_ask_service.py:241-255](../../py_modules/backend/services/ollama_ask_service.py)).
   This is load-bearing for §2.2.

4. **Per-token work.** Inside the NDJSON read loop, every content delta triggers
   `"".join(deltas)` → `extract_bonsai_status` → `hide_incomplete_strategy_branch_fence` → `on_delta`
   ([ollama_service.py:376-389](../../py_modules/backend/services/ollama_service.py)).
   At `done`, one terminal `on_delta(visible_raw, True, thinking_summary)`
   ([ollama_service.py:496-500](../../py_modules/backend/services/ollama_service.py)).

5. **Snapshot.** `_update_partial_response` writes a lock-guarded dict under a **120 ms flush throttle**
   (`PARTIAL_RESPONSE_FLUSH_INTERVAL_S = 0.12`, [main.py:209](../../main.py), [main.py:377-414](../../main.py)).
   With `update_partial=False` it still records `thinking_summary` but never sets `streaming=True`
   ([main.py:394-397](../../main.py)) — so the flag-off path publishes thinking blurbs and nothing else.

6. **Read side.** `get_background_game_ai_status` merges the snapshot into the state dict, but **only while
   `status == "pending"` and the ids match** ([main.py:460-485](../../main.py)); otherwise it nulls
   `partial_response` and `streaming`. Deterministic phase copy fills in when the model emitted no
   `<bonsai-status>` ([bonsai_stream_tags.py:661-674](../../py_modules/backend/services/bonsai_stream_tags.py)).

7. **Poll.** `useBackgroundGameAi` polls at 1200 ms normally, **150 ms** when `status.streaming` *or* when
   the setting ref is true ([useBackgroundGameAi.ts:13-15, 70-77](../../src/hooks/useBackgroundGameAi.ts)).

8. **Reveal.** `applyBackgroundStatusToUi` sets `ollamaResponse` from the partial and flips
   `isStreamingPreview` ([useBonsaiAskOrchestration.ts:417-428](../../src/hooks/useBonsaiAskOrchestration.ts));
   `useSmoothStreamReveal` drips it out on RAF at 40–160 chars/s, 3× burst after a fence closes
   ([useSmoothStreamReveal.ts:17-73](../../src/hooks/useSmoothStreamReveal.ts)).

9. **Render.** `buildAnswerBubbleElement` branches: streaming → `prepareStreamMarkdown` stack with
   `chunkTotal = 1`; terminal → `splitResponseIntoChunks` with `chunkTotal = N`
   ([buildAnswerBubbleElement.tsx:133-135, 205-212](../../src/utils/buildAnswerBubbleElement.tsx)).
   Open fences render a wait chip instead of the body
   ([streamMarkdownPrepare.ts:128-141](../../src/utils/streamMarkdownPrepare.ts),
   [StreamFenceWaitChip.tsx](../../src/components/StreamFenceWaitChip.tsx)).

10. **T3 handoff.** On terminal, `setIsStreamSettling(true)` keeps the stream bubble one more frame, then a
    single RAF clears both flags ([useBonsaiAskOrchestration.ts:333-341, 479-486](../../src/hooks/useBonsaiAskOrchestration.ts)) —
    text snaps to full and the layout swaps stream-stack → chunk-chain in essentially the same frame.

11. **Scroll.** `useStreamScrollPin` re-pins `scrollTop` on every `streamText` change while the user has
    scrolled up ([useStreamScrollPin.ts:44-50](../../src/hooks/useStreamScrollPin.ts)); `enabled` is
    `isStreamingPreview` ([MainTabChatTranscript.tsx:181](../../src/components/MainTabChatTranscript.tsx)).

### 1.2 Strengths

| # | Strength | Evidence |
|---|---|---|
| S1 | **Single transport.** `stream:true` always; no on/off HTTP divergence to test. | [ollama_service.py:325](../../py_modules/backend/services/ollama_service.py) |
| S2 | **Request-id fencing everywhere.** Snapshot writes no-op on id mismatch; merge requires `pending` + id match; frontend has an independent poll sequence guard. | [main.py:389-390](../../main.py), [main.py:467](../../main.py), [useBackgroundGameAi.ts:42-44](../../src/hooks/useBackgroundGameAi.ts) |
| S3 | **Backend redaction happens before the wire.** Status tags, incomplete status openers, and strategy-branch JSON are stripped inside the delta hook, so a partial never carries them to the UI. | [ollama_service.py:383-384](../../py_modules/backend/services/ollama_service.py), [bonsai_stream_tags.py:76-103](../../py_modules/backend/services/bonsai_stream_tags.py), [strategy_guide_parse.py:32-38](../../py_modules/backend/services/strategy_guide_parse.py) |
| S4 | **Cadence is matched, not guessed.** Backend flush 120 ms vs frontend poll 150 ms — the poller can never starve, and the backend never queues work the poller won't read. | [main.py:209](../../main.py) vs [useBackgroundGameAi.ts:15](../../src/hooks/useBackgroundGameAi.ts) |
| S5 | **Streaming is stateless on the wire.** Each poll is a full snapshot, not a delta. Reconnect, QAM close/reopen, and plugin remount need no resync protocol — this is why mount-restore works at all. | [main.py:2510](../../main.py) |
| S6 | **Markdown safety is structural.** Open fences are never rendered as body — they become a chip. Incomplete inline markers are auto-closed rather than shown raw. | [streamMarkdownPrepare.ts:41-53, 128-141](../../src/utils/streamMarkdownPrepare.ts) |

### 1.3 Weaknesses

| # | Weakness | Evidence |
|---|---|---|
| W1 | **Poll cost is paid for the whole pending window, not the streaming window.** `fastPoll` is true if the *setting* is on, before any token exists — so prep phases (KB search, Proton logs, screenshot prep) also poll at 150 ms. | [useBackgroundGameAi.ts:71-73](../../src/hooks/useBackgroundGameAi.ts) |
| W2 | **Every poll re-sends the entire answer.** `partial_response` is the full accumulated text; a 4 KB reply over 30 s at 150 ms ≈ 200 responses averaging ~2 KB. Cheap in bytes, not free in CEF JSON + asyncio wakeups while a game runs. | [main.py:468](../../main.py) |
| W3 | **Flag-off pays most of the streaming CPU cost.** `_on_delta` is registered for every background Ask, and the join + regex passes run *before* the hook checks `update_partial`. O(n²) over the answer: ~900 passes over a growing ~4 KB string for a Strategy reply. | [ollama_ask_service.py:243](../../py_modules/backend/services/ollama_ask_service.py), [ollama_service.py:380-389](../../py_modules/backend/services/ollama_service.py) |
| W4 | **Reveal re-parses the whole answer at RAF rate.** `MainTabBonsaiAiMarkdownChunk` is a plain function component (no `React.memo`) and `ReactMarkdown` parses in render; each of up to 60 reveal ticks/s re-renders *every* closed block. | [MainTabBonsaiAiMarkdownChunk.tsx:204-217](../../src/components/MainTabBonsaiAiMarkdownChunk.tsx), [buildAnswerBubbleElement.tsx:62-76](../../src/utils/buildAnswerBubbleElement.tsx) |
| W5 | **Reveal rate is hard-capped below real generation speed.** `PROSE_RATE_MAX = 160` chars/s ≈ 40 tok/s; `Math.floor(rate*dt)` at 60 fps yields ~120 chars/s actual. Any host faster than that leaves the reveal permanently behind, and T3 dumps the remainder in one frame. | [useSmoothStreamReveal.ts:18-19, 64](../../src/hooks/useSmoothStreamReveal.ts) |
| W6 | **Two render layouts for one answer.** Streaming uses `prepareStreamMarkdown` (block stack, `chunkTotal=1`); terminal uses `splitResponseIntoChunks` (`chunkTotal=N`). Any partition disagreement is visible as a re-layout, and D-pad semantics change under the user's thumb. | [buildAnswerBubbleElement.tsx:133-135](../../src/utils/buildAnswerBubbleElement.tsx) |
| W7 | **Scroll pin releases exactly at the layout swap.** `enabled` is `isStreamingPreview`, which goes false in the same RAF that swaps stream-stack → chunk-chain and snaps text to full — the moment height changes most. | [MainTabChatTranscript.tsx:181](../../src/components/MainTabChatTranscript.tsx), [useBonsaiAskOrchestration.ts:333-341](../../src/hooks/useBonsaiAskOrchestration.ts) |
| W8 | **`think: False` is global and unconditional.** Not a streaming decision — but streaming is what made it necessary, and it caps quality for thinking models. Tracked as the soft-`num_predict` bug. | [ollama_service.py:327-332](../../py_modules/backend/services/ollama_service.py), [roadmap.md § Bugs](../roadmap.md#bugs) |

### 1.4 Poll vs push — and is the split right?

**Push is available and unused.** `@decky/api@1.1.3` exports `addEventListener` / `removeEventListener`
([node_modules/@decky/api/dist/index.d.ts:12-13](../../node_modules/@decky/api/dist/index.d.ts)); the
Python counterpart is `decky.emit`. Nothing in `src/` or `main.py` uses either — grep finds only DOM
`addEventListener` calls. **UNKNOWN:** whether `decky.emit` is present in the loader build on the target
Deck; must be confirmed on-device before any design depends on it.

Trade, honestly:

- **Push wins** on idle cost (no 1200 ms heartbeat when nothing changed), on latency floor (no 150 ms
  quantisation), and on payload (deltas instead of full-text resend, fixing W2).
- **Poll wins** on everything that makes this feature survivable: QAM open/close, plugin remount, and
  missed events are all free because every poll is a complete snapshot (S5). A push design needs a
  resync path anyway — meaning you keep the poll *and* add the event channel, not replace it.
- SSE/HTTP is a non-option: there is no HTTP server between TS and Python (CLAUDE.md § boundary).

**Verdict on the split: the background-executor + status-poll shape is right for Steam Deck and should
stay.** The QAM is closable and the plugin remounts; a resumable snapshot is the correct primitive.
The defensible incremental change is *not* replacing the poll but making it adaptive — and the cheapest
real win is W1/W3/W4, which cost nothing architecturally. Push should be treated as a later optimisation
with a measured baseline, not as the fix for how streaming currently feels.

---

## 2. Quality / UX assessment

### 2.1 Smooth reveal

The mechanism is sound — rate scales with backlog, RAF restarts on new partials, fence bodies burst at 3×
([useSmoothStreamReveal.ts:23-26, 77-79, 99-100](../../src/hooks/useSmoothStreamReveal.ts)). Two concrete
problems:

- **W5 (lag then dump).** On a LAN desktop GPU at 30–60 tok/s the reveal cannot keep up; the user watches a
  slow crawl, then the answer completes and the tail appears instantly. That reads as *broken*, not smooth.
  The cap should scale with backlog rather than clamp at 160.
- **W4 (frame cost).** Each reveal tick re-parses every already-closed markdown block. On a Deck APU sharing
  with a game this is where "blocky" most plausibly comes from — dropped RAF frames make the drip stutter,
  which the current design then interprets as more backlog.

### 2.2 Markdown safety — S1 spoiler mask, F2 code fence

The partition is conservative in the right direction: an unbalanced fence returns `liveTail: null` and a
chip, so **body inside an open fence is never rendered**
([streamMarkdownPrepare.ts:128-141](../../src/utils/streamMarkdownPrepare.ts)). Two gaps:

- **Label mismatch window (cosmetic, low).** Tokens arrive mid-line, so "```" exists before
  "```bonsai-spoiler" does. `isSpoilerFenceOpenLine` fails on the prefix and the user briefly sees
  *"Code block incoming…"* where a spoiler mask belongs
  ([streamMarkdownPrepare.ts:31-36, 106](../../src/utils/streamMarkdownPrepare.ts)). No body leaks — but it
  telegraphs that something is being hidden, with the wrong noun.
- **Nested-fence early-close (real, needs a test).** The closer test is *"any fence line after the first"*
  ([streamMarkdownPrepare.ts:115](../../src/utils/streamMarkdownPrepare.ts)). A code sample nested inside a
  `bonsai-spoiler` fence closes the spoiler early; the block up to that point stays masked, but **the
  remaining spoiler body then streams as ordinary prose in `liveTail`**. That is a genuine mid-stream
  spoiler leak path. Marked **PLAUSIBLE, not confirmed** — it is a unit test in
  `streamMarkdownPrepare.test.ts`, not an on-Deck run. Parity with `splitResponseIntoChunks` on the same
  input is **UNKNOWN**.

`unwrapAskedEntitySpoilerFences` runs on the streaming body with the same question/appId as the terminal
render ([buildAnswerBubbleElement.tsx:128-130](../../src/utils/buildAnswerBubbleElement.tsx)), so stream and
final agree on unwrap. Good.

### 2.3 T3 stream → chunk handoff

Structurally the weakest moment in the feature. In one RAF the app simultaneously: snaps text to full
(W5 backlog dump), swaps `prepareStreamMarkdown` output for `splitResponseIntoChunks` output (W6),
changes `chunkTotal` from 1 to N — which silently changes what D-pad Down does inside the bubble
([buildAnswerBubbleElement.tsx:135, 142](../../src/utils/buildAnswerBubbleElement.tsx)) — and releases the
scroll pin (W7). The bubble `Focusable` key is stable (`answer-bubble-live`,
[buildAnswerBubbleElement.tsx:180](../../src/utils/buildAnswerBubbleElement.tsx)), so focus should survive at
bubble level, but internal chunk position is not carried across (`noopChunkRef`,
[buildAnswerBubbleElement.tsx:45](../../src/utils/buildAnswerBubbleElement.tsx)).

### 2.4 Coexistence with thinking blurbs

Cleanly separated and the best-behaved part of the feature. Blurbs travel on `thinking_summary`, published
via `_publish_thinking_phase*` with `update_partial=False`
([main.py:420-428](../../main.py)), so they work identically with the flag off. When the model emits no
`<bonsai-status>`, the merge substitutes elapsed-time copy
([main.py:474-480](../../main.py), [bonsai_stream_tags.py:661-674](../../py_modules/backend/services/bonsai_stream_tags.py)).
The blurb line and the stream bubble render as siblings and both stay visible during streaming
([MainTabChatTranscript.tsx:343-363](../../src/components/MainTabChatTranscript.tsx)).

One tension worth naming (copy itself is Q6, out of scope): with streaming on, `Drafting your masterpiece…`
sits above text the user is already reading. The blurb's job — reassurance during silence — is over the
moment tokens appear.

---

## 3. Improvement options (prioritised)

Prioritised by *value per unit of risk*, not by star count.

| # | Change | ★ | Why now |
|---|---|---|---|
| **P1** | **Memoise closed stream blocks** — `React.memo` on `MainTabBonsaiAiMarkdownChunk` keyed on `source`, so only the live tail re-renders per reveal tick. | ★ | Direct fix for W4, the most likely cause of "blocky on Deck". No behaviour change, unit-testable, zero architectural commitment. |
| **P2** | **Gate `_on_delta` on the setting** — build the callback only when `bonsai_token_streaming_enabled`, so flag-off Asks skip the per-token join + regex passes. | ★ | Fixes W3. Makes "off" genuinely the cheap path, which is the premise of shipping it default-off. Watch: the thinking-summary channel also rides `on_delta`, so gate the *partial* work, not the whole hook. |
| **P3** | **Scope fast poll to actual streaming** — drop the `tokenStreamingEnabledRef` term so 150 ms applies only while `status.streaming` is true. | ★ | Fixes W1. Removes the 150 ms poll from the whole prep phase, which is where it buys nothing. |
| **P4** | **Un-cap the reveal rate** — let `proseRevealRate` scale with backlog instead of clamping at 160 c/s. | ★ | Fixes W5; removes most of the T3 dump without touching the handoff design. |
| **P5** | **Fix STREAM-04 (Stop keeps the partial)** — see §4.1; this is a bug, not an enhancement. | ★★ | The row cannot pass as written today. Blocker for de-experimentalising. |
| **P6** | **Keep the stream bubble as final layout** (skip the chunk split for the turn that streamed). | ★★ | Collapses W6 + W7 + half of STREAM-08/09 into "no handoff". Cost: the streamed turn's D-pad model differs from history turns unless `splitResponseIntoChunks` is also retired there. Decide before spending on handoff polish. |
| **P7** | **Nested-fence spoiler test + fix** in `prepareStreamMarkdown` — track the opening fence's info string and require a bare closer. | ★★ | Closes the §2.2 leak path. Start with the failing unit test; the fix is small if the test confirms it. |
| **P8** | **Graduate the flag to Settings** (still default off). | ★★ | Only after P1–P5. Moving the toggle before the perf and Stop fixes converts a Developer-tab experiment into a support surface. |
| **P9** | **Default-on for Speed mode only.** | ★★ | Reasonable *end state*, wrong *next step*: Speed is where `num_predict` 500 is tightest, so it inherits the soft-budget bug most visibly. Gate behind the roadmap fix. |
| **P10** | **Push transport** (`decky.emit` + `addEventListener`, poll retained as resync). | ★★★★ | Do not start here. Confirm `decky.emit` exists on-device, then measure the post-P1–P4 baseline. If P1–P4 land the feel, push buys idle cost — a different problem from the one being solved. |
| **P11** | **Simplify to plain-text stream** (drop live markdown; render markdown only at terminal). | ★★ | Listed for completeness; **recommend against**. It discards the spoiler/fence safety work that is currently the feature's strongest property, and re-opens a raw-markdown leak surface. |

Sequencing: **P1 → P2 → P3 → P4** are independent, each a single commit, all behaviour-preserving except
P4's tuning. **P5** next as a bug. Then decide **P6** before any further handoff polish, because P6 deletes
the handoff. **P8/P9** are ship decisions, not code. **P10** is a later spike.

### 3.1 Phase A — implemented 2026-08-07

P1–P5 landed. Gates green throughout: `npx tsc --noEmit`, 376 frontend tests, 563 Python tests,
`npm run build`.

| # | What shipped | Where |
|---|---|---|
| P1 | `React.memo` on the markdown chunk — reveal ticks no longer re-parse every closed block. All props are primitives, so the default shallow compare is correct. | [MainTabBonsaiAiMarkdownChunk.tsx](../../src/components/MainTabBonsaiAiMarkdownChunk.tsx) |
| P2 | **Not** the gate the review proposed. Gating `_on_delta` on the setting would have killed model-emitted `<bonsai-status>` blurbs, which ride the same hook with the flag off. Throttled the *parse* instead — `OLLAMA_DELTA_PARSE_INTERVAL_S = 0.1`, so cost is ≤10 parses/sec regardless of flag. Terminal parse deliberately un-throttled. | [ollama_service.py:50-61, 518-520](../../py_modules/backend/services/ollama_service.py) |
| P3 | `fastPoll` now follows `status.streaming` only; the setting ref and its option type are gone, along with the dead `bonsaiTokenStreamingEnabled` arg on the orchestration hook. | [useBackgroundGameAi.ts](../../src/hooks/useBackgroundGameAi.ts) |
| P4 | Rate derives from backlog (`TARGET_DRAIN_SECONDS`), no ceiling. Plus the startup hitch: the loop now coasts `IDLE_COAST_FRAMES` after catching up instead of parking on the first idle frame and waiting for a React round trip. | [useSmoothStreamReveal.ts](../../src/hooks/useSmoothStreamReveal.ts) |
| P5 | See §4.1. Shared `_cancelled_response_text` closes the race; `onCancelAsk` keeps the draft; `stopRequestedRef` blocks late terminal results; new `askStopped` notice renders beside the kept text. | [main.py:344-367](../../main.py), [useBonsaiAskOrchestration.ts](../../src/hooks/useBonsaiAskOrchestration.ts), [MainTabChatTranscript.tsx](../../src/components/MainTabChatTranscript.tsx) |

Two things worth knowing before the on-Deck pass:

- **P3 costs first-paint latency.** Between request start and the first token the poll is now 1200ms,
  so the UI can take up to ~1.2s *after* the first token to switch to the fast cadence. Watch for it
  when running STREAM-02 — if it reads as sluggish, the cheap answer is a medium cadence once
  `thinking_summary` starts moving, not a return to setting-keyed fast polling.
- **An unconditional RAF reschedule does not terminate.** The first cut of P4's coast spun forever
  under vitest fake timers. Bounded to `IDLE_COAST_FRAMES`. Related: the orchestration suite had no
  `afterEach(vi.useRealTimers)`, so one failing fake-timer test hung the *next* test for 20s and
  reported two failures for one cause. Guard added.

### 3.2 Phase B — implemented 2026-08-07

Multi-stop navigation and near-bottom follow, per the locked decisions under *Navigation / layout*.
Gates green throughout: `npx tsc --noEmit`, 415 frontend tests, 563 Python tests, `npm run build`.

| # | What shipped | Where |
|---|---|---|
| B1 | Every rendered section of a streaming answer — each closed block, the wait chip, the live tail — is a nested `Focusable` registered in a new stop registry, and `handleAnswerBubbleMove{Down,Up}` walk those stops before falling through to the existing scroll-step logic, which is untouched. | [answerStopRegistry.ts](../../src/utils/answerStopRegistry.ts), [answerBubbleNavigation.ts](../../src/utils/answerBubbleNavigation.ts), [buildAnswerBubbleElement.tsx](../../src/utils/buildAnswerBubbleElement.tsx) |
| B2 | History and finished turns register the same stops from `splitResponseIntoChunks`, so navigation does not depend on whether you watched the answer arrive. | [buildAnswerBubbleElement.tsx](../../src/utils/buildAnswerBubbleElement.tsx) |
| B3 | Option C, and it needed no code: the terminal render rebuilds the stops with the chunks. What was verified instead is that no stream-layout entry survives the swap — React detaches every ref in a commit before attaching any. | [buildAnswerBubbleElement.test.tsx](../../src/utils/buildAnswerBubbleElement.test.tsx) |
| B4 | Follow the transcript tail while it is on screen; hold position once the user scrolls up. Both halves run off one scroll listener, so touch and D-pad need no separate handling. | [useStreamScrollPin.ts](../../src/hooks/useStreamScrollPin.ts) |

Three decisions inside B1 that the tests pin down, because none is obvious from the outside:

- **Only a stop already on screen is eligible.** Same rule the masked-spoiler diversion uses, which is
  what lets the two compose: an off-screen section falls through to a scroll, and the next press lands
  on it. Chasing it would scroll and focus in one press and skip the text in between.
- **Down enters the chain at the first stop *in view*, not at stop 0.** After the user has scrolled,
  stop 0 is above the fold and pressing Down can never bring it back — entering at 0 would leave the
  whole chain unreachable.
- **Up walks only when a stop already holds focus.** Arriving at the bubble on the way up means the
  user is leaving for the turn header; diving into the last visible section would trap them one press
  short of it.

Two things worth knowing before the on-Deck pass:

- **The nesting count is the open risk, and it is the first thing to check.** The spoiler fence proved
  *one* nested `Focusable` inside the bubble on device (2026-08-04). B1 creates one per section, and a
  section holding a masked spoiler now nests three deep. If Steam's graph does not survive it under a
  QAM remount or mid-stream height growth, the fallback is this same registry driven by imperative
  focus, without the nested `Focusable`s — no other part of Phase B depends on the nesting.
- **A stop handles direction through `onButtonDown` alone**, using the event-aware predicates, with no
  `onMove*` twin. Whether Steam routes a press to a *nested* `Focusable`'s `onMove*` is unproven, and
  `onButtonDown` is documented as firing on every Decky component for every button, so it is the safer
  of the two; wiring both would risk firing twice for one press. Adding `onMoveDown` back is a
  one-line change if the device disagrees. This shipped wrong first: the stops carried a copy of the
  bubble's *string* predicates, which stringify a `GamepadEvent` to `"[object CustomEvent]"` and match
  nothing — the same defect that once made the spoiler fence reveal itself on a D-pad press
  ([focusNavigation.ts:69-77](../../src/utils/focusNavigation.ts)). Fixed a commit later, and the
  roadmap's `onButtonDown` audit gained it as a third instance.
- **Stops draw their own focus marker.** `.bonsai-ai-response-chunk--in-bubble` resets `outline` and
  `box-shadow` to `none !important`, and those are the two properties Steam's ring uses, so `gpfocus`
  landed on the stops invisibly until [section-6.ts](../../src/styles/sections/section-6.ts) gained a
  rule after that reset.

B4 changed what "near the bottom" is measured against, and that is a behaviour change worth stating:
it was the panel's scroll maximum, and the panel extends past the transcript (session context strip,
Save chat), so the old test read false as soon as the newest text was on screen but those rows were
not. Pin-only that cost a stale pin nobody noticed; with following it would have latched the pin one
frame after the first follow. It now measures the anchor's own tail against the viewport.

---

## 4. Risk register

Severity = user-visible harm if it fires. Likelihood = with the flag on, on a Deck, today.

| # | Risk | Sev | Lik | Evidence / note |
|---|---|---|---|---|
| R1 | ~~**Stop discards the streamed partial**~~ (STREAM-04) | **High** | **Was certain — FIXED (A5)** | §4.1, corrected. The backend always kept the draft; the frontend discarded it, and the two cancel paths raced. Both fixed. |
| R2 | **Nested code fence inside `bonsai-spoiler` leaks the rest of the spoiler body mid-stream** (STREAM-03) | **High** | Low–Med | [streamMarkdownPrepare.ts:115](../../src/utils/streamMarkdownPrepare.ts). PLAUSIBLE, unverified. |
| R3 | **Reveal stutter / dropped frames on Deck APU while gaming** | Med | ~~High~~ **Low** | **Downgraded by measurement.** STREAM-REVEAL-01 (2026-08-04, on-Deck) found the reveal *smooth* apart from one split-second hitch after the first ~6-7 words — the opposite of what W4+W5 predicted. Both causes addressed in A1/A4 anyway; the frame-cost theory remains unverified under game load (→ STREAM-11). |
| R4 | **T3 layout + focus + scroll discontinuity** (STREAM-08/09, echo of D-PAD-SCROLL-01) | Med | Med–High | W6 + W7; `chunkTotal` 1→N at [buildAnswerBubbleElement.tsx:135](../../src/utils/buildAnswerBubbleElement.tsx). |
| R5 | **RPC load on Deck** — 150 ms polls across the entire pending window, full-text payload each time | Med | Med | W1 + W2. Worst with Strategy (`num_predict` 900) plus a running game. |
| R6 | **Backend per-token CPU paid even with the flag off** | Med | **Certain** | W3. Notable because it undermines "off is safe". |
| R7 | **`think: False` quality tradeoff** | Med | **Certain** | [ollama_service.py:327-332](../../py_modules/backend/services/ollama_service.py). Not streaming-specific; tracked as the soft-`num_predict` bug ([roadmap.md § Bugs](../roadmap.md#bugs)). Streaming raises its visibility because truncation is now *watched* happening. |
| R8 | **Spoiler wait-chip label mismatch mid-stream** | Low | Med | §2.2. Cosmetic; no body exposure. |
| R9 | **Dual render paths drift** (stream partition vs chunk split) | Low | Med | W6. A maintenance tax that P6 removes entirely. |
| R10 | **Experimental support burden** | Low | Low | Contained today: one Developer toggle, default off, documented in `troubleshooting.md:584-605`. Rises sharply at P8/P9. |

### 4.1 R1 in detail — STREAM-04 — **corrected 2026-08-07, then fixed**

> **Correction.** The original text below claimed three code paths drop the partial. Two of those
> claims were wrong, and the citations were read against a stale tree. What follows is the corrected
> account; the fix landed in Phase A (A5).

**The backend already kept the draft.** `abort_background_game_ai` reads the snapshot and writes the
partial into `_background_state["response"]`, guarded by `partial_stream_has_content` so an early Stop
does not show markup debris ([main.py:2472-2494](../../main.py)). It has a test:
`tests/test_background_abort_busy.py::test_abort_preserves_partial_in_cancelled_response`.

Two real defects, not three:

1. **The frontend threw the kept draft away.** `onCancelAsk` invalidated the poll *and* hard-wrote
   `"Request cancelled."` over the body, so the `cancelled` status carrying the text never arrived and
   the `partialKeep` branch was unreachable. Frontend-only — the backend half was already correct.
2. **A genuine race between the two cancel paths.** `abort_background_game_ai` only preserves the draft
   when it wins `_background_lock` while the status is still `pending` ([main.py:2483](../../main.py)).
   If `_run_background_request`'s terminal write landed first it wrote the executor's transport message
   (`"Request stopped (connection closed)."`) and cleared the snapshot, so whether the user kept their
   answer depended on lock ordering.

**Why STOP-PARTIAL-01 passed anyway.** It was verified by seeing *"Request cancelled."* in the reply
bubble — but the frontend produced that literal unconditionally, so the pass only ever proved the
markup-debris case. It cannot distinguish a kept draft from a discarded one and needs re-running with
real streamed text.

**Fixed in Phase A (A5):** both cancel paths now share `Plugin._cancelled_response_text`
([main.py:344-367](../../main.py)) so lock ordering cannot change the answer; `onCancelAsk` no longer
writes a literal or tears the poll down, and a `stopRequestedRef` guard stops a late `completed` from
resurrecting the stopped turn. The old unit tests asserted the literal and were rewritten to assert
intent — the `docs/audit/00-phase0.md` failure mode, caught in advance.

---

## 5. Ship readiness

### 5.1 Blockers vs nice-to-have

| Row | What it checks | Status | Verdict |
|---|---|---|---|
| STREAM-01 | Flag off: normal behaviour | PASS (preview, 2026-05-26) | Done — but re-run after P2/P3 touch the off path |
| STREAM-02 | Flag on, Speed/Expert live markdown | PASS (preview, 2026-06-09) | Done in preview; **needs on-Deck** |
| STREAM-03 | Spoiler mask, no body flash | Open | **Blocker** — plus the R2 nested-fence unit test |
| STREAM-04 | Stop keeps partial | Open | **Blocker** — currently impossible (§4.1) |
| STREAM-05 | Transparency only after terminal | PASS (preview) | Done |
| STREAM-06 | No text regression across polls | Open | **Blocker** — cheap; unit coverage exists in `useSmoothStreamReveal.test.ts` |
| STREAM-07 | Open fence pulse + spinner until close | Open | Nice-to-have |
| STREAM-08 | T3 handoff snap then chunk layout | Open | **Deferred by decision** — do not spend until P6 is decided |
| STREAM-09 | D-pad: one Focusable streaming, chunk chain after | Open | **Blocker** — focus regressions are this repo's known-expensive class |
| STREAM-10 | Incomplete `**bold` renders bold | Open | Nice-to-have (unit-covered in `streamMarkdownPrepare.test.ts`) |

### 5.2 Must pass on-Deck before dropping "experimental"

1. STREAM-03 on a real spoiler-heavy Strategy reply, **plus** a nested-fence unit test (R2).
2. STREAM-04 after the §4.1 fix — including the wait-chip-open case.
3. STREAM-09 with the D-pad only, focus inside the bubble across the T3 boundary.
4. STREAM-06 across a long reply (no visible text regression between polls).
5. A **frame-rate observation with a game running** — not a listed row today, and the one thing preview
   suite structurally cannot cover (R3). Recommend adding **STREAM-11: streaming during active gameplay,
   Strategy mode, ≥60 s reply**.
6. Re-run STREAM-01/02 after P2/P3, since both change the flag-off path.

---

## 6. Recommendation

**Keep experimental. Fix the cheap perf items and the Stop bug first. Do not refactor transport.**

Reasoning:

- The architecture is not what is wrong with this feature. The poll + snapshot split is the right shape for
  a closable QAM panel that remounts (S5), and push would have to keep the poll as its resync path anyway.
  Rewriting transport before P1–P4 would be optimising the part that works.
- What is wrong is (a) a Stop path that throws away the user's text (R1, certain), (b) frame cost in the
  reveal (R3, high likelihood, ★ to fix), and (c) an off-path that isn't actually cheap (R6). All three are
  single-commit, behaviour-preserving-or-better changes.
- Promotion to Settings (P8) and default-on for Speed (P9) both depend on the soft-`num_predict` bug
  ([roadmap.md § Bugs](../roadmap.md#bugs)), because streaming makes truncation something the user *watches happen*. Shipping
  streaming wider before that fix ships the truncation more visibly, not less.
- **P6 (keep the stream bubble as final layout) is the one design question worth deciding soon**, because
  it determines whether STREAM-08 is a test to pass or a row to delete. Deciding it late means paying for
  handoff polish twice.

Suggested next-session order: **P1, P2, P3, P4** (four small commits) → **P5** (STREAM-04, with the test
rewrite it implies) → decide **P6** → then re-run the STREAM matrix on-Deck and revisit P8.

Open question for the maintainer — see [roadmap.md § Bugs](../roadmap.md#bugs) (soft `num_predict`) or [maintainer-decisions-locked.md](../audit/maintainer-decisions-locked.md) if a new decision is needed:

> **Should a streamed turn keep the stream bubble as its final layout (no chunk split)?**
> Yes → STREAM-08 is deleted, the T3 discontinuity disappears, but streamed turns and history turns
> navigate differently under D-pad unless `splitResponseIntoChunks` is retired everywhere.
> No → STREAM-08/09 stay as on-Deck blockers and the dual render path (W6) is permanent.

## Maintainer decisions (planning session 2026-08-04)

Status: locked for implementation planning. Items marked **open / later** are intentional.

### Navigation / layout
- **V1 goal:** true multi-stop D-pad navigation — closed sections, live tail, and wait chip are stops while streaming.
- **History:** must use the same multi-stop model in v1 (not deferred).
- **Finish (v1):** rebuild stops with `splitResponseIntoChunks` (option C). Focus may jump at T3.
- **Extra credit (later):** keep stream section stops as final layout (option A) — no chunk rebuild.
- **New stop appears:** stay put on current focus (v1). **Notate:** auto-jump / pin-to-latest as possible later switch.
- **Spoiler inside a stop:** Down parks on spoiler reveal before leaving the section.
- **Spoiler wait chip (fence open):** A does **not** early-unmask; keep no spoiler body until fence closes (STREAM-03 safety).
- **Code wait chip:** A does nothing.
- **Scroll:** near-bottom follow for D-pad and touch — follow new text only near bottom; unpin when scrolled up.

### Stop (STREAM-04)
- Keep partial body; show small “Stopped” (or similar) status — do not replace body with cancel literal.
- If no visible answer text yet: no thinking blurb; restore the user’s question into the ask field for edit/resend.

### Scope in this v1 plan
- **Include:** multi-stop (stream + history), P1 memo, P2 gate delta when off, P3 fast poll only while streaming, P4 un-cap/scale reveal rate, P5 Stop-keeps-partial.
- **Flag:** stay Developer toggle, default off. No P8/P9 in this plan.
- **Defer:** nested-fence spoiler leak fix (P7); R8 wait-chip label flash; thinking-blurb vs streaming copy (decide later / Q6).
- **Push (P10):** spike only (`decky.emit` on-device); no product push.
- **Soft `num_predict` / `think: False`:** spike + options in plan; implement only after mid-plan maintainer nod. **Not** a hard gate for merging experimental multi-stop.
- **STREAM-11** (stream while gaming): nice-to-have, not a done blocker.

### Done bar
- Code + required on-Deck: STREAM-03 (without nested-fence unit fix), STREAM-04, STREAM-06, STREAM-09, re-run STREAM-01/02 after P2/P3.
- Remains experimental until a later promotion decision.

### Corrections to analysis (evidence)
- Claim that `chunkTotal` 1→N changes D-pad Down behavior is **not** supported by current code: `_focusedChunkRef` unused; `chunkTotal` only checked `<= 0` in `answerBubbleNavigation.ts`. Multi-stop is net-new.

---

## NEEDS VERIFICATION

- On-Deck: whether true nested Focusables (or equivalent multi-stop) survives Steam/Decky focus under QAM remount and mid-stream height growth. **Built in B1 (2026-08-07) and still the top unknown** — the fence proved one nested Focusable, B1 creates one per section and three levels deep where a section holds a masked spoiler.
- On-Deck: T3 focus jump under finish rule C is acceptable in practice. **B3 shipped the rebuild; only the felt experience of the jump is unverified.**
- On-Deck: near-bottom scroll follow with touch + D-pad does not fight multi-stop stay-put. **B4 shipped.** The two are coupled through one scroll listener rather than by agreement — `panelStepDown` fires `scroll`, so walking down the answer pins and walking to the bottom resumes the follow — so what needs checking is whether that reads right, not whether it is wired.
- Nested-fence mid-stream spoiler leak (R2) still **PLAUSIBLE** — deferred fix; STREAM-03 on-Deck may still fail on nested samples.
- `decky.emit` availability on target Deck loader (push spike).
- Soft-budget spike outcomes before any implement nod.
- STREAM-09 rewritten for multi-stop (stream + history), not “one Focusable then chunk chain.”
- Preview vs Deck: multi-stop focus cannot be signed off in preview alone.