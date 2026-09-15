# Plan 33: which model and effort to use for what

**Status: POLICY since 2026-09-05 (D59, all five calls locked; Haiku is on a measured trial, § 4a).** The short form lives in
[AGENTS.md, 'Which model does which work'](../../AGENTS.md); this file is the evidence and the long form. A prompt-time hook hands every
implementation kickoff the short table and asks for a gentle heads-up when the session is outside it; it never blocks.

## Executive summary (plain language)

Every one of the 84 sessions since 2026-08-02 records which model ran each turn and at what effort, so this
is measured, not guessed. Three things matter:

1. **The model tier is the expensive lever, not the effort setting.** Raising Opus from high to max costs
   about 25% more per turn. Switching from Opus to Fable costs 2.5 to 3 times more per turn, and Fable 5.1
   at max writes 4.5 times more output per turn than Opus high. Eight of the ten times a session stalled on a
   usage limit, it was a Fable 5.1 max session.
2. **Cheap models did the ★ to ★★★ work fine when the cause was known.** Five Sonnet lanes shipped five
   features on 2026-08-28 that all passed on the Deck, for about $60 total.
3. **Focus and layout bugs fail on the device at every model tier.** Opus high, Opus xhigh, and the Sonnet
   lanes all shipped green-under-tests fixes that were dead on the Deck. What fixed them was measuring
   first. No model choice substitutes for that.

Checklist for this plan:

- ✅ Evidence gathered from the transcripts and commits (§ 5)
- ✅ Routing table drafted (§ 2)
- ✅ Prompt-time reminder hook installed (§ 6)
- ✅ Roadmap maintainer note added
- ✅ Maintainer review (D59, 2026-09-05: table, orchestrator, lane scope and AGENTS.md placement locked)
- ✅ Short form copied into AGENTS.md, 'Which model does which work'
- ✅ Bookkeeper helper and guard installed (2026-09-06, § 6)
- ⬜ Haiku trial: ten lookups logged in § 4a, then keep or drop

## 1. What each model costs here

Measured across every turn in every session, priced at API list rates with cache reads included. The
numbers are dollar equivalents; the account runs on a subscription, so the real limit is the usage window,
which the same ratios drive.

| Model and effort | Cost per turn | Output tokens per turn | Where it was used |
|---|---|---|---|
| Sonnet 5 high, as a lane subagent | $0.04 to $0.08 | ~170 | bug and feature lanes |
| Sonnet 5 high, main session | $0.07 | ~760 | implementing from an Opus plan |
| Opus 5 medium | $0.10 | ~680 | explanations, tooling fixes |
| Opus 5 high | $0.16 | ~760 | most of August |
| Opus 5 xhigh | $0.19 | ~970 | the refactor, the plans |
| Opus 5 max | $0.20 | ~1,100 | late August |
| Fable 5 high | $0.40 | ~1,130 | 08-22 to 08-31 |
| Fable 5.1 max | $0.45 | ~3,430 | 09-01 onward |

Plan documents written by Fable 5.1 max run 7,000 to 9,400 words (plans 30 and 31). The Opus plans for
comparable scope run 3,300 to 5,500. Planning the ★★ "one-line preset row" fix on Fable max cost about
$200 and hit a usage limit part way.

## 2. The routing table

"Plan" means: read the code, decide the approach, write the decisions and the lane briefs. "Implement"
means: write the code and tests. "Land" means: review each diff, cherry-pick, keep the docs honest.
"Deck" means: drive the device and interpret what it says.

| Work | Plan | Implement | Land and review | Deck |
|---|---|---|---|---|
| ★★★★★ and ★★★★★★ feature | Fable 5.1 max, decisions and briefs only, not a 9,000-word document | Sonnet 5 high lanes | Opus xhigh | Opus xhigh or the orchestrator |
| ★★★ and ★★★★ feature or bug | Opus xhigh | Sonnet 5 high lanes when the cause is known; Opus xhigh itself when it is not | Opus xhigh | same |
| ★ and ★★ feature or bug | none, or Opus xhigh in the same session | Sonnet 5 high | Opus xhigh if it touches focus or settings plumbing, else none | same |
| Focus and layout (`[focus]`, `[layout]`, `[ui]`) | Opus xhigh, **after** a device measurement | Opus xhigh with the measurement in hand; Sonnet only for a fix whose cause the measurement already named | Opus xhigh | required; no fix is done until the row passes |
| Pixel polish (dots, rings, fonts) | do not use Fable; the tools cannot see pixels | Opus xhigh with a measurement, else a human | | human eyes |
| Backend and retrieval (`[KB]`, `[ollama]`) | Opus xhigh | Sonnet 5 high | Opus xhigh | the eval harness, not the Deck |
| Refactor | Opus xhigh (§ 3) | Sonnet 5 high lanes for moves; Opus xhigh for behavior-touching steps | Opus xhigh | after each landing batch |
| Docs, roadmap bookkeeping, plain explanations | | the `bookkeeper` helper (Sonnet 5 high) or Opus medium | | |
| Read-only lookups with a checkable answer | | Haiku 4.5 on trial (§ 4a) or Sonnet 5 low | the caller greps to confirm | |
| Deck QA driving | Opus xhigh writes the rows and expect strings | Sonnet 5 high may run rows already written | Opus xhigh reads the failures | |

Escalation rule: go up one tier only after the tier below has failed **on the device** twice with a
measurement in hand. Going up because a fix "feels hard" is what the history says does not help.

Effort on Opus: use xhigh for anything that writes code or a plan. High to xhigh costs 20% more per turn
and the refactor, the plans, and the landings were all done there. Medium is for explanations and tooling
fixes. Max on Opus bought nothing measurable over xhigh.

### 2a. Max effort and ultracode

**Max.** On Opus, max cost 5% more per turn than xhigh here and no session shows a result xhigh did not get;
use xhigh. On Fable, max is where nearly all the Fable turns ran, and it is the setting that produced the
9,000-word plans and eight of the ten usage-limit stalls. Use Fable max for exactly two things: the decision
list and lane briefs for ★★★★★ scope, where a wrong call costs more in lane rework than the plan costs; and
root-causing a bug that has already failed on the device twice with a measurement in hand. For everything
else on Fable, high is the same tier at a fifth of the output. Raise effort only when the level below has
been tried and measured, never as a default.

**Ultracode.** Ultracode is xhigh effort plus standing workflow orchestration: the session may spawn a
workflow of many agents on its own. It has run once here, on 2026-08-30, as ten Fable 5 xhigh read-only
fact checkers over plan 28 for about $62; the plan's citations came back clean and the build still missed
the mockup's shape, because checking a plan against the code is not checking it against the drawing.
Use a workflow only for read-only fan-out with independently checkable pieces: verifying every citation in
a plan, reviewing one large diff across several dimensions, auditing a batch of KB cards, running many
lookups at once. Pin the worker model to Sonnet 5 or Haiku 4.5, which brings that $62 to under $10. Do not
use it for implementation (lanes in worktrees are the right shape, and only one driver can hold the Deck),
for anything ★–★★, or as a session default, because it also forces xhigh on every turn.

## 3. Refactoring: how to break it down

The August refactor (phase 0 through step 11, 2026-08-02 to 08-05) ran on Opus xhigh at about $7 per
commit with tests green between commits and every decision written to the roadmap as a D entry. The only
problems surfaced on the device afterward (a voice install reset, "lost work" in main.py, a focus
regression), which is the same pattern as everywhere else. The rules in REFACTOR-PLAN.md § Refactor rules
(one refactor per commit, never mix a move with a rewrite) held up and stay.

Break a refactor into these pieces and route each one:

1. **Recon.** Produce the inventory: which files, which symbols, who imports what, which tests assert
   shape rather than behavior. This has a checkable answer, so it is lane work. Sonnet 5 high subagents,
   read-only, citing `file:line`, with `import-graph.json` and `git log -S` as the tools. The step 11
   friction test used three Opus xhigh "new contributor" agents at about $50; Sonnet would have produced
   the same file list for a fifth of that.
2. **The plan and the decisions.** Opus xhigh, one session, writing the phases and the D entries. The
   refactor plan and D1 through D15 were written this way and none needed redoing. Fable is not needed.
3. **Mechanical moves.** Extract a module, move a hook, rename, relocate tests. One move per commit, gates
   green, no behavior change. Sonnet 5 high lanes with a precise brief. Never more than three lanes on a
   refactor at once: the moves share files, and plan 32 § 4 measured that merge churn beyond five lanes
   costs more than the parallelism buys; refactors overlap more than bug lanes do.
4. **Behavior-touching steps.** Anything that changes what a function returns, a settings normalizer,
   an RPC name, or the focus registry. Opus xhigh does these itself, not a lane, because the diff needs
   judgment and the tests may need rewriting rather than moving.
5. **Landing.** Opus xhigh reviews each lane diff against the rules, cherry-picks oldest first, and runs
   all four gates on the merged tree before the next lane lands.
6. **Device check after each landing batch.** Serial, one driver. A refactor that "changed nothing" has
   regressed on the Deck before (seven regressions re-applied 2026-07-06).

Two traps the history already paid for: a lane worktree spawned 442 commits behind the branch
(2026-08-23 and 08-28), so every lane's first act is the ancestry check; and tests that asserted
implementation shape had to be rewritten, not the code contorted (docs/audit/00-phase0.md).

## 4. Subagents: does orchestrator plus Sonnet lanes work?

Yes, for cause-known work, and every failure so far was operational rather than a model problem.

| Date | Orchestrator | Lanes | What happened |
|---|---|---|---|
| 08-23 | Opus high | 8 Sonnet high | Ten bugs fixed; seven owed a Deck run. Two lanes died on the monthly spend limit. Two lanes wasted their whole run on a stale worktree base. Device results mixed: card floors passed, blank question and the advice guard failed. |
| 08-28 | Fable 5 high | 5 Sonnet high | Five ★★ to ★★★ features. All five verified on the Deck the same day. About $60 in total. |
| 08-28 | Fable 5 high | 3 (Sonnet high, Fable 5 high) | KB lanes. One lane found its base 442 commits behind and reset itself; the bookkeeping lane had to redo both fixes. |
| 08-30 | Fable 5 xhigh | 10 Fable 5 xhigh read-only fact checkers | Checked plan 28 line by line. The implementation still built the preset row the wrong shape; fact-checking a plan does not check it against the mockup. |
| 09-03 | Fable 5.1 max | 4 desk-half agents | Docs bookkeeping while another chat held the Deck. Worked; one agent died on the session limit. |
| 09-04 | Fable 5.1 max | 6 Sonnet lanes | Thirteen bugs. Lanes C, E, F passed the device first try. Lanes A, B, D (all focus bugs) needed two or three redos each. Lanes cost $237; the orchestrator about $290. |

What to keep doing:

- Lane briefs that carry the ancestry check, the file ownership, one fix per commit, and the four gates.
- Five lanes at most. Sonnet 5 high is the right lane model; nothing in the record says a stronger lane
  would have passed the device where Sonnet failed.
- The orchestrator reviews every diff against the focus law and drives the Deck serially.

What to change:

- **The orchestrator does not need Fable for a bug session.** It spent its effort reviewing diffs,
  resolving docs conflicts, and driving the Deck. Opus xhigh does all three, and the orchestrator was
  more than half the session cost on 09-04. Use Fable only when the same session also plans ★★★★★ scope.
- **Lanes should not edit the roadmap, testing rows, or the changelog.** Plan 32 had lanes move their own
  rows and the orchestrator then spent turns resolving the conflicts. Lanes return code, tests, and a
  one-paragraph report; the bookkeeping is done by the bookkeeper helper, briefed by the orchestrator, in
  one commit per landing.
- **Check the lane effort actually took.** Settled 2026-09-06: across every helper transcript on this
  machine, the bugfix-lane and feature-lane helpers (front matter `effort: high`) ran every turn at high
  (1,111 and 899 turns). The "max" turns the plan saw were general-purpose helpers with no front matter,
  which inherit the parent's effort (2,874 Sonnet turns at max, all from Fable-max parents). So the front
  matter is honored; a helper with no front matter runs at whatever the main chat runs at.
- **Do not launch lanes near a usage-limit reset.** Two lane runs on 08-23 and one on 09-03 were killed
  mid-task and had to be relaunched from scratch.

### 4a. The Haiku trial (D59 #4, locked 2026-09-05)

Haiku 4.5 is on trial for the read-only lookups above. The rule: **measure it, and if Sonnet has to step in,
drop it.** Every Haiku use gets a row here. The caller confirms the answer with a grep before acting, and a
row is a miss when the answer was wrong, incomplete, or a Sonnet or Opus agent had to redo the lookup.
Verdict after ten rows: keep it if two or fewer misses; drop it and strike this section otherwise.

| Date | Session | What it looked up | Confirmed correct? | Sonnet or Opus had to step in? |
|---|---|---|---|---|
| | | | | |

## 5. Where Haiku fits

Haiku 4.5 has been used once here: a six-turn documentation lookup on 09-04, for under a dollar. There is
no evidence either way about it doing more, which is why § 4a is a trial with a log and a drop rule.

Where it is a safe fit, because the answer can be checked by the caller:

- Read-only lookups that return `file:line` or a list: who imports a symbol, which testing rows name a
  feature, which D entry locked a call, what a QA row's expect strings are. The orchestrator confirms
  with a grep before acting.
- Fetching documentation and summarizing a log tail or a `runs/` evidence file into a few lines.
- The default model for `prompt` and `agent` hooks, for example a post-commit check that the roadmap row
  moved with the fix.

Where it is not a fit:

- Editing the roadmap, testing docs, or archive files. The structure rules and the duplicated archive
  entries tripped Sonnet on 08-28; Haiku would do worse.
- Anything that presses a button on the Deck or judges pass and fail. The rig returns structured
  visibility verdicts, so vision is not the problem; judgment is. Sonnet medium got stuck polling a
  sleeping Deck on 08-12 and Haiku has less headroom than that.
- Writing code or tests, however small.

Honest cost note: all Sonnet lane work in the whole record cost about $360. Replacing half of it with
Haiku saves perhaps $150 a month, against $1,150 spent on Fable 5.1 max turns in four days. Haiku is a
tidy-up, not the lever. The lever is which tier runs the main session.

## 6. The reminder

A `UserPromptSubmit` hook in `.claude/settings.json` runs `.claude/hooks/model-routing-check.py` on every
prompt. Both files sit under `.claude/`, which git ignores, so the reminder lives on the maintainer's machine
only. When the prompt reads like the start of a bug fix, feature, refactor or lane session ("implement",
"fix the", "go ahead", "start on", "let's tackle", "work on", "land", "redo", "refactor", "lanes"), it reads
the session's own transcript for the model and effort of the last turn, and hands the session the short
routing table plus one instruction: find the roadmap entry's stars and tag, compare, and if the running
model or effort is outside the table, open the reply with one gentle sentence saying so and naming the
recommended row, then carry on. If it matches, the session says nothing. On a session's first prompt there
is no turn yet, so it reports the user-settings default and says so. It never blocks. Confirmed live
2026-09-05: it fired on the prompt that asked for this section.

A second hook, the bookkeeper guard, works differently: it refuses instead of reminding. If a session
running on Fable tries to edit the roadmap, the testing docs, the changelog, or a test file itself, the
guard stops that edit and tells the session to hand the batch to the `bookkeeper` helper instead, with a
brief that says what a person will notice and what each row should read. It never fires inside a helper,
on Opus or Sonnet, or on a plan, a memory file, or a scratch file. Setting `BONSAI_BOOKKEEPER_GUARD=off`
turns it off for one session. It lives under `.claude/` on the maintainer's machine, git-ignored, the same
as the reminder. Fifteen fake-call checks passed on 2026-09-06. It is a refusal rather than a rule because
a rule can drift out of a long chat's attention, while a refused call cannot be missed. The honest limit:
the guard only changes who types the file. Every reply the maintainer reads in the chat is still written
by the main model running the session; the guard cannot move that.

## 7. Evidence

- **Sonnet medium explained, Opus medium measured (2026-08-12).** On the QAM black dead space, Sonnet
  medium read the height guard and called it a deliberate tradeoff. Opus medium measured the live DOM and
  found Steam's own pane is also 300px inside an 806px container.
- **Sonnet medium driving the Deck (2026-08-12).** Twelve poll notifications, the Deck slept and crashed,
  the maintainer switched to Opus xhigh to continue.
- **Opus high missed the focus root cause; Fable 5 high found it (2026-08-27, commits 3321cb2 and
  31423e7).** The device rejected the Opus fix; the Fable session measured that keydown never fires and
  Steam only calls onMoveDown. That is the "focus law" plans 26 and 32 cite, after four regressions.
- **Fable 5 high built the preset row the wrong shape (2026-09-01, commit fc1b245).** Collapsed three
  rows into one chip and reported a verified win; the mockup had chips side by side.
- **Opus max on the indicator dots (2026-08-30).** Three rounds of "verified on device" and the maintainer
  still saw an oval fourth dot. Deck screenshots were broken (DPS finding P2-4) and the focus rig is a DOM
  hit test, so no model could see the pixels.
- **Focus fixes fail on device at every tier.** Opus xhigh revert 2026-08-04 (5b35096); Opus high
  2026-08-27 (3321cb2); Sonnet lanes 2026-09-04 (d86b694, 8249507, f9a4c17, 195048c).
- **Cheap models were enough.** The five 08-28 features (DIAG-FOLD-01, SPOILER-FEEDBACK-01,
  COPY-REPLY-01/02, decode animation, DRG glossary) all verified. Plan 26 phase 1 on Sonnet high landed
  three fixes and a device confirmation in under two hours. Opus medium fixed the DPS server error and
  did the dead-space measurement.
- **Usage-limit stalls:** 09-02 (three, Fable 5.1 max), 09-04 (two, one Fable max and one Opus high right
  after switching), 09-05 (two, Fable 5.1 max), 08-23 (one, Opus high with eight lanes running).

## 8. Calls for the maintainer (D59)

Answered in chat 2026-09-05: § 2 adopted as written (#1); Opus xhigh orchestrates bug and feature lane
sessions (#2); lanes return code, tests and a report only (#3); the short form lives in AGENTS.md, 'Which model does which work', with
this file as the evidence (#5); Haiku 4.5 goes on a measured trial for read-only lookups, dropped if Sonnet
has to step in (#4, § 4a).
