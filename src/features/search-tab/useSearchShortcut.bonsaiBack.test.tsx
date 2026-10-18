/**
 * Title: B from one of bonsAI's own settings goes back to the Search tab (plan 96, lane N2)
 * Purpose: Pin the Deck check "A on a bonsAI setting, then B, is back on the Search tab" the way the Deck delivers B:
 *          a `vgp_onbuttondown` event with button 2 heard at the panel's document. While a jump from the Search tab
 *          is live and its tab is the one showing, B switches back to the Search tab, on the same word, game and
 *          match, and the press is marked handled; B on any other tab, with no jump live, after the person has
 *          moved to another tab, or while a box that asked for the ring back is open does nothing; Y and the
 *          other buttons are left alone.
 * Used for: useSearchShortcut.ts, bonsaiSettingJump.ts, searchJumpStore.ts.
 * Does not: Show the Settings tab (SearchTab.bonsaiJump.test.tsx does).
 */
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { clearModalReturnFocus, rememberModalReturnFocus } from "../../shared/dpad/modalReturnFocusRegistry";
import { liveBonsaiSettingJump, resetBonsaiSettingJump, startBonsaiSettingJump } from "./bonsaiSettingJump";
import { BONSAI_SETTINGS_INDEX } from "./bonsaiSettingsIndex";
import { peekSearchArrival, registerSearchTabSwitch, resetSearchJump } from "./searchJumpStore";
import { readSearchSaved, resetSearchSaved } from "./searchTabStore";
import { useSearchShortcut } from "./useSearchShortcut";

function Harness({ tab }: { tab: string }): null {
  useSearchShortcut(tab);
  return null;
}

/** A button press as the Deck sends it; returns the event, so a test can see whether it was marked handled. */
function press(button: number): CustomEvent {
  const evt = new CustomEvent("vgp_onbuttondown", { detail: { button }, bubbles: true, cancelable: true });
  act(() => {
    document.body.dispatchEvent(evt);
  });
  return evt;
}

const B = 2;
const Y = 4;
const entry = (label: string) => BONSAI_SETTINGS_INDEX.find((e) => e.label === label)!;
const CTX = { word: "mic", game: null, matchKey: "bonsai:Voice input" };
let switched: string[];

beforeEach(() => {
  resetSearchJump();
  resetSearchSaved();
  resetBonsaiSettingJump();
  clearModalReturnFocus();
  switched = [];
  registerSearchTabSwitch((id) => switched.push(id));
});
afterEach(() => {
  cleanup();
  resetBonsaiSettingJump();
});

describe("B on the tab a bonsAI setting jump went to", () => {
  it("goes back to the Search tab with the word and the match remembered, and marks the press handled", () => {
    render(<Harness tab="search" />);
    startBonsaiSettingJump(entry("Voice input"), CTX);
    switched.length = 0;
    cleanup();
    render(<Harness tab="settings" />);
    const evt = press(B);
    expect(switched).toEqual(["search"]);
    expect(readSearchSaved().typed).toBe("mic");
    expect(peekSearchArrival()).toEqual({ key: "bonsai:Voice input" });
    expect(evt.defaultPrevented).toBe(true);
    expect(liveBonsaiSettingJump()).toBeNull();
  });

  it("works from the Permissions tab too", () => {
    startBonsaiSettingJump(entry("Internet downloads"), { word: "internet", game: null, matchKey: "bonsai:Internet downloads" });
    switched.length = 0;
    render(<Harness tab="permissions" />);
    press(B);
    expect(switched).toEqual(["search"]);
  });

  it("does nothing when no jump is live", () => {
    render(<Harness tab="settings" />);
    const evt = press(B);
    expect(switched).toEqual([]);
    expect(evt.defaultPrevented).toBe(false);
  });

  it("does nothing on a tab the jump did not go to", () => {
    startBonsaiSettingJump(entry("Voice input"), CTX);
    switched.length = 0;
    render(<Harness tab="settings" />);
    cleanup();
    render(<Harness tab="about" />);
    press(B);
    expect(switched).toEqual([]);
  });

  it("is over once the person has moved to another tab: B on the Settings tab later does nothing", () => {
    startBonsaiSettingJump(entry("Voice input"), CTX);
    switched.length = 0;
    const view = render(<Harness tab="settings" />);
    view.rerender(<Harness tab="ollama" />);
    expect(liveBonsaiSettingJump()).toBeNull();
    view.rerender(<Harness tab="settings" />);
    press(B);
    expect(switched).toEqual([]);
  });

  it("stays live while the setting's own tab is showing", () => {
    startBonsaiSettingJump(entry("Voice input"), CTX);
    const view = render(<Harness tab="settings" />);
    view.rerender(<Harness tab="settings" />);
    expect(liveBonsaiSettingJump()).not.toBeNull();
  });

  it("does nothing while a box that asked for the ring back is open (the Clear boxes)", () => {
    startBonsaiSettingJump(entry("Clear cache"), { word: "clear", game: null, matchKey: "bonsai:Clear cache" });
    switched.length = 0;
    render(<Harness tab="settings" />);
    rememberModalReturnFocus("settings-clear-cache");
    press(B);
    expect(switched).toEqual([]);
    clearModalReturnFocus();
    press(B);
    expect(switched).toEqual(["search"]);
  });

  it("leaves Y and every other button alone", () => {
    startBonsaiSettingJump(entry("Voice input"), CTX);
    switched.length = 0;
    render(<Harness tab="settings" />);
    for (const button of [Y, 1, 3, 0, 5, 6]) press(button);
    expect(switched).toEqual([]);
    expect(liveBonsaiSettingJump()).not.toBeNull();
  });

  it("stops listening when the hook goes", () => {
    startBonsaiSettingJump(entry("Voice input"), CTX);
    switched.length = 0;
    const view = render(<Harness tab="settings" />);
    view.unmount();
    press(B);
    expect(switched).toEqual([]);
  });
});
