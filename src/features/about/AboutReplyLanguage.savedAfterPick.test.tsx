/**
 * Title: The About reply-language pick reaches the settings file (Deck check P97-L2-LANGUAGE-PICK)
 *
 * Purpose: Open Steam's language list on the About tab, pick Czech, let Decky rebuild the screen as the
 * list closes, and check two things: the settings FILE says czech, and the rebuilt screen shows Czech.
 * Used for: Guarding `AboutReplyLanguageSection.tsx` and `useAboutTabPayload.tsx` against the 2026-10-17 and
 * 2026-10-18 device bug (workshop:test-evidence/plan94-P94-ABOUT.json; docs/audit/plan96-scope-reply-language.md):
 * the button went back to Follow system and the file still said follow system.
 * Solves: The About tests used a list with nothing in it and a do-nothing change function, so nothing checked
 * that a pick gets to the file or survives a rebuilt screen. Here the real settings hook runs against a
 * stand-in back end that keeps a "disk", the list is opened and picked from, and the screen is torn down in
 * the same breath as the pick (which is what closing Steam's list does on the device).
 * Does not: Draw Steam's real list or the ring, or prove Steam calls `onMenuOpened` (the log line the fix adds
 * to the plugin log answers that on the first Deck pick). Same shape as
 * `ai-connection/useThinkingNoticeGate.savedAfterReopen.test.tsx`.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { call } from "@decky/api";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const kit = await import("../../test-harness/aboutDeckyUi");
  return { ...stubs, Focusable: kit.KeepNavFocusable, Button: kit.KeepNavButton, Dropdown: kit.StopDropdown };
});

import { dropdownPickLater, openDropdownMenu } from "../../test-harness/aboutDeckyUi";
import { usePluginSettings } from "../settings/usePluginSettings";
import { useAboutTabPayload } from "../plugin-shell/tabs/useAboutTabPayload";
import {
  captureBonsaiSessionForModal,
  clearBonsaiSessionSurvival,
  consumeBonsaiSessionAfterRemount,
  type BonsaiSessionSurvivalSnapshot,
} from "../plugin-shell/bonsaiSessionSurvival";
import { repoRoot } from "../../test-harness/repoPaths";
import { dispatchFakeRpc, getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";

const CONTRACT = JSON.parse(
  readFileSync(resolve(repoRoot(), "tests", "contracts", "settings-defaults.json"), "utf8"),
) as Record<string, unknown>;

type Disk = { current: () => Record<string, unknown>; holdLoads: () => () => void };

/** A settings file kept in memory. `holdLoads` makes load_settings wait until the returned function is called. */
function installDisk(): Disk {
  let disk: Record<string, unknown> = { ...CONTRACT, reply_language: "follow_system" };
  let gate: Promise<void> | null = null;
  setRpcHandler("load_settings", async () => {
    if (gate) await gate;
    return disk;
  });
  setRpcHandler("save_settings", (...args: unknown[]) => {
    disk = { ...disk, ...((args[0] as Record<string, unknown>) ?? {}) };
    return disk;
  });
  setRpcHandler("dbg_fe_log", () => ({ ok: true }));
  return {
    current: () => disk,
    holdLoads: () => {
      let release = () => {};
      gate = new Promise<void>((r) => (release = r));
      return () => release();
    },
  };
}

type Settings = ReturnType<typeof usePluginSettings>;

/** One About screen: the real settings hook feeding the real About tab, like the shell does. */
function Screen({ out }: { out: { current: Settings | null } }) {
  const settings = usePluginSettings();
  out.current = settings;
  return useAboutTabPayload({
    replyLanguage: settings.replyLanguage,
    onReplyLanguageChange: settings.setReplyLanguage,
    // Stands in for the shell's `captureSessionBeforeModal`: the whole session as it is when the list opens.
    onReplyLanguageMenuOpened: () =>
      captureBonsaiSessionForModal({
        currentTab: "about",
        settingsSnapshot: settings.settingsSnapshot,
      } as unknown as BonsaiSessionSurvivalSnapshot),
    effectiveLang: "en",
    steamClientLanguageLabel: "English",
    t: (key) => key,
  });
}

const saveCalls = () => getRpcCallLog().filter((c) => c.method === "save_settings");
const dropdownOf = (root: HTMLElement) => root.querySelector<HTMLElement>('[data-decky-ui="Dropdown"]')!;

beforeEach(() => {
  window.localStorage.clear();
  clearBonsaiSessionSurvival();
  resetFakeDeckyRpc();
  vi.mocked(call).mockImplementation((method: string, ...args: unknown[]) =>
    dispatchFakeRpc(method, args) as ReturnType<typeof call>,
  );
});

describe("About reply-language pick, list closes and the screen is rebuilt", () => {
  it("pick Czech, screen torn down at once: the file says czech and the rebuilt screen reads Czech", async () => {
    const disk = installDisk();
    const first: { current: Settings | null } = { current: null };
    const view = render(<Screen out={first} />);
    await waitFor(() => expect(first.current?.settingsLoaded).toBe(true));
    expect(first.current?.replyLanguage).toBe("follow_system");

    openDropdownMenu(dropdownOf(view.container));
    const pick = dropdownPickLater(dropdownOf(view.container), "czech");
    // Closing Steam's list rebuilds the screen in the same breath as the pick: no draw in between, and the
    // 400 ms automatic save never gets to run.
    await act(async () => {
      pick();
      view.unmount();
    });

    await waitFor(() => expect(disk.current().reply_language).toBe("czech"));

    // The shell takes the note as the rebuilt screen mounts; the settings hook then prefers it over the disk read.
    expect(consumeBonsaiSessionAfterRemount()?.settingsSnapshot.replyLanguage).toBe("czech");
    const second: { current: Settings | null } = { current: null };
    render(<Screen out={second} />);
    await waitFor(() => expect(second.current?.settingsLoaded).toBe(true));
    expect(second.current?.replyLanguage).toBe("czech");
    expect(disk.current().reply_language).toBe("czech");
  });

  it("the pick lands after the screen was already rebuilt: the file says czech and the new screen still reads Czech", async () => {
    const disk = installDisk();
    const first: { current: Settings | null } = { current: null };
    const view = render(<Screen out={first} />);
    await waitFor(() => expect(first.current?.settingsLoaded).toBe(true));

    openDropdownMenu(dropdownOf(view.container));
    const pick = dropdownPickLater(dropdownOf(view.container), "czech");
    view.unmount();

    // The rebuilt screen is up and has taken the note, but its settings read has not come back yet.
    const release = disk.holdLoads();
    expect(consumeBonsaiSessionAfterRemount()).not.toBeNull();
    const second: { current: Settings | null } = { current: null };
    render(<Screen out={second} />);

    await act(async () => {
      pick();
    });
    await waitFor(() => expect(disk.current().reply_language).toBe("czech"));

    await act(async () => {
      release();
    });
    await waitFor(() => expect(second.current?.settingsLoaded).toBe(true));
    expect(second.current?.replyLanguage).toBe("czech");
  });

  it("sends the one changed field, not a whole copy", async () => {
    installDisk();
    const first: { current: Settings | null } = { current: null };
    const view = render(<Screen out={first} />);
    await waitFor(() => expect(first.current?.settingsLoaded).toBe(true));

    openDropdownMenu(dropdownOf(view.container));
    const pick = dropdownPickLater(dropdownOf(view.container), "english");
    await act(async () => {
      pick();
      view.unmount();
    });

    await waitFor(() => expect(saveCalls().length).toBeGreaterThan(0));
    expect(saveCalls()[0].args).toEqual([{ reply_language: "english" }]);
  });

  it("writes one line to the plugin log for the pick, so a Deck pick shows whether it arrived", async () => {
    installDisk();
    const first: { current: Settings | null } = { current: null };
    const view = render(<Screen out={first} />);
    await waitFor(() => expect(first.current?.settingsLoaded).toBe(true));

    openDropdownMenu(dropdownOf(view.container));
    await act(async () => {
      dropdownPickLater(dropdownOf(view.container), "czech")();
    });

    const logged = getRpcCallLog().filter((c) => c.method === "dbg_fe_log");
    const tags = logged.map((c) => String(c.args[0]));
    expect(tags).toContain("about.replyLanguage.menuOpened");
    expect(tags).toContain("about.replyLanguage.pick");
    const pickLine = logged.find((c) => c.args[0] === "about.replyLanguage.pick");
    expect(pickLine?.args[1]).toMatchObject({ picked: "czech" });
  });
});
