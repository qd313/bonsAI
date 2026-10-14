/**
 * Title: Text size reaches the words Steam draws inside its own controls
 * Purpose: Plan 93 (M10). On the Deck the words inside Steam's switches, buttons, section titles and
 *          the language dropdown stayed the same size at Small, Normal and Large, because Steam gives them a
 *          size of its own. The plugin now hands each of them to the control as a small element it sizes
 *          itself. This renders each changed control with the stubs drawing what the control is handed
 *          (the shared stubs print a node as text only), inside a box carrying the Text size step, reads the
 *          font size the browser would settle on for that element, and checks it is Steam's size today
 *          (16 for a name, button, title or selected language; 12 for a description) times the step: 14.4 /
 *          16 / 18.4 and 10.8 / 12 / 13.8. One test per area: the shared switch row, Permissions, the two
 *          Developer buttons, the About titles and the language dropdown.
 * Used for: scaledSteamWords.tsx, DenseRow.tsx, PermissionsTab.tsx, developerRowsDiagnostics.tsx,
 *           AboutTab.tsx, AboutReplyLanguageSection.tsx.
 * Does not: Lay anything out, or check what Steam's own stylesheet does with the element it is handed
 *           (that, and whether a row wraps differently at Large, is the Deck check, row P93-M10).
 */
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type React from "react";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const R = await import("react");
  const div = (attr: string, child: unknown) => R.createElement("div", { [attr]: "" }, child as React.ReactNode);
  // Each draws the node it is handed in a div of its own, which is what Steam does with a node.
  const ToggleField = (p: { label?: unknown; description?: unknown }) =>
    R.createElement("div", { "data-decky-ui": "ToggleField" }, div("data-test-label", p.label), p.description === undefined ? null : div("data-test-desc", p.description));
  const PanelSection = ({ title, children }: { title?: unknown; children?: React.ReactNode }) =>
    R.createElement("div", { "data-decky-ui": "PanelSection" }, div("data-test-section-title", title), children);
  const Dropdown = ({ renderButtonValue }: { renderButtonValue?: (el: unknown) => unknown }) =>
    div("data-test-dropdown-value", renderButtonValue ? renderButtonValue(null) : null);
  return { ...stubs, ToggleField, PanelSection, Dropdown };
});

import { AboutTab } from "./AboutTab";
import { PermissionsTab } from "./PermissionsTab";
import { diagnosticsRows, kbRows } from "./developerRowsDiagnostics";
import { DenseSwitchRow } from "../features/folded-tabs/DenseRow";
import { TEXT_SCALE, withTextScale } from "../data/chatTextSize";
import type { ChatTextSize } from "../data/bonsaiSettingsSchema";
import type { BonsaiCapabilities } from "../data/bonsaiSettingsSchema";
import { makeFontSizeReader } from "../test-harness/settledFontSize";

const SIZES: ChatTextSize[] = ["small", "normal", "large"];
const read = makeFontSizeReader("");

/** The font size the browser settles on for the first element inside `root` that matches `selector`. */
function sizeOf(root: HTMLElement, selector: string, words: string | RegExp): number {
  const hit = Array.from(root.querySelectorAll<HTMLElement>(selector)).find((el) =>
    typeof words === "string" ? el.textContent === words : words.test(el.textContent ?? ""),
  );
  expect(hit, `${selector} holding ${String(words)}`).toBeTruthy();
  const span = hit!.querySelector<HTMLElement>("[data-bonsai-scaled-words]");
  expect(span, `${String(words)} is handed over as a scaled element`).toBeTruthy();
  return read(span!);
}

function inBox(size: ChatTextSize, node: React.ReactNode) {
  return render(
    <div className="bonsai-scope" style={withTextScale({}, size)}>
      {node}
    </div>,
  );
}

const ALL_OFF: BonsaiCapabilities = {
  filesystem_write: false,
  media_library_access: false,
  steam_logs_read: false,
  steam_web_api: false,
  microphone_access: false,
  internet_downloads: false,
};

describe("Text size reaches the words inside Steam's own controls", () => {
  it("the shared switch row's name follows Text size (16 at Normal) and keeps its plain words for the strip", () => {
    for (const size of SIZES) {
      const { container, unmount } = inBox(size, <DenseSwitchRow label="Terse mode" help="Speed mode only." checked={false} onChange={() => {}} />);
      expect(sizeOf(container, "[data-test-label]", "Terse mode")).toBeCloseTo(16 * TEXT_SCALE[size], 5);
      expect(container.querySelector("[data-bonsai-help-label]")!.getAttribute("data-bonsai-help-label")).toBe("Terse mode");
      unmount();
    }
  });

  it("Permissions: the title, the five switch names and the five descriptions follow Text size (16 and 12 at Normal)", () => {
    for (const size of SIZES) {
      const { container, unmount } = inBox(size, <PermissionsTab capabilities={ALL_OFF} setCapabilities={() => {}} />);
      expect(sizeOf(container, "[data-test-section-title]", "Permissions")).toBeCloseTo(16 * TEXT_SCALE[size], 5);
      const labels = container.querySelectorAll("[data-test-label]");
      const descriptions = container.querySelectorAll("[data-test-desc]");
      expect(labels).toHaveLength(5);
      expect(descriptions).toHaveLength(5);
      labels.forEach((el) => expect(read(el.querySelector("[data-bonsai-scaled-words]")!)).toBeCloseTo(16 * TEXT_SCALE[size], 5));
      descriptions.forEach((el) => expect(read(el.querySelector("[data-bonsai-scaled-words]")!)).toBeCloseTo(12 * TEXT_SCALE[size], 5));
      unmount();
    }
  });

  it("Developer: the words in the Install seed knowledge base and Jump to Steam Input buttons follow Text size (16 at Normal)", () => {
    const rows = [
      ...kbRows({ seedKbBusy: false, onInstall: () => {}, hybrid: false, setHybrid: () => {} }),
      ...diagnosticsRows({
        hud: false,
        setHud: () => {},
        warm: false,
        setWarm: () => {},
        onSteamInputPhase1Jump: () => {},
        capturedErrors: [],
        onClearErrors: () => {},
      }),
    ];
    for (const size of SIZES) {
      const { container, unmount } = inBox(size, <>{rows.map((r) => <div key={r.key}>{r.render({})}</div>)}</>);
      for (const words of ["Install seed knowledge base", "Jump to Steam Input (running game)"]) {
        const button = Array.from(container.querySelectorAll<HTMLElement>("button")).find((b) => b.textContent === words);
        expect(button, words).toBeTruthy();
        expect(read(button!.querySelector("[data-bonsai-scaled-words]")!)).toBeCloseTo(16 * TEXT_SCALE[size], 5);
      }
      unmount();
    }
  });

  it("About: the section titles and the language dropdown's selected words follow Text size (16 at Normal)", () => {
    for (const size of SIZES) {
      const { container, unmount } = inBox(
        size,
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
      const want = 16 * TEXT_SCALE[size];
      expect(sizeOf(container, "[data-test-section-title]", /^About bonsAI/)).toBeCloseTo(want, 5);
      expect(sizeOf(container, "[data-test-section-title]", "Reply language")).toBeCloseTo(want, 5);
      expect(sizeOf(container, "[data-test-section-title]", "Links")).toBeCloseTo(want, 5);
      expect(sizeOf(container, "[data-test-dropdown-value]", "Follow system")).toBeCloseTo(want, 5);
      // The version beside the title keeps its own size (11 times the step), not 16 twice.
      const version = container.querySelector<HTMLElement>("[data-bonsai-about-version]")!;
      expect(version.querySelector("[data-bonsai-scaled-words]")).toBeNull();
      unmount();
    }
  });
});
