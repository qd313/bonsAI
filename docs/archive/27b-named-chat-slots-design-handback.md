# Handback to Claude Design — named chat slots, turn 8

Companion to [27-named-chat-slots-v2-implementation-plan.md](27-named-chat-slots-v2-implementation-plan.md).
That file is the build plan for this repo. This file is what goes **back** to the design project
so the mocks stop drifting from the code.

**How to use it:** open the *Named chat slots* design project (the one that produced
`Named chat slots.dc.html`) and paste the block below as your next message. Nothing needs to be
attached — the project already holds the document, `support.js`, `github.md` and the logo asset.
If it has lost them, re-upload the same bundle.

**What it asks for:** the six decisions locked as fact, six factual corrections so the doc stops
repeating things the code disagrees with, and a **turn 8** drawn at the real 300px column with
six A/B boards for the calls that can only be made by looking at them.

---

## The prompt

```
Turn 8, please. Two things first: six decisions are now locked, and six facts in the current
document are wrong against the code. Then the new turn.

## 1. Locked decisions — treat these as settled, do not re-open them

1. ANSWER-CARD SURFACE — the "flat tint" call from board 6e is REVERSED. Shipping treatment is:
   today's accent gradient with a constant 11% accent wash on top of it, i.e.
     linear-gradient(0deg, <accent>1c, <accent>1c),
     linear-gradient(180deg, <accent>1a 0%, <darkened-accent>73 100%)
   The card keeps its top-to-bottom fade and keeps an accent-tinted base. It is deeper and more
   saturated than today, not flatter. Please re-render the answerFade default across turns 1-7 to
   this, and mark board 6e's flat-tint marker as superseded with a one-line note saying why
   (see correction 1 below).

2. LAYOUT INVERSION SHIPS. The order every canonical mock draws — slot row, then transcript, then
   preset chips, then Ask bar, with the "Context: no active game detected" line last — is the
   order being built. It was decision R4/P-7 in the repo and was simply missing from the handoff's
   work-item list. The mocks were right; keep them.

3. GLASS MODALS — best effort only, and the ceiling is lower than the mocks. Every modal in the
   plugin is a Steam ConfirmModal that supplies its own panel, title bar and footer buttons, and
   the plugin's design language forbids targeting Steam's class names (they are hashed). So: our
   glass card is rendered as the modal BODY, inside Steam's dialog chrome, and Steam's own footer
   stays as the real Save/Cancel buttons. The A/B hint badges (item 10) are dropped — Steam's
   footer already draws them, and ours would be a second set saying the same thing. See board
   8d for what I need drawn here.

4. "N EARLIER" — aggregate, and it is a D-pad stop. The newest turn keeps its own row; everything
   older collapses behind one pill; A expands them back into per-turn rows and the pill
   disappears. The per-turn header rows are not deleted — they are what the pill expands into.
   Only render the pill at two or more older turns; at one, draw that turn's row instead.

5. CREATE POSITION — the literal [+] stays, everywhere, first run included. Item 7's cyan "+"
   glyph beside "New chat" is dropped. What survives of item 7: no dots at the create position.
   Please redraw 5a's create position as [+] rather than "+ New chat".

6. BUMPER PILLS AND THE DELETE x — hidden at rest, but their width is RESERVED, so the row does
   not reflow when focus arrives or leaves. This is a deliberate softening of decision D5's
   "conditional render, not CSS": the render is still conditional, only the reserved width is CSS.
   The quiet row therefore has two empty 38x26 gutters where the pills will appear. I have never
   seen that drawn — board 8a.

## 2. Corrections — the document currently states these incorrectly

1. Board 6e is misleading and it changed a decision. Its five swatches were drawn as bare tints
   with no base surface — the flat-tint swatch is literally `background: rgba(240,112,58,.1)`
   over the page, which reads as an empty outline. But the canonical turns build the card from
   `accentSurface`, which resolves flat tint to `linear-gradient(0deg,<t>1c,<t>1c), rgba(18,26,34,.72)`
   — an 11% wash over a real 72% dark base. The comparison board dropped the base, so it compared
   five things that do not match what the same doc renders. That mismatch is why the decision was
   reversed. Worth fixing in place so it does not mislead the next reader.

2. The default accent is FOREST GREEN #2e8753, not #f0703a. The doc's default is a placeholder
   that does not exist in the plugin's character-accent map at all. Every card in the mocks is
   showing a character accent as if it were the default. Please render at least the primary states
   at the true default so I can see what a fresh install looks like.

3. Mock 7a's caption says "cyan border + blinking caret". The card 7a actually draws keeps the
   accent border and adds a cyan glow — which is correct and matches the spec. The caption is
   stale; the drawing is right.

4. The column is 300px, not 450. This is measured on device — .bonsai-scope is 300 x 752 docked
   at 1080p, scrolling body 667px, and Steam caps every QAM pane at 300px regardless of shell
   width. The doc already says this in the audit file and then keeps drawing 450 x 660. Turn 7's
   own "proposed next turns" list said to re-cut at the measured column and that never happened.
   Turn 8 is that re-cut.

5. Ghost neighbours: the handoff README says max-width ~22%, but the markup the mocks actually
   render uses flex: 1 1 0 with the edge mask. The markup is what produces the drawn look; the
   22% figure is wrong. Please make the spec text agree with the drawing.

6. Mid-generation switching is NOT fully backed by shipped code, and the handoff says it is.
   What is true: the reply lands in its origin slot, and cycling away never cancels — there is a
   request_id -> slot map on the backend. What is false: the frontend has no idea which slot the
   in-flight answer belongs to. The status payload has no slot id at all, so today, cycling to
   slot B mid-stream paints slot A's tokens into B. That needs a new backend field before any of
   the turn-7 dot language means anything. Please add that as a note on turn 7 so the drawing is
   not read as "already works".

## 3. Turn 8 — the measured column, with six A/B boards

Re-cut the canonical states at 300 x 752 (scrolling body 667). Keep the tokens and the component
language exactly; only the geometry changes. At 300px, after 8px row padding, two 38px bumper
gutters and two 8px gaps, the slot row's centre block is 192px — so the focused title at 55% of
that is about 105px, roughly eight characters at 700/19px before it ellipsizes. I need to see
whether that is survivable or whether something has to give.

Then six side-by-side A/B boards, same format as the turn-6 decision board — each option drawn in
full, not described, so I can pick by looking:

8a — QUIET ROW WITH RESERVED PILL WIDTH.
  A: empty 38x26 gutters where the pills will be (locked decision 6 — nothing visible, geometry
     stable, title centred in a 192px block).
  B: pills fully removed at rest (literal D5 — title centred in a 284px block, and it visibly
     re-ellipsizes every time focus arrives). Draw both at a long slot name so the difference is
     the point.

8b — GHOSTS AT 300px.
  A: ghost neighbours kept, at whatever width survives beside a 105px title.
  B: ghosts dropped below some width, dots only.
  Draw both at 8 slots, focused, with a long name in the centre and long names either side.
  If A is unreadable at this width, say so — that is a useful answer.

8c — WASH STRENGTH ON THE ANSWER CARD. The locked treatment is the 11% wash over today's gradient,
  but 11% was chosen against a different base and never checked at this one. Draw the same card at
  three accents — forest green #2e8753 (the true default), a dark accent (#6c3483), and a bright
  one (#e8b923) — at:
  A: 11% wash (as locked)
  B: whatever you would pick instead, if 11% muddies the dark accent.
  I want to see the dark accent specifically; it is the worst case and I would rather find out
  here than on device.

8d — THE MODAL AT ACHIEVABLE FIDELITY.
  A: our glass card as the modal body, inside Steam's own dialog panel and footer buttons — the
     honest version of what constraint 3 allows.
  B: the full 340px card as currently drawn in 5d, for comparison only.
  Seeing A next to B tells me whether it is worth one device round-trip to try styling the shell,
  or whether A is fine and we stop there.

8e — "N EARLIER" PLACEMENT. Now that the transcript sits directly under the slot row rather than
  at the bottom of the panel:
  A: pill above the newest turn (as drawn in 5b/7).
  B: pill below the newest turn.
  Draw both with four turns collapsed to one row, and again in the expanded state.

8f — EMPTY SLOT AT 300px. The bonsai silhouette and the "Ask anything — this slot keeps its own
  history." line, at the real width, in the new layout order (directly under the slot row, above
  the preset chips rather than at the bottom of the panel).
  A: logo ~34px as spec'd.
  B: whatever proportion actually reads at this width.

Please also update github.md's sync log with what changed in this turn.
```
