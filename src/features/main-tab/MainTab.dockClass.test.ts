/**
 * The dock under the chat is marked while an answer's text is arriving, and only then: the mark
 * holds the question box's glow steady (section-6.ts), which on the Deck bought back about 5 frames
 * a second while an answer streamed in. The thinking before the text keeps the breathing.
 */
import { describe, expect, it } from "vitest";

import { mainTabDockClassName } from "./MainTab";

describe("mainTabDockClassName", () => {
  it("is the plain dock when nothing is streaming", () => {
    expect(mainTabDockClassName(false, "An old answer")).toBe("bonsai-main-tab-dock");
    expect(mainTabDockClassName(undefined, undefined)).toBe("bonsai-main-tab-dock");
  });

  it("stays plain while the model is only thinking and no answer text has arrived", () => {
    expect(mainTabDockClassName(true, "")).toBe("bonsai-main-tab-dock");
    expect(mainTabDockClassName(true, "  \n")).toBe("bonsai-main-tab-dock");
  });

  it("is marked once the answer's text is arriving", () => {
    expect(mainTabDockClassName(true, "Flank it")).toBe("bonsai-main-tab-dock bonsai-main-tab-dock--answer-arriving");
  });
});
