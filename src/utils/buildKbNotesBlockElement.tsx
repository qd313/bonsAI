/**
 * Title: The "From the notes" block
 *
 * Purpose: Builds the row that sits under a reply which used a note from the knowledge base or a
 * shared troubleshooting tip (plan 58 phase 1) — closed by default, naming the note and where it
 * came from, and opening to the note's own words.
 *
 * Used for: MainTabChatTranscript, once per turn that has at least one attached note.
 *
 * Solves: Keeps the block's own small per-turn focus registry, its header-phrase wording, and its
 * spoiler gate together in one place, so the transcript file only has to call it and pass the
 * notes for one turn.
 *
 * Does not: Decide whether a note was attached in the first place — that is the backend's job
 * (game_ai_request.py's `_publish_kb_attached_notes_live` for the live case, `get_input_transparency`
 * once a reply finishes). Does not track the single reasoning-fold-style toggle state itself —
 * MainTabChatTranscript keeps `kbNotesOpenByTurn` and passes this file's `open`/`onToggle`.
 */
import React from "react";
import { Focusable } from "@decky/ui";
import { elementHasGamepadFocus } from "./uiDocument";
import { focusPerTurnRow } from "./focusPerTurnRow";
import { isDeckDirectionDownEvent, isDeckDirectionUpEvent } from "./focusNavigation";
import { focusUpFromBelowContextChipLadder, queryLiveTurnSlot } from "./liveTurnFocusGraph";
import type { ChatSlotTurnTransparency, KbAttachedNote, TransparencySnapshot } from "./inputTransparency";
import { anySpoilerFenceOpen } from "../components/MainTabBonsaiAiMarkdownChunk";
import { kbNotesUsedByAnswer } from "./kbNoteUsedByAnswer";
import { BONSAI_CHAT_AI_MAX_WIDTH_CSS } from "../features/unified-input/constants";
import { CREDITS_SHOWN, type CreditsView } from "./contextChipsFromSnapshot";

/**
 * Everyday name for a host the library has already cleared a note from — the header's job is to
 * turn the trust tier into words a reader does not have to decode. An unlisted host still reads
 * as a source, just spelled out plainly, and this map growing is expected as the library covers
 * more wikis (phase 1's own ten-game reopen adds several of these).
 */
const KB_NOTE_WIKI_HOST_NAMES: Record<string, string> = {
  "hollowknight.wiki": "the Hollow Knight wiki",
  "www.mariowiki.com": "the Super Mario Wiki",
  "www.ssbwiki.com": "SmashWiki",
  "gta.fandom.com": "the GTA wiki",
  "fallout.fandom.com": "the Fallout wiki",
  "left4dead.fandom.com": "the Left 4 Dead wiki",
  "cyberpunk.fandom.com": "the Cyberpunk wiki",
  "combineoverwiki.net": "the Half-Life wiki",
  "doomwiki.org": "the Doom wiki",
  "theportalwiki.com": "the Portal wiki",
  "www.pikminwiki.com": "the Pikmin wiki",
  "strategywiki.org": "StrategyWiki",
};

/**
 * The header's source phrase — the trust tier turned into words, per Lane A's brief.
 *
 * Kept short on purpose (plan 58 phase 1, first Deck rows): "bonsAI's own note" rather than
 * "bonsAI's own notes, no source" — at 412 px the drawn header is only wide enough for the
 * source phrase to lose its own tail to an ellipsis, not the note's name or the "(+N more)"
 * count next to it (see buildKbNotesBlockElement's own layout comment for how that is kept
 * true structurally, not just by shortening this one phrase).
 */
function kbNoteSourcePhrase(note: KbAttachedNote): string {
  // A tip carries a game title only when it is that one game's own tip (the back end's
  // `_label_own_game_tips`); plan 70 found those labelled shared.
  if (note.domain === "compat") return note.game_title ? "From this game's Deck tips" : "From the shared Deck tips";
  if (!note.source_host) return "From bonsAI's own note";
  const known = KB_NOTE_WIKI_HOST_NAMES[note.source_host];
  return known ? `From ${known}` : `From ${note.source_host}`;
}

/**
 * Display name for a note's header. Capitalized: a shared tip's own "name" is a raw lowercase
 * topic word ("proton") because compat_patterns.json rows carry no title at all, while every
 * other note's name is already a proper title from the seed data. Capitalizing the first letter
 * is display-only and never changes what the note itself says.
 *
 * Considered and rejected: replacing a tip's name with a flat "Deck tip" label. The header's own
 * source phrase already reads "From the shared Deck tips" right next to it, so a "Deck tip" name
 * would just repeat that word twice in one line; the topic word at least tells two different
 * tips apart at a glance when more than one is attached.
 */
function kbNoteDisplayName(note: KbAttachedNote, open = false): string {
  if (note.spoiler_protected && !open) return kbNoteNeutralTitle(note);
  const raw = note.name.trim();
  if (!raw) return "Note";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * What the header says in place of a protected note's name (D112 #7, plan 70): the kind of
 * note, never its name. The answer used the note without naming the boss, so it has no spoiler
 * cover this block could hide behind -- the block's own header was the one place the name still
 * showed in plain text. Opening the block is the person's own choice to read it, like tapping a
 * cover, so the open block shows the note as usual.
 */
function kbNoteNeutralTitle(note: KbAttachedNote): string {
  const kind = note.kind.trim().toLowerCase();
  const word = kind === "enemy" ? "Enemy" : kind === "boss" ? "Boss" : "Story";
  return `${word} note (spoiler)`;
}

/**
 * The label read out to a screen reader — name, then the count, then the source, in that exact
 * order, matching the drawn header (see buildKbNotesBlockElement). Nothing here is ever cut; the
 * ellipsis on the drawn source phrase is a visual-only affordance.
 */
function kbNotesHeaderLabel(notes: KbAttachedNote[], open: boolean): string {
  const first = notes[0];
  const extra = notes.length - 1;
  const countText = extra > 0 ? ` (+${extra} more)` : "";
  return `${kbNoteDisplayName(first, open)}${countText} · ${kbNoteSourcePhrase(first)}`;
}

export function kbAttachedNotesFrom(
  transparency: TransparencySnapshot | ChatSlotTurnTransparency | null | undefined
): KbAttachedNote[] {
  return transparency?.kb_attached_notes ?? [];
}

/** A "Label: value" line (Summary / Weak points / Tips, or any wiki table row turned into one
 *  line) keeps its label bolded and its own line — the labelled-lines drawing in the mockup. */
const KB_NOTE_LABEL_LINE_RE = /^([A-Za-z][A-Za-z ]{0,30}):\s(.+)$/;

function renderKbNoteCardLine(line: string, key: React.Key): React.ReactElement {
  const m = KB_NOTE_LABEL_LINE_RE.exec(line);
  if (!m) return <div key={key}>{line}</div>;
  return (
    <div key={key}>
      <b style={{ color: "#dcc493", fontWeight: 700 }}>{m[1]}:</b>
      {m[2] ? ` ${m[2]}` : ""}
    </div>
  );
}

const BONSAI_SPOILER_FENCE_MARKER = "```bonsai-spoiler";

/**
 * Whether this reply's own spoiler cover has to be closed before the block could safely show
 * anything — a note's own words can be exactly the spoiler-relevant fact the fence exists to
 * hide (Broken Vessel's card names the boss outright). Blocked only while the reply actually has
 * a `bonsai-spoiler` fence (masking on) AND that fence is not currently open — once the person
 * reveals it, the block appears the same as any other reply's, in the block's own usual place
 * under the reply, alongside Show details, rather than literally inside the fence's own drawn
 * box: MainTabBonsaiAiMarkdownChunk.tsx's own spoiler cover is built and owned by a different
 * file (buildAnswerBubbleElement.tsx) outside this change's file list, which nesting the block
 * inside it would have required editing. `anySpoilerFenceOpen()` is a real, live answer, not a
 * static guess from the text — see that function's own comment in
 * MainTabBonsaiAiMarkdownChunk.tsx for why it is safe as a single flag rather than one tracked
 * per turn.
 */
function kbNotesBlockedBySpoiler(
  answerText: string | null | undefined,
  maskingEnabled: boolean | undefined
): boolean {
  if (maskingEnabled === false) return false;
  const isFenced = Boolean(answerText && answerText.includes(BONSAI_SPOILER_FENCE_MARKER));
  if (!isFenced) return false;
  return !anySpoilerFenceOpen();
}

/**
 * The notes the block shows for one turn: none while a closed spoiler cover still hides the
 * answer (above), otherwise only the notes the answer actually used, judged on as much of it as
 * has arrived -- so on a live answer the block appears once the answer says something from a note
 * (kbNoteUsedByAnswer.ts; the maintainer's rule, 2026-09-24). Show details still lists every note
 * that was attached.
 */
export function kbNotesToShow(
  turn: { question?: string | null; answer?: string | null },
  maskingEnabled: boolean | undefined,
  notes: KbAttachedNote[]
): KbAttachedNote[] {
  if (kbNotesBlockedBySpoiler(turn.answer, maskingEnabled)) return [];
  const used = kbNotesUsedByAnswer(notes, turn.answer, turn.question);
  /* Covers switched off: the person reads spoilers in plain text everywhere, names included. */
  return maskingEnabled === false ? used.map(({ spoiler_protected: _p, ...rest }) => rest) : used;
}

/**
 * How Show details' credit line treats this turn's spoiler-protected notes (CreditsView). The
 * credit line names every attached note, so without this it gave away the name the block hides.
 * - A protected note the block shows (the answer used it): the whole credit line stays hidden
 *   until the person opens the block, then shows as usual (maintainer's call, 2026-09-27).
 * - A protected note the answer never used: no block will ever show it, so "open the notes" would
 *   point at nothing -- its name in the credit line is swapped for the block's own neutral title
 *   instead, for good. Judged on the answer alone, not on the spoiler cover: a closed cover only
 *   delays the block (kbNotesBlockedBySpoiler), it does not remove it.
 * Covers switched off, or nothing protected: credits show exactly as always.
 */
export function kbCreditsView(
  turn: { question?: string | null; answer?: string | null },
  maskingEnabled: boolean | undefined,
  notes: KbAttachedNote[],
  blockOpen: boolean
): CreditsView {
  if (maskingEnabled === false) return CREDITS_SHOWN;
  const protectedNotes = notes.filter((n) => n.spoiler_protected === true);
  if (!protectedNotes.length) return CREDITS_SHOWN;
  const inBlock = new Set(kbNotesUsedByAnswer(notes, turn.answer, turn.question).map((n) => n.name));
  const hidden = !blockOpen && protectedNotes.some((n) => inBlock.has(n.name));
  const renames: Record<string, string> = {};
  for (const n of protectedNotes) if (!inBlock.has(n.name)) renames[n.name] = kbNoteNeutralTitle(n);
  return { hidden, renames };
}

/**
 * Registry for the block's own header row, one per turn key ("live" or an archived turn id) —
 * the same shape as replyStopRegistry.ts's `stops` map, kept local to this file because that
 * file's `ReplyStopId` is a closed union this lane's file list cannot extend. A plain `.focus()`
 * is the right tool here, not navFocusRegistry's `takeNavFocus`: this row is a sibling of Show
 * details and the other reply-row controls inside the same turn container, and
 * replyStopRegistry.ts's own `focusRegisteredReplyStop` already proves a bare `.focus()` carries
 * Steam's ring correctly among exactly those siblings (AGENTS.md, "The Steam Deck focus graph").
 */
const kbNotesBlockEls = new Map<string, HTMLElement>();

function registerKbNotesBlockEl(turnKey: string, el: HTMLElement | null): void {
  if (el) kbNotesBlockEls.set(turnKey, el);
  else kbNotesBlockEls.delete(turnKey);
}

export function focusKbNotesBlock(turnKey: string): boolean {
  return focusPerTurnRow(kbNotesBlockEls, turnKey);
}

/**
 * Up from any row below the live turn's own "From the notes" block (a permission-hint row, or
 * the chip ladder's own fallback) — reach the block first, when one is mounted, before falling
 * to whatever that row's own Up already reached. The mirror of the Down path already wired
 * (`onMoveDownFromUtility` on the live reply-actions row reaches these same rows past the
 * block); without this, walking Up from any of them landed past the block entirely.
 */
export function focusUpPastLiveKbNotesBlock(): boolean {
  return focusKbNotesBlock("live") || focusUpFromBelowContextChipLadder(queryLiveTurnSlot());
}

/**
 * Up from the session context strip's own header row — the collapsed "Session context (N
 * turns) ▸ / Clear" line, the control that actually sits directly under the block on a normal,
 * already-completed reply. Device rerun on 0589565 (NOTES-BLOCK-01): walking Up from this exact
 * row still skipped the block and landed on Show details, because the fix above only ever
 * checked the turn key "live" — but a completed reply is not "live" any more by the time a
 * person is sitting on this strip. The post-Ask slot reload moves `expandedTurnKey` off "live"
 * onto the freshly archived turn's own id (the block re-mounts under that id, not "live"), which
 * is the ordinary state a finished conversation sits in, not an edge case. Reads whichever turn
 * is actually expanded right now, so it finds the block wherever it is actually mounted — live,
 * the newest archived turn, or (harmlessly) an older one a person expanded by hand, where
 * `focusKbNotesBlock` simply reports nothing to find and this falls through exactly as before.
 *
 * No caller left inside MainTabChatTranscript.tsx since plan 62 3c removed the standalone strip
 * this was written for — kept, not deleted, because its own dedicated test still exercises it
 * directly and nothing about the function itself is wrong; it is exactly as reusable for a future
 * "Up past the block" caller as it always was.
 */
export function focusUpPastSessionContextStripKbNotesBlock(
  expandedTurnKey: string | null | undefined
): boolean {
  return (
    focusKbNotesBlock(expandedTurnKey ?? "live") ||
    focusUpFromBelowContextChipLadder(queryLiveTurnSlot())
  );
}

/**
 * Builds the block's own row (always mounted while there is at least one attached note) and,
 * only while open, the plain content below it. The row never remounts when toggled — only its
 * label and the optional body change — so there is nothing to hand the D-pad ring back to the
 * way BonsaiSpoilerFence has to when its own two different elements swap (MainTabBonsaiAiMarkdown
 * Chunk.tsx); the same shape the reply row's own Show-reasoning fold already uses
 * (buildReasoningFoldElement.tsx) for the same reason.
 */
export function buildKbNotesBlockElement(args: {
  turnKey: string;
  notes: KbAttachedNote[];
  open: boolean;
  onToggle: () => void;
  onMoveUp: () => boolean;
  onMoveDown: () => boolean;
  headerRef: (el: HTMLElement | null) => void;
  /**
   * B, passed only while Show details is open below the block: closes the panel (plan 74 lane 3).
   * Absent otherwise on purpose -- on the device the handler's mere presence eats B even when it
   * does nothing (MainTabChatTranscript.tsx's header, the Show reasoning row), so a block with no
   * panel open leaves B to Steam.
   */
  onCancel?: () => void;
}): React.ReactElement | null {
  const { turnKey, notes, open, onToggle, onMoveUp, onMoveDown, headerRef, onCancel } = args;
  if (!notes.length) return null;
  const headerLabel = kbNotesHeaderLabel(notes, open);
  const extra = notes.length - 1;
  return (
    <Focusable
      key={`kb-notes-block-${turnKey}`}
      className="bonsai-kb-notes-block"
      ref={(el: HTMLElement | null) => registerKbNotesBlockEl(turnKey, el)}
      onOKButton={onToggle}
      onClick={onToggle}
      aria-expanded={open}
      aria-label={open ? `${headerLabel}, hide` : `${headerLabel}, show`}
      {...({
        onMoveUp: () => onMoveUp(),
        onMoveDown: () => onMoveDown(),
        onButtonDown: (evt: unknown) => {
          const el = kbNotesBlockEls.get(turnKey);
          if (el && !elementHasGamepadFocus(el)) return false;
          if (isDeckDirectionUpEvent(evt)) return onMoveUp();
          if (isDeckDirectionDownEvent(evt)) return onMoveDown();
          return false;
        },
        ...(onCancel
          ? {
              onCancelButton: (evt: unknown) => {
                onCancel();
                (evt as { preventDefault?: () => void })?.preventDefault?.();
              },
            }
          : {}),
      } as Record<string, unknown>)}
      style={{
        marginTop: 8,
        width: "100%",
        maxWidth: BONSAI_CHAT_AI_MAX_WIDTH_CSS,
        boxSizing: "border-box",
        borderRadius: 8,
        border: "1px solid rgba(214, 174, 116, 0.4)",
        background: "rgba(214, 174, 116, 0.07)",
        cursor: "pointer",
        outline: "none",
      }}
    >
      {/*
       * Two rows, not one (plan 58 phase 1, first Deck rows: NOTES-BLOCK-01/05). The name and the
       * "(+N more)" count live in their own row, the count in its own flex-locked span so it can
       * never be the part an ellipsis eats; the source phrase gets its own row below, and it alone
       * is allowed to truncate. A single combined line could not guarantee that order at 412 px —
       * whichever text came last inside one shared ellipsis span was the text that vanished, which
       * on the Deck was sometimes the source's own tail and sometimes the count.
       */}
      <div
        ref={headerRef}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          padding: "7px 10px",
          fontSize: 11,
          lineHeight: 1.35,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "flex", minWidth: 0, alignItems: "baseline", gap: 4, flex: "1 1 auto" }}>
            <b
              style={{
                color: "#dcc493",
                fontWeight: 700,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {kbNoteDisplayName(notes[0], open)}
            </b>
            {extra > 0 ? (
              <span style={{ color: "#a8916a", flex: "0 0 auto" }}>{`(+${extra} more)`}</span>
            ) : null}
          </span>
          <span style={{ color: "#d6ae74", flex: "0 0 auto" }}>{open ? "▾" : "▸"}</span>
        </div>
        <div
          style={{
            color: "#a8916a",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {kbNoteSourcePhrase(notes[0])}
        </div>
      </div>
      {open ? (
        <div
          style={{
            padding: "0 10px 10px",
            paddingTop: 8,
            borderTop: "1px solid rgba(214, 174, 116, 0.22)",
            color: "#d8cdb4",
            fontSize: 11,
            lineHeight: 1.45,
          }}
        >
          {notes.map((note, i) => (
            <div key={`${turnKey}-kb-note-${i}`} style={{ marginBottom: i === notes.length - 1 ? 0 : 10 }}>
              {notes.length > 1 ? (
                <div style={{ fontWeight: 700, color: "#dcc493", marginBottom: 3 }}>
                  {kbNoteDisplayName(note, true)} · {kbNoteSourcePhrase(note)}
                </div>
              ) : null}
              {note.card.split("\n").map((line, li) => renderKbNoteCardLine(line, li))}
            </div>
          ))}
        </div>
      ) : null}
    </Focusable>
  );
}
