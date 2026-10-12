/**
 * Title: The About tab's links: the walk and the QR stop
 * Purpose: Pin the D-pad rules of the three small link buttons beside the QR code (plan 91 § 6, "About (T3)"):
 *          Down the three buttons is Steam's own step (the first two carry no Down handler of their own, so
 *          nothing can swallow it); Down from the last button holds still (its handler claims the press);
 *          Right from any button lands on the QR; Left from the QR lands on the button the ring came from,
 *          the same height, even after the tab was rebuilt in between (closing a Decky popup rebuilds the
 *          tab, docs/lessons-learned.md § 3), and Up from the first button is left to Steam so it reaches
 *          Reply language; A on a button or on the QR opens that link, the QR's being the support page the old
 *          "Support my Steam Sale habit" button opened.
 * Used for: AboutLinks.tsx. The Deck check: Down walk GitHub, Built on Ollama!, Bugs & Feature Requests; Right
 *           lands on the QR; Left returns to the same button; Down at the end does not move; A on the QR opens
 *           the support page (plan 92, block 3).
 * Does not: Walk Steam's spatial navigation (AboutTab.walk.test.tsx does), or see pixels.
 */
import { act, render } from "@testing-library/react";
import { toaster } from "@decky/api";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const kit = await import("../test-harness/aboutDeckyUi");
  return { ...stubs, Focusable: kit.KeepNavFocusable, Button: kit.KeepNavButton, Dropdown: kit.StopDropdown };
});

import { pressNav } from "../test-harness/aboutDeckyUi";
import { AboutLinks, PAYPAL_SUPPORT_URL, recallAboutLinkButton, resetAboutLinksMemory } from "./AboutLinks";

const URLS = {
  githubRepoUrl: "https://example.invalid/github",
  ollamaRepoUrl: "https://example.invalid/ollama",
  githubIssuesUrl: "https://example.invalid/issues",
};

const linkButtons = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>("[data-bonsai-about-link]"));
const qrOf = (root: HTMLElement) => root.querySelector<HTMLElement>("[data-bonsai-about-qr]")!;

beforeEach(() => resetAboutLinksMemory());

describe("About links: the walk", () => {
  it("has three link buttons and the QR as a fourth stop of its own, outside the column of buttons", () => {
    const { container } = render(<AboutLinks {...URLS} />);
    const buttons = linkButtons(container);
    expect(buttons.map((b) => b.textContent)).toEqual(["GitHub", "Built on Ollama!", "Bugs & Feature Requests"]);
    const qr = qrOf(container);
    expect(qr).toBeTruthy();
    expect(buttons.some((b) => b.contains(qr) || qr.contains(b))).toBe(false);
    expect(container.querySelector(".bonsai-about-links-col")!.contains(qr)).toBe(false);
  });

  it("tells Steam how to walk it: the block is a row (buttons, then the QR) and the buttons are a column", () => {
    // With no flow set Steam walked nothing between the buttons: Down from GitHub was dead on the Deck
    // (plan 92, build 5d67f9d9). AboutTab.walk.test.tsx walks it; this pins the two flows by name.
    const { container } = render(<AboutLinks {...URLS} />);
    const block = container.querySelector<HTMLElement>("[data-bonsai-about-links]")!;
    const col = container.querySelector<HTMLElement>(".bonsai-about-links-col")!;
    expect(block.getAttribute("flow-children")).toBe("horizontal");
    expect(col.getAttribute("data-decky-ui")).toBe("Focusable");
    expect(col.getAttribute("flow-children")).toBe("vertical");
    expect(col.parentElement).toBe(block);
    expect(qrOf(container).closest(".bonsai-about-qr-wrap")!.parentElement).toBe(block);
    for (const b of linkButtons(container)) expect(b.closest(".bonsai-about-link-wrap")!.parentElement).toBe(col);
  });

  it("leaves Down on the first two buttons and Up on the first to Steam, and holds still on Down from the last", () => {
    const { container } = render(<AboutLinks {...URLS} />);
    const [github, ollama, bugs] = linkButtons(container);
    // No hand-written Down on the first two and no Up anywhere: Steam's own step walks the column and
    // leaves it upward to Reply language, so no press can be swallowed there. A press reaches the handlers on
    // the Focusable around a button (a Decky Button does not forward them), so the helper bubbles like Steam.
    expect(pressNav(github!, "onMoveDown")).toBe(false);
    expect(pressNav(ollama!, "onMoveDown")).toBe(false);
    for (const b of [github!, ollama!, bugs!, qrOf(container)]) expect(pressNav(b, "onMoveUp")).toBe(false);
    // The last button has nothing below it: the press is claimed, so the ring stays where it is.
    expect(pressNav(bugs!, "onMoveDown")).toBe(true);
  });

  it("Right from each button lands on the QR, and Left from the QR lands back on that button", () => {
    const { container } = render(<AboutLinks {...URLS} />);
    const buttons = linkButtons(container);
    const qr = qrOf(container);
    buttons.forEach((button, i) => {
      act(() => button.focus());
      expect(pressNav(button, "onMoveRight")).toBe(true);
      expect(document.activeElement).toBe(qr);
      expect(recallAboutLinkButton()).toBe(i);
      expect(pressNav(qr, "onMoveLeft")).toBe(true);
      expect(document.activeElement).toBe(button);
    });
  });

  it("Left from the QR goes back to the same height after the tab was rebuilt (a popup closing)", () => {
    const first = render(<AboutLinks {...URLS} />);
    const [, , bugs] = linkButtons(first.container);
    act(() => bugs!.focus());
    pressNav(bugs!, "onMoveRight");
    first.unmount();

    const second = render(<AboutLinks {...URLS} />);
    const rebuilt = linkButtons(second.container);
    const qr = qrOf(second.container);
    act(() => qr.focus());
    expect(pressNav(qr, "onMoveLeft")).toBe(true);
    // A memory kept in the component would have started again at the first button.
    expect(document.activeElement).toBe(rebuilt[2]);
  });

  it("holds still on Down from the QR too", () => {
    const { container } = render(<AboutLinks {...URLS} />);
    expect(pressNav(qrOf(container), "onMoveDown")).toBe(true);
  });
});

describe("About links: A opens the link", () => {
  it("A on the QR opens the support page, the one the old support button opened", () => {
    const { container } = render(<AboutLinks {...URLS} />);
    act(() => qrOf(container).click());
    expect(PAYPAL_SUPPORT_URL).toBe("https://paypal.me/quentind313");
    // The test harness has no Steam browser, so the press lands on the toast fallback, which names the page.
    expect(toaster.toast).toHaveBeenCalledWith(expect.objectContaining({ body: PAYPAL_SUPPORT_URL }));
  });

  it("A on each button opens its own address", () => {
    const { container } = render(<AboutLinks {...URLS} />);
    const bodies: string[] = [];
    for (const button of linkButtons(container)) {
      vi.mocked(toaster.toast).mockClear();
      act(() => button.click());
      bodies.push((vi.mocked(toaster.toast).mock.calls[0]![0] as { body: string }).body);
    }
    expect(bodies).toEqual([URLS.githubRepoUrl, URLS.ollamaRepoUrl, URLS.githubIssuesUrl]);
  });
});
