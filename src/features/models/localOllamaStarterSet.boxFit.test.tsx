/**
 * Title: The starter-models box on a fresh install fits the Deck's own screen
 *
 * Purpose: The box a first "Install Ollama" opens on a Deck with no models (useLocalOllamaSetupFlow), drawn exactly as
 * that hook asks for it, with Internet downloads off as on every fresh install: "Turn on internet downloads?", the
 * line saying where Ollama downloads from, the model and speech lines, the starter set's words and the downloads-off
 * paragraph. On 2026-10-25 it was taller than the Deck's screen: its title and the Ollama line sat above the top edge
 * and Up did nothing (workshop:test-evidence/readme-STARTER-BOX-TOO-TALL.md). Laid out here in the Deck's measured
 * numbers with Steam's glide onto the ring's button (deckPopupFit.ts): it opens with the title and the three site
 * lines on screen, a "More below" sign and the ring on Cancel; Down reads to the last paragraph a step at a time with
 * the site lines pinned on screen throughout and no line skipped, on Normal and on Large text; Up comes back; B
 * installs nothing. Every download box also keeps its 10-point gap above the buttons now that the words scroll.
 *
 * Does not: open a real Steam box or wrap lines: the words' own height (412 points) is read off the Deck's picture,
 * 20 lines of 17.4 and 8 gaps of 8. The look on a PC stand-in and the maintainer's check (P103-STARTER-BOX-01) do the
 * rest.
 */
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, renderHook, waitFor } from "@testing-library/react";

const hoisted = vi.hoisted(() => ({ modal: null as unknown }));

vi.mock("@decky/ui", async () => {
  const fake = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  const showModal = (element: unknown) => {
    hoisted.modal = element;
    return { Close: () => {} };
  };
  return { ...fake, Focusable: SteamRingFocusable, showModal };
});
vi.mock("@decky/api", () => ({ toaster: { toast: () => {} } }));
vi.mock("../../shared/deckyCall", () => ({
  DECKY_RPC_TIMEOUT_MS: 1000,
  callDeckyWithTimeout: async () => ({}),
  formatDeckyRpcError: (e: unknown) => String(e),
}));
vi.mock("../plugin-shell/bonsaiSessionSurvival", () => ({ patchPendingSessionSettingsSnapshot: () => {} }));

import { askThenInstallStarterSet, starterSetBoxBody, starterSetNotices } from "./localOllamaStarterSet";
import { confirmDownload, downloadNoticeLine, setDownloadPermissionBridge } from "../downloads/downloadNotice";
import { MEANING_SEARCH_MODEL_NOTICE, OLLAMA_PROGRAM_NOTICE } from "../downloads/downloadSites";
import { DEFAULT_CAPABILITIES } from "../settings/bonsaiSettingsSchema";
import { steamRingHolder } from "../../test-harness/steamRing";
import { WALK_RULES } from "../../test-harness/deckAnswerWalk";
import { layOutDeckPopup, walkWords } from "../../test-harness/deckPopupFit";
import { TEXT_SCALE_VAR } from "../../shared/text-size/chatTextSize";
import { usePublishTextScale } from "../../shared/text-size/usePublishTextScale";

/**
 * The words' own height with no limit, read off the 2026-10-25 picture: 20 lines and 8 gaps of 8 (412 points on
 * Normal, 17.4 a line). The three site lines, two lines each at the Deck's width, with two gaps of 8 and 8 under them,
 * are pinned at the top: 128.4 points on Normal.
 */
const STARTER_WORDS = { lines: 20, gapsPx: 64 };
const SITE_LINES = { lines: 6, gapsPx: 24 };
const OFF_TITLE = "Turn on internet downloads?";

function downloads(on: boolean) {
  setDownloadPermissionBridge({
    enabled: on,
    kidsLockActive: false,
    capabilities: { ...DEFAULT_CAPABILITIES, internet_downloads: on },
    setCapabilities: vi.fn(),
    onBeforeDeckyModal: vi.fn(),
    onCompleteDeckyModalClose: (close: () => void) => close(),
  });
}

/** The box useLocalOllamaSetupFlow opens after a first "Install Ollama", asked for the same way. */
function askStarterAfterInstall(downloadsOff: boolean): Promise<boolean> {
  return confirmDownload(starterSetNotices({ withOllama: true }), {
    always: true,
    title: "Also install the starter models?",
    body: starterSetBoxBody(true, downloadsOff),
    actionLabel: "Install Ollama and the starter models",
  });
}

/** Draw the box the plugin handed to Steam, with the ring where it opens. */
async function drawHandedBox() {
  const element = hoisted.modal as React.ReactElement<{ onCancel: () => void }>;
  const view = render(element);
  const cancel = view.getByText("Cancel");
  await waitFor(() => expect(steamRingHolder()).toBe(cancel));
  return { view, cancel, pressB: () => element.props.onCancel() };
}

beforeEach(() => {
  hoisted.modal = null;
  window.localStorage.clear();
  document.body.innerHTML = "";
  document.documentElement.style.removeProperty(TEXT_SCALE_VAR);
});

/** The fresh-install box with downloads off, open on the Deck's screen with the ring on Cancel. */
async function openFreshInstallBox(rule?: (typeof WALK_RULES)[number]) {
  downloads(false);
  const answer = askStarterAfterInstall(true);
  const drawn = await drawHandedBox();
  const box = layOutDeckPopup(drawn.view.container, OFF_TITLE, { words: STARTER_WORDS, pinned: SITE_LINES, rule });
  box.glide();
  return { ...drawn, box, answer };
}

describe("the starter-models box on a fresh install, on the Deck's own screen", () => {
  it.each(WALK_RULES.map((rule) => [rule ?? "no glide", rule] as const))(
    "opens with its title and the lines saying where each download comes from on screen, a More below sign, and the ring on Cancel (glide %s)",
    async (_name, rule) => {
      const { box, cancel } = await openFreshInstallBox(rule);
      expect(box.shows(box.titleBox())).toBe(true);
      // The words open at their top, and the site lines are pinned there: Ollama's own line first.
      const sites = Array.from(box.words.querySelectorAll("[data-bonsai-download-notice-line]"));
      expect(sites[0]?.textContent).toBe(downloadNoticeLine(OLLAMA_PROGRAM_NOTICE));
      expect(sites.every((line) => (line.parentElement as HTMLElement).style.position === "sticky")).toBe(true);
      expect(box.pinnedPx).toBeCloseTo(128.4, 5);
      expect(box.shows(box.pinnedBox())).toBe(true);
      // Under them, the starter set's own words begin, and the sign says there is more.
      expect(box.words.scrollTop).toBe(0);
      expect(box.readable(box.wordsAt(box.pinnedPx, box.pinnedPx + box.line))).toBe(true);
      expect(box.moreSign()).toBe("▾ More below (press Down)");
      expect(box.shows(box.buttonsBox())).toBe(true);
      expect(steamRingHolder()).toBe(cancel);
    },
  );

  it.each(WALK_RULES.map((rule) => [rule ?? "no glide", rule] as const))(
    "Down reads to the downloads-off paragraph at the end with the site lines still on screen, Up comes back, B installs nothing (glide %s)",
    async (_name, rule) => {
      const { box, cancel, pressB, answer } = await openFreshInstallBox(rule);
      const natural = 412;
      const down = walkWords(box, "onMoveDown");
      expect(down.problems).toEqual([]);
      expect(down.ended).toBe(true);
      // 412 - 222 = 190 to scroll, 64 a press: three presses, each shorter than the 93.6 that shows under the sites.
      expect(down.places).toEqual([0, 64, 128, natural - box.parts.words]);
      expect(box.window).toBeCloseTo(93.6, 5);
      expect(box.words.textContent).toMatch(/Internet downloads are off\. .* You can turn them off in Permissions\.$/);
      expect(box.readable(box.wordsAt(natural - 2 * box.line, natural))).toBe(true);
      expect(box.moreSign()).toBe("");

      const up = walkWords(box, "onMoveUp");
      expect(up.problems).toEqual([]);
      expect(box.words.scrollTop).toBe(0);
      expect(box.moreSign()).toBe("\u25be More below (press Down)");
      expect(steamRingHolder()).toBe(cancel);

      pressB();
      await expect(answer).resolves.toBe(false);
    },
  );

  it("on Large text, the largest, it still fits and Down still skips no line under the bigger site lines", async () => {
    const published = renderHook(() => usePublishTextScale("large"));
    const { box } = await openFreshInstallBox("top");
    expect(box.shows(box.titleBox())).toBe(true);
    // The title grows from 23.2 to 26.68; the site lines to 6 x 20.01 + 24 = 144.06; 222 - 144.06 = 77.94 still shows.
    expect(box.pinnedPx).toBeCloseTo(144.06, 5);
    expect(box.window).toBeGreaterThan(64);
    const down = walkWords(box, "onMoveDown");
    expect(down.problems).toEqual([]);
    expect(down.ended).toBe(true);
    published.unmount();
  });

  it("every download box keeps its 10-point gap above the buttons now that the words scroll", async () => {
    const gapOf = async (title: string, ask: () => Promise<unknown>) => {
      document.body.innerHTML = "";
      void ask();
      const { view } = await drawHandedBox();
      return layOutDeckPopup(view.container, title, { words: 100 }).parts.wordsGap;
    };
    downloads(false);
    expect(await gapOf(OFF_TITLE, () => askStarterAfterInstall(true))).toBe(10);
    downloads(true);
    expect(await gapOf("Also install the starter models?", () => askStarterAfterInstall(false))).toBe(10);
    expect(await gapOf("Install the starter set?", askThenInstallStarterSet)).toBe(10);
    const meaning = `Also download the meaning-search model (${MEANING_SEARCH_MODEL_NOTICE.size})?`;
    const askMeaning = () =>
      confirmDownload([MEANING_SEARCH_MODEL_NOTICE], { always: true, title: meaning, body: "Better note matching.", actionLabel: "Download" });
    expect(await gapOf(meaning, askMeaning)).toBe(10);
    expect(await gapOf("Download from the internet?", () => confirmDownload([OLLAMA_PROGRAM_NOTICE]))).toBe(10);
  });
});
