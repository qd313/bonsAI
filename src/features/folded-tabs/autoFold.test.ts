/**
 * Title: The walk's rule for which sections are open (plan 105, lane C2)
 * Purpose: Pin "Open sections as you walk" as a table, landing by landing, in the maintainer's own order: walking
 *          Down, the next section opens at the last setting of one, both stay open on its line and its first
 *          setting, and the one left closes at its second setting; walking Up is the mirror; a one-setting section
 *          has three open for one landing; a line never opens its own section, and the line of an open section opens
 *          the one above (where Up from the Open all button lands); the ring's own section never closes.
 * Used for: autoFold.ts (sectionsOpenAfterLanding).
 * Does not: Walk a real tab (the *.autoFoldWalk tests do) or measure the page.
 */
import { describe, expect, it } from "vitest";

import { sectionsOpenAfterLanding, type WalkPlace } from "./autoFold";

const ORDER = ["a", "b", "c", "d"];
const line = (section: string): WalkPlace => ({ section, line: true, first: false, last: false });
const setting = (section: string, first: boolean, last: boolean): WalkPlace => ({ section, line: false, first, last });

/** Walk a list of landings from `start`, returning the open set after each, as sorted ids. */
function walk(start: string[], landings: WalkPlace[]): string[][] {
  let open = new Set(start);
  return landings.map((place) => {
    open = sectionsOpenAfterLanding(ORDER, open, place);
    return [...open].sort();
  });
}

describe("walking Down", () => {
  it("the next section opens at the last setting; both stay open on its line and first setting; its second closes the one left", () => {
    expect(
      walk(["a"], [setting("a", true, false), setting("a", false, false), setting("a", false, true), line("b"), setting("b", true, false), setting("b", false, false)]),
    ).toEqual([["a"], ["a"], ["a", "b"], ["a", "b"], ["a", "b"], ["b"]]);
  });

  it("a one-setting section has three open for one landing, and the far one closes on the next line", () => {
    expect(walk(["a", "b"], [line("b"), setting("b", true, true), line("c"), setting("c", true, false), setting("c", false, true)])).toEqual([
      ["a", "b"],
      ["a", "b", "c"],
      ["b", "c"],
      ["b", "c"],
      ["c", "d"],
    ]);
  });

  it("the last section's last setting opens nothing past the end", () => {
    expect(walk(["d"], [setting("d", false, true)])).toEqual([["d"]]);
  });
});

describe("walking Up", () => {
  it("the section above opens at the first setting; both stay open on the line and the one above's last; its second-to-last closes the one left", () => {
    expect(
      walk(["c"], [setting("c", false, false), setting("c", true, false), line("c"), setting("b", false, true), setting("b", false, false)]),
    ).toEqual([["c"], ["b", "c"], ["b", "c"], ["b", "c"], ["b"]]);
  });

  it("the first section's first setting and line open nothing above", () => {
    expect(walk(["a"], [setting("a", true, false), line("a")])).toEqual([["a"], ["a"]]);
  });
});

describe("what the rule leaves alone", () => {
  it("a line never opens its own section: a section the person closed stays closed as the ring passes", () => {
    expect(walk([], [line("a"), line("b")])).toEqual([[], []]);
    expect(walk(["a"], [line("b")])).toEqual([["a"]]);
  });

  it("the line of an open section opens the one above, as its first setting does: Up from the Open all button lands there", () => {
    /* Down to the end left only the last section open (its second setting closed the one above). */
    expect(walk(["d"], [line("d"), setting("c", false, true), setting("c", false, false)])).toEqual([
      ["c", "d"],
      ["c", "d"],
      ["c"],
    ]);
  });

  it("every section outside the ring's reach closes, wherever it was opened (Open all, then a landing)", () => {
    expect(walk(["a", "b", "c", "d"], [setting("c", false, false)])).toEqual([["c"]]);
    expect(walk(["a", "b", "c", "d"], [line("c")])).toEqual([["b", "c"]]);
  });

  it("the ring's own section is never closed by the rule", () => {
    for (const place of [line("b"), setting("b", true, false), setting("b", false, false), setting("b", false, true), setting("b", true, true)]) {
      const after = sectionsOpenAfterLanding(ORDER, new Set(["b"]), place);
      expect(after.has("b"), JSON.stringify(place)).toBe(true);
    }
  });

  it("a section the chain does not know changes nothing", () => {
    const open = new Set(["a", "c"]);
    expect([...sectionsOpenAfterLanding(ORDER, open, line("zz"))].sort()).toEqual(["a", "c"]);
  });
});
