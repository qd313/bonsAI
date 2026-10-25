/**
 * Title: The notes block tags a note the person marked as wrong (plan 98)
 * Purpose: Pin frame 4 of the drawing the maintainer picked (option C): in the open "From the notes" block, a
 *          note whose `demoted` flag the back end set carries "↓ ranked lower by you" after its name, in the
 *          drawing's gold; the other notes are drawn as before, and the closed block shows no tag. A note marked
 *          on this very answer (`markedNow`, from the thumbs-down rows) carries the tag at once, and loses it on
 *          Undo, because the saved flag was fixed when the answer was built (plan 100, lane U).
 * Used for: buildKbNotesBlockElement.tsx.
 * Does not: Check the back end sets the flag (lane C's tests), or walk the D-pad (the tag is words, not a stop).
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { buildKbNotesBlockElement } from "./buildKbNotesBlockElement";
import type { KbAttachedNote } from "../../types/inputTransparency";

type Note = KbAttachedNote & { section_id?: number; demoted?: boolean };

const note = (name: string, demoted?: boolean, sectionId = 41, kind = "boss"): Note => ({
  name,
  kind,
  card: "Summary: a boss.",
  trust_tier: "seed",
  source_host: "",
  source_license: "",
  domain: "strategy",
  game_title: "Deep Rock Galactic: Survivor",
  section_id: sectionId,
  ...(demoted === undefined ? {} : { demoted }),
});

function draw(notes: Note[], open: boolean, markedNow?: readonly KbAttachedNote[]) {
  const el = buildKbNotesBlockElement({
    turnKey: "turn-1",
    notes,
    open,
    onToggle: () => {},
    onMoveUp: () => false,
    onMoveDown: () => false,
    headerRef: () => {},
    markedNow,
  });
  return render(el!).container;
}

const tags = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>(".bonsai-kb-note-demoted-tag")];

describe("the ranked-lower tag in the notes block", () => {
  it("tags only the marked note, after its own name, in the open block", () => {
    const c = draw([note("Glyphid Dreadnought"), note("Lootbug", true)], true);
    expect(tags(c)).toHaveLength(1);
    expect(tags(c)[0]!.textContent).toBe("↓ ranked lower by you");
    expect(tags(c)[0]!.parentElement!.textContent).toContain("Lootbug");
    expect(tags(c)[0]!.parentElement!.textContent).not.toContain("Glyphid Dreadnought");
  });

  it("a one-note block carries the tag on the header's name once open", () => {
    const c = draw([note("Glyphid Dreadnought", true)], true);
    expect(tags(c)).toHaveLength(1);
    expect(tags(c)[0]!.parentElement!.textContent).toContain("Glyphid Dreadnought");
  });

  it("is drawn in the drawing's gold: 10 px words on a faint gold chip", () => {
    const tag = tags(draw([note("Lootbug", true)], true))[0]!;
    expect(tag.style.color).toBe("rgb(224, 182, 114)");
    expect(tag.style.background).toBe("rgba(224, 182, 114, 0.12)");
    expect(tag.style.border).toBe("1px solid rgba(224, 182, 114, 0.35)");
    expect(tag.style.borderRadius).toBe("5px");
    expect(tag.style.padding).toBe("1px 6px");
    expect(tag.style.marginLeft).toBe("6px");
    expect(tag.style.fontSize).toContain("10px");
  });

  it("no tag on a closed block, on a note not marked, or on an older saved chat with no flag", () => {
    expect(tags(draw([note("Lootbug", true)], false))).toHaveLength(0);
    expect(tags(draw([note("Lootbug", false), note("Glyphid Dreadnought")], true))).toHaveLength(0);
  });
});

describe("the tag follows a mark made on this answer (plan 100)", () => {
  it("a note with no saved flag, marked here, carries the tag; its neighbour does not", () => {
    const c = draw([note("Glyphid Dreadnought", undefined, 41), note("Lootbug", undefined, 42)], true, [
      note("Lootbug", undefined, 42),
    ]);
    expect(tags(c)).toHaveLength(1);
    expect(tags(c)[0]!.parentElement!.textContent).toContain("Lootbug");
  });

  it("matches by kind and number, never by the note object: a fresh copy still matches", () => {
    const c = draw([note("Glyphid Dreadnought", undefined, 41)], true, [{ ...note("Glyphid Dreadnought", undefined, 41) }]);
    expect(tags(c)).toHaveLength(1);
  });

  it("a tip and a note sharing a number stay apart", () => {
    const c = draw([note("Glyphid Dreadnought", undefined, 41)], true, [note("A tip", undefined, 41, "tip")]);
    expect(tags(c)).toHaveLength(0);
  });

  it("a saved flag keeps the tag with nothing marked here (an earlier mark is still in the library)", () => {
    expect(tags(draw([note("Lootbug", true)], true, []))).toHaveLength(1);
  });

  it("neither a saved flag nor a mark here: no tag", () => {
    expect(tags(draw([note("Lootbug")], true, []))).toHaveLength(0);
  });
});
