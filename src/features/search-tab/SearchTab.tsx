/**
 * Title: The Search tab
 *
 * Purpose: The tab to the left of Main with a magnifier on it (plan 90 § 2b, drawn as option B of round 2 on
 * the mock-up board): one place to find a word across the person's chats, their own notes, the Steam
 * settings bonsAI can open and the knowledge library's game notes. From the top: a game row (All, then each
 * game the chats mention) that narrows everything to one game, a find box with eight word buttons made from
 * the person's own questions (so the D-pad can pick a word with no typing), then either the matches in four
 * groups once a word is picked, or, before that, every note the person kept with its on/off switch. A on a
 * setting opens it in Steam, as the old card on the Main tab did; A on a game note reads it in its own words;
 * A on a note flips its switch; A on a chat match does nothing yet but say the jump comes in the next step.
 *
 * Used for: useSearchTabPayload.tsx, which index.tsx mounts as the first tab.
 *
 * Solves: Puts the pieces together and owns the tab's state (the typed word, the picked game, the open game
 * note), which a small store (searchTabStore.ts) also holds so a rebuilt tab comes back as it was left.
 *
 * Does not: Find or fetch anything itself (searchModel.ts, useSearchIndex.ts, useGameNotes.ts), or move the
 * ring (useSearchNav.ts).
 */
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toaster } from "@decky/api";

import type { IntentPackSearchIndex } from "../../utils/intentPackSearch";
import { GameNoteSheet } from "./GameNoteSheet";
import { SearchFindBox } from "./SearchFindBox";
import { SearchGameRow } from "./SearchGameRow";
import { SearchNotesList } from "./SearchNotesList";
import { SearchResults, type ResultGroup } from "./SearchResults";
import {
  dayLabel,
  gameNoteLabel,
  matchNotes,
  matchQuestions,
  matchSettings,
  narrowNotes,
  narrowQuestions,
  searchGames,
  searchWords,
} from "./searchModel";
import { SEARCH_TAB_CSS } from "./searchTabStyles";
import { readSearchSaved, writeSearchSaved } from "./searchTabStore";
import type { GameNote } from "./searchTypes";
import { useGameNotes } from "./useGameNotes";
import { useSearchIndex } from "./useSearchIndex";
import { useSearchNav } from "./useSearchNav";

/** Under this many letters a typed word searches nothing (one letter would match nearly everything). */
const MIN_WORD_LETTERS = 2;

/** What the ring goes to after the next draw: the first match, the find box, a match by its key, or the open note's Close. */
type PendingRing = "first" | "box" | "sheet" | { key: string } | null;

export type SearchTabProps = {
  /** True while this is the tab showing; the lists are read when it becomes so. */
  active: boolean;
  /** True while an answer is being written; the lists are read again when it ends. */
  isAsking: boolean;
  /** The intent packs' other names for settings, as the Main tab's card used. */
  intentPackIndex: IntentPackSearchIndex;
  /** Opens a setting in Steam (the Main tab's old A on a card row). */
  onSettingClick: (settingPath: string) => void;
};

/**
 * The tab: the game row, the find box with its word buttons, then the matches or the notes list, or the open
 * game note's sheet.
 *
 * In: whether it is the tab showing, whether an answer is being written, the intent packs' index and the
 * function that opens a Steam setting.
 * Out: the tab's whole body.
 * Can go wrong: a failed read of the chats or the notes leaves the last lists in place (useSearchIndex); a
 * match that arrives late (the game notes) keeps the ring wish until it appears, and gives up on "not
 * installed" or a failed call.
 *
 * 1. Holds the typed word, the picked game and the open note (and mirrors them into searchTabStore).
 * 2. Narrows the questions and notes by the game, makes the word buttons, and finds the matches in four groups.
 * 3. Names the rows top to bottom for the stops (useSearchNav), and moves the ring after a redraw that asked for it.
 */
export const SearchTab: React.FC<SearchTabProps> = ({ active, isAsking, intentPackIndex, onSettingClick }) => {
  const saved = readSearchSaved();
  const [typed, setTypedState] = useState(saved.typed);
  const [game, setGameState] = useState<string | null>(saved.game);
  const [openNote, setOpenNoteState] = useState<GameNote | null>(saved.openNote);
  const index = useSearchIndex({ active, isAsking });
  const pending = useRef<PendingRing>(null);

  const setTyped = useCallback((next: string) => {
    writeSearchSaved({ typed: next });
    setTypedState(next);
  }, []);
  const setGame = useCallback((next: string | null) => {
    writeSearchSaved({ game: next });
    setGameState(next);
  }, []);

  const word = typed.trim();
  const searching = word.length >= MIN_WORD_LETTERS;
  const narrowedQuestions = useMemo(() => narrowQuestions(index.questions, game), [index.questions, game]);
  const games = useMemo(() => searchGames(index.questions), [index.questions]);
  const words = useMemo(() => searchWords(narrowedQuestions.map((q) => q.text)), [narrowedQuestions]);
  const gameNotes = useGameNotes(searching ? word : "", game);
  const { notes, toggleNote } = index;

  /** The matches, in the four groups' fixed order; a group with no match is left out. */
  const groups = useMemo<ResultGroup[]>(() => {
    if (!searching) return [];
    let at = 0;
    const next = (): string => `r${at++}`;
    const out: ResultGroup[] = [];
    const chats = matchQuestions(narrowedQuestions, word);
    if (chats.length > 0) {
      out.push({
        id: "chats",
        label: "Your chats",
        rows: chats.map((q) => ({
          key: `chat:${q.slotId}:${q.turnId}`,
          rowName: next(),
          title: q.text,
          lit: true,
          sub: [q.chatLabel, dayLabel(q.createdAt)].filter(Boolean).join(" · "),
          press: () => toaster.toast({ title: "Search", body: "Jumping to a chat comes in the next step", duration: 2000 }),
        })),
      });
    }
    const kept = matchNotes(narrowNotes(notes, game), word);
    if (kept.length > 0) {
      out.push({
        id: "notes",
        label: "Your notes",
        rows: kept.map((n) => ({
          key: `note:${n.id}`,
          rowName: next(),
          title: n.text,
          lit: true,
          sub: `Your note · ${n.game_title || "every game"}`,
          on: n.on,
          press: () => toggleNote(n.id),
        })),
      });
    }
    const settings = matchSettings(word, intentPackIndex);
    if (settings.length > 0) {
      out.push({
        id: "settings",
        label: "Settings",
        rows: settings.map((s) => ({
          key: `setting:${s.path}`,
          rowName: next(),
          title: s.title,
          lit: true,
          sub: s.qam ? `(${s.breadcrumb})` : s.breadcrumb,
          qam: s.qam,
          press: () => onSettingClick(s.path),
        })),
      });
    }
    if (gameNotes?.installed && gameNotes.notes.length > 0) {
      out.push({
        id: "game",
        label: "Game and help notes",
        rows: gameNotes.notes.map((n) => {
          const label = gameNoteLabel(n);
          const key = `game:${n.name}|${n.game_title}`;
          return {
            key,
            rowName: next(),
            title: label.title,
            lit: !label.hidden,
            sub: label.snippet,
            press: () => {
              writeSearchSaved({ openNote: n, returnKey: key });
              pending.current = "sheet";
              setOpenNoteState(n);
            },
          };
        }),
      });
    }
    return out;
  }, [searching, word, narrowedQuestions, notes, toggleNote, game, intentPackIndex, onSettingClick, gameNotes]);

  const shownNotes = useMemo(() => narrowNotes(notes, game), [notes, game]);
  const resultRowNames = groups.flatMap((g) => g.rows.map((r) => r.rowName));
  const rowOrder = useMemo(() => {
    if (openNote) return ["sheet-close", "sheet-text"];
    const top = ["games", "find", "w0", "w1"];
    return searching ? [...top, "clear", ...resultRowNames] : [...top, ...shownNotes.map((_, i) => `n${i}`)];
  }, [openNote, searching, resultRowNames, shownNotes]);
  /* The find box spans its row, so its x names no stop: Up from it lands on the picked game (All when none),
     Down from it on the first word (plan 92, the Deck's walk of build 649daecc). */
  const pickedGameCol = game === null ? 0 : 1 + games.findIndex((g) => g.toLowerCase() === game.toLowerCase());
  const nav = useSearchNav(rowOrder, (from, to) => (from !== "find" ? null : to === "games" ? Math.max(pickedGameCol, 0) : 0));

  /* After a draw that was asked to move the ring: the target exists now, so the transfer finds it. */
  useLayoutEffect(() => {
    const goal = pending.current;
    if (goal === null) return;
    if (typeof goal === "object") {
      const row = groups.flatMap((g) => g.rows).find((r) => r.key === goal.key);
      /* A game note's row arrives with the library's answer: keep the wish until it has. */
      if (!row && searching && gameNotes === null) return;
      pending.current = null;
      nav.focusStop(row?.rowName ?? "find", 0);
      return;
    }
    pending.current = null;
    if (goal === "sheet") nav.focusStop("sheet-close", 0);
    else if (goal === "box") nav.focusStop("find", 0);
    else if (resultRowNames.length > 0) nav.focusStop(resultRowNames[0]!, 0);
  });

  const pickWord = useCallback(
    (next: string) => {
      pending.current = "first";
      setTyped(next);
    },
    [setTyped],
  );
  const clear = useCallback(() => {
    pending.current = "box";
    setTyped("");
  }, [setTyped]);
  const closeNote = useCallback(() => {
    const back = readSearchSaved().returnKey;
    writeSearchSaved({ openNote: null, returnKey: null });
    pending.current = back ? { key: back } : "box";
    setOpenNoteState(null);
  }, []);

  return (
    <div className="bonsai-search" data-bonsai-search-tab="true">
      <style>{SEARCH_TAB_CSS}</style>
      <div className="bonsai-search__title">Search</div>
      {openNote ? (
        <GameNoteSheet nav={nav} note={openNote} onClose={closeNote} />
      ) : (
        <>
          <SearchGameRow nav={nav} games={games} game={game} onPick={setGame} />
          <SearchFindBox
            nav={nav}
            value={typed}
            onType={setTyped}
            onPickWord={pickWord}
            words={words}
          />
          {searching ? (
            <SearchResults nav={nav} word={word} groups={groups} onClear={clear} />
          ) : (
            <>
              <p className="bonsai-search__hint">
                One box for your chats, the settings bonsAI can open, your own notes and its game notes. Pick a word, or a game first.
              </p>
              <SearchNotesList nav={nav} notes={shownNotes} onCount={notes.filter((n) => n.on).length} onToggle={toggleNote} />
            </>
          )}
        </>
      )}
    </div>
  );
};
