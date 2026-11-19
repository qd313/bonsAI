# Plan 108c: the briefs, one per helper

How a brief is assembled: the session hands each helper [108-helper-rules.md](108-helper-rules.md), the section below
with its letter, the two shared sections ("What the code says today" and "The count, version 1"), the tip hash, the
absolute path of its own copy of the repo, and the plan id (108c). A section says: what a player sees today, where it
comes from, what to build, the files owned, the tests, and the check that proves it. Evidence files are named
`plan108c-<ROW>.json` by whoever runs the check, never by a helper. The plan is
[108c](../108c-spoiler-chance-for-the-chat-summary.md); its calls are c1 to c8 under D145.

**Line numbers are as read at tip `28306e896` on 2026-11-19 by one reader, not yet spot-checked by a second; the
session re-checks every section against the tip at go.** Plan 107 (a bug and Verify sweep by another chat) lands in
between. A lane that finds a line has moved re-greps and says so; a lane that finds its brief wrong says so and stops
rather than building the brief's mistake.

## Rules special to this plan

1. **Never write a protected name anywhere a person or a log can read it.** Not in a reason, not in a log line, not
   in a test's printed output. Reasons are codes from a fixed list. (The measuring scripts' raw output holds whole
   summaries; that file goes to the workshop and is the one exception.)
2. **`SUMMARY_INSTRUCTION` is not changed by any lane here.** Its own comment
   (`py_modules/backend/chats/chat_summary_service.py` 99-102) says not to without re-running the desk test.
3. **Test chats are made in the shape the plugin really saves.** Run every hand-written chat through
   `chat_slot_service.sanitize_slot` (442) before using it, so a test cannot lean on a field the cleaner drops. One
   exception, until lane B lands: the cleaner drops a summary's rating today, so an older rated summary is kept in
   its own field (`previous_summary`) and handed to the count as it is.
4. **No new setting, no new method the screen can call, no new thing passed to a tab.** A new fact for the screen
   rides inside the summary object that is already passed.
5. **`chat_summary_service.py` has 386 code lines** (`python scripts/code_line_count.py <file>`). The count of files
   over 400 code lines may not rise (`scripts/ratchet.json`). The logic lives in the new file; that file gains ten
   code lines at most.
6. **Do not touch** `src/features/chats/sum-up/buildChatSummaryNoteElement.tsx` or
   `src/features/answer/transcript/MainTabChatTranscript.tsx`. The note's words are locked (D118 calls 15 and 20) and
   plan 107 may be moving it (roadmap bug: "The summed itself up before this answer row sits under its answer").
7. **This PC's AI only** (`http://127.0.0.1:11434`), one call at a time, under the lock the shared rules name (rule
   6 there). Never the Deck, never SSH. The real measurement is the session's (step 0). A script lane may try its own
   script once, on one chat and one try, to see that it runs; it reports no numbers from that.

---

## What the code says today

**Summing up** (`py_modules/backend/chats/`)

- `chat_summary_service.py`: `SUMMARY_INSTRUCTION` 103-110. `_summary_request_messages` 167-195 builds the two
  messages from `build_memory_lines(plan.covered_turns, …)` and folds the previous summary's text in (184-190).
  `write_chat_summary` 256-425 makes the one call (options 336-341: `num_predict` 400, `think` False), cleans the
  reply (`_clean_summary_text` 209-216, then `_tidy_written_text` 241-253 for English) and builds the summary dict at
  400-415: `text`, `covers_through_turn_id`, `turns_covered`, `oldest_turns_unread`, `hidden_notes_left_out`,
  `written_at`, `seconds`, `model`, and `suggested_title` when offered. A stopped or failed call returns no summary
  (360-398). `decide_and_write_chat_summary` 478-571 is the path before an answer; it saves at 563.
- `chat_sum_up_job.py`: the button's path. `_run_sum_up_job` 184-262 calls the same `write_chat_summary` and saves
  the same dict (239). So a key added in `write_chat_summary` reaches both paths.
- `chat_summary_plan.py`: `SummaryPlan` 46-57 (`covered_turns`, `kept_turns`, `previous`); `plan_summary` 60-127.
- `chat_memory_service.py`: `strip_fenced_blocks` 161-177 swaps each ```` ```bonsai-… ```` block for
  `HIDDEN_NOTE_PLACEHOLDER` (87) and returns how many. `build_memory_lines` 279-344 keeps 200 characters of a
  question (`display_text` first, 311-312) and 400 of an answer after the strip (318-319), and skips a stopped answer
  (`CANCELLED_ANSWER_TEXT` 93). `build_chat_memory` 347-415 puts `MEMORY_SUMMARY_HEADER` (129) and the summary text
  right after the header (398-402) and reserves their cost (383-388).
- `chat_slot_service.py`: `_normalize_summary` 276-320 rebuilds the summary from a fixed list of keys, so **an
  unknown key is dropped on save** (`save_slot` 576-593 runs `sanitize_slot`). `save_slot_summary` 854-872.
  `_summary_for_screen` 811-817 and `slot_to_rpc_payload` 820 pass the summary dict to the screen whole.
- `chat_slot_rpc.py`: `_payload_with_can_sum_up` 45-53; the three places a full chat goes to the screen are 142
  (`get_chat_slot`), 170 (`create_chat_slot`) and 243 (`rename_chat_slot`).

**What a saved answer already carries** (`chat_slot_service._normalize_turn` 341-420)

- `spoiler_consent` (389): True only when the answer was given with "spoilers are okay" in force. Written from
  `main.py` 1618.
- `text` (364): the answer as written, covers included as ```` ```bonsai-spoiler ```` blocks.
- `display_text` (395) on a question: what the person saw as their question.
- `outcome` (417-419): `"stopped"` or `"failed"` on an answer that is not a finished one; absent otherwise.
- `transparency.context_chips` (`_normalize_turn_transparency` 215-247): the saved chips, whole. One has
  `id: "spoiler_risk"` and `label: "Spoiler risk: low|med|high"` (built in
  `py_modules/backend/answer/transparency_service.py` 787-811; the label comes from
  `spoiler_risk_service.spoiler_risk_chip_label`, `py_modules/backend/spoilers/spoiler_risk_service.py` 82-84).
- `transparency.kb_attached_notes` (`_normalize_kb_attached_note` 159-185): each note's `name` and `kind`, and
  `spoiler_protected: True` (184) on a boss or enemy note whose name the question did not name. The mark is set by
  `mark_spoiler_protected_notes` (`py_modules/backend/knowledge/kb_attached_notes.py` 193-205) from
  `resolve_turn_spoiler_protected_names` (`py_modules/backend/spoilers/strategy_spoiler_policy.py` 458-493), and the
  notes are merged onto the saved turn in `py_modules/backend/ask/game_ai_request.py` 1135-1138.

**Spoiler helpers to reuse, not rewrite**

- `question_asks_for_the_ending(question)`: `py_modules/backend/spoilers/ending_question_cover.py` 121-129.
- `name_appears_in_text(haystack, name)`: `strategy_spoiler_policy.py` 51.
- The answer's own band never reads consent, and reads "low" whenever Hide less is on
  (`spoiler_risk_service.py` 209-211, 242-243). Its header (17-24) says no prompt asks the AI for its tag today.
- **Hide less at the time of an answer is not saved as a field.** It shows only as the bullet "Spoiler setting: Hide
  less" inside the saved chip's body (`spoiler_risk_service.py` 269-270). Version 1 of the count does not read it.

**The screen** (`src/features/chats/`)

- `slots/chatSlotsApi.ts` 81-96: `ChatMemorySummary`, the summary's shape on the screen side.
- `slots/useChatSlots.ts` 144-161 takes `slot.summary` whole; 530-547 puts it on the open chat's row as `sumUp`
  (`ChatSumUpState`, `sum-up/chatSumUpModel.ts` 29-50). No tab prop is involved.
- `sum-up/chatSumUpModel.ts`: `summaryCardMeta` 96-100 ("16 turns · just now"), `summaryCardLines` 107-118,
  `summaryCardFooter` 125-136 ("Plus the newest 2 turns, word for word · 1 hidden note left out").
- `sum-up/SessionSumUpSection.tsx`: the focus graph in its header (18-39; "A does nothing" on the card, 24); the
  card 371-411 (head 392-395, scrolling text 397-406, "More below" 407-409); Down and Up on the card 321-340.
- `src/styles/sections/section-6.ts` 727-791: the card's rules. Its text box is 190 points high (761-773); the
  comment gives the arithmetic: 265.35 points at its tallest, 281.35 with the reveal's margins, of the 299 the Deck's
  own screen leaves. `sum-up/SessionSumUpSection.cardFit.test.tsx` works that out again from the rules.
- An answer's cover: `src/features/answer/markdown/MainTabBonsaiAiMarkdownChunk.tsx`, "Spoiler — tap to show" (547),
  "Hidden until you reveal (Strategy Guide)." (550), "Spoiler — tap to hide" (614).
- The Session view does not know the spoiler settings today (`spoilerMaskingEnabled` reaches only the answer
  bubble).

**Measuring on this PC**

- `scripts/kb/eval_kb_answers.py`: `DEFAULT_OLLAMA` 105, `DEFAULT_MODEL` 106 (`gemma4:e2b-it-qat`, "what the Deck
  loads", measured 2026-09-01; the session confirms the tag at go). One seed per try: `try_seed` 1042,
  `active_try_seed` 1051, `install_try_seed` 1074. It runs the real Ask with a stand-in plugin (the call at 1220).
- An Ask reads its chat through `plugin.chat_for_request(request_id)` (`main.py` 2231;
  `game_ai_request.py` 374): `{id, turns, summary, …}`.
- `tests/fake_ollama_stream.py` 44: `FakePlugin`, the smallest stand-in `write_chat_summary` works with.
  `tests/test_chat_summary_service.py` 237 onward shows its use. Those tests patch `urlopen`; no lane here changes
  how the call is opened.
- `scripts/deck_place_chat.py`: places a hand-written chat on the Deck from a JSON file. A turn may carry
  `spoiler_consent` and `transparency` (`TURN_KEYS` 61); a chat may not carry a `summary` (`CHAT_KEYS` 60).

---

## The count, version 1

One pure function. Lane A builds it; lanes S1, S2 and B call it by this exact shape.

```python
# py_modules/backend/chats/chat_summary_spoiler_chance.py
LEVELS = ("low", "med", "high")
KNOWN_REASONS = (                       # fixed order; the only strings ever saved or logged
    "ending_in_the_open",               # high
    "names_a_hidden_boss",              # high
    "answers_with_spoilers_on",         # med
    "risky_answers_uncovered",          # med
    "hidden_notes",                     # med; counted only when count_hidden_notes is True (call c1 b or c)
)

def rate_summary_spoiler_chance(
    *, covered_turns: list, chat_turns: list, summary_text: str,
    previous: Optional[dict] = None, count_hidden_notes: bool = False,
) -> dict:
    """-> {"level": "low" | "med" | "high", "reasons": [codes, in KNOWN_REASONS order, no repeats]}"""
```

- `covered_turns`: the turns this summary covers (`SummaryPlan.covered_turns`). `chat_turns`: every turn the chat
  has (to know what the person typed); when empty, `covered_turns` is used. `previous`: the summary being folded in,
  or None.
- **An answer counts** when its role is assistant, it has no `outcome`, and its text is not `CANCELLED_ANSWER_TEXT`.
  Its question is the nearest earlier user turn in `covered_turns` (none: an empty question). A question is read as
  `display_text` when set, else `text`.
- For each counted answer: `hidden` = the count from `strip_fenced_blocks(text)`; `in_the_open` = `hidden == 0`.

| Reason | True when | Level |
|---|---|---|
| `ending_in_the_open` | some counted answer is `in_the_open` and `question_asks_for_the_ending(its question)` | high |
| `names_a_hidden_boss` | `summary_text` names (by `name_appears_in_text`) a note `name` that was `spoiler_protected` on a counted covered answer, and no user turn in `chat_turns` names it (`text` or `display_text`) | high |
| `answers_with_spoilers_on` | at least 1 counted answer has `spoiler_consent is True` | med |
| `risky_answers_uncovered` | at least 2 counted answers are `in_the_open`, have no consent, and their saved band is high | med |
| `hidden_notes` | `count_hidden_notes` and the covered answers hold at least 1 hidden block, or `previous.hidden_notes_left_out > 0` | med |

- The level is the highest any true reason gives, else low. Then **carry forward** (call c8 a): if `previous` holds a
  valid `spoiler_chance`, the level is the higher of the two and the previous reasons are kept.
- The saved band is read with a new small reader placed beside its writer:
  `spoiler_band_from_chip_label(label) -> Optional[str]` in `spoiler_risk_service.py`, next to
  `spoiler_risk_chip_label` (82-84). A missing or odd chip reads as None, which counts as "not high".
- It never raises. Anything that is not a dict or a string is skipped.

**Known limits, on purpose.** A story answer given under Hide less carries no consent mark and reads "low", so only
an ending question catches it. A spoiler the person typed themself is theirs (plan 68 § 9) and is not counted. If
step 0 changes a threshold, the change is made here first, then in lane A's tests.

---

## A — The count as a stand-alone piece (★★ `[ask]`, Sonnet high)

**What a player sees today.** Nothing rates a chat's summary. Each answer has its own "Spoilers: low / medium /
high" chip, which never looks back.

**Where it comes from.** "What the code says today", the second and third blocks.

**What to build.**

1. `py_modules/backend/chats/chat_summary_spoiler_chance.py`, exactly as "The count, version 1" says, with the house
   file header. It sits in `chats/` because that package already imports from `spoilers/`
   (`chat_memory_service.py` 66) and the other direction would be a new import cycle (`import_cycles_be` in the
   ratchet).
2. `spoiler_band_from_chip_label` in `spoiler_risk_service.py`, beside `spoiler_risk_chip_label`.
3. One helper for whoever saves or reads the rating: `clean_spoiler_chance(raw) -> Optional[dict]`, in the new file.
   It returns `{"level", "reasons"}` only when `level` is one of `LEVELS` and `reasons` is a list; it keeps only
   codes in `KNOWN_REASONS`, in that order, without repeats; anything else gives None. Lane B's cleaner calls it.
4. Nothing calls the new function yet. That is expected: say so in the report (the unused-code check may list it
   until lane B lands; do not export anything a test does not use).

**Files owned.** The new file; `spoiler_risk_service.py` (the one reader function only);
`tests/test_chat_summary_spoiler_chance.py` (new). **Not yours:** `chat_summary_service.py`, `chat_slot_service.py`,
anything under `src/`, `scripts/`, `tests/fixtures/`.

**Tests** (unit, both directions for every reason).

- Each row of the table: a chat where it is true, and the nearest chat where it is not (an ending question whose
  answer is covered; a protected name the person typed in a later question; one risky uncovered answer, not two; a
  stopped answer with consent).
- Carry forward: previous high plus clean new turns stays high; previous absent or hostile (`"banana"`, a list) is
  ignored.
- The reasons never hold anything but known codes, whatever names the turns carry.
- Round trip: `spoiler_band_from_chip_label(spoiler_risk_chip_label(b)) == b` for the three bands; a label the
  writer never makes gives None.
- Every chat in these tests goes through `sanitize_slot` first (rule 3).
- Search `tests/` for `spoiler_risk_chip_label` and anything that imports `spoiler_risk_service`; run those files.

**The check that proves it.** Its own tests. Then step 0 (row P108C-RULE-01), run by the session.

---

## S1 — Twelve test chats and the summary-measuring script (★★ `[QA]`, Sonnet high)

**What a player sees today.** Nothing; this is measuring kit.

**What to build.**

1. `tests/fixtures/summary_spoiler_chance_chats.json`: twelve hand-written chats, 10 to 14 turns each. No real
   player text, and no sentence taken from a wiki (write from the plain facts). Each chat:
   `{id, label: "risky" | "clean", expect: "low" | "med" | "high", spoiler_phrases: [...], followups: [...], turns}`.
   `spoiler_phrases` are the short phrases that would be the spoiler if they showed (two to five per risky chat;
   empty for a clean one). `followups` are three plain questions that do not ask for the spoiler (risky chats only).
   The twelve:

   | id | What it holds | label, expect |
   |---|---|---|
   | `ending-consent` | A story game; "how does it end, spoilers are okay"; the ending answered in the open with `spoiler_consent` true | risky, high |
   | `ending-hide-less` | The same question, answered in the open, no consent mark, the chip's bullet "Spoiler setting: Hide less" | risky, high |
   | `boss-consent` | Two boss answers given in the open with consent | risky, med |
   | `boss-missed` | Two Strategy answers with a protected boss note attached, band high, no cover; the answers describe the boss fight in the open | risky, med |
   | `ai-adds` | Clean turns about a story game's mid-game; a protected boss note attached on one answer; the answers never name it | risky only if the summary names it; expect low unless it does |
   | `carried` | A `previous_summary` already rated high (rule 3's exception), then six clean turns | risky, high |
   | `typed-it` | The person types the spoiler themself in a question; answers covered or neutral | clean, low |
   | `named-boss` | The person names a boss; open tactics for it (the named-boss rule) | clean, low |
   | `all-covered` | A story game; three answers with ```` ```bonsai-spoiler ```` blocks; nothing spoiling outside them | clean, low |
   | `no-story` | A no-story game (Deep Rock Galactic: Survivor); boss and wave tips | clean, low |
   | `troubleshooting` | Crashes, Proton, frame rate | clean, low |
   | `mixed` | Two games, settings and controls, no story | clean, low |

   Give every assistant turn the saved shape: a `transparency` with `context_chips` holding a `spoiler_risk` chip
   whose label is made by `spoiler_risk_chip_label`, and `kb_attached_notes` where the row needs them (each with
   `name`, `kind`, `card`, and `spoiler_protected` where meant). Give each chat the keys `sanitize_slot` asks for
   (read it, 442 onward); a chat it turns away is a broken fixture.
2. `scripts/measure_summary_spoiler_chance.py`. For each chat and each of `--samples` tries (default 3): load the
   chat through `sanitize_slot`; build `SummaryPlan(needed=True, covered_turns=turns[:-4], kept_turns=turns[-4:],
   oldest_turns_unread=0, previous=<the fixture's previous_summary, as it is, else None>)`; call the **real**
   `write_chat_summary` with a small
   stand-in plugin (read `tests/test_chat_summary_service.py` 237 onward for the smallest one that works) so the
   cleaning and the tidy pass run as shipped; add one seed per try by importing `try_seed`, `active_try_seed` and
   `install_try_seed` from `scripts/kb/eval_kb_answers.py` (import them; do not copy them). Then record, per
   summary: the text, the seconds, the count's rating (`rate_summary_spoiler_chance`), which `spoiler_phrases` show
   (case ignored), whether a shown phrase appears in no turn of the chat (the AI added it), and whether any word of
   six letters or more that occurs only inside a hidden block of the chat shows in the summary.
3. It prints one table (chat, try, expected, rated, phrases shown, hidden words shown) and the four totals the pass
   lines need, and writes everything to a JSON file under `--out` (default `build/summary-spoiler-chance/`). Options:
   `--ollama`, `--model` (defaults as the answer test's), `--samples`, `--seed-base`, `--only`,
   `--count-hidden-notes`. It exits 0 whatever the numbers are; the session judges them.

**Files owned.** The fixture, the script, `tests/test_measure_summary_spoiler_chance.py` (new). **Not yours:**
anything under `py_modules/` or `src/`, `scripts/kb/`.

**Tests.** The scoring only, with a faked AI and no network: phrase found and not found; a phrase the chat never
said is flagged as added; a hidden-block word is flagged; the totals add up; every fixture chat survives
`sanitize_slot` with its marks intact (consent, the chip, the protected note). Reuse a neighbouring test's setup
rather than copying it (the copy-paste count is measured at landing).

**The check that proves it.** Its own tests; then the session runs it (step 0).

---

## S2 — The repeat-measuring script (★★ `[QA]`, Sonnet high; after S1 has landed)

**What to build.** `scripts/measure_summary_spoiler_repeat.py`. It takes S1's output file and two risky chat ids
(default: the two whose summaries showed the most phrases). For each chat, each of its three `followups`, three
tries: run the **real** Ask (`run_game_ai_request`) with the answer test's stand-in plugin, given a
`chat_for_request` that returns `{id, turns: <the chat's turns plus the follow-up as the newest user turn>, summary:
<that chat's first summary from S1's file, with the rating the count gave it under "spoiler_chance">}` and a
whole-number `token_stream_request_id`. The memory builder itself leaves out the turns the summary covers
(`turns_not_yet_summarized`, `chat_memory_service.py` 259-276), so the whole chat is passed. Read `scripts/kb/eval_kb_answers.py` first and import what it already has (the stand-in
plugin's set-up, the seed per try); if the set-up cannot be imported as it stands, say so in your report and stop
rather than copying it. For each answer: strip covers with `strip_fenced_blocks`, then record which
`spoiler_phrases` still show. Print the count out of 18 and write a JSON file under `--out`. A `--label` names the
run (`before`, `after`).

**Files owned.** The script and `tests/test_measure_summary_spoiler_repeat.py` (scoring only, faked AI).

**The check that proves it.** Its own tests; rows P108C-REPEAT-01 and, after lane D, P108C-REPEAT-02.

---

## Step 0 — the test, run by the session (about an hour, this PC)

1. Confirm the model tag the Deck loads today; make sure this PC's AI has it (`ollama list`). Take the lock for this
   PC's AI (shared rule 6) and hold it for the whole of step 0.
2. `python scripts/measure_summary_spoiler_chance.py --samples 3 --out build/summary-spoiler-chance/run1`
   (add `--count-hidden-notes` if call c1 was answered b or c).
3. Read all 36 summaries by hand against each chat's `spoiler_phrases`. Correct the phrase check where it missed a
   reworded spoiler or flagged a harmless word; note each correction.
4. Judge the lines, which were set before measuring (plan § 5):
   - **Misses:** summaries that hold a spoiler but are rated low: at most 1 in 10 of those that hold one; none on
     `ending-consent` or `ending-hide-less`.
   - **False alarms:** of the 18 summaries of the six clean chats, at most 3 rated med or high.
   - **Hidden text:** 0 of 36. One or more: stop, file it as a bug in the shipped summary, tell the maintainer.
   - Report, with no line: how many risky summaries held no phrase yet were rated med or high; how many times the
     AI added a phrase the chat never said.
5. `python scripts/measure_summary_spoiler_repeat.py --label before …` : the repeats out of 18. 0 or 1: lane D is not
   built. 2 or more: lane D is built (call c3 c).
6. A miss on a line: one change to "The count, version 1" (here first, then lane A's tests), then steps 2 to 4 again
   with `--seed-base 1`. A second miss: stop; bring the numbers to the maintainer.
7. Evidence: copy the JSON files to the workshop as `plan108c-P108C-RULE-01.json`, `plan108c-P108C-HIDDEN-00.json`
   and `plan108c-P108C-REPEAT-01.json`; write the totals and the verdict into the plan's log.

---

## M — The 108c tab on mock-up board 7 (★ `[ui]`, Opus at medium or high by the house rule of 2026-11-19)

For call c2. Board 7 is shared by plans 108a to 108g; the session gives this tab its number and the board's own
rules. Learn the board from `docs/demos/mockup-board-5/README.md` and the kit in `docs/demos/mockup-board-2/src`
(read as little as you can). An older drawing of this card is in `docs/demos/mockup-board/src/47-notes.js`.

- **Today.** The summary card as it is: head "What the AI remembers" and "16 turns · just now"; five or six short
  lines; the foot "Plus the newest 2 turns, word for word · 1 hidden note left out"; the "More below" row. Copy the
  words from `src/features/chats/sum-up/chatSumUpModel.ts` 96-136 and `SessionSumUpSection.tsx` 392-408, and the
  sizes from `src/styles/sections/section-6.ts` 727-791. The column is 300 points; draw the Sum up button above the
  card and the first turn row below it, enough to see where you are.
- **Each option is drawn at low, medium and high** (a three-way switch on the card, or three cards).
  - `tc-A`, a line in the foot: "Spoiler chance: high · An ending was answered in the open".
  - `tc-B`, a small tag in the head, beside the turn count, coloured by level; the reason as the foot's first line.
  - `tc-C`, covered at high: the head and tag stay; the lines are replaced by a cover in the answer cover's look
    (copy "Spoiler — tap to show" from `MainTabBonsaiAiMarkdownChunk.tsx` 547 as the starting words, then offer
    "This summary may hold spoilers. Press A to read."); A opens it; Down and Up then scroll as today.
  - `tc-D`, the mix: nothing at low, a quiet foot line at medium, tag and cover at high.
- **A wording switch** on the tab, applied to every option: "Spoiler chance: high" / "Spoilers: high" (the answer
  chip's words, `py_modules/backend/answer/chip_short_labels.py` 66-71) / "May hold spoilers".
- **The four reason sentences**, shown as they would read: "An ending was answered in the open." "It names a boss
  you did not ask about." "Some answers were given with spoilers on." "Some risky answers had nothing covered."
- **Pressable** through the kit's D-pad engine: the ring goes button, card, first row; A on a covered card opens it.
- Each option's card says what it costs: "adds no D-pad stop", "the card's head may wrap at Large text", "one more
  press to read at high".
- Measure the drawn card's own height in each state and print it under the option: on the Deck's own screen the
  whole card must stay within 281 points.

**Files owned.** This tab's two files in `docs/demos/mockup-board-7/src/` (the session names them).

---

## B — The rating is saved with each new summary (★★ `[ask]`, Sonnet high; only after step 0 has passed)

**What a player sees today.** Nothing new yet after this lane either: it saves the rating; lane C shows it.

**Where it comes from.** `write_chat_summary` builds the summary dict at 400-415; `_normalize_summary` (276-320)
drops any key it does not know; the screen's type is `ChatMemorySummary` (`chatSlotsApi.ts` 81-96).

**What to build.**

1. In `write_chat_summary`, after the text is final and before the dict is returned: call
   `rate_summary_spoiler_chance(covered_turns=plan.covered_turns, chat_turns=<the chat's turns, else covered plus
   kept>, summary_text=cleaned, previous=plan.previous, count_hidden_notes=<per call c1>)` and put the result under
   `"spoiler_chance"`. Ten code lines at most in this file (rule 5). The existing "written" log line gains the level
   and the reason codes, nothing else.
2. In `_normalize_summary`: keep `spoiler_chance` when `clean_spoiler_chance` returns one; leave the key off
   otherwise ("absent, not empty", like `suggested_title`).
3. `ChatMemorySummary` gains `spoiler_chance?: { level: "low" | "med" | "high"; reasons: string[] }`, with a comment
   saying a summary written before this build has none.
4. **Only if the pick on board 7 includes a cover:** the screen must know when covers are off. In
   `chat_slot_rpc.py`, the three places a full chat goes to the screen (142, 170, 243): when the summary's level is
   high, read the settings (`await self.load_settings()`, as line 105 does) and add `starts_covered: True` to the
   summary **on its way to the screen only** (a copy; never saved) unless `strategy_spoiler_masking_enabled` is
   False or `spoiler_tier` is `"open"`. `ChatMemorySummary` gains `starts_covered?: boolean`. If no cover was
   picked, skip this item and say so.
5. A stopped, failed or timed-out summary saves nothing, as today. Do not change that path.

**Files owned.** `chat_summary_service.py` (the one call), `chat_slot_service.py` (`_normalize_summary` only),
`chat_slot_rpc.py` (item 4 only), `src/features/chats/slots/chatSlotsApi.ts` (the type only), and the tests below.
**Not yours:** the new count file (lane A's; if it needs a change, stop and report), `chat_memory_service.py`
(lane D's), anything under `src/features/chats/sum-up/`.

**Tests.**

- `tests/test_chat_summary_service.py`: a written summary of a chat with an open ending carries
  `spoiler_chance.level == "high"`; a clean chat carries low; a second summary over a high one stays high; a stopped
  call returns no summary (the existing test still passes untouched).
- `tests/test_chat_slot_service.py` (the summary tests near 666-742): a valid rating survives save and load; a
  hostile one (`level: "banana"`, reasons not a list, sixty reasons, an unknown code, a reason that is a boss's name)
  is dropped or cleaned; **a chat file saved before this build, with no such key, loads and saves unchanged**.
- `tests/test_chat_sum_up_job.py`: the button's path saves the same key.
- Item 4, if built: covered at high with default settings; not covered with masking off; not covered with Hide less;
  never written to the chat file.
- Search `tests/` and `src/` for `hidden_notes_left_out` (every place the summary's shape is spelled out: ten
  screen test files, three Python test files and one fixture at this tip) and make sure none breaks; none should
  need the new key.
- Break the cleaner on purpose once (let an unknown reason through), see the hostile-input test fail, put it back,
  and name that failure in the commit message.

**The check that proves it.** Its own tests; then P108C-CARD-HIGH reads the saved rating through the card.

---

## C — The rating on the card (★★★ `[ui]` `[focus]`, Opus extra-high)

**Not started until three things exist:** the maintainer's pick on board 7; lane B landed; and row P108C-M-CARD's
measurement of the card on the Deck (its edges and the dock's top, on the build without this lane), with plan 107's
landings already in the tip.

**The drawing is the design.** Build the picked option at the sizes drawn. Where this brief and the drawing differ,
the drawing wins; say so in the report. Measure the drawing itself; do not work sizes out from its CSS by hand.

**Where.** `chatSumUpModel.ts` (the words), `SessionSumUpSection.tsx` (the card), `section-6.ts` 727-791 (the
card's rules).

**What to build** (the parts the pick names; skip the rest).

1. In `chatSumUpModel.ts`, one pure function that turns `summary.spoiler_chance` into what the card shows: the
   level's word, the reason sentences (the four in lane M; an unknown code shows nothing), and whether the card
   starts covered (`summary.starts_covered === true`). No rating: null, and the card is exactly today's.
2. The tag or the line, placed as drawn.
3. The cover, if picked: while covered, the card's lines are not in the page at all (not merely hidden by a style);
   A opens it (`onOKButton` and `onClick`, never `onActivate` as well: Steam fires that for A too); the ring stays
   on the card; the card is brought whole above the dock again after it grows (`showWholeCard`); Down and Up then
   scroll as today. While it is covered there is nothing to scroll, so Down and Up leave the card at once, as they
   do from a card whose text fits. A new summary (a new `written_at`) starts covered again. Whether A closes it
   again is as drawn.
4. Update the focus graph in the file's header ("A does nothing" becomes what A now does).
5. The card's tallest state must still fit: redo the arithmetic in the `section-6.ts` comment and in
   `SessionSumUpSection.cardFit.test.tsx`.

**Files owned.** `chatSumUpModel.ts`, `chatSumUpModel.test.ts`, `SessionSumUpSection.tsx` and its test files,
`section-6.ts` (the card's rules only), `docs/focus-graph.md` if it describes this card. **Not yours:** the note
file and the transcript (rule 6), `chatSlotsApi.ts`, anything under `py_modules/`.

**Tests.** `chatSumUpModel.test.ts`: each level and each reason; an unknown code; no rating. A new
`SessionSumUpSection.spoilerChance.test.tsx`: covered at high when `starts_covered`; the lines are absent from the
page while covered; A opens; a bounded D-pad walk through button, card and first row with no stop visited twice,
modelling Steam's own scroll after each move (lessons § 4; `src/test-harness/deckAnswerWalk.ts` shows how). The
`cardFit` test for the tallest state. The focus check (`pnpm test:focus`).

**The check that proves it.** P108C-CARD-HIGH, P108C-CARD-LOW, P108C-CARD-DPAD, P108C-OLD-CHAT on the Deck, then
QA-FREE-PLAY-01 and QA-LOOK-01 on the Session view. The session asks the second opinion before landing.

---

## D — The AI is careful with a risky summary (★★ `[ask]`, Sonnet high; only if step 0 counted 2 or more repeats)

**What a player sees today.** After a chat with an open ending is summed up, a later plain question can get an
answer that states the ending outside a cover (counted in P108C-REPEAT-01).

**Where it comes from.** `build_chat_memory` (`chat_memory_service.py` 347-415) puts the summary's text in front of
every later question with no word about what it may hold.

**What to build.**

1. A constant beside `MEMORY_SUMMARY_HEADER` (129): "These notes may hold story spoilers. Do not repeat story
   details from them unless the player asks for them."
2. In `build_chat_memory`, when `summary["spoiler_chance"]["level"]` is `"med"` or `"high"`: the sentence goes on
   its own line right after `MEMORY_SUMMARY_HEADER` and before the summary's text, and its length is added to
   `summary_cost` (383-388). It stays the same from question to question, so the server's saved reading of the
   block's front is kept.
3. A summary with no rating, or a low one, gives **the same block as today, byte for byte**.

**Files owned.** `chat_memory_service.py`, `tests/test_chat_memory_service.py`.

**Tests.** Rated med or high: the sentence is there, once, in that place, and the block still fits its allowance.
Unrated and low: the block equals today's exactly (keep one of today's expected blocks as the proof). Search
`tests/` for `MEMORY_SUMMARY_HEADER` and "Summary of earlier turns" and run those files.

**Measure before and after** (the session, with S2's script): repeats fall from the `before` count to 1 or fewer of
18 (row P108C-REPEAT-02); and reading the 18 `after` answers, at least 16 still make sensible use of the chat (the
warning must not make the AI ignore the summary). Report the memory block's length before and after.

---

## The Deck block, in outline (the session writes the runbook at go)

Two chat files for `scripts/deck_place_chat.py`, written by the session from S1's fixture: **risky** (S1's
`ending-consent` turns, repeated with reworded filler until the chat holds at least 30 question-and-answer pairs,
each answer at least 450 characters) and **clean** (the same length from `no-story`). The length is what makes "Sum
up this chat" live; the long-chat recipe's 45 short turns are likely too few characters for that (not measured; if
the button is greyed out, ask one real question first, then try again). Switch to a placed chat from another chat;
the plugin does not reload the open one. Remove both chats afterwards with `--remove`, and clear any pinned test
chips.

Rows: P108C-M-CARD (before lane C), then on the new build P108C-CARD-HIGH, P108C-CARD-LOW, P108C-CARD-DPAD,
P108C-OLD-CHAT (a chat already summed up on the Deck before this build; if none is left, say so and rely on lane B's
old-file test), P108C-STOP, QA-FREE-PLAY-01 and QA-LOOK-01 on the Session view. Unload the Deck's AI before any row
that runs a game; none of these needs one.

## The bookkeeper's paperwork

- **At go:** plan 108c's calls c1 to c8, as answered, into D145 (the session says where D145 stands for the sister
  plans). One open row per check in the plan's § 6, each saying which machine it runs on. The roadmap entry gains
  "chosen for plan 108c" and stays in Features.
- **When lane B lands:** the entry reads PARTIAL (the rating is saved; nothing shows yet), with step 0's numbers in
  one sentence and the evidence file named.
- **When lane C lands:** the entry moves to Verify, naming P108C-CARD-HIGH, -LOW, -DPAD and the two sweeps; a
  changelog line; the two hand checks (P108C-EYES-01, P108C-LOOK-01) go onto the "checks only you can do" page.
- **If step 0 stops the work:** the entry stays OPEN with the numbers and the reason, and nothing else changes.

## Questions for a reviewer

No reviewer is required: there is no new disk read, permission, download, dependency or licence. One question is
worth a second opinion before lane C lands (it is also a D-pad and layout landing): **can any path put a protected
name on screen or in a log?** The answer should be "no" by reading lane A's reasons list, lane B's log line and
lane C's four sentences.
