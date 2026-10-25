/**
 * Title: The Settings tab, folded (plan 91 § 2b, § 3c; plan 92 T1)
 * Purpose: Pin the second piece of the Settings fold at the level the Deck check reads: every section is one line
 *          (its name, a summary, a chevron) and its rows are not drawn while it is closed; opened, one line per
 *          setting with its longer text on the row for the help strip, word for word; the rows that open their
 *          own popups still do; a section's first control hands Up to its line and its last control Down to the
 *          next line (the last section's, to the floating Open all button); the Text size row still carries no
 *          Left or Right handler.
 * Used for: SettingsTab.tsx and the Settings section files.
 * Does not: Walk the D-pad through the tab (SettingsTab.foldedWalk.test.tsx) or know any pixel.
 */
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  /* Steam's switch row: a stop of its own that keeps the move handlers it is given, as Decky's ToggleField does. */
  const ToggleField = (p: Record<string, unknown>) => {
    const { label, checked, onChange: _onChange, description: _d, disabled: _x, ...rest } = p;
    return <SteamRingFocusable {...rest} focusable aria-label={String(label)} data-checked={String(checked)} data-decky-ui="ToggleField" />;
  };
  return { ...stubs, Focusable: SteamRingFocusable, ToggleField };
});

import { SettingsTab, type SettingsTabProps } from "./SettingsTab";
import { settingsProps } from "../../test-harness/ringTestProps";
import { closeAllSettingsSections, openAllSettingsSections } from "../../test-harness/settingsFoldOpen";
import { toggleSection } from "../folded-tabs/foldedTabsStore";
import {
  SETTINGS_FOLD_TAB,
  SETTINGS_ROW_HELP,
  SETTINGS_SECTIONS,
  accentIntensityHelp,
  settingsSectionIds,
} from "./settingsTabFolds";
import { peekModalReturnFocus, resetModalReturnFocusRegistry } from "../../shared/dpad/modalReturnFocusRegistry";
import { resetNavFocusRegistry } from "../../shared/dpad/navFocusRegistry";
import { putSteamRingOn, steamRingHolder, type SteamEl } from "../../test-harness/steamRing";

const props = (o: Partial<SettingsTabProps> = {}): SettingsTabProps => ({ ...settingsProps(), ...o });
const lines = (c: HTMLElement) => Array.from(c.querySelectorAll<HTMLElement>(".bonsai-fold-line"));
const helpOf = (c: HTMLElement, label: string) =>
  c.querySelector<HTMLElement>(`[data-bonsai-help-label="${label}"]`)?.getAttribute("data-bonsai-help") ?? null;
const rowFor = (c: HTMLElement, label: string) => c.querySelector<HTMLElement>(`[data-bonsai-help-label="${label}"]`);

beforeEach(() => {
  resetNavFocusRegistry();
  resetModalReturnFocusRegistry();
});
afterEach(() => cleanup());

describe("the Settings tab with every section closed", () => {
  it("is one line per section, in the drawing's order, with the drawing's summaries and no row", () => {
    closeAllSettingsSections();
    const { container } = render(<SettingsTab {...props({ showDeveloperTab: true, aiCharacterEnabled: true })} />);
    expect(lines(container).map((l) => l.querySelector(".bonsai-fold-line__name")?.textContent)).toEqual(
      SETTINGS_SECTIONS.map((s) => s.title),
    );
    expect(lines(container).map((l) => l.dataset.bonsaiFoldLine)).toEqual(SETTINGS_SECTIONS.map((s) => s.id));
    expect(lines(container).every((l) => l.dataset.open === "false")).toBe(true);
    expect(container.querySelectorAll("[data-bonsai-help-label]")).toHaveLength(0);
    /* The only buttons on the tab are the floating Open all button's. */
    expect(Array.from(container.querySelectorAll("button")).map((b) => b.textContent)).toEqual(["⊞Open all"]);
  });

  it("shows each section's current values in its line", () => {
    closeAllSettingsSections();
    const { container } = render(
      <SettingsTab
        {...props({ showDeveloperTab: true, screenshotAttachmentPreset: "max", voiceSttModel: "base.en" })}
      />,
    );
    const summary = (id: string) =>
      container.querySelector(`[data-bonsai-fold-line="${id}"] .bonsai-fold-line__summary`)?.textContent;
    expect(summary("screenshot")).toBe("Best detail");
    expect(summary("voiceinput")).toBe("STT model: base.en");
    expect(summary("data")).toBe("Show Developer tab on");
  });

  it("opens a section on A and closes it again, the others untouched", () => {
    closeAllSettingsSections();
    const { container } = render(<SettingsTab {...props()} />);
    const line = container.querySelector<HTMLElement>('[data-bonsai-fold-line="textsize"]')!;
    expect(container.querySelector('[data-bonsai-chat-text-size-row="true"]')).toBeNull();
    fireEvent.click(line);
    expect(container.querySelector('[data-bonsai-chat-text-size-row="true"]')).not.toBeNull();
    expect(lines(container).filter((l) => l.dataset.open === "true").map((l) => l.dataset.bonsaiFoldLine)).toEqual(["textsize"]);
    fireEvent.click(line);
    expect(container.querySelector('[data-bonsai-chat-text-size-row="true"]')).toBeNull();
  });
});

describe("the Settings tab with every section open: one line per setting, longer words on the row", () => {
  beforeEach(() => openAllSettingsSections());

  it("carries every row's words for the strip, word for word", () => {
    const { container } = render(<SettingsTab {...props({ showDeveloperTab: true, aiCharacterEnabled: true })} />);
    expect(helpOf(container, "Screenshot quality")).toBe(SETTINGS_ROW_HELP.screenshot);
    expect(helpOf(container, "Text size")).toBe(SETTINGS_ROW_HELP.textSize);
    expect(helpOf(container, "Remember what I typed")).toBe(SETTINGS_ROW_HELP.remember);
    expect(helpOf(container, "Hide spoilers until I tap")).toBe(SETTINGS_ROW_HELP.spoilers);
    expect(helpOf(container, "How much to hide")).toBe(SETTINGS_ROW_HELP.spoilerTier);
    expect(helpOf(container, "Show one chip instead of two")).toBe(SETTINGS_ROW_HELP.chips);
    expect(helpOf(container, "STT model")).toBe(SETTINGS_ROW_HELP.voiceInput);
    expect(helpOf(container, "AI voice & personality")).toBe(SETTINGS_ROW_HELP.character);
    expect(helpOf(container, "Accent intensity")).toBe(accentIntensityHelp("balanced"));
    expect(helpOf(container, "Show Developer tab")).toBe(SETTINGS_ROW_HELP.developerTab);
  });

  it("leaves no paragraph under or above a row: the words moved to the strip", () => {
    const { container } = render(<SettingsTab {...props({ showDeveloperTab: true })} />);
    const text = container.textContent ?? "";
    for (const words of [
      SETTINGS_ROW_HELP.screenshot,
      SETTINGS_ROW_HELP.textSize,
      SETTINGS_ROW_HELP.remember,
      SETTINGS_ROW_HELP.spoilers,
      SETTINGS_ROW_HELP.spoilerTier,
      SETTINGS_ROW_HELP.chips,
      SETTINGS_ROW_HELP.voiceInput,
      SETTINGS_ROW_HELP.character,
      SETTINGS_ROW_HELP.developerTab,
    ]) {
      expect(text, words).not.toContain(words);
    }
    expect(container.querySelector(".bonsai-prose")).toBeNull();
  });

  it("still opens the character picker's popup, remembering the button for the ring's return", () => {
    const onOpen = vi.fn();
    const { container } = render(<SettingsTab {...props({ aiCharacterEnabled: true, onOpenCharacterPicker: onOpen })} />);
    fireEvent.click(container.querySelector("button.bonsai-ai-character-picker-open")!);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(peekModalReturnFocus()).toBe("character-picker-settings");
  });

  it("draws the picker and the accent row only while the character is on", () => {
    const off = render(<SettingsTab {...props({ aiCharacterEnabled: false })} />);
    expect(off.container.querySelector("button.bonsai-ai-character-picker-open")).toBeNull();
    expect(off.container.querySelector("button.bonsai-accent-intensity-trigger")).toBeNull();
    off.unmount();
    const on = render(<SettingsTab {...props({ aiCharacterEnabled: true })} />);
    expect(on.container.querySelector("button.bonsai-ai-character-picker-open")).not.toBeNull();
    expect(on.container.querySelector("button.bonsai-accent-intensity-trigger")).not.toBeNull();
  });
});

describe("the Settings tab's moves out of a section", () => {
  beforeEach(() => openAllSettingsSections());

  const nav = (el: Element | null) => (el as SteamEl | null)?.__nav ?? {};

  it("Up from each section's first row goes to its line, Down from its last to the next line (the rows that are one control each)", () => {
    const { container } = render(<SettingsTab {...props({ showDeveloperTab: true })} />);
    const ids = settingsSectionIds();
    const firstControl = (label: string): SteamEl => {
      const row = rowFor(container, label)!;
      return (row.querySelector('[data-decky-ui="ToggleField"], [flow-children="horizontal"]') ?? row) as SteamEl;
    };
    const rows: Array<[string, string]> = [
      ["Screenshot quality", "screenshot"],
      ["Text size", "textsize"],
      ["Remember what I typed", "remember"],
      ["Show one chip instead of two", "chips"],
    ];
    for (const [label, id] of rows) {
      const control = firstControl(label);
      act(() => putSteamRingOn(control));
      act(() => void nav(control).onMoveUp?.());
      expect(steamRingHolder()?.getAttribute("data-bonsai-fold-line"), `${label} Up`).toBe(id);
      act(() => putSteamRingOn(control));
      act(() => void nav(control).onMoveDown?.());
      const next = ids[ids.indexOf(id as (typeof ids)[number]) + 1];
      expect(steamRingHolder()?.getAttribute("data-bonsai-fold-line"), `${label} Down`).toBe(next);
    }
  });

  it("Story spoilers has two rows: the switch hands Up to the line and Down to Default, the tier row hands Down to the next line and nothing else", () => {
    const { container } = render(<SettingsTab {...props()} />);
    const toggle = rowFor(container, "Hide spoilers until I tap")!.querySelector('[data-decky-ui="ToggleField"]') as SteamEl;
    // The moves sit on the Focusable around the switch: Steam overrules a ToggleField's own Down handler (Deck 2026-10-25).
    const moves = toggle.closest('[data-bonsai-switch-moves="true"]') as SteamEl;
    const tier = container.querySelector<SteamEl>('[data-bonsai-spoiler-tier-row="true"]')!;
    expect(Object.keys(nav(toggle)).filter((k) => nav(toggle)[k])).toEqual([]);
    expect(Object.keys(nav(moves)).filter((k) => nav(moves)[k])).toEqual(["onMoveUp", "onMoveDown"]);
    expect(Object.keys(nav(tier)).filter((k) => nav(tier)[k])).toEqual(["onMoveDown"]);
    act(() => putSteamRingOn(toggle));
    act(() => void nav(moves).onMoveUp?.());
    expect(steamRingHolder()?.getAttribute("data-bonsai-fold-line")).toBe("spoilers");
    act(() => putSteamRingOn(tier.querySelector("button")));
    act(() => void nav(tier).onMoveDown?.());
    expect(steamRingHolder()?.getAttribute("data-bonsai-fold-line")).toBe("chips");
  });

  it("Down from the last section's last control (the Clear buttons) goes on to the floating Open all button (plan 93)", () => {
    const { container } = render(<SettingsTab {...props()} />);
    const pair = container.querySelector<SteamEl>(".bonsai-settings-cache-row")!;
    act(() => putSteamRingOn(pair.querySelector("button")));
    let claimed: unknown;
    act(() => {
      claimed = pair.__nav?.onMoveDown?.();
    });
    expect(claimed).toBe(true);
    expect(steamRingHolder()).toBe(container.querySelector(`[data-bonsai-fold-all="${SETTINGS_FOLD_TAB}"] button`));
  });

  it("gives the Text size row only Up and Down: no Left or Right handler to swallow a press", () => {
    const { container } = render(<SettingsTab {...props()} />);
    const handlers = nav(container.querySelector('[data-bonsai-chat-text-size-row="true"]'));
    expect(Object.keys(handlers).filter((k) => handlers[k])).toEqual(["onMoveUp", "onMoveDown"]);
  });

  it("walks Down out of a closed section line to the next line, and into an open one", () => {
    closeAllSettingsSections();
    const { container } = render(<SettingsTab {...props()} />);
    const line = (id: string) => container.querySelector<SteamEl>(`[data-bonsai-fold-line="${id}"]`)!;
    act(() => putSteamRingOn(line("screenshot")));
    act(() => void line("screenshot").__nav?.onMoveDown?.());
    expect(steamRingHolder()).toBe(line("textsize"));
    act(() => toggleSection(SETTINGS_FOLD_TAB, settingsSectionIds(), "textsize"));
    act(() => putSteamRingOn(line("textsize")));
    act(() => void line("textsize").__nav?.onMoveDown?.());
    /* Into an open section the tab hops with its own focus (focusInTabBody), onto the row's first button. */
    expect(document.activeElement?.closest('[data-bonsai-chat-text-size-row="true"]')).not.toBeNull();
    expect(document.activeElement?.textContent).toBe("Small");
  });
});

export {};
