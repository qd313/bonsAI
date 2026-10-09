/**
 * Title: About tab support button size
 * Purpose: Pin the fix for roadmap "Settings' "Clear cache..." sits 16 pixels left of the other
 *          buttons, and About's support button is 192 pixels tall" -- the About half. On the Deck
 *          (docs/test-evidence/plan72-Z-FREEPLAY.json finding 14, runs/plan72-Z-about-sweep.json)
 *          "Support my Steam Sale habit" was a 180 x 192 button, because the PayPal QR code was
 *          drawn inside it, while GitHub, Built on Ollama! and Bugs & Feature Requests are all
 *          268 x 42.
 * Used for: AboutTab.tsx's Links section.
 * Does not: Measure the button -- jsdom has no layout. It pins what decides the size: the button is
 *           built exactly like its three neighbours and holds only its words, and the QR code is
 *           drawn outside it. The Deck check this owes: a sweep of the About tab reads the support
 *           button at 268 x 42, x 64, like the other three, with the QR code fully on screen while
 *           the ring is on the button.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { toaster } from "@decky/api";
import { describe, expect, it } from "vitest";

import { AboutTab } from "./AboutTab";
import { PLUGIN_VERSION } from "../pluginVersion";

function renderAbout() {
  return render(
    <AboutTab
      githubRepoUrl="https://example.invalid/github"
      ollamaRepoUrl="https://example.invalid/ollama"
      githubIssuesUrl="https://example.invalid/issues"
      replyLanguage="follow_system"
      onReplyLanguageChange={() => {}}
      effectiveLang="en"
      steamClientLanguageLabel="English"
      t={(key) => key}
    />,
  );
}

const buttonOf = (words: string) => screen.getByText(words).closest("button") as HTMLButtonElement;

describe("About tab: the support button is sized like the other link buttons", () => {
  it("holds only its words, with no picture inside it", () => {
    renderAbout();
    const support = buttonOf("Support my Steam Sale habit");
    expect(support.querySelector("img")).toBeNull();
    expect(support.textContent).toBe("Support my Steam Sale habit");
  });

  it("is built exactly like GitHub, Built on Ollama! and Bugs & Feature Requests", () => {
    renderAbout();
    const shape = (button: HTMLButtonElement) => ({
      // Inside its row like the others -- no narrower box around it. The only thing between is the
      // plain ring host div every link button now has, so the white focus ring shows on each.
      host: button.parentElement?.className,
      parent: button.parentElement?.parentElement?.getAttribute("data-decky-ui"),
      layout: button.getAttribute("layout"),
      fontSize: (button.firstElementChild as HTMLElement | null)?.style.fontSize,
    });
    const neighbour = shape(buttonOf("GitHub"));
    expect(neighbour).toEqual({ host: "bonsai-settings-item-ring-host", parent: "PanelSectionRow", layout: "below", fontSize: "13px" });
    expect(shape(buttonOf("Built on Ollama!"))).toEqual(neighbour);
    expect(shape(buttonOf("Bugs & Feature Requests"))).toEqual(neighbour);
    expect(shape(buttonOf("Support my Steam Sale habit"))).toEqual(neighbour);
  });

  it("still shows the QR code, outside any button, just above the support button", () => {
    // Above rather than below: the ring can only stop on the button, so the page scrolls to the
    // button, and a code under the tab's last button could be left off the bottom of the screen.
    renderAbout();
    const qr = screen.getByAltText("Support on PayPal — Support my Steam Sale habit");
    expect(qr.closest("button")).toBeNull();
    const support = buttonOf("Support my Steam Sale habit");
    expect(qr.compareDocumentPosition(support) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const buttonsBetween = Array.from(document.querySelectorAll("button")).filter(
      (b) =>
        qr.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING &&
        b.compareDocumentPosition(support) & Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(buttonsBetween).toEqual([]);
  });

  it("still opens the PayPal page when pressed", () => {
    renderAbout();
    fireEvent.click(buttonOf("Support my Steam Sale habit"));
    // The test harness has no Steam browser, so the press lands on the toast fallback, which
    // names the page it could not open.
    expect(toaster.toast).toHaveBeenCalledWith(
      expect.objectContaining({ body: "https://paypal.me/quentind313" }),
    );
  });
});

describe("About tab: shows the plugin version", () => {
  it("has a plain Version line equal to PLUGIN_VERSION, not a button", () => {
    renderAbout();
    const line = screen.getByText(`Version ${PLUGIN_VERSION}`);
    expect(line.closest("button")).toBeNull();
  });
});
