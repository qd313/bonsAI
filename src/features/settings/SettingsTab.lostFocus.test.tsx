/**
 * Title: Down from a Settings section line while the panel's page has lost the browser's focus (plan 97, L14)
 * Purpose: Pin row P97-L14-SECTIONS at the level the Deck check looks at: after plan 94's Settings trigger (a Steam
 *          list opened and closed, then Settings, the Data line, Down) the ring must move, and the page's focus and
 *          the ring must agree. The real Settings tab is drawn inside a page whose focus a test can take away
 *          (lostFocusPanel.tsx), every section open, and Down is pressed the way Steam calls it.
 * Used for: useSettingsTabFocus.ts (the entry into an open section, a plain focus()), FoldedSection.tsx (the line's
 *           Down and Up, which now decline when that entry could not move the ring), lostFocusHop.ts.
 * Solves: A plain focus() on a page without focus moves the page's focus and leaves Steam's ring on the line. The
 *         line used to report the press handled anyway. Now the entry reports it, the line declines, and Steam's
 *         own step down the column (whose next child is the section's first control) carries the ring and the
 *         page's focus together.
 * Does not: Model the pane's scroll: the walk of every section with Steam's scroll is SettingsTab.foldedWalk.test.tsx,
 *           and nothing here changes a route while the page has its focus.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

import { mountPanelPage, type MoveKey, type PanelPage } from "../../test-harness/lostFocusPanel";
import { resetNavFocusRegistry } from "../../shared/dpad/navFocusRegistry";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { withPanelNav } = await import("../../test-harness/lostFocusPanel");
  const Focusable = withPanelNav(stubs.Focusable);
  /* Steam's switch row: a stop of its own (Decky stamps tabindex on it), keeping the move handlers it is given. */
  const ToggleField = (p: Record<string, unknown>) => {
    const { label, checked: _c, onChange: _o, description: _d, disabled: _x, ...rest } = p;
    return <Focusable {...rest} focusable tabIndex={0} aria-label={stubs.wordsOf(label)} data-decky-ui="ToggleField" />;
  };
  return { ...stubs, Focusable, ToggleField, Button: withPanelNav(stubs.Button) };
});

import { SettingsTab } from "./SettingsTab";
import { settingsProps } from "../../test-harness/ringTestProps";
import { openAllSettingsSections } from "../../test-harness/settingsFoldOpen";

let page: PanelPage;

const STOPS = "[tabindex], button, input";

/** Every stop of the tab, top to bottom: the innermost matches, as Steam walks the column. */
function stops(): HTMLElement[] {
  const all = Array.from(page.host.querySelectorAll<HTMLElement>(STOPS));
  return all.filter((el) => !el.querySelector(STOPS));
}
/** Steam's own step down or up the column: the next stop that way. */
function steamColumnStep(key: MoveKey) {
  return (from: HTMLElement): HTMLElement | null => {
    const list = stops();
    const at = list.indexOf(from);
    if (at < 0) return null;
    return (key === "onMoveDown" ? list[at + 1] : list[at - 1]) ?? null;
  };
}
function nameOf(el: HTMLElement | null): string {
  if (!el) return "nothing";
  return (el.getAttribute("aria-label") ?? el.textContent ?? el.tagName).slice(0, 40);
}
function line(id: string): HTMLElement {
  return page.host.querySelector<HTMLElement>(`[data-bonsai-fold-line="${id}"]`)!;
}
/** The first control inside section `id`'s open body. */
function firstControlOf(id: string): HTMLElement {
  const body = line(id).closest(".bonsai-fold-section")!.querySelector<HTMLElement>(".bonsai-fold-body")!;
  const inside = Array.from(body.querySelectorAll<HTMLElement>(STOPS)).filter((el) => !el.querySelector(STOPS));
  expect(inside.length, `section ${id} has no control`).toBeGreaterThan(0);
  return inside[0]!;
}
function mount() {
  openAllSettingsSections();
  render(<SettingsTab {...settingsProps()} showDeveloperTab aiCharacterEnabled microphoneAccessEnabled />, {
    container: page.host,
  });
  /* Decky stamps tabindex on the nodes Steam navigates; the stub does not. */
  page.host.querySelectorAll<HTMLElement>(".bonsai-fold-line").forEach((el) => el.setAttribute("tabindex", "0"));
}
function press(key: MoveKey): "claimed" | "declined" {
  let out: "claimed" | "declined" = "declined";
  act(() => {
    out = page.press(key, steamColumnStep(key));
  });
  return out;
}

beforeEach(() => {
  resetNavFocusRegistry();
  page = mountPanelPage();
});
afterEach(() => {
  cleanup();
  page.remove();
  document.body.innerHTML = "";
});

describe("P97-L14-SECTIONS: Down from the Data line moves the ring with the page's focus gone", () => {
  it("lands on the section's first control three times out of three, the ring and the page's focus together", () => {
    mount();
    const target = firstControlOf("data");
    for (let round = 1; round <= 3; round++) {
      act(() => page.steamMove(line("data")));
      page.setFocused(false);

      press("onMoveDown");

      expect(page.ring(), `round ${round}: the ring did not move`).toBe(target);
      expect(page.active(), `round ${round}: the page's focus left the ring`).toBe(page.ring());
    }
  });

  it("Up from the Data line into the open section above lands on that section's last control, together", () => {
    mount();
    const lines = Array.from(page.host.querySelectorAll<HTMLElement>(".bonsai-fold-line"));
    const above = lines[lines.indexOf(line("data")) - 1]!;
    const body = above.closest(".bonsai-fold-section")!.querySelector<HTMLElement>(".bonsai-fold-body")!;
    const inside = Array.from(body.querySelectorAll<HTMLElement>(STOPS)).filter((el) => !el.querySelector(STOPS));
    const lastAbove = inside[inside.length - 1]!;
    act(() => page.steamMove(line("data")));
    page.setFocused(false);

    press("onMoveUp");

    expect(page.ring()).toBe(lastAbove);
    expect(page.active()).toBe(page.ring());
  });
});

describe("a bounded walk Down the whole open tab with the page's focus gone", () => {
  it("visits no stop twice, and after every press the ring and the page's focus agree", () => {
    mount();
    act(() => page.steamMove(line("screenshot")));
    page.setFocused(false);
    const seen: HTMLElement[] = [page.ring()!];
    const names: string[] = [nameOf(page.ring())];
    for (let i = 0; i < 200; i++) {
      const before = page.ring();
      press("onMoveDown");
      expect(page.active() === page.ring(), `press ${i + 1} from ${nameOf(before)}: ring ${nameOf(page.ring())}, page ${nameOf(page.active())}`).toBe(true);
      if (page.ring() === before) break;
      expect(seen.includes(page.ring()!), `${nameOf(page.ring())} visited twice: ${names.join(" -> ")}`).toBe(false);
      seen.push(page.ring()!);
      names.push(nameOf(page.ring()));
    }
    /* It reaches the tab's end, the floating Open all button, and takes in every section line on the way. */
    expect(names[names.length - 1]).toBe("Close all sections");
    const lines = names.filter((n) => n.includes(" section:") || n.endsWith(" section"));
    expect(lines.length, names.join(" -> ")).toBe(page.host.querySelectorAll(".bonsai-fold-line").length);
  });
});

describe("with the page's focus present, the section line's Down is unchanged", () => {
  it("is the plugin's own hop onto the first control, claimed", () => {
    mount();
    act(() => page.steamMove(line("data")));

    expect(press("onMoveDown")).toBe("claimed");
    expect(page.ring()).toBe(firstControlOf("data"));
    expect(page.active()).toBe(page.ring());
  });
});
