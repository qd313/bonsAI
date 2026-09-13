# What is in this folder

This folder holds proof that a test actually ran. A file only stays here because a
written test line names it. Everything else gets thrown away — nothing is kept
"just in case."

There are two different kinds of proof in here, described below.

## Steam Deck walk recordings

Most of the files in this folder (the ones with names like `TAB-BAR-02-fresh-open-downs.json`)
are logs from an automatic walk through the app on a real Steam Deck — a script presses
buttons and writes down what happened, step by step.

A bug used to save one of these logs on every single run, so hundreds piled up in the
project with nothing pointing at them. That bug is fixed. From now on, a Deck walk's log
stays on the machine that made it and is never saved into the project automatically. A
file only lands here when someone copies it in on purpose because a test line needs it
as its proof.

**If a file here is not named by [testing.md](../testing.md), [testing-manual.md](../testing-manual.md),
[roadmap.md](../roadmap.md), or one of the older write-ups under [docs/archive](../archive/),
it does not belong here and can be removed.**

## Preview-tool folders (`deckOnly`, `preGate`, `tier0`, `tier1Boundaries`, `tier1Core`, `tier2`, `tier2Deep`, `tier3UI`)

These folders hold a different, older kind of record: output written by
[scripts/run-preview-suite.mjs](../../scripts/run-preview-suite.mjs) when it checks the
app in the in-editor preview tool rather than on a real Deck. Layout is
`<batch>/<date>-<build>/<check-name>/`.

This section exists because **two of these files are not what their names suggest**, and
that was not obvious to anyone just looking at the folder.

| File | What it actually is | Trust it? |
|------|------------|-----------|
| `manifest.json` | The result for one check — the steps taken, what was confirmed, pass or fail. **Correct even when the summary below is not.** | **Yes** |
| `batch-summary.json` | A roll-up of a whole batch of checks. Look at whether it says the checks ran this time or were carried over from an earlier run — a few summaries written before 2026-08-05 under-count. See [testing.md](../testing.md#evidence-retention). | Read the note first |
| `dom-final.html` | A snapshot of the page. **Cut off partway through, with no warning that it was cut.** If the very first thing on the page was a style block, the whole file is just that styling and none of the actual page. | **No** |
| `focus-path.json` | Meant to show where the on-screen selection moved. It actually just repeats back the button presses that were sent in, not where the selection landed. Every stored copy says the same two presses. | **No** |
| `active-element.txt` | Meant to show what was selected. Every stored copy says nothing was selected at all, which means this file never worked. | Only useful as proof that nothing was selected |
| `final.png` | **Not a real screenshot.** It is a plain dark rectangle with placeholder text and the window size — the same picture every time. | **No** |
| `console.log` and other raw text output | Real, unedited output. | Yes |

The three problems marked **No** above (the cut-off page snapshot, the selection log
that only echoes its own input, and the fake screenshot) are all caused by the preview
tool itself, not by this project's code. They are written up for the tool's maker in the
[findings log](../mcp-setup.md), and the full explanation of what this means for what has
and has not really been checked is in
[testing.md](../testing.md#preview-suite-evidence-invalidated-2026-08-08).

Nobody has gone back and deleted the old preview-tool files affected by this — older
write-ups still link to them by their folder path, and the clean-up rule for this
project already leaves alone anything a test line names.
