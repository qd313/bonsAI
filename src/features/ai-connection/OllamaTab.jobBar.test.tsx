/**
 * Title: The bar at the bottom of the panel: there only while the job's card is out of sight, and the ring on it
 *
 * Purpose: Pin plan 105 lane D4's row P105-OLLAMA-BUTTONS-01 ("the bar present only when the card is out of sight;
 * bar and help strip not overlapping"; the ring read at each change) on the real Ollama tab, drawn in bonsAI's tabs
 * box with the bar after the pane as index.tsx draws it, walked with Steam's own ring (the stand-in moves it only on
 * Steam's transfer). With a run going: no bar while the card is in sight; the bar while Where AI runs is folded shut,
 * while the card is scrolled off, and on a tab with no card at all; it goes when the card is back. Down from Open all
 * lands on the bar's Cancel and Up or B goes back; X in the tab cancels the job, not in its first half second; when
 * the run ends with the ring on the bar's Cancel the ring goes back to Open all and the bar says how the run ended.
 * With two jobs out of sight the bar shows the newest and "2 jobs"; Left from Cancel reaches the chip, A on it
 * switches, Right goes back to Cancel. Left at the bar's left end holds twice and the third Left goes to Steam's menu.
 * The bar takes its 56 px off the pane, so the help strip's dock, placed from the pane's bottom, ends where it starts.
 *
 * Does not: know the Deck's real heights (foldedTabWalk.tsx's flow model) or Steam's timing; the Deck row reads them.
 */
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  const ToggleField = (p: Record<string, unknown>) => {
    const { label, checked: _checked, onChange: _onChange, description: _d, disabled: _x, ...rest } = p;
    return <SteamRingFocusable {...rest} focusable aria-label={stubs.wordsOf(label)} data-decky-ui="ToggleField" />;
  };
  return { ...stubs, Focusable: SteamRingFocusable, ToggleField };
});

import { OllamaTab } from "./OllamaTab";
import { ollamaProps } from "../../test-harness/ringTestProps";
import { resetFoldedTabsForTests, setAllSections, toggleSection } from "../folded-tabs/foldedTabsStore";
import { OLLAMA_FOLD_TAB, OLLAMA_SECTIONS } from "./ollamaTabFolds";
import { resetNavFocusRegistry } from "../../shared/dpad/navFocusRegistry";
import { stripHeightFor } from "../folded-tabs/foldedTabs";
import { walkFoldedTab } from "../../test-harness/foldedTabWalk";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../settings/settingsLoadedSignal";
import { putSteamRingOn, steamRingHolder, type SteamEl } from "../../test-harness/steamRing";
import { JobBar } from "../downloads/JobBar";
import { JOB_BAR_HEIGHT_PX, buildJobLookSection } from "../downloads/jobLook";
import { TabHelpStrip } from "../folded-tabs/TabHelpStrip";
import { noteOllamaSetupStatus } from "./ollamaSetupJob";
import { publishJob } from "../downloads/runningJobs";
import { leftsAt, steamRingWorld } from "../../test-harness/steamLeftPress";

const SECTION_IDS = OLLAMA_SECTIONS.map((s) => s.id);
const RUNNING = { phase: "running", stage: "install", profile: "update_installed", accepted: true };
const BAR = "[data-bonsai-job-bar]";
const BAR_CANCEL = "Cancel: Updating AI & models";
let status: Record<string, unknown> = RUNNING;

const wait = (ms: number) => act(async () => new Promise<void>((r) => setTimeout(r, ms)));
const bar = () => document.querySelector<HTMLElement>(BAR);
const ringName = () => steamRingHolder()?.getAttribute("aria-label") ?? "(no ring)";

/** The Ollama tab in the tabs box with the bar after the pane; laid out, and the card's in-sight look run again. */
async function drawTab(viewport = 430) {
  const w = walkFoldedTab({
    tabId: OLLAMA_FOLD_TAB,
    tab: <OllamaTab {...ollamaProps()} />,
    viewport,
    steam: "nearest",
    stripHeight: stripHeightFor,
    tail: 120,
    afterPane: <JobBar />,
  });
  const pane = w.container.querySelector<HTMLElement>("[data-pane]")!;
  const look = async () => {
    w.contentHeight();
    act(() => void pane.dispatchEvent(new Event("scroll")));
    await wait(40);
  };
  await wait(20);
  await look();
  return { w, pane, look };
}

beforeEach(() => {
  resetFoldedTabsForTests();
  resetNavFocusRegistry();
  resetFakeDeckyRpc();
  resetSettingsLoadedSignalForTests();
  status = RUNNING;
  setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.40.2", models: ["a:1"] }));
  setRpcHandler("get_local_ollama_setup_status", () => status);
  setRpcHandler("cancel_local_ollama_setup", () => ({ cancel_requested: true }));
  markSettingsLoaded();
});
afterEach(() => cleanup());

describe("the bar follows the card out of sight", () => {
  it("no bar while the card is in sight; folded shut, the bar shows the job; opened again, the bar goes", async () => {
    const { look } = await drawTab();
    expect(document.querySelector('[aria-label="Cancel local Ollama setup"]')).not.toBeNull();
    expect(bar()).toBeNull();
    act(() => toggleSection(OLLAMA_FOLD_TAB, SECTION_IDS, "where"));
    await waitFor(() => expect(bar()).not.toBeNull());
    expect(bar()!.textContent).toContain("Updating AI & models");
    expect(screen.getByLabelText(BAR_CANCEL)).toBeTruthy();
    act(() => toggleSection(OLLAMA_FOLD_TAB, SECTION_IDS, "where"));
    await look();
    await waitFor(() => expect(bar()).toBeNull());
  });

  it("the card scrolled off brings the bar; scrolled back, it goes, and nothing on the card moved", async () => {
    setAllSections(OLLAMA_FOLD_TAB, SECTION_IDS, true);
    const { pane, look } = await drawTab(330);
    expect(bar()).toBeNull();
    const card = document.querySelector<HTMLElement>("[data-bonsai-job-card]")!;
    pane.scrollTop = 10_000;
    await look();
    expect(bar()).not.toBeNull();
    expect(document.querySelector("[data-bonsai-job-card]")).toBe(card);
    pane.scrollTop = 0;
    await look();
    expect(bar()).toBeNull();
  });

  it("on a tab with no card at all (another tab) the bar shows the running job", async () => {
    noteOllamaSetupStatus(RUNNING as never, true);
    render(
      <div className="bonsai-decky-tabs-root" data-bonsai-active-tab="settings">
        <JobBar />
      </div>,
    );
    expect(bar()).not.toBeNull();
    expect(bar()!.textContent).toContain("Updating AI & models");
  });
});

describe("the ring and the bar", () => {
  it("Down from Open all lands on the bar's Cancel; Up goes back, and B too", async () => {
    await drawTab();
    act(() => toggleSection(OLLAMA_FOLD_TAB, SECTION_IDS, "where"));
    await waitFor(() => expect(bar()).not.toBeNull());
    const foldAll = document.querySelector<SteamEl>("[data-bonsai-fold-all]")!;
    act(() => putSteamRingOn(foldAll.querySelector("button")));
    act(() => void foldAll.__nav?.onMoveDown?.());
    expect(ringName()).toBe(BAR_CANCEL);
    const host = screen.getByLabelText(BAR_CANCEL).closest<SteamEl>(".bonsai-job-bar__host")!;
    expect(host.__nav?.onMoveDown?.()).toBe(true);
    expect(ringName()).toBe(BAR_CANCEL);
    act(() => void host.__nav?.onMoveUp?.());
    expect(ringName()).toBe("Open all sections");
    act(() => void foldAll.__nav?.onMoveDown?.());
    act(() => void host.__nav?.onCancelButton?.({ preventDefault: () => {} }));
    expect(ringName()).toBe("Open all sections");
  });

  it("X anywhere in the tab cancels the job, but not in its first half second", async () => {
    await drawTab();
    const body = document.querySelector<SteamEl>("[data-bonsai-tab-body]")!;
    const prevent = vi.fn();
    act(() => void body.__nav?.onSecondaryButton?.({ preventDefault: prevent }));
    expect(getRpcCallLog().filter((c) => c.method === "cancel_local_ollama_setup")).toHaveLength(0);
    await wait(520);
    act(() => void body.__nav?.onSecondaryButton?.({ preventDefault: prevent }));
    expect(getRpcCallLog().filter((c) => c.method === "cancel_local_ollama_setup")).toHaveLength(1);
    expect(prevent).toHaveBeenCalled();
    expect(screen.getByText("Stopping the update")).toBeTruthy();
  });

  it("the run ends with the ring on the bar's Cancel: the ring goes back to Open all and the bar says how it ended", async () => {
    await drawTab();
    act(() => toggleSection(OLLAMA_FOLD_TAB, SECTION_IDS, "where"));
    await waitFor(() => expect(bar()).not.toBeNull());
    const foldAll = document.querySelector<SteamEl>("[data-bonsai-fold-all]")!;
    act(() => putSteamRingOn(foldAll.querySelector("button")));
    act(() => void foldAll.__nav?.onMoveDown?.());
    expect(ringName()).toBe(BAR_CANCEL);
    status = { phase: "cancelled", stage: "", profile: "update_installed", error: "Cancelled.", done: true };
    await waitFor(() => expect(bar()?.textContent).toContain("Update cancelled"), { timeout: 4000 });
    await waitFor(() => expect(ringName()).toBe("Open all sections"));
  });
});

describe("two jobs at once", () => {
  it("the newest and a \"2 jobs\" chip: Left from Cancel reaches it, A switches, Right goes back", () => {
    noteOllamaSetupStatus(RUNNING as never, true);
    publishJob("kb-download", { title: "Updating the library", stoppingTitle: "Stopping the download", line1: "Downloading the knowledge library", line2: "", sites: "From huggingface.co", fraction: 0.3 }, () => {}, Date.now() + 10);
    render(
      <div className="bonsai-decky-tabs-root" data-bonsai-active-tab="settings">
        <JobBar />
      </div>,
    );
    expect(bar()!.textContent).toContain("Updating the library");
    const chip = screen.getByLabelText("Show the other running job");
    expect(chip.textContent).toBe("2 jobs");
    const cancelHost = screen.getByLabelText("Cancel: Updating the library").closest<SteamEl>(".bonsai-job-bar__host")!;
    act(() => putSteamRingOn(screen.getByLabelText("Cancel: Updating the library")));
    act(() => void cancelHost.__nav?.onMoveLeft?.());
    expect(ringName()).toBe("Show the other running job");
    act(() => chip.click());
    expect(bar()!.textContent).toContain("Updating AI & models");
    const chipHost = screen.getByLabelText("Show the other running job").closest<SteamEl>(".bonsai-job-bar__host")!;
    act(() => void chipHost.__nav?.onMoveRight?.());
    expect(ringName()).toBe(BAR_CANCEL);
  });
});

describe("Left on the bar (plan 105 lane C5)", () => {
  it("with one job, Left on Cancel holds twice and the third goes to Steam's menu; with two, Left goes to the chip first", () => {
    noteOllamaSetupStatus(RUNNING as never, true);
    render(
      <div className="bonsai-decky-tabs-root" data-bonsai-active-tab="settings">
        <JobBar />
      </div>,
    );
    expect(leftsAt(screen.getByLabelText(BAR_CANCEL), steamRingWorld)).toEqual(["held", "held", "out"]);
    act(() => publishJob("kb-download", { title: "Updating the library", stoppingTitle: "Stopping", line1: "", line2: "", sites: "", fraction: null }, () => {}, Date.now() + 10));
    expect(leftsAt(screen.getByLabelText("Cancel: Updating the library"), steamRingWorld)).toEqual(["moved"]);
    expect(leftsAt(screen.getByLabelText("Show the other running job"), steamRingWorld)).toEqual(["held", "held", "out"]);
  });
});

describe("the bar and the help strip", () => {
  it("the bar takes its 56 px off the pane, so the strip's dock, placed from the pane's bottom, ends where the bar starts", () => {
    expect(JOB_BAR_HEIGHT_PX).toBe(56);
    const css = buildJobLookSection();
    expect(css).toContain(`height: ${JOB_BAR_HEIGHT_PX}px !important;`);
    expect(css).toContain("flex: none !important;");
    expect(css).toContain(`height: calc(var(--bonsai-tab-body-height, 100%) - ${JOB_BAR_HEIGHT_PX}px) !important;`);
    // The box is 500 tall; with the bar the pane ends 56 above its bottom. The dock is placed from the pane's bottom.
    const rect = (top: number, bottom: number) => ({ top, bottom, left: 0, right: 300, width: 300, height: bottom - top, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
    const real = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      if (this.classList.contains("bonsai-decky-tabs-root")) return rect(0, 500);
      if (this.classList.contains("Tabs_TabContentsScroll")) return rect(24, 500 - JOB_BAR_HEIGHT_PX);
      return real.call(this);
    };
    try {
      noteOllamaSetupStatus(RUNNING as never, true);
      const { container } = render(
        <div className="bonsai-decky-tabs-root" data-bonsai-active-tab="ollama">
          <div className="Tabs_TabContentsScroll">
            <TabHelpStrip tab="ollama" />
          </div>
          <JobBar />
        </div>,
      );
      const dock = container.querySelector<HTMLElement>(".bonsai-fold-dock")!;
      expect(dock.style.getPropertyValue("--bonsai-fold-dock-bottom")).toBe(`${JOB_BAR_HEIGHT_PX}px`);
      expect(container.querySelector(BAR)).not.toBeNull();
    } finally {
      HTMLElement.prototype.getBoundingClientRect = real;
    }
  });
});
