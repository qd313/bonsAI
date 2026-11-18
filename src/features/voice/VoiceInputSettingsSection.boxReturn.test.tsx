/**
 * Title: The voice install keeps its way back across the download notice's box, and says why it ended
 *
 * Purpose: Plan 106 lane F3, the second opinion's first change. Pressing "Install voice engine" first asks the download
 * notice. With Internet downloads off (or a site not seen yet) a box opens ("Turn on internet downloads?"), and closing
 * it rebuilds the Settings tab: the ring lands on the tab bar and the section that pressed the button is gone, so the
 * install begins in a copy nobody sees. Pinned here, the way the library's rebuilt-screen test does it: press, rebuild
 * the tab, answer yes, and the install shows on the new copy's card with Steam's ring on its Cancel (the shell's restore
 * is stood in for by calling it); end the run as failed (or cancelled): the card goes, the ring is on the install button,
 * and the reason shows under it, read by the rebuilt copy itself. With downloads already on no box opens, nothing is left
 * armed for a later box, and the same ending reads the same.
 *
 * Does not: prove the ring moves on the device; the Deck row reads it.
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ release: null as null | ((go: boolean) => void), immediate: false }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  return { ...stubs, Focusable: SteamRingFocusable };
});
vi.mock("../downloads/downloadNotice", () => ({
  confirmDownload: () => (hoisted.immediate ? Promise.resolve(true) : new Promise<boolean>((resolve) => (hoisted.release = resolve))),
}));

import { VoiceInputSettingsSection } from "./VoiceInputSettingsSection";
import { resetVoiceInstallMarkerForTests } from "./voiceInstallBusyStore";
import { resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { peekModalReturnFocus, resetModalReturnFocusRegistry, restoreModalReturnFocus } from "../../shared/dpad/modalReturnFocusRegistry";
import { resetNavFocusRegistry } from "../../shared/dpad/navFocusRegistry";
import { putSteamRingOn, steamRingHolder } from "../../test-harness/steamRing";

const CANCEL = "Cancel the voice install";
type Install = Record<string, unknown>;
let install: Install = { phase: "idle", done: true };

const section = () => <VoiceInputSettingsSection voiceSttModel="base.en" setVoiceSttModel={() => {}} microphoneAccessEnabled />;
const ringName = () => steamRingHolder()?.getAttribute("aria-label") ?? steamRingHolder()?.textContent ?? "(no ring)";
const installButton = () => screen.getByText("Install voice engine").closest("button") as HTMLElement;
const wait = (ms: number) => act(async () => new Promise<void>((r) => setTimeout(r, ms)));

beforeEach(() => {
  resetFakeDeckyRpc();
  resetVoiceInstallMarkerForTests();
  resetModalReturnFocusRegistry();
  resetNavFocusRegistry();
  hoisted.release = null;
  hoisted.immediate = false;
  install = { phase: "idle", done: true };
  setRpcHandler("get_voice_engine_status", () => ({ model_id: "base.en", binary_ready: false, model_ready: false, ready: false, install }));
  setRpcHandler("get_voice_install_status", () => install);
  setRpcHandler("install_voice_engine", () => {
    install = { phase: "running", stage: "binary_build_start", done: false, model_id: "base.en" };
    return { accepted: true, model_id: "base.en" };
  });
});
afterEach(() => cleanup());

const ENDINGS: Array<[string, Install, RegExp]> = [
  ["failed", { phase: "failed", stage: "failed", done: true, model_id: "base.en", error: "podman pull failed" }, /podman pull failed/],
  ["cancelled", { phase: "cancelled", stage: "failed", done: true, model_id: "base.en", error: "Install cancelled." }, /Install cancelled\. Press Install voice engine to start again\./],
];

describe("downloads off: the notice's box opens and rebuilds the tab", () => {
  for (const [name, ending, reason] of ENDINGS) {
    it(`press, rebuild, answer yes: the ring is on the new copy's Cancel; the run ends ${name}: the ring is on Install and the reason shows`, async () => {
      const first = render(section());
      await screen.findByText("Install voice engine");
      act(() => putSteamRingOn(installButton()));
      await act(async () => void fireEvent.click(installButton()));
      await waitFor(() => expect(hoisted.release).not.toBeNull());
      expect(peekModalReturnFocus()).toBe("voice-install");

      // The box closing rebuilds the tab: a new copy, and the ring lands on the tab bar (nothing here).
      first.unmount();
      render(section());
      await screen.findByText("Install voice engine");
      act(() => putSteamRingOn(null));
      // A person takes longer than this to answer a box.
      await wait(80);
      await act(async () => hoisted.release!(true));
      await screen.findByLabelText(CANCEL);
      // The shell's restore, a beat after the box closed.
      act(() => void restoreModalReturnFocus());
      expect(ringName()).toBe(CANCEL);

      install = ending;
      await waitFor(() => expect(screen.queryByLabelText(CANCEL)).toBeNull(), { timeout: 5000 });
      expect(await screen.findByText(reason)).toBeTruthy();
      await waitFor(() => expect(ringName()).toMatch(/Install voice engine/));
    });
  }
});

describe("downloads already on: no box opens", () => {
  for (const [name, ending, reason] of ENDINGS) {
    it(`press: the ring is on Cancel at once, nothing is left armed; the run ends ${name}: the ring is on Install and the reason shows`, async () => {
      hoisted.immediate = true;
      render(section());
      await screen.findByText("Install voice engine");
      act(() => putSteamRingOn(installButton()));
      await act(async () => void fireEvent.click(installButton()));
      await screen.findByLabelText(CANCEL);
      await waitFor(() => expect(ringName()).toBe(CANCEL));
      expect(peekModalReturnFocus()).toBeNull();

      install = ending;
      await waitFor(() => expect(screen.queryByLabelText(CANCEL)).toBeNull(), { timeout: 5000 });
      expect(await screen.findByText(reason)).toBeTruthy();
      await waitFor(() => expect(ringName()).toMatch(/Install voice engine/));
    });
  }
});
