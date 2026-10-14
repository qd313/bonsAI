/**
 * Title: After a library download finishes, "Use local knowledge base" reads on, as the file does
 *
 * Purpose: Pin plan 93 block C part 2, round 3 (docs/test-evidence/plan93-P93-K1-KB-SWITCH-try2.json). On the
 * Deck, after Remove and then Download, the back end saved the switch on, but the screen still read OFF, also
 * after leaving the tab and returning, until a Text size change a minute later. The mirror of the Remove
 * fix: the switch is read from the settings hook, the box that picks the place rebuilds the screen and the
 * hook with it, and the hook is refilled from the note taken as the box opened (which says "off"). These
 * tests use the real hook, the real note and a stand-in disk, rebuild the screen as the box closes, let the
 * download finish afterwards, and read the switch.
 *
 * Does not: run the real back end or Decky; the notice and the place picker are stood in for.
 */
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  releaseNotice: null as null | ((go: boolean) => void),
  picker: null as null | { onPick: (p: string, s: string) => void },
}));

vi.mock("../features/downloads/downloadNotice", () => ({
  confirmDownload: () => new Promise<boolean>((resolve) => (hoisted.releaseNotice = resolve)),
}));
vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (el: { props: { onPick: (p: string, s: string) => void } }) => {
      hoisted.picker = el.props;
      return { Close: () => {}, Update: () => {} };
    },
  };
});

import { resetKbDownloadInFlightForTests } from "./KnowledgeBaseSection";
import { mountScreen, rebuild, setUpWorld, switchIsOn, world } from "../test-harness/kbSwitchWorld";

beforeEach(() => {
  resetKbDownloadInFlightForTests();
  setUpWorld({ installed: false });
  hoisted.releaseNotice = null;
  hoisted.picker = null;
});

/** Download, a place chosen, the box closing (the screen is rebuilt), the notice saying yes. */
async function downloadThroughRebuiltScreen() {
  mountScreen();
  fireEvent.click(await screen.findByText("Download knowledge base"));
  await waitFor(() => expect(hoisted.picker).not.toBeNull());
  act(() => hoisted.picker!.onPick("~/.bonsai/rag", "internal"));
  await waitFor(() => expect(hoisted.releaseNotice).not.toBeNull());
  act(() => rebuild());
  expect(await screen.findByText("Download knowledge base")).toBeTruthy();
  await act(async () => hoisted.releaseNotice!(true));
  await waitFor(() => expect(screen.getByText("Downloading…")).toBeTruthy());
}

describe("after Download, with the switch read from the settings hook and the box rebuilding the screen", () => {
  it("reads on when the download finishes after the rebuild", async () => {
    await downloadThroughRebuiltScreen();
    expect(switchIsOn()).toBe(false);
    act(() => world.finishDownload());
    await waitFor(() => expect(screen.getByText("Update knowledge base")).toBeTruthy(), { timeout: 5000 });
    await waitFor(() => expect(switchIsOn()).toBe(true), { timeout: 3000 });
    await act(() => new Promise<void>((r) => setTimeout(r, 600)));
    expect(switchIsOn()).toBe(true);
    expect(world.disk.use_local_knowledge_base).toBe(true);
  });
});
