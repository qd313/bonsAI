/**
 * Title: The last Settings, Developer, Ollama and Permissions buttons show the same white ring
 *
 * Purpose: Pin roadmap "Focus ring styling is inconsistent". The second Deck walk
 *          (plan81-P81-RING-WALK-SETTINGS-DEV.json) found two controls still without the plugin's
 *          ring: "Apply UI scale" showed the browser's default outline, and "Jump to Steam Input"
 *          showed no outline at all. Both are plain Steam controls with no ring class. The same
 *          holes were found on their neighbours: Reset to automatic, the Developer tab's other
 *          Steam button rows, the saved-host buttons, Back on Permissions, and the Open-in-Settings
 *          jump buttons. Every one now draws the same 2px white ring.
 * Used for: Apply UI scale, Reset to automatic, the four Developer ButtonItem rows, the saved
 *          Ollama host buttons, the Permissions Back button.
 * How it works: the real tab with the plugin's real stylesheet inside `.bonsai-scope`. Steam's
 *          `gpfocus` class is put on the control (and, for a Steam button row, on the row around it
 *          too) and the computed outline is read back: one 2px solid white ring, on one element
 *          only. Steam marks either the row or the button inside it, so both are tried.
 * Does not: See pixels, or know which element Steam really marks on a ButtonItem row. The Deck walk
 *           on each tab is the check that the ring is not clipped.
 */
import { render } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DeveloperTab } from "./DeveloperTab";
import { OllamaSavedHostsRows } from "./OllamaSavedHostsRows";
import { PermissionsTab } from "./PermissionsTab";
import { SettingsTab } from "./SettingsTab";
import { developerProps, outlines, settingsProps } from "./ringTestProps";
import { buildBonsaiScopeStylesheet } from "../styles/bonsaiScopeStylesheet";

/** The ring the Deck check looks for: 2px, solid, white at 0.88. */
function isWhiteRing(outline: string): boolean {
  return /\b2px\b/.test(outline) && /solid/.test(outline) && /255,\s*255,\s*255,\s*0\.88/.test(outline);
}

function byText(root: HTMLElement, re: RegExp): HTMLElement {
  const hit = Array.from(root.querySelectorAll("button")).find((b) => re.test(b.textContent ?? ""));
  if (!hit) throw new Error(`no button matching ${re}`);
  return hit as HTMLElement;
}

describe("the last Steam buttons on the four tabs draw the white ring", () => {
  let sheet: HTMLStyleElement;
  beforeAll(() => {
    sheet = document.createElement("style");
    sheet.textContent = buildBonsaiScopeStylesheet();
    document.head.appendChild(sheet);
  });
  afterAll(() => sheet.remove());

  it("Apply UI scale and Reset to automatic show the ring when Steam marks them", () => {
    const props = { ...settingsProps(), showDeveloperTab: true, uiScaleAutoEnabled: false, uiScaleManualProfile: "handheld" as const };
    const { container } = render(
      <div className="bonsai-scope">
        <SettingsTab {...props} />
      </div>,
    );
    for (const re of [/^Apply UI scale$/, /^Reset to automatic$/]) {
      const button = byText(container, re);
      const [ring] = outlines([button], button);
      expect(isWhiteRing(ring!), `${re}: ${ring}`).toBe(true);
      expect(outlines([button], null)[0], `${re}: no ring when not focused`).toBe("");
    }
  });

  it("each Developer Steam button row shows one ring, whether Steam marks the row or the button", () => {
    const { container } = render(
      <div className="bonsai-scope">
        <DeveloperTab
          {...developerProps()}
          onSteamInputPhase1Jump={() => {}}
          onInstallSeedKnowledgeBase={async () => {}}
          capturedErrors={["boom"]}
          devFrozenTestChips={["one"]}
        />
      </div>,
    );
    const labels = [
      /^Jump to Steam Input/,
      /^Install seed knowledge base$/,
      /^Clear \(1\)$/,
      /^Clear frozen test chips$/,
    ];
    for (const re of labels) {
      const button = byText(container, re);
      // The stub has no Field around the button; Steam's real one is the row that can carry the mark.
      const row = document.createElement("div");
      row.className = "Field Focusable";
      button.parentElement!.insertBefore(row, button);
      row.appendChild(button);
      // Steam marks the button itself.
      const [onButton, rowWhenButton] = outlines([button, row], button);
      expect(isWhiteRing(onButton!), `${re}: button ring (${onButton})`).toBe(true);
      expect(rowWhenButton, `${re}: row not ringed too`).not.toMatch(/solid/);
      // Steam marks the row around the button.
      const [buttonWhenRow, onRow] = outlines([button, row], row);
      expect(isWhiteRing(onRow!), `${re}: row ring (${onRow})`).toBe(true);
      expect(buttonWhenRow, `${re}: button not ringed too`).not.toMatch(/solid/);
      // Steam marks both at once: still one ring, on the inner part.
      row.classList.add("gpfocus");
      button.classList.add("gpfocus");
      const both = [row, button].map((el) => getComputedStyle(el).outline);
      row.classList.remove("gpfocus");
      button.classList.remove("gpfocus");
      expect(both.filter((o) => /solid/.test(o)), `${re}: exactly one ring when both are marked`).toHaveLength(1);
    }
  });

  it("the saved Ollama host buttons show the ring", () => {
    const { container } = render(
      <div className="bonsai-scope">
        <OllamaSavedHostsRows
          namedOllamaHosts={[{ label: "Desk PC", host: "192.168.1.5" }]}
          setNamedOllamaHosts={() => {}}
          ollamaIp="192.168.1.5"
          onOllamaIpChange={() => {}}
          onPersistOllamaIp={() => {}}
        />
      </div>,
    );
    for (const re of [/^Desk PC$/, /^Save current PC address as quick host$/]) {
      const button = byText(container, re);
      const [ring] = outlines([button], button);
      expect(isWhiteRing(ring!), `${re}: ${ring}`).toBe(true);
    }
  });

  it("the Permissions Back button shows the ring", () => {
    const { container } = render(
      <div className="bonsai-scope">
        <PermissionsTab
          capabilities={{ filesystem_write: false, media_library_access: false, steam_logs_read: false, steam_web_api: false, microphone_access: false, internet_downloads: false }}
          setCapabilities={() => {}}
          permissionJumpReturnTab="settings"
          onReturnFromPermissionJump={() => {}}
        />
      </div>,
    );
    const button = byText(container, /^Back to /);
    const [ring] = outlines([button], button);
    expect(isWhiteRing(ring!), ring).toBe(true);
  });
});
