/**
 * Title: Wrapped Settings controls show one white ring
 *
 * Purpose: Pin roadmap "Some controls get only a thin grey frame" (Deck 2026-10-02,
 *          plan79-P79-RING-WALK-TABS.json). On the Settings tab the Accent intensity button and
 *          Reinstall voice engine showed a thin grey frame, and the two voice model rows a grey
 *          frame round the whole row. Each is a Button inside a Focusable wrapper; the plugin's
 *          ring rule only covered a bare Button, so the ring never drew where Steam put its focus
 *          mark (on the wrapper, or on the button inside it, clipped).
 * Used for: Accent intensity, Reinstall voice engine, tiny.en and base.en rows.
 * How it works: the real tab with the plugin's real stylesheet inside `.bonsai-scope`. Steam's
 *          `gpfocus` class is put on ONE element at a time, first on the wrapper, then on the button
 *          inside it (the device does one or the other), and the computed outline is read back. Both
 *          must show exactly one solid white ring, never none and never two.
 * Does not: See pixels (jsdom has no paint engine) or know which element Steam really marks; that
 *           is why both are tried. Whether the ring is clipped on screen is a Deck check.
 */
import { render } from "@testing-library/react";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { SettingsTab } from "./SettingsTab";
import { outlines, settingsProps } from "./ringTestProps";
import { buildBonsaiScopeStylesheet } from "../styles/bonsaiScopeStylesheet";
import { openAllSettingsSections } from "../test-harness/settingsFoldOpen";

/* The Settings tab folds (plan 91 § 2b; plan 92 lane T1): these checks are about the rows, so every section is open. */
beforeEach(() => {
  openAllSettingsSections();
});

const SOLID_WHITE = /solid/;

describe("wrapped controls show one white ring", () => {
  let sheet: HTMLStyleElement;
  beforeAll(() => {
    sheet = document.createElement("style");
    sheet.textContent = buildBonsaiScopeStylesheet();
    document.head.appendChild(sheet);
  });
  afterAll(() => sheet.remove());

  function settingsControls(): [string, HTMLElement][] {
    const { container } = render(
      <div className="bonsai-scope">
        <SettingsTab {...settingsProps()} />
      </div>,
    );
    const accent = container.querySelector("button.bonsai-accent-intensity-trigger") as HTMLElement;
    const buttons = Array.from(container.querySelectorAll("button")) as HTMLElement[];
    const byText = (re: RegExp) => buttons.find((b) => re.test(b.textContent ?? "")) as HTMLElement;
    const reinstall = byText(/^(Re)?install voice engine$/i);
    const tiny = byText(/^tiny\.en/);
    const base = byText(/^base\.en/);
    return [
      ["Accent intensity", accent],
      ["Reinstall voice engine", reinstall],
      ["tiny.en row", tiny],
      ["base.en row", base],
    ];
  }

  it("Steam's focus mark on the wrapper draws one solid ring, on the wrapper", () => {
    for (const [name, button] of settingsControls()) {
      const wrapper = button.parentElement as HTMLElement;
      expect(wrapper?.getAttribute("data-decky-ui"), name).toBe("Focusable");
      const [w, b] = outlines([wrapper, button], wrapper);
      expect(w, `${name}: wrapper ring`).toMatch(SOLID_WHITE);
      expect(b, `${name}: button not ringed too`).not.toMatch(SOLID_WHITE);
    }
  });

  it("Steam's focus mark on the button inside draws one solid ring, on the button", () => {
    for (const [name, button] of settingsControls()) {
      const wrapper = button.parentElement as HTMLElement;
      const [w, b] = outlines([wrapper, button], button);
      expect(b, `${name}: button ring`).toMatch(SOLID_WHITE);
      expect(w, `${name}: wrapper not ringed too`).not.toMatch(SOLID_WHITE);
    }
  });

  it("no ring while none of them is focused", () => {
    for (const [name, button] of settingsControls()) {
      const wrapper = button.parentElement as HTMLElement;
      expect(outlines([wrapper, button], null), name).toEqual(["", ""]);
    }
  });

  it("a knowledge-base style host > Focusable > Button keeps no outline on its wrapper", () => {
    const { container } = render(
      <div className="bonsai-scope">
        <div className="bonsai-settings-focus-btn-host">
          <div className="Panel Focusable" data-decky-ui="Focusable">
            <button className="bonsai-settings-focus-btn">Update</button>
          </div>
        </div>
      </div>,
    );
    const wrapper = container.querySelector(".Panel.Focusable") as HTMLElement;
    const button = container.querySelector("button") as HTMLElement;
    const [w, b] = outlines([wrapper, button], wrapper);
    expect(w, "wrapper: no frame of its own").toBe("none");
    expect(outlines([wrapper, button], button)[1], "button keeps the white ring").toMatch(SOLID_WHITE);
    expect(b).toBe("");
  });
});
