import { describe, expect, it } from "vitest";
import {
  classifyUiScaleProfile,
  detectDisplayContext,
  EXTERNAL_COUCH_VIEWPORT_MIN_PX,
  HANDHELD_VIEWPORT_MAX_PX,
  manualUiScaleProfileAtIndex,
  normalizeUiScaleProfileId,
  profileScaleMultiplier,
} from "./uiScaleProfile";

describe("uiScaleProfile", () => {
  it("detectDisplayContext: narrow viewport is internal", () => {
    expect(detectDisplayContext(480, 2560, 1600)).toBe("internal");
  });

  it("detectDisplayContext: Deck native screen is internal", () => {
    expect(detectDisplayContext(0, 1280, 800)).toBe("internal");
  });

  it("detectDisplayContext: wide viewport on large screen is external", () => {
    expect(detectDisplayContext(720, 1920, 1080)).toBe("external");
  });

  /**
   * The three cases above use the screens' physical pixel sizes. The plugin never sees those: the
   * browser reports CSS pixels, and Steam runs the Deck at about 1.28 device pixels per CSS pixel,
   * so a 1920x1080 monitor arrives as roughly 1500x843. The cases below use what the device itself
   * reported, so a future change to the thresholds is measured against real readings.
   *
   * The maintainer swaps between the Deck's own panel and an external monitor without saying which
   * is plugged in, so getting this wrong is silent: the plugin simply draws at the wrong density
   * and nobody is told. Measured 2026-09-20 with both screens connected and Steam drawing on the
   * monitor: the Quick Access panel read 855 CSS wide, window.screen 1500x843.
   */
  it("detectDisplayContext: the external monitor as the device actually reports it", () => {
    expect(detectDisplayContext(855, 1500, 843)).toBe("external");
  });

  it("detectDisplayContext: the Deck's own panel, whichever way its size is reported", () => {
    // Not yet read off the device — the Deck was driving the monitor when this was written, and a
    // reading from its own panel is owed. Both plausible reports are pinned so the answer cannot
    // depend on which one Steam gives: the panel's own 1280x800, and the same panel divided by the
    // 1.28 scale seen on the monitor.
    expect(detectDisplayContext(855, 1280, 800)).toBe("internal");
    expect(detectDisplayContext(668, 1000, 625)).toBe("internal");
  });

  it("classifyUiScaleProfile: manual mode uses manual profile", () => {
    expect(
      classifyUiScaleProfile({
        autoEnabled: false,
        manualProfile: "couch",
        viewportWidthPx: 400,
      }),
    ).toBe("couch");
  });

  it("classifyUiScaleProfile: auto internal -> handheld", () => {
    expect(
      classifyUiScaleProfile({
        autoEnabled: true,
        manualProfile: "couch",
        viewportWidthPx: 500,
      }),
    ).toBe("handheld");
  });

  it("classifyUiScaleProfile: auto external wide -> couch", () => {
    expect(
      classifyUiScaleProfile({
        autoEnabled: true,
        manualProfile: "handheld",
        viewportWidthPx: EXTERNAL_COUCH_VIEWPORT_MIN_PX,
        screenWidthPx: 3840,
        screenHeightPx: 2160,
      }),
    ).toBe("couch");
  });

  /**
   * Desktop was cut 2026-09-21 (docs/roadmap.md, "The UI size setting barely changes anything"):
   * measured on the Deck 2026-09-20, Desktop and Handheld both multiplied by the same 1, so an
   * external-but-narrow auto reading is now just as well served by Handheld. This used to expect
   * "desktop" — pin the new value so a future edit cannot bring the dead choice back silently.
   */
  it("classifyUiScaleProfile: auto external narrow -> handheld (desktop retired)", () => {
    expect(
      classifyUiScaleProfile({
        autoEnabled: true,
        manualProfile: "handheld",
        viewportWidthPx: HANDHELD_VIEWPORT_MAX_PX + 20,
        screenWidthPx: 1920,
        screenHeightPx: 1080,
      }),
    ).toBe("handheld");
  });

  it("normalizeUiScaleProfileId falls back to handheld", () => {
    expect(normalizeUiScaleProfileId("bogus")).toBe("handheld");
  });

  /**
   * A settings file saved before 2026-09-21 can still say "desktop". Nobody should end up with a
   * broken or empty UI-scale setting because of that: it must load as Handheld, and Handheld's own
   * scale must still be the same 1x Desktop always was, so nothing changes for that person.
   */
  it("normalizeUiScaleProfileId redirects a legacy 'desktop' save to handheld, same scale as before", () => {
    expect(normalizeUiScaleProfileId("desktop")).toBe("handheld");
    expect(profileScaleMultiplier(normalizeUiScaleProfileId("desktop"))).toBe(1);
  });

  it("manualUiScaleProfileAtIndex snaps to the two real stops", () => {
    expect(manualUiScaleProfileAtIndex(0)).toBe("handheld");
    expect(manualUiScaleProfileAtIndex(1)).toBe("couch");
    // Out-of-range indexes clamp rather than picking the retired Desktop stop.
    expect(manualUiScaleProfileAtIndex(2)).toBe("couch");
  });

  it("profileScaleMultiplier: couch > handheld", () => {
    expect(profileScaleMultiplier("couch")).toBeGreaterThan(profileScaleMultiplier("handheld"));
  });
});
