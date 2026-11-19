/**
 * Title: The recent-screenshots picker takes the ring when it opens and gives it back when it closes
 * Purpose: Pin plan 94 block 8's finding (workshop:test-evidence/plan94-P94-SCREENSHOT-try2.json): after the
 *          paperclip menu's A opened the picker, nothing in it could hold the ring. Now it registers itself and
 *          its grid as places the ring can be sent to, sends it into the grid once pictures are listed (to its own
 *          box when there are none), and Back, B (Escape on a keyboard) and picking a picture all close the picker
 *          and hand the ring to the question box.
 * Used for: MainTabScreenshotBrowser.tsx.
 * Does not: Fire Steam's own B or D-pad events (the test stand-in for Decky's UI drops them), see whether Steam
 *           really moved the ring, or prove the fix on the Deck. It owes Deck row P96-F5-PICKER.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MainTabScreenshotBrowser, type MainTabScreenshotBrowserProps } from "./MainTabScreenshotBrowser";
import type { ScreenshotItem } from "../../types/bonsaiUi";
import * as registry from "../../shared/dpad/navFocusRegistry";
import { resetUiDocument } from "../../shared/dpad/uiDocument";

vi.mock("@decky/ui", async () => import("../../test-harness/fakeDeckyUi"));

/* The clipboard read is the slow step (it can take seconds on the Deck): each test says when it answers. */
let clipboardAnswer: (text: string) => void = () => {};
let clipboardRead: Promise<string> = Promise.resolve("");
vi.mock("./clipboardStash", async () => {
  const actual = await vi.importActual<typeof import("./clipboardStash")>("./clipboardStash");
  return { ...actual, readClipboardText: vi.fn(() => clipboardRead) };
});
/* One read in flight: every press made before it answers waits on the same answer, as the real read would. */
const startClipboardRead = () => {
  clipboardRead = new Promise<string>((resolve) => (clipboardAnswer = resolve));
};

/* The real registry, with the three calls the picker makes watched (and still doing their real work). */
vi.mock("../../shared/dpad/navFocusRegistry", async () => {
  const actual = await vi.importActual<typeof import("../../shared/dpad/navFocusRegistry")>(
    "../../shared/dpad/navFocusRegistry",
  );
  return {
    ...actual,
    registerNavFocus: vi.fn((...args: Parameters<typeof actual.registerNavFocus>) => actual.registerNavFocus(...args)),
    unregisterNavFocus: vi.fn((...args: Parameters<typeof actual.unregisterNavFocus>) =>
      actual.unregisterNavFocus(...args),
    ),
    takeNavFocus: vi.fn((...args: Parameters<typeof actual.takeNavFocus>) => actual.takeNavFocus(...args)),
  };
});

const registerSpy = vi.mocked(registry.registerNavFocus);
const unregisterSpy = vi.mocked(registry.unregisterNavFocus);
const takeSpy = vi.mocked(registry.takeNavFocus);

const shot = (name: string): ScreenshotItem => ({
  path: `/home/deck/.steam/screenshots/${name}`,
  name,
  mtime: 1_760_000_000,
  size_bytes: 123_456,
  source: "steam",
});

function propsFor(overrides: Partial<MainTabScreenshotBrowserProps> = {}): MainTabScreenshotBrowserProps {
  return {
    fullBleedRowStyle: {},
    presetButtonSurface: {},
    screenshotBrowserHostRef: { current: null },
    onCloseScreenshotBrowser: vi.fn(),
    loadRecentScreenshots: vi.fn(async () => {}),
    mediaError: "",
    mediaLibraryEnabled: true,
    recentScreenshots: [shot("newest.jpg"), shot("older.jpg")],
    isLoadingRecentScreenshots: false,
    onSelectRecentScreenshot: vi.fn(),
    setUnifiedInput: vi.fn(),
    ...overrides,
  };
}

/** Run the zero-delay timers the picker sets after it paints. */
const afterPaint = () => vi.advanceTimersByTime(0);
const wasTaken = (id: string) => takeSpy.mock.calls.some((c) => c[0] === id);

beforeEach(() => {
  registry.resetNavFocusRegistry();
  resetUiDocument();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
  registry.resetNavFocusRegistry();
});

describe("the picker's places for the ring", () => {
  it("registers the box and the grid when it opens, and unregisters both when it closes", () => {
    const { unmount } = render(<MainTabScreenshotBrowser {...propsFor()} />);
    const registered = registerSpy.mock.calls.map((c) => c[0]);
    expect(registered).toContain("screenshot-browser");
    expect(registered).toContain("screenshot-grid");
    expect(unregisterSpy).not.toHaveBeenCalled();

    unmount();
    const unregistered = unregisterSpy.mock.calls.map((c) => c[0]);
    expect(unregistered).toContain("screenshot-browser");
    expect(unregistered).toContain("screenshot-grid");
  });
});

describe("where the ring goes when the picker opens", () => {
  it("into the grid once pictures are listed", () => {
    render(<MainTabScreenshotBrowser {...propsFor()} />);
    afterPaint();
    expect(wasTaken("screenshot-grid")).toBe(true);
  });

  it("into the picker's own box when there are no pictures, never the grid", () => {
    render(<MainTabScreenshotBrowser {...propsFor({ recentScreenshots: [] })} />);
    afterPaint();
    expect(wasTaken("screenshot-browser")).toBe(true);
    expect(wasTaken("screenshot-grid")).toBe(false);
  });

  it("tries the grid again when the pictures arrive after the box", () => {
    const { rerender } = render(<MainTabScreenshotBrowser {...propsFor({ recentScreenshots: [] })} />);
    afterPaint();
    expect(wasTaken("screenshot-grid")).toBe(false);
    rerender(<MainTabScreenshotBrowser {...propsFor()} />);
    afterPaint();
    expect(wasTaken("screenshot-grid")).toBe(true);
  });
});

describe("closing the picker puts the ring on the question box", () => {
  it("Back closes the picker, then hands the ring to the question box", () => {
    const props = propsFor();
    render(<MainTabScreenshotBrowser {...props} />);
    afterPaint();
    takeSpy.mockClear();

    fireEvent.click(screen.getByLabelText("Back"));
    expect(props.onCloseScreenshotBrowser).toHaveBeenCalledTimes(1);
    expect(wasTaken("unified-input")).toBe(false); // not before the picker is gone
    afterPaint();
    expect(wasTaken("unified-input")).toBe(true);
  });

  it("Escape on the picker does the same", () => {
    const props = propsFor();
    const { container } = render(<MainTabScreenshotBrowser {...props} />);
    afterPaint();
    takeSpy.mockClear();

    fireEvent.keyDown(container.querySelector(".bonsai-full-bleed-row")!, { key: "Escape" });
    expect(props.onCloseScreenshotBrowser).toHaveBeenCalledTimes(1);
    afterPaint();
    expect(wasTaken("unified-input")).toBe(true);
  });

  it("picking a picture hands that picture on", () => {
    const props = propsFor();
    render(<MainTabScreenshotBrowser {...props} />);
    afterPaint();

    fireEvent.click(screen.getByAltText("older.jpg").closest("button")!);
    expect(props.onSelectRecentScreenshot).toHaveBeenCalledTimes(1);
    expect(props.onSelectRecentScreenshot).toHaveBeenCalledWith(props.recentScreenshots[1]);
  });
});

describe("Paste clipboard while the clipboard is being read", () => {
  it("pastes once when it is pressed twice before the read answers", async () => {
    const setUnifiedInput = vi.fn();
    const onCloseScreenshotBrowser = vi.fn();
    render(<MainTabScreenshotBrowser {...propsFor({ setUnifiedInput, onCloseScreenshotBrowser })} />);
    startClipboardRead();
    const paste = screen.getByText("Paste clipboard");
    fireEvent.click(paste);
    fireEvent.click(paste);
    await act(async () => {
      clipboardAnswer("hello from the clipboard");
      await Promise.resolve();
    });
    expect(setUnifiedInput).toHaveBeenCalledTimes(1);
    expect(onCloseScreenshotBrowser).toHaveBeenCalledTimes(1);
  });

  it("can paste again after a read that came back empty (the guard is always released)", async () => {
    const setUnifiedInput = vi.fn();
    render(<MainTabScreenshotBrowser {...propsFor({ setUnifiedInput })} />);
    startClipboardRead();
    const paste = screen.getByText("Paste clipboard");
    fireEvent.click(paste);
    await act(async () => {
      clipboardAnswer("");
      await Promise.resolve();
    });
    expect(setUnifiedInput).not.toHaveBeenCalled();
    startClipboardRead();
    fireEvent.click(paste);
    await act(async () => {
      clipboardAnswer("second try");
      await Promise.resolve();
    });
    expect(setUnifiedInput).toHaveBeenCalledTimes(1);
  });
});
