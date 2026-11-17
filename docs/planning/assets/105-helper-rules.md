# Plan 105: the rules every helper reads

One page, read before your brief. Your brief (a section of `105-lane-briefs.md`) and your task give the rest: the tip
hash, the absolute path of your own copy of the repo, the files you own, and the check your work must pass on a test
machine. Where this page and your helper definition file disagree, the stricter one wins.

**Plan 103's rules are kept.** Read [103-helper-rules.md](103-helper-rules.md) in full and follow these sections of
it word for word: "Your copy of the repo" (rules 1 to 8), "The work" (rules 21 to 28, reading "plan 105" for "plan
103" and "lane P1" for "lane R2"), "Before every commit", "Never", and "Your commit messages and your report". Its
knowledge-base section (rules 9 to 20) applies only if your brief says you touch the knowledge base; rule 9's first
sentence (this PC's AI may be used, the Deck may not) applies to everyone.

The lines below are this plan's.

## New for plan 105

1. **Your brief's facts are from tip `d58e3155`.** Plan 104 ran between then and now. Before you change anything,
   re-find every file, function and line your brief names (`git -C <copy> grep`). If one has moved, say so in your
   report and carry on from where it is now. If the thing your brief describes is no longer true (already fixed,
   removed, reshaped), **stop and report**; do not build the brief's mistake.
2. **A drawing outranks a brief.** If your brief names a drawing (board 5, the density board, the Headline-first
   page), open the built page from `docs/demos/…` and build what is drawn, at the sizes drawn. Where the drawing and
   the brief's words disagree, the drawing wins and your report says so. Measure the drawing itself (its own
   `offsetHeight` and widths); do not work sizes out by hand from its CSS.
3. **Settings in both languages.** A setting added, removed or widened changes the screen side and the Python side
   together, plus `tests/contracts/settings-defaults.json` and `settings-hostile-inputs.json`. An old settings file
   from a real Deck must still load: a removed key is ignored, never an error; a test proves it with a saved file that
   still carries the old key.
4. **The count of things passed to a tab may only shrink** (`scripts/ratchet.json`). Pass a new setting inside an
   object that is already passed.
5. **A lane that deletes code** names every test it deletes and why, searches `src`, `py_modules`, `tests` and
   `scripts` for each name before it removes it (a comment is not a use; a script is), and regenerates the generated
   files with their own scripts; it never hand-edits `src/types/rpcMethods.ts` or anything under
   `packages/bonsai-mcp/knowledge/architecture/`.
6. **Downloads and builds on the Deck.** A change that adds a download site, a container pull or a build step lists
   every site in the download box before anything starts, keeps the Internet downloads permission as the only gate,
   never widens what runs without a press, and is read by the security reviewer before it lands. Say in your report
   exactly which hosts are contacted and what is executed.
7. **A prompt lane measures before and after** with the answer test on this PC's AI (three real tries a question, a
   seed per try), reports the system prompt's length before and after, and leaves the Default spoiler paragraph byte
   for byte as it is.
8. **Two test machines, neither of them yours.** No `deck_*` tool, no SSH, no deploy, and nothing that touches
   `C:\Users\still\homebrew\plugins` (the stand-in's plugin folder). Lane T2 writes scripts that will run against the
   machines; it never runs them there. The drivers do.
9. **Never touch** `docs/roadmap.md`, `docs/roadmap-kb.md`, `docs/roadmap-shelved.md`, their details files,
   `docs/testing.md`, `docs/testing-manual.md`, `CHANGELOG.md`, `AGENTS.md`, `CLAUDE.md`, plan 105 or its asset
   files. (The bookkeeper is the exception: those files are its job, lane E4 included.)
10. **Plain words in everything a person reads:** button labels, messages, help text, commit messages, your report.
    A new message on screen says what happened and what to do next, in that order.

## Added 2026-11-16 (the maintainer's calls 29 to 31)

- At most fifteen helpers run at once, the two drivers and a second-opinion consult counted in.
- The second opinion is Fable at medium first; Fable at max only on the four grounds in the plan's § 7. Neither is
  yours to start: if you are stuck, say so in your report and the session asks.
- A finding by the security reviewer or the open-source reviewer in the whole-session pass (plan § 5r) is not yours
  to fix unless the session hands it to you after the maintainer has answered.
