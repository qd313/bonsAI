/**
 * Title: Stand-ins and fixtures for the Search tab's tests
 *
 * Purpose: What the tab's tests share: Steam's `Focusable` with the ring modelled (test-harness/steamRing.tsx),
 * a Steam `TextField` stand-in that is a real input with the same ring and nav node, a Hollow Knight chat
 * fixture of real-looking questions, a notes fixture and a game notes fixture, and a few helpers to press the
 * D-pad on the stop that has the ring the way Steam calls the handlers.
 *
 * Used for: SearchTab.test.tsx, SearchTab.walk.test.tsx and the tests beside them.
 *
 * Solves: Keeps one copy of the stand-ins and the fixtures, so the behaviour test and the walk test read the
 * same tab.
 *
 * Does not: Run any test, or touch the real back end.
 */
import React from "react";

import * as fakeStubs from "../../test-harness/fakeDeckyUi";
import { SteamRingFocusable, putSteamRingOn, steamRingHolder, type SteamEl } from "../../test-harness/steamRing";
import type { GameNote, SearchChat, UserNote } from "./searchTypes";

const KEPT = ["onMoveUp", "onMoveDown", "onMoveLeft", "onMoveRight", "onOKButton", "onCancelButton", "onButtonDown"];

/** A Steam text field as a real input: Steam's ring on it, its nav node, and its move handlers kept on the element. */
export const SteamRingTextField = React.forwardRef<HTMLInputElement, Record<string, unknown>>(function SteamRingTextField(props, ref) {
  const { navRef, onChange, value, placeholder, label: _label, spellCheck, focusable: _f, noFocusRing: _n, ...rest } = props as Record<string, unknown> & {
    navRef?: { current: unknown };
  };
  const nav: Record<string, unknown> = {};
  for (const k of KEPT) nav[k] = rest[k];
  const dom: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) if (!/^on(Move|OK|Cancel|Button|Activate)/.test(k)) dom[k] = v;
  return (
    <input
      {...dom}
      data-decky-ui="TextField"
      data-steam-stop="true"
      tabIndex={0}
      value={value as string}
      placeholder={placeholder as string}
      spellCheck={spellCheck as boolean}
      onChange={onChange as React.ChangeEventHandler<HTMLInputElement>}
      ref={(el) => {
        if (el) {
          (el as unknown as SteamEl).__nav = nav as SteamEl["__nav"];
          if (navRef) navRef.current = { TakeFocus: () => (putSteamRingOn(el), true) };
        }
        if (typeof ref === "function") ref(el);
        else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
      }}
    />
  );
});

/** What `vi.mock("@decky/ui", ...)` returns in the Search tab's tests. */
export function deckyUiForSearch(): Record<string, unknown> {
  return { ...fakeStubs, Focusable: SteamRingFocusable, TextField: SteamRingTextField };
}

const q = (turn_id: string, text: string, created_at: number, game_title: string, app_id = ""): SearchChat["questions"][number] => ({
  turn_id,
  text,
  created_at,
  app_id,
  game_title,
});

/** Two chats: a long Hollow Knight one and a short Hades one, with a stuttering question that names no game. */
export const CHATS: SearchChat[] = [
  {
    slot_id: "hk",
    label: "Hollow Knight help",
    updated_at: 1_800_000_900,
    questions: [
      q("hk1", "What does the Dream Nail do?", 1_799_900_000, "Hollow Knight", "367520"),
      q("hk2", "Where do I find the Mantis Claw?", 1_799_910_000, "Hollow Knight", "367520"),
      q("hk3", "How do I beat the False Knight, quick tips please", 1_799_920_000, "Hollow Knight", "367520"),
      q("hk4", "Which charms are best early on?", 1_799_930_000, "Hollow Knight", "367520"),
      q("hk5", "Is Greenpath safe before I have the Mantis Claw?", 1_799_940_000, "Hollow Knight", "367520"),
      q("hk6", "How do I beat the Mantis Lords?", 1_799_950_000, "Hollow Knight", "367520"),
      q("hk7", "Which charm should I use for the Mantis Lords?", 1_799_960_000, "Hollow Knight", "367520"),
      q("hk8", "Does the Soul Master drop a charm?", 1_799_970_000, "Hollow Knight", "367520"),
      q("hk9", "Why does the game stutter in Greenpath?", 1_799_980_000, "Hollow Knight", "367520"),
    ],
  },
  {
    slot_id: "hd",
    label: "Hades run",
    updated_at: 1_800_000_100,
    questions: [
      q("hd1", "Is the mantis build any good?", 1_799_800_000, "Hades", "1145360"),
      q("hd2", "Which boon is best for the dash?", 1_799_810_000, "Hades", "1145360"),
      q("hd3", "Can I save battery with a frame limit?", 1_799_820_000, "Hades", "1145360"),
    ],
  },
];

const note = (id: string, text: string, game_title: string, on: boolean): UserNote => ({
  id,
  text,
  app_id: "",
  game_title,
  on,
  created_at: "2026-10-12T03:15:00Z",
  source_turn_id: "",
});

/** Newest first, as the back end lists them: two for Hollow Knight (one off), one for Hades, one for every game. */
export const NOTES: UserNote[] = [
  note("n-4", "I'm on a Steel Soul run (one life).", "Hollow Knight", true),
  note("n-3", "No spoilers past the City of Tears, unless the mantis.", "Hollow Knight", false),
  note("n-2", "Skip the story bits; I've seen them.", "Hades", true),
  note("n-1", "I play with the back buttons mapped to dash.", "", true),
];

/** A boss note whose name holds "mantis", and one that only mentions mantises. */
export const GAME_NOTES: GameNote[] = [
  { name: "Mantis Lords", kind: "boss", game_title: "Hollow Knight", snippet: "Three lords, two at once.", text: "The Mantis Lords fight in two waves.", name_matches: true },
  { name: "Sanctum Warden", kind: "boss", game_title: "Hollow Knight", snippet: "The mantis wait here too.", text: "Spoiler text of the Warden.", name_matches: false },
];

/** The stop the ring is on, or null. */
export function ringStop(): SteamEl | null {
  return steamRingHolder() as SteamEl | null;
}

/** The ring's stop, found by its aria-label. */
export function ringLabel(): string {
  return ringStop()?.getAttribute("aria-label") ?? "";
}

/** A Steam move press on the stop that has the ring (`__nav.onMoveDown` and so on), as Steam calls it. The ring is read from where the page's focus is, since a sibling hop moves it with a plain focus. */
export function pressOn(el: SteamEl, key: "onMoveUp" | "onMoveDown" | "onMoveLeft" | "onMoveRight" | "onOKButton" | "onCancelButton"): boolean | undefined {
  const handler = el.__nav?.[key];
  return handler ? (handler() as boolean | undefined) : undefined;
}
