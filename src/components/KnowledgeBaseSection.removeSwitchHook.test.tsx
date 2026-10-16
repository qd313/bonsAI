/**
 * Title: After Remove, the switch reads off when its value comes from the plugin's settings hook
 *
 * Purpose: Pin plan 93 block C part 2, round 2 (workshop:test-evidence/plan93-P93-K1-KB-SWITCH.json). The first
 * fix told the section on screen, and the Deck still showed the switch ON for 30 s and after leaving the tab,
 * while settings.json said off. The switch does not live in the section: it is read from the settings hook
 * above the tab, and a box rebuilds that hook too. The hook that comes back is filled from the note taken as
 * the box opened (bonsaiSessionSurvival.ts), and that note still says "on". So these tests use the real hook,
 * the real note, and a back end stand-in with a "disk", and read the switch the section draws.
 *
 * Does not: run the real back end or Decky; the box and its rebuild are stood in for (as afterBoxHarness does).
 */
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ box: null as unknown }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (el: unknown) => {
      hoisted.box = el;
      return { Close: () => {}, Update: () => {} };
    },
  };
});

import { resetKbDownloadInFlightForTests } from "./KnowledgeBaseSection";
import { drawConfirmBox } from "../test-harness/confirmBoxProbe";
import { mountScreen, rebuild, setUpWorld, settle, switchIsOn, world } from "../test-harness/kbSwitchWorld";
import { setRpcHandler } from "../test-harness/fakeDeckyRpc";

async function pressRemove() {
  fireEvent.click(await screen.findByText("Remove"));
  await waitFor(() => expect(hoisted.box).not.toBeNull());
  drawConfirmBox(hoisted.box).pressAction();
  await settle();
}

async function finishRemoval() {
  world.finishDelete();
  await settle();
  await settle();
}

beforeEach(() => {
  resetKbDownloadInFlightForTests();
  setUpWorld({ installed: true });
  hoisted.box = null;
});

describe("after Remove, with the switch read from the settings hook and the box rebuilding the screen", () => {
  it("reads off when the delete finishes first and the screen is rebuilt from the note afterwards", async () => {
    mountScreen();
    await waitFor(() => expect(switchIsOn()).toBe(true));
    await pressRemove();
    await finishRemoval();
    act(() => rebuild());
    await settle();
    await waitFor(() => expect(switchIsOn()).toBe(false));
    await act(() => new Promise<void>((r) => setTimeout(r, 600)));
    expect(switchIsOn()).toBe(false);
    expect(world.disk.use_local_knowledge_base).toBe(false);
  });

  it("reads off when the screen is rebuilt first and the delete finishes afterwards", async () => {
    mountScreen();
    await waitFor(() => expect(switchIsOn()).toBe(true));
    await pressRemove();
    act(() => rebuild());
    await waitFor(() => expect(switchIsOn()).toBe(true));
    await finishRemoval();
    await waitFor(() => expect(switchIsOn()).toBe(false));
    await act(() => new Promise<void>((r) => setTimeout(r, 600)));
    expect(switchIsOn()).toBe(false);
    expect(world.disk.use_local_knowledge_base).toBe(false);
  });

  it("reads off when the delete finishes while the rebuilt screen is still loading its settings", async () => {
    mountScreen();
    await waitFor(() => expect(switchIsOn()).toBe(true));
    await pressRemove();
    let release: () => void = () => {};
    const held = new Promise<void>((r) => (release = r));
    setRpcHandler("load_settings", async () => {
      await held;
      return { ...world.disk };
    });
    act(() => rebuild());
    await finishRemoval();
    await act(async () => {
      release();
    });
    await settle();
    await waitFor(() => expect(switchIsOn()).toBe(false));
    expect(world.disk.use_local_knowledge_base).toBe(false);
  });
});
