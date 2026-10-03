/**
 * Title: Wrapped Settings controls and the Steam Web API key field show one white ring
 *
 * Purpose: Pin roadmap "Some controls get only a thin grey frame, and the Steam Web API key field
 *          gets no ring" (Deck 2026-10-02, plan79-P79-RING-WALK-TABS.json). On the Settings tab the
 *          Accent intensity button and Reinstall voice engine showed a thin grey frame, the two voice
 *          model rows a grey frame round the whole row, and on the Developer tab the Steam Web API
 *          key field turned white with no ring. The first four are a Button inside a Focusable
 *          wrapper; the plugin's ring rule only covered a bare Button, so the ring never drew where
 *          Steam put its focus mark (on the wrapper, or on the button inside it, clipped).
 * Used for: Accent intensity, Reinstall voice engine, tiny.en and base.en rows, the key field.
 * How it works: the real tab with the plugin's real stylesheet inside `.bonsai-scope`. Steam's
 *          `gpfocus` class is put on ONE element at a time, first on the wrapper, then on the button
 *          inside it (the device does one or the other), and the computed outline is read back. Both
 *          must show exactly one solid white ring, never none and never two. For the key field the
 *          class goes on the input, then on its container.
 * Does not: See pixels (jsdom has no paint engine) or know which element Steam really marks; that
 *           is why both are tried. Whether the ring is clipped on screen is a Deck check.
 */
import { render } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DeveloperTab, type DeveloperTabProps } from "./DeveloperTab";
import { SettingsTab, type SettingsTabProps } from "./SettingsTab";
import { STREAM_SCRAMBLE_OFF } from "../features/stream-scramble/streamScrambleContext";
import { buildBonsaiScopeStylesheet } from "../styles/bonsaiScopeStylesheet";

function settingsProps(): SettingsTabProps {
  return {
    screenshotAttachmentPreset: "mid",
    setScreenshotAttachmentPreset: () => {},
    unifiedInputPersistenceMode: "persist_all",
    setUnifiedInputPersistenceMode: () => {},
    voiceReplyMode: "off",
    setVoiceReplyMode: () => {},
    aiCharacterEnabled: true,
    setAiCharacterEnabled: () => {},
    aiCharacterRandom: false,
    aiCharacterPresetId: "",
    aiCharacterCustomText: "",
    aiCharacterAccentIntensity: "balanced",
    setAiCharacterAccentIntensity: () => {},
    showDeveloperTab: false,
    setShowDeveloperTab: () => {},
    strategySpoilerMaskingEnabled: true,
    setStrategySpoilerMaskingEnabled: () => {},
    presetSingleChip: false,
    setPresetSingleChip: () => {},
    voiceSttModel: "tiny.en",
    setVoiceSttModel: () => {},
    microphoneAccessEnabled: false,
    uiScaleAutoEnabled: true,
    uiScaleManualProfile: "handheld",
    appliedUiScaleProfileId: "handheld",
    onApplyUiScale: () => {},
    onOpenCharacterPicker: () => {},
    onBeforeDeckyModal: () => {},
    onCompleteDeckyModalClose: (close) => close(),
    onResetSession: () => {},
    onClearAllPluginData: () => {},
  };
}

function developerProps(): DeveloperTabProps {
  return {
    capturedErrors: [],
    onClearErrors: () => {},
    desktopDebugNoteAutoSave: false,
    setDesktopDebugNoteAutoSave: () => {},
    desktopAskVerboseLogging: false,
    setDesktopAskVerboseLogging: () => {},
    desktopAppLogLevel: "default",
    setDesktopAppLogLevel: () => {},
    filesystemWrite: false,
    presetChipAnimation: "fade",
    setPresetChipAnimation: () => {},
    steamWebApiKey: "",
    setSteamWebApiKey: () => {},
    showOnscreenDebugHud: false,
    setShowOnscreenDebugHud: () => {},
    devForceSessionRagChips: false,
    setDevForceSessionRagChips: () => {},
    devPreloadAskModel: false,
    setDevPreloadAskModel: () => {},
    devFrozenTestChips: [],
    setDevFrozenTestChips: () => {},
    ragHybridRetrievalEnabled: false,
    setRagHybridRetrievalEnabled: () => {},
    tabResumeMode: "resume",
    setTabResumeMode: () => {},
    streamScramble: STREAM_SCRAMBLE_OFF,
    onStreamScrambleChange: () => {},
  };
}

/** Put Steam's focus class on `only` (and nowhere else in `all`), read each element's outline. */
function outlines(all: HTMLElement[], only: HTMLElement | null): string[] {
  for (const el of all) el.classList.toggle("gpfocus", el === only);
  const out = all.map((el) => getComputedStyle(el).outline);
  for (const el of all) el.classList.remove("gpfocus");
  return out;
}

const SOLID_WHITE = /solid/;

describe("wrapped controls and the key field show one white ring", () => {
  let sheet: HTMLStyleElement;
  beforeAll(() => {
    sheet = document.createElement("style");
    sheet.textContent = buildBonsaiScopeStylesheet();
    document.head.appendChild(sheet);
  });
  afterAll(() => sheet.remove());

  function settingsControls(): [string, HTMLElement][] {
    const { container } = render(
      <div className="bonsai-scope">
        <SettingsTab {...settingsProps()} />
      </div>,
    );
    const accent = container.querySelector("button.bonsai-accent-intensity-trigger") as HTMLElement;
    const buttons = Array.from(container.querySelectorAll("button")) as HTMLElement[];
    const byText = (re: RegExp) => buttons.find((b) => re.test(b.textContent ?? "")) as HTMLElement;
    const reinstall = byText(/^(Re)?install voice engine$/i);
    const tiny = byText(/^tiny\.en/);
    const base = byText(/^base\.en/);
    return [
      ["Accent intensity", accent],
      ["Reinstall voice engine", reinstall],
      ["tiny.en row", tiny],
      ["base.en row", base],
    ];
  }

  it("Steam's focus mark on the wrapper draws one solid ring, on the wrapper", () => {
    for (const [name, button] of settingsControls()) {
      const wrapper = button.parentElement as HTMLElement;
      expect(wrapper?.getAttribute("data-decky-ui"), name).toBe("Focusable");
      const [w, b] = outlines([wrapper, button], wrapper);
      expect(w, `${name}: wrapper ring`).toMatch(SOLID_WHITE);
      expect(b, `${name}: button not ringed too`).not.toMatch(SOLID_WHITE);
    }
  });

  it("Steam's focus mark on the button inside draws one solid ring, on the button", () => {
    for (const [name, button] of settingsControls()) {
      const wrapper = button.parentElement as HTMLElement;
      const [w, b] = outlines([wrapper, button], button);
      expect(b, `${name}: button ring`).toMatch(SOLID_WHITE);
      expect(w, `${name}: wrapper not ringed too`).not.toMatch(SOLID_WHITE);
    }
  });

  it("no ring while none of them is focused", () => {
    for (const [name, button] of settingsControls()) {
      const wrapper = button.parentElement as HTMLElement;
      expect(outlines([wrapper, button], null), name).toEqual(["", ""]);
    }
  });

  it("a knowledge-base style host > Focusable > Button keeps no outline on its wrapper", () => {
    const { container } = render(
      <div className="bonsai-scope">
        <div className="bonsai-settings-focus-btn-host">
          <div className="Panel Focusable" data-decky-ui="Focusable">
            <button className="bonsai-settings-focus-btn">Update</button>
          </div>
        </div>
      </div>,
    );
    const wrapper = container.querySelector(".Panel.Focusable") as HTMLElement;
    const button = container.querySelector("button") as HTMLElement;
    const [w, b] = outlines([wrapper, button], wrapper);
    expect(w, "wrapper: no frame of its own").toBe("none");
    expect(outlines([wrapper, button], button)[1], "button keeps the white ring").toMatch(SOLID_WHITE);
    expect(b).toBe("");
  });

  it("the Steam Web API key field draws one solid ring whichever of its parts Steam marks, and the key text is untouched", () => {
    const { container } = render(
      <div className="bonsai-scope">
        <DeveloperTab {...developerProps()} steamWebApiKey="ABCDEF0123456789" />
      </div>,
    );
    // Steam's TextField is a container holding the input; the stub is a bare div, so give it one.
    const field = container.querySelector('[data-decky-ui="TextField"]') as HTMLElement;
    expect(field).toBeTruthy();
    const input = document.createElement("input");
    input.className = "DialogInput";
    input.value = "ABCDEF0123456789";
    field.appendChild(input);

    const layoutOf = (el: HTMLElement) => {
      const s = getComputedStyle(el);
      return [s.padding, s.border, s.width, s.margin, s.fontSize, s.color, s.display, s.position].join("|");
    };
    const before = layoutOf(input);

    const [inputOnly, containerWhenInput] = outlines([input, field], input);
    expect(inputOnly, "input marked: input ring").toMatch(SOLID_WHITE);
    expect(containerWhenInput, "input marked: no second ring on the container").not.toMatch(SOLID_WHITE);

    const [inputWhenContainer, containerOnly] = outlines([input, field], field);
    expect(containerOnly, "container marked: container ring").toMatch(SOLID_WHITE);
    expect(inputWhenContainer, "container marked: no second ring on the input").not.toMatch(SOLID_WHITE);

    expect(outlines([input, field], null)).toEqual(["", ""]);

    input.classList.add("gpfocus");
    expect(layoutOf(input), "the ring must not move or restyle the key text").toBe(before);
    expect(input.value).toBe("ABCDEF0123456789");
  });
});
