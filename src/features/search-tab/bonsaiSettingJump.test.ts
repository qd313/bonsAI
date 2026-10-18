/**
 * Title: A on one of bonsAI's own settings: the jump and the way back
 * Purpose: Pin the jump the Search tab makes (plan 96, lane N2) at the level a person sees it, against the shell's
 *          own tab switch (which closes every folded section, as the real one does): A on Voice input ends with
 *          the Settings tab asked for, its voice section open (the switch closes it, so it is opened after) and
 *          Steam's ring handed to the row's nav node through the transfer, retried while the tab settles; a row
 *          that never registers gets the ring on its section's line; a row that registers late still gets it; a
 *          Permissions entry arms the existing permission jump with the Search tab as the tab to come back to;
 *          B (backFromBonsaiSettingJump) switches back to the Search tab with the word, the game and the match
 *          remembered and cancels any ring still waiting; a newer jump replaces an older one.
 * Used for: bonsaiSettingJump.ts, searchJumpStore.ts (switchToTab, returnToSearchTab), foldedTabsStore.ts (openSection).
 * Does not: Draw the Search tab or the Settings tab (SearchTab.bonsaiJump.test.tsx does, with the real ones).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { closeAllFoldedSections, isSectionOpen, resetFoldedTabsForTests, toggleSection } from "../folded-tabs/foldedTabsStore";
import { peekPermissionJumpFocusTarget, peekPermissionJumpReturnTab, resetPermissionJumpRegistry } from "../permissions/permissionJumpRegistry";
import { SETTINGS_SECTIONS } from "../settings/settingsTabFolds";
import { registerNavFocus, resetNavFocusRegistry } from "../../shared/dpad/navFocusRegistry";
import {
  backFromBonsaiSettingJump,
  liveBonsaiSettingJump,
  resetBonsaiSettingJump,
  startBonsaiSettingJump,
} from "./bonsaiSettingJump";
import { BONSAI_SETTINGS_INDEX, type BonsaiSettingEntry } from "./bonsaiSettingsIndex";
import { bonsaiSettingRowNav } from "./bonsaiSettingRowNav";
import { peekSearchArrival, registerSearchTabSwitch, resetSearchJump } from "./searchJumpStore";
import { readSearchSaved, resetSearchSaved } from "./searchTabStore";

const entry = (label: string): BonsaiSettingEntry => BONSAI_SETTINGS_INDEX.find((e) => e.label === label)!;
const SETTINGS_IDS = SETTINGS_SECTIONS.map((s) => s.id as string);
const CTX = { word: "mic", game: "Hades", matchKey: "bonsai:Voice input" };

/** A nav node whose TakeFocus is a spy, put where Steam would put it. */
function nodeWithSpy(): { holder: { current: { TakeFocus: () => boolean } | null }; take: ReturnType<typeof vi.fn> } {
  const take = vi.fn(() => true);
  return { holder: { current: { TakeFocus: take } }, take };
}

let tabs: string[];

beforeEach(() => {
  vi.useFakeTimers();
  resetFoldedTabsForTests();
  resetNavFocusRegistry();
  resetPermissionJumpRegistry();
  resetSearchJump();
  resetSearchSaved();
  resetBonsaiSettingJump();
  tabs = [];
  /* The shell's switch: every folded tab's sections close, then the tab changes (useBonsaiPluginShell.noteRealTabSwitch). */
  registerSearchTabSwitch((id) => {
    closeAllFoldedSections();
    tabs.push(id);
  });
});
afterEach(() => {
  resetBonsaiSettingJump();
  vi.useRealTimers();
});

describe("A on Voice input", () => {
  it("switches to Settings, opens the voice section the switch had closed, and hands the ring to the row", () => {
    toggleSection("settings", SETTINGS_IDS, "voiceinput");
    expect(startBonsaiSettingJump(entry("Voice input"), CTX)).toBe(true);
    expect(tabs).toEqual(["settings"]);
    expect(isSectionOpen("settings", SETTINGS_IDS, "voiceinput")).toBe(true);

    const row = nodeWithSpy();
    bonsaiSettingRowNav("stt-model").current = row.holder.current;
    const line = nodeWithSpy();
    registerNavFocus("fold-line:settings:voiceinput", line.holder);
    vi.advanceTimersByTime(1000);
    expect(row.take).toHaveBeenCalled();
    expect(line.take).not.toHaveBeenCalled();
  });

  it("opens only that section, whatever else the shell's switch closed", () => {
    toggleSection("settings", SETTINGS_IDS, "chips");
    startBonsaiSettingJump(entry("Voice input"), CTX);
    expect(SETTINGS_IDS.filter((id) => isSectionOpen("settings", SETTINGS_IDS, id))).toEqual(["voiceinput"]);
  });

  it("takes the ring again after the tab has settled, not only at the first look", () => {
    startBonsaiSettingJump(entry("Voice input"), CTX);
    const row = nodeWithSpy();
    bonsaiSettingRowNav("stt-model").current = row.holder.current;
    vi.advanceTimersByTime(1000);
    expect(row.take.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("is live until it ends, and says which tab it is on", () => {
    expect(liveBonsaiSettingJump()).toBeNull();
    startBonsaiSettingJump(entry("Voice input"), CTX);
    expect(liveBonsaiSettingJump()).toEqual({ tab: "settings", matchKey: "bonsai:Voice input" });
  });
});

describe("a row that cannot take the ring", () => {
  it("gets the ring on its section's line, with the section open", () => {
    startBonsaiSettingJump(entry("Story spoilers"), { word: "spoiler", game: null, matchKey: "bonsai:Story spoilers" });
    expect(isSectionOpen("settings", SETTINGS_IDS, "spoilers")).toBe(true);
    const line = nodeWithSpy();
    registerNavFocus("fold-line:settings:spoilers", line.holder);
    vi.advanceTimersByTime(1000);
    expect(line.take).toHaveBeenCalled();
  });

  it("does not put the ring on the line before the row has had time to register", () => {
    startBonsaiSettingJump(entry("Voice input"), CTX);
    const line = nodeWithSpy();
    registerNavFocus("fold-line:settings:voiceinput", line.holder);
    vi.advanceTimersByTime(250);
    expect(line.take).not.toHaveBeenCalled();
  });

  it("still takes a row that registers late, and leaves the line alone", () => {
    startBonsaiSettingJump(entry("Voice input"), CTX);
    const line = nodeWithSpy();
    registerNavFocus("fold-line:settings:voiceinput", line.holder);
    vi.advanceTimersByTime(300);
    const row = nodeWithSpy();
    bonsaiSettingRowNav("stt-model").current = row.holder.current;
    vi.advanceTimersByTime(1000);
    expect(row.take).toHaveBeenCalled();
    expect(line.take).not.toHaveBeenCalled();
  });
});

describe("a Permissions entry", () => {
  it("arms the permission jump with the Search tab to come back to, and opens no section", () => {
    expect(startBonsaiSettingJump(entry("Internet downloads"), { word: "internet", game: null, matchKey: "bonsai:Internet downloads" })).toBe(true);
    expect(tabs).toEqual(["permissions"]);
    expect(peekPermissionJumpFocusTarget()).toBe("internet_downloads");
    expect(peekPermissionJumpReturnTab()).toBe("search");
    expect(SETTINGS_IDS.some((id) => isSectionOpen("settings", SETTINGS_IDS, id))).toBe(false);
    expect(liveBonsaiSettingJump()?.tab).toBe("permissions");
  });

  it("names the switch the entry is for", () => {
    startBonsaiSettingJump(entry("Voice input (microphone)"), CTX);
    expect(peekPermissionJumpFocusTarget()).toBe("microphone_access");
  });
});

describe("the Ollama tab", () => {
  it("opens the section on the Ollama tab, not the Settings tab", () => {
    startBonsaiSettingJump(entry("Keep models loaded"), { word: "keep", game: null, matchKey: "k" });
    expect(tabs).toEqual(["ollama"]);
    expect(isSectionOpen("ollama", ["where", "kb", "reply", "tuning", "models"], "tuning")).toBe(true);
    expect(isSectionOpen("settings", SETTINGS_IDS, "tuning")).toBe(false);
  });
});

describe("the way back", () => {
  it("switches to the Search tab with the word, the game and the match remembered, and the jump over", () => {
    startBonsaiSettingJump(entry("Voice input"), CTX);
    tabs.length = 0;
    expect(backFromBonsaiSettingJump()).toBe(true);
    expect(tabs).toEqual(["search"]);
    expect(readSearchSaved()).toMatchObject({ typed: "mic", game: "Hades", openNote: null, returnKey: null });
    expect(peekSearchArrival()).toEqual({ key: "bonsai:Voice input" });
    expect(liveBonsaiSettingJump()).toBeNull();
  });

  it("cancels a ring that was still waiting", () => {
    startBonsaiSettingJump(entry("Voice input"), CTX);
    const row = nodeWithSpy();
    bonsaiSettingRowNav("stt-model").current = row.holder.current;
    backFromBonsaiSettingJump();
    vi.advanceTimersByTime(2000);
    expect(row.take).not.toHaveBeenCalled();
  });

  it("forgets the permission jump's return tab, so the Permissions tab shows no Back to Search later", () => {
    startBonsaiSettingJump(entry("Internet downloads"), CTX);
    backFromBonsaiSettingJump();
    expect(peekPermissionJumpReturnTab()).toBeNull();
  });

  it("does nothing when no jump is live", () => {
    expect(backFromBonsaiSettingJump()).toBe(false);
    expect(tabs).toEqual([]);
  });
});

describe("when it cannot start or is replaced", () => {
  it("does nothing, and stays dead, when the plugin root has not handed in the tab switch", () => {
    resetSearchJump();
    expect(startBonsaiSettingJump(entry("Voice input"), CTX)).toBe(false);
    expect(liveBonsaiSettingJump()).toBeNull();
    expect(peekPermissionJumpFocusTarget()).toBeNull();
    expect(startBonsaiSettingJump(entry("Internet downloads"), CTX)).toBe(false);
    expect(peekPermissionJumpFocusTarget()).toBeNull();
    expect(peekPermissionJumpReturnTab()).toBeNull();
  });

  it("lets a newer jump replace an older one's waiting ring", () => {
    startBonsaiSettingJump(entry("Voice input"), CTX);
    const oldRow = nodeWithSpy();
    bonsaiSettingRowNav("stt-model").current = oldRow.holder.current;
    startBonsaiSettingJump(entry("Text size"), { word: "text", game: null, matchKey: "bonsai:Text size" });
    const newRow = nodeWithSpy();
    bonsaiSettingRowNav("text-size").current = newRow.holder.current;
    vi.advanceTimersByTime(1000);
    expect(oldRow.take).not.toHaveBeenCalled();
    expect(newRow.take).toHaveBeenCalled();
    expect(liveBonsaiSettingJump()?.matchKey).toBe("bonsai:Text size");
  });
});
