/**
 * Title: From a bonsAI setting in the Search tab to the setting itself, and back (plan 96, lane N2)
 * Purpose: Walk the whole jump with the real tabs on the shell's own tab switch (which closes every folded
 *          section): type a word in the real Search tab, press A on the bonsAI row, and see the real Settings tab
 *          drawn with that setting's section open and Steam's ring on the setting: on its row for Text size, Voice
 *          input and Clear cache / Clear all data, on the Default button of the tier row for Story spoilers and
 *          How much to hide; the real Permissions tab with the ring on the switch; and B bringing the Search
 *          tab back with the word in the box and the ring on the same result row.
 * Used for: SearchTab.tsx, bonsaiSettingJump.ts, useSearchShortcut.ts, SettingsTab.tsx and its section files,
 *           VoiceInputSettingsSection.tsx, PermissionsTab.tsx.
 * Does not: Know Steam's own scroll or its real ring; the Deck row (P96-N2-SEARCH-OWN) is the proof of those.
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useCallback, useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  listChatSlotQuestions: vi.fn(),
  listUserNotes: vi.fn(),
  saveUserNote: vi.fn(),
  searchRagCorpusNotes: vi.fn(),
}));
vi.mock("./searchApi", () => api);
vi.mock("@decky/ui", async () => {
  const kit = (await import("./searchTabTestKit")).deckyUiForSearch();
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  /* Steam's switch row: a stop of its own that keeps the move handlers it is given, as Decky's ToggleField does. */
  const ToggleField = (p: Record<string, unknown>) => {
    const { label, checked, onChange: _onChange, description: _d, disabled: _x, ...rest } = p;
    return <SteamRingFocusable {...rest} focusable aria-label={String(label)} data-checked={String(checked)} data-decky-ui="ToggleField" />;
  };
  return { ...kit, ToggleField };
});

import { closeAllFoldedSections, isSectionOpen, resetFoldedTabsForTests } from "../folded-tabs/foldedTabsStore";
import { PermissionsTab } from "../permissions/PermissionsTab";
import { resetPermissionJumpRegistry } from "../permissions/permissionJumpRegistry";
import { SettingsTab } from "../settings/SettingsTab";
import { settingsSectionIds } from "../settings/settingsTabFolds";
import { TabBodyFocusRoot } from "../plugin-shell/TabBodyFocusRoot";
import { resetNavFocusRegistry } from "../../shared/dpad/navFocusRegistry";
import { settingsProps } from "../../test-harness/ringTestProps";
import { steamRingHolder, type SteamEl } from "../../test-harness/steamRing";
import { resetBonsaiSettingJump } from "./bonsaiSettingJump";
import { SearchTab } from "./SearchTab";
import { registerSearchTabSwitch, resetSearchJump } from "./searchJumpStore";
import { resetSearchSaved } from "./searchTabStore";
import { CHATS, NOTES, pressOn, ringLabel } from "./searchTabTestKit";
import { useSearchShortcut } from "./useSearchShortcut";

const NO_PACKS = { aliasSynonym: [], expansion: [] };
const ALL_ON = { filesystem_write: true, media_library_access: true, steam_logs_read: true, microphone_access: true, internet_downloads: true };

/** The shell in miniature: one tab at a time, a switch that closes every folded section as the real one does, and the Y/B listener. */
function Shell(): React.ReactElement {
  const [tab, setTab] = useState("search");
  const select = useCallback((id: string) => {
    closeAllFoldedSections();
    setTab(id);
  }, []);
  useEffect(() => registerSearchTabSwitch(select), [select]);
  useSearchShortcut(tab);
  if (tab === "search") {
    return (
      <TabBodyFocusRoot id="search">
        <SearchTab active isAsking={false} intentPackIndex={NO_PACKS} onSettingClick={vi.fn()} />
      </TabBodyFocusRoot>
    );
  }
  if (tab === "settings") {
    return (
      <TabBodyFocusRoot id="settings">
        <SettingsTab {...settingsProps()} />
      </TabBodyFocusRoot>
    );
  }
  if (tab === "permissions") {
    return (
      <TabBodyFocusRoot id="permissions">
        <PermissionsTab capabilities={ALL_ON} setCapabilities={() => {}} />
      </TabBodyFocusRoot>
    );
  }
  return <div data-tab={tab} />;
}

async function searchFor(word: string) {
  const view = render(<Shell />);
  await screen.findByLabelText("Hollow Knight");
  fireEvent.change(screen.getByLabelText("Search for a word"), { target: { value: word } });
  await waitFor(() => expect(view.container.querySelector("[data-bonsai-search-results]")).not.toBeNull());
  return view;
}

function pressA(label: string) {
  act(() => {
    pressOn(screen.getByLabelText(label) as SteamEl, "onOKButton");
  });
}

/** B as the Deck sends it: button 2 at the panel's document. */
function pressB() {
  act(() => {
    document.body.dispatchEvent(new CustomEvent("vgp_onbuttondown", { detail: { button: 2 }, bubbles: true, cancelable: true }));
  });
}

const ringIn = (selector: string) => steamRingHolder()?.closest(selector) ?? null;
const lineOpen = (id: string) => document.querySelector(`.bonsai-fold-line[data-bonsai-fold-line="${id}"]`)?.getAttribute("data-open");

beforeEach(() => {
  resetSearchSaved();
  resetSearchJump();
  resetBonsaiSettingJump();
  resetFoldedTabsForTests();
  resetNavFocusRegistry();
  resetPermissionJumpRegistry();
  api.listChatSlotQuestions.mockReset().mockResolvedValue(CHATS);
  api.listUserNotes.mockReset().mockResolvedValue(NOTES);
  api.saveUserNote.mockReset();
  api.searchRagCorpusNotes.mockReset().mockResolvedValue({ installed: false, notes: [], reason: "" });
});
afterEach(() => {
  cleanup();
  resetBonsaiSettingJump();
});

describe("A on a bonsAI setting, with the real tabs", () => {
  it("Voice input: the Settings tab, its voice section open, the ring on the STT model row", async () => {
    await searchFor("mic");
    pressA("Voice input, bonsAI Settings > Voice input");
    await waitFor(() => expect(lineOpen("voiceinput")).toBe("true"));
    expect(lineOpen("textsize")).toBe("false");
    await waitFor(() => expect(ringIn('[data-bonsai-help-label="STT model"]')).not.toBeNull(), { timeout: 3000 });
  });

  it("Text size: its section open, the ring on the three-button row", async () => {
    await searchFor("text size");
    pressA("Text size, bonsAI Settings > Text size");
    await waitFor(() => expect(lineOpen("textsize")).toBe("true"));
    await waitFor(() => expect(ringIn("[data-bonsai-chat-text-size-row]")).not.toBeNull(), { timeout: 3000 });
  });

  it("Clear cache: the Data section open, the ring on the pair of Clear buttons", async () => {
    await searchFor("cache");
    pressA("Clear cache, bonsAI Settings > Data");
    await waitFor(() => expect(lineOpen("data")).toBe("true"));
    await waitFor(() => expect(ringIn(".bonsai-settings-cache-row")).not.toBeNull(), { timeout: 3000 });
  });

  it.each([
    ["spoiler", "Story spoilers"],
    ["how much", "How much to hide"],
  ])("%s finds %s: its section open, the ring on the Default button of the tier row", async (word, label) => {
    await searchFor(word);
    pressA(`${label}, bonsAI Settings > Story spoilers (Strategy mode)`);
    await waitFor(() => expect(lineOpen("spoilers")).toBe("true"));
    await waitFor(() => expect(ringIn("[data-bonsai-spoiler-tier-row]")).not.toBeNull(), { timeout: 3000 });
    expect(steamRingHolder()?.textContent).toBe("Default");
    /* The switch row is drawn, above the tier row, so the person sees the setting. */
    expect(document.querySelector('[data-bonsai-help-label="Hide spoilers until I tap"]')).not.toBeNull();
  });

  it("Permissions: the Permissions tab with the ring on the switch", async () => {
    await searchFor("internet");
    pressA("Internet downloads, bonsAI Permissions");
    await waitFor(() => expect(ringIn('[data-bonsai-permission-focus="internet_downloads"]')).not.toBeNull(), { timeout: 3000 });
  });
});

describe("B from there", () => {
  it("comes back to the Search tab with the word in the box and the ring on the result that was pressed", async () => {
    await searchFor("text size");
    pressA("Text size, bonsAI Settings > Text size");
    await waitFor(() => expect(ringIn("[data-bonsai-chat-text-size-row]")).not.toBeNull(), { timeout: 3000 });
    pressB();
    await screen.findByLabelText("Hollow Knight");
    expect((screen.getByLabelText("Search for a word") as HTMLInputElement).value).toBe("text size");
    await waitFor(() => expect(ringLabel()).toBe("Text size, bonsAI Settings > Text size"), { timeout: 3000 });
  });

  it("works from the Permissions tab too", async () => {
    await searchFor("internet");
    pressA("Internet downloads, bonsAI Permissions");
    await waitFor(() => expect(ringIn('[data-bonsai-permission-focus="internet_downloads"]')).not.toBeNull(), { timeout: 3000 });
    pressB();
    await screen.findByLabelText("Hollow Knight");
    await waitFor(() => expect(ringLabel()).toBe("Internet downloads, bonsAI Permissions"), { timeout: 3000 });
  });

  it("leaves nothing open behind: after coming back, every Settings section is shut", async () => {
    await searchFor("text size");
    pressA("Text size, bonsAI Settings > Text size");
    await waitFor(() => expect(lineOpen("textsize")).toBe("true"));
    pressB();
    await screen.findByLabelText("Hollow Knight");
    expect(settingsSectionIds().some((id) => isSectionOpen("settings", settingsSectionIds(), id))).toBe(false);
  });
});
